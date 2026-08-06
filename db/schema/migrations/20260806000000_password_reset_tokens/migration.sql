BEGIN;

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT password_reset_tokens_token_hash_unique UNIQUE (token_hash),
    CONSTRAINT password_reset_tokens_expiry_check CHECK (
        expires_at > created_at
    ),
    CONSTRAINT password_reset_tokens_used_at_check CHECK (
        used_at IS NULL
        OR (used_at >= created_at AND used_at <= expires_at)
    )
);

CREATE INDEX password_reset_tokens_user_created_at_idx
    ON password_reset_tokens (user_id, created_at);

COMMIT;
