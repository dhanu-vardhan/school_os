# Integration map

Tiers: browser -> CDN/static -> BFF -> API -> PostgreSQL (RLS) -> object storage -> jobs -> Keycloak (school + operator realms) -> email -> SMS -> push -> payments (subscriptions + connected accounts) -> inference gateway + vector store -> observability -> platform back office.

## Connections
| Connection | Protocol | Auth | Initiator | Config source | Health check | Failure behaviour | Status |
|---|---|---|---|---|---|---|---|
| Browser->CDN | HTTPS | none | browser | Vite build | HTTP 200 | CDN fallback | partial |
| Browser->BFF | HTTPS cookies | session | browser | Spring Boot | /actuator/health | 401 | missing (no BFF) |
| BFF->Keycloak | OIDC | client secret | BFF | application.yml | realm import | login fail | partial |
| BFF->API | HTTP | JWT | BFF | application.yml | actuator | 502 | missing (no BFF) |
| API->PostgreSQL | JDBC | app role | API | datasource | connection pool | fail closed | working |
| API->Object storage | S3 SDK | keys | API | config | bucket check | 500 | missing |
| API->Jobs | in-process | n/a | API | config | queue depth | retry/DLQ | missing |
| API->Email | SMTP/API | key | API | config | provider ping | retry | missing |
| API->SMS | API | key | API | config | provider ping | retry | missing |
| API->Push | FCM/APNs/WebPush | key | API | config | provider ping | retry | missing |
| API->Payments (subs) | HTTPS | key | API | config | sandbox | webhook retry | missing |
| API->Payments (connected) | HTTPS | key | API | config | sandbox | webhook retry | missing |
| API->Inference gateway | HTTPS | signed ctx | API | config | health | fallback non-AI | missing |
| API->Vector store | SQL/pgvector | app role | API | config | query | fail closed | missing (no pgvector) |
| Observability | OTLP | none | API | config | collector | drop | partial (actuator) |
| Platform back office | HTTPS | operator JWT | browser | config | health | 403 | missing |

## Mocks still active
- apps/web role switcher (preview only)
- Mock data in App.tsx (fictional schools/children)
- Preview mode banner
- No real API calls from web client
EOF
python3 -c "
p='/Users/anthapuvivekanandareddy/Desktop/SMS_SOF/docs/INTEGRATION_MAP.md'
s=open(p).read()
lines=[ln for ln in s.splitlines() if ln.strip() not in ('EOF',) and not ln.startswith('python3')]
open(p,'w').write('\n'.join(lines)+'\n')
print('ok')
"