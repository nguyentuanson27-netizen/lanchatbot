# Phase B — POS refresh và chỉ dẫn owner nhất quán

Implementation base: `106d0c341f1e5f2e47e8850916c33cfc063f666f`. Candidate branch/PR391; không live send, deploy, ghi nguồn shop hay đổi kiến trúc. Owner yêu cầu review phương án → sửa/review đến APPROVE → implement → sửa/review đến APPROVE → chạy model.

## Evidence và mục tiêu

Full51 source8d4a0ab3 có b1-component-stock-v2: synced_at đổi05:34→06:04, kéo theo claim sourceVersion/evidenceRef/expiry, read-literal textHash và trusted snapshot. Diagnostic không thấy giá/tồn đổi nhưng không chứa đủ dữ liệu để chứng minh toàn bộ nguồn tương đương. Không suy từ diagnostic thành quyền bỏ qua final gate.

Code đã pin offer-only metadata khi cùng release/offer list, giữ expiry cũ. Full read lại xây claims/filter từ POS observation mới, gây mismatch trên refresh không đổi nội dung. Final gate hiện chặn exact snapshot mismatch đúng contract; sửa ở source bridge, không sửa gate.

Owner prompt đã có yêu cầu câu gọn, không báo cáo lưu hồ sơ, không câu chốt mọi tin. Tuy nhiên request_handoff declaration vẫn bảo viết phần đã biết sau prepared; select_product_media vẫn bảo thiếu ảnh không được bỏ phần trả lời khác. Hai câu này trái candidate silent policy. Chưa chứng minh nguyên nhân giọng kém là receipt/state metadata; không mở rộng projection hoặc nhồi prompt theo suy đoán.

## S1 — pin POS observation trong một request

- Trong full readProduct của createReadOnlyTools, lưu pin per-product trong closure của request, không cache liên request. Snapshot phải qua CatalogSnapshotV3Schema, đúng shop/product, status dùng được, observed không tương lai và còn freshness theo maxAge. Prepare/search/DETAILS_ONLY không pin toàn POS: giữ offer-only contract hiện có, tránh thêm phụ thuộc giá/tồn cho lượt chỉ cần ảnh/nội dung. Mốc original là lần full read đầu, không phải metadata discovery trước đó.
- Equivalence là canonical equality toàn bộ parsed snapshot ngoại trừ duy nhất root synced_at. Giữ release_id/catalog_version/policy_version/shop/brand/product/status/offer mapping, toàn bộ rows và passthrough fields, selling rules, fulfillment, shipping ETA và eta_valid_until. Không strip metadata/provenance đệ quy hoặc chỉ so PRICE/STOCK.
- Với nguồn hiện tại đủ điều kiện, cùng identity và observation không lùi so với latest seen, resolver dùng clone observation gốc đã pin. Claims/filter IDs, size availability và presentation đều sinh từ cùng observation này. Không gán observation cũ vào record nguồn, không đổi đồng hồ.
- Sau khi đã pin, bất kỳ full fingerprint khác, observation rollback, null/invalid/future/stale/wrong-scope hoặc original expiry đều vô hiệu hóa bridge của request và throw/fail-closed trực tiếp. Invalidation giữ đến hết request; không hồi phục khi nguồn trở lại giá trị cũ. Không chỉ trả nguồn mới và trông chờ trusted hash đổi, vì passthrough/version chưa được chiếu có thể không đổi hash.
- Không gia hạn observation/expiry gốc. Nếu evidence gốc hết hạn trong lượt thì vẫn chặn dù nguồn mới refresh. Bất kỳ readback được giữ phải có lần đọc nguồn thật và proof equality; không bỏ readback. Pin không áp dụng policy, catalog content, state, receipts, cart selection hoặc media sources. Static/catalog thay đổi đi qua kiểm chứng cũ.
- Giữ nguyên finalGate exact draft/trusted hash, state/revision/recipient/permission/privacy/receipts và các source checks của cart/media/handoff. Các consumer không đi qua bridge này tiếp tục fail-closed theo contract cũ.

