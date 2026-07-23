begin;

select plan(8);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_tables
    where schemaname = 'public'
      and tablename in (
        'platform_admin', 'person', 'tenant', 'organization_domain',
        'tenant_membership', 'resource_category', 'resource', 'resource_image',
        'availability_rule', 'availability_rule_day', 'availability_exception',
        'resource_share', 'booking', 'point_wallet', 'semester',
        'tenant_semester_grant_policy', 'point_transaction',
        'return_confirmation', 'dispute', 'notification', 'admin_action'
      )
  ),
  21,
  'all 21 ResourceHive tables exist'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
      and c.relname in (
        'platform_admin', 'person', 'tenant', 'organization_domain',
        'tenant_membership', 'resource_category', 'resource', 'resource_image',
        'availability_rule', 'availability_rule_day', 'availability_exception',
        'resource_share', 'booking', 'point_wallet', 'semester',
        'tenant_semester_grant_policy', 'point_transaction',
        'return_confirmation', 'dispute', 'notification', 'admin_action'
      )
  ),
  21,
  'RLS is enabled on every ResourceHive table'
);

select is(
  (
    select count(distinct c.relname)::integer
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'platform_admin', 'person', 'tenant', 'organization_domain',
        'tenant_membership', 'resource_category', 'resource', 'resource_image',
        'availability_rule', 'availability_rule_day', 'availability_exception',
        'resource_share', 'booking', 'point_wallet', 'semester',
        'tenant_semester_grant_policy', 'point_transaction',
        'return_confirmation', 'dispute', 'notification', 'admin_action'
      )
  ),
  21,
  'every ResourceHive table has at least one explicit policy'
);

select has_index(
  'public',
  'tenant_membership',
  'tenant_membership_person_tenant_status_idx',
  'membership lookup used by RLS is indexed'
);

select has_index(
  'public',
  'resource_share',
  'resource_share_resource_owner_active_idx',
  'resource sharing lookup used by RLS is indexed'
);

select has_index(
  'public',
  'booking',
  'booking_no_active_overlap_excl',
  'active booking overlap exclusion constraint has an index'
);

select is_definer(
  'private',
  'is_active_member',
  array['uuid'],
  'membership authorization helper is security definer'
);

select is_definer(
  'private',
  'can_read_booking',
  array['uuid'],
  'booking authorization helper is security definer'
);

select * from finish();
rollback;
