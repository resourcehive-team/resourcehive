BEGIN;

ALTER TABLE notifications
    ADD COLUMN data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX notifications_user_created_at_idx
    ON notifications (user_id, created_at);

CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    notification_id UUID REFERENCES notifications(id),
    channel TEXT NOT NULL CHECK (channel IN ('EMAIL', 'PUSH')),
    destination TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'PROCESSING', 'RETRY_SCHEDULED', 'SENT', 'FAILED')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at TIMESTAMPTZ,
    provider_message_id TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX notification_deliveries_due_idx
    ON notification_deliveries (status, next_attempt_at);
CREATE INDEX notification_deliveries_user_created_at_idx
    ON notification_deliveries (user_id, created_at);

CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ANDROID', 'IOS')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX user_devices_token_unique ON user_devices (token);
CREATE INDEX user_devices_user_active_idx ON user_devices (user_id, active);

CREATE TABLE processed_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    consumer_name TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT processed_events_event_consumer_unique
        UNIQUE (event_id, consumer_name)
);

COMMIT;
