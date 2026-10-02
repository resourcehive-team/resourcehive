BEGIN;

-- Some deployed databases received a later, database-only migration that
-- restored the legacy approved_by column after reviewed_by had already been
-- introduced. Reconcile every known state while preserving reviewer data.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'organization_memberships'
          AND column_name = 'approved_by'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'organization_memberships'
          AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE organization_memberships
            RENAME COLUMN approved_by TO reviewed_by;
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'organization_memberships'
          AND column_name = 'approved_by'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'organization_memberships'
          AND column_name = 'reviewed_by'
    ) THEN
        UPDATE organization_memberships
        SET reviewed_by = COALESCE(reviewed_by, approved_by);

        ALTER TABLE organization_memberships
            DROP CONSTRAINT IF EXISTS organization_memberships_approved_by_fkey,
            DROP COLUMN approved_by;
    END IF;
END;
$$;

ALTER TABLE organization_memberships
    ADD COLUMN IF NOT EXISTS reviewed_by UUID,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_note TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'organization_memberships_approved_by_fkey'
          AND conrelid = 'organization_memberships'::regclass
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'organization_memberships_reviewed_by_fkey'
          AND conrelid = 'organization_memberships'::regclass
    ) THEN
        ALTER TABLE organization_memberships
            RENAME CONSTRAINT organization_memberships_approved_by_fkey
            TO organization_memberships_reviewed_by_fkey;
    ELSIF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'organization_memberships_approved_by_fkey'
          AND conrelid = 'organization_memberships'::regclass
    ) THEN
        ALTER TABLE organization_memberships
            DROP CONSTRAINT organization_memberships_approved_by_fkey;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'organization_memberships_reviewed_by_fkey'
          AND conrelid = 'organization_memberships'::regclass
    ) THEN
        ALTER TABLE organization_memberships
            ADD CONSTRAINT organization_memberships_reviewed_by_fkey
            FOREIGN KEY (reviewed_by) REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'organization_memberships_review_note_length_check'
          AND conrelid = 'organization_memberships'::regclass
    ) THEN
        ALTER TABLE organization_memberships
            ADD CONSTRAINT organization_memberships_review_note_length_check
            CHECK (review_note IS NULL OR char_length(review_note) <= 500);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS organization_memberships_organization_role_status_idx
    ON organization_memberships (organization_id, role, status);

COMMIT;
