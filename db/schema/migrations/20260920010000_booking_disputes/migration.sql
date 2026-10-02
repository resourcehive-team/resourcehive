BEGIN;

CREATE TABLE booking_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id),
    root_organization_id UUID NOT NULL REFERENCES organizations(id),
    submitted_by_user_id UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL
        CHECK (reason IN ('NOT_RETURNED', 'DAMAGED', 'MISPLACED', 'OTHER')),
    description TEXT NOT NULL,
    evidence JSONB,
    status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
    resolution_notes TEXT,
    reviewed_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,

    CONSTRAINT booking_disputes_resolution_check CHECK (
        (status IN ('RESOLVED', 'REJECTED') AND resolved_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)
        OR
        (status IN ('OPEN', 'UNDER_REVIEW') AND resolved_at IS NULL)
    )
);

CREATE INDEX booking_disputes_root_status_idx
    ON booking_disputes (root_organization_id, status);

CREATE TABLE booking_dispute_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES booking_disputes(id),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    from_status TEXT,
    to_status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX booking_dispute_events_dispute_created_at_idx
    ON booking_dispute_events (dispute_id, created_at);

-- Links a resource to the dispute that made it unavailable (damaged / lost /
-- not returned), without introducing a new resource status value.
ALTER TABLE resources
    ADD COLUMN unavailable_dispute_id UUID UNIQUE
        REFERENCES booking_disputes(id);

COMMIT;
