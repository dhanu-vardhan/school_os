# Integration status

## Health run
- Backend build: PASS (./gradlew test)
- Frontend build: PASS (pnpm build)
- RLS catalog check: PASS (RlsCatalogCheckTest)
- Cross-tenant test: PASS (CrossTenantIsolationTest)
- Cross-tenant suite coverage: partial (Student only)
- Dependency/container scans: not run
- E2E (Playwright): not built

## Broken/partial/mocked (ranked by journey blockers)
1. BFF missing (blocks all web login) - L
2. Keycloak E2E untested (blocks auth) - M
3. Web client uses mock data (blocks all journeys) - L
4. Object storage not wired (blocks files/photos) - L
5. Jobs/queue missing (blocks notifications/billing) - L
6. Email/SMS/push missing (blocks notifications) - L
7. Payments missing (blocks billing) - L
8. AI gateway missing (blocks AI features) - L
9. Generated API client missing (blocks contract tests) - M
10. Operator back office missing - L
11. Observability partial - M

## Mocks list
- Role switcher (preview only, guarded by build flag not yet implemented)
- Fictional data in App.tsx
- Preview mode banner
EOF
python3 -c "
p='/Users/anthapuvivekanandareddy/Desktop/SMS_SOF/docs/INTEGRATION_STATUS.md'
s=open(p).read()
lines=[ln for ln in s.splitlines() if ln.strip() not in ('EOF',) and not ln.startswith('python3')]
open(p,'w').write('\n'.join(lines)+'\n')
print('ok')
"