#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

fail() { echo "SMOKE FAIL: $*" >&2; exit 1; }

check_2xx() {
  local url="$1" code
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$url")"
  [[ "$code" =~ ^2[0-9][0-9]$ ]] || fail "$url returned $code"
  echo "OK   $url ($code)"
}

echo "== document and built assets =="
check_2xx "$BASE/"

ASSETS="$(curl -s "$BASE/" | grep -oE '/assets/[^"'"'"' )]+\.(js|css)' | sort -u || true)"
[[ -n "$ASSETS" ]] || fail "no JS/CSS assets referenced by the document"
while read -r asset; do
  [[ -n "$asset" ]] || continue
  check_2xx "$BASE$asset"
done <<< "$ASSETS"

echo "== public endpoints =="
check_2xx "$BASE/config"
check_2xx "$BASE/healthz"

echo "== demo session =="
code="$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -X POST \
  -H 'content-type: application/json' \
  -d '{"role":"director"}' "$BASE/demo/session")"
[[ "$code" =~ ^2[0-9][0-9]$ ]] || fail "/demo/session returned $code"
echo "OK   POST /demo/session ($code)"

check_2xx "$BASE/session"

CSRF="$(curl -s -b "$JAR" "$BASE/session" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).csrfToken||'')}catch{process.stdout.write('')}})")"
[[ -n "$CSRF" ]] || fail "no csrfToken in /session"

echo "== API through the BFF proxy =="
check_2xx "$BASE/api/actuator/health"

echo "== tenant database =="
PGPASSWORD=schoolos_app psql -h localhost -p 5432 -U schoolos_app -d schoolos -Atc \
  "SELECT tablename FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename WHERE schemaname='public' AND c.relrowsecurity AND c.relforcerowsecurity AND tablename IN ('school','student','membership')" \
  | grep -qx 'school' || fail "RLS missing on school"
echo "OK   forced RLS on core tenant tables"

echo "SMOKE PASS"
