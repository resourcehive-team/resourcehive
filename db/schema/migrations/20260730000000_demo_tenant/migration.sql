BEGIN;

-- Development-only demo users.
-- Every account uses the password documented in internal-documentation/docs/demo-tenant.md.
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    email_verified_at,
    status,
    platform_role
)
VALUES
    (
        'd1000000-0000-4000-8000-000000000001',
        'platform.admin@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Priya',
        'Platform',
        CURRENT_TIMESTAMP,
        'ACTIVE',
        'PLATFORM_ADMIN'
    ),
    (
        'd1000000-0000-4000-8000-000000000002',
        'tenant.admin@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Tania',
        'Administrator',
        CURRENT_TIMESTAMP,
        'ACTIVE',
        'USER'
    ),
    (
        'd1000000-0000-4000-8000-000000000003',
        'engineering.admin@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Eshan',
        'Engineer',
        CURRENT_TIMESTAMP,
        'ACTIVE',
        'USER'
    ),
    (
        'd1000000-0000-4000-8000-000000000004',
        'computing.admin@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Chamara',
        'Computing',
        CURRENT_TIMESTAMP,
        'ACTIVE',
        'USER'
    ),
    (
        'd1000000-0000-4000-8000-000000000005',
        'student.alice@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Alice',
        'Perera',
        CURRENT_TIMESTAMP,
        'ACTIVE',
        'USER'
    ),
    (
        'd1000000-0000-4000-8000-000000000006',
        'student.bob@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Bob',
        'Fernando',
        CURRENT_TIMESTAMP,
        'ACTIVE',
        'USER'
    ),
    (
        'd1000000-0000-4000-8000-000000000007',
        'science.member@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Samira',
        'Science',
        CURRENT_TIMESTAMP,
        'ACTIVE',
        'USER'
    ),
    (
        'd1000000-0000-4000-8000-000000000008',
        'pending.member@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Penny',
        'Pending',
        CURRENT_TIMESTAMP,
        'ACTIVE',
        'USER'
    ),
    (
        'd1000000-0000-4000-8000-000000000009',
        'suspended.member@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Suresh',
        'Suspended',
        CURRENT_TIMESTAMP,
        'SUSPENDED',
        'USER'
    ),
    (
        'd1000000-0000-4000-8000-000000000010',
        'rejected.member@resourcehive.test',
        '$2b$12$p.th4EyYA8LVaK7SA8w1Y.BFGeWCo8EXsLsjX.I136NuhNRuxb/k2',
        'Ravi',
        'Rejected',
        CURRENT_TIMESTAMP,
        'ACTIVE',
        'USER'
    );

-- One tenant with two faculties, three departments, and one club.
INSERT INTO organizations (
    id,
    name,
    type,
    parent_id,
    root_organization_id,
    join_bonus_points,
    status,
    created_by
)
VALUES
    (
        'd2000000-0000-4000-8000-000000000001',
        'ResourceHive Demo University',
        'UNIVERSITY',
        NULL,
        'd2000000-0000-4000-8000-000000000001',
        100,
        'ACTIVE',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd2000000-0000-4000-8000-000000000002',
        'Faculty of Engineering',
        'FACULTY',
        'd2000000-0000-4000-8000-000000000001',
        'd2000000-0000-4000-8000-000000000001',
        50,
        'ACTIVE',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd2000000-0000-4000-8000-000000000003',
        'Faculty of Science',
        'FACULTY',
        'd2000000-0000-4000-8000-000000000001',
        'd2000000-0000-4000-8000-000000000001',
        50,
        'ACTIVE',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd2000000-0000-4000-8000-000000000004',
        'Department of Computer Science',
        'DEPARTMENT',
        'd2000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000001',
        25,
        'ACTIVE',
        'd1000000-0000-4000-8000-000000000003'
    ),
    (
        'd2000000-0000-4000-8000-000000000005',
        'Department of Electrical Engineering',
        'DEPARTMENT',
        'd2000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000001',
        25,
        'ACTIVE',
        'd1000000-0000-4000-8000-000000000003'
    ),
    (
        'd2000000-0000-4000-8000-000000000006',
        'Department of Applied Science',
        'DEPARTMENT',
        'd2000000-0000-4000-8000-000000000003',
        'd2000000-0000-4000-8000-000000000001',
        25,
        'ACTIVE',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd2000000-0000-4000-8000-000000000007',
        'Robotics Club',
        'CLUB',
        'd2000000-0000-4000-8000-000000000004',
        'd2000000-0000-4000-8000-000000000001',
        10,
        'ACTIVE',
        'd1000000-0000-4000-8000-000000000004'
    );

