BEGIN;

-- Resource cancellation policy and the value preserved at booking time.
ALTER TABLE resources
ADD COLUMN cancellation_period_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (cancellation_period_minutes >= 0);

ALTER TABLE bookings
ADD COLUMN cancellation_period_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (cancellation_period_minutes >= 0),
ADD COLUMN cancelled_by_user_id UUID REFERENCES users(id),
ADD COLUMN cancellation_reason TEXT;

CREATE FUNCTION set_booking_cancellation_period()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT resources.cancellation_period_minutes
    INTO NEW.cancellation_period_minutes
    FROM resource_slots
    JOIN resources ON resources.id = resource_slots.resource_id
    WHERE resource_slots.id = NEW.resource_slot_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_set_cancellation_period
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_cancellation_period();

-- Semester-wise point allocations.
CREATE TABLE semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_organization_id UUID NOT NULL REFERENCES organizations(id),
    academic_year TEXT NOT NULL,
    semester TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT semesters_time_check CHECK (ends_at > starts_at),
    CONSTRAINT semesters_root_period_unique
        UNIQUE (root_organization_id, academic_year, semester)
);

CREATE INDEX semesters_root_dates_idx
    ON semesters (root_organization_id, starts_at, ends_at);

CREATE FUNCTION validate_semester_root()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organizations
        WHERE id = NEW.root_organization_id
          AND root_organization_id = NEW.root_organization_id
    ) THEN
        RAISE EXCEPTION 'semester must belong to a root organization';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER semesters_validate_root
    BEFORE INSERT OR UPDATE OF root_organization_id ON semesters
    FOR EACH ROW
    EXECUTE FUNCTION validate_semester_root();

ALTER TABLE point_transactions
ADD COLUMN semester_id UUID REFERENCES semesters(id),
ADD COLUMN initiated_by_user_id UUID REFERENCES users(id);

ALTER TABLE point_transactions
DROP CONSTRAINT point_transactions_transaction_type_check,
DROP CONSTRAINT point_transactions_source_check;

ALTER TABLE point_transactions
ADD CONSTRAINT point_transactions_transaction_type_check CHECK (
    transaction_type IN (
        'JOIN_BONUS', 'SEMESTER_ALLOCATION', 'BOOKING', 'BOOKING_REFUND'
    )
),
ADD CONSTRAINT point_transactions_source_check CHECK (
    (
        transaction_type = 'JOIN_BONUS'
        AND amount > 0
        AND source_organization_id IS NOT NULL
        AND booking_id IS NULL
        AND semester_id IS NULL
        AND initiated_by_user_id IS NULL
    )
    OR
    (
        transaction_type = 'SEMESTER_ALLOCATION'
        AND amount > 0
        AND source_organization_id IS NOT NULL
        AND booking_id IS NULL
        AND semester_id IS NOT NULL
        AND initiated_by_user_id IS NOT NULL
    )
    OR
    (
        transaction_type = 'BOOKING'
        AND amount < 0
        AND source_organization_id IS NULL
        AND booking_id IS NOT NULL
        AND semester_id IS NULL
        AND initiated_by_user_id IS NULL
    )
    OR
    (
        transaction_type = 'BOOKING_REFUND'
        AND amount > 0
        AND source_organization_id IS NULL
        AND booking_id IS NOT NULL
        AND semester_id IS NULL
        AND initiated_by_user_id IS NULL
    )
);

CREATE UNIQUE INDEX point_transactions_semester_allocation_unique
    ON point_transactions (user_id, source_organization_id, semester_id)
    WHERE transaction_type = 'SEMESTER_ALLOCATION';

CREATE FUNCTION validate_semester_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.transaction_type = 'SEMESTER_ALLOCATION' AND NOT EXISTS (
        SELECT 1
        FROM semesters
        JOIN organizations AS source_organization
          ON source_organization.id = NEW.source_organization_id
         AND source_organization.root_organization_id = semesters.root_organization_id
        JOIN organization_memberships AS membership
          ON membership.user_id = NEW.user_id
         AND membership.status = 'APPROVED'
        JOIN organizations AS membership_organization
          ON membership_organization.id = membership.organization_id
         AND membership_organization.root_organization_id = semesters.root_organization_id
        WHERE semesters.id = NEW.semester_id
    ) THEN
        RAISE EXCEPTION 'invalid semester allocation tenant or membership';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER point_transactions_validate_semester_allocation
    BEFORE INSERT ON point_transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_semester_allocation();

