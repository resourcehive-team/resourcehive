-- ResourceHive migration 10: complete tenant-aware RLS read policies.
--
-- Public clients receive only the reads needed for Week 2 tenant isolation,
-- plus narrowly scoped self-service updates already introduced in migration 09.
-- Operational writes remain backend/RPC-only until their transactions are built.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admin pa
    where pa.platform_admin_id = (select auth.uid())
      and pa.status = 'active'
  );
$$;

create or replace function private.is_active_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_membership tm
    where tm.person_id = (select auth.uid())
      and tm.tenant_id = p_tenant_id
      and tm.status = 'active'
  );
$$;

create or replace function private.is_active_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_membership tm
    where tm.person_id = (select auth.uid())
      and tm.tenant_id = p_tenant_id
      and tm.role = 'admin'
      and tm.status = 'active'
  );
$$;

create or replace function private.can_read_resource(
  p_resource_id uuid,
  p_owner_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_active_member(p_owner_tenant_id)
    or exists (
      select 1
      from public.resource_share rs
      join public.tenant_membership tm
        on tm.tenant_id = rs.shared_with_tenant_id
      where rs.resource_id = p_resource_id
        and rs.resource_tenant_id = p_owner_tenant_id
        and rs.is_active
        and tm.person_id = (select auth.uid())
        and tm.status = 'active'
    );
$$;

create or replace function private.can_read_resource_category(
  p_category_id uuid,
  p_owner_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_active_member(p_owner_tenant_id)
    or exists (
      select 1
      from public.resource r
      where r.category_id = p_category_id
        and r.tenant_id = p_owner_tenant_id
        and private.can_read_resource(r.resource_id, r.tenant_id)
    );
$$;

create or replace function private.can_read_availability_rule(
  p_availability_rule_id uuid,
  p_owner_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.availability_rule ar
    where ar.availability_rule_id = p_availability_rule_id
      and ar.tenant_id = p_owner_tenant_id
      and private.can_read_resource(ar.resource_id, ar.tenant_id)
  );
$$;

create or replace function private.can_read_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.booking b
    where b.booking_id = p_booking_id
      and (
        b.borrower_person_id = (select auth.uid())
        or private.is_active_tenant_admin(b.resource_tenant_id)
      )
  );
$$;

revoke all on function private.is_platform_admin() from public;
revoke all on function private.is_active_member(uuid) from public;
revoke all on function private.is_active_tenant_admin(uuid) from public;
revoke all on function private.can_read_resource(uuid, uuid) from public;
revoke all on function private.can_read_resource_category(uuid, uuid) from public;
revoke all on function private.can_read_availability_rule(uuid, uuid) from public;
revoke all on function private.can_read_booking(uuid) from public;

grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_active_member(uuid) to authenticated;
grant execute on function private.is_active_tenant_admin(uuid) to authenticated;
grant execute on function private.can_read_resource(uuid, uuid) to authenticated;
grant execute on function private.can_read_resource_category(uuid, uuid) to authenticated;
grant execute on function private.can_read_availability_rule(uuid, uuid) to authenticated;
grant execute on function private.can_read_booking(uuid) to authenticated;

-- RLS filters rows, while ordinary PostgreSQL grants control which operations
-- the API roles may attempt. Keep grants explicit and least-privileged.
grant usage on schema public to authenticated;
grant select on table
  public.platform_admin,
  public.person,
  public.tenant,
  public.organization_domain,
  public.tenant_membership,
  public.resource_category,
  public.resource,
  public.resource_image,
  public.availability_rule,
  public.availability_rule_day,
  public.availability_exception,
  public.resource_share,
  public.booking,
  public.point_wallet,
  public.semester,
  public.tenant_semester_grant_policy,
  public.point_transaction,
  public.return_confirmation,
  public.dispute,
  public.notification,
  public.admin_action
to authenticated;
grant update(full_name) on public.person to authenticated;
grant update(is_read, read_at) on public.notification to authenticated;

-- Replace the migration 09 policies so the complete policy set has one
-- documented source of truth.
drop policy if exists person_read_own on public.person;
drop policy if exists person_update_own on public.person;
drop policy if exists membership_read_own on public.tenant_membership;
drop policy if exists wallet_read_own on public.point_wallet;
drop policy if exists point_transaction_read_own on public.point_transaction;
drop policy if exists notification_read_own on public.notification;
drop policy if exists notification_update_own on public.notification;
drop policy if exists tenant_read_for_member on public.tenant;
drop policy if exists resource_read_owned_or_shared on public.resource;
drop policy if exists resource_category_read_for_member on public.resource_category;
drop policy if exists resource_image_read_with_resource on public.resource_image;
drop policy if exists availability_rule_read_with_resource on public.availability_rule;
drop policy if exists availability_exception_read_with_resource on public.availability_exception;
drop policy if exists booking_read_participant on public.booking;

create policy platform_admin_read_self
on public.platform_admin for select to authenticated
using (platform_admin_id = (select auth.uid()));

create policy person_read_self
on public.person for select to authenticated
using (person_id = (select auth.uid()));

create policy person_update_self
on public.person for update to authenticated
using (person_id = (select auth.uid()))
with check (person_id = (select auth.uid()));

create policy tenant_read_member_tree
on public.tenant for select to authenticated
using (
  (select private.is_active_member(tenant_id))
  or (select private.is_active_member(organization_tenant_id))
  or (select private.is_platform_admin())
);

create policy organization_domain_read_organization_member
on public.organization_domain for select to authenticated
using (
  (select private.is_active_member(organization_tenant_id))
  or (select private.is_platform_admin())
);

create policy tenant_membership_read_self_or_tenant_admin
on public.tenant_membership for select to authenticated
using (
  person_id = (select auth.uid())
  or (select private.is_active_tenant_admin(tenant_id))
  or (select private.is_platform_admin())
);

create policy resource_category_read_accessible
on public.resource_category for select to authenticated
using (
  (select private.can_read_resource_category(category_id, tenant_id))
);

create policy resource_read_accessible
on public.resource for select to authenticated
using (
  (select private.can_read_resource(resource_id, tenant_id))
);

create policy resource_image_read_accessible
on public.resource_image for select to authenticated
using (
  (select private.can_read_resource(resource_id, tenant_id))
);

create policy availability_rule_read_accessible
on public.availability_rule for select to authenticated
using (
  (select private.can_read_resource(resource_id, tenant_id))
);

create policy availability_rule_day_read_accessible
on public.availability_rule_day for select to authenticated
using (
  (select private.can_read_availability_rule(availability_rule_id, tenant_id))
);

create policy availability_exception_read_accessible
on public.availability_exception for select to authenticated
using (
  (select private.can_read_resource(resource_id, tenant_id))
);

create policy resource_share_read_participant
on public.resource_share for select to authenticated
using (
  (select private.is_active_member(resource_tenant_id))
  or (select private.is_active_member(shared_with_tenant_id))
  or (select private.is_platform_admin())
);

create policy booking_read_borrower_or_owner_admin
on public.booking for select to authenticated
using (
  borrower_person_id = (select auth.uid())
  or (select private.is_active_tenant_admin(resource_tenant_id))
  or (select private.is_platform_admin())
);

create policy point_wallet_read_self
on public.point_wallet for select to authenticated
using (person_id = (select auth.uid()));

create policy semester_read_organization_member
on public.semester for select to authenticated
using (
  (select private.is_active_member(organization_tenant_id))
  or (select private.is_platform_admin())
);

create policy grant_policy_read_tenant_member
on public.tenant_semester_grant_policy for select to authenticated
using (
  (select private.is_active_member(tenant_id))
  or (select private.is_platform_admin())
);

create policy point_transaction_read_self
on public.point_transaction for select to authenticated
using (person_id = (select auth.uid()));

create policy return_confirmation_read_booking_participant
on public.return_confirmation for select to authenticated
using (
  (select private.can_read_booking(booking_id))
  or (select private.is_platform_admin())
);

create policy dispute_read_booking_participant
on public.dispute for select to authenticated
using (
  (select private.can_read_booking(booking_id))
  or (select private.is_platform_admin())
);

create policy notification_read_self
on public.notification for select to authenticated
using (recipient_person_id = (select auth.uid()));

create policy notification_update_self
on public.notification for update to authenticated
using (recipient_person_id = (select auth.uid()))
with check (recipient_person_id = (select auth.uid()));

create policy admin_action_read_authorized
on public.admin_action for select to authenticated
using (
  (select private.is_active_tenant_admin(authority_tenant_id))
  or (select private.is_platform_admin())
);

-- Supporting indexes for the complete RLS predicate set.
create index if not exists tenant_membership_person_tenant_status_idx
  on public.tenant_membership(person_id, tenant_id, status);
create index if not exists tenant_membership_person_tenant_role_status_idx
  on public.tenant_membership(person_id, tenant_id, role, status);
create index if not exists resource_share_resource_owner_active_idx
  on public.resource_share(resource_id, resource_tenant_id, is_active);
create index if not exists booking_id_borrower_idx
  on public.booking(booking_id, borrower_person_id);
create index if not exists booking_id_resource_tenant_idx
  on public.booking(booking_id, resource_tenant_id);
