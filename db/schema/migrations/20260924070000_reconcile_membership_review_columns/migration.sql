BEGIN;

-- A database-only migration deployed after the membership review work restored
-- the legacy approved_by column. Reconcile either possible database state with
-- the Prisma schema without fabricating review timestamps or notes.
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
