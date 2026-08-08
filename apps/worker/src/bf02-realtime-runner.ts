// BF-03 runtime entry shim. The accepted BF-01 implementation is preserved
// byte-for-byte in bf01-realtime-runner.ts; BF-03 layers a temporary,
// policy-gated correction containment adapter on top of it.
export * from "./bf03-realtime-runner.js";
