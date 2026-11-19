# Independent implementation findings and corrections

The reviewer `/root/post_contract_input_review` reported the following on the working diff based on `69863181`. This record transcribes the review messages and records the author's corrections. The initial reviewer turn ended at the model usage limit.

| Finding | Correction |
| --- | --- |
| The outer writer-first quote wrapper executed siblings before the stronger media requirement reached the media batch guard. | Check the declared requirement before any sibling dispatch in both batch paths. The disposable PostgreSQL test checks unchanged profile/cart, zero quote work and a single silent handoff. |
| Negative lookup replay used the generic missing-media reason and rejected unchanged stronger lookup evidence. | Selection and readback use the same outcome function. The focused test checks stable readback and rejects changed catalog evidence. |
| The owner adapter rejected the new media capability shape because the allowlist still described only the old producer. | Accept both bounded shapes, validate the new field, and test the actual producer with the adapter projection. |

During self-review, the author also found that accepted-image history dropped a physical attachment with two product proofs. The reader now projects each proven product scope, and the PostgreSQL control checks accepted history and revocation of either source after a dispatcher restart.
