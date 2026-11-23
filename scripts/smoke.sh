#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
ORIGIN="${ORIGIN:-$BASE}"
JAR="$(mktemp)"
BODY="$(mktemp)"
trap 'rm -f "$JAR" "$BODY"' EXIT

fail() { echo "SMOKE FAIL: $*" >&2; exit 1; }

check_2xx() {
  local url="$1" code
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$url")"
  [[ "$code" =~ ^2[0-9][0-9]$ ]] || fail "$url returned $code"
  echo "OK   $url ($code)"
}

post_json() {
  local url="$1" payload="$2" code
  code="$(curl -s -o "$BODY" -w '%{http_code}' -b "$JAR" -c "$JAR" \
    -H "Origin: $ORIGIN" -H 'content-type: application/json' -d "$payload" "$url")"
  [[ "$code" =~ ^2[0-9][0-9]$ ]] || fail "$url returned $code: $(cat "$BODY")"
  echo "$code"
}

json_field() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s)[process.argv[1]]||""))}catch{process.stdout.write("")}})' "$1"
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
# Demo credentials are generated on first boot and exposed only by /demo/accounts.
ACCOUNTS="$(curl -sf "$BASE/demo/accounts")" || fail "/demo/accounts unavailable"
CREDENTIALS="$(printf '%s' "$ACCOUNTS" | node -e '
  let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
    const accounts=JSON.parse(s).accounts||[];
    const a=accounts.find(x=>x.key==="director")||accounts[0];
    if(!a) process.exit(1);
    process.stdout.write([a.key,a.demoPassword,a.mfa?"1":"0"].join("\t"));
  })')" || fail "no demo accounts available"
IFS=$'\t' read -r KEY PASSWORD MFA <<< "$CREDENTIALS"

PAYLOAD="$(node -e 'process.stdout.write(JSON.stringify({key:process.argv[1],password:process.argv[2]}))' "$KEY" "$PASSWORD")"
code="$(post_json "$BASE/demo/session" "$PAYLOAD")"
if [[ "$(json_field mfaRequired < "$BODY")" == "true" ]]; then
  CHALLENGE="$(json_field challengeId < "$BODY")"
  [[ -n "$CHALLENGE" ]] || fail "no challengeId in MFA response"
  TOTP="$(curl -sf "$BASE/demo/totp?key=$KEY" | json_field code)"
  [[ -n "$TOTP" ]] || fail "no demo TOTP code"
  PAYLOAD="$(node -e 'process.stdout.write(JSON.stringify({challengeId:process.argv[1],code:process.argv[2]}))' "$CHALLENGE" "$TOTP")"
  code="$(post_json "$BASE/demo/session/verify" "$PAYLOAD")"
fi
echo "OK   POST /demo/session ($code)"

check_2xx "$BASE/session"
CSRF="$(curl -s -b "$JAR" "$BASE/session" | json_field csrfToken)"
[[ -n "$CSRF" ]] || fail "no csrfToken in /session"

echo "== API through the BFF proxy =="
check_2xx "$BASE/api/v1/schools"

echo "== tenant database =="
PGPASSWORD=schoolos_app psql -h localhost -p 5432 -U schoolos_app -d schoolos -Atc \
  "SELECT tablename FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename WHERE schemaname='public' AND c.relrowsecurity AND c.relforcerowsecurity AND tablename IN ('school','student','membership')" \
  | grep -qx 'school' || fail "RLS missing on school"
echo "OK   forced RLS on core tenant tables"

echo "SMOKE PASS"
