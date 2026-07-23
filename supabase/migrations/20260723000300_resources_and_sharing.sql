-- ResourceHive migration 03: resources, availability and explicit tenant sharing

create table public.resource_category (
  category_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(tenant_id) on delete cascade,
  name varchar(120) not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_category_tenant_category_uk unique(tenant_id, category_id)
);
create unique index resource_category_tenant_name_lower_uidx on public.resource_category(tenant_id, lower(name));
create index resource_category_active_idx on public.resource_category(tenant_id, is_active);

create table public.resource (
  resource_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  category_id uuid not null,
  created_by_membership_id uuid not null,
  name varchar(200) not null,
  description text,
  location varchar(255),
  point_cost_per_hour integer not null default 0,
  status public.resource_status_enum not null default 'pending_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_point_cost_chk check (point_cost_per_hour >= 0),
  constraint resource_tenant_resource_uk unique(tenant_id, resource_id),
  constraint resource_category_same_tenant_fk foreign key (tenant_id, category_id)
    references public.resource_category(tenant_id, category_id) on delete restrict,
  constraint resource_creator_same_tenant_fk foreign key (tenant_id, created_by_membership_id)
    references public.tenant_membership(tenant_id, membership_id) on delete restrict
);
create index resource_tenant_status_idx on public.resource(tenant_id, status);
create index resource_tenant_category_idx on public.resource(tenant_id, category_id);
create index resource_name_lower_idx on public.resource(tenant_id, lower(name));

create table public.resource_image (
  image_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  resource_id uuid not null,
  image_url text not null,
  is_primary boolean not null default false,
  uploaded_at timestamptz not null default now(),
  constraint resource_image_resource_fk foreign key (tenant_id, resource_id)
    references public.resource(tenant_id, resource_id) on delete cascade
);
create index resource_image_resource_idx on public.resource_image(tenant_id, resource_id);
create unique index resource_image_one_primary_uidx on public.resource_image(tenant_id, resource_id) where is_primary;

create table public.availability_rule (
  availability_rule_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  resource_id uuid not null,
  start_time time not null,
  end_time time not null,
  valid_from date,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rule_time_chk check (start_time < end_time),
  constraint availability_rule_dates_chk check (valid_from is null or valid_until is null or valid_from <= valid_until),
  constraint availability_rule_tenant_rule_uk unique(tenant_id, availability_rule_id),
  constraint availability_rule_resource_fk foreign key (tenant_id, resource_id)
    references public.resource(tenant_id, resource_id) on delete cascade
);
create index availability_rule_resource_idx on public.availability_rule(tenant_id, resource_id, is_active);

create table public.availability_rule_day (
  availability_rule_day_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  availability_rule_id uuid not null,
  day_of_week public.day_of_week_enum not null,
  constraint availability_rule_day_uk unique(availability_rule_id, day_of_week),
  constraint availability_rule_day_rule_fk foreign key (tenant_id, availability_rule_id)
    references public.availability_rule(tenant_id, availability_rule_id) on delete cascade
);
create index availability_rule_day_tenant_idx on public.availability_rule_day(tenant_id, availability_rule_id);

create table public.availability_exception (
  exception_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  resource_id uuid not null,
  exception_date date not null,
  is_available boolean not null,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  constraint availability_exception_time_pair_chk check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and start_time < end_time)
  ),
  constraint availability_exception_resource_fk foreign key (tenant_id, resource_id)
    references public.resource(tenant_id, resource_id) on delete cascade
);
create index availability_exception_resource_date_idx on public.availability_exception(tenant_id, resource_id, exception_date);

create table public.resource_share (
  resource_share_id uuid primary key default gen_random_uuid(),
  resource_id uuid not null,
  resource_tenant_id uuid not null,
  shared_with_tenant_id uuid not null references public.tenant(tenant_id) on delete cascade,
  permission public.resource_share_permission_enum not null default 'view_and_book',
  shared_by_membership_id uuid not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint resource_share_different_tenant_chk check (resource_tenant_id <> shared_with_tenant_id),
  constraint resource_share_revoke_time_chk check (is_active or revoked_at is not null),
  constraint resource_share_resource_fk foreign key (resource_tenant_id, resource_id)
    references public.resource(tenant_id, resource_id) on delete cascade,
  constraint resource_share_actor_fk foreign key (resource_tenant_id, shared_by_membership_id)
    references public.tenant_membership(tenant_id, membership_id) on delete restrict,
  constraint resource_share_resource_tenant_uk unique(resource_id, shared_with_tenant_id)
);
create index resource_share_shared_tenant_active_idx on public.resource_share(shared_with_tenant_id, is_active);
create index resource_share_owner_actor_idx on public.resource_share(resource_tenant_id, shared_by_membership_id);
