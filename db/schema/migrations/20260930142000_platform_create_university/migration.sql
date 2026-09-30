BEGIN;

-- The identity service's auth role can read organizations globally, but may
-- create a university only for an active platform administrator.
DROP POLICY organizations_auth ON organizations;

CREATE POLICY organizations_auth_select
    ON organizations FOR SELECT TO resourcehive_auth
    USING (true);

CREATE POLICY organizations_auth_platform_insert
    ON organizations FOR INSERT TO resourcehive_auth
    WITH CHECK (
        parent_id IS NULL
        AND root_organization_id = id
        AND type = 'UNIVERSITY'
        AND status = 'ACTIVE'
        AND EXISTS (
            SELECT 1
            FROM users creator
            WHERE creator.id = created_by
              AND creator.status = 'ACTIVE'
              AND creator.platform_role = 'PLATFORM_ADMIN'
        )
    );

GRANT INSERT ON organizations TO resourcehive_auth;
GRANT SELECT, INSERT ON organization_membership_audits TO resourcehive_auth;

CREATE POLICY membership_audits_auth_platform_select
    ON organization_membership_audits FOR SELECT TO resourcehive_auth
    USING (
        EXISTS (
            SELECT 1
            FROM users actor
            WHERE actor.id = actor_user_id
              AND actor.status = 'ACTIVE'
              AND actor.platform_role = 'PLATFORM_ADMIN'
        )
    );

CREATE POLICY membership_audits_auth_platform_insert
    ON organization_membership_audits FOR INSERT TO resourcehive_auth
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM users actor
            WHERE actor.id = actor_user_id
              AND actor.status = 'ACTIVE'
              AND actor.platform_role = 'PLATFORM_ADMIN'
        )
    );

COMMIT;
