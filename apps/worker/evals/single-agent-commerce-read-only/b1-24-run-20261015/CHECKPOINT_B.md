# B1 — 24-case source-backed run

**Recommendation: STOP.** Batch đã chạy đủ24ca N1 trên nguồn read-only thật và giữ mọi attempt trong mẫu số, nhưng kết quả khách thực nhận chỉ có11USABLE,5NEEDS_EDIT và8FALLBACK. Đây là evidence phát triển B1, không phải Checkpoint A PASS, model qualification, production readiness hay quyền merge/deploy/live send.

## Identity và phạm vi

- `bRunSourceSha`: `fec9c51ccf2ead4842f5525b368770b3567217f5`.
- Raw savepoint trước review: `6110fb7fe1185ac6e49cfccaa473853bde95c36b`.
- Primary-review savepoint: `2d893499e3df3719e6b8f4a56fa6d0caeb103136`.
- Input hash `790a28e0415bf4b0bdf23c44993cbe78fe76415827a080e9bb09e777775dca67`; owner prompt `d6ba7b6c`; verifier prompt `fe7e2196`; schema `76797908`; tool schema `462a24dc`.
- Owner: Vertex `gemini-3.5-flash-lite`, alias/version quan sát cùng tên, global, HIGH. Verifier: Codex login relay `gpt-6.1-sol`, high, CLI0.159.2. Một attempt/ca, retry0, tối đa3owner +1verifier, `sendEnabled=false`.
- Preflight cấu hình PASS; source check PostgreSQL policy, Redis POS, Qdrant/catalog và current binding PASS,0provider generations. Run dùng synthetic demo scope, không có live customer send hoặc mutation.

## Kết quả khách thực nhận

| Kết quả | Số ca |
|---|---:|
| SEND_ELIGIBLE, send-disabled | 16 |
| FALLBACK | 8 |
| HANDOFF / NO_SEND | 0 |
| Primary USABLE | 11 |
| Primary NEEDS_EDIT | 5 |
| Primary FALLBACK_OR_NO_SEND | 8 |

Fallback rate là8/24=33,33%:7semantic FAIL và1owner BUDGET. Không có provider error, timeout, HTTP non-200 hoặc attempt bị bỏ. Primary review là đánh giá chủ quan, không độc lập và chưa được owner/human chấp nhận; review đã thấy rejected drafts sau raw savepoint nên không được gọi là blind adjudication.

| Mục đích | USABLE | NEEDS_EDIT | FALLBACK |
|---|---:|---:|---:|
| Changed occasion | 0 | 1 | 2 |
| Current policy | 0 | 0 | 3 |
| Partial source | 1 | 1 | 1 |
| Simple price | 2 | 1 | 0 |
| Component price/stock | 2 | 1 | 0 |
| Search/read | 1 | 1 | 1 |
| Buying concern | 2 | 0 | 1 |
| Used-item policy | 3 | 0 | 0 |

Toàn bộ history, exact terminal text, rejected draft/verdict và lý do whole-turn nằm trong [B1_CONVERSATIONS.md](B1_CONVERSATIONS.md). Điểm10chiều nằm trong [PRIMARY_REVIEW.json](PRIMARY_REVIEW.json); không chấm bằng từ khóa.

## Safety và boundary

-16PASS của verifier khớp exact final draft được đưa ra SEND_ELIGIBLE;23/23verifier inputs khớp draft hash, latest message và history. Case/evaluator purpose/expected labels không xuất hiện trong80captured provider requests.
- Có một action-capability defect được cho qua: `b1-component-stock-v3` hứa “em lên đơn luôn” trong khi B1 hiện chỉ có read tools. Câu này chưa báo effect đã hoàn tất, nhưng tạo bước tiếp theo bot không thực hiện được; batch phải STOP trước một provider run khác.
- Sáu trong bảy semantic fallback chặn đúng: hai physical guarantees/remedies thiếu căn cứ, ba policy approvals bỏ điều kiện quyết định, và một câu nói sai rằng chân váy không bán riêng.
- `b1-buying-concern-v2` phơi ra projection gap: owner thấy `availableOffers`, nhưng verifier trusted snapshot không mang các offer chưa được read/bind. Vì vậy verifier không thể xác minh câu mua riêng dù nguồn tool đã cho owner thấy. Đây không chỉ là prompt “nới/siết”.
- Các read size M thực sự lọc live source, nhưng protected STOCK scope giữ offer identity mà không có trường size. Không quan sát thấy stock answer sai trong batch này; tuy vậy verifier/final binding chưa tự chứng minh được chiều size, nên đây là evidence-contract gap cần sửa trước khi coi size-specific stock là vững.

## Operational evidence

| Chỉ số | Quan sát |
|---|---:|
| Generation/provider requests |57owner +23verifier =80 |
| Retry / error / timeout |0 /0 /0 |
| Attempt latency p50 / p95 |11,99s /21,89s |
| Verifier generation p50 / p95 |5,87s /11,24s |
| Added verification p50 / p95 |6,63s /12,00s |
| Tool latency p50 / p95 |0,54s /3,05s |
| Tool rounds / calls |33 /36 |
| Owner input/output/thinking tokens |186.336 /22.063 /19.589 |
| Verifier input/output/reasoning tokens |83.118 /2.516 /1.720 |
| Cost |provider không expose; `null` |

Chi tiết máy đọc được: [METRICS.json](METRICS.json), [AUDIT.json](AUDIT.json). Completion giữ exact source identity và worktree executable/config sạch; raw được commit trước review. Không có generation sau batch.

## Kết luận xử lý

Không thêm ví dụ hay câu luật vào owner prompt rồi chạy lại. Prompt hiện đã nói rõ không gọi tool khi hết budget, không duyệt policy chỉ từ `read_policy`, không hứa thao tác không có tool, không kéo câu hỏi giá thành xin size và phải chọn một hướng; model vẫn vi phạm đúng các điểm đó.

Lát cắt sửa tiếp theo nên sửa contract đang mất nghĩa:

1. Search output chỉ đưa một callable product ref cho owner; hiện cùng payload có `products[].ref=product:SV1561` và `subjects[].ref=SV1561`, gây một tool rejection rồi cạn budget.
2. Mang exact offer và size selection từ code vào protected claim/binding để owner và verifier nhìn cùng một authority; không dựa vào native tool history hoặc lời prompt để ghép nghĩa.
3. Project policy bằng trạng thái code-owned `POLICY_INFORMATION_ONLY/NEEDS_CONFIRMATION` cùng các điều kiện chưa được xác lập từ policy hiện tại. Owner vẫn trả thời hạn/phí nhưng không được biến raw policy lookup thành duyệt đơn.
4. Đưa unavailable future effects vào protected capability semantics của chính verifier hiện có, hoặc cung cấp code-owned allowed next steps; không thêm model thứ ba, regex hay repair loop.
5. Sau focused RED→GREEN cho bốn contract trên, chạy lại đúng các ca sở hữu lỗi trước. Chưa có quyền tự mở provider batch mới trong report này.

STOP tại owner review. Không production wiring, mutation, merge, deploy hoặc live send.
