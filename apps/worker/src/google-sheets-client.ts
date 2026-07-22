import { createSign } from "node:crypto";

export interface GoogleServiceAccount {
  readonly email: string;
  readonly privateKey: string;
}

export interface GoogleSheetsClientOptions {
  readonly serviceAccount: GoogleServiceAccount;
  readonly scope?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => number;
}

export class GoogleSheetsError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super(code);
    this.name = "GoogleSheetsError";
    this.code = code;
    this.retryable = retryable;
  }
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

export function createSheetsAssertion(
  serviceAccount: GoogleServiceAccount,
  scope: string,
  nowMs: number,
): string {
  const issuedAt = Math.floor(nowMs / 1_000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: serviceAccount.email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3_600,
  }));
  const unsigned = `${header}.${payload}`;
  const normalizedPrivateKey = serviceAccount.privateKey
    .trim()
    .replace(/^=+/u, "")
    .replace(/\\n/gu, "\n");
  const signature = createSign("RSA-SHA256").update(unsigned).end().sign(normalizedPrivateKey);
  return `${unsigned}.${base64Url(signature)}`;
}

export class GoogleSheetsClient {
  private readonly options: Required<Pick<GoogleSheetsClientOptions, "serviceAccount">> & {
    scope: string;
    timeoutMs: number;
    fetchImpl: typeof fetch;
    now: () => number;
  };

  private accessToken: { value: string; expiresAt: number } | null = null;

  constructor(options: GoogleSheetsClientOptions) {
    if (!options.serviceAccount.email.includes("@")) throw new Error("SHEETS_EMAIL_INVALID");
    if (!options.serviceAccount.privateKey.includes("PRIVATE KEY")) throw new Error("SHEETS_PRIVATE_KEY_INVALID");
    this.options = {
      serviceAccount: options.serviceAccount,
      scope: options.scope ?? "https://www.googleapis.com/auth/spreadsheets",
      timeoutMs: Math.max(5_000, Math.min(180_000, options.timeoutMs ?? 120_000)),
      fetchImpl: options.fetchImpl ?? fetch,
      now: options.now ?? (() => Date.now()),
    };
  }

  private async token(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt - 60_000 > this.options.now()) {
      return this.accessToken.value;
    }
    const assertion = createSheetsAssertion(
      this.options.serviceAccount,
      this.options.scope,
      this.options.now(),
    );
    const response = await this.options.fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(this.options.timeoutMs),
    });
    const body = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
    if (!response.ok || typeof body?.access_token !== "string") {
      throw new GoogleSheetsError("SHEETS_TOKEN_FAILED", true);
    }
    const expiresIn = Number(body.expires_in ?? 3_600);
    this.accessToken = {
      value: body.access_token,
      expiresAt: this.options.now() + Math.max(60, expiresIn) * 1_000,
    };
    return body.access_token;
  }

  private async request(url: string, init: RequestInit): Promise<unknown> {
    const token = await this.token();
    const response = await this.options.fetchImpl(url, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(this.options.timeoutMs),
    });
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new GoogleSheetsError(`SHEETS_HTTP_${response.status}`, retryable);
    }
    return response.json();
  }

  /**
   * `valueRenderOption` phải khớp nguồn n8n đang được thay thế:
   * workflow POS gọi thẳng HTTP `values:batchGet` nên nhận FORMATTED_VALUE (mặc định của API),
   * còn node Google Sheets của n8n (P2.3) dùng UNFORMATTED_VALUE. Bảng tính đặt locale Việt Nam
   * nên FORMATTED_VALUE trả số thập phân dạng "0,95" và `Number()` sẽ ra NaN.
   */
  async batchGetValues(
    spreadsheetId: string,
    ranges: readonly string[],
    valueRenderOption: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" = "FORMATTED_VALUE",
  ): Promise<{ range: string; values: unknown[][] }[]> {
    const query = ranges.map((range) => `ranges=${encodeURIComponent(range)}`).join("&");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`
      + `/values:batchGet?${query}&majorDimension=ROWS&valueRenderOption=${valueRenderOption}`;
    const body = (await this.request(url, { method: "GET" })) as {
      valueRanges?: { range?: string; values?: unknown[][] }[];
    };
    const valueRanges = Array.isArray(body?.valueRanges) ? body.valueRanges : [];
    if (valueRanges.length < ranges.length) {
      throw new GoogleSheetsError(`SHEETS_BATCH_INCOMPLETE_${valueRanges.length}`, true);
    }
    return valueRanges.map((entry) => ({
      range: String(entry.range ?? ""),
      values: Array.isArray(entry.values) ? entry.values : [],
    }));
  }

  /**
   * Thêm dòng mới bằng `values:append` với `INSERT_ROWS`: nhiều shard chạy song song
   * không tự chọn cùng một dòng và không ghi đè lẫn nhau.
   */
  async appendValues(
    spreadsheetId: string,
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void> {
    if (!values.length) return;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`
      + `/values/${encodeURIComponent(range)}:append`
      + "?valueInputOption=RAW&insertDataOption=INSERT_ROWS&includeValuesInResponse=false";
    await this.request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ majorDimension: "ROWS", values }),
    });
  }

  /** Tạo tab và ghi header nếu chưa có. Trả về true khi vừa tạo mới. */
  async ensureSheet(
    spreadsheetId: string,
    title: string,
    headers: readonly string[],
  ): Promise<boolean> {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`
      + "?fields=sheets.properties.title";
    const meta = (await this.request(metaUrl, { method: "GET" })) as {
      sheets?: { properties?: { title?: string } }[];
    };
    const exists = (meta?.sheets ?? []).some((sheet) => String(sheet?.properties?.title || "") === title);
    if (!exists) {
      const structuralUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
      await this.request(structuralUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: {
                title,
                gridProperties: { rowCount: 2_000, columnCount: headers.length, frozenRowCount: 1 },
              },
            },
          }],
        }),
      });
    }
    const lastColumn = columnLetters(headers.length);
    await this.batchUpdateValues(spreadsheetId, [
      { range: `${title}!A1:${lastColumn}1`, values: [[...headers]] },
    ]);
    return !exists;
  }

  async batchUpdateValues(
    spreadsheetId: string,
    data: readonly { range: string; values: readonly (readonly (string | number | boolean)[])[] }[],
  ): Promise<void> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`;
    await this.request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        valueInputOption: "RAW",
        includeValuesInResponse: false,
        data: data.map((entry) => ({
          range: entry.range,
          majorDimension: "ROWS",
          values: entry.values,
        })),
      }),
    });
  }
}

/** Số thứ tự cột 1-based -> chữ cái cột của Sheets (1 -> A, 27 -> AA). */
export function columnLetters(count: number): string {
  let remaining = Math.max(1, Math.trunc(count));
  let letters = "";
  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    remaining = Math.trunc((remaining - 1) / 26);
  }
  return letters;
}
