-- Reapply the university-aware balance trigger for databases that ran an
-- earlier version of the university RLS migration. Negative ledger entries
-- must update an existing balance, never insert a negative starting balance.
CREATE OR REPLACE FUNCTION update_user_point_balance_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.root_organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.amount < 0 THEN
        UPDATE user_point_balances
        SET available_points = available_points + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id
          AND root_organization_id = NEW.root_organization_id
          AND available_points + NEW.amount >= 0;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'insufficient university point balance'
                USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
    END IF;

    INSERT INTO user_point_balances (user_id, root_organization_id, available_points, updated_at)
    VALUES (NEW.user_id, NEW.root_organization_id, NEW.amount, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, root_organization_id)
    DO UPDATE SET
        available_points = user_point_balances.available_points + EXCLUDED.available_points,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
