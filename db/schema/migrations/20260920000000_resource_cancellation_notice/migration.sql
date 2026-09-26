BEGIN;

ALTER TABLE resources
    ADD COLUMN cancellation_notice_minutes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE resources
    ADD CONSTRAINT resources_cancellation_notice_minutes_check
        CHECK (cancellation_notice_minutes >= 0);

-- Snapshot of the resource's notice period at booking time, so a later
-- change to the resource does not retroactively affect existing bookings.
ALTER TABLE bookings
    ADD COLUMN cancellation_notice_minutes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE bookings
    ADD CONSTRAINT bookings_cancellation_notice_minutes_check
        CHECK (cancellation_notice_minutes >= 0);

COMMIT;
