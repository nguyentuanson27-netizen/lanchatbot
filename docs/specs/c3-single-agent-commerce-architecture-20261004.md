# Spec: C3 single-agent commerce architecture candidate

**Status:** Draft / architecture experiment only / human review required before implementation planning  
**Date:** 2026-10-04  
**Base:** main at `7a7d98119e55bd689ef428c8f8c5bfa71b020652`  
**Related:** current C3 strategy contract, PR377, PR380 quality-closure work  
**Principle:** **Model owns conversational reasoning. Code owns business truth, permissions, state transitions and effects.**

This spec proposes a bounded architecture experiment. It does not approve a rewrite, migration, production rollout, new durable state, or removal of current C3.

---

## 1. Objective

The product goal is effective fashion-sales consultation: help customers choose suitable products, resolve purchase concerns and make an informed buying decision, with a reliable path to completing a purchase. The owner-approved product direction is defined in §1.1 below.

A successful customer turn must satisfy ten requirements:

1. understand the latest message without silently dropping explicit needs;
2. preserve relevant context and corrections across turns;
3. bind references to the correct product, variant, cart and conversation;
4. distinguish customer-reported context, verified business facts, deterministic derivations and unknowns;
5. ground business claims in current authoritative data;
6. keep deterministic relations and effects in code;
7. produce a usable outcome for each explicit customer need;
8. avoid repeating known questions and respect defer, stop and handoff;
9. use the language/reasoning strength of current capable models rather than reducing them to narrow classifiers/renderers;
10. protect the final outgoing reply with machine-verifiable authority, effect and privacy boundaries.

The customer-facing quality bar is:

> **correct + sufficiently complete + useful + context-aware + natural + safe**

Architecture simplicity is a means to that quality bar, not the end goal.

### 1.1 Owner-approved fashion-sales product direction (2026-10-06)

**Trạng thái:** Owner đã yêu cầu ghi các mục tiêu dưới đây thành hướng đi chính thức của sản phẩm ngày 2026-10-06 (Asia/Saigon). Đây là nguồn mục tiêu sản phẩm cho các kế hoạch và lần đánh giá tiếp theo.

**Mục tiêu chính:** Tư vấn để khách chọn và mua sản phẩm phù hợp của shop. Bot phải chủ động đề xuất mẫu, màu/size từ hàng của shop, giải quyết băn khoăn và giúp khách mua thuận tiện bằng thông tin đã xác minh. Đúng và đủ thông tin là nền tảng. Kết quả cần đạt là lời tư vấn hữu ích, hợp lý, tự nhiên, tạo sự tin tưởng và đưa khách tới bước mua phù hợp; tôn trọng khi khách muốn dừng.

#### Chất lượng tư vấn thời trang

1. **Hiểu nhu cầu mua:** Nắm dịp sử dụng, phong cách, sở thích, ngân sách, ưu tiên về dáng/độ thoải mái và thông tin vóc dáng/số đo khách đã cung cấp khi liên quan. Chỉ hỏi phần còn thiếu có thể làm thay đổi phương án tư vấn; không hỏi để điền đủ một checklist.
2. **Đề xuất cụ thể:** Chọn phương án từ sản phẩm/biến thể có dữ liệu trong phạm vi được phép, giải thích vì sao phù hợp và đánh đổi gì. Có thể hỗ trợ so sánh hoặc phối đồ khi có cơ sở; không bịa sản phẩm thay thế, tồn hàng, chất liệu, fit hoặc lợi ích để thuyết phục khách.
3. **Giải quyết băn khoăn:** Hiểu lý do phía sau phản đối về giá, size, độ thoải mái, mẫu khác hoặc trải nghiệm trước đó. Tư vấn theo nguyên nhân và dữ kiện thay vì lặp giá/chính sách, ép mua, tạo khan hiếm hoặc ưu đãi giả.
4. **Dẫn tới bước phù hợp:** Giúp khách cân nhắc mẫu, làm rõ điểm cản quyết định, chọn màu/size khi đủ cơ sở hoặc xác nhận ý định mua. Bước tiếp phải thực sự làm được với thông tin và khả năng hiện có. Không xin số đo để hứa đối chiếu khi chưa có bảng size, hoặc gợi quy trình/ngoại lệ chưa được xác nhận.
5. **Giao tiếp tự nhiên:** Nói như nhân viên tư vấn có hiểu tình huống, gọn và nhất quán với giọng shop. Tránh checklist chung chung, disclaimer lặp, thông tin thừa và hỏi lại điều khách đã nói. Câu hỏi giá đơn giản được trả lời trực tiếp; khách trì hoãn hoặc muốn dừng được tôn trọng, không buộc mọi lượt phải chốt mua.

Đầu vào cần đủ để kiểm tra khả năng tư vấn: dữ liệu sản phẩm/ảnh phù hợp, kiểu dáng, phom, chất liệu, màu, bảng size/số đo, cách chăm sóc và lựa chọn so sánh khi có; cùng giá/tồn/chính sách hiện hành. Phân biệt nguồn đã xác nhận, thông tin khách cung cấp, nhận định tư vấn và phần chưa biết. Ảnh hoặc suy đoán không tự xác lập chất liệu, số đo, tồn hay quyền lợi. Thiếu evidence phải được xử lý bằng phương án có cơ sở, không bằng bịa thêm facts.

#### Owner làm rõ: dữ liệu đủ để bán và tư vấn hướng tới mua hàng

Owner làm rõ ngày 2026-10-06: sản phẩm đem bán phải có thông tin cần thiết để tư vấn. Ví dụ, quần cần bảng size/số đo và thông tin phần lưng/co giãn liên quan tới việc chọn size. Thiếu thông tin phải trở thành công việc bổ sung dữ liệu sản phẩm từ nguồn xác minh. Không lấy tình trạng thiếu dữ liệu làm mặc định cho hội thoại bán hàng rồi liên tục trả lời chưa biết, đẩy việc tìm thông tin của shop sang khách hoặc khuyên chưa mua. Không tự điền số đo hay suy ra độ thoải mái từ chữ “lưng chun”.

Khi dữ liệu sản phẩm đủ, bot phải dùng nhu cầu và thông tin khách đã nói để đề xuất hàng của shop, giải thích ngắn lý do, xử lý điểm khách còn ngại và tiến tới chọn màu/size hoặc xác nhận ý định mua. Câu hỏi bổ sung phải giúp chọn hàng; lời tư vấn gọn, dùng từ thông thường, không lặp cảnh báo hoặc kể hết dữ liệu sản phẩm.

