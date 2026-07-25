BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email_verified_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    platform_role TEXT NOT NULL DEFAULT 'USER'
        CHECK (platform_role IN ('PLATFORM_ADMIN', 'USER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE FUNCTION normalize_email_value()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.email := LOWER(BTRIM(NEW.email));
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_normalize_email
    BEFORE INSERT OR UPDATE OF email ON users
    FOR EACH ROW
    EXECUTE FUNCTION normalize_email_value();

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    parent_id UUID,
    root_organization_id UUID NOT NULL,
    join_bonus_points INTEGER NOT NULL DEFAULT 0
        CHECK (join_bonus_points >= 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT organizations_root_shape_check CHECK (
        (parent_id IS NULL AND root_organization_id = id)
        OR
        (parent_id IS NOT NULL AND root_organization_id <> id)
    ),
    CONSTRAINT organizations_id_root_unique
        UNIQUE (id, root_organization_id),
    CONSTRAINT organizations_parent_same_root_fk
        FOREIGN KEY (parent_id, root_organization_id)
        REFERENCES organizations(id, root_organization_id),
    CONSTRAINT organizations_root_fk
        FOREIGN KEY (root_organization_id)
        REFERENCES organizations(id)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX organizations_parent_id_idx
    ON organizations (parent_id);

CREATE INDEX organizations_root_organization_id_idx
    ON organizations (root_organization_id);

CREATE FUNCTION reject_organization_hierarchy_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    creates_cycle BOOLEAN;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'an organization cannot be its own parent';
    END IF;

    WITH RECURSIVE descendants(id) AS (
        SELECT id
        FROM organizations
        WHERE parent_id = NEW.id

        UNION

        SELECT organization.id
        FROM organizations AS organization
        INNER JOIN descendants
            ON organization.parent_id = descendants.id
    )
    SELECT EXISTS (
        SELECT 1
        FROM descendants
        WHERE id = NEW.parent_id
    )
    INTO creates_cycle;

    IF creates_cycle THEN
        RAISE EXCEPTION 'organization hierarchy cannot contain a cycle';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_prevent_hierarchy_cycle
    BEFORE INSERT OR UPDATE OF parent_id, root_organization_id ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION reject_organization_hierarchy_cycle();

CREATE TABLE organization_email_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    domain TEXT NOT NULL,
    auto_join BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT organization_email_domains_domain_unique UNIQUE (domain)
);

CREATE INDEX organization_email_domains_organization_id_idx
    ON organization_email_domains (organization_id);

CREATE FUNCTION normalize_and_validate_root_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.domain := LOWER(BTRIM(NEW.domain));

    IF NOT EXISTS (
        SELECT 1
        FROM organizations
        WHERE id = NEW.organization_id
          AND root_organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'email domains must belong to root organizations';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER organization_email_domains_normalize_and_validate
    BEFORE INSERT OR UPDATE OF organization_id, domain
    ON organization_email_domains
    FOR EACH ROW
    EXECUTE FUNCTION normalize_and_validate_root_email_domain();

CREATE TABLE organization_email_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email TEXT NOT NULL,
    added_by UUID NOT NULL REFERENCES users(id),
    used_at TIMESTAMPTZ,

    CONSTRAINT organization_email_allowlist_org_email_unique
        UNIQUE (organization_id, email)
);

CREATE INDEX organization_email_allowlist_email_idx
    ON organization_email_allowlist (email);

CREATE TRIGGER organization_email_allowlist_normalize_email
    BEFORE INSERT OR UPDATE OF email ON organization_email_allowlist
    FOR EACH ROW
    EXECUTE FUNCTION normalize_email_value();

CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role TEXT NOT NULL DEFAULT 'MEMBER'
        CHECK (role IN ('ADMIN', 'MEMBER')),
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id),

    CONSTRAINT organization_memberships_user_org_unique
        UNIQUE (user_id, organization_id)
);

CREATE INDEX organization_memberships_organization_status_idx
    ON organization_memberships (organization_id, status);

CREATE INDEX organization_memberships_user_status_idx
    ON organization_memberships (user_id, status);

CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_organization_id UUID NOT NULL,
    root_organization_id UUID NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    point_cost INTEGER NOT NULL DEFAULT 0
        CHECK (point_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT resources_id_root_unique
        UNIQUE (id, root_organization_id),
    CONSTRAINT resources_owner_same_root_fk
        FOREIGN KEY (owner_organization_id, root_organization_id)
        REFERENCES organizations(id, root_organization_id)
);

CREATE INDEX resources_owner_status_idx
    ON resources (owner_organization_id, status);

