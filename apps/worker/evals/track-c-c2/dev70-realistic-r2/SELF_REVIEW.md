# Review amendment: DEV70 R2

Baseline: `6ae9ad3d33010e5262ae5eb303df75411974960e`. This is a same-session self-review, not an isolated independent reviewer.

Q014 now has the customer select SQ9012; the shop states its price is above the stated budget rather than promising to stay within it. The final refusal does not repeat the budget. Q036 keeps measurements and the old fit concern early in history and refers back to the old garment without repeating the size result. Q063 asks about the customer's deadline without supplying an ETA answer. Only these three dialogues change; expectations, facts and canonical case context do not.

Binding status/cardinality, source-stage consistency and supplied cart readbacks now fail closed on malformed inputs. The intentional missing-readback Q024 and missing-mapping Q043 controls remain permitted.

An executable baseline pins this amendment to the published R2 commit. The earlier R1 comparison is explicitly unavailable; it is neither a PASS nor a FAIL. Counts and naturalness diagnostics are regenerated in coverage.json, not used as quality scores.

Naturalness remains an editorial judgment. No real-customer corpus, human panel, model judge, conversion result or measured long-memory result is supplied. See verification.json for checks actually executed by the applicator.
