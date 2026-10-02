BEGIN;

DROP TABLE IF EXISTS user_devices;

CREATE TABLE web_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX web_push_subscriptions_token_unique
    ON web_push_subscriptions (token);
CREATE INDEX web_push_subscriptions_user_active_idx
    ON web_push_subscriptions (user_id, active);

COMMIT;
