-- ResourceHive migration 05: pooled wallets, semesters and point ledger

create table public.point_wallet (
  wallet_id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.person(person_id) on delete cascade,
  current_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint point_wallet_balance_chk check (current_balance >= 0),
  constraint point_wallet_wallet_person_uk unique(wallet_id, person_id)
);

create table public.semester (
  semester_id uuid primary key default gen_random_uuid(),
  organization_tenant_id uuid not null references public.tenant(tenant_id) on delete cascade,
  name varchar(120) not null,
  starts_on date not null,
  ends_on date not null,
  grant_window_starts_at timestamptz,
  grant_window_ends_at timestamptz,
  status public.semester_status_enum not null default 'planned',
  created_at timestamptz not null default now(),
  constraint semester_dates_chk check (starts_on <= ends_on),
  constraint semester_grant_window_chk check (
    grant_window_starts_at is null or grant_window_ends_at is null
    or grant_window_starts_at <= grant_window_ends_at
  )
);
create unique index semester_org_name_lower_uidx on public.semester(organization_tenant_id, lower(name));
create index semester_org_status_idx on public.semester(organization_tenant_id, status);

create table public.tenant_semester_grant_policy (
  policy_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(tenant_id) on delete cascade,
  semester_id uuid not null references public.semester(semester_id) on delete cascade,
  points_per_active_member integer not null default 0,
  configured_by_membership_id uuid not null,
  configured_at timestamptz not null default now(),
  constraint grant_policy_points_chk check (points_per_active_member >= 0),
  constraint grant_policy_actor_fk foreign key (tenant_id, configured_by_membership_id)
    references public.tenant_membership(tenant_id, membership_id) on delete restrict,
  constraint grant_policy_tenant_semester_uk unique(tenant_id, semester_id)
);
create index grant_policy_semester_idx on public.tenant_semester_grant_policy(semester_id);

create table public.point_transaction (
  point_transaction_id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null,
  person_id uuid not null,
  transaction_type public.point_transaction_type_enum not null,
  amount integer not null,
  balance_after integer not null,
  booking_id uuid references public.booking(booking_id) on delete restrict,
  semester_id uuid references public.semester(semester_id) on delete restrict,
  source_tenant_id uuid references public.tenant(tenant_id) on delete restrict,
  source_membership_id uuid references public.tenant_membership(membership_id) on delete restrict,
  performed_by_membership_id uuid references public.tenant_membership(membership_id) on delete restrict,
  description text,
  idempotency_key varchar(255) not null unique,
  created_at timestamptz not null default now(),
  constraint point_transaction_wallet_person_fk foreign key (wallet_id, person_id)
    references public.point_wallet(wallet_id, person_id) on delete restrict,
  constraint point_transaction_amount_nonzero_chk check (amount <> 0),
  constraint point_transaction_balance_after_chk check (balance_after >= 0)
);
create index point_transaction_wallet_created_idx on public.point_transaction(wallet_id, created_at desc);
create index point_transaction_person_created_idx on public.point_transaction(person_id, created_at desc);
create index point_transaction_booking_idx on public.point_transaction(booking_id) where booking_id is not null;
create index point_transaction_semester_tenant_idx on public.point_transaction(semester_id, source_tenant_id) where semester_id is not null;
create unique index point_transaction_semester_grant_uidx
  on public.point_transaction(person_id, source_membership_id, semester_id, transaction_type)
  where transaction_type = 'semester_grant';
create unique index point_transaction_booking_charge_uidx
  on public.point_transaction(booking_id, transaction_type)
  where transaction_type = 'booking_charge';
