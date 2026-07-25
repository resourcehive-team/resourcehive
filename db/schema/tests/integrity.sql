\set ON_ERROR_STOP on

BEGIN;

CREATE FUNCTION pg_temp.expect_error(test_name TEXT, statement TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    BEGIN
        EXECUTE statement;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN;
    END;

    RAISE EXCEPTION 'expected database rejection: %', test_name;
END;
$$;

INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    platform_role
)
VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        'ADMIN@EXAMPLE.EDU',
        'hash',
        'Platform',
        'Admin',
        'PLATFORM_ADMIN'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'MEMBER@EXAMPLE.EDU',
        'hash',
        'Example',
        'Member',
        'USER'
    );

DO $$
BEGIN
    IF (
        SELECT email <> 'admin@example.edu'
        FROM users
        WHERE id = '10000000-0000-0000-0000-000000000001'
    ) THEN
        RAISE EXCEPTION 'user email was not normalized';
    END IF;
END;
$$;

SELECT pg_temp.expect_error(
    'case-insensitive duplicate user email',
    $statement$
        INSERT INTO users (
            email,
            password_hash,
            first_name,
            last_name
        )
        VALUES (
            'Admin@Example.Edu',
            'hash',
            'Duplicate',
            'User'
        )
    $statement$
);

INSERT INTO organizations (
    id,
    name,
    type,
    parent_id,
    root_organization_id,
    join_bonus_points,
    created_by
)
VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        'Tenant A',
        'UNIVERSITY',
        NULL,
        '20000000-0000-0000-0000-000000000001',
        100,
        '10000000-0000-0000-0000-000000000001'
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        'Faculty A',
        'FACULTY',
        '20000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        50,
        '10000000-0000-0000-0000-000000000001'
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        'Department A',
        'DEPARTMENT',
        '20000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000001',
        25,
        '10000000-0000-0000-0000-000000000001'
    ),
    (
        '20000000-0000-0000-0000-000000000004',
        'Tenant B',
        'COMPANY',
        NULL,
        '20000000-0000-0000-0000-000000000004',
        100,
        '10000000-0000-0000-0000-000000000001'
    ),
    (
        '20000000-0000-0000-0000-000000000005',
        'Group A',
        'GROUP',
        '20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000001',
        10,
        '10000000-0000-0000-0000-000000000001'
    );

SELECT pg_temp.expect_error(
    'self-parenting organization during insert',
    $statement$
        INSERT INTO organizations (
            id,
            name,
            type,
            parent_id,
            root_organization_id,
            created_by
        )
        VALUES (
            '20000000-0000-0000-0000-000000000006',
            'Self-parenting Organization',
            'GROUP',
            '20000000-0000-0000-0000-000000000006',
            '20000000-0000-0000-0000-000000000001',
            '10000000-0000-0000-0000-000000000001'
        )
    $statement$
);

SELECT pg_temp.expect_error(
    'multi-organization hierarchy cycle through update',
    $statement$
        UPDATE organizations
        SET parent_id = '20000000-0000-0000-0000-000000000005'
        WHERE id = '20000000-0000-0000-0000-000000000002'
    $statement$
);

INSERT INTO organization_email_domains (
    organization_id,
    domain,
    auto_join
)
VALUES (
    '20000000-0000-0000-0000-000000000001',
    'EXAMPLE.EDU',
    TRUE
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM organization_email_domains
        WHERE domain = 'example.edu'
    ) THEN
        RAISE EXCEPTION 'organization email domain was not normalized';
    END IF;
END;
$$;

SELECT pg_temp.expect_error(
    'email domain assigned to a child organization',
    $statement$
        INSERT INTO organization_email_domains (
            organization_id,
            domain,
            auto_join
        )
        VALUES (
            '20000000-0000-0000-0000-000000000002',
            'faculty.example.edu',
            TRUE
        )
    $statement$
);

INSERT INTO organization_email_allowlist (
    organization_id,
    email,
    added_by
)
VALUES (
    '20000000-0000-0000-0000-000000000003',
    'MEMBER@EXAMPLE.EDU',
    '10000000-0000-0000-0000-000000000001'
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM organization_email_allowlist
        WHERE email = 'member@example.edu'
    ) THEN
        RAISE EXCEPTION 'allowlist email was not normalized';
    END IF;
END;
$$;

INSERT INTO resources (
    id,
    name,
    owner_organization_id,
    root_organization_id,
    created_by_user_id,
    point_cost
)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    'Tenant A Lab',
    '20000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    20
);

