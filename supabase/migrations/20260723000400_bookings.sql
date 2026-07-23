-- ResourceHive migration 04: bookings and database-level overlap prevention

create table public.booking (
  booking_id uuid primary key default gen_random_uuid(),
  resource_id uuid not null,
  resource_tenant_id uuid not null,
  borrower_person_id uuid not null references public.person(person_id) on delete restrict,
  borrower_membership_id uuid not null,
  borrower_tenant_id uuid not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  point_cost integer not null,
  status public.booking_status_enum not null default 'pending',
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by_membership_id uuid references public.tenant_membership(membership_id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  cancelled_at timestamptz,
  cancellation_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_interval_chk check (start_time < end_time),
  constraint booking_point_cost_chk check (point_cost >= 0),
  constraint booking_status_metadata_chk check (
    (status <> 'confirmed' or confirmed_at is not null)
    and (status <> 'rejected' or rejected_at is not null)
    and (status <> 'cancelled' or cancelled_at is not null)
    and (status <> 'completed' or completed_at is not null)
  ),
  constraint booking_resource_fk foreign key (resource_tenant_id, resource_id)
    references public.resource(tenant_id, resource_id) on delete restrict,
  constraint booking_borrower_membership_fk foreign key (borrower_tenant_id, borrower_membership_id)
    references public.tenant_membership(tenant_id, membership_id) on delete restrict
);
create index booking_resource_idx on public.booking(resource_tenant_id, resource_id);
create index booking_borrower_person_requested_idx on public.booking(borrower_person_id, requested_at desc);
create index booking_borrower_tenant_membership_idx on public.booking(borrower_tenant_id, borrower_membership_id);
create index booking_resource_tenant_status_idx on public.booking(resource_tenant_id, status);
create index booking_borrower_tenant_status_idx on public.booking(borrower_tenant_id, status);
create index booking_start_end_idx on public.booking(resource_id, start_time, end_time);

alter table public.booking add constraint booking_no_active_overlap_excl
  exclude using gist (
    resource_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status in ('pending','confirmed'));