Owner làm rõ trước Round5 ngày 2026-10-06: tư vấn tự tin để khách tin tưởng, loại giọng dè dặt chung chung khi đã đủ dữ kiện. Giữ điều kiện có ảnh hưởng thực tế; sự tự tin không tạo quyền bịa fit, tồn, chính sách hay thành công hành động. Viết lại toàn bộ hội thoại đánh giá với lời khách/shop tự nhiên và context/state nhất quán. Chấm kỹ từng kết quả trong lịch sử theo nhu cầu mua, phương án, điểm cản, sự tin tưởng và tiến triển phù hợp; đúng facts hoặc có câu hỏi chốt chưa đủ đạt. Giữ10chiều đánh giá hiện có, một conversational owner, tối đa một verifier và code authority; không thêm tầng ngữ nghĩa để cải thiện lời nói.

Owner làm rõ sau Round8 Gemini ngày 2026-10-07: kết quả chọn size đã được code xác nhận cho đúng khách cho phép tư vấn tự tin, không cần giọng tạm thời hoặc dè dặt. Dùng dữ kiện về thiết kế, số đo và phạm vi thử nghiệm để giải thích lợi ích lựa chọn; kết quả chọn size không tự chứng minh thoải mái cả ngày, phép thử ít nhăn không chứng minh độ bền. Cung cấp đầy đủ facts và giới hạn evidence trong context cho model, chọn phần liên quan để nói với khách.

Owner duyệt cách trả lời chính sách ngắn: “đổi trong 7 ngày” mặc định tính từ ngày nhận hàng, không cần nhắc mốc hoặc liệt kê mọi điều kiện trừ khi khách hỏi hoặc tình huống ảnh hưởng quyền lợi. Xét ý nghĩa của lời khẳng định cùng toàn bộ lịch sử; tóm tắt không đồng nghĩa miễn điều kiện, còn quyền lợi thực sự trái nguồn vẫn bị chặn. Chi tiết hợp đồng ở amendment §7.0; các prompt/context mới được lưu riêng để chuẩn bị lần đánh giá tiếp theo, không thay đổi evidence hoặc điểm của các vòng đã freeze.

Các ca A3 bán hàng thông thường của lần đánh giá tiếp theo phải có dữ liệu đủ cho việc tư vấn được yêu cầu. Ca thiếu dữ liệu tiếp tục kiểm tra an toàn và cách xử lý lỗi; kết quả phải ghi rõ phần dữ liệu/capability cần bổ sung. Giữ nguyên ca, prompt, cấu hình, kết quả và điểm của các vòng đã freeze. Làm rõ này chỉ cập nhật hướng sản phẩm và chuẩn bị kế hoạch tiếp theo; Checkpoint A vẫn STOP.

#### Năng lực của sản phẩm hoàn chỉnh

| Năng lực | Kết quả khách/shop cần nhận được |
|---|---|
| Theo hành trình mua | Giữ mẫu/biến thể đang cân nhắc, ngân sách, sở thích, sửa đổi và điểm chưa giải quyết qua nhiều lượt; không hỏi lại hoặc nhầm mẫu khi khách đổi ý. Tái sử dụng history/state hiện có. |
| Xử lý phản đối | Giải quyết đúng lo ngại về giá/fit/trải nghiệm và giúp chọn hướng phù hợp, không gây áp lực hoặc đưa lời hứa thiếu căn cứ. |
| Mua thuận tiện | Chọn đúng màu/size, xác nhận tồn, tổng tiền gồm phí/quyền lợi đã xác minh và giao hàng; thực hiện nghiệp vụ khi có đồng ý/quyền phù hợp, không tạo đơn trùng hoặc báo thành công giả. |
| Hỗ trợ sau mua | Theo dõi đơn, giải đáp và hướng dẫn đổi hàng/đổi size theo dữ liệu và quy trình thật. |
| Chuyển nhân viên | Nhận ra khi cần người xử lý; chuyển đúng lúc với nhu cầu, lịch sử và phần đã xác minh để khách không phải kể lại. Không handoff vô ích khi đã đủ dữ kiện trả lời. |
| Vận hành ổn định | Phản hồi đủ nhanh, facts cập nhật, không gửi lặp và giữ mạch sau lỗi/timeout; recovery dựa trên state/receipt đã commit, không phát sinh hiệu ứng trùng. |
| Đo hiệu quả thực tế | Theo dõi tiến triển chọn mẫu/size, hoàn tất đơn, điểm bỏ dở, handoff, chất lượng tư vấn và ca sai/đổi trả liên quan tới tư vấn; đối chiếu với độ trễ, lỗi và token/cost khi có dữ liệu. |

#### Áp dụng vào đánh giá và lộ trình

- A3 phải đánh giá tư vấn bán hàng trên tình huống mua cụ thể: lựa chọn/so sánh, phản đối, sửa đổi và lịch sử nhiều lượt với evidence phù hợp. Giữ cả ca đủ và thiếu evidence; price/stock đơn giản tiếp tục là controls. Dùng các chiều whole-reply hiện có để đánh giá phương án tư vấn, tính hữu ích/hợp lý, tự nhiên và bước xử lý, thay vì chỉ đếm facts đã trả lời.
- Chất lượng của phương án và tiến triển phù hợp của khách là căn cứ chấp nhận. Điểm tự chấm, verifier PASS hoặc tỷ lệ chốt đơn đơn lẻ không thay thế đánh giá này. Một quyết định trì hoãn/từ chối phù hợp vẫn được tôn trọng. Các mẫu số, mốc đo và ngưỡng định lượng cho thử nghiệm tương lai phải được freeze trước khi chạy.
- **Checkpoint A hiện vẫn STOP:** owner chưa chấp nhận chất lượng A3. Ưu tiên tiếp theo là chất lượng tư vấn và đầu vào đánh giá. Luồng nghiệp vụ mua hàng thật, persistence/mutation, sau mua và rollout thuộc plan post-A sau owner GO; việc ghi mục tiêu không tự mở implementation hoặc một provider run mới.
- Giữ một conversational owner và tối đa một semantic verifier. Code là sole authority về identity/truth/freshness/state/permission/effects/receipts/privacy. Không thêm third role, semantic router, generic Vietnamese parser, template theo ca, repair/reverify loop hoặc durable semantic memory để đạt mục tiêu bán hàng.

Mục tiêu này có hiệu lực cho các kế hoạch tương lai. Corpora, prompts, cấu hình, source SHA, provider evidence và điểm số của những vòng đã freeze được giữ nguyên theo identity lịch sử; không chấm lại hoặc gọi chúng là đã đạt mục tiêu mới.

