-- ResourceHive migration 06: returns, disputes, notifications and audit

create table public.return_confirmation (
  return_confirmation_id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking(booking_id) on delete cascade,
  confirmer_membership_id uuid not null references public.tenant_membership(membership_id) on delete restrict,
  confirmer_role public.confirmer_role_enum not null,
  condition_notes text,
  has_issue boolean not null default false,
  confirmed_at timestamptz not null default now(),
  constraint return_confirmation_booking_role_uk unique(booking_id, confirmer_role)
);
create index return_confirmation_confirmer_idx on public.return_confirmation(confirmer_membership_id, confirmed_at desc);

create table public.dispute (
  dispute_id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.booking(booking_id) on delete restrict,
  opened_by_membership_id uuid not null references public.tenant_membership(membership_id) on delete restrict,
  dispute_status public.dispute_status_enum not null default 'open',
  reason text not null,
  resolution_notes text,
  resolved_by_membership_id uuid references public.tenant_membership(membership_id) on delete set null,
  escalated_to_tenant_id uuid references public.tenant(tenant_id) on delete set null,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint dispute_resolution_time_chk check (dispute_status not in ('resolved','rejected') or resolved_at is not null)
);
create index dispute_status_opened_idx on public.dispute(dispute_status, opened_at desc);
create index dispute_escalation_tenant_idx on public.dispute(escalated_to_tenant_id, dispute_status) where escalated_to_tenant_id is not null;

create table public.notification (
  notification_id uuid primary key default gen_random_uuid(),
  recipient_person_id uuid not null references public.person(person_id) on delete cascade,
  recipient_membership_id uuid references public.tenant_membership(membership_id) on delete cascade,
  tenant_id uuid references public.tenant(tenant_id) on delete cascade,
  booking_id uuid references public.booking(booking_id) on delete cascade,
  resource_id uuid references public.resource(resource_id) on delete cascade,
  dispute_id uuid references public.dispute(dispute_id) on delete cascade,
  notification_type public.notification_type_enum not null,
  title varchar(200) not null,
  message text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_read_time_chk check (not is_read or read_at is not null)
);
create index notification_person_created_idx on public.notification(recipient_person_id, created_at desc);
create index notification_membership_created_idx on public.notification(recipient_membership_id, created_at desc) where recipient_membership_id is not null;
create index notification_tenant_created_idx on public.notification(tenant_id, created_at desc) where tenant_id is not null;
create index notification_person_unread_idx on public.notification(recipient_person_id, created_at desc) where not is_read;
create index notification_membership_unread_idx on public.notification(recipient_membership_id, created_at desc) where recipient_membership_id is not null and not is_read;
create index notification_booking_idx on public.notification(booking_id) where booking_id is not null;

create table public.admin_action (
  admin_action_id uuid primary key default gen_random_uuid(),
  admin_membership_id uuid not null references public.tenant_membership(membership_id) on delete restrict,
  authority_tenant_id uuid not null references public.tenant(tenant_id) on delete restrict,
  action_type public.admin_action_type_enum not null,
  target_tenant_id uuid references public.tenant(tenant_id) on delete restrict,
  target_membership_id uuid references public.tenant_membership(membership_id) on delete restrict,
  target_resource_id uuid references public.resource(resource_id) on delete restrict,
  target_booking_id uuid references public.booking(booking_id) on delete restrict,
  target_dispute_id uuid references public.dispute(dispute_id) on delete restrict,
  target_point_transaction_id uuid references public.point_transaction(point_transaction_id) on delete restrict,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint admin_action_primary_target_chk check (
    num_nonnulls(target_tenant_id, target_membership_id, target_resource_id,
      target_booking_id, target_dispute_id, target_point_transaction_id) <= 1
  )
);
create index admin_action_authority_created_idx on public.admin_action(authority_tenant_id, created_at desc);
create index admin_action_admin_created_idx on public.admin_action(admin_membership_id, created_at desc);
create index admin_action_type_created_idx on public.admin_action(action_type, created_at desc);
