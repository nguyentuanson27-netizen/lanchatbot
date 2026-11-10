# Phase B — discovery and media follow-up, 2026-10-25

Phase B remains **STOP / not GO**. This change improves the source contract for product discovery and clarifies two owner instructions, but a four-turn provider check still has a discovery fallback and a verifier-rejected media draft. No production wiring, deploy, or live send was performed.

## Change and reason

The previous 51-turn review found that a customer asking for an office set under 1 million received a generic fallback. The owner sometimes read every offer of several search results, exhausting the eight-subject bound before it could answer. `search_products` already read and bound each product's current offer identity, but only placed the offer codes in trusted policy literals. It now also returns `availableOffersByProduct` alongside the candidate list. This is a code-owned projection of the same verified source, with `null` when the offer mapping is unavailable. The owner prompt directs a targeted `read_product` for the part the customer wants. It also separates garment design from a personal fit guarantee and distinguishes a general product image from a confirmed image of the requested color. No classifier, case regex, new role, provider retry, or verifier change was added.

The structural test for the new search field was RED before implementation and GREEN afterward. On the final source, the focused tool/media suites passed 95/95, protocol/prompt suites 18/18, worker build and lint passed, and `git diff --check` passed. The earlier prompt-only source also passed 25/25 protocol/registration tests and worker build.

## Provider evidence

Both runs used the existing Vertex `gemini-3.5-flash-lite` HIGH owner and Codex-login `gpt-6.1-sol` HIGH verifier, one attempt per registered turn, no live send. The run sources were clean before preflight: prompt-only `b10f1e07e89c573ca4ea4388ebeaa8d4909ca415`, then code plus prompt `5beb8554036e135d815569871b21b22d88ac745d`. Both preflights returned `PREFLIGHT_PASS` with zero generations. Registrations, requests, attempts, actual capture, and model accounting are retained outside the repository at `C:/Users/nguye/Documents/Sản phẩm AI/c3-b-current-fix-20261025/journey-openings` and `.../journey-openings-v2`. These four opening turns are a targeted diagnostic, not the 51-turn Phase B acceptance population.

| Turn | Prompt-only source | Final source and actual customer outcome |
|---|---|---|
| Discover office set under 1 million, avoid tight waist | FALLBACK `OWNER_TOOL_MODE` before verifier | FALLBACK `OWNER_TOOL_MODE` before verifier; customer received `C3_A_NONPROTECTED_V2` |
| Request an image of a beige set | PASS, two images, but reply mentioned an internal system and extra price/size | Verifier FAIL on unsupported claims that the shop has no separate beige image and that the image proves fabric; code-owned verified-media recovery captured two general product images with “Em gửi chị ảnh của mẫu để mình xem trước nhé.” |
| Size from height/weight | PASS | PASS; still repeats height and weight and sounds more certain than the sales style target |
| Delivery deadline to Cần Thơ | PASS | PASS; correctly declines an unsupported next-morning promise |

Final run: four registered outcomes, 10 owner and 3 verifier generation requests; two SEND_ELIGIBLE, two FALLBACK. The gallery fallback captured two verified images. The discovery fallback captured no image. There was no reported upstream timeout or HTTP error and no automatic retry; the third discovery generation was locally marked `PROVIDER_ERROR` for an unexpected tool call. The provider request log shows final-only `toolConfig.functionCallingConfig.mode=NONE` and zero declared tools for that request, yet the model returned `select_product_media`; runtime correctly rejected this as `OWNER_TOOL_MODE` without executing the call or sending an unverified draft. Before that, the owner read `SQ675:SET_QUAN` and `SQ748:SET_QUAN` successfully. SQ675 was 1,279,000đ, above the customer's budget; SQ748 was 799,000đ but described as shorts. The verified offer projection solved the earlier all-options read rejection, but it did not create a suitable sales decision.

The gallery model followed the color-free image path and selected two assets, then asserted the shop had no beige-specific image. `MEDIA_COLOR_BINDING_UNVERIFIED` cannot establish that absence. The verifier rejection was appropriate; the deterministic image recovery preserved the useful verified images without reusing the rejected prose. The actual recovery does not claim the images show beige.

## Remaining work

The discovery case needs a real shop option matching garment type, budget and use, or a useful answer about the tradeoff if none is found. Inspect search ranking and available catalog before changing prompts again. The final-only native continuation returning a function call despite `mode=NONE` must be treated as a provider/transport behavior and kept fail-closed until a bounded, tested solution exists. The media draft still repeats an unsupported absence inference despite clearer instructions; retain the verified-image fallback and test any future source/context change against the whole customer outcome. A full 51-turn requalification and independent sales-quality review remain outstanding. The generic semantic-failure fallback is still weak, but replacing it with a specific claim from a rejected draft would violate the whole-reply gate.
