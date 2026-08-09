BEGIN;

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    family_id UUID NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash),
    CONSTRAINT refresh_tokens_expiry_check CHECK (
        expires_at > created_at
    ),
    CONSTRAINT refresh_tokens_used_at_check CHECK (
        used_at IS NULL
        OR (used_at >= created_at AND used_at <= expires_at)
    ),
    CONSTRAINT refresh_tokens_revoked_at_check CHECK (
        revoked_at IS NULL OR revoked_at >= created_at
    )
);

CREATE INDEX refresh_tokens_user_created_at_idx
    ON refresh_tokens (user_id, created_at);

CREATE INDEX refresh_tokens_family_id_idx
    ON refresh_tokens (family_id);

COMMIT;
