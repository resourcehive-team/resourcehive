BEGIN;

LOCK TABLE point_transactions IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE user_point_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    available_points INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_point_balances_available_points_check
        CHECK (available_points >= 0)
);

INSERT INTO user_point_balances (
    user_id,
    available_points,
    updated_at
)
SELECT
    user_id,
    SUM(amount)::INTEGER,
    MAX(created_at)
FROM point_transactions
GROUP BY user_id;

CREATE FUNCTION update_user_point_balance_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user_point_balances (
        user_id,
        available_points,
        updated_at
    )
    VALUES (
        NEW.user_id,
        NEW.amount,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        available_points =
            user_point_balances.available_points + EXCLUDED.available_points,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$;

CREATE TRIGGER point_transactions_update_user_balance
    AFTER INSERT ON point_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_point_balance_from_transaction();

COMMIT;
