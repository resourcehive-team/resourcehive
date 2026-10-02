BEGIN;

ALTER TABLE booking_disputes DROP CONSTRAINT booking_disputes_reason_check;

-- Remap the old provider-facing vocabulary to the new consumer-facing one
-- (best effort; disputes are only ever opened by the consumer of a booking).
UPDATE booking_disputes SET reason = 'BROKEN' WHERE reason = 'DAMAGED';
UPDATE booking_disputes SET reason = 'UNAVAILABLE' WHERE reason = 'MISPLACED';
UPDATE booking_disputes SET reason = 'OTHER' WHERE reason = 'NOT_RETURNED';

ALTER TABLE booking_disputes
    ADD CONSTRAINT booking_disputes_reason_check
        CHECK (reason IN ('UNAVAILABLE', 'BROKEN', 'NOT_AS_DESCRIBED', 'OTHER'));

COMMIT;
