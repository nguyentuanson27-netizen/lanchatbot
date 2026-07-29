@echo off
if not defined LANA_SSH_PASSWORD_FILE exit /b 1
powershell.exe -NoProfile -NonInteractive -Command "$p=(Get-Content -Raw -LiteralPath $env:LANA_SSH_PASSWORD_FILE).Trim(); [Console]::Out.Write($p)"
