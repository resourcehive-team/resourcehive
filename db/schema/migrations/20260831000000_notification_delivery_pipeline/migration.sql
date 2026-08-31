BEGIN;

ALTER TABLE notifications
    ADD COLUMN data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN dedupe_key TEXT,
    ADD COLUMN source_event_id UUID,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX notifications_dedupe_key_unique
    ON notifications (dedupe_key);
CREATE INDEX notifications_user_created_at_idx
    ON notifications (user_id, created_at);
CREATE INDEX notifications_source_event_id_idx
    ON notifications (source_event_id);

CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id),
    channel TEXT NOT NULL,
    provider TEXT,
    destination TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at TIMESTAMPTZ,
    provider_message_id TEXT,
    last_error_code TEXT,
    last_error_message TEXT,
    lease_owner TEXT,
    lease_expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notification_deliveries_target_unique
        UNIQUE (notification_id, channel, destination)
);

CREATE INDEX notification_deliveries_due_idx
    ON notification_deliveries (status, next_attempt_at);
CREATE INDEX notification_deliveries_provider_message_idx
    ON notification_deliveries (provider, provider_message_id);

CREATE TABLE notification_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES notification_deliveries(id),
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    outcome TEXT NOT NULL,
    provider_response_code TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ,
    CONSTRAINT notification_delivery_attempts_number_unique
        UNIQUE (delivery_id, attempt_number)
);

CREATE INDEX notification_delivery_attempts_delivery_started_idx
    ON notification_delivery_attempts (delivery_id, started_at);

CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    installation_id TEXT NOT NULL,
    identifier_type TEXT NOT NULL DEFAULT 'FID',
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    app_version TEXT,
    last_registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ,
    invalidated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX user_devices_installation_id_unique
    ON user_devices (installation_id);
CREATE INDEX user_devices_user_status_idx
    ON user_devices (user_id, status);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    partition_key TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    producer TEXT NOT NULL,
    correlation_id UUID NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX outbox_events_publish_due_idx
    ON outbox_events (published_at, next_attempt_at);

CREATE TABLE processed_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    consumer_name TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT processed_events_event_consumer_unique
        UNIQUE (event_id, consumer_name)
);

CREATE INDEX processed_events_processed_at_idx
    ON processed_events (processed_at);

CREATE TABLE provider_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    provider_message_id TEXT,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT provider_webhook_events_provider_event_unique
        UNIQUE (provider, provider_event_id)
);

CREATE INDEX provider_webhook_events_message_idx
    ON provider_webhook_events (provider, provider_message_id);

COMMIT;