---

## 2. Why evaluate a new path

### 2.1 What C3 got right

The original C3 principle remains correct:

> **Agent owns choice. Code owns authority.**

The current system has hard-earned protections that this candidate must reuse:

- product/variant binding;
- POS/catalog/policy authority;
- source provenance and freshness;
- cart revision/CAS/fencing;
- PII/private checkout boundaries;
- effect permission and receipts;
- human ownership/handoff;
- accepted-history recovery;
- Outbox/commit/delivery guarantees.

This proposal is not evidence that those parts are wrong.

### 2.2 What current evidence does not prove

At PR377 exact head `462c025d009049e54f11b7908f634ea3e0b506e4`, the Producer-inclusive DEV70 record reports:

- 51 guard accepted;
- 10 candidate rejected;
- 7 Producer rejected;
- 2 pre-model stale;
- 61 typed obligations -> 61 outcomes in accepted cases;
- 0 silent drops among those accepted obligations;
- GPT-6.1 Sol / low for Producer, Strategist and Responder;
- judge disabled;
- P11 OPEN;
- P12 BLOCKED.

PR377 itself states that guard acceptance is not semantic quality acceptance.

The remaining failure pattern includes cases where:

- a model understands a customer concept but a later schema/scope validator rejects its representation;
- useful context exists in history but does not survive every consumer boundary;
- evidence exists but customer-language and evidence vocabularies do not align cleanly;
- safety is correct while the final answer remains generic, repetitive or unhelpful;
- each local fix risks adding another semantic representation or validator.

The hypothesis is that repeated semantic translation is now one possible source of quality loss.

---

## 3. Design hypothesis

### 3.1 Preserve semantic continuity

A capable conversational model is good at jointly handling:

- natural Vietnamese;
- compound messages;
- correction and negation;
- cross-turn referents;
- implied concern;
- selecting relevant context;
- synthesizing verified results;
- useful clarification;
- natural response composition.

The candidate should let one conversational owner keep that responsibility across a turn.

### 3.2 Centralize reality in code

The model is never authority for:

- price, stock, promotion or policy;
- product/variant/cart/order identity;
- payment/order state;
- permissions;
- deterministic arithmetic/eligibility;
- whether a side effect actually happened.

Those remain code/tool-owned.

### 3.3 Call the model again only for new world information

A second or third invocation is justified when new information becomes available, such as:

- search results;
- live stock;
- policy lookup;
- ETA;
- mutation receipt/readback.

A model call is **not** justified merely to translate another model's semantic output.

### 3.4 Raw dialogue and structured state are complementary

Structured state is current truth support. Raw dialogue preserves nuance.

Neither replaces the other.

### 3.5 Runtime safety and conversational quality are different jobs

Free-form Vietnamese cannot be fully validated for semantic completeness and usefulness by deterministic code without rebuilding a language reasoner.

Therefore:

- **runtime hard guards** own machine-verifiable permission/safety invariants;
- **locked offline evaluation** owns semantic completeness, relevance, usefulness and naturalness.

This separation is an architectural invariant.

---

## 4. Target architecture

~~~text
latest customer message
+ recent/relevant accepted dialogue
+ existing canonical state
        |
        v
admission / ownership / safety preflight
        |
        v
SINGLE CONVERSATIONAL AGENT
understand + reason + decide
        |
        | tool calls only when required
        v
HARDENED DOMAIN TOOLS
product | search | policy | state | cart | checkout | derivations
        |
        v
verified result / receipt
        |
        +----------------------+
                               |
                               v
                    SAME CONVERSATIONAL ROLE
                    continue reasoning + reply
                               |
                               v
                    RUNTIME HARD GUARD
                               |
                               v
                         Outbox / delivery
~~~

The exact provider/model is not an architectural invariant.

The candidate must support a one-model-call fast path when required verified context is already available.

---

## 5. Ownership

| Concern | Owner |
|---|---|
| Understand current customer language | Conversational model |
| Correction, negation, referent, concern | Conversational model |
| Select relevant information / useful clarification | Conversational model within allowed actions |
| Response organization and wording | Conversational model |
| Customer/session durable state | Existing code/state owners |
| Product/variant/cart/order identity | Code/domain tools |
| Price, stock, promotion, policy, ETA | Authoritative sources + code |
| Search execution and verified filtering | Existing business/search tools |
| Deterministic arithmetic/comparison/deadline/eligibility | Code |
| Mutation permission, CAS/revision | Commerce code |
| Side-effect execution | Code/domain tool |
| Side-effect success claim | Only after success receipt/readback |
| PII/private recipient boundaries | Code |
| Human ownership/handoff | Existing code owner |
| Outbox/delivery guarantees | Existing messaging core |
| Runtime hard safety verification | Code |
| Conversational quality | Locked offline judge/human evaluation |

The main change is that conversational semantics are not split across Producer, Strategist and Responder by default.

---

## 6. Conversational agent contract

### 6.1 Context selection

For the first experiment, context selection is intentionally simple:

- latest inbound message;
- fixed recent accepted-turn window;
- existing canonical customer/session state;
- current bound product/cart context;
- older dialogue already explicitly referenced by existing canonical state;
- already-available current verified facts when cheap;
- available domain tools and their precise contracts.

Do **not** add a new semantic history selector, summarizer model, vector-memory subsystem or durable memory store for the first experiment.

Only add more selective history retrieval after repeated locked RED scenarios prove the bounded context insufficient.

### 6.2 Tool loop

Target:

- 1 model invocation: no new external fact/action required;
- 2 invocations: one tool round;
- 3 invocations: only when a second tool round genuinely depends on the first.

Independent lookups should share one tool round.

Example:

~~~text
customer asks price + black/M stock
  -> model
  -> price + stock tools in the same round
  -> model final reply
~~~

Do not turn independent price, stock and policy lookups into separate model loops.

The runtime must have a finite hard cap. The exact cap is an owner decision to freeze before production opt-in.

If the cap is reached, use a bounded clarification, unavailable response or handoff.

### 6.3 Same role, observable continuity

"Same agent" means the same conversational ownership, not hidden reasoning continuity.

Correctness may depend only on observable inputs supplied to each invocation:

- conversation messages;
- tool request;
- tool result;
- canonical state/context.

The system must not depend on hidden chain-of-thought or inaccessible provider session state.

A second model role must not exist solely to re-read a semantic JSON object produced by the first.

---

## 7. Hardened domain tools

The tool layer is the main privileged boundary.

### 7.1 Bounded subject references, not model-authored identity

