CREATE OR REPLACE FUNCTION update_user_point_balance_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE user_point_balances
    SET
        available_points = available_points + NEW.amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;

    IF NOT FOUND THEN
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
    END IF;

    RETURN NEW;
END;
$$;
