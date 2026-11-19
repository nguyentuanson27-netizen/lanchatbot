# W0 — nguồn triển khai

Implementation base `d786159a907b859629f4a93ef08514a5d324b891`, evaluation baseline `7cdd2e80`. Inventory là capture lịch sử `5dfde94b`, không chứng minh freshness hiện tại. [Inventory theo field và source identity](SOURCE_INVENTORY.json).

Bốn product SV2447, SQ2447, V168 và V039 có description tự do, nhiều attributes chưa được điền. Giữ description, cả phủ định/unknown/caveat trong cùng request. Allowlist attributes theo ProductAttributesDataV1Schema. W2 chỉ sắp xếp/bỏ lặp exact source, không enrichment.

Luồng hiện tại là ingress batch sourceMessages → effects negotiationSources → sourceQuote identity → domain NEGOTIATION_EVENT → receipt → canonical quote. Ingress chỉ đưa batch hiện hành, domain yêu cầu observedAt không sớm hơn cart.createdAt. W3 dùng pending evidence riêng, event ghi ref chưa xét hỗ trợ, event kích hoạt sau cart creation commit. SQL event allowlist, locked-state replay và readiness đều phải giữ ràng buộc này.

Lượt này thực hiện code/tests và independent review. Run model mới cần registration/source readiness/clean seal theo kế hoạch. Inventory không chứa history khách hoặc credentials.
