# Đề xuất kế hoạch rút gọn sau DF — Activation + Năng lực bán hàng

**Status:** `PROPOSED` — chờ owner review; chưa có hiệu lực governance, chưa authorize merge/release/deploy/activation nào.
**Ngày:** 2026-08-25
**Phạm vi:** Thay thế trình tự sau DF-C hiện tại (`Gate F → UR-A/UR-B → Gate U → hardening`) bằng lộ trình rút gọn 5 giai đoạn, đồng thời cắt giảm quy trình máy móc chưa cần thiết cho giai đoạn chưa vận hành.
**Tài liệu bị ảnh hưởng khi được chấp nhận:** `FUTURE_BACKLOG.md`, `OPERATING_MODE.md`, `PREPROD_DF_UR_PLAN_AMENDMENT.md`, `DF13_OPERATIONAL_ACCEPTANCE_PREPARATION.md`.
**Không thay đổi:** các invariant an toàn (mục 7), quyết định Gate E v15 đã accept, bằng chứng lịch sử bất biến.

---

## 1. Bối cảnh và lý do

### 1.1 Hiện trạng

- Runtime đang `salesAuthorityMode=LEGACY`, `stateReadMode=LEGACY`: con bot đang chạy vẫn là pipeline cũ (code/regex quyết định câu từ và giai đoạn bán hàng) — chính là con bot đã được xác nhận là kém.
- DF11–DF13 đã merge source-only. Toàn bộ giá trị của chuỗi DF (trao quyền cho model, hạ bệ regex/`salesStage` authority) dồn vào một công tắc chưa bật: activation `LEGACY → COMMerce`.
- Lộ trình hiện tại xếp sau activation: Gate F (chu trình gate riêng) → UR-A/UR-B (State V2) → Gate U → production hardening. Track UR tự gắn nhãn "No output change" cho UR-01…05 — không đóng góp năng lực chốt đơn.
- Không có hạng mục nào trong DF/UR cải thiện **năng lực bán hàng thực** của model (prompt, playbook, chiến lược thương lượng). Kế hoạch hiện tại trao *quyền* cho model nhưng không có giai đoạn nào dạy model *dùng quyền đó cho giỏi*.

### 1.2 Vấn đề cần sửa

1. **Sai trọng tâm:** 100% effort còn lại là giàn giáo và nghi thức, 0% là năng lực bán hàng — trong khi bot kém là vấn đề đã biết chắc.
2. **Chi phí quy trình vượt quy mô dự án:** attestation chain, immutable evidence store, Release Train, owner-authorization từng PR nhỏ, 17 file governance tham chiếu chéo — là ceremony cấp production cho một dự án 1 page test, 0 khách, chưa vận hành. Các commit gần nhất sửa lỗi của giàn giáo (attestation race), không phải của bot.
3. **Cơ chế tái chứng nhận tê liệt việc tinh chỉnh AI:** quy tắc "đổi prompt/model/config → vô hiệu Gate E → chạy lại toàn bộ DF-P6 có nghi thức" biến mỗi lần sửa prompt (việc cần làm hàng ngày ở giai đoạn tới) thành một đợt tái chứng nhận.

### 1.3 Nguyên tắc của kế hoạch mới

- **Không cần vận hành bot để chứng minh bot kém.** Thước đo chất lượng là replay corpus offline trên hội thoại lịch sử, không phải canary sớm.
- **Bằng chứng rẻ nhất chứng minh được boundary** (giữ nguyên nguyên tắc của PREPROD amendment, áp dụng triệt để hơn — kể cả cho chính bộ máy governance).
- **Code giới hạn những gì không được làm; model quyết định nói gì và nói thế nào.** Đúng kiến trúc đích §2 của `ACTIVE_IMPLEMENTATION_PLAN.md`; kế hoạch này không nới lỏng nó.

---

## 2. Giai đoạn 1 — Kích hoạt DF13 `LEGACY → COMMERCE` (rút gọn)

**Mục tiêu:** Bật pipeline model-dẫn-dắt trên page test `1198992073286645`. Đây là bước duy nhất khiến mục tiêu "trao quyền cho model" chuyển từ source code sang runtime.

