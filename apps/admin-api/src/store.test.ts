import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeCursor, encodeCursor } from "./store.js";

describe("Admin cursor", () => {
  it("round-trips an opaque keyset cursor", () => {
    const value = {
      time: "2026-07-16T12:00:00.000Z",
      id: "018f1b72-0000-7000-8000-000000000001",
    };
    assert.deepEqual(decodeCursor(encodeCursor(value)), value);
  });

  it("rejects a malformed cursor", () => {
    assert.throws(() => decodeCursor("not-json"), /ADMIN_QUERY_INVALID/);
  });
});
