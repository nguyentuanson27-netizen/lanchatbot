import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  GoogleSheetsClient,
  GoogleSheetsError,
} from "./google-sheets-client.js";

function serviceAccount() {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2_048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return { email: "sheets@example.iam.gserviceaccount.com", privateKey };
}

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GoogleSheetsClient retry policy", () => {
  it("retries a safe Sheets request three times after 2, 5 and 15 seconds", async () => {
    const waits: number[] = [];
    let sheetsAttempts = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("oauth2.googleapis.com")) {
        return response(200, { access_token: "token", expires_in: 3_600 });
      }
      sheetsAttempts += 1;
      return sheetsAttempts <= 3
        ? response(500, { error: "temporary" })
        : response(200, {
            valueRanges: [{ range: "product_registry!A1:A2", values: [["MA_SP"], ["SD398"]] }],
          });
    }) as typeof fetch;
    const client = new GoogleSheetsClient({
      serviceAccount: serviceAccount(),
      fetchImpl,
      sleepImpl: async (milliseconds) => { waits.push(milliseconds); },
    });

    const result = await client.batchGetValues("sheet-id", ["product_registry!A1:A2"]);

    expect(result[0]?.values).toEqual([["MA_SP"], ["SD398"]]);
    expect(sheetsAttempts).toBe(4);
    expect(waits).toEqual([2_000, 5_000, 15_000]);
  });

  it("does not blindly retry append because an ambiguous retry can duplicate rows", async () => {
    const waits: number[] = [];
    let sheetsAttempts = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("oauth2.googleapis.com")) {
        return response(200, { access_token: "token", expires_in: 3_600 });
      }
      sheetsAttempts += 1;
      return response(500, { error: "ambiguous append" });
    }) as typeof fetch;
    const client = new GoogleSheetsClient({
      serviceAccount: serviceAccount(),
      fetchImpl,
      sleepImpl: async (milliseconds) => { waits.push(milliseconds); },
    });

    await expect(client.appendValues("sheet-id", "image_registry!A:AZ", [["row"]]))
      .rejects.toMatchObject({ code: "SHEETS_HTTP_500" } satisfies Partial<GoogleSheetsError>);
    expect(sheetsAttempts).toBe(1);
    expect(waits).toEqual([]);
  });
});