**Ước lượng:** 2–4 ngày làm việc (thay vì một chuỗi Release Train nhiều tuần).

### 2.1 Trình tự thực hiện

1. **Backup:** backup PostgreSQL, ghi SHA-256; restore-test một lần (giữ — đây là bảo hiểm thật, có migration đi kèm).
2. **Migration `0035_df13_commerce_behavior_mode`:** chuyển vào thư mục migration active và apply như một migration additive bình thường. Bỏ cơ chế cách ly ngoài auto-discovery và toàn bộ "pending-migration rehearsal".
3. **Capture rollback target:** ghi lại chính xác release/pointer/config LEGACY hiện tại (giữ — điều kiện để rollback đúng).
4. **Seal + drain:** chặn inbound mới của page test, xả và đối soát queue (Inbox/Outbox/in-flight) về 0, dừng service set cũ, xác nhận lại 0 work. (Giữ nguyên quyết định stopped-process — đây đã là đường đơn giản.)
5. **Prepare + start COMMERCE:** dùng `df13-first-preprod-commerce-version-preparer-cli` tạo COMMERCE version + startup package, chuyển pointer bằng behavior writer, khởi động một service set COMMERCE mới từ release có tag.
6. **Smoke + integration:** chạy bộ smoke/integration journey đã đăng ký (response, state/context, reconciliation, commit/effect guard, restart/crash).
7. **Diễn tập rollback:** thực hiện trọn một vòng `COMMERCE → LEGACY` (seal/drain/stop → restore pointer → restart LEGACY) rồi bật lại COMMERCE. Rollback phải được chứng minh bằng hành động, không phải trên giấy.
8. **Ghi nhận:** một entry changelog + cập nhật `program-state.json`. Không viết acceptance record mới.

### 2.2 Phần nghi thức được cắt khỏi runbook hiện tại

| Cắt | Thay bằng |
|---|---|
| Re-derive candidate manifest/content fingerprint từng field từ artifact cuối | CI xanh trên commit được tag + checksum image |
| Evidence CLI với thư mục bất biến, `.release-source.json` create-once, annotated-tag re-check | Git tag thường + một dòng ghi SHA trong changelog |
| Owner phê duyệt tách riêng cho từng bước/PR nhỏ, dừng chờ giữa các bước | **Một phê duyệt duy nhất** cho toàn bộ Giai đoạn 1 (mục 8 — Quyết định cần owner chốt) |
| Immutable release directory ceremony đầy đủ | Giữ cấu trúc release/symlink hiện có trên VPS, bỏ các bước attestation phụ |

### 2.3 Tiêu chí hoàn thành Giai đoạn 1

- [ ] COMMERCE là authority duy nhất trên page test; không process LEGACY nào chạy song song.
- [ ] Smoke/integration pass; các consumer đọc đúng behavior identity từ DATABASE.
- [ ] Rollback `COMMERCE → LEGACY` đã diễn tập thành công bằng hành động.
- [ ] Fail-closed hoạt động: thiếu commerce state với committed intent → chặn, không fallback LEGACY.

---

## 3. Giai đoạn 2 — Nghiệm thu kiến trúc (Gate F gộp vào activation)

**Mục tiêu:** Xác nhận kiến trúc COMMERCE đứng vững — làm **trong cùng buổi activation**, không mở một chu trình gate riêng với verdict PR/acceptance record.

### 3.1 Checklist (giữ phần cốt lõi của Gate F-PREPROD)

- [ ] Commerce FSM là authority; phase được derive từ state, không từ regex trên text.
- [ ] Không quyết định COMMERCE nào đọc legacy `salesStage` làm authority; không regex writer.
- [ ] Transition matrix + BF/DF replay pass.
- [ ] Missing commerce state fails closed.
- [ ] Readback runtime identity chính xác.
- [ ] Rollback `COMMERCE → LEGACY` đã chứng minh (từ Giai đoạn 1).

### 3.2 Phần Gate F được cắt