CREATE INDEX resources_root_organization_id_idx
    ON resources (root_organization_id);

CREATE TABLE resource_allowed_organizations (
    resource_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    root_organization_id UUID NOT NULL,

    PRIMARY KEY (resource_id, organization_id),
    CONSTRAINT resource_allowed_organizations_resource_same_root_fk
        FOREIGN KEY (resource_id, root_organization_id)
        REFERENCES resources(id, root_organization_id),
    CONSTRAINT resource_allowed_organizations_org_same_root_fk
        FOREIGN KEY (organization_id, root_organization_id)
        REFERENCES organizations(id, root_organization_id)
);

CREATE INDEX resource_allowed_organizations_organization_id_idx
    ON resource_allowed_organizations (organization_id);

CREATE TABLE resource_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT resource_slots_time_check
        CHECK (ends_at > starts_at)
);

ALTER TABLE resource_slots
ADD CONSTRAINT resource_slots_no_overlap
EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
);

CREATE INDEX resource_slots_resource_start_idx
    ON resource_slots (resource_id, starts_at);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_slot_id UUID NOT NULL REFERENCES resource_slots(id),
    user_id UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'CONFIRMED'
        CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    CONSTRAINT bookings_cancellation_check CHECK (
        (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
        OR
        (status <> 'CANCELLED' AND cancelled_at IS NULL)
    ),
    CONSTRAINT bookings_completion_check CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL)
        OR
        (status <> 'COMPLETED' AND completed_at IS NULL)
    ),
    CONSTRAINT bookings_cancelled_at_order_check
        CHECK (cancelled_at IS NULL OR cancelled_at >= created_at),
    CONSTRAINT bookings_completed_at_order_check
        CHECK (completed_at IS NULL OR completed_at >= created_at),
    CONSTRAINT bookings_id_user_unique
        UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX bookings_active_slot_unique
    ON bookings (resource_slot_id)
    WHERE status IN ('CONFIRMED', 'COMPLETED');

CREATE INDEX bookings_user_status_idx
    ON bookings (user_id, status);

CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL CHECK (amount <> 0),
    transaction_type TEXT NOT NULL
        CHECK (transaction_type IN ('JOIN_BONUS', 'BOOKING', 'BOOKING_REFUND')),
    source_organization_id UUID REFERENCES organizations(id),
    booking_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT point_transactions_booking_user_fk
        FOREIGN KEY (booking_id, user_id)
        REFERENCES bookings(id, user_id),
    CONSTRAINT point_transactions_source_check CHECK (
        (
            transaction_type = 'JOIN_BONUS'
            AND amount > 0
            AND source_organization_id IS NOT NULL
            AND booking_id IS NULL
        )
        OR
        (
            transaction_type = 'BOOKING'
            AND amount < 0
            AND booking_id IS NOT NULL
            AND source_organization_id IS NULL
        )
        OR
        (
            transaction_type = 'BOOKING_REFUND'
            AND amount > 0
            AND booking_id IS NOT NULL
            AND source_organization_id IS NULL
        )
    )
);

CREATE UNIQUE INDEX point_transactions_join_bonus_unique
    ON point_transactions (user_id, source_organization_id)
    WHERE transaction_type = 'JOIN_BONUS';

CREATE UNIQUE INDEX point_transactions_booking_unique
    ON point_transactions (booking_id)
    WHERE transaction_type = 'BOOKING';

CREATE UNIQUE INDEX point_transactions_booking_refund_unique
    ON point_transactions (booking_id)
    WHERE transaction_type = 'BOOKING_REFUND';

CREATE INDEX point_transactions_user_created_at_idx
    ON point_transactions (user_id, created_at);

COMMENT ON COLUMN point_transactions.transaction_type IS
    'Cancelled booking refunds are positive BOOKING_REFUND entries for the same user and booking.';

CREATE FUNCTION reject_point_transaction_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'point transactions are append-only';
END;
$$;

CREATE TRIGGER point_transactions_append_only
    BEFORE UPDATE OR DELETE ON point_transactions
    FOR EACH ROW
    EXECUTE FUNCTION reject_point_transaction_mutation();

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT email_verification_tokens_expiry_check
        CHECK (expires_at > created_at),
    CONSTRAINT email_verification_tokens_used_at_check
        CHECK (
            used_at IS NULL
            OR (used_at >= created_at AND used_at <= expires_at)
        )
);

CREATE INDEX email_verification_tokens_user_id_idx
    ON email_verification_tokens (user_id);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX notifications_user_unread_idx
    ON notifications (user_id, created_at)
    WHERE read_at IS NULL;

COMMIT;