The model may choose **which in-scope subject the customer is referring to**. It may not invent or override protected business identity.

For every turn, runtime/tools should expose a bounded set of references for subjects already in scope, for example products returned by search, the currently bound product/variant, or cart lines. The reference may reuse an existing scoped ID if that ID is already safe; this spec does **not** require a new opaque-handle subsystem.

The invariant is:

- runtime/tool issues or allowlists the reference for this turn;
- model may select that reference because it understands the customer's language;
- code resolves the reference to protected product/variant/cart/order identity;
- code re-checks tenant/customer/conversation scope, freshness/binding and revision;
- model cannot name an arbitrary protected resource outside the supplied reference set;
- ambiguous/stale reference selection returns clarification/refresh, never a guessed identity.

Conceptually:

~~~ts
type SubjectRef = {
  ref: string;               // server-issued or server-allowlisted for this turn
  kind: "PRODUCT" | "VARIANT" | "CART_LINE";
  label: string;             // customer-visible context, not authority
  bindingVersion?: string;   // optional existing freshness/binding token
};
~~~

The exact representation should reuse existing binding/reference types where possible.

### 7.2 Model-visible mutation arguments are minimal

Prefer:

~~~ts
type ChangeCurrentCartVariantRequest = {
  subjectRef: string;
  component: "TOP" | "BOTTOM" | "SET";
  requestedSize: string;
};
~~~

Do not let the model choose protected execution identity such as:

- tenant;
- customer;
- conversation;
- raw cart/order ID outside the supplied subject-reference set;
- authorization scope;
- current revision.

Those come from trusted server-side execution context.

Example:

~~~ts
type CommerceExecutionScope = {
  tenantId: string;
  conversationId: string;
  customerId: string;
  cartId: string;
  expectedRevision: number;
  sourceMessageId: string;
  operationId: string;
};
~~~

### 7.3 Mutations need idempotency and readback

A mutation result must separate committed success from ambiguity:

~~~ts
type ChangeCurrentCartVariantResult =
  | {
      status: "SUCCESS";
      operationId: string;
      cartRevision: number;
      readback: {
        component: "TOP" | "BOTTOM" | "SET";
        size: string;
      };
    }
  | {
      status: "STALE" | "AMBIGUOUS" | "UNAVAILABLE" | "REJECTED";
      operationId: string;
      reasonCode: string;
    };
~~~

Rules:

- generate/bind operation identity at the trusted runtime boundary;
- validate model arguments and selected subject reference;
- enforce tenant/customer/conversation/cart binding;
- enforce source/freshness/permission/revision rules;
- require success receipt/readback before a model may claim success;
- after ambiguous transport/result, reconcile by operation identity before retry;
- never blindly retry an unknown-commit mutation.

### 7.4 All tools

All tools must:

- return typed results;
- expose minimum necessary data;
- keep retrieval tenant/shop scoped;
- treat model requests as untrusted;
- never treat prompt text as permission;
- omit secrets and unnecessary PII;
- return explicit stale/unknown/unbound states where applicable;
- record sanitized diagnostics;
- respect finite model/tool budgets.

Reuse existing business/commerce modules before creating new services.

---

## 8. State and memory

Keep existing owners first:

- customer/session state;
- product binding;
- commerce/cart state;
- accepted history;
- profile/preferences where authoritative;
- Outbox recovery.

No new durable semantic-memory store is approved by this spec.

History means **what was said**. State means **what currently remains true**.

### 8.1 Same-agent state proposal

Removing Producer must not create a new extractor model under another name.

The same conversational owner may propose bounded state operations for **existing writable customer-state fields**. The implementation plan must derive the allowlist from current state owners rather than inventing a universal semantic schema.

Conceptually, only simple operations are needed:

~~~ts
type CustomerStateOp =
  | { op: "SET"; field: ExistingWritableCustomerField; value: unknown }
  | { op: "CLEAR"; field: ExistingWritableCustomerField }
  | { op: "REPLACE"; field: ExistingWritableCustomerField; value: unknown };
~~~

Every proposed operation is bound by code to the current source message and, where the existing state owner supports it, the expected state revision.

Code validates:

- field is on the existing writable allowlist;
- value shape/domain is valid;
- source message belongs to the current conversation/turn;
- current correction/clear/replace semantics are respected;
- stale revision/conflict is rejected or re-read;
- business facts, protected identity, cart/order/payment state and effect receipts are **not** writable customer fields.

The model may propose a state update and request a domain tool from the same conversational turn. No second semantic model is required.

### 8.2 Effective state precedes dependent tools

A tool must never silently read stale pre-correction state when the same turn contains a state correction that the tool depends on.

Invariant:

~~~text
same-agent state proposal
        |
        v
existing state owner validates/resolves
        |
        +-- REJECTED / CONFLICT --> no dependent tool result may be treated
        |                         as if the correction succeeded
        |
        v
ACCEPTED effective state / revision
        |
        v
dependent domain tool
        |
        v
reply
~~~

For the first candidate:

- if a tool input depends on a corrected writable field, the existing state owner resolves that correction first;
- the dependent tool consumes the accepted effective state/revision returned by that owner;
- if the correction is rejected or conflicts, the runtime must clarify, re-read/re-resolve, or recompute after resolution; it must not continue with a result derived from the old value while speaking as if the new value applied;
- genuinely independent lookups may still run in the same parallel tool round.

Example:

> "Em nói nhầm, chị 58kg chứ không phải 48kg. Vậy mẫu này mặc size nào?"

Required order:

~~~text
validate/accept 58kg correction
        |
        v
effective state says weight = 58kg
        |
        v
size/fit tool reads 58kg
        |
        v
reply
~~~

A size/fit result derived from 48kg cannot be reused after the 58kg correction is accepted.

This is a dependency invariant, not a generic workflow scheduler. No extra model role is introduced.

### 8.3 Reference selection and state commit are distinct

For a message such as:

> "Không lấy mẫu đang trong giỏ nữa; lấy mẫu thứ hai lúc nãy, áo M, quần L. Chưa chốt nhé."

the intended ownership is:

~~~text
runtime supplies bounded refs for current cart item + prior candidate(s)
        |
        v
same conversational model
- selects the supplied ref that "mẫu thứ hai" refers to
- proposes allowed customer-state corrections/preferences
- does NOT infer purchase commitment from "chưa chốt"
        |
        v
code
- validates selected ref -> protected identity
- validates SET/CLEAR/REPLACE operations against existing state owners
- commits only valid customer-state changes
- performs no cart/order effect unless a separately authorized action exists
~~~

