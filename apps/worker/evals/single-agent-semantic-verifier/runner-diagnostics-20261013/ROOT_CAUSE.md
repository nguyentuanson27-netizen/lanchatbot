# Recurring A2 evidence loss — diagnosis and source fix

Owner yêu cầu tìm root cause trước khi chạy lại. Phạm vi lần sửa này là lưu evidence của runner A2 đang dùng. **Không gọi provider, không tạo vòng mới, không sửa prompt/nhãn/model/ngưỡng, không chạy A3.** Round64 vẫn **BLOCKED: 349/351 terminal, 2 started UNKNOWN**, 6 SAFE failures vẫn giữ nguyên. Báo cáo và raw của R64 không được viết lại.

implementationBaseSha sau refresh main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Source trước sửa: `24ccbc8c4affb7be79fa1e414e37864f338184a8`, branch `feat/c3-semantic-verifier-checkpoint-a-20261005`. Đây là sửa source để chuẩn bị, không phải `a2RunSourceSha` hoặc một kết quả qualification mới.

Source fix và 9 regression tests đã commit tại `eefcbe5671373e89f1c441b572701dcb7cb21e8a`; documentation savepoint theo sau, trong cùng draft PR390. Source sửa xong không được gán ngược cho các invocation R64.

## Lỗi lặp lại và mức chắc chắn

| Evidence | Điều có thể kết luận | Điều chưa biết |
| --- | --- | --- |
| [R47 completion](../round-47/A2_COMPLETION.md): runner cũ không ghi dispatch start; slot thiếu đầu tiên có thể đã gọi model | Mất process có thể làm mất cả thông tin đã dispatch; gọi lại slot đó không chứng minh được max 1 request | Request/kết quả thật của invocation thiếu không thể khôi phục từ báo cáo |
| [R63 completion](../round-63/A2_COMPLETION.md): thiếu exit/stdout của hai agent sau orchestration usage failure, nhưng raw có finishedAt và mọi outcome đã giữ | Agent/tool session không phải nơi duy nhất để giữ evidence; thiếu exit log khác với mất model outcome | Nguyên nhân/exit process thật chưa có log, không được bịa exit code |
| [R64 completion](../round-64/COMPLETION_SCOPE.md): shard0 main có 64 terminal, tmp có 65, wrapper exit1 với lỗi chung | Bản cập nhật hoàn chỉnh đã tồn tại nhưng publication chưa hoàn tất. Logger xóa mất stage/OS code | Không còn OS error thật để khẳng định chính xác EPERM trong invocation lịch sử |
| R64 shard1/2: mỗi shard có 76 terminal và một started UNKNOWN; tool session biến mất sau đổi orchestration owner; không có wrapper exit | Hai invocation phải giữ UNKNOWN, không retry hoặc coi là verifier FAIL/PASS | Không chứng minh được OS/job/tool nào đã chấm dứt process, hoặc upstream đã trả lời chưa |