-- Resource ratings. Booking ownership, completion, resource, and tenant matching
-- are validated together because they span several tables.
CREATE TABLE resource_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id),
    booking_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT resource_ratings_booking_unique UNIQUE (booking_id),
    CONSTRAINT resource_ratings_booking_user_fk
        FOREIGN KEY (booking_id, user_id) REFERENCES bookings(id, user_id)
);

CREATE INDEX resource_ratings_resource_created_at_idx
    ON resource_ratings (resource_id, created_at);

CREATE FUNCTION validate_resource_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM bookings
        JOIN resource_slots ON resource_slots.id = bookings.resource_slot_id
        WHERE bookings.id = NEW.booking_id
          AND bookings.user_id = NEW.user_id
          AND bookings.status = 'COMPLETED'
          AND resource_slots.resource_id = NEW.resource_id
    ) THEN
        RAISE EXCEPTION 'rating must match the user resource and completed booking';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER resource_ratings_validate_booking
    BEFORE INSERT OR UPDATE OF resource_id, booking_id, user_id
    ON resource_ratings
    FOR EACH ROW
    EXECUTE FUNCTION validate_resource_rating();

-- Current dispute state and its append-only workflow history.
CREATE TABLE booking_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    submitted_by_user_id UUID NOT NULL REFERENCES users(id),
    root_organization_id UUID NOT NULL REFERENCES organizations(id),
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
    reviewed_by_user_id UUID REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT booking_disputes_booking_unique UNIQUE (booking_id),
    CONSTRAINT booking_disputes_resolution_check CHECK (
        (status IN ('RESOLVED', 'REJECTED')
            AND reviewed_by_user_id IS NOT NULL
            AND resolution_notes IS NOT NULL
            AND resolved_at IS NOT NULL)
        OR
        (status IN ('OPEN', 'UNDER_REVIEW') AND resolved_at IS NULL)
    )
);

CREATE INDEX booking_disputes_root_status_idx
    ON booking_disputes (root_organization_id, status, created_at);

CREATE TABLE booking_dispute_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_dispute_id UUID NOT NULL REFERENCES booking_disputes(id),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'OPENED', 'UNDER_REVIEW', 'EVIDENCE_ADDED',
            'NOTE_ADDED', 'RESOLVED', 'REJECTED'
        )
    ),
    notes TEXT,
    evidence JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX booking_dispute_events_dispute_created_at_idx
    ON booking_dispute_events (booking_dispute_id, created_at);

CREATE FUNCTION reject_booking_dispute_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'booking dispute events are append-only';
END;
$$;

CREATE TRIGGER booking_dispute_events_append_only
    BEFORE UPDATE OR DELETE ON booking_dispute_events
    FOR EACH ROW
    EXECUTE FUNCTION reject_booking_dispute_event_mutation();

-- OAuth account linking, password reset, and refresh-token rotation.
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT oauth_accounts_provider_user_unique
        UNIQUE (provider, provider_user_id),
    CONSTRAINT oauth_accounts_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX oauth_accounts_user_id_idx ON oauth_accounts (user_id);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT password_reset_tokens_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT password_reset_tokens_used_at_check CHECK (
        used_at IS NULL OR (used_at >= created_at AND used_at <= expires_at)
    )
);

CREATE INDEX password_reset_tokens_user_id_idx
    ON password_reset_tokens (user_id);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    token_family_id UUID NOT NULL,
    replaced_by_token_id UUID REFERENCES refresh_tokens(id),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT refresh_tokens_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT refresh_tokens_revoked_at_check
        CHECK (revoked_at IS NULL OR revoked_at >= created_at),
    CONSTRAINT refresh_tokens_rotation_check
        CHECK (replaced_by_token_id IS NULL OR revoked_at IS NOT NULL)
);

CREATE INDEX refresh_tokens_user_active_idx
    ON refresh_tokens (user_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE INDEX refresh_tokens_family_idx
    ON refresh_tokens (token_family_id, created_at);

COMMENT ON TABLE refresh_tokens IS
    'PostgreSQL is authoritative; active or revoked token state may also be cached in Redis.';

-- Analytics are derived from authoritative records. These indexes support
-- tenant-, organization-, and date-filtered reporting without cached tables.
CREATE INDEX bookings_created_at_idx ON bookings (created_at);
CREATE INDEX point_transactions_type_created_at_idx
    ON point_transactions (transaction_type, created_at);
CREATE INDEX organization_memberships_joined_at_idx
    ON organization_memberships (joined_at);

COMMIT;