## S2 — loại hai chỉ dẫn trái policy trên owner wire

- Sửa mô tả request_handoff: tool quyết định bàn giao; prepared chưa phải committed; không viết reply/partial/holding trong candidate silent handoff. Không dạy model báo đã chuyển hoặc gọi lại.
- Sửa mô tả select_product_media: trả đủ các ý khi dữ liệu đáp ứng; khi phải handoff vì thiếu ảnh cần thiết thì không kèm giá/ảnh/partial. Giữ khả năng gửi ảnh đã xác minh cho lượt bình thường.
- Không rewrite prompt tư vấn, không đổi receipt projection/history/verifier/model/corpus. Giọng hiện tại được review cả đoạn trong full run, không suy hai thay đổi này đã cải thiện văn phong. Không thêm ví dụ benchmark, parser, role hoặc repair loop.

## RED → GREEN và regression

RED phải quan sát trước code: full filtered/unfiltered/COMPARE read giữ exact binding qua root synced_at refresh; pin không renew TTL; static/catalog content thay đổi không bị che. Test hiện có mong new-observation mismatch được thay bằng requirement mới có đủ đối chứng.

Negative matrix: price, quantity/status, color/size/SKU, selling rules, fulfillment/region/eta_valid_until, release/catalog/policy versions, passthrough field, wrong shop/product, unavailable/null, future, stale, observation rollback. Đặc biệt đổi passthrough/nonprojected field hoặc catalog_version trong khi giữ synced_at và projected price/stock y hệt phải trực tiếp blocked; thử nguồn trở lại cũ cũng vẫn blocked. Original expiry vẫn chặn; request mới đọc observation mới. Final gate valid PASS và unchanged world eligible; state/recipient/permission/privacy/receipt changes vẫn blocked. Không tự tạo provider PASS làm measured safety evidence.

Wire tests kiểm actual constructed request có mô tả handoff/media nhất quán, không evaluator labels; source/history/receipts/verifier input không đổi. Existing compatibility holding tests và candidate silent tests giữ được.

Commands dự kiến (chỉ report PASS sau khi thực chạy): worker focused commerce tools/context/sources/boundary/ingress/session/effects; Node commerce eval tests; protected claims/reply assembler; worker build/direct TypeScript/lint. Nếu không sửa shared package thì không mở shared implementation. Exact test commands/results và RED failures ghi implementation report.

## Review và model

Cùng reviewer độc lập review phương án cụ thể này, sửa tài liệu đến APPROVE trước implementation. Sau code/self-review/test, reviewer kiểm source boundary và wire changes; sửa rồi re-review đến APPROVE. Commit executable+frozen driver, require clean worktree, capture HEAD runtime source ngoài repo; source thay đổi invalidates run identity.

Một campaign mới: same registered17controls+51native, N1/retry0; Gemini3.5FlashLiteHIGH owner/GPT6.1SolHIGH verifier, no substitution. Controls phải PASS trước native; targeted→full theo driver prereg. Không thêm model experiment/ablation vì không thay projection; không tái sử dụng attempt cũ. Mọi generation/error/private-code turn giữ denominator. Nếu controls fail thì dừng native, preserve evidence; không silently bypass hoặc retry. Customer output đánh giá actual capture/eligibility và silent handoff, không keyword scoring.

Scoped success: refresh metadata không chặn reply khi full source thật sự tương đương và original evidence còn hạn; đổi thế giới/hết hạn vẫn blocked; handoff zero customer messages; checkout hỏi/preview và confirmation giữ hoạt động. Giọng chỉ ghi nhận observed whole-turn findings, không ép GO hoặc mở lại vòng style vô hạn. Full source cũ vẫn STOP; new run không phải A2/A3 requalification. Rollback là revert đúng commits mới trên candidate, không runtime mutation.