Có hai lỗi source đã tái hiện được. Thứ nhất, initial shard chỉ gọi rename một lần sau write; một reader Windows giữ file không cho delete sharing làm rename ném **EPERM**, dù tmp đã chứa JSON hoàn chỉnh. Native regression dùng một PowerShell reader thật, không giả provider failure. [FileShare documentation](https://learn.microsoft.com/en-us/dotnet/api/system.io.fileshare?view=net-10.0) phân biệt quyền đọc và quyền delete; test quan sát trực tiếp lỗi rename. Đây là cơ chế phù hợp với publication failure R64, không phải bằng chứng OS code của invocation cũ.

Thứ hai, adapter chỉ trả request/count/reply khi dọn client/server xong, và runner chỉ lưu khi evaluateA2Attempt trả về. Result và request accounting trước đó chỉ ở RAM. Local HTTP test chứng minh đã nhận reply mà evidence vẫn chỉ có invocationStartedAt trong lúc client cleanup chưa kết thúc. Điều này chứng minh khoảng trống lưu evidence, không chứng minh hai UNKNOWN của R64 đã từng có completed reply.

Việc đổi người theo dõi giữa chừng là rủi ro execution riêng. [Windows job documentation](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects) cho biết tiến trình con có thể thuộc cùng job và bị chấm dứt cùng nhau; chỉ thêm detached/unref không chứng minh runner sẽ sống sau tool/agent teardown. Không thêm launcher/service/job framework dựa trên giả thiết chưa tái hiện này. Người vận hành lần chạy được owner duyệt tiếp theo phải giữ process ownership đến khi có actual exit và raw readback; không kết thúc/handoff agent đang sở hữu tool process, không commit source lúc shards đang chạy.

## Thay đổi nhỏ nhất cho rủi ro đã chứng minh

1. Initial shard và completion dùng cùng `publishA2Evidence`: write tmp rồi tối đa 4 rename, cách nhau 50ms, chỉ khi EPERM/EACCES/EBUSY. Retry là publish **cùng bytes**, không gọi lại model. Lỗi khác dừng ngay. Hết retry giữ main/tmp để kiểm tra, dừng trước slot kế tiếp. Stderr giữ stage WRITE/PUBLISH và OS code được giới hạn; không in arbitrary error text/path/credential.
2. Adapter có callback đồng bộ vào **file evidence hiện có** sau upstream dispatch và sau kết quả/error, trước client cleanup. Runner ghi `transportCheckpoint` của invocation đang chạy: exact runtime request, count, kết quả đã nhận, timestamp/telemetry. Không thêm journal, file per-attempt, operator hoặc product state. Callback không đi vào model request.
3. Kết quả lưu sớm chưa có terminal và **không cấp send eligibility**. Final deterministic gate hiện có vẫn quyết định sau khi adapter trả về. Lưu terminal thành công thì bỏ field tạm để completed evidence giữ dạng cũ. Lỗi persistence abort invocation, trả lỗi ra runner, không che thành provider FAIL và không generation retry. Quota result được chia sẻ qua capacity block hiện có trước cleanup.

Request dispatch ghi nhận một upstream call đã bắt đầu, kể cả thất bại truyền tải; không chứng minh provider nhận/hoàn thành request. Hard kill trước callback vẫn có thể để lại started UNKNOWN. Nếu upstream không bao giờ trả kết quả thì không thể tạo terminal hoặc một verdict giả. Fix thu hẹp khoảng mất evidence và giữ accounting đã quan sát; không hứa loại bỏ mọi interruption hay phục hồi hai invocation lịch sử.

## TDD và self-review

Observed RED: **0/6**, exit1 trước behavior fix. Native Windows test ném EPERM; hai capture tests thiếu request/result record trước cleanup. Các fault-injection tests còn lại kiểm tra contract mới về retry hữu hạn, giữ tmp, mã lỗi giới hạn.

GREEN ban đầu: **29/29** focused (persistence, R64, completion, adapter diagnostics). Sau bổ sung hard-kill/no-retry coverage: **9/9** persistence. Full serial eval/provider-adapter: **388/388**, 0 skipped. Boundary/Vertex **79/79**; protected claims/reply assembler **21/21**. Exact commands, actual exits và các verification cuối trong [VERIFICATION.json](VERIFICATION.json).

Hai subprocess tests thật kill runner ở DISPATCHED và RESULT. Cả hai giữ request count1, terminal null; summary vẫn BLOCKED, restart bị từ chối trước generation. Test RESULT cố tình lưu PASS nhưng không biến nó thành terminal. Persistence-error test chứng minh một upstream call và lỗi thoát ra, không hidden retry. Local auth marker không xuất hiện trong evidence; existing full-corpus wire-capture tests vẫn chứng minh evaluator-only labels không đi vào model request.

Self-review: callback chỉ giữ telemetry/response trong eval artifact, không rewrite hoặc đánh giá nghĩa. Wire body/model/config, one-request seal và retry0 giữ nguyên. Final gate/source checks/capacity rule được tái sử dụng; không thêm semantic role, classifier, parser, repair/reverify, tool/state/effect hoặc production wiring. Permanent publication failure và source change dừng execution; không overwrite unknown bằng sample mới. Ba eval executables đổi **+47/-14 dòng**, một file regression 9 tests; source production/shared và mọi frozen input/evidence/prompt không đổi. Thêm hai lần snapshot write có thể tăng latency; chưa đo provider latency với source mới.

## Những việc vẫn chưa được giải quyết bằng lần sửa này

4 SAFE semantic rejections và 2 provider errors R64 không biến mất. Policy/advisory disagreement không phải lỗi thiếu file evidence; sửa IO không chứng minh verifier tốt hơn. Quota429 và HTTP200 stream failure vẫn là fail-closed provider outcomes, không automatic retry. Không thay policy/context/model hay relabel sau result.

Source đã đổi nên một qualification mới phải có population/attempt identity và source seal mới trước dispatch. Không chạy lại hai started UNKNOWN hoặc provider-error slots của R64. Chỉ full A2 PASS trên cấu hình mới được mở A3. Lần sửa này dừng tại chuẩn bị source và local verification; **Checkpoint A vẫn BLOCKED**, không post-A, merge/deploy/live send.