If the reference is ambiguous or stale, no state/effect commit is guessed; the conversational model receives the bounded failure and clarifies.

A model statement is never itself a cart/order mutation receipt.

---

## 9. Protected egress and verification boundary

The candidate must preserve the repository's durable model-claim boundary:

> code verifies every protected claim and rejects undeclared protected claims.

Protected claims include the existing durable categories such as price, stock, size/fit recommendation, ETA, shipping/freeship, promotion/offer, product media and effect claims.

### 9.1 Open feasibility hypothesis: safe protected egress without conversational collapse

This boundary is **not yet proven feasible** for the new candidate output surface.

The core hypothesis is:

> a smaller single-owner conversational path can preserve the existing protected-claim guarantee **without** forcing normal replies back into rigid templates or growing a new semantic-regex/parser subsystem.

The first implementation slice must test this hypothesis before building the full candidate orchestration.

The feasibility experiment must use the actual egress shape intended for the candidate and answer:

- what prose surface is allowed;
- which protected facts/effects must remain code-realized;
- what the existing durable claim boundary can actually enforce;
- what it explicitly cannot certify about arbitrary surrounding natural language;
- whether safe output remains sufficiently complete, useful and natural on ordinary multi-part/policy/correction turns;
- whether adversarial unsafe wording is rejected without continuously expanding semantic regexes/templates.

If the only way to preserve safety is to template most customer-facing language, or if each new phrasing failure requires another semantic parser/regex layer, the hypothesis fails its quality/complexity objective and the candidate remains evaluation-only.

### 9.2 Candidate output surface for the feasibility experiment

The experiment should not introduce a new claim graph. It should reuse the existing verified evidence/claim boundary and keep the proposed output surface minimal.

Conceptually, the model owns:

- conversational free text for acknowledgement, customer context, questions and transitions;
- selection/order of verified protected facts that are relevant;
- requested actions through bounded tool calls.

Protected business content is declared through an existing or minimal structured reference to verified evidence/receipt. Code resolves and realizes that protected content from authoritative data.

Conceptual shape only:

~~~ts
type CandidateReply = {
  freeText: string[];
  protectedClaimRefs: string[]; // reuse existing claim/evidence refs where possible
};
~~~

This is an experiment shape, not a claim that the boundary is solved and not approval for a new standalone schema if the existing responder/evidence contract can express it more simply.

### 9.3 Protected prose invariant and limit of guarantee

Free text must not become a second channel for undeclared business facts.

For protected claims:

- subject comes from verified bound evidence/receipt;
- protected value and material condition come from verified evidence;
- negation/availability semantics are preserved by the verified realization;
- freshness remains attached to the underlying evidence;
- an effect-success commitment requires a success receipt/readback.

The model may choose **which** verified claim to use and where it belongs conversationally, but it may not manufacture or paraphrase a protected value in an undeclared free-text channel.

The existing C3 prose guard is a conservative egress check; it is **not** a certificate of arbitrary natural-language meaning. Reusing it does not by itself prove that surrounding free text cannot imply a stronger/wrong policy, change subject, reverse negation, or drop a material condition.

Therefore the feasibility experiment must explicitly test those cases on the intended candidate surface. It may reuse the current bounded rejection/repair behavior, but it must not claim full semantic guarantee from regex/bounded wording alone.

Required coverage includes:

- protected claim outside the declared protected surface;
- correct verified literal attached to the wrong subject;
- negation inversion;
- dropped material condition;
- stronger policy/benefit implied by surrounding free text;
- stale evidence;
- effect-success wording without receipt;
- normal compound replies that must remain useful/natural while staying inside the safe surface.

If the durable protected-claim guarantee cannot be preserved for the candidate output without a new broad language-understanding subsystem, the candidate remains **evaluation-only**. The spec does not weaken the existing guarantee to make the architecture simpler.

### 9.4 Runtime hard guard vs offline quality

The runtime hard guard owns machine-verifiable authority, permission, effect and privacy invariants. It must not decide whether the answer is useful, reconstruct full customer intent, infer concern, or become a generic semantic-completeness engine.

Locked offline evaluation owns:

- explicit-need completeness;
- context/correction use;
- useful partial answers;
- decision support;
- next-step appropriateness;
- coherence/naturalness.

Silent drop is a **promotion/evaluation hard gate**, not a generic runtime prose parser.

---

## 10. Reuse and non-goals

### Reuse from C3

Retain where applicable:

- admission/ownership;
- business fact envelopes/provenance;
- freshness/binding;
- POS/catalog/Qdrant search;
- policy authority;
- deterministic derivations already proven correct;
- cart/checkout/commerce kernel;
- CAS/fencing;
- effect receipts;
- PII boundaries;
- human handoff;
- accepted history;
- Outbox/delivery;
- existing safety regressions and benchmark assets.

### Not automatically carried into the candidate path

The candidate does not require by default:

- dedicated Customer Input Producer call;
- six-field Strategist;
- three-field Responder;
- online requested-obligation graph;
- requestedObligationIndexes;
- mandatory concern taxonomy;
- semantic handoff grammar;
- guard logic whose only job is validating intermediate semantic representations.

These are not deleted by this spec.

If one later proves necessary, the implementation proposal must identify the repeated failure it prevents and why an existing simpler boundary cannot solve it.

---

## 11. Anti-overengineering constraints

1. No semantic subsystem for one benchmark case.
2. No enum/persistent field solely because one model used a new phrase.
3. No model role without new information/authority that the existing conversational role cannot receive.
4. No new durable state until current owners are proven insufficient.
5. No online reviewer model by default.
6. No general agent-framework dependency unless current TypeScript runtime is proven insufficient.
7. n8n's agent-node shape is only an analogy; this spec adds no n8n runtime dependency.
8. A new semantic abstraction must replace duplicated responsibility or protect a repeated invariant across multiple scenarios.
9. Classify failures as model/context/tool/authority/state/guard before changing architecture.
10. Never hard-code benchmark case IDs/phrases into production behavior.

---

## 12. Security model

### Assets / boundaries

Protect:

- customer identity and PII;
- recipient/checkout data;
- business facts;
- cart/order/payment state;
- credentials;
- ownership;
- mutation permission.

Treat as untrusted:

- customer text;
- retrieved text;
- model output;
- model tool arguments;
- external tool/source responses.

### Required controls

- prompt text never grants permission;
- protected execution identity is server-owned;
- every privileged tool validates schema/scope/authorization;
- mutations use operation identity and revision/fencing;
- ambiguous mutation results reconcile before retry;
- retrieval remains tenant/shop scoped;
- secrets/unnecessary PII stay out of model context;
- effect claims require success receipts;
- logs/traces are sanitized;
- model/tool loop is finite.

