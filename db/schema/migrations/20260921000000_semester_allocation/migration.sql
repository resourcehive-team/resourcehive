ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_transaction_type_check;
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_source_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_source_check CHECK (
    (
        transaction_type IN ('JOIN_BONUS', 'SEMESTER_ALLOCATION')
        AND amount > 0
        AND source_organization_id IS NOT NULL
        AND booking_id IS NULL
    )
    OR
    (
        transaction_type = 'BOOKING'
        AND amount < 0
        AND booking_id IS NOT NULL
    )
    OR
    (
        transaction_type = 'BOOKING_REFUND'
        AND amount > 0
        AND booking_id IS NOT NULL
    )
);
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_transaction_type_check CHECK (transaction_type IN ('JOIN_BONUS', 'BOOKING', 'BOOKING_REFUND', 'SEMESTER_ALLOCATION'));