- Yêu cầu "immutable release re-derives and matches the exact Gate-E candidate projection/content fingerprint field-by-field" → thay bằng: **regression suite (mục 4) pass trên chính commit được deploy**. Suite chạy lại toàn bộ assertion Gate E tự động — bằng chứng mạnh hơn một phép so hash, và không đóng băng khả năng sửa prompt.
- Chu trình verdict PR + acceptance record + immutable binding riêng cho gate.

Kết quả Giai đoạn 2 ghi thành **một mục trong changelog**, cập nhật `program-state.json` (`status: COMMERCE_ACTIVE_PREPROD`).

---

## 4. Giai đoạn 3 — Workstream Năng lực bán hàng (trọng tâm mới, ~80% effort)

**Mục tiêu:** Làm model bán hàng giỏi lên, đo được, không cần khách thật. Đây là hạng mục kế hoạch cũ hoàn toàn thiếu.

### 4.1 Nền đo lường: Replay Regression Suite

1. **Chuyển corpus Gate E thành regression suite chạy trong CI:**
   - Toàn bộ 14 case + assertion hiện tại chạy tự động trên mỗi PR chạm prompt/playbook/context/output-interpretation.
   - Chi phí mỗi lần chạy ≈ 51 request Flash-Lite — không đáng kể; bỏ quy tắc "đúng một scored run" và nghi thức đăng ký corpus vào commit bất biến trước khi gọi model.
   - Đổi prompt/config **không** cần tái chứng nhận; điều kiện duy nhất là suite xanh.
2. **Mở rộng corpus từ 14 case lên 200–500 case,** rút từ:
   - 1.955 hội thoại Wave 1 đã khóa (ưu tiên các đoạn: mặc cả, từ chối, do dự, hỏi nhiều sản phẩm, chốt đơn, cung cấp số đo, sau bán);
   - các incident/counterexample BF đã có;
   - fixture có chủ đích cho những tình huống regex cũ xử lý tệ nhất.
   - Dùng dataset-store/dataset-review/benchmark đã xây sẵn — không xây tool mới.
3. **Hai tầng đánh giá mỗi case:**
   - `MUST_PASS` (an toàn — giữ nguyên chuẩn Gate E): không bịa giá/tồn/size/ETA, không side-effect trái phép, không lộ PII, fail-closed đúng chỗ. Fail bất kỳ case nào → chặn merge.
   - `QUALITY` (mới): rubric chấm chất lượng tư vấn/chốt đơn (bám giai đoạn, xử lý từ chối, độ tự nhiên tiếng Việt, dẫn tới CTA hợp lý). Chấm bằng LLM-judge (tận dụng Judge v2 đã có ở Shadow worker) + spot-check tay. Tính điểm tổng để so giữa các phiên bản prompt; không chặn merge, dùng để quyết định phiên bản nào tốt hơn.

### 4.2 Vòng lặp cải thiện

```text
sửa prompt / playbook / chiến lược / context
  -> chạy replay suite (CI, tự động)
  -> MUST_PASS 100%? -> so điểm QUALITY với phiên bản trước
  -> giữ hoặc bỏ thay đổi -> lặp
```

- Nhịp mục tiêu: nhiều vòng lặp mỗi ngày (điều cơ chế tái chứng nhận cũ không cho phép).
- Phạm vi được phép sửa tự do: prompt, playbook giai đoạn, chiến lược thương lượng, cách trình bày offer, câu hỏi nối, lựa chọn model. Phạm vi **không** được sửa trong workstream này: guard deterministic, ranh giới side-effect, fail-closed (thuộc mục 7).

### 4.3 Tiêu chí thoát Giai đoạn 3

- [ ] Corpus ≥ 200 case, phủ đủ các giai đoạn chu trình bán hàng.
- [ ] `MUST_PASS` 100% ổn định qua ≥ 2 tuần thay đổi liên tục.
- [ ] Điểm `QUALITY` của pipeline COMMERCE + prompt mới vượt baseline (bot LEGACY replay trên cùng corpus) một cách rõ rệt và ổn định — ngưỡng cụ thể do owner chốt sau khi có số baseline đầu tiên.

---

## 5. Giai đoạn 4 — Human E2E và canary khách thật

**Điều kiện vào:** đạt tiêu chí thoát Giai đoạn 3. Không vào sớm hơn — replay là thước đo chính cho đến lúc đó.

