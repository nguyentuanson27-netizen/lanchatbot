# Isolated PostgreSQL verification — 2026-09-25

Source HEAD: `95e9a23a116e296e6cf4edd90f4c00811244159c`. Runtime source is unchanged from `c866729e4bcd19e391f4d3a7edabafdcca064660`; this commit fixes only the injected-commit PostgreSQL test's rejection handling.

The attached VPS key authenticated to `root@156.67.214.197`. Inspection found the real chatbot database container, so the tests used a **separate empty** `postgres:17-alpine` container named `codex-c3-pg-test-20260925`. It had a 512 MiB memory limit, one CPU limit, tmpfs data directory, and a port bound only to VPS localhost. The workstation connected through a local SSH tunnel. Initial readback found zero application tables in `postgres`. No application container, live database, traffic route or customer data was used. The test container was stopped and auto-removed; readback of its exact name was empty. The local tunnel closed.

The database package's three supported test URL variables (`POLICY_STORE_TEST_DATABASE_URL`, `GATE_E_STORE_TEST_DATABASE_URL`, `TRACK_B_OPERATOR_ROLE_TEST_DATABASE_URL`) pointed to this isolated instance. `pnpm --filter @lana/database test` ran all PostgreSQL suites with `--no-file-parallelism`:

- Final result: **33 files passed, 266 tests passed, 0 skipped**, process exit 0.
- The first run executed all 266 assertions but exited 1 because the Gate E test registered its expected connection-ambiguous `COMMIT` rejection only after a polling loop. Node reported that already-rejected promise as unhandled. Commit `95e9a23` attaches the rejection handler immediately. The focused Gate E suite then passed 12/12, and the final complete suite passed 266/266.
- Final raw log: `C:/Users/nguye/Documents/Sản phẩm AI/c3_isolated_postgres_test_final.log`, 7,687 bytes, SHA-256 `f17f59c85db4615c38b1d5f9b955a353976ee691007de24f348443e8ce1e19d1`.

This closes the repository's 30 previously skipped PostgreSQL cases in an isolated environment. It does **not** prove the separate T10 accepted-history recovery fault sequence against PostgreSQL; that targeted integration remains open.