INSERT INTO organization_email_domains (
    id,
    organization_id,
    domain,
    auto_join
)
VALUES (
    'd8000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'resourcehive.test',
    TRUE
);

-- Approved, pending, rejected, and suspended memberships are represented.
INSERT INTO organization_memberships (
    id,
    user_id,
    organization_id,
    role,
    status,
    approved_by
)
VALUES
    (
        'd9000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000001',
        'd2000000-0000-4000-8000-000000000001',
        'ADMIN',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000002',
        'd1000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000001',
        'ADMIN',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000003',
        'd1000000-0000-4000-8000-000000000003',
        'd2000000-0000-4000-8000-000000000001',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000004',
        'd1000000-0000-4000-8000-000000000003',
        'd2000000-0000-4000-8000-000000000002',
        'ADMIN',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000005',
        'd1000000-0000-4000-8000-000000000004',
        'd2000000-0000-4000-8000-000000000001',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000006',
        'd1000000-0000-4000-8000-000000000004',
        'd2000000-0000-4000-8000-000000000002',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000003'
    ),
    (
        'd9000000-0000-4000-8000-000000000007',
        'd1000000-0000-4000-8000-000000000004',
        'd2000000-0000-4000-8000-000000000004',
        'ADMIN',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000003'
    ),
    (
        'd9000000-0000-4000-8000-000000000008',
        'd1000000-0000-4000-8000-000000000005',
        'd2000000-0000-4000-8000-000000000001',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000009',
        'd1000000-0000-4000-8000-000000000005',
        'd2000000-0000-4000-8000-000000000002',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000003'
    ),
    (
        'd9000000-0000-4000-8000-000000000010',
        'd1000000-0000-4000-8000-000000000005',
        'd2000000-0000-4000-8000-000000000004',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000004'
    ),
    (
        'd9000000-0000-4000-8000-000000000011',
        'd1000000-0000-4000-8000-000000000006',
        'd2000000-0000-4000-8000-000000000001',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000012',
        'd1000000-0000-4000-8000-000000000006',
        'd2000000-0000-4000-8000-000000000002',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000003'
    ),
    (
        'd9000000-0000-4000-8000-000000000013',
        'd1000000-0000-4000-8000-000000000006',
        'd2000000-0000-4000-8000-000000000005',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000003'
    ),
    (
        'd9000000-0000-4000-8000-000000000014',
        'd1000000-0000-4000-8000-000000000007',
        'd2000000-0000-4000-8000-000000000001',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000015',
        'd1000000-0000-4000-8000-000000000007',
        'd2000000-0000-4000-8000-000000000003',
        'MEMBER',
        'APPROVED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000016',
        'd1000000-0000-4000-8000-000000000008',
        'd2000000-0000-4000-8000-000000000001',
        'MEMBER',
        'PENDING',
        NULL
    ),
    (
        'd9000000-0000-4000-8000-000000000017',
        'd1000000-0000-4000-8000-000000000009',
        'd2000000-0000-4000-8000-000000000001',
        'MEMBER',
        'SUSPENDED',
        'd1000000-0000-4000-8000-000000000002'
    ),
    (
        'd9000000-0000-4000-8000-000000000018',
        'd1000000-0000-4000-8000-000000000010',
        'd2000000-0000-4000-8000-000000000001',
        'MEMBER',
        'REJECTED',
        'd1000000-0000-4000-8000-000000000002'
    );

INSERT INTO resources (
    id,
    name,
    description,
    owner_organization_id,
    root_organization_id,
    created_by_user_id,
    status,
    point_cost
)
VALUES
    (
        'd3000000-0000-4000-8000-000000000001',
        'Main Library Study Room',
        'A quiet room for individual and group study.',
        'd2000000-0000-4000-8000-000000000001',
        'd2000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000002',
        'ACTIVE',
        10
    ),
    (
        'd3000000-0000-4000-8000-000000000002',
        'Engineering Robotics Lab',
        'Robotics workbench and prototyping equipment.',
        'd2000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000003',
        'ACTIVE',
        25
    ),
    (
        'd3000000-0000-4000-8000-000000000003',
        'Computer Science Lab',
        'General computing lab for department members.',
        'd2000000-0000-4000-8000-000000000004',
        'd2000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000004',
        'ACTIVE',
        15
    ),
    (
        'd3000000-0000-4000-8000-000000000004',
        'Applied Science Laboratory',
        'Shared laboratory space for science students.',
        'd2000000-0000-4000-8000-000000000006',
        'd2000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000002',
        'ACTIVE',
        20
    ),
    (
        'd3000000-0000-4000-8000-000000000005',
        'Engineering Seminar Room',
        'Temporarily unavailable seminar room.',
        'd2000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000003',
        'INACTIVE',
        5
    );

