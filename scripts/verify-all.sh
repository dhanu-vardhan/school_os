#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Feature registry includes PROMPT 005 guardian/family (P005-FAMILY-*) scenarios;
# web/unit and Playwright guardian e2e provide primary evidence for those flows.
exec python3 "$ROOT/verify/runner.py" "$@"