### Abuse cases

Test at least:

- prompt injection requesting bypass of tool restrictions;
- invented price/stock without verified data;
- model attempts to override tenant/customer/cart/order identity;
- stale revision mutation;
- duplicate/ambiguous mutation retry;
- malformed/stale tool result;
- PII propagation outside allowed boundary;
- effect claim after failed/ambiguous result;
- loop/token exhaustion attempt.

---

## 13. Evaluation protocol

The first implementation is an isolated candidate/shadow path. It must not send live customer messages or mutate live business systems.

The PR base SHA is documentation provenance, not automatically the experiment baseline.

### Evaluation principle: goal first, baseline second

Candidate correctness is defined by **pre-registered absolute product and safety gates**, not by whether it beats C3.

Replacement readiness is a separate decision. C3 remains a matched reference for:

- measuring architecture/orchestration delta;
- proving whether customer-facing quality clearly improves enough to justify replacement;
- finding regressions in capabilities that already work;
- understanding migration risk and trade-offs.

C3 is not the quality specification, but comparison against it is a required **second gate for replacing C3**. Therefore:

- beating C3 does not rescue a candidate that fails an absolute product/safety gate;
- a candidate may meet the absolute product target while still being **not replacement-ready**;
- neutral comparative quality is insufficient to replace C3 under this experiment's objective;
- replacement additionally requires preregistered clear quality improvement, no safety/state/effect regression, and the structural "do not build C3 again" gate;
- the sealed holdout should be designed from target product capabilities, not from a list of known C3 failures.

### 13.1 Experiment manifest, substrate and matched-comparison parity

Every comparison run must record:

~~~text
implementationBaseSha
comparisonBaselineSha
businessSafetySubstrate identity/config
model/provider/version
thinking/effort
generation parameters
history/truncation policy
business/source snapshot + freshness time
corpus identity
rubric/judge identity
request/run identity
~~~

For a claim that isolates **architecture / semantic orchestration**, recording provenance is necessary but not sufficient. Candidate and baseline must also be matched on the variables that are not intended to change.

For paired single-turn architecture comparison, use the same:

- model family/version;
- thinking/effort setting;
- relevant generation parameters;
- judge model/configuration or the same human rubric/process;
- customer message;
- accepted history;
- canonical pre-turn state;
- business/source snapshot and freshness time;
- business/safety substrate.

For stateful journey architecture comparison, use the same:

- initial state;
- initial business/source world and freshness policy;
- model/version/effort/generation settings;
- judge/rubric process;
- customer-simulation policy / scripted branch rules.

After the journey begins, each path is expected to accumulate different history/state/effects because those are measured outcomes.

Prompt/orchestration, number of model invocations, tool-call count, token use and latency may differ; those are part of the architecture under test or measured outcomes.

If matching cannot be achieved, the run may still be reported, but only as a **package-level comparison**. It must not replace the matched comparison required to attribute quality delta to semantic orchestration.

### 13.2 Development evidence

Development may start with a small corpus, but it must include both:

1. **Paired single-turn evidence** — same message/history/pre-state/business truth to compare the decision/reply for one turn.
2. **Stateful journey evidence** — same initial state and customer scenario, then each path continues using the history/state/effects it actually produced.

The journey corpus must include clear customer follow-up branches where the two paths ask different questions. It must not reset canonical state from a perfect fixture on every turn.

"No silent drop" is evaluated from the raw customer message/history to the customer-visible outcome, not only from model-extracted obligations to outcomes.

### 13.3 Scenario contract

Each locked scenario defines:

- initial/pre-turn state;
- latest customer message or scripted customer branch;
- relevant business truth;
- required customer outcomes;
- allowed facts/actions;
- forbidden facts/actions;
- deterministic expected state/effect when applicable.

Exact prose is not required except where an existing code-owned receipt/policy surface is itself an invariant.

### 13.4 Promotion protocol must be preregistered

Before a promotion-candidate run, freeze:

- exact baseline/candidate source identities and matched-comparison configuration from §13.1;
- dev corpus vs sealed holdout;
- history window/truncation policy;
- rubric and numeric **absolute product-quality pass thresholds** for paired turns and stateful journeys;
- preregistered **comparative replacement criteria** for paired turns and stateful journeys, including what counts as clear quality improvement over C3;
- hard non-regression rules for safety/state/effect behavior in the matched comparison;
- structural evidence required to show the candidate actually collapses/replaces C3 semantic machinery rather than recreating it;
- blind/randomized A/B ordering;
- tie and judge-disagreement handling;
- repeated-generation/variance policy where nondeterminism matters;
- retry policy and accounting for every attempt;
- exact provider/model/request identity;
- corpus/rubric provenance.

Thresholds and rubric do not change after results are observed.

The whole population is accounted for: accepted replies, rejects, timeouts, fallbacks and handoffs. A safe handoff may still be a quality failure when the bot had enough information to answer.

### 13.5 Two sequential decisions: meets target, then qualifies to replace C3

#### Gate A — Candidate meets target

The **candidate itself** must pass all preregistered absolute gates on the sealed holdout.

Hard correctness/safety gates include:

- product/variant subject safety;
- protected claim authority;
- stale cart protection;
- effect permission/receipt;
- PII;
- ownership/handoff;
- revision/CAS behavior;
- deterministic state/effect acceptance;
- explicit customer needs are not silently dropped.

Product-quality gates must be defined and passed **separately** for paired single turns and stateful journeys. Quality dimensions for both modes include:

- understanding;
- completeness/question resolution;
- context use;
- usefulness/decision support;
- next step;
- naturalness/coherence;
- factual/action safety.

Both modes must meet their absolute thresholds independently. A strong result in one mode cannot compensate for failure in the other.

If Gate A fails, the candidate is rejected regardless of C3 comparison.

#### Gate B — Candidate qualifies to replace C3

Gate B is evaluated only after Gate A passes.

Replacement readiness additionally requires all of:

- matched paired-turn comparison satisfies the preregistered **clear quality-improvement** criterion over C3;
- matched stateful-journey comparison satisfies its preregistered **clear quality-improvement** criterion over C3;
- no safety/state/effect regression relative to the matched C3 reference;
- structural audit passes §14.1 and shows meaningful C3 semantic responsibilities were removed/collapsed rather than renamed or recreated.

A better-than-C3 result cannot override a Gate A failure.

