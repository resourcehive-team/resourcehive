CREATE DATABASE resourcehive;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE "tenant_type_enum" AS ENUM (
  'department',
  'club',
  'society'
);

CREATE TYPE "user_role_enum" AS ENUM (
  'member',
  'admin'
);

CREATE TYPE "user_status_enum" AS ENUM (
  'active',
  'suspended',
  'inactive'
);

CREATE TYPE "resource_status_enum" AS ENUM (
  'pending_approval',
  'available',
  'unavailable',
  'under_maintenance',
  'archived',
  'rejected'
);

CREATE TYPE "booking_status_enum" AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'disputed'
);

CREATE TYPE "transaction_type_enum" AS ENUM (
  'credit',
  'debit',
  'onboarding_grant',
  'semester_grant',
  'booking_charge',
  'refund',
  'adjustment'
);

CREATE TYPE "confirmer_role_enum" AS ENUM (
  'borrower',
  'lender'
);

CREATE TYPE "dispute_status_enum" AS ENUM (
  'open',
  'under_review',
  'resolved',
  'rejected'
);

CREATE TYPE "notification_type_enum" AS ENUM (
  'booking_created',
  'booking_confirmed',
  'booking_cancelled',
  'return_requested',
  'return_confirmed',
  'resource_overdue',
  'points_updated',
  'dispute_opened',
  'dispute_resolved',
  'general_announcement'
);

CREATE TYPE "admin_action_enum" AS ENUM (
  'suspend_user',
  'reactivate_user',
  'change_role',
  'approve_resource',
  'reject_resource',
  'hide_resource',
  'restore_resource',
  'archive_resource',
  'remove_resource',
  'resolve_dispute',
  'adjust_points'
);

CREATE TYPE "day_of_week_enum" AS ENUM (
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
);

