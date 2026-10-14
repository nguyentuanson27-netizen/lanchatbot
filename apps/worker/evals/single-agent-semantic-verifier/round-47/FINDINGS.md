# Round47 — findings và hướng xử lý

**Final owner-authorized completion:** A2FAIL/STOP,218/235retained outcomes,1UNSAFEeligiblefalsePASS,32SAFEfailures,17hard-stop unexecuted. [Final findings and exact outcomes](A2_COMPLETION.md); a2-completed-evidence.json is final aggregate. The earlier partial-stage readout below is retained historically.

**Recommendation: BLOCKED. A2 chưa hoàn tất; A3 không chạy.**

Đã sửa hướng dẫn tư vấn để trả thẳng quyết định mua, giải thích giá trị theo cách dùng của khách, dùng tổng quote khi có phí, bán thêm theo tủ đồ và giữ giọng shop tự tin. Verifier chỉ làm rõ khác biệt giữa lời giới hạn/hướng dẫn và lời khẳng định đủ điều kiện đổi. Hai prompt và hai cặp thử đã freeze trước provider; dữ liệu42hội thoại, ngưỡng chấm, models, contextV4 và finalgate giữ nguyên46. Chưa có A3 để kết luận những thay đổi này cải thiện lời tư vấn.

| Trạng thái | Evidence |
|---|---|
| Đăng ký A2 | 235lượt:134UNSAFE/101SAFE |
| Có terminal | 168lượt:98UNSAFE/70SAFE |
| Chưa chạy | 67lượt:36UNSAFE/31SAFE; null/unknown |
| Thực sự gửi provider | 111generationrequests:110OK,1HTTP503; max1/retry0 |
| Không lấy được auth header | 53lượt:26UNSAFE/27SAFE;0upstreamgeneration |
| SAFE terminal failure | 29:1semanticreject,1HTTP503,27authfailure |
| Actual terminal | 41eligible/122fallback/5handoff/0no-send |

Trong phần đã quan sát, zero observed send-eligible false PASS trên frozen tested population/configuration. Đây không phải A2PASS:36UNSAFE chưa chạy;26UNSAFE authfailure không là semantic coverage thành công. Full SAFE usability rate vẫn null vì31SAFE chưa chạy. Hai ca policy mới có6N3slots đều chưa chạy. Không coi các lỗi auth/503 hoặc lượt chưa chạy là verifier phán sai ngữ nghĩa.

Lỗi được xác định nằm ở relay lấy authorization header từ CodexCLI. CLI đã gửi request tới relay nhưng53request không có header nên adapter fail-closed trước generation. Loginstatus/CLI binary và Vertexcredentialroute kiểm tra lại vẫn available; điều đó không giải thích vì sao header thiếu. Không có đủ diagnostics để kết luận token hết, quota hay nguyên nhân termination. Không đọc/in credentials, không thay account/model.

Tiến trình run-a2 không còn ở readback, handle cũ unavailable, raw không có finishedAt và không thu được completionexit. Raw đã được commit riêng97726d140e55e00940a4c9c8c9fa2e536638510f và giữ byte identity. Source/input/request audit PASS:8sourceentries/12inputentries khớp seal,164capturedrequestbodies dựng lại từ runtimeallowlist,0evaluatorlabelleak;1080/1082historicalfiles giữ nguyên. Chỉ2evalexecutables đăng ký47/hashes thay,0role/layer/function/production/sharedsource thêm.

Deterministic readiness đã PASS:3admissionRED rồi3GREEN;245fulltests,29focusedprotocol/provider,79boundary/Vertex và41protectedclaims/replyassembler/size;0skip. Worker typecheck/build/lint exit0. LầnGREEN đầu2PASS/1FAIL do mutationprobe đặt lại đúng nhãnUNSAFE đã có; sửaprobe sangSAFE, không đổi frozenfixture/label. CLIvalidate exit0 chỉ chứng minh evidence/protocol hợp lệ với statusBLOCKED, không hoàn tất A2.

Verifier latency p50/p95 trên164invocations:5630/10251ms, thêmverification5633/10256ms. Error54/164=32,93%,timeout0. Tokeninput/output495139/12995 được provider báo ở110slot;54slot khôngusage, costunavailable. Không suy SLA hoặc tỷ lệ fallback của chat bán hàng từ mixed adversarial population.

Hướng tiếp theo là xử lý credential transport trước khi đổi thêm prompt: đối chiếu approvedCLI/login/config và headerforwarding giữa successfulslot với authfailedslot, giữ diagnostics sạch (headerpresence/clientstatus/requestcount), không token/rawstderr. Nếu đổi adapter/API cần officialdocs và localstubRED→GREEN cho đúng boundary max1/retry0. Không cần thêm conversational role/router/parser/repair.

Không resume/adopt/retry những lượt lỗi dưới identity47 để cứu usability. Một freshrun khi owner yêu cầu phải freeze/seal nguồn/config mới, chạy A2 đầy đủ rồi chỉ A2PASS mới A3. Các sửa tư vấn, policy contrasts và chất lượng66A3outcomes vẫn chưa verified. BLOCKED tại owner; không tự48/post-A/merge/deploy/live send.

Nguồn: [checkpoint](CHECKPOINT_A.md), [235lượt](A2_ATTEMPTS.md), [exceptions](A2_FAILURES.md), [raw](a2-evidence.json), [audit](audit.json), [commands](RUN_COMMANDS.json).
