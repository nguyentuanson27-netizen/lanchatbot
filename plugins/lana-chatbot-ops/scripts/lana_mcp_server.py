#!/usr/bin/env python3
"""Audited local MCP server for Lana chatbot operations."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

SERVER_VERSION = "0.1.0"
DEFAULT_PAGE_ID = "1198992073286645"
PROTECTED_BRANCHES = {"main", "master", "production", "prod"}
PLUGIN_ROOT = Path(__file__).resolve().parent.parent
REMOTE_SCRIPT = PLUGIN_ROOT / "scripts" / "remote_ops.mjs"


def data_dir() -> Path:
    root = Path(
        os.environ.get("LANA_MCP_DATA_DIR") or (Path.home() / ".lana-mcp")
    ).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def audit(
    tool: str,
    outcome: str,
    reason: str = "",
    details: dict[str, Any] | None = None,
) -> None:
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tool": tool,
        "outcome": outcome,
        "reason": reason[:500],
        "details": details or {},
    }
    with (data_dir() / "audit.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, default=str) + "\n")


def require_confirmation(
    args: dict[str, Any],
    field: str,
    reason_field: str = "reason",
) -> str:
    if args.get(field) is not True:
        raise ValueError(f"{field}=true is required")
    reason = str(args.get(reason_field) or "").strip()
    if len(reason) < 5:
        raise ValueError(f"{reason_field} must explain the purpose")
    return reason


def repo_path() -> Path:
    configured = os.environ.get("LANA_REPO_PATH")
    candidates = [
        Path(configured) if configured else None,
        Path.home() / "Documents" / "Sản phẩm AI" / "lanchatbot",
        Path.cwd(),
    ]
    for candidate in candidates:
        if candidate and (candidate / ".git").exists():
            return candidate.resolve()
    raise RuntimeError("LANA_REPO_PATH_NOT_FOUND")


def run(
    command: list[str],
    *,
    cwd: Path | None = None,
    timeout: int = 60,
    input_text: str | None = None,
) -> str:
    completed = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        input=input_text,
        text=True,
        capture_output=True,
        timeout=timeout,
        encoding="utf-8",
        errors="replace",
    )
    if completed.returncode != 0:
        error = (completed.stderr or completed.stdout or "COMMAND_FAILED").strip()
        raise RuntimeError(error[-4000:])
    return completed.stdout


def ssh_environment() -> dict[str, str]:
    env = os.environ.copy()
    password_file = env.get("LANA_SSH_PASSWORD_FILE", "").strip()
    direct_password = env.get("CODEX_SSH_PASSWORD", "")
    if not password_file and direct_password:
        secret_dir = data_dir() / "secrets"
        secret_dir.mkdir(parents=True, exist_ok=True)
        target = secret_dir / "ssh-password"
        target.write_text(direct_password, encoding="utf-8")
        password_file = str(target)
    if password_file:
        env["LANA_SSH_PASSWORD_FILE"] = password_file
        env["SSH_ASKPASS"] = str(PLUGIN_ROOT / "scripts" / "ssh_askpass.cmd")
        env["SSH_ASKPASS_REQUIRE"] = "force"
        env["DISPLAY"] = env.get("DISPLAY") or "codex"
    return env


def ssh_command(remote_command: str, *, timeout: int = 90) -> str:
    host = os.environ.get("LANA_SSH_HOST", "156.67.214.197").strip()
    user = os.environ.get("LANA_SSH_USER", "root").strip()
    if not re.fullmatch(r"[A-Za-z0-9._-]+", host):
        raise ValueError("SSH_HOST_INVALID")
    if not re.fullmatch(r"[A-Za-z0-9._-]+", user):
        raise ValueError("SSH_USER_INVALID")
    completed = subprocess.run(
        [
            "ssh",
            "-o",
            "ConnectTimeout=15",
            "-o",
            "StrictHostKeyChecking=accept-new",
            "-o",
            "PreferredAuthentications=password,publickey",
            f"{user}@{host}",
            remote_command,
        ],
        text=True,
        capture_output=True,
        timeout=timeout,
        encoding="utf-8",
        errors="replace",
        env=ssh_environment(),
    )
    if completed.returncode != 0:
        error = (completed.stderr or completed.stdout or "SSH_FAILED").strip()
        raise RuntimeError(error[-4000:])
    return completed.stdout


def remote_command(container: str, operation: str, arguments: dict[str, Any]) -> str:
    if container not in {
        "lana-chatbot-realtime-worker",
        "lana-chatbot-p23b-metadata-staging",
    }:
        raise ValueError("REMOTE_CONTAINER_NOT_ALLOWED")
    script_b64 = base64.b64encode(REMOTE_SCRIPT.read_bytes()).decode("ascii")
    payload = {"op": operation, **arguments}
    payload_b64 = base64.b64encode(
        json.dumps(payload, ensure_ascii=False).encode("utf-8")
    ).decode("ascii")
    return (
        f"printf %s {shlex.quote(script_b64)} | base64 -d | "
        f"docker exec -i -e LANA_MCP_INPUT_B64={shlex.quote(payload_b64)} "
        f"{container} node --input-type=module"
    )


def remote_node(
    container: str,
    operation: str,
    arguments: dict[str, Any],
    *,
    timeout: int = 120,
) -> Any:
    output = ssh_command(
        remote_command(container, operation, arguments),
        timeout=timeout,
    ).strip()
    if not output:
        return {}
    return json.loads(output.splitlines()[-1])


def git(*args: str, timeout: int = 60) -> str:
    return run(["git", *args], cwd=repo_path(), timeout=timeout)


def tool_vps_status(_args: dict[str, Any]) -> Any:
    output = ssh_command(
        "docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}'",
        timeout=30,
    )
    rows = []
    for line in output.splitlines():
        fields = line.split("|", 2)
        if len(fields) != 3:
            continue
        name, image, status = fields
        if name.startswith("lana-chatbot") or name == "n8n-docker_npm_1":
            rows.append({"name": name, "image": image, "status": status})
    return {"domain": "dev.lanadesign.vn", "containers": rows}


def tool_latest(args: dict[str, Any]) -> Any:
    include_sensitive = bool(args.get("include_sensitive"))
    if include_sensitive:
        require_confirmation(args, "confirm_sensitive_read")
    return remote_node(
        "lana-chatbot-realtime-worker",
        "latest",
        {
            "page_id": str(args.get("page_id") or DEFAULT_PAGE_ID),
            "limit": int(args.get("limit") or 10),
            "include_sensitive": include_sensitive,
        },
    )


def tool_qdrant(args: dict[str, Any]) -> Any:
    include_sensitive = bool(args.get("include_sensitive"))
    if include_sensitive:
        require_confirmation(args, "confirm_sensitive_read")
    return remote_node(
        "lana-chatbot-realtime-worker",
        "qdrant_product",
        {
            "product_id": str(args.get("product_id") or ""),
            "collection": str(args.get("collection") or ""),
            "limit": int(args.get("limit") or 20),
            "include_sensitive": include_sensitive,
        },
    )


def tool_redis_list(args: dict[str, Any]) -> Any:
    reason = require_confirmation(args, "confirm_sensitive_read")
    pattern = str(args.get("pattern") or "*")
    result = remote_node(
        "lana-chatbot-realtime-worker",
        "redis_list",
        {"pattern": pattern, "limit": int(args.get("limit") or 500)},
    )
    audit(
        "redis_list_keys",
        "success",
        reason,
        {"count": result.get("count"), "pattern_hash": sha(pattern)},
    )
    return result


def tool_redis_read(args: dict[str, Any]) -> Any:
    reason = require_confirmation(args, "confirm_sensitive_read")
    key = str(args.get("key") or "")
    result = remote_node(
        "lana-chatbot-realtime-worker",
        "redis_read",
        {"key": key},
    )
    audit(
        "redis_read_key",
        "success",
        reason,
        {"key_hash": sha(key), "type": result.get("type")},
    )
    return result


def tool_redis_export(args: dict[str, Any]) -> Any:
    reason = require_confirmation(args, "confirm_sensitive_read")
    export_dir = data_dir() / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = (export_dir / f"redis-{timestamp}.jsonl").resolve()
    if export_dir.resolve() not in target.parents:
        raise RuntimeError("EXPORT_PATH_INVALID")

    host = os.environ.get("LANA_SSH_HOST", "156.67.214.197").strip()
    user = os.environ.get("LANA_SSH_USER", "root").strip()
    command = [
        "ssh",
        "-o",
        "ConnectTimeout=15",
        "-o",
        "StrictHostKeyChecking=accept-new",
        "-o",
        "PreferredAuthentications=password,publickey",
        f"{user}@{host}",
        remote_command(
            "lana-chatbot-realtime-worker",
            "redis_export",
            {},
        ),
    ]
    digest = hashlib.sha256()
    rows = 0
    with target.open("wb") as handle:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=ssh_environment(),
        )
        assert process.stdout is not None
        for chunk in iter(lambda: process.stdout.read(1024 * 1024), b""):
            handle.write(chunk)
            digest.update(chunk)
            rows += chunk.count(b"\n")
        stderr = (
            process.stderr.read().decode("utf-8", "replace")
            if process.stderr
            else ""
        )
        code = process.wait(timeout=300)
    if code != 0:
        target.unlink(missing_ok=True)
        raise RuntimeError(stderr[-4000:] or "REDIS_EXPORT_FAILED")
    result = {
        "path": str(target),
        "sha256": digest.hexdigest(),
        "exported_keys": rows,
    }
    audit("redis_export_all", "success", reason, result)
    return result


def tool_sheet_read(args: dict[str, Any]) -> Any:
    reason = require_confirmation(args, "confirm_sensitive_read")
    sheet_range = str(args.get("range") or "")
    result = remote_node(
        "lana-chatbot-p23b-metadata-staging",
        "sheet_read",
        {
            "range": sheet_range,
            "spreadsheet_id": str(args.get("spreadsheet_id") or ""),
        },
    )
    audit(
        "sheet_read_range",
        "success",
        reason,
        {"range_hash": sha(sheet_range)},
    )
    return result


def sheet_write(operation: str, args: dict[str, Any]) -> Any:
    reason = require_confirmation(args, "confirm_write", "change_note")
    payload = {
        "note": f"BY_CHATGPT: {reason}",
        "spreadsheet_id": str(args.get("spreadsheet_id") or ""),
        "cells": args.get("cells"),
        "tab": args.get("tab"),
        "key_column": args.get("key_column"),
        "key_value": args.get("key_value"),
        "updates": args.get("updates"),
    }
    result = remote_node(
        "lana-chatbot-p23b-metadata-staging",
        operation,
        payload,
    )
    audit(
        operation,
        "success",
        reason,
        {
            "target_hash": sha(
                json.dumps(
                    {
                        key: payload.get(key)
                        for key in ("cells", "tab", "key_column", "key_value")
                    },
                    default=str,
                )
            )
        },
    )
    return result


def tool_git_status(_args: dict[str, Any]) -> Any:
    return {
        "repo": str(repo_path()),
        "branch": git("branch", "--show-current").strip(),
        "status": git("status", "--short", "--branch"),
        "head": git("rev-parse", "HEAD").strip(),
        "origin": git("remote", "get-url", "origin").strip(),
    }


def current_branch() -> str:
    branch = git("branch", "--show-current").strip()
    if not branch or branch.lower() in PROTECTED_BRANCHES:
        raise RuntimeError("NON_PROTECTED_BRANCH_REQUIRED")
    return branch


def tool_git_create_branch(args: dict[str, Any]) -> Any:
    reason = require_confirmation(args, "confirm_write", "change_note")
    branch = str(args.get("branch") or "").strip()
    if (
        not re.fullmatch(r"[A-Za-z0-9._/-]{3,120}", branch)
        or branch.lower() in PROTECTED_BRANCHES
    ):
        raise ValueError("BRANCH_NAME_INVALID")
    if git("status", "--porcelain").strip():
        raise RuntimeError("WORKTREE_MUST_BE_CLEAN")
    git("switch", "-c", branch)
    audit("git_create_branch", "success", reason, {"branch": branch})
    return {"branch": branch, "head": git("rev-parse", "HEAD").strip()}


def tool_git_apply_patch(args: dict[str, Any]) -> Any:
    reason = require_confirmation(args, "confirm_write", "change_note")
    branch = current_branch()
    patch = str(args.get("patch") or "")
    if len(patch) < 20 or len(patch) > 2_000_000:
        raise ValueError("PATCH_SIZE_INVALID")
    with tempfile.NamedTemporaryFile(
        "w",
        suffix=".patch",
        encoding="utf-8",
        delete=False,
    ) as handle:
        handle.write(patch)
        patch_path = Path(handle.name)
    try:
        run(["git", "apply", "--check", str(patch_path)], cwd=repo_path())
        run(
            ["git", "apply", "--whitespace=fix", str(patch_path)],
            cwd=repo_path(),
        )
    finally:
        patch_path.unlink(missing_ok=True)
    audit(
        "git_apply_patch",
        "success",
        reason,
        {"branch": branch, "patch_sha256": sha(patch)},
    )
    return {"branch": branch, "changed": git("status", "--short")}


TEST_COMMANDS = {
    "check": ["pnpm", "check"],
    "realtime": [
        "pnpm",
        "--filter",
        "@lana/worker",
        "test",
        "--",
        "realtime",
    ],
    "media": [
        "pnpm",
        "--filter",
        "@lana/worker",
        "test",
        "--",
        "media",
    ],
}


def tool_git_test(args: dict[str, Any]) -> Any:
    target = str(args.get("target") or "check")
    command = TEST_COMMANDS.get(target)
    if not command:
        raise ValueError("TEST_TARGET_INVALID")
    output = run(command, cwd=repo_path(), timeout=900)
    return {"target": target, "output": output[-20000:]}


def tool_git_commit(args: dict[str, Any]) -> Any:
    reason = require_confirmation(args, "confirm_write", "change_note")
    branch = current_branch()
    message = str(args.get("message") or "").strip()
    if len(message) < 5 or len(message) > 200:
        raise ValueError("COMMIT_MESSAGE_INVALID")
    git("add", "--all")
    git("commit", "-m", message, timeout=120)
    commit = git("rev-parse", "HEAD").strip()
    audit(
        "git_commit",
        "success",
        reason,
        {"branch": branch, "commit": commit},
    )
    return {"branch": branch, "commit": commit}


def tool_git_push(args: dict[str, Any]) -> Any:
    reason = require_confirmation(args, "confirm_write", "change_note")
    branch = current_branch()
    output = git("push", "--set-upstream", "origin", "HEAD", timeout=180)
    head = git("rev-parse", "HEAD").strip()
    audit(
        "git_push_branch",
        "success",
        reason,
        {"branch": branch, "head": head},
    )
    return {"branch": branch, "head": head, "output": output[-5000:]}


ToolHandler = Callable[[dict[str, Any]], Any]
TOOLS: dict[str, tuple[dict[str, Any], ToolHandler]] = {}


def register(
    name: str,
    description: str,
    properties: dict[str, Any],
    handler: ToolHandler,
    *,
    required: list[str] | None = None,
    read_only: bool = True,
) -> None:
    TOOLS[name] = (
        {
            "name": name,
            "description": description,
            "inputSchema": {
                "type": "object",
                "properties": properties,
                "required": required or [],
                "additionalProperties": False,
            },
            "annotations": {
                "readOnlyHint": read_only,
                "destructiveHint": False,
                "idempotentHint": read_only,
            },
        },
        handler,
    )


def register_tools() -> None:
    confirm_sensitive = {
        "confirm_sensitive_read": {
            "type": "boolean",
            "description": "Must be true for sensitive data access.",
        },
        "reason": {
            "type": "string",
            "description": "Specific operational reason for the access.",
        },
    }
    confirm_write = {
        "confirm_write": {
            "type": "boolean",
            "description": "Must be true for this mutation.",
        },
        "change_note": {
            "type": "string",
            "description": "Reason recorded in audit and prefixed with BY_CHATGPT for Sheets.",
        },
    }

    register(
        "vps_status",
        "Read current Lana container images and health without modifying the VPS.",
        {},
        tool_vps_status,
    )
    register(
        "latest_chatbot_evidence",
        "Read latest inbox, decision-event, and outbox evidence for one page. Decrypted payloads require explicit sensitive confirmation.",
        {
            "page_id": {"type": "string", "default": DEFAULT_PAGE_ID},
            "limit": {"type": "integer", "minimum": 1, "maximum": 50},
            "include_sensitive": {"type": "boolean", "default": False},
            **confirm_sensitive,
        },
        tool_latest,
    )
    register(
        "qdrant_product_points",
        "Inspect Qdrant point payloads for a product code. URLs are redacted unless explicitly requested.",
        {
            "product_id": {"type": "string"},
            "collection": {"type": "string"},
            "limit": {"type": "integer", "minimum": 1, "maximum": 100},
            "include_sensitive": {"type": "boolean", "default": False},
            **confirm_sensitive,
        },
        tool_qdrant,
        required=["product_id"],
    )
    register(
        "redis_list_keys",
        "List Redis keys, including sensitive namespaces, with explicit confirmation.",
        {
            "pattern": {"type": "string", "default": "*"},
            "limit": {"type": "integer", "minimum": 1, "maximum": 5000},
            **confirm_sensitive,
        },
        tool_redis_list,
        required=["confirm_sensitive_read", "reason"],
    )
    register(
        "redis_read_key",
        "Read an exact Redis key including session, credential, or customer data.",
        {"key": {"type": "string"}, **confirm_sensitive},
        tool_redis_read,
        required=["key", "confirm_sensitive_read", "reason"],
    )
    register(
        "redis_export_all",
        "Export every Redis key and value to a protected local JSONL file; returns only path, hash, and count.",
        confirm_sensitive,
        tool_redis_export,
        required=["confirm_sensitive_read", "reason"],
    )
    register(
        "sheet_read_range",
        "Read a Google Sheets A1 range.",
        {
            "range": {"type": "string"},
            "spreadsheet_id": {"type": "string"},
            **confirm_sensitive,
        },
        tool_sheet_read,
        required=["range", "confirm_sensitive_read", "reason"],
    )
    register(
        "sheet_update_cells",
        "Atomically update exact Sheet cells and attach BY_CHATGPT notes to every changed cell.",
        {
            "spreadsheet_id": {"type": "string"},
            "cells": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "a1": {"type": "string"},
                        "value": {},
                    },
                    "required": ["a1", "value"],
                    "additionalProperties": False,
                },
            },
            **confirm_write,
        },
        lambda args: sheet_write("sheet_update_cells", args),
        required=["cells", "confirm_write", "change_note"],
        read_only=False,
    )
    register(
        "sheet_update_row",
        "Update named columns in a row selected by an exact key; supports product code, price, status, and MANUAL_OVERRIDE.",
        {
            "spreadsheet_id": {"type": "string"},
            "tab": {"type": "string"},
            "key_column": {"type": "string"},
            "key_value": {"type": "string"},
            "updates": {"type": "object"},
            **confirm_write,
        },
        lambda args: sheet_write("sheet_update_row", args),
        required=[
            "tab",
            "key_column",
            "key_value",
            "updates",
            "confirm_write",
            "change_note",
        ],
        read_only=False,
    )
    register(
        "sheet_approve_image",
        "Approve one image_registry row by exact IMAGE_ID and set VERIFIED, APPROVED, MANUAL_OVERRIDE, ACTIVE, approver, and timestamp.",
        {
            "spreadsheet_id": {"type": "string"},
            "key_value": {
                "type": "string",
                "description": "Exact IMAGE_ID.",
            },
            "updates": {
                "type": "object",
                "description": "Optional reviewer fields such as IMAGE_TYPE or IMAGE_INTENTS.",
            },
            **confirm_write,
        },
        lambda args: sheet_write(
            "sheet_approve_image",
            {**args, "tab": "image_registry", "key_column": "IMAGE_ID"},
        ),
        required=["key_value", "confirm_write", "change_note"],
        read_only=False,
    )
    register(
        "git_status",
        "Read repository branch, HEAD, origin, and worktree state.",
        {},
        tool_git_status,
    )
    register(
        "git_create_branch",
        "Create a non-protected Git branch from the current clean worktree.",
        {"branch": {"type": "string"}, **confirm_write},
        tool_git_create_branch,
        required=["branch", "confirm_write", "change_note"],
        read_only=False,
    )
    register(
        "git_apply_patch",
        "Check and apply a unified patch on a non-protected Git branch.",
        {"patch": {"type": "string"}, **confirm_write},
        tool_git_apply_patch,
        required=["patch", "confirm_write", "change_note"],
        read_only=False,
    )
    register(
        "git_run_tests",
        "Run one approved repository test target.",
        {
            "target": {
                "type": "string",
                "enum": list(TEST_COMMANDS),
                "default": "check",
            }
        },
        tool_git_test,
    )
    register(
        "git_commit",
        "Commit current branch changes.",
        {"message": {"type": "string"}, **confirm_write},
        tool_git_commit,
        required=["message", "confirm_write", "change_note"],
        read_only=False,
    )
    register(
        "git_push_branch",
        "Push the current non-protected branch to origin.",
        confirm_write,
        tool_git_push,
        required=["confirm_write", "change_note"],
        read_only=False,
    )


register_tools()


def response(
    identifier: Any,
    result: Any = None,
    error: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"jsonrpc": "2.0", "id": identifier}
    if error is not None:
        payload["error"] = error
    else:
        payload["result"] = result
    return payload


def dispatch(message: dict[str, Any]) -> dict[str, Any] | None:
    identifier = message.get("id")
    method = message.get("method")
    if method == "initialize":
        requested = (message.get("params") or {}).get("protocolVersion")
        return response(
            identifier,
            {
                "protocolVersion": requested or "2025-06-18",
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {
                    "name": "lana-chatbot-ops",
                    "version": SERVER_VERSION,
                },
            },
        )
    if method in {"notifications/initialized", "notifications/cancelled"}:
        return None
    if method == "ping":
        return response(identifier, {})
    if method == "tools/list":
        return response(
            identifier,
            {
                "tools": [
                    definition for definition, _handler in TOOLS.values()
                ]
            },
        )
    if method == "tools/call":
        params = message.get("params") or {}
        name = str(params.get("name") or "")
        args = params.get("arguments") or {}
        entry = TOOLS.get(name)
        if not entry:
            return response(
                identifier,
                error={
                    "code": -32602,
                    "message": f"Unknown tool: {name}",
                },
            )
        reason = str(args.get("reason") or args.get("change_note") or "")
        request_hash = sha(json.dumps(args, sort_keys=True, default=str))
        try:
            result = entry[1](args)
            audit(name, "success", reason, {"request_hash": request_hash})
            return response(
                identifier,
                {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(
                                result,
                                ensure_ascii=False,
                                default=str,
                            ),
                        }
                    ]
                },
            )
        except Exception as exc:
            audit(
                name,
                "error",
                reason,
                {
                    "request_hash": request_hash,
                    "error": type(exc).__name__,
                    "message": str(exc)[:500],
                },
            )
            return response(
                identifier,
                {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(
                                {"error": str(exc)},
                                ensure_ascii=False,
                            ),
                        }
                    ],
                    "isError": True,
                },
            )
    return response(
        identifier,
        error={"code": -32601, "message": f"Method not found: {method}"},
    )


def self_test() -> int:
    assert REMOTE_SCRIPT.exists()
    assert "BY_CHATGPT:" in REMOTE_SCRIPT.read_text(encoding="utf-8")
    assert PROTECTED_BRANCHES == {"main", "master", "production", "prod"}
    initialized = dispatch(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {"protocolVersion": "2025-06-18"},
        }
    )
    listed = dispatch(
        {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {},
        }
    )
    assert initialized
    assert initialized["result"]["serverInfo"]["name"] == "lana-chatbot-ops"
    assert listed
    assert len(listed["result"]["tools"]) >= 14
    print(
        json.dumps(
            {"ok": True, "tools": len(TOOLS), "version": SERVER_VERSION}
        )
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    for line in sys.stdin:
        try:
            message = json.loads(line)
            result = dispatch(message)
            if result is not None:
                sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
                sys.stdout.flush()
        except Exception as exc:
            sys.stdout.write(
                json.dumps(
                    response(
                        None,
                        error={"code": -32700, "message": str(exc)},
                    )
                )
                + "\n"
            )
            sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
