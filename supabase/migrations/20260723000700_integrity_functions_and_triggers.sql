-- ResourceHive migration 07: cross-row integrity functions and triggers

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger platform_admin_set_updated_at before update on public.platform_admin for each row execute function public.set_updated_at();
create trigger person_set_updated_at before update on public.person for each row execute function public.set_updated_at();
create trigger tenant_set_updated_at before update on public.tenant for each row execute function public.set_updated_at();
create trigger tenant_membership_set_updated_at before update on public.tenant_membership for each row execute function public.set_updated_at();
create trigger resource_category_set_updated_at before update on public.resource_category for each row execute function public.set_updated_at();
create trigger resource_set_updated_at before update on public.resource for each row execute function public.set_updated_at();
create trigger availability_rule_set_updated_at before update on public.availability_rule for each row execute function public.set_updated_at();
create trigger booking_set_updated_at before update on public.booking for each row execute function public.set_updated_at();
create trigger point_wallet_set_updated_at before update on public.point_wallet for each row execute function public.set_updated_at();
create trigger dispute_set_updated_at before update on public.dispute for each row execute function public.set_updated_at();

create or replace function public.validate_organization_tenant_reference()
returns trigger language plpgsql set search_path = '' as $$
declare v_type public.tenant_type_enum;
begin
  select tenant_type into v_type from public.tenant where tenant_id = new.organization_tenant_id;
  if v_type is distinct from 'organization' then
    raise exception 'organization_tenant_id must reference an organization tenant';
  end if;
  return new;
end;
$$;
create trigger organization_domain_validate_org before insert or update on public.organization_domain
for each row execute function public.validate_organization_tenant_reference();
create trigger semester_validate_org before insert or update on public.semester
for each row execute function public.validate_organization_tenant_reference();

create or replace function public.validate_tenant_hierarchy()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_parent public.tenant%rowtype;
  v_cycle boolean;
begin
  if new.tenant_type = 'organization' then
    if new.parent_tenant_id is not null
      or new.organization_tenant_id <> new.tenant_id
      or new.faculty_tenant_id is not null
      or new.department_tenant_id is not null then
      raise exception 'Invalid organization tenant hierarchy';
    end if;
    return new;
  end if;

  select * into v_parent from public.tenant where tenant_id = new.parent_tenant_id;
  if not found then raise exception 'Parent tenant does not exist'; end if;
  if v_parent.organization_tenant_id <> new.organization_tenant_id then
    raise exception 'Parent and child must belong to the same organization';
  end if;

  if tg_op = 'UPDATE' then
    with recursive ancestors as (
      select tenant_id, parent_tenant_id from public.tenant where tenant_id = new.parent_tenant_id
      union all
      select t.tenant_id, t.parent_tenant_id
      from public.tenant t join ancestors a on t.tenant_id = a.parent_tenant_id
    )
    select exists(select 1 from ancestors where tenant_id = new.tenant_id) into v_cycle;
    if v_cycle then raise exception 'Tenant hierarchy cycle detected'; end if;
  end if;

  if new.tenant_type = 'faculty' then
    if v_parent.tenant_type <> 'organization'
      or new.faculty_tenant_id <> new.tenant_id
      or new.department_tenant_id is not null then
      raise exception 'Faculty must be a direct child of an organization';
    end if;
  elsif new.tenant_type = 'department' then
    if v_parent.tenant_type <> 'faculty'
      or new.faculty_tenant_id <> v_parent.tenant_id
      or new.department_tenant_id <> new.tenant_id then
      raise exception 'Department must be a direct child of its faculty';
    end if;
  elsif new.tenant_type in ('club','society') then
    if new.faculty_tenant_id is distinct from v_parent.faculty_tenant_id
      or new.department_tenant_id is distinct from v_parent.department_tenant_id then
      raise exception 'Club/society ancestor columns must match its parent';
    end if;
  end if;
  return new;
