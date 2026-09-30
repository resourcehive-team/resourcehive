\set ON_ERROR_STOP on

CREATE ROLE resourcehive_app_login LOGIN PASSWORD 'ci-password' NOBYPASSRLS;
CREATE ROLE resourcehive_auth_login LOGIN PASSWORD 'ci-password' NOBYPASSRLS;
CREATE ROLE resourcehive_worker_login LOGIN PASSWORD 'ci-password' NOBYPASSRLS;
CREATE ROLE resourcehive_platform_login LOGIN PASSWORD 'ci-password' NOBYPASSRLS;

GRANT resourcehive_tenant TO resourcehive_app_login;
GRANT resourcehive_auth TO resourcehive_auth_login;
GRANT resourcehive_worker TO resourcehive_worker_login;
GRANT resourcehive_platform_report TO resourcehive_platform_login;
