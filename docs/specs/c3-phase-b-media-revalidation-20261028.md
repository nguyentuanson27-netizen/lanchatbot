# Phase B — tái xác nhận nguồn ảnh không đổi

Base `57fb94deaf906d575f352f9b5422e1ad8c117c5a`. Owner chấp thuận sửa producer/projection/eligibility, tái xác nhận11ảnh SV2447, sau đó preflight và run mới. Không deploy, không đổi approval, không đổi TTL30ngày hoặc timestamp xuất bản.

## Bằng chứng trước khi sửa

- Run trước dừng0provider vì ảnh dùng productobservedAt28/09, hết hạn28/10 lúc11:31 giờ Việt Nam.
- Đọc qua existing audited Ops route: Qdrant11points, image_registry chỉ10dòng tương ứng cònAPPROVED/ACTIVE/VERIFIED. Không gia hạn point không có dòng hiện hành.
- IMAGE_HASH là hash của ảnh canonical sau FfmpegImagePipeline.prepare(maxWidth800), không phải rawCDNbytes. Read-only check bằng pipeline của staging hiện hành cho10/10 khớp cảregistry vàpoint; không được dùng rawhash khác để tự thay IMAGE_HASH.

## Thiết kế

1. Thêm một attestation riêng `image_revalidation` trong payload: version/status/checkedAt/metadataSha256. Chỉ VERIFIED sau khi registry hiện hành, product/point/url/hash và metadata khớp, canonical image hash thực tế khớp IMAGE_HASH. Hash binding bao phủ identity và classification/approval/color binding; timestamp không cấp quyền đổi các trường này.
2. Qdrant projection kiểm binding rồi xuất trạng thái revalidation riêng trên ProductImage; giữ observedAt cũ. Proof sai/metadata đổi làINVALID, không fallback về ngàypublish. Absentproof giữ cơ chếlegacy.
3. Eligibility, expiry của claims và source/readback identity cùng dùng mốc revalidation đã kiểm. Future/stale/invalid proof không cấp media. Giữ nguyên source identity/final gate; ảnh không liên quan vẫn hoạt động khi một ảnh bị loại.
4. Bổ sung helper producer dùng canonical prepare port hiện có và kiểm nguồn trước/sau prepare. Ghi payload proof có readback, không embedding/provider. Nối helper vào publisher bằng scope productIds tường minh; NOOP cũng có thể tái xác nhận khi đến hạn. Không tự bật scope cho toàn bộ catalog hoặc deploy service trong task này.
5. Operator refresh chỉ11points SV2447, trước/sau córeadback/audit;10rows hợp lệ có thểVERIFIED, orphan không được gia hạn. Không sửa Sheets/IMAGE_HASH/REVIEW_STATUS hoặc vector. Nếu source thay đổi/commit chưa xác nhận thì failclosed, không retryghi mù.

## Verification

ObservedRED→GREEN cho oldpublication+freshproof, invalid/future/staleproof, changedmetadata/hash, source revoked/missing, NOOPrefresh vàwrite/readbackfailure. Existing media/selector/producer/Qdrant/projection focused tests, shared package typecheck/build, worker typecheck/build/lint và eval protocol tests theo phạm vi tác động. Không đổi owner/verifier prompt hoặc corpus labels để cứu run.

Sau code/verification và bounded source refresh: commit executable, require clean HEAD, capture fresh source, register/run mới17controls→51nativeN1/retry0. Giữ nguyên run BLOCKED và mọi attempt lỗi trước. Không claim all51executed nếu có NOT_RUN hoặc provider failure.

## Implementation và verification trước khi ghi nguồn

- Proof version1 ràng buộc product/URL/content hash, approval/active, classification, parts và color binding. Projection tách revalidation khỏi observedAt; invalid proof không fallback về publish. Claims/capabilities/readback dùng cùng observation time mới; thay proof sau selection bị chặn.
- Producer dùng canonical bytes theo cùng recipe duyệt ảnh. Nhánh này có bounded download, kiểm MIME/dimensions và redirect/host trước decode. Không đổi pipeline prepare cũ; không gọi embedding/RemBG để gia hạn.
- Publisher nhận scope qua `P23C_MEDIA_REVALIDATION_PRODUCTS` mặc định rỗng, xử lý cả NOOP. Proof không đi vào semantic/embedding hash nên không sinh vòng re-embed. Source được đọc lại trước/sau kiểm tra; source identity thay đổi thì dừng trước ghi, write/readback unknown không retry. Chưa deploy/configure service live trong task này.
- Observed RED của eligibility:2FAIL/3PASS; sau sửa5PASS. Final focused shared/worker:1113PASS/0FAIL trên53files; Node eval228PASS/0FAIL. Business-tools build và direct typecheck PASS; direct worker build và worker lint/typecheck PASS. Source scope không đổi owner/verifier/corpus/TTL.
- Một số intermediate type/test assertion errors đã được sửa trước final checks; không tính chúng là semantic TDD evidence. Xem [verification record](../../apps/worker/evals/single-agent-commerce-read-only/media-revalidation-fix-20261028/VERIFICATION.json).
- Operator preflight r7:10WOULD_VERIFY/1WOULD_INVALIDATE,0writes. Đây là kế hoạch đã kiểm nguồn/canonical bytes, chưa phải write/readback thực tế. Dry-run cố ý chặn writeProof nên internal helper trả WRITE_UNCONFIRMED; output ghi rõ WOULD, không giả lập DB readback. Các preflight r1–r4 lỗi config/interface trước ghi được giữ riêng; r5/r6 là các lần đọc thành công trước hardening cuối.
- Bundle input hashes được seal; apply yêu cầu clean committed source và cùng bundle với preflight đã đạt. Credentials chỉ qua encrypted SSH stdin memory, không argument/file/log. Chỉ payload key image_revalidation được cập nhật trên đúng11point IDs SV2447; không sửa Sheets/approval/hash/vector/publishedAt. Rollback freshness mới bằng proof INVALID và rollback candidate code; không xoá point/vector.

