# Q081 price-comparison guard regression

The source-`8cd20ab` Luna DEV70 run exposed a false negative: Q081 passed while its model-authored prose said `SQ9012 rẻ hơn SV9031` from two selected price facts. The code had not produced a bound comparative claim. The existing prose guard now rejects an asserted “product code / this model + cheaper, dearer, lower or higher than” price comparison in an untrusted prose slot. It still accepts the customer's reported concern about another cheaper product, since reporting that concern does not assert a shop comparison.

The focused strategy-contract suite passed **72/72**, worker TypeScript passed, and exact recorded-output replay of Q081 now returns `TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT`. Recorded Q015 (customer-reported cheaper alternative) and Q072 (bound exchange policy) still complete. The replay used the original source-`8cd20ab` Luna stage outputs; it was not a fresh provider run or a new DEV70 score.

This closes the known **guard false negative**, not the comparison capability. A customer-facing cheaper-than answer needs a code-derived claim bound to both current price sources, with a final guard readback; the two separate price sentences remain available without that conclusion. Overall C3 quality remains RED.
