# verify-all

## Run
- `./scripts/verify-all.sh` (or `scripts/verify-all.ps1`, `make verify`) — runs checks, writes `reports/verify/<timestamp>/`.
- Flags: `--quick`, `--full` (default), `--group <G0..G14>`, `--env local|staging`, `--keep-up`, `--fail-fast`, `--no-browser`, `--report-dir <path>`.
- Refuses `--env prod|production` (exit 3). Uses synthetic data only.

## Reports
- `summary.md`, `summary.json`, `results.json`, `junit.xml`, `features.csv`, `history.csv` (trend).
- Status: **verified** only when an automated check exercised and passed; stubbed/planned/known-broken are warnings with reasons.

## Reading (owner)
- Green = pass, Yellow = warning (stubbed/known-broken/skipped), Red = fail. Look first: Overall, failed checks, missing-check features/coverage.

## Add a feature/check
1. Add entry to `verify/features.yaml` (id, module, name, roles, platform, checks, status, prompt_ref, reason if not working).
2. Implement check in `verify/runner.py` and tag covered feature IDs; update `covered_ids`.
3. Run `./scripts/verify-all.sh --group <name>` and ensure coverage failure clears.

## Current coverage (step 1)
- Implemented groups: G0 (preflight), G1 (infra/connectivity basics), G2 (DB/RLS core), G10 (screen smoke basics). G3-G9,G11-G14, full Playwright sweep, break-it selftests, CI gates pending.
- Registry: `verify/features.yaml` generated from `docs/TRACEABILITY.md` and `docs/SCREEN_INVENTORY.md` (122 features). Expected-working features must have checks; others reported as warnings.