INSERT INTO resource_allowed_organizations (
    resource_id,
    organization_id,
    root_organization_id
)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001'
);

SELECT pg_temp.expect_error(
    'cross-tenant resource sharing',
    $statement$
        INSERT INTO resource_allowed_organizations (
            resource_id,
            organization_id,
            root_organization_id
        )
        VALUES (
            '30000000-0000-0000-0000-000000000001',
            '20000000-0000-0000-0000-000000000004',
            '20000000-0000-0000-0000-000000000001'
        )
    $statement$
);

INSERT INTO resource_slots (
    id,
    resource_id,
    starts_at,
    ends_at
)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001',
        '2026-08-01 10:00:00+00',
        '2026-08-01 11:00:00+00'
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000001',
        '2026-08-01 11:00:00+00',
        '2026-08-01 12:00:00+00'
    );

SELECT pg_temp.expect_error(
    'overlapping resource slot',
    $statement$
        INSERT INTO resource_slots (
            resource_id,
            starts_at,
            ends_at
        )
        VALUES (
            '30000000-0000-0000-0000-000000000001',
            '2026-08-01 10:30:00+00',
            '2026-08-01 11:30:00+00'
        )
    $statement$
);

INSERT INTO bookings (
    id,
    resource_slot_id,
    user_id
)
VALUES (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
);

SELECT pg_temp.expect_error(
    'completed booking without completed_at',
    $statement$
        INSERT INTO bookings (
            resource_slot_id,
            user_id,
            status
        )
        VALUES (
            '40000000-0000-0000-0000-000000000002',
            '10000000-0000-0000-0000-000000000001',
            'COMPLETED'
        )
    $statement$
);

INSERT INTO point_transactions (
    user_id,
    amount,
    transaction_type,
    source_organization_id,
    description
)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    100,
    'JOIN_BONUS',
    '20000000-0000-0000-0000-000000000001',
    'Initial tenant membership'
);

SELECT pg_temp.expect_error(
    'duplicate join bonus',
    $statement$
        INSERT INTO point_transactions (
            user_id,
            amount,
            transaction_type,
            source_organization_id
        )
        VALUES (
            '10000000-0000-0000-0000-000000000001',
            100,
            'JOIN_BONUS',
            '20000000-0000-0000-0000-000000000001'
        )
    $statement$
);

SELECT pg_temp.expect_error(
    'point deduction for another user booking',
    $statement$
        INSERT INTO point_transactions (
            user_id,
            amount,
            transaction_type,
            booking_id
        )
        VALUES (
            '10000000-0000-0000-0000-000000000002',
            -20,
            'BOOKING',
            '50000000-0000-0000-0000-000000000001'
        )
    $statement$
);

SELECT pg_temp.expect_error(
    'booking point deduction with source organization',
    $statement$
        INSERT INTO point_transactions (
            user_id,
            amount,
            transaction_type,
            source_organization_id,
            booking_id
        )
        VALUES (
            '10000000-0000-0000-0000-000000000001',
            -20,
            'BOOKING',
            '20000000-0000-0000-0000-000000000001',
            '50000000-0000-0000-0000-000000000001'
        )
    $statement$
);

INSERT INTO point_transactions (
    user_id,
    amount,
    transaction_type,
    booking_id
)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    -20,
    'BOOKING',
    '50000000-0000-0000-0000-000000000001'
);

INSERT INTO point_transactions (
    user_id,
    amount,
    transaction_type,
    booking_id
)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    20,
    'BOOKING_REFUND',
    '50000000-0000-0000-0000-000000000001'
);

SELECT pg_temp.expect_error(
    'duplicate booking refund',
    $statement$
        INSERT INTO point_transactions (
            user_id,
            amount,
            transaction_type,
            booking_id
        )
        VALUES (
            '10000000-0000-0000-0000-000000000001',
            20,
            'BOOKING_REFUND',
            '50000000-0000-0000-0000-000000000001'
        )
    $statement$
);

SELECT pg_temp.expect_error(
    'verification token used after expiry',
    $statement$
        INSERT INTO email_verification_tokens (
            user_id,
            token_hash,
            created_at,
            expires_at,
            used_at
        )
        VALUES (
            '10000000-0000-0000-0000-000000000001',
            'expired-token-hash',
            '2026-08-01 10:00:00+00',
            '2026-08-01 11:00:00+00',
            '2026-08-01 12:00:00+00'
        )
    $statement$
);

ROLLBACK;

\echo 'Database integrity tests passed.'