CREATE TABLE "tenant" (
  "tenant_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar(150) NOT NULL,
  "tenant_type" tenant_type_enum NOT NULL,
  "institutional_email_domain" varchar(255) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "app_user" (
  "user_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "full_name" varchar(150) NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" text NOT NULL,
  "user_role" user_role_enum NOT NULL DEFAULT 'member',
  "user_status" user_status_enum NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "resource_category" (
  "category_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "resource" (
  "resource_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "owner_id" uuid NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "location" varchar(255),
  "quantity" integer NOT NULL DEFAULT 1,
  "point_cost_per_hour" integer NOT NULL DEFAULT 0,
  "resource_status" resource_status_enum NOT NULL DEFAULT 'pending_approval',
  "requires_approval" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "resource_image" (
  "image_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "resource_id" uuid NOT NULL,
  "image_url" text NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "uploaded_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "availability_rule" (
  "rule_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "resource_id" uuid NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "availability_rule_day" (
  "rule_id" uuid NOT NULL,
  "day_of_week" day_of_week_enum NOT NULL,
  PRIMARY KEY ("rule_id", "day_of_week")
);

CREATE TABLE "availability_exception" (
  "exception_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "resource_id" uuid NOT NULL,
  "exception_date" date NOT NULL,
  "start_time" time,
  "end_time" time,
  "is_available" boolean NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "booking" (
  "booking_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "resource_id" uuid NOT NULL,
  "borrower_id" uuid NOT NULL,
  "start_time" timestamptz NOT NULL,
  "end_time" timestamptz NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "points_charged" integer NOT NULL DEFAULT 0,
  "booking_status" booking_status_enum NOT NULL DEFAULT 'pending',
  "purpose" text,
  "cancellation_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "return_confirmation" (
  "confirmation_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "booking_id" uuid NOT NULL,
  "confirmed_by" uuid NOT NULL,
  "confirmer_role" confirmer_role_enum NOT NULL,
  "condition_notes" text,
  "confirmed_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "point_ledger" (
  "ledger_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "current_balance" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "point_transaction" (
  "transaction_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "ledger_id" uuid NOT NULL,
  "booking_id" uuid,
  "performed_by" uuid,
  "amount" integer NOT NULL,
  "transaction_type" transaction_type_enum NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "notification" (
  "notification_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "booking_id" uuid,
  "notification_type" notification_type_enum NOT NULL,
  "title" varchar(200) NOT NULL,
  "message" text NOT NULL,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "read_at" timestamptz
);

CREATE TABLE "dispute" (
  "dispute_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "booking_id" uuid NOT NULL,
  "opened_by" uuid NOT NULL,
  "resolved_by" uuid,
  "reason" text NOT NULL,
  "resolution_notes" text,
  "dispute_status" dispute_status_enum NOT NULL DEFAULT 'open',
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "resolved_at" timestamptz
);

CREATE TABLE "admin_action" (
  "action_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "tenant_id" uuid NOT NULL,
  "admin_id" uuid NOT NULL,
  "target_user_id" uuid,
  "target_resource_id" uuid,
  "target_booking_id" uuid,
  "target_dispute_id" uuid,
  "target_transaction_id" uuid,
  "action_type" admin_action_enum NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX ON "tenant" ("institutional_email_domain");

CREATE UNIQUE INDEX ON "app_user" ("tenant_id", "email");

CREATE UNIQUE INDEX ON "app_user" ("tenant_id", "user_id");

CREATE INDEX ON "app_user" ("tenant_id");

CREATE UNIQUE INDEX ON "resource_category" ("tenant_id", "name");

CREATE UNIQUE INDEX ON "resource_category" ("tenant_id", "category_id");

CREATE INDEX ON "resource_category" ("tenant_id");

CREATE INDEX ON "resource" ("tenant_id");

CREATE INDEX ON "resource" ("category_id");

CREATE INDEX ON "resource" ("owner_id");

CREATE INDEX ON "resource" ("tenant_id", "resource_status");

CREATE UNIQUE INDEX ON "resource" ("tenant_id", "resource_id");

CREATE INDEX ON "resource_image" ("tenant_id");

CREATE INDEX ON "resource_image" ("resource_id");

CREATE INDEX ON "availability_rule" ("tenant_id");

CREATE INDEX ON "availability_rule" ("resource_id");

CREATE INDEX ON "availability_exception" ("tenant_id");

CREATE INDEX ON "availability_exception" ("resource_id");

CREATE UNIQUE INDEX ON "availability_exception" ("resource_id", "exception_date", "start_time", "end_time");

CREATE INDEX ON "booking" ("tenant_id");

CREATE INDEX ON "booking" ("resource_id");

CREATE INDEX ON "booking" ("borrower_id");

CREATE INDEX ON "booking" ("resource_id", "start_time", "end_time");

CREATE UNIQUE INDEX ON "booking" ("tenant_id", "booking_id");

CREATE INDEX ON "return_confirmation" ("tenant_id");

CREATE INDEX ON "return_confirmation" ("booking_id");

CREATE UNIQUE INDEX ON "return_confirmation" ("booking_id", "confirmer_role");

CREATE UNIQUE INDEX ON "point_ledger" ("tenant_id", "user_id");

CREATE UNIQUE INDEX ON "point_ledger" ("tenant_id", "ledger_id");

CREATE INDEX ON "point_ledger" ("tenant_id");

CREATE INDEX ON "point_transaction" ("tenant_id");

CREATE INDEX ON "point_transaction" ("ledger_id");

CREATE INDEX ON "point_transaction" ("booking_id");

CREATE INDEX ON "point_transaction" ("performed_by");

CREATE UNIQUE INDEX ON "point_transaction" ("tenant_id", "transaction_id");

CREATE INDEX ON "notification" ("tenant_id");

CREATE INDEX ON "notification" ("user_id");

CREATE INDEX ON "notification" ("booking_id");

CREATE INDEX ON "notification" ("user_id", "is_read");

CREATE INDEX ON "dispute" ("tenant_id");

CREATE INDEX ON "dispute" ("booking_id");

CREATE INDEX ON "dispute" ("opened_by");

CREATE INDEX ON "dispute" ("resolved_by");

CREATE UNIQUE INDEX ON "dispute" ("tenant_id", "dispute_id");

CREATE INDEX ON "admin_action" ("tenant_id");

CREATE INDEX ON "admin_action" ("admin_id");

CREATE INDEX ON "admin_action" ("target_user_id");

CREATE INDEX ON "admin_action" ("target_resource_id");

CREATE INDEX ON "admin_action" ("target_booking_id");

CREATE INDEX ON "admin_action" ("target_dispute_id");

CREATE INDEX ON "admin_action" ("target_transaction_id");

COMMENT ON TABLE "resource" IS 'quantity >= 1 and point_cost_per_hour >= 0. Default status is pending_approval until a tenant admin approves the listing (see admin_action). Project decision: quantity is treated as always 1 per resource row for this timeline — list identical items (e.g. 5 calculators) as 5 separate resource rows rather than one row with quantity=5, so the single btree_gist exclusion constraint (Week 6, Person B) is sufficient without a capacity-counting trigger.';

COMMENT ON TABLE "resource_image" IS 'Add a partial unique index (see migration SQL) so only one image per resource can have is_primary = true.';

COMMENT ON TABLE "availability_rule" IS 'end_time must be later than start_time';

COMMENT ON TABLE "availability_exception" IS 'Use is_available = false for closures such as holidays or maintenance';

COMMENT ON TABLE "booking" IS 'end_time must be later than start_time; quantity >= 1. Overlap protection is enforced via a btree_gist EXCLUDE constraint added in migration SQL, not expressible in DBML.';

ALTER TABLE "app_user" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "resource_category" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "resource" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "resource" ADD FOREIGN KEY ("tenant_id", "category_id") REFERENCES "resource_category" ("tenant_id", "category_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "resource" ADD FOREIGN KEY ("tenant_id", "owner_id") REFERENCES "app_user" ("tenant_id", "user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "resource_image" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "resource_image" ADD FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "resource" ("tenant_id", "resource_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "availability_rule" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "availability_rule" ADD FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "resource" ("tenant_id", "resource_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "availability_rule_day" ADD FOREIGN KEY ("rule_id") REFERENCES "availability_rule" ("rule_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "availability_exception" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "availability_exception" ADD FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "resource" ("tenant_id", "resource_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "resource" ("tenant_id", "resource_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("tenant_id", "borrower_id") REFERENCES "app_user" ("tenant_id", "user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "return_confirmation" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "return_confirmation" ADD FOREIGN KEY ("tenant_id", "booking_id") REFERENCES "booking" ("tenant_id", "booking_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "return_confirmation" ADD FOREIGN KEY ("tenant_id", "confirmed_by") REFERENCES "app_user" ("tenant_id", "user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "point_ledger" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "point_ledger" ADD FOREIGN KEY ("tenant_id", "user_id") REFERENCES "app_user" ("tenant_id", "user_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "point_transaction" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "point_transaction" ADD FOREIGN KEY ("tenant_id", "ledger_id") REFERENCES "point_ledger" ("tenant_id", "ledger_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "point_transaction" ADD FOREIGN KEY ("tenant_id", "booking_id") REFERENCES "booking" ("tenant_id", "booking_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "point_transaction" ADD FOREIGN KEY ("tenant_id", "performed_by") REFERENCES "app_user" ("tenant_id", "user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification" ADD FOREIGN KEY ("tenant_id", "user_id") REFERENCES "app_user" ("tenant_id", "user_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification" ADD FOREIGN KEY ("tenant_id", "booking_id") REFERENCES "booking" ("tenant_id", "booking_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "dispute" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "dispute" ADD FOREIGN KEY ("tenant_id", "booking_id") REFERENCES "booking" ("tenant_id", "booking_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "dispute" ADD FOREIGN KEY ("tenant_id", "opened_by") REFERENCES "app_user" ("tenant_id", "user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "dispute" ADD FOREIGN KEY ("tenant_id", "resolved_by") REFERENCES "app_user" ("tenant_id", "user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_action" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("tenant_id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_action" ADD FOREIGN KEY ("tenant_id", "admin_id") REFERENCES "app_user" ("tenant_id", "user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_action" ADD FOREIGN KEY ("tenant_id", "target_user_id") REFERENCES "app_user" ("tenant_id", "user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_action" ADD FOREIGN KEY ("tenant_id", "target_resource_id") REFERENCES "resource" ("tenant_id", "resource_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_action" ADD FOREIGN KEY ("tenant_id", "target_booking_id") REFERENCES "booking" ("tenant_id", "booking_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_action" ADD FOREIGN KEY ("tenant_id", "target_dispute_id") REFERENCES "dispute" ("tenant_id", "dispute_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_action" ADD FOREIGN KEY ("tenant_id", "target_transaction_id") REFERENCES "point_transaction" ("tenant_id", "transaction_id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE ROLE app_user_role LOGIN PASSWORD 'pick_a_strong_password';
GRANT CONNECT ON DATABASE resourcehive TO app_user_role;
GRANT USAGE ON SCHEMA public TO app_user_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_role;

ALTER TABLE availability_rule_day ADD COLUMN tenant_id uuid;
UPDATE availability_rule_day ard SET tenant_id = ar.tenant_id
  FROM availability_rule ar WHERE ard.rule_id = ar.rule_id;
ALTER TABLE availability_rule_day ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE availability_rule_day ADD FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_user','resource_category','resource','resource_image',
    'availability_rule','availability_rule_day','availability_exception',
    'booking','return_confirmation','point_ledger','point_transaction',
    'notification','dispute','admin_action'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid) WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'')::uuid)',
      t
    );
  END LOOP;
END $$;


