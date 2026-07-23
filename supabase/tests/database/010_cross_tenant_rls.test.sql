begin;

select plan(28);

-- Stable fixture IDs keep failures easy to understand.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'admin-a@orga.test', '',
  now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin A"}',
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'admin-b@orgb.test', '',
  now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin B"}',
  now(), now()
);

insert into public.tenant (
  tenant_id, tenant_type, name, tenant_status, organization_tenant_id
)
values
(
  'a0000000-0000-0000-0000-000000000001',
  'organization', 'Organization A', 'active',
  'a0000000-0000-0000-0000-000000000001'
),
(
  'b0000000-0000-0000-0000-000000000002',
  'organization', 'Organization B', 'active',
  'b0000000-0000-0000-0000-000000000002'
);

insert into public.organization_domain (
  domain_id, organization_tenant_id, domain, is_verified, verified_at
)
values
(
  'a1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'orga.test', true, now()
),
(
  'b1000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'orgb.test', true, now()
);

insert into public.tenant_membership (
  membership_id, person_id, tenant_id, role, status, approved_at
)
values
(
  'a2000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'admin', 'active', now()
),
(
  'b2000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'admin', 'active', now()
);

insert into public.resource_category (category_id, tenant_id, name)
values
(
  'a3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Organization A Equipment'
),
(
  'b3000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'Organization B Equipment'
);

insert into public.resource (
  resource_id, tenant_id, category_id, created_by_membership_id,
  name, status, point_cost_per_hour
)
values
(
  'a4000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'Organization A Projector', 'available', 10
),
(
  'b4000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'b3000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000002',
  'Organization B Projector', 'available', 10
);

insert into public.resource_image (image_id, tenant_id, resource_id, image_url, is_primary)
values
(
  'a5000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a4000000-0000-0000-0000-000000000001',
  'https://example.test/a.jpg', true
),
(
  'b5000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'b4000000-0000-0000-0000-000000000002',
  'https://example.test/b.jpg', true
);

insert into public.availability_rule (
  availability_rule_id, tenant_id, resource_id, start_time, end_time
)
values
(
  'a6000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a4000000-0000-0000-0000-000000000001',
  '09:00', '17:00'
),
(
  'b6000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'b4000000-0000-0000-0000-000000000002',
  '09:00', '17:00'
);

insert into public.availability_rule_day (
  availability_rule_day_id, tenant_id, availability_rule_id, day_of_week
)
values
(
  'a7000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a6000000-0000-0000-0000-000000000001',
  'monday'
),
(
  'b7000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'b6000000-0000-0000-0000-000000000002',
  'monday'
);

insert into public.availability_exception (
  exception_id, tenant_id, resource_id, exception_date, is_available, reason
)
values
(
  'a8000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a4000000-0000-0000-0000-000000000001',
  '2026-08-01', false, 'Maintenance A'
),
(
  'b8000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'b4000000-0000-0000-0000-000000000002',
  '2026-08-01', false, 'Maintenance B'
);

insert into public.booking (
  booking_id, resource_id, resource_tenant_id,
  borrower_person_id, borrower_membership_id, borrower_tenant_id,
  start_time, end_time, point_cost
)
values
(
  'a9000000-0000-0000-0000-000000000001',
  'a4000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '2026-08-10 09:00+00', '2026-08-10 10:00+00', 10
),
(
  'b9000000-0000-0000-0000-000000000002',
  'b4000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  '2026-08-10 09:00+00', '2026-08-10 10:00+00', 10
);

insert into public.semester (
  semester_id, organization_tenant_id, name, starts_on, ends_on, status
)
values
(
  'aa000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'A Semester', '2026-07-01', '2026-12-31', 'active'
),
(
  'bb000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'B Semester', '2026-07-01', '2026-12-31', 'active'
);

insert into public.tenant_semester_grant_policy (
  policy_id, tenant_id, semester_id, points_per_active_member,
  configured_by_membership_id
)
values
(
  'aa100000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'aa000000-0000-0000-0000-000000000001',
  100, 'a2000000-0000-0000-0000-000000000001'
),
(
  'bb100000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'bb000000-0000-0000-0000-000000000002',
  100, 'b2000000-0000-0000-0000-000000000002'
);

insert into public.point_transaction (
  point_transaction_id, wallet_id, person_id, transaction_type,
  amount, balance_after, source_tenant_id, source_membership_id,
  idempotency_key
)
select
  'aa200000-0000-0000-0000-000000000001',
  wallet_id,
  '10000000-0000-0000-0000-000000000001',
  'credit', 10, 10,
  'a0000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'rls-test-credit-a'
from public.point_wallet
where person_id = '10000000-0000-0000-0000-000000000001';

insert into public.point_transaction (
  point_transaction_id, wallet_id, person_id, transaction_type,
  amount, balance_after, source_tenant_id, source_membership_id,
  idempotency_key
)
select
  'bb200000-0000-0000-0000-000000000002',
  wallet_id,
  '20000000-0000-0000-0000-000000000002',
  'credit', 10, 10,
  'b0000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000002',
  'rls-test-credit-b'