-- Resource owners are always included in the allowed organizations.
INSERT INTO resource_allowed_organizations (
    resource_id,
    organization_id,
    root_organization_id
)
VALUES
    (
        'd3000000-0000-4000-8000-000000000001',
        'd2000000-0000-4000-8000-000000000001',
        'd2000000-0000-4000-8000-000000000001'
    ),
    (
        'd3000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000001'
    ),
    (
        'd3000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000004',
        'd2000000-0000-4000-8000-000000000001'
    ),
    (
        'd3000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000005',
        'd2000000-0000-4000-8000-000000000001'
    ),
    (
        'd3000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000007',
        'd2000000-0000-4000-8000-000000000001'
    ),
    (
        'd3000000-0000-4000-8000-000000000003',
        'd2000000-0000-4000-8000-000000000004',
        'd2000000-0000-4000-8000-000000000001'
    ),
    (
        'd3000000-0000-4000-8000-000000000004',
        'd2000000-0000-4000-8000-000000000006',
        'd2000000-0000-4000-8000-000000000001'
    ),
    (
        'd3000000-0000-4000-8000-000000000005',
        'd2000000-0000-4000-8000-000000000002',
        'd2000000-0000-4000-8000-000000000001'
    );

-- Relative dates keep availability useful whenever this migration is deployed.
INSERT INTO resource_slots (
    id,
    resource_id,
    starts_at,
    ends_at
)
VALUES
    (
        'd4000000-0000-4000-8000-000000000001',
        'd3000000-0000-4000-8000-000000000002',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day 10 hours',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day 12 hours'
    ),
    (
        'd4000000-0000-4000-8000-000000000002',
        'd3000000-0000-4000-8000-000000000001',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day 13 hours',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day 14 hours'
    ),
    (
        'd4000000-0000-4000-8000-000000000003',
        'd3000000-0000-4000-8000-000000000003',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '2 days 9 hours',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '2 days 11 hours'
    ),
    (
        'd4000000-0000-4000-8000-000000000004',
        'd3000000-0000-4000-8000-000000000004',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '2 days 14 hours',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '2 days 16 hours'
    ),
    (
        'd4000000-0000-4000-8000-000000000005',
        'd3000000-0000-4000-8000-000000000001',
        date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL '3 days' + INTERVAL '10 hours',
        date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL '3 days' + INTERVAL '11 hours'
    ),
    (
        'd4000000-0000-4000-8000-000000000006',
        'd3000000-0000-4000-8000-000000000004',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '3 days 10 hours',
        date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '3 days 12 hours'
    );

INSERT INTO bookings (
    id,
    resource_slot_id,
    user_id,
    status,
    created_at,
    cancelled_at,
    completed_at
)
VALUES
    (
        'd5000000-0000-4000-8000-000000000001',
        'd4000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000005',
        'CONFIRMED',
        CURRENT_TIMESTAMP,
        NULL,
        NULL
    ),
    (
        'd5000000-0000-4000-8000-000000000002',
        'd4000000-0000-4000-8000-000000000005',
        'd1000000-0000-4000-8000-000000000006',
        'COMPLETED',
        CURRENT_TIMESTAMP - INTERVAL '4 days',
        NULL,
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        'd5000000-0000-4000-8000-000000000003',
        'd4000000-0000-4000-8000-000000000006',
        'd1000000-0000-4000-8000-000000000007',
        'CANCELLED',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        CURRENT_TIMESTAMP,
        NULL
    );