end;
$$;
create constraint trigger tenant_validate_hierarchy after insert or update on public.tenant
deferrable initially deferred for each row execute function public.validate_tenant_hierarchy();

create or replace function public.validate_resource_share_same_organization()
returns trigger language plpgsql set search_path = '' as $$
declare v_owner_org uuid; v_shared_org uuid;
begin
  select organization_tenant_id into v_owner_org from public.tenant where tenant_id = new.resource_tenant_id;
  select organization_tenant_id into v_shared_org from public.tenant where tenant_id = new.shared_with_tenant_id;
  if v_owner_org is distinct from v_shared_org then
    raise exception 'Resources may only be shared within the same organization';
  end if;
  return new;
end;
$$;
create trigger resource_share_same_org before insert or update on public.resource_share
for each row execute function public.validate_resource_share_same_organization();

create or replace function public.validate_booking_participants()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_person uuid;
  v_borrower_status public.membership_status_enum;
  v_confirmer_tenant uuid;
  v_confirmer_role public.membership_role_enum;
  v_confirmer_status public.membership_status_enum;
begin
  select person_id, status into v_person, v_borrower_status
  from public.tenant_membership
  where membership_id = new.borrower_membership_id and tenant_id = new.borrower_tenant_id;
  if v_person is distinct from new.borrower_person_id or v_borrower_status is distinct from 'active' then
    raise exception 'Borrower must own an active borrower membership';
  end if;

  if new.status = 'confirmed' then
    if new.confirmed_by_membership_id is null then
      raise exception 'A confirmed booking requires a confirming membership';
    end if;
    select tenant_id, role, status
      into v_confirmer_tenant, v_confirmer_role, v_confirmer_status
    from public.tenant_membership where membership_id = new.confirmed_by_membership_id;
    if v_confirmer_tenant is distinct from new.resource_tenant_id
      or v_confirmer_role is distinct from 'admin'
      or v_confirmer_status is distinct from 'active' then
      raise exception 'Booking confirmer must be an active resource-tenant admin';
    end if;
  end if;
  return new;
end;
$$;
create trigger booking_validate_participants before insert or update on public.booking
for each row execute function public.validate_booking_participants();

create or replace function public.validate_return_confirmer()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_booking public.booking%rowtype;
  v_tenant_id uuid;
  v_status public.membership_status_enum;
begin
  select * into v_booking from public.booking where booking_id = new.booking_id;
  select tenant_id, status into v_tenant_id, v_status
    from public.tenant_membership where membership_id = new.confirmer_membership_id;
  if v_status is distinct from 'active' then
    raise exception 'Return confirmer membership must be active';
  end if;
  if new.confirmer_role = 'borrower'
    and new.confirmer_membership_id <> v_booking.borrower_membership_id then
    raise exception 'Borrower confirmation must use the booking borrower membership';
  elsif new.confirmer_role = 'lender'
    and v_tenant_id is distinct from v_booking.resource_tenant_id then
    raise exception 'Lender confirmation must come from the resource tenant';
  end if;
  return new;
end;
$$;
create trigger return_confirmation_validate before insert or update on public.return_confirmation
for each row execute function public.validate_return_confirmer();

create or replace function public.prevent_append_only_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception '% is append-only; create a correcting row instead', tg_table_name;
end;
$$;
create trigger point_transaction_append_only before update or delete on public.point_transaction
for each row execute function public.prevent_append_only_change();
create trigger admin_action_append_only before update or delete on public.admin_action
for each row execute function public.prevent_append_only_change();

create or replace function public.validate_booking_status_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = new.status then return new; end if;
  if not (
    (old.status = 'pending' and new.status in ('confirmed','rejected','cancelled')) or
    (old.status = 'confirmed' and new.status in ('completed','cancelled','disputed')) or
    (old.status = 'completed' and new.status = 'disputed')
  ) then
    raise exception 'Invalid booking status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;
create trigger booking_status_transition before update of status on public.booking
for each row execute function public.validate_booking_status_transition();
