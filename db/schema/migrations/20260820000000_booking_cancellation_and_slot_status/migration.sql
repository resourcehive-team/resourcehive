BEGIN;

ALTER TABLE resource_slots
    ADD COLUMN status TEXT NOT NULL DEFAULT 'PUBLISHED',
    ADD COLUMN withdrawn_at TIMESTAMPTZ;

ALTER TABLE resource_slots
    ADD CONSTRAINT resource_slots_status_check
        CHECK (status IN ('PUBLISHED', 'WITHDRAWN')),
    ADD CONSTRAINT resource_slots_withdrawal_check
        CHECK (
            (status = 'WITHDRAWN' AND withdrawn_at IS NOT NULL)
            OR
            (status = 'PUBLISHED' AND withdrawn_at IS NULL)
        );

ALTER TABLE bookings
    ADD COLUMN cancelled_by_user_id UUID REFERENCES users(id),
    ADD COLUMN cancellation_reason TEXT;

ALTER TABLE bookings
    ADD CONSTRAINT bookings_cancellation_reason_length_check
        CHECK (
            cancellation_reason IS NULL
            OR char_length(cancellation_reason) <= 500
        );

CREATE INDEX bookings_cancelled_by_user_id_idx
    ON bookings (cancelled_by_user_id);

COMMIT;
