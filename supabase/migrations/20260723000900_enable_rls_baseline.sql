-- ResourceHive migration 09: conservative RLS baseline.
-- Mutating bookings, wallets, ledgers and administrative records remains backend-only.

create or replace function public.is_active_member(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_membership
    where person_id = auth.uid() and tenant_id = p_tenant_id and status = 'active'
  );
$$;

create or replace function public.can_read_resource(p_resource_id uuid, p_owner_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_member(p_owner_tenant_id) or exists (
    select 1
    from public.resource_share rs
    join public.tenant_membership tm on tm.tenant_id = rs.shared_with_tenant_id
    where rs.resource_id = p_resource_id
      and rs.resource_tenant_id = p_owner_tenant_id
      and rs.is_active
      and tm.person_id = auth.uid()
      and tm.status = 'active'
  );
$$;

revoke all on function public.is_active_member(uuid) from public;
revoke all on function public.can_read_resource(uuid, uuid) from public;
grant execute on function public.is_active_member(uuid) to authenticated;
grant execute on function public.can_read_resource(uuid, uuid) to authenticated;

alter table public.platform_admin enable row level security;
alter table public.person enable row level security;
alter table public.tenant enable row level security;
alter table public.organization_domain enable row level security;
alter table public.tenant_membership enable row level security;
alter table public.resource_category enable row level security;
alter table public.resource enable row level security;
alter table public.resource_image enable row level security;
alter table public.availability_rule enable row level security;
alter table public.availability_rule_day enable row level security;
alter table public.availability_exception enable row level security;
alter table public.resource_share enable row level security;
alter table public.booking enable row level security;
alter table public.point_wallet enable row level security;
alter table public.semester enable row level security;
alter table public.tenant_semester_grant_policy enable row level security;
alter table public.point_transaction enable row level security;
alter table public.return_confirmation enable row level security;
alter table public.dispute enable row level security;
alter table public.notification enable row level security;
alter table public.admin_action enable row level security;

create policy person_read_own on public.person
for select to authenticated using (person_id = auth.uid());
create policy person_update_own on public.person
for update to authenticated using (person_id = auth.uid()) with check (person_id = auth.uid());
create policy membership_read_own on public.tenant_membership
for select to authenticated using (person_id = auth.uid());
create policy wallet_read_own on public.point_wallet
for select to authenticated using (person_id = auth.uid());
create policy point_transaction_read_own on public.point_transaction
for select to authenticated using (person_id = auth.uid());
create policy notification_read_own on public.notification
for select to authenticated using (recipient_person_id = auth.uid());
create policy notification_update_own on public.notification
for update to authenticated using (recipient_person_id = auth.uid())
with check (recipient_person_id = auth.uid());

create policy tenant_read_for_member on public.tenant
for select to authenticated using (
  public.is_active_member(tenant_id) or public.is_active_member(organization_tenant_id)
);
create policy resource_read_owned_or_shared on public.resource
for select to authenticated using (public.can_read_resource(resource_id, tenant_id));
create policy resource_category_read_for_member on public.resource_category
for select to authenticated using (public.is_active_member(tenant_id));
create policy resource_image_read_with_resource on public.resource_image
for select to authenticated using (public.can_read_resource(resource_id, tenant_id));
create policy availability_rule_read_with_resource on public.availability_rule
for select to authenticated using (public.can_read_resource(resource_id, tenant_id));
create policy availability_exception_read_with_resource on public.availability_exception
for select to authenticated using (public.can_read_resource(resource_id, tenant_id));
create policy booking_read_participant on public.booking
for select to authenticated using (
  borrower_person_id = auth.uid() or public.is_active_member(resource_tenant_id)
);

-- No direct client INSERT/UPDATE/DELETE policies are granted for operational
-- tables. Add reviewed backend transactions or SECURITY DEFINER RPCs later.