from public.point_wallet
where person_id = '20000000-0000-0000-0000-000000000002';

insert into public.return_confirmation (
  return_confirmation_id, booking_id, confirmer_membership_id, confirmer_role
)
values
(
  'aa300000-0000-0000-0000-000000000001',
  'a9000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'borrower'
),
(
  'bb300000-0000-0000-0000-000000000002',
  'b9000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000002',
  'borrower'
);

insert into public.dispute (
  dispute_id, booking_id, opened_by_membership_id, reason
)
values
(
  'aa400000-0000-0000-0000-000000000001',
  'a9000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'Fixture dispute A'
),
(
  'bb400000-0000-0000-0000-000000000002',
  'b9000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000002',
  'Fixture dispute B'
);

insert into public.notification (
  notification_id, recipient_person_id, tenant_id, notification_type,
  title, message
)
values
(
  'aa500000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'general_announcement', 'A notice', 'Visible only to A'
),
(
  'bb500000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'general_announcement', 'B notice', 'Visible only to B'
);

insert into public.admin_action (
  admin_action_id, admin_membership_id, authority_tenant_id,
  action_type, reason
)
values
(
  'aa600000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'approve_resource', 'Fixture action A'
),
(
  'bb600000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'approve_resource', 'Fixture action B'
);

-- Simulate requests authenticated as Organization A's user.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is((select count(*)::integer from public.person), 1, 'A sees only own person');
select is((select count(*)::integer from public.tenant), 1, 'A sees only own tenant tree');
select is((select count(*)::integer from public.organization_domain), 1, 'A sees only own domain');
select is((select count(*)::integer from public.tenant_membership), 1, 'A sees no B membership');
select is((select count(*)::integer from public.resource_category), 1, 'A sees no B category');
select is((select count(*)::integer from public.resource), 1, 'A sees no B resource');
select is((select count(*)::integer from public.resource_image), 1, 'A sees no B image');
select is((select count(*)::integer from public.availability_rule), 1, 'A sees no B availability rule');
select is((select count(*)::integer from public.availability_rule_day), 1, 'A sees no B rule day');
select is((select count(*)::integer from public.availability_exception), 1, 'A sees no B exception');
select is((select count(*)::integer from public.booking), 1, 'A sees no B booking');
select is((select count(*)::integer from public.point_wallet), 1, 'A sees only own wallet');
select is((select count(*)::integer from public.semester), 1, 'A sees no B semester');
select is((select count(*)::integer from public.tenant_semester_grant_policy), 1, 'A sees no B grant policy');
select is((select count(*)::integer from public.point_transaction), 1, 'A sees no B point transaction');
select is((select count(*)::integer from public.return_confirmation), 1, 'A sees no B return confirmation');
select is((select count(*)::integer from public.dispute), 1, 'A sees no B dispute');
select is((select count(*)::integer from public.notification), 1, 'A sees no B notification');
select is((select count(*)::integer from public.admin_action), 1, 'A sees no B admin action');

select is(
  (
    select count(*)::integer
    from public.resource
    where resource_id = 'b4000000-0000-0000-0000-000000000002'
  ),
  0,
  'explicit cross-tenant resource read is rejected'
);

select is(
  (
    select count(*)::integer
    from public.booking
    where booking_id = 'b9000000-0000-0000-0000-000000000002'
  ),
  0,
  'explicit cross-tenant booking read is rejected'
);

select throws_ok(
  $$
    insert into public.resource (
      tenant_id, category_id, created_by_membership_id, name
    )
    values (
      'b0000000-0000-0000-0000-000000000002',
      'b3000000-0000-0000-0000-000000000002',
      'b2000000-0000-0000-0000-000000000002',
      'Forbidden cross-tenant resource'
    )
  $$,
  '42501',
  'permission denied for table resource',
  'A cannot insert a resource into B'
);

select throws_ok(
  $$
    update public.resource
    set name = 'Forbidden update'
    where resource_id = 'b4000000-0000-0000-0000-000000000002'
  $$,
  '42501',
  'permission denied for table resource',
  'A cannot update B resource'
);

select throws_ok(
  $$
    update public.point_wallet
    set current_balance = 999
    where person_id = '10000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'permission denied for table point_wallet',
  'clients cannot directly update even their own wallet'
);

-- Positive controls prove the policy suite does not merely deny everything.
select ok(
  exists (
    select 1 from public.resource
    where resource_id = 'a4000000-0000-0000-0000-000000000001'
  ),
  'A can read own-tenant resource'
);

select ok(
  exists (
    select 1 from public.booking
    where booking_id = 'a9000000-0000-0000-0000-000000000001'
  ),
  'A can read own booking'
);

-- Unauthenticated API callers cannot see protected rows.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$ select * from public.resource $$,
  '42501',
  'permission denied for table resource',
  'anonymous caller cannot read resources'
);

select throws_ok(
  $$ select * from public.person $$,
  '42501',
  'permission denied for table person',
  'anonymous caller cannot read people'
);

reset role;
select * from finish();
rollback;