1. **Human E2E có kiểm soát** trên page test: đội nội bộ chạy trọn các journey chốt đơn (tư vấn → size → mặc cả → thông tin nhận hàng → preview → confirm → thanh toán → handoff).
2. **Canary khách thật** trên page test (như mô hình r32.2 đã từng làm): outbound chỉ mở cho page này, quota AI giữ nguyên.
3. **KPI theo dõi** (dashboard Admin đã có nền): tỷ lệ chốt đơn, tỷ lệ handoff, tỷ lệ sai fact bị guard chặn, drop-off tại order preview, phản hồi tiêu cực.
4. Hội thoại thật thu được → bổ sung ngược vào corpus (mục 4.1) — vòng lặp năng lực tiếp tục với dữ liệu tốt hơn.

Replay không đo được cảm giác hội thoại và tỷ lệ chốt thực — giai đoạn này là nơi duy nhất trả lời câu đó, và nó nằm đúng chỗ: **sau khi** bot đã chứng minh vượt trội offline.

---

## 6. Giai đoạn 5 — Các track bị hoãn và điều kiện mở lại

### 6.1 UR / State V2 + Gate U: `DEFERRED_INDEFINITELY`

- Toàn bộ UR-P1…UR-P3, Gate U, và full human E2E trên State V2 **rút khỏi lộ trình chính**. Lý do: track tự khai "No output change" — giá trị là mã hóa checkout/địa chỉ, retention tách bạch, revision/fence hợp nhất; không đóng góp năng lực chốt đơn.
- **Điểm xem xét lại duy nhất:** trước khi mở rộng traffic thật vượt page test / vào `PRODUCTION_HARDENING` — vì khi đó dữ liệu checkout/địa chỉ của khách thật mới là đối tượng cần lớp bảo vệ này. Hoặc sớm hơn nếu xuất hiện đau đớn đo được (bug state race, sự cố retention/expiry, yêu cầu pháp lý).
- UR08–UR10 giữ nguyên deferred/destructive-approval như cũ.

### 6.2 Production hardening

Giữ nguyên định nghĩa hiện tại: chỉ bắt đầu bằng quyết định owner, sau khi Giai đoạn 4 có số liệu thật. Danh mục hardening (SLO, canary %, soak, capacity) giữ nguyên là deferred.

---

## 7. Invariant giữ nguyên — không thuộc diện cắt giảm

Các ràng buộc sau đã code xong, chi phí duy trì ≈ 0, là bảo hiểm thật. Kế hoạch này **không** nới lỏng bất kỳ điều nào:

1. Model không tự tạo facts: giá/tồn/size/ETA/phí ship/ưu đãi chỉ từ nguồn deterministic đã xác minh.
2. Side-effect (cart/order/outbox/handoff/tag) chỉ qua deterministic authorization; model chỉ đề xuất.
3. Fail-closed: thiếu commerce state với committed intent → chặn, không đoán, không fallback.
4. PII/secret: không log PII, decision telemetry ẩn danh, SSRF/URL policy, least-privilege DB.
5. Migration additive/backward-compatible; không down-migration hủy dữ liệu; backup + restore-test khi có migration.
6. Một sales authority duy nhất tại mọi thời điểm; không LEGACY/COMMERCE đồng thời.
7. Đường rollback về LEGACY giữ nguyên và đã được diễn tập.
8. Quota AI theo page; page allowlist chỉ `1198992073286645`.

---

## 8. Rút gọn quy trình vận hành repo

### 8.1 Bảng cắt/thay

