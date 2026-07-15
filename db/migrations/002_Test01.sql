-- ResourceHive: Cross-Tenant RLS Rejection Tests
-- IMPORTANT: Run this connected as app_user_role, NOT postgres.
-- The postgres role bypasses RLS as table owner, so testing under it
-- would give a false pass regardless of whether policies work.


-- Setup: two tenants, one user each

BEGIN;
SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
INSERT INTO tenant (tenant_id, name, tenant_type, institutional_email_domain)
VALUES ('11111111-1111-1111-1111-111111111111', 'Tenant A', 'department', 'a.edu')
ON CONFLICT DO NOTHING;
INSERT INTO app_user (tenant_id, full_name, email, password_hash)
VALUES ('11111111-1111-1111-1111-111111111111', 'Alice', 'alice@a.edu', 'x');
COMMIT;

BEGIN;
SET LOCAL app.current_tenant_id = '22222222-2222-2222-2222-222222222222';
INSERT INTO tenant (tenant_id, name, tenant_type, institutional_email_domain)
VALUES ('22222222-2222-2222-2222-222222222222', 'Tenant B', 'department', 'b.edu')
ON CONFLICT DO NOTHING;
INSERT INTO app_user (tenant_id, full_name, email, password_hash)
VALUES ('22222222-2222-2222-2222-222222222222', 'Bob', 'bob@b.edu', 'x');
COMMIT;


-- TEST 1: Tenant A session must see zero rows belonging to Tenant B
-- Expected result: should_be_zero = 0

BEGIN;
SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
SELECT count(*) AS should_be_zero
FROM app_user
WHERE tenant_id = '22222222-2222-2222-2222-222222222222';
COMMIT;


-- TEST 2: Tenant A session cannot INSERT a row claiming Tenant B's id
-- Expected result: ERROR - new row violates row-level security policy

BEGIN;
SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
INSERT INTO app_user (tenant_id, full_name, email, password_hash)
VALUES ('22222222-2222-2222-2222-222222222222', 'Mallory', 'mallory@b.edu', 'x');
ROLLBACK;


-- TEST 3: Tenant A session cannot UPDATE Tenant B's row, even by exact match
-- Expected result: UPDATE 0 (row exists but is invisible, not an error)

BEGIN;
SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE app_user SET full_name = 'Hacked' WHERE email = 'bob@b.edu';
ROLLBACK;