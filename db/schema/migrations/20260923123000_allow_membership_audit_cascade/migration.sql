-- Keep audit rows immutable when their membership exists, while allowing the
-- existing membership ON DELETE CASCADE relationship to remove history with
-- the deleted membership.
CREATE OR REPLACE FUNCTION reject_membership_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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
