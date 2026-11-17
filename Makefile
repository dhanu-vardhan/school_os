.PHONY: up down build-web demo demo-reset test-e2e test-api verify smoke logs

COMPOSE = docker compose -f infra/compose/docker-compose.yml
JAVA_HOME = /opt/homebrew/opt/openjdk@21
WEB_URL = http://localhost:3000

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

build-web:
	pnpm --filter @schoolos/web build

# One command: build the web bundle, start the whole real stack, wait for the BFF,
# then open a styled app with a server-side seeded demo session available.
demo: build-web
	$(COMPOSE) up -d --build
	@echo "Waiting for BFF at $(WEB_URL)/healthz ..."
	@for i in $$(seq 1 90); do \
	  if curl -sf $(WEB_URL)/healthz >/dev/null 2>&1; then break; fi; \
	  sleep 2; \
	done
	@curl -sf $(WEB_URL)/healthz >/dev/null || { echo "BFF did not become healthy"; $(COMPOSE) ps; exit 1; }
	@./scripts/smoke.sh
	@echo "Demo ready: $(WEB_URL)  (no login required; the app boots from /config and /session)"
	@open $(WEB_URL) 2>/dev/null || true

demo-reset:
	@curl -s -X POST $(WEB_URL)/auth/logout >/dev/null || true
	@echo "Session cleared. Reload $(WEB_URL) and pick a role again."

smoke:
	@./scripts/smoke.sh

test-api:
	cd services/api && JAVA_HOME=$(JAVA_HOME) ./gradlew test

test-e2e: test-api
	cd services/bff && node --test test/*.test.js

verify:
	./scripts/verify-all.sh $(ARGS)

logs:
	$(COMPOSE) logs -f api bff
