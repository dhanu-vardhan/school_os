# Connection audit

## Tiers
| Tier | Status | Evidence |
|---|---|---|
| Database (Postgres RLS) | working | CrossTenantIsolationTest, RlsCatalogCheckTest |
| API (Spring Boot) | working | bootRun, actuator health |
| Auth (Keycloak JWT) | partial | config present, not tested E2E |
| BFF (web login) | missing | not implemented |
| Object storage (MinIO) | partial | compose only, no API integration |
| Background jobs | missing | none |
| Email/SMS/push | missing | none |
| Payments (sandbox) | missing | none |
| AI gateway | missing | ports only |
| Generated API client | missing | OpenAPI exists, no client |
| Operator back office | missing | none |
| Monitoring | partial | actuator only |
| Web client | mocked | role switcher, mock data |

## Mocks still active
- apps/web role switcher (preview only)
- Mock data in App.tsx (fictional schools/children)
- Preview mode banner

## Broken connections
- Web client does not call real API
- No BFF session/CSRF flow
- No Keycloak login flow tested
- Storage not wired to API
EOF
python3 -c "
p='/Users/anthapuvivekanandareddy/Desktop/SMS_SOF/docs/CONNECTION_AUDIT.md'
s=open(p).read()
lines=[ln for ln in s.splitlines() if ln.strip() not in ('EOF',) and not ln.startswith('python3')]
open(p,'w').write('\n'.join(lines)+'\n')
print('ok')
"