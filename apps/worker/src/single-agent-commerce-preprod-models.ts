import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { OwnerGeneration, OwnerRequest, VerifierRequest } from "./single-agent-commerce-read-only.js";
import type { VertexServiceAccount } from "./vertex.js";

type Credential = { type: "service_account"; project_id: string; client_email: string; private_key: string };
type GeminiVerifierResult = { status: string; answer?: string; providerRequests: number };
const model = "gemini-3.5-flash-lite";

/** Loads the exact registered prompts and inference wires from the release. */
export async function createCommercePreprodModels(input: {
  projectId: string;
  serviceAccount: VertexServiceAccount;
  timeoutMs: number;
}) {
  const dir = new URL("../evals/single-agent-commerce-read-only/", import.meta.url);
  const read = (file: string) => readFileSync(new URL(file, dir), "utf8");
  const manifest = JSON.parse(read("manifest.json"));
  const ownerPrompt = read("prompts/owner.vi.txt");
  const verifierPrompt = read("prompts/verifier.vi.txt");
  const sha = (text: string) => createHash("sha256").update(text).digest("hex");
  if (manifest.sendEnabled !== false ||
    sha(ownerPrompt) !== manifest.promptHashes.owner || sha(verifierPrompt) !== manifest.promptHashes.verifier ||
    sha(JSON.stringify(manifest.verdictSchema)) !== manifest.schemaHash ||
    ![manifest.models.conversation, manifest.models.verifier].every(role =>
      role.provider === "VERTEX_AI" && role.model === model && role.version === model &&
      role.location === "global" && role.effort === "high" && role.generationConfig.retry === 0)) {
    throw new Error("C3_COMMERCE_PREPROD_MODEL_REGISTRATION");
  }
  const credential: Credential = {
    type: "service_account", project_id: input.projectId,
    client_email: input.serviceAccount.email, private_key: input.serviceAccount.privateKey,
  };
  const [{ createGeminiCommerceInference }, { createGeminiVerifierModel }, { buildVerifierRequest }] = await Promise.all([
    import(new URL("gemini-inference.mjs", dir).href) as Promise<{
      createGeminiCommerceInference(config: { model: string; effort: string; location: string; projectId: string; timeoutMs: number },
        dependencies: { credential: Credential }): (r: OwnerRequest & { ownerContextPresentation: string; validateNativeToolCalls: boolean }) => Promise<OwnerGeneration>;
    }>,
    import(new URL("gemini-verifier.mjs", dir).href) as Promise<{
      createGeminiVerifierModel(config: { projectId: string; timeoutMs: number }, dependencies: { credential: Credential }):
      (manifest: unknown, role: "verifier", wire: unknown, options: { signal: AbortSignal }) => Promise<GeminiVerifierResult>;
    }>,
    import(new URL("commerce-verifier-wire.mjs", dir).href) as Promise<{
      buildVerifierRequest(manifest: unknown, request: VerifierRequest): unknown;
    }>,
  ]);
  const config = { projectId: input.projectId, timeoutMs: input.timeoutMs };
  const infer = createGeminiCommerceInference({ ...config, model, effort: "high", location: "global" }, { credential });
  const verify = createGeminiVerifierModel(config, { credential });
  return {
    ownerPrompt, verifierPrompt,
    owner: (request: OwnerRequest) => infer({ ...request, ownerContextPresentation: "VI_DATA_BLOCKS_COMPACT_V2", validateNativeToolCalls: true }),
    async verifier(request: VerifierRequest) {
      request.signal.throwIfAborted();
      const telemetry = await verify(manifest, "verifier", buildVerifierRequest(manifest, request), { signal: request.signal });
      if (telemetry.status !== "OK") {
        throw Object.assign(new Error(telemetry.status === "TIMEOUT" ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR"), { telemetry });
      }
      return { result: telemetry.answer, telemetry };
    },
  };
}