Tại thời điểm ghi phần này: **chưa source write hoặc provider generation**. Bản ghi kết quả apply và model run sẽ được bổ sung riêng, không đổi các run BLOCKED cũ.

## Bounded apply đã hoàn tất

Applyr7 chạy trên clean committed source `57fb9f320655f15d43af2300682b5c3923c90066`, cùng bundle đã preflight. Kết quả10VERIFIED và1BLOCKED/SOURCE_NOT_APPROVED có proofINVALID cho orphan. Cả11proof writes có readback, không có WRITE_UNCONFIRMED hoặc attempt retry; semanticFieldsUnchanged=true. Provider/embedding/Sheetswrites/vectorupserts đều0. Không đổi publishedAt, IMAGE_HASH hoặc approval.

[Apply/readback evidence](../../apps/worker/evals/single-agent-commerce-read-only/media-revalidation-fix-20261028/OPERATOR_APPLY.json). Credential broker Ops có audit started/completed cho scopeSV2447/11point IDs; plaintext credentials không vào logs/files/arguments. Chưa deploy service hoặc bật cấu hình revalidation định kỳ; candidate code có hook scope tường minh, live adoption cần release riêng.

Tiếp theo là fresh capture/preflight và campaign model mới trên clean committed source; không dùng proof mới để sửa ngược run BLOCKED cũ.

## Downstream delivery diagnostic

Campaign source342c1e97:17controlsPASS,12native đã chạy,39NOT_RUN. Actual capture phát hiện hai consumer cuối còn dùng publish time; dừng parent dispatch và để child cleanup xong trước khi sửa source. Không tính SEND_ELIGIBLE nhưng MANUAL_REVIEW là gửi thành công. [Full stopped-run record và follow-up verification](../../apps/worker/evals/single-agent-commerce-read-only/media-delivery-stopped-20261028/CHECKPOINT_B.md).

Sửa gate durable media và ProductFacts media projection dùng cùng effective observation. RED2FAIL→GREEN28; final1128Vitest/228NodePASS, workerbuild/lintPASS. Real isolated PostgreSQL regression2PASS: exact capture sau restart khi proof còn đúng; revoke sau enqueue chặn toàn nhóm. Không ghi nguồn lần nữa, không đổi prompt/corpus/TTL. Source mới phải commit và clean seal riêng trước lượt model mới.

## Fresh source49731e77: provider control BLOCKED

Clean source49731e77 chạy đủ17controls:16valid results/1PROVIDER_STREAM_ERROR HTTP200, giữ failclosed. Existing native readiness chặn CONTROL_PROVIDER_ERROR dù semantic summary tính unsafe-error là không send-eligible. Native0/51,51NOT_RUN; không hidden retry hoặc thay model.17requests/maximum1per generation,0evaluator label matches; không gộp12native của source cũ. [Full report](../../apps/worker/evals/single-agent-commerce-read-only/media-delivery-fixed-run-20261028/CHECKPOINT_B.md). B_NOT_GO/BLOCKED, chưa deploy/live send.

## Independent review follow-up

Review cf0a61e3 yêu cầu sửa2P1: expiry vượt qua async gate và registry revocation đã thấy nhưng own persisted proof vẫnVALID. Đã thêm regressionRED6→GREEN, conditional proof quarantine và current-clock final gate. Final1139Vitest/228NodePASS, workerbuild/lintPASS; chưa chạy model/ghi nguồn lại. Unknown write/readback không đồng nghĩa persisted proofINVALID; giới hạn cross-store và wire-only filtered-write coverage ghi rõ trong [review record](c3-phase-b-media-revalidation-independent-review-20261028.md). Re-review pending, B_NOT_GO giữ nguyên.

Re-review610d1ff1: cùng reviewer chạy139testsPASS và đóng2P1. FindingP2 bổ sung: operator có thể báo COMPLETE khi last-point INVALID write chưa confirmed. Đã sửa unconditional unknown failure, tách proposed/observed proof và6offline table testsPASS; chưa re-execute operator hoặc sửa evidence apply cũ. Chờ same-reviewer follow-up.

Final: cùng reviewer **APPROVE exact clean3e8efa047b8654103c65c8d39efb17a6279cd71d**, không còn finding chặn. Reviewer tự chạy234NodePASS và giữ139Vitest evidence trên cùngTSbytes; root1139Vitest/build/lintPASS. [Decision/limits](c3-phase-b-media-revalidation-independent-review-20261028.md). Approval chỉ implementation/evidence; campaign49731e77 vẫnBLOCKED/native0of51. Không chạy provider/ghi nguồn/deploy trong vòng review này.

## Owner-authorized full model run sau approval

Clean source0487b7bb (executable khớp approved3e8efa04):17controlsPASS và51/51native complete N1/retry0.142generation requests,0providererror/timeout,0labelleaks,6DBcleanup.37eligible/10handoff/4NO_SEND/0fallback;16persistedeligible đềuactualcapture/SENT_ACCEPTED, không cònMANUAL_REVIEW.9ảnh đượccapture, khônglive send/sourcewrite. Thương lượng nêu đúng30k/tổng499k; discovery/gallery và comparative wrinkling vẫn cầnreview, không dùngeligiblecount làmqualityscore. [Full report/all51](../../apps/worker/evals/single-agent-commerce-read-only/media-approved-run-20261028/CHECKPOINT_B.md). Run hoàn tất, tổng thểSTOP/B_NOT_GO; evidence2run cũ không đổi, không tự mở vòngfix/run tiếp.