| # | Hiện tại | Thay bằng | Hiệu lực |
|---|---|---|---|
| 1 | Release Train là đơn vị verification/release mặc định | Deploy từ `main` khi cần: `pnpm check` xanh + tag + rollback script. Train chỉ quay lại khi có traffic thật | Ngay |
| 2 | Attestation chain (fingerprint re-derive, evidence CLI, immutable evidence dir, release-source ceremony) | Git tag + CI xanh + checksum image + backup DB | Ngay |
| 3 | Owner authorization tách riêng từng PR/bước, dừng chờ giữa các bước | Phê duyệt theo **giai đoạn** (5 giai đoạn của plan này = tối đa 5 lần phê duyệt lớn) | Ngay |
| 4 | Gate E "one scored run" + tái chứng nhận khi đổi candidate identity | Replay regression suite trong CI; prompt/config đổi tự do miễn suite xanh | Giai đoạn 3 |
| 5 | Gate F là chu trình riêng (verdict PR, acceptance record, immutable binding) | Checklist gộp vào buổi activation; kết quả = 1 entry changelog | Giai đoạn 1–2 |
| 6 | Mỗi bước sinh một acceptance/status record bất biến mới | Chỉ cập nhật: changelog + `program-state.json` | Ngay |
| 7 | 17 file governance active, bảng reading-order bắt buộc | Đóng băng vào `archive/`; giữ sống 3 file: `OPERATING_MODE.md` (rút còn ~1 trang), `program-state.json`, changelog | Sau khi plan được accept |
| 8 | Migration 0035 cách ly ngoài auto-discovery + rehearsal riêng | Migration additive bình thường, backup trước khi apply | Giai đoạn 1 |

### 8.2 Quy trình PR chuẩn sau rút gọn

```text
branch từ main -> thay đổi nhỏ, focused
  -> CI: pnpm check + replay regression suite (nếu chạm prompt/behavior)
  -> review -> merge
  -> deploy lên page test khi cần: tag + backup (nếu migration) + smoke + giữ rollback target
```

Không thay đổi: quy tắc an toàn repository (không commit secret/PII/dump), exact-head review cho thay đổi chạm authority/guard/migration.

---

## 9. Lộ trình tổng hợp

```text
Giai đoạn 1: Activation LEGACY -> COMMERCE trên page test (rút gọn)     ~2-4 ngày
Giai đoạn 2: Nghiệm thu kiến trúc gộp trong buổi activation             cùng đợt
Giai đoạn 3: Workstream năng lực bán hàng (corpus + vòng lặp prompt)    liên tục, trọng tâm
Giai đoạn 4: Human E2E + canary khách thật + KPI                        khi replay vượt baseline
Giai đoạn 5: UR/State V2 -> chỉ trước khi mở traffic thật; hardening -> theo quyết định owner
```

So với lộ trình cũ (`activation ceremony -> Gate F -> UR-A -> UR-B -> Gate U -> full E2E -> hardening`): bỏ 2 track + 1 gate khỏi đường chính, thêm 1 workstream năng lực vốn đang thiếu, và mọi bước còn lại đều rẻ đi rõ rệt về nghi thức.

---

## 10. Quyết định cần owner chốt khi review

1. **Chấp nhận gộp Gate F vào activation** (mục 3) — hay giữ Gate F là chu trình riêng?
2. **Chấp nhận hoãn vô thời hạn UR/State V2** với điểm xem xét lại là "trước khi mở traffic thật" (mục 6.1)?
3. **Chấp nhận thay cơ chế candidate-fingerprint bằng regression suite** (mục 4.1) — đồng nghĩa Gate E v15 trở thành mốc lịch sử, không còn là ràng buộc tái chứng nhận?
4. **Phê duyệt một lần cho toàn bộ Giai đoạn 1** (backup → 0035 → seal/drain/stop → start COMMERCE → smoke → rollback drill) thay vì phê duyệt từng bước?
5. **Ngưỡng QUALITY** để thoát Giai đoạn 3 (mục 4.3) — chốt sau khi có số baseline đầu tiên.
6. **Phạm vi đóng băng tài liệu** (mục 8.1 dòng 7): xác nhận danh sách file chuyển vào `archive/`.

---

## 11. Ranh giới của tài liệu này

Tài liệu này là **đề xuất kế hoạch**. Nó không tự cấp quyền merge, tạo release, apply migration, kích hoạt COMMERCE, thay đổi page allowlist, hay sửa bất kỳ bằng chứng lịch sử nào. Mọi hành động trong các giai đoạn trên vẫn cần phê duyệt của owner theo mục 10; sau khi được chấp nhận, các tài liệu ở phần đầu sẽ được cập nhật trong một PR riêng để phản ánh lộ trình mới.
