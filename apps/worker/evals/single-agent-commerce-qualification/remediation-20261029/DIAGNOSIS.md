# S0 diagnosis — all22 scenarios, no new generations

Implementation base df37d302; refreshed main296cdcf. Historical run36e45015/primary12PASS2FAIL8UNRESOLVED unchanged. Original raw/native request ledger inspected; observations are not re-grades.

|Case|Initial source IDs|Observed tool proposals|Final terminal|Diagnosis|
|---|---|---|---|---|
|c-20261028-s01|SV1561|quote_product|HANDOFF/DEPENDENCY_FAILURE|quote_product without continuation; active-policy seam hypothesis, not source-price absence.|
|c-20261028-s02|SV2447,SQ2447|read_product,read_product,read_product,read_product|SEND_ELIGIBLE/|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-s03|V406|select_product_media|HANDOFF/DEPENDENCY_FAILURE|media selection then early HANDOFF; need lookup observation, not global absence inference.|
|c-20261028-s04|SV2447,SQ2447|read_product,read_product,request_handoff|HANDOFF/RESPONSE_UNAVAILABLE|Owner requested HANDOFF after detail reads; evaluator source insufficient, judgement unchanged.|
|c-20261028-s05||search_products,read_product|SEND_ELIGIBLE/|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-s06|SV2447,SQ2447|read_product,read_product,view_product_media|HANDOFF/DEPENDENCY_FAILURE|Observed OWNER_REQUEST_BOUND before dispatch; owner3 zeroHTTP, not provider outage.|
|c-20261028-s07|SV2447,SQ2447|search_products,apply_customer_state,recommend_size,recommend_size|SEND_ELIGIBLE/|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-s08|V039,V168|read_product,read_product|SEND_ELIGIBLE/|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-s09|SV2447,SQ2447|read_product,read_product,read_policy|HANDOFF/POLICY_UNAVAILABLE|read_policy then POLICY_UNAVAILABLE; RED test confirms active-policy port replaced with pinned port.|
|c-20261028-s10||read_policy|HANDOFF/POLICY_UNAVAILABLE|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-s11|SV2447,SQ2447||HANDOFF/DEPENDENCY_FAILURE|HTTP200 with offerType OBJECT instead of STRING; keep schema rejection, no coercion/retry.|
|c-20261028-s12||read_policy|HANDOFF/POLICY_UNAVAILABLE|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-s13|SV2447,SQ2447|read_product,read_product,read_product,read_product,request_handoff|HANDOFF/ETA_UNAVAILABLE|Owner ETA_UNAVAILABLE handoff; missing evaluator ETA context, no regrade.|
|c-20261028-s14|||SEND_ELIGIBLE/|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-s15|SV2447,SQ2447|read_product,read_product,read_product,read_product|SEND_ELIGIBLE/|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-s16|SV2447,SQ2447|search_products,read_product,read_product|HANDOFF/DEPENDENCY_FAILURE|Search/detail reads then DEPENDENCY_FAILURE; no proof of shop-wide missing media.|
|c-20261028-j1|SV2447|read_product,add_to_cart|NO_SEND/HUMAN_OWNS_CONVERSATION|Verifier correctly FAIL unsupported available be color; no successful cart receipt; later HUMAN no-send.|
|c-20261028-j2|SV2447|recommend_size,recommend_size,request_handoff|NO_SEND/HUMAN_OWNS_CONVERSATION|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-j3|SV2447|quote_product,read_product|SEND_ELIGIBLE/|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-j4|SV2447|add_to_cart,add_to_cart,record_negotiation|SEND_ELIGIBLE/|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-j5||request_handoff|NO_SEND/HUMAN_OWNS_CONVERSATION|Retain primary resolved grade and exact source/gate/history evidence as regression.|
|c-20261028-j6|SV2447|read_product,add_to_cart,confirm_purchase|CODE_OWNED_SEND/|Committed code clarification question captured; corpus code-owned registration/history gap, not unsafe model send.|

Source existence is distinct from owner observation. Original source/byte hashes remain in ../run-20261029/LOCAL_RAW_INDEX.json; raw/policy/model requests/grades were not mutated. All22 initial judge facts empty; audit facts depend on verifier, so early handoff cannot be graded by source absence alone.

Safe media control: product read without a complete scoped lookup did not establish absence. Retain11/12safe result; reuse actual runtime lookup observations without overriding required-media silent handoff.

Confirmed seam: candidate-provider.read and stateful-provider.read construct active sources but return the separate transaction-pinned policy port. Fix forwarding, not global resolver status rules.
