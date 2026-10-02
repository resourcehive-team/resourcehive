CREATE TABLE university_demo_seed_runs (
    seed_key TEXT PRIMARY KEY,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    summary JSONB NOT NULL
);

REVOKE ALL ON university_demo_seed_runs FROM PUBLIC;
REVOKE ALL ON university_demo_seed_runs FROM resourcehive_tenant,
    resourcehive_auth, resourcehive_worker, resourcehive_platform_report;
