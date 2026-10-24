# Source decisions

Owner2026-10-18: all southern destinations share the shop southern transit time. Times remain catalog shipping_eta values, preparation remains per-product/preorder.

Administrative identities/legacy mergers checked against official source:
https://baochinhphu.vn/quoc-hoi-thong-qua-viec-sap-xep-don-vi-hanh-chinh-cap-tinh-ca-nuoc-co-34-tinh-thanh-102250612100156988.htm
https://baochinhphu.vn/chi-dao-dieu-hanh-cua-chinh-phu-thu-tuong-chinh-phu-ngay-4-7-2025-1-102250704190956567.htm

Implemented administrative-component lookup recognizes the eight unambiguous southern parent groups and their pre-merger province names. Mixed central/highland merged territories such as Lam Dong are deliberately not assigned to southern shipping. Not a universal address parser: exact comma/semicolon/newline component required, street substrings are not provinces. Same parent legacy/current names agree; conflicting province components fail. More ambiguous free text remains unresolved. No source transit numbers copied into code.

Description candidate uses existing registry-description fields/authority enum through the eval read port; not an actual published registry update. originalSha256 binds current source description, source change fails before use. Both owner/verifier see identical derived evidence with explicit candidate-registry-description version. observedAt/catalogVersion/attributes/product identity preserved. The original source remains in previous raw captures.

Preserved SV2447 details: embroidered Korean silk top, raised embroidery, light form, soft/airy fabric/natural movement; Korean silk lace skirt, soft/light/natural drape; set composition. Removed repeated aesthetic endorsements, not measured product data. No lining/opacity/thermal/durability proof or forced per-case recommendation added. Price/stock/offers remain independent POS sources.

