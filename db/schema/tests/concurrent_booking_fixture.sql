\set ON_ERROR_STOP on

INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name
)
VALUES
    (
        '60000000-0000-0000-0000-000000000001',
        'concurrent-one@example.edu',
        'hash',
        'Concurrent',
        'One'
    ),
    (
        '60000000-0000-0000-0000-000000000002',
        'concurrent-two@example.edu',
        'hash',
        'Concurrent',
        'Two'
    );

INSERT INTO organizations (
    id,
    name,
    type,
    root_organization_id,
    created_by
)
VALUES (
    '70000000-0000-0000-0000-000000000001',
    'Concurrency Test Tenant',
    'UNIVERSITY',
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
);

INSERT INTO resources (
    id,
    name,
    owner_organization_id,
    root_organization_id,
    created_by_user_id
)
VALUES (
    '80000000-0000-0000-0000-000000000001',
    'Concurrency Test Resource',
    '70000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
);

INSERT INTO resource_slots (
    id,
    resource_id,
    starts_at,
    ends_at
)
VALUES (
    '90000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    '2026-08-02 10:00:00+00',
    '2026-08-02 11:00:00+00'
);
