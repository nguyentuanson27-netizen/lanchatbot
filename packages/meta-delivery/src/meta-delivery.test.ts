import { describe, expect, it } from "vitest";
import { fingerprintMetaPayload, matchMetaEcho } from "./echo.js";
import { MetaDeliveryAdapter } from "./sender.js";
import { FakeHttpTransport, HttpTransportFailure } from "./transport.js";

const command = {
  pageId: "page-1",
  recipientId: "recipient-1",
  pageAccessToken: "test-token-never-sent",
  message: { kind: "TEXT" as const, text: "Xin chào chị" },
};

describe("MetaDeliveryAdapter", () => {
  it("defaults to a hard kill switch and never calls transport", async () => {
    const transport = new FakeHttpTransport([]);
    const result = await new MetaDeliveryAdapter(transport).send(command);
    expect(result).toEqual({
      schemaVersion: 1,
      result: "FAILED_PERMANENT",
      reasonCode: "META_SEND_DISABLED",
    });
    expect(transport.calls).toHaveLength(0);
  });

  it("accepts only a response with matching recipient and message ID", async () => {
    const transport = new FakeHttpTransport([
      {
        type: "response",
        response: {
          status: 200,
          headers: {},
          body: { recipient_id: "recipient-1", message_id: "mid.123" },
        },
      },
    ]);
    const result = await new MetaDeliveryAdapter(transport, { sendEnabled: true }).send(command);
    expect(result).toEqual({
      schemaVersion: 1,
      result: "ACCEPTED",
      providerMessageId: "mid.123",
      recipientId: "recipient-1",
    });
    expect(transport.calls).toHaveLength(1);
  });

  it("treats malformed 2xx acceptance evidence as ambiguous", async () => {
    const transport = new FakeHttpTransport([
      { type: "response", response: { status: 200, headers: {}, body: { recipient_id: "x" } } },
    ]);
    const result = await new MetaDeliveryAdapter(transport, { sendEnabled: true }).send(command);
    expect(result.result).toBe("AMBIGUOUS");
  });

  it("treats timeout/reset after dispatch as ambiguous and redacts unsafe details", async () => {
    const transport = new FakeHttpTransport([
      {
        type: "failure",
        failure: new HttpTransportFailure(
          "ECONNRESET",
          "POST_DISPATCH",
          "token=test-token-never-sent recipient=recipient-1",
        ),
      },
    ]);
    const result = await new MetaDeliveryAdapter(transport, { sendEnabled: true }).send(command);
    expect(result).toEqual({
      schemaVersion: 1,
      result: "AMBIGUOUS",
      reasonCode: "META_TRANSPORT_OUTCOME_UNKNOWN",
    });
    expect(JSON.stringify(result)).not.toContain("test-token-never-sent");
    expect(JSON.stringify(result)).not.toContain("recipient-1");
  });

  it("retries only a known not-transmitted transport failure", async () => {
    const transport = new FakeHttpTransport([
      {
        type: "failure",
        failure: new HttpTransportFailure("DNS_FAILURE", "PRE_TRANSMISSION"),
      },
    ]);
    const result = await new MetaDeliveryAdapter(transport, { sendEnabled: true }).send(command);
    expect(result).toMatchObject({ result: "RETRYABLE", knownNotTransmitted: true });
  });

  it("classifies rate limit as retryable and auth as permanent", async () => {
    const rate = new FakeHttpTransport([
      { type: "response", response: { status: 429, headers: {}, body: { secret: "no-log" } } },
    ]);
    expect(await new MetaDeliveryAdapter(rate, { sendEnabled: true }).send(command)).toMatchObject({
      result: "RETRYABLE",
      knownNotTransmitted: true,
    });

    const auth = new FakeHttpTransport([
      { type: "response", response: { status: 401, headers: {}, body: { access_token: "leak" } } },
    ]);
    const result = await new MetaDeliveryAdapter(auth, { sendEnabled: true }).send(command);
    expect(result).toEqual({
      schemaVersion: 1,
      result: "FAILED_PERMANENT",
      reasonCode: "META_AUTH_REJECTED",
    });
    expect(JSON.stringify(result)).not.toContain("leak");
  });

  it("treats a Meta 400 rejection as permanent", async () => {
    const transport = new FakeHttpTransport([
      { type: "response", response: { status: 400, headers: {}, body: { error: "bad" } } },
    ]);
    expect(await new MetaDeliveryAdapter(transport, { sendEnabled: true }).send(command)).toEqual({
      schemaVersion: 1,
      result: "FAILED_PERMANENT",
      reasonCode: "META_REQUEST_REJECTED",
    });
  });

  it("rejects invalid payloads before transport", async () => {
    const transport = new FakeHttpTransport([]);
    const result = await new MetaDeliveryAdapter(transport, { sendEnabled: true }).send({
      ...command,
      message: { kind: "IMAGE", imageUrl: "http://insecure.example/image.jpg" },
    });
    expect(result).toMatchObject({ result: "FAILED_PERMANENT" });
    expect(transport.calls).toHaveLength(0);
  });

  it("refuses a non-Meta delivery host before any token can be transmitted", () => {
    expect(
      () =>
        new MetaDeliveryAdapter(new FakeHttpTransport([]), {
          graphBaseUrl: "https://attacker.example",
        }),
    ).toThrow("META_GRAPH_BASE_URL_FORBIDDEN");
  });
});

describe("Meta echo evidence", () => {
  it("matches bounded evidence by page, recipient, app and payload fingerprint", () => {
    const payloadFingerprint = fingerprintMetaPayload(command.message);
    const attemptedAt = new Date("2026-07-13T00:00:00.000Z");
    expect(
      matchMetaEcho(
        {
          pageId: "page-1",
          recipientId: "recipient-1",
          appId: "app-1",
          providerMessageId: null,
          payloadFingerprint,
          attemptedAt,
        },
        {
          pageId: "page-1",
          recipientId: "recipient-1",
          appId: "app-1",
          providerMessageId: "mid.echo",
          payloadFingerprint,
          occurredAt: new Date(attemptedAt.getTime() + 30_000),
        },
        60_000,
      ),
    ).toEqual({ matched: true, basis: "PAYLOAD_FINGERPRINT" });
  });

  it("rejects an echo from another app even when text fingerprint matches", () => {
    const payloadFingerprint = fingerprintMetaPayload(command.message);
    const result = matchMetaEcho(
      {
        pageId: "page-1",
        recipientId: "recipient-1",
        appId: "app-1",
        providerMessageId: null,
        payloadFingerprint,
        attemptedAt: new Date("2026-07-13T00:00:00.000Z"),
      },
      {
        pageId: "page-1",
        recipientId: "recipient-1",
        appId: "human-or-other-app",
        providerMessageId: "mid.echo",
        payloadFingerprint,
        occurredAt: new Date("2026-07-13T00:00:10.000Z"),
      },
      60_000,
    );
    expect(result).toEqual({ matched: false, reasonCode: "META_ECHO_APP_MISMATCH" });
  });
});