-- Joining bonuses and representative booking ledger entries.
INSERT INTO point_transactions (
    id,
    user_id,
    amount,
    transaction_type,
    source_organization_id,
    booking_id,
    description
)
VALUES
    (
        'd6000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000001',
        100,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000001',
        NULL,
        'Demo root organization joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000002',
        'd1000000-0000-4000-8000-000000000002',
        100,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000001',
        NULL,
        'Demo root organization joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000003',
        'd1000000-0000-4000-8000-000000000003',
        100,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000001',
        NULL,
        'Demo root organization joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000004',
        'd1000000-0000-4000-8000-000000000003',
        50,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000002',
        NULL,
        'Demo engineering faculty joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000005',
        'd1000000-0000-4000-8000-000000000004',
        100,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000001',
        NULL,
        'Demo root organization joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000006',
        'd1000000-0000-4000-8000-000000000004',
        50,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000002',
        NULL,
        'Demo engineering faculty joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000007',
        'd1000000-0000-4000-8000-000000000004',
        25,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000004',
        NULL,
        'Demo computing department joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000008',
        'd1000000-0000-4000-8000-000000000005',
        100,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000001',
        NULL,
        'Demo root organization joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000009',
        'd1000000-0000-4000-8000-000000000005',
        50,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000002',
        NULL,
        'Demo engineering faculty joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000010',
        'd1000000-0000-4000-8000-000000000005',
        25,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000004',
        NULL,
        'Demo computing department joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000011',
        'd1000000-0000-4000-8000-000000000005',
        -25,
        'BOOKING',
        NULL,
        'd5000000-0000-4000-8000-000000000001',
        'Demo Robotics Lab booking'
    ),
    (
        'd6000000-0000-4000-8000-000000000012',
        'd1000000-0000-4000-8000-000000000006',
        100,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000001',
        NULL,
        'Demo root organization joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000013',
        'd1000000-0000-4000-8000-000000000006',
        50,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000002',
        NULL,
        'Demo engineering faculty joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000014',
        'd1000000-0000-4000-8000-000000000006',
        25,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000005',
        NULL,
        'Demo electrical engineering department joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000015',
        'd1000000-0000-4000-8000-000000000006',
        -10,
        'BOOKING',
        NULL,
        'd5000000-0000-4000-8000-000000000002',
        'Demo completed Study Room booking'
    ),
    (
        'd6000000-0000-4000-8000-000000000016',
        'd1000000-0000-4000-8000-000000000007',
        100,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000001',
        NULL,
        'Demo root organization joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000017',
        'd1000000-0000-4000-8000-000000000007',
        50,
        'JOIN_BONUS',
        'd2000000-0000-4000-8000-000000000003',
        NULL,
        'Demo science faculty joining bonus'
    ),
    (
        'd6000000-0000-4000-8000-000000000018',
        'd1000000-0000-4000-8000-000000000007',
        -20,
        'BOOKING',
        NULL,
        'd5000000-0000-4000-8000-000000000003',
        'Demo cancelled Science Laboratory booking'
    ),
    (
        'd6000000-0000-4000-8000-000000000019',
        'd1000000-0000-4000-8000-000000000007',
        20,
        'BOOKING_REFUND',
        NULL,
        'd5000000-0000-4000-8000-000000000003',
        'Demo refund for cancelled Science Laboratory booking'
    );

INSERT INTO notifications (
    id,
    user_id,
    type,
    title,
    message,
    read_at,
    created_at
)
VALUES
    (
        'd7000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000005',
        'BOOKING_CONFIRMED',
        'Booking confirmed',
        'Your Engineering Robotics Lab booking is confirmed.',
        NULL,
        CURRENT_TIMESTAMP
    ),
    (
        'd7000000-0000-4000-8000-000000000002',
        'd1000000-0000-4000-8000-000000000005',
        'MEMBERSHIP_APPROVED',
        'Membership approved',
        'Your Computer Science membership is approved.',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        'd7000000-0000-4000-8000-000000000003',
        'd1000000-0000-4000-8000-000000000006',
        'BOOKING_COMPLETED',
        'Booking completed',
        'Your Main Library Study Room booking was completed.',
        NULL,
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        'd7000000-0000-4000-8000-000000000004',
        'd1000000-0000-4000-8000-000000000007',
        'BOOKING_CANCELLED',
        'Booking cancelled',
        'Your Applied Science Laboratory booking was cancelled and refunded.',
        NULL,
        CURRENT_TIMESTAMP
    ),
    (
        'd7000000-0000-4000-8000-000000000005',
        'd1000000-0000-4000-8000-000000000002',
        'MEMBERSHIP_REQUESTED',
        'Membership request pending',
        'A new root organization membership request requires review.',
        NULL,
        CURRENT_TIMESTAMP
    );

COMMIT;
