const raw = Buffer.from(
  process.env.LANA_MCP_INPUT_B64 || "",
  "base64",
).toString("utf8");
const input = JSON.parse(raw || "{}");

if (
  ["sheet_update_cells", "sheet_update_row", "sheet_approve_image"].includes(
    String(input.op),
  )
) {
  const reason = String(input.change_note || "").trim();
  if (input.confirm_write !== true || reason.length < 5) {
    throw new Error("CONFIRMED_SHEET_WRITE_REQUIRED");
  }
  input.note = `BY_CHATGPT: ${reason}`;
}

process.env.LANA_MCP_INPUT_B64 = Buffer.from(
  JSON.stringify(input),
).toString("base64");

await import(
  process.env.LANA_MCP_BASE_REMOTE_OPS_URL ||
    "file:///app/plugins/lana-chatbot-ops/scripts/remote_ops.mjs"
);
