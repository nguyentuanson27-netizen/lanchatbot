# Commands thực sự chạy

Source/worktree check: `git status --short`, `git rev-parse HEAD` → clean `a39e45affbd1a8171d8e13ffe2d741cc6624278d` trước seal và sau campaign. Không sửa executable/config/prompts khi đang chạy.

Preflight (0generation) và source check (0generation/1embedding) dùng existing credential launcher:

```powershell
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs unused COD --provider-preflight
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out ../c3-b-full-model-20261022-review-fixes/source-check --source-check
python ../c3-b-full-model-20261022-review-fixes/run.py
```

All exit0. Script vận hành [run.py](run.py) là flat list gọi existing runners; hash đã khóa trong REGISTRATION trước provider. [commands.json](commands.json) giữ exact argv và exit code cho5 jobs: B1full24, stateful8, openings4, negotiation3, bank control32. Không automatic generation retry, không thay mẫu/đổi prompt; code tests không bị đếm là model calls. Source-session giữ live PostgreSQL read-only; admin route chỉ dùng để tạo/drop DB test cô lập. Meta transport là capture-only.

B1 entrypoint tự worker build từ clean source trước run (PASS). Không nhận unit tests của lượt fix trước là đã chạy lại trong campaign này; các test đó có evidence riêng tại implementation doc. Script báo cáo đầu có KeyError vì tên case ETA được nhập sai; đã đối chiếu frozen IDs và sửa phần báo cáo, không đổi raw/corpus/request hoặc chạy lại model.

Post-run audit đã thực hiện:39/39raw attempts,111unique generation IDs/111wire bodies, max1provider request/generation; source/prompt/schema/operational-script hashes;64raw SHA256;0evaluator-key leaks;0secret-pattern hits; cả4DBs testDatabaseDropped=true;32bank checksPASS. Không whole-workspace CI hoặc live send. Final report là metadata sau source run, không write source SHA ngược vào manifest.

Git evidence audit: initial staging normalized CRLF ở frozen registration/command script nên Git blob hash khác raw. Đã giữ byte bằng .gitattributes chỉ cho captured artifacts, không đổi raw hoặc runtime. Markdown presentation bỏ whitespace cuối dòng; raw vẫn exact. Final git diff --cached --check PASS; cả64 working-tree và staged Git blobs khớp RAW_HASHES. Bảy command logs được force-add rõ từng file vì repo ignore *.log. Không thay formatting rule của source ngoài evidence directory.
