import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

const pageId = "1198992073286645";
const mid = "mid.debounce.smoke.20260722.0101";
const secret = (await readFile("/run/secrets/meta_app_secret", "utf8")).trim();
const payload = {
  object: "page",
  entry: [{
    id: pageId,
    time: Date.now(),
    messaging: [{
      sender: { id: "9999999999999999" },
      recipient: { id: pageId },
      timestamp: Date.now(),
      message: {
        mid,
        is_echo: true,
        app_id: 921453707665419,
        text: "debounce smoke",
      },
    }],
  }],
};
const body = Buffer.from(JSON.stringify(payload));
const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

for (let index = 0; index < 2; index += 1) {
  const response = await fetch("http://127.0.0.1:8080/webhooks/meta", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": signature,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`WEBHOOK_SMOKE_HTTP_${response.status}`);
  }
}
process.stdout.write(`SIGNED_DUPLICATE_WEBHOOK_OK mid=${mid}\n`);
