DO $$
BEGIN
    IF to_regclass('notifications') IS NULL
        OR to_regclass('notification_deliveries') IS NULL
        OR to_regclass('web_push_subscriptions') IS NULL
        OR to_regclass('processed_events') IS NULL THEN
        RAISE EXCEPTION 'Expected simplified notification tables are missing';
    END IF;

    IF to_regclass('notification_delivery_attempts') IS NOT NULL
        OR to_regclass('outbox_events') IS NOT NULL
        OR to_regclass('provider_webhook_events') IS NOT NULL THEN
        RAISE EXCEPTION 'Removed notification tables must not be created';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notification_deliveries'
          AND column_name = 'body'
    ) THEN
        RAISE EXCEPTION 'notification_deliveries.body is required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'web_push_subscriptions'
          AND column_name = 'token'
    ) THEN
        RAISE EXCEPTION 'web_push_subscriptions.token is required';
    END IF;

    IF to_regclass('user_devices') IS NOT NULL THEN
        RAISE EXCEPTION 'mobile user_devices table must be removed';
    END IF;
END;
$$;
