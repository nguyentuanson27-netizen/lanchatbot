// Pinned transport identity for retained Sol-specific experiments and offline judges.
export const CODEX_SOL_VERIFIER={
  "provider": "OPENAI",
  "model": "gpt-6.1-sol",
  "version": "gpt-6.1-sol",
  "effort": "high",
  "credentialRoute": "CODEX_CHATGPT_LOGIN",
  "generationConfig": {
    "transport": "CODEX_CLI_BOUNDED_INFERENCE_RELAY",
    "cliVersion": "0.159.2",
    "wireApi": "responses",
    "endpoint": "https://chatgpt.com/backend-api/codex/responses",
    "tools": [],
    "tool_choice": "none",
    "parallel_tool_calls": false,
    "store": false,
    "stream": true,
    "reasoningEffort": "high",
    "temperature": "OMITTED_PROVIDER_DEFAULT",
    "topP": "OMITTED_PROVIDER_DEFAULT",
    "maxOutputTokens": "OMITTED_CODEX_BACKEND",
    "timeoutMs": 90000,
    "maxResponseBytes": 1048576,
    "relayUpstreamRequestsPerAttempt": 1,
    "retry": 0,
    "clientContinuation": "REJECT_WITHOUT_FORWARDING",
    "errorPolicy": "FIRST_UPSTREAM_ERROR_TERMINATES_ATTEMPT_NO_GENERATION_RETRY"
  }
};