A **neutral** matched comparison may still yield `Candidate meets target = PASS`, but it yields `Candidate qualifies to replace C3 = FAIL`. Under this experiment, neutral quality is not enough reason to migrate.

Comparative criteria are migration/replacement criteria, not the definition of product correctness.

Guard acceptance alone is insufficient.

---

## 14. Structural and operational gates

Record baseline and candidate values for:

- online model roles;
- model invocations per turn;
- tool rounds/calls;
- semantic representations crossed before final reply;
- semantic validators/mappers;
- hard guards;
- end-to-end latency;
- token/cost usage;
- provider errors;
- fallback/handoff/guard reasons.

### 14.1 "Do not build C3 again" is a pass/fail gate

Promotion fails if the candidate introduces any of these patterns:

- model-authored semantic artifact whose only purpose is to feed another model role;
- separate semantic model role without new world information that the current conversational role could consume directly;
- domain tool that silently becomes an intent/concern/language classifier;
- runtime guard that reconstructs intent, completeness or conversational strategy;
- new durable semantic state when existing state owners are sufficient;
- new semantic boundary that adds responsibility without retiring/replacing an old semantic responsibility.

For representative scenarios, the experiment must trace one raw customer need from message -> model -> tool/state -> final customer outcome and identify every semantic mapper/validator crossed in baseline and candidate.

No fixed percentage quota is required. The gate is qualitative but falsifiable: reviewers must be able to point to which C3 semantic responsibilities disappeared or collapsed. A candidate that merely renames Producer -> planner -> writer does not pass.

Operational metrics remain outcomes, not architecture targets by themselves. No latency or cost improvement is claimed in advance.

---

## 15. Alternatives considered

| Alternative | Why not default |
|---|---|
| Continue patching current C3 | Appropriate for local bugs, but repeated semantic gaps risk more representations/validators without proving end-to-end quality |
| Producer -> one final model | Still allows upstream semantic compression to become the final model's only view |
| Two-model interpreter -> responder | Still creates a semantic telephone unless the split proves measurable value |
| Full rewrite | Loses hard-earned authority/cart/PII/effect/delivery protections |
| Adopt n8n/general agent runtime | Useful mental model, but a new framework is unnecessary until current runtime is proven insufficient |
| Single conversational owner + existing tools | Smallest experiment that changes semantic ownership while preserving business/safety core |

Rejected alternatives may be revisited only with new evidence.

---

## 16. Experiment, recovery, migration and rollback

Implementation, if approved, proceeds in this order:

1. **protected-egress feasibility slice** using the actual intended output surface, ordinary + adversarial cases, and the existing durable claim boundary;
2. isolated candidate runner with existing read-only business tools only if the feasibility slice does not fail the safety/quality/complexity hypothesis;
3. paired single-turn and stateful fake-port evaluation;
4. real-model paired/journey comparison;
5. stateful mutation tests with fake ports;
6. **production persistence/business adapters against ephemeral/test infrastructure, external send disabled**;
7. only after the previous gates pass, bounded opt-in with current fallback;
8. only after acceptance, plan deprecation of superseded semantic roles.

### 16.1 Pre-effect vs post-effect recovery

Fallback semantics must distinguish whether durable state/effect has committed.

**Before any durable commit:** the runtime may safely abandon the candidate attempt and use an approved fallback path, subject to normal duplicate-source controls.

**After a durable state/effect commit:** the original turn must not be replayed from the pre-turn snapshot as if nothing happened.

After commit:

- receipt/current committed state becomes the recovery source of truth;
- sourceMessageId and operationId remain attached to the recovery attempt;
- fallback/continuation receives committed state/receipt;
- mutating tools are suppressed or idempotency/reconciliation proves replay is safe;
- guard rejection, model timeout or loop exhaustion does **not** roll back an already committed business effect;
- if a safe deterministic receipt acknowledgement exists, it may be used; otherwise use a bounded handoff/clarification based on committed state;
- accepted history must not record an unsent rejected draft as customer-visible output;
- Outbox retry retries delivery of an accepted reply, not the business effect.

For an `AMBIGUOUS` mutation result, reconciliation by operation identity happens before any lane fallback or action replay that could repeat the effect.

For multiple mutations in one turn, each committed operation has its own operation identity/receipt and recovery accounts for the committed prefix.

### 16.2 Real-adapter send-disabled gate

Before any production opt-in, focused verification must use the real persistence/business adapter path with ephemeral/test DB or equivalent isolated infrastructure and external customer send disabled.

At minimum prove:

- stale DB revision;
- duplicate source message;
- crash/timeout after committed mutation;
- ambiguous mutation reconciliation;
- operationId idempotency;
- accepted-history/Outbox recovery;
- no duplicate side effect across fallback/retry.

This is boundary verification, not a production-scale rollout requirement.

### 16.3 Rollback

Before production opt-in:

- current C3 remains rollback for future/uncommitted turns;
- candidate has kill switch/opt-in;
- no irreversible schema migration;
- no candidate-only durable state requirement.

A kill switch does not undo already committed effects.

Do not keep two permanent architectures. If the candidate passes the absolute product target but does not satisfy the preregistered replacement gate — including clear quality improvement over C3 — record it as **target-met but not replacement-ready** and remove/close the experiment rather than preserve neutral complexity. Reconsidering replacement for a different objective requires a new explicit spec/owner decision.

---

## 17. Implementation constraints

### Stack

Current baseline:

- Node.js >= 22;
- pnpm 10.12.4;
- TypeScript 5.8.3;
- Vitest 3.2.4.

No new runtime dependency is approved by this spec.

Any version-sensitive provider/tool-call API must be checked against current official documentation during implementation.

### Existing ownership areas

Expected reuse:

- `apps/worker/src` for orchestration/candidate runner;
- `packages/business-tools` for verified business/search capabilities;
- `packages/commerce-kernel` for cart/order/effect authority;
- `packages/contracts` only for stable cross-boundary types;
- existing chat/conversation runtime/provider abstractions;
- existing benchmark/evaluation assets.

This spec does not authorize moving modules just to match the architecture diagram.

### Code style

- narrow typed interfaces at privileged business/action boundaries;
- natural-language context is not forced into enums unless code actually needs the enum;
- model output never directly mutates authoritative state;
- explicit typed status for stale/unknown/ambiguous results;
- avoid pass-through wrappers;
- no benchmark-case switches.

---

## 18. Verification strategy

Implementation follows RED -> GREEN -> REFACTOR where practical.

### Unit

Cover:

