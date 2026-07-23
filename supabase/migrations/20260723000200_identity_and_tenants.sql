-- ResourceHive migration 02: Supabase Auth identities and tenant hierarchy

create table public.platform_admin (
  platform_admin_id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(150) not null,
  email varchar(255) not null,
  status public.platform_admin_status_enum not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index platform_admin_email_lower_uidx on public.platform_admin (lower(email));

create table public.person (
  person_id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(150) not null,
  email varchar(255) not null,
  email_verified_at timestamptz,
  person_status public.person_status_enum not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index person_email_lower_uidx on public.person (lower(email));
create index person_status_idx on public.person(person_status);

create table public.tenant (
  tenant_id uuid primary key default gen_random_uuid(),
  parent_tenant_id uuid,
  tenant_type public.tenant_type_enum not null,
  name varchar(200) not null,
  tenant_status public.tenant_status_enum not null default 'pending_approval',
  requested_by_membership_id uuid,
  approved_by_membership_id uuid,
  created_by_platform_admin_id uuid references public.platform_admin(platform_admin_id) on delete set null,
  organization_tenant_id uuid not null,
  faculty_tenant_id uuid,
  department_tenant_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_not_own_parent_chk check (parent_tenant_id is null or parent_tenant_id <> tenant_id),
  constraint tenant_organization_parent_chk check (
    (tenant_type = 'organization' and parent_tenant_id is null)
    or (tenant_type <> 'organization' and parent_tenant_id is not null)
  ),
  constraint tenant_org_ancestor_chk check (
    (tenant_type = 'organization' and organization_tenant_id = tenant_id)
    or tenant_type <> 'organization'
  ),
  constraint tenant_faculty_ancestor_chk check (
    (tenant_type = 'faculty' and faculty_tenant_id = tenant_id)
    or tenant_type <> 'faculty'
  ),
  constraint tenant_department_ancestor_chk check (
    (tenant_type = 'department' and department_tenant_id = tenant_id)
    or tenant_type <> 'department'
  )
);
alter table public.tenant
  add constraint tenant_parent_fk foreign key (parent_tenant_id) references public.tenant(tenant_id) on delete restrict,
  add constraint tenant_organization_fk foreign key (organization_tenant_id) references public.tenant(tenant_id) on delete restrict,
  add constraint tenant_faculty_fk foreign key (faculty_tenant_id) references public.tenant(tenant_id) on delete restrict,
  add constraint tenant_department_fk foreign key (department_tenant_id) references public.tenant(tenant_id) on delete restrict;
create index tenant_parent_idx on public.tenant(parent_tenant_id);
create index tenant_organization_idx on public.tenant(organization_tenant_id);
create index tenant_faculty_idx on public.tenant(faculty_tenant_id);
create index tenant_department_idx on public.tenant(department_tenant_id);
create index tenant_status_type_idx on public.tenant(tenant_status, tenant_type);
create unique index tenant_org_name_lower_uidx on public.tenant(organization_tenant_id, lower(name));

create table public.organization_domain (
  domain_id uuid primary key default gen_random_uuid(),
  organization_tenant_id uuid not null references public.tenant(tenant_id) on delete cascade,
  domain varchar(255) not null,
  is_verified boolean not null default false,
  verification_method varchar(100),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint organization_domain_verified_time_chk check (not is_verified or verified_at is not null)
);
create unique index organization_domain_lower_uidx on public.organization_domain(organization_tenant_id, lower(domain));
create index organization_domain_verified_idx on public.organization_domain(lower(domain), is_verified);

create table public.tenant_membership (
  membership_id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.person(person_id) on delete cascade,
  tenant_id uuid not null references public.tenant(tenant_id) on delete cascade,
  role public.membership_role_enum not null default 'member',
  status public.membership_status_enum not null default 'pending',
  joined_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by_membership_id uuid references public.tenant_membership(membership_id) on delete set null,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_approval_time_chk check (status <> 'active' or approved_at is not null),
  constraint membership_left_time_chk check (status <> 'left' or left_at is not null),
  constraint tenant_membership_person_tenant_uk unique(person_id, tenant_id),
  constraint tenant_membership_tenant_membership_uk unique(tenant_id, membership_id)
);
create index tenant_membership_tenant_role_status_idx on public.tenant_membership(tenant_id, role, status);
create index tenant_membership_person_status_idx on public.tenant_membership(person_id, status);
alter table public.tenant
  add constraint tenant_requested_by_membership_fk foreign key (requested_by_membership_id) references public.tenant_membership(membership_id) on delete set null,
  add constraint tenant_approved_by_membership_fk foreign key (approved_by_membership_id) references public.tenant_membership(membership_id) on delete set null;
