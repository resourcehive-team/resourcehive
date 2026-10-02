BEGIN;

-- Membership review metadata was previously stored under the approval-specific
-- name approved_by. A reviewer is also recorded for rejected decisions.
ALTER TABLE organization_memberships
    RENAME COLUMN approved_by TO reviewed_by;

ALTER TABLE organization_memberships
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN review_note TEXT,
    ADD CONSTRAINT organization_memberships_review_note_length_check
        CHECK (review_note IS NULL OR char_length(review_note) <= 500);

CREATE INDEX organization_memberships_organization_role_status_idx
    ON organization_memberships (organization_id, role, status);

-- A platform administrator is a ResourceHive operator, not an organization
-- member. Remove the legacy demo membership before installing the invariant.
DELETE FROM organization_memberships membership
USING users platform_user
WHERE membership.user_id = platform_user.id
  AND platform_user.platform_role = 'PLATFORM_ADMIN';

CREATE FUNCTION reject_platform_admin_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        WHERE id = NEW.user_id
          AND platform_role = 'PLATFORM_ADMIN'
    ) THEN
        RAISE EXCEPTION 'platform administrators cannot have organization memberships';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER organization_memberships_reject_platform_admin
    BEFORE INSERT OR UPDATE OF user_id, organization_id, role, status
    ON organization_memberships
    FOR EACH ROW
    EXECUTE FUNCTION reject_platform_admin_membership();

CREATE FUNCTION reject_platform_admin_promotion_with_memberships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.platform_role = 'PLATFORM_ADMIN'
       AND OLD.platform_role <> 'PLATFORM_ADMIN'
       AND EXISTS (
           SELECT 1
           FROM organization_memberships
           WHERE user_id = NEW.id
       ) THEN
        RAISE EXCEPTION 'remove organization memberships before promoting a user to platform administrator';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_reject_platform_admin_promotion_with_memberships
    BEFORE UPDATE OF platform_role
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION reject_platform_admin_promotion_with_memberships();

CREATE TABLE organization_membership_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL
        REFERENCES organization_memberships(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL
        CHECK (action IN ('APPROVED', 'REJECTED', 'ADMIN_GRANTED', 'ADMIN_REVOKED')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT organization_membership_audits_note_length_check
        CHECK (note IS NULL OR char_length(note) <= 500)
);

CREATE INDEX organization_membership_audits_membership_created_idx
    ON organization_membership_audits (membership_id, created_at);

CREATE INDEX organization_membership_audits_actor_created_idx
    ON organization_membership_audits (actor_user_id, created_at);

CREATE FUNCTION reject_membership_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- A membership delete cascades its audit history. Direct mutations of an
    -- audit row are rejected while the parent membership still exists.
    IF EXISTS (
        SELECT 1
        FROM organization_memberships
        WHERE id = OLD.membership_id
    ) THEN
        RAISE EXCEPTION 'membership audit events are append-only';
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER organization_membership_audits_append_only
    BEFORE UPDATE OR DELETE
    ON organization_membership_audits
    FOR EACH ROW
    EXECUTE FUNCTION reject_membership_audit_mutation();

COMMIT;
