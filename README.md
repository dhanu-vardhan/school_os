# SchoolOS

Multi-tenant school management SaaS for small private schools in Paris/Ile-de-France.

## Run locally

1. Start infra:
   docker compose -f infra/compose/docker-compose.yml up -d
2. Backend:
   export JAVA_HOME=/opt/homebrew/opt/openjdk@21
   cd services/api && ./gradlew bootRun
   API at http://localhost:8080
3. Frontend:
   pnpm install && pnpm --filter @schoolos/web dev
   Web at http://localhost:3000

## Tests
cd services/api && ./gradlew test
# school_os
