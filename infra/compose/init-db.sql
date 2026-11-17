-- create runtime role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'schoolos_app') THEN
    CREATE ROLE schoolos_app LOGIN PASSWORD 'schoolos_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'schoolos_support') THEN
    CREATE ROLE schoolos_support LOGIN PASSWORD 'schoolos_support' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END$$;

GRANT USAGE ON SCHEMA public TO schoolos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO schoolos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO schoolos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO schoolos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO schoolos_app;

REVOKE CREATE ON SCHEMA public FROM schoolos_app;

-- audit_event append-only example: revoke update/delete later per table
