-- ResourceHive migration 01: PostgreSQL extensions and enum types

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

create type public.platform_admin_status_enum as enum ('active','suspended','inactive');
create type public.person_status_enum as enum ('active','suspended','inactive','deleted');
create type public.tenant_type_enum as enum ('organization','faculty','department','club','society');
create type public.tenant_status_enum as enum ('pending_approval','active','rejected','suspended','archived');
create type public.membership_role_enum as enum ('member','admin');
create type public.membership_status_enum as enum ('pending','active','suspended','inactive','left');
create type public.resource_status_enum as enum ('pending_approval','available','unavailable','under_maintenance','rejected','archived');
create type public.resource_share_permission_enum as enum ('view_and_book');
create type public.booking_status_enum as enum ('pending','confirmed','rejected','cancelled','completed','disputed');
create type public.point_transaction_type_enum as enum ('semester_grant','booking_charge','refund','adjustment','credit','debit');
create type public.confirmer_role_enum as enum ('borrower','lender');
create type public.dispute_status_enum as enum ('open','under_review','resolved','rejected','escalated');
create type public.notification_type_enum as enum (
  'tenant_membership_created','tenant_membership_approved','tenant_membership_suspended',
  'tenant_approved','tenant_rejected','resource_shared','booking_created',
  'booking_confirmed','booking_rejected','booking_cancelled','return_requested',
  'return_confirmed','resource_overdue','points_granted','points_updated',
  'dispute_opened','dispute_escalated','dispute_resolved','general_announcement'
);
create type public.admin_action_type_enum as enum (
  'approve_tenant','reject_tenant','suspend_tenant','approve_membership',
  'suspend_membership','reactivate_membership','change_membership_role',
  'approve_resource','reject_resource','hide_resource','restore_resource',
  'archive_resource','confirm_booking','reject_booking','resolve_dispute',
  'escalate_dispute','adjust_points','configure_semester_grant'
);
create type public.day_of_week_enum as enum ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
create type public.semester_status_enum as enum ('planned','active','completed','cancelled');