- tool argument/reference validation;
- server-owned protected execution identity;
- state SET/CLEAR/REPLACE validation against existing writable owners;
- correction -> accepted effective state -> dependent tool ordering;
- rejected/conflicting correction blocks stale dependent-tool interpretation;
- source/revision conflicts;
- freshness/binding/revision;
- mutation idempotency;
- ambiguous-result reconciliation;
- protected-egress feasibility on the actual candidate output surface;
- existing undeclared-claim rejection;
- wrong-subject / negation / dropped-condition / stronger-implied-policy / no-receipt adversarial cases;
- normal compound/policy replies remain sufficiently complete and natural without expanding semantic regexes;
- deterministic derivations;
- loop budget/fallback.

### Integration

Cover:

- model/tool adapter with fake model outputs;
- bounded subject reference selection -> protected identity validation;
- same-agent state proposal + domain tool request;
- independent tools in one round;
- dependent second tool round;
- state update/readback;
- malformed/stale tool output;
- post-effect model/guard failure without effect replay;
- hard stop/handoff;
- PII boundaries.

### Stateful runtime

Using fake ports first, then the real-adapter send-disabled gate from §16.2, verify:

- cross-turn state produced by the path itself;
- corrections/referent changes;
- cart mutation/readback;
- checkout/effect boundaries;
- crash/retry after commit;
- duplicate source-message handling;
- accepted-history/Outbox recovery;
- fallback/ownership transitions.

### Real-model evaluation

Persist exact:

- source SHA;
- model/version/config;
- prompt/context inputs;
- tool requests/results;
- final reply;
- guard/evaluation result.

Schema completion or runtime guard acceptance is not a quality pass.

Workspace commands for later implementation verification are:

~~~bash
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm check
~~~

This spec PR does not claim those commands were run.

---

## 19. Boundaries

### Always

- preserve the durable protected-claim boundary; do not weaken it for conversational freedom;
- preserve business authority/freshness/product/cart bindings;
- preserve PII/effect/ownership/Outbox invariants;
- let the model select only runtime-supplied/allowlisted subject references;
- validate privileged tool/state boundaries in code;
- keep protected execution identity server-owned;
- keep model/tool loop finite;
- distinguish pre-effect fallback from post-effect recovery;
- compare candidate/baseline on frozen manifests;
- report actual model/tool call counts and failures.

### Ask first

- new durable state/schema;
- new model/provider dependency;
- new external integration;
- auth/PII boundary change;
- new production tool permission;
- live traffic;
- C3 removal;
- evaluation threshold change after a run starts.

### Never

- live-send experiment output without rollout approval;
- use simulation facts as production authority;
- let prompt text grant permission;
- let model output directly commit cart/order/payment effects;
- add benchmark-specific production branches;
- weaken guard/assertions to improve acceptance;
- claim quality closure from guard acceptance;
- add generic runtime free-form semantic completeness checking;
- use an unbounded agent loop;
- delete current safety behavior before parity is proven.

---

## 20. Spec acceptance criteria

This spec is ready for implementation planning only if reviewers agree that:

1. the customer-facing quality objective is explicit;
2. evidence for the experiment is stated without claiming current C3 is globally broken;
3. ownership is clear: model owns conversation; code owns reality/authority/effects;
4. current C3 business/safety infrastructure to reuse is named;
5. protected egress is explicitly an **open feasibility hypothesis**, and the first implementation slice must prove safety + conversational usefulness without a new broad semantic parser/template explosion;
6. referent selection uses a bounded runtime-supplied reference set while code retains protected identity authority;
7. same-agent state patching is limited to existing writable state owners and does not recreate Producer;
8. dependent tools consume the accepted effective state after same-turn corrections; stale pre-correction results cannot be treated as current;
9. mutation idempotency plus post-effect recovery prevents replay after committed effects;
10. evaluation is **goal-first, baseline-second**: absolute product/safety gates decide whether the candidate meets target; they are not replaced by C3-relative scoring;
11. replacement readiness is a separate second gate requiring preregistered clear quality improvement over matched C3 in both paired single turns and stateful journeys, plus no safety/state/effect regression;
12. promotion protocol has preregistered sealed-holdout/rubric/absolute-threshold/comparative-replacement/accounting rules;
13. "do not build C3 again" is a falsifiable structural gate required for replacement readiness, not only a principle;
14. real-adapter send-disabled verification is required before opt-in;
15. runtime safety guards remain distinct from offline conversational-quality evaluation;
16. this PR changes no runtime behavior.

Human approval is required before implementation planning.

---

## 21. Open owner decisions

1. **Absolute product-quality thresholds:** exact paired-turn and stateful-journey quality pass thresholds to freeze before promotion-candidate evaluation.
2. **Comparative replacement criteria:** exact preregistered rule for "clear quality improvement" over C3 in paired turns and stateful journeys, including any non-compensable quality dimensions; safety/state/effect remain hard non-regression.
3. **First-contact lane:** preserve current fixed first-contact unchanged initially, or include it in the paired candidate corpus.
4. **Hard model/tool-loop cap:** target is 1 call with no tools, 2 with one independent tool round, 3 only for dependent work; freeze the exact production cap after baseline measurement.
5. **Candidate name:** keep "C3 single-agent candidate" or use a neutral experiment name.

---

## 22. Decision summary

~~~text
MODEL
  understand + select bounded refs
  + propose existing-state updates
      |
      v
HARDENED CODE TOOLS / STATE OWNERS
  identity + truth + permissions + effects
      |
      v
VERIFIED PROTECTED EGRESS
  protected facts/receipts remain code-verifiable
      |
      v
SAME CONVERSATIONAL ROLE
  continue with new world information
      |
      v
RUNTIME HARD GUARD
  authority/effect/privacy only
      |
      v
OUTBOX
~~~

After any committed state/effect, recovery continues from the committed state/receipt; it does not replay the turn from pre-state.

Offline locked evaluation, not the runtime guard, decides whether the conversation is complete, useful and natural.

The experiment proceeds beyond the first feasibility slice only if the intended protected-egress surface can preserve the durable claim/effect safety contract without collapsing normal conversation into templates or rebuilding a semantic parser.

Final evaluation produces two explicit verdicts:

1. **Candidate meets target** — the complete candidate passes preregistered absolute product-quality and safety gates for both paired turns and stateful journeys.
2. **Candidate qualifies to replace C3** — verdict 1 passes, matched paired-turn and stateful-journey comparisons satisfy preregistered clear quality-improvement criteria, safety/state/effect do not regress, and the structural "do not build C3 again" gate passes.

C3 does not define product correctness, but clear improvement over C3 is required to justify replacing C3 in this experiment.
