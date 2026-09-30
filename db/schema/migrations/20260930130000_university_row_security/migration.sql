BEGIN;

-- Non-login capability roles. Neon login roles are created separately and are
-- granted membership in one of these groups.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'resourcehive_tenant') THEN
        CREATE ROLE resourcehive_tenant NOLOGIN NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'resourcehive_auth') THEN
        CREATE ROLE resourcehive_auth NOLOGIN NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'resourcehive_worker') THEN
        CREATE ROLE resourcehive_worker NOLOGIN NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'resourcehive_platform_report') THEN
        CREATE ROLE resourcehive_platform_report NOLOGIN NOBYPASSRLS;
    END IF;
END $$;

ALTER TABLE resource_slots ADD COLUMN root_organization_id UUID;
UPDATE resource_slots rs
SET root_organization_id = r.root_organization_id
FROM resources r
WHERE r.id = rs.resource_id;
ALTER TABLE resource_slots ALTER COLUMN root_organization_id SET NOT NULL;
ALTER TABLE resource_slots
    ADD CONSTRAINT resource_slots_id_root_unique UNIQUE (id, root_organization_id),
    ADD CONSTRAINT resource_slots_resource_root_fk
        FOREIGN KEY (resource_id, root_organization_id)
        REFERENCES resources (id, root_organization_id);

ALTER TABLE bookings ADD COLUMN root_organization_id UUID;
UPDATE bookings b
SET root_organization_id = r.root_organization_id
FROM resource_slots rs
JOIN resources r ON r.id = rs.resource_id
WHERE rs.id = b.resource_slot_id;
ALTER TABLE bookings ALTER COLUMN root_organization_id SET NOT NULL;
ALTER TABLE bookings
    ADD CONSTRAINT bookings_id_user_root_unique
        UNIQUE (id, user_id, root_organization_id),
    ADD CONSTRAINT bookings_id_root_unique UNIQUE (id, root_organization_id),
    ADD CONSTRAINT bookings_slot_root_fk
        FOREIGN KEY (resource_slot_id, root_organization_id)
        REFERENCES resource_slots (id, root_organization_id);

ALTER TABLE booking_dispute_events ADD COLUMN root_organization_id UUID;
UPDATE booking_dispute_events event
SET root_organization_id = dispute.root_organization_id
FROM booking_disputes dispute
WHERE dispute.id = event.dispute_id;
ALTER TABLE booking_dispute_events ALTER COLUMN root_organization_id SET NOT NULL;
ALTER TABLE booking_disputes
    ADD CONSTRAINT booking_disputes_id_root_unique UNIQUE (id, root_organization_id);
ALTER TABLE booking_dispute_events
    ADD CONSTRAINT booking_dispute_events_dispute_root_fk
        FOREIGN KEY (dispute_id, root_organization_id)
        REFERENCES booking_disputes (id, root_organization_id);
ALTER TABLE booking_disputes
    ADD CONSTRAINT booking_disputes_booking_root_unique UNIQUE (booking_id, root_organization_id),
    ADD CONSTRAINT booking_disputes_booking_root_fk
        FOREIGN KEY (booking_id, root_organization_id)
        REFERENCES bookings (id, root_organization_id),
    ADD CONSTRAINT booking_disputes_resolver_root_fk
        FOREIGN KEY (resolver_organization_id, root_organization_id)
        REFERENCES organizations (id, root_organization_id);

ALTER TABLE point_transactions ADD COLUMN root_organization_id UUID;
ALTER TABLE point_transactions DISABLE TRIGGER point_transactions_append_only;
UPDATE point_transactions transaction
SET root_organization_id = organization.root_organization_id
FROM organizations organization
WHERE transaction.source_organization_id = organization.id;
UPDATE point_transactions transaction
SET root_organization_id = resource.root_organization_id
FROM bookings booking
JOIN resource_slots slot ON slot.id = booking.resource_slot_id
JOIN resources resource ON resource.id = slot.resource_id
WHERE transaction.booking_id = booking.id
  AND transaction.root_organization_id IS NULL;
ALTER TABLE point_transactions ENABLE TRIGGER point_transactions_append_only;
ALTER TABLE point_transactions
    ADD CONSTRAINT point_transactions_booking_user_root_fk
        FOREIGN KEY (booking_id, user_id, root_organization_id)
        REFERENCES bookings (id, user_id, root_organization_id),
    ADD CONSTRAINT point_transactions_source_root_fk
        FOREIGN KEY (source_organization_id, root_organization_id)
        REFERENCES organizations (id, root_organization_id);

-- Rebuild the projection per university. Keep the old projection as a
-- quarantine copy for review; no application role receives access to it.
ALTER TABLE user_point_balances RENAME TO user_point_balances_legacy_quarantine;
CREATE TABLE user_point_balances (
    user_id UUID NOT NULL REFERENCES users(id),
    root_organization_id UUID NOT NULL REFERENCES organizations(id),
    available_points INTEGER NOT NULL CHECK (available_points >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, root_organization_id)
);
INSERT INTO user_point_balances (user_id, root_organization_id, available_points, updated_at)
SELECT user_id, root_organization_id, SUM(amount)::INTEGER, MAX(created_at)
FROM point_transactions
WHERE root_organization_id IS NOT NULL
GROUP BY user_id, root_organization_id;

CREATE OR REPLACE FUNCTION update_user_point_balance_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.root_organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO user_point_balances (user_id, root_organization_id, available_points, updated_at)
    VALUES (NEW.user_id, NEW.root_organization_id, NEW.amount, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, root_organization_id)
    DO UPDATE SET
        available_points = user_point_balances.available_points + EXCLUDED.available_points,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER TABLE notifications ADD COLUMN root_organization_id UUID;
UPDATE notifications notification
SET root_organization_id = COALESCE(
    (SELECT resource.root_organization_id
     FROM resources resource
     WHERE resource.id = CASE
         WHEN notification.data->>'resourceId' ~* '^[0-9a-f-]{36}$'
         THEN (notification.data->>'resourceId')::uuid END),
    (SELECT organization.root_organization_id
     FROM organizations organization
     WHERE organization.id = CASE
         WHEN notification.data->>'organizationId' ~* '^[0-9a-f-]{36}$'
         THEN (notification.data->>'organizationId')::uuid END),
    (SELECT MIN(organization.root_organization_id::text)::uuid
     FROM organization_memberships membership
     JOIN organizations organization ON organization.id = membership.organization_id
     WHERE membership.user_id = notification.user_id
       AND membership.status = 'APPROVED'
     HAVING COUNT(DISTINCT organization.root_organization_id) = 1)
);

ALTER TABLE notifications
    ADD CONSTRAINT notifications_id_root_unique UNIQUE (id, root_organization_id);

ALTER TABLE notification_deliveries ADD COLUMN root_organization_id UUID;
UPDATE notification_deliveries delivery
SET root_organization_id = COALESCE(
    (SELECT notification.root_organization_id
     FROM notifications notification
     WHERE notification.id = delivery.notification_id),
    (SELECT MIN(organization.root_organization_id::text)::uuid
     FROM organization_memberships membership
     JOIN organizations organization ON organization.id = membership.organization_id
     WHERE membership.user_id = delivery.user_id
       AND membership.status = 'APPROVED'
     HAVING COUNT(DISTINCT organization.root_organization_id) = 1)
);
ALTER TABLE notification_deliveries
    DROP CONSTRAINT notification_deliveries_status_check,
    ADD CONSTRAINT notification_deliveries_status_check
        CHECK (status IN ('QUEUED', 'PROCESSING', 'RETRY_SCHEDULED', 'SENT', 'FAILED', 'QUARANTINED'));
UPDATE notification_deliveries SET status = 'QUARANTINED',
    last_error = 'University could not be determined during tenant isolation backfill'
WHERE root_organization_id IS NULL;
ALTER TABLE notification_deliveries
    ADD CONSTRAINT notification_deliveries_notification_root_fk
        FOREIGN KEY (notification_id, root_organization_id)
        REFERENCES notifications (id, root_organization_id);

ALTER TABLE web_push_subscriptions ADD COLUMN root_organization_id UUID;
UPDATE web_push_subscriptions subscription
SET root_organization_id = (
    SELECT MIN(organization.root_organization_id::text)::uuid
    FROM organization_memberships membership
    JOIN organizations organization ON organization.id = membership.organization_id
    WHERE membership.user_id = subscription.user_id
      AND membership.status = 'APPROVED'
    HAVING COUNT(DISTINCT organization.root_organization_id) = 1
);
UPDATE web_push_subscriptions SET active = false WHERE root_organization_id IS NULL;
DROP INDEX web_push_subscriptions_token_unique;
CREATE UNIQUE INDEX web_push_subscriptions_root_token_unique
    ON web_push_subscriptions (root_organization_id, token);

ALTER TABLE refresh_tokens ADD COLUMN active_root_organization_id UUID;
UPDATE refresh_tokens token
SET active_root_organization_id = (
    SELECT organization.root_organization_id
    FROM organization_memberships membership
    JOIN organizations organization ON organization.id = membership.organization_id
    WHERE membership.user_id = token.user_id
      AND membership.status = 'APPROVED'
    ORDER BY membership.joined_at, membership.id
    LIMIT 1
);

-- Indexes support the common tenant filters and RLS policy predicates.
CREATE INDEX point_transactions_root_user_created_at_idx
    ON point_transactions (root_organization_id, user_id, created_at);
CREATE INDEX user_point_balances_root_idx ON user_point_balances (root_organization_id);
CREATE INDEX notifications_root_user_created_at_idx
    ON notifications (root_organization_id, user_id, created_at);
CREATE INDEX notification_deliveries_root_due_idx
    ON notification_deliveries (root_organization_id, status, next_attempt_at);
CREATE INDEX web_push_subscriptions_root_user_active_idx
    ON web_push_subscriptions (root_organization_id, user_id, active);

GRANT USAGE ON SCHEMA public TO resourcehive_tenant, resourcehive_auth,
    resourcehive_worker, resourcehive_platform_report;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    organizations, organization_email_domains, organization_email_allowlist,
    organization_memberships, organization_membership_audits,
    resources, resource_allowed_organizations, resource_slots, bookings,
    booking_disputes, booking_dispute_events, point_transactions,
    user_point_balances, notifications, notification_deliveries,
    web_push_subscriptions, resource_ratings, users
TO resourcehive_tenant;

GRANT SELECT, INSERT, UPDATE, DELETE ON users, external_identities,
    email_verification_tokens, password_reset_tokens, refresh_tokens,
    organization_memberships, organization_email_allowlist
TO resourcehive_auth;
GRANT SELECT ON organizations, organization_email_domains, organization_memberships
TO resourcehive_auth;
GRANT SELECT ON point_transactions, user_point_balances TO resourcehive_auth;

GRANT SELECT, INSERT ON notifications TO resourcehive_worker;
GRANT SELECT, INSERT, UPDATE ON notification_deliveries TO resourcehive_worker;
GRANT SELECT, UPDATE ON web_push_subscriptions TO resourcehive_worker;
GRANT SELECT, INSERT ON processed_events TO resourcehive_worker;
GRANT SELECT ON users TO resourcehive_worker;

GRANT SELECT ON organizations, organization_memberships, resources,
    resource_slots, bookings TO resourcehive_platform_report;

-- Tenant policies use transaction-local context set by the server after it has
-- verified membership. A missing context evaluates to NULL/false.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_email_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_membership_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allowed_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_dispute_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_point_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_tenant ON organizations TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY organizations_auth ON organizations TO resourcehive_auth
USING (true) WITH CHECK (true);
CREATE POLICY organizations_platform ON organizations TO resourcehive_platform_report
USING (true);

CREATE POLICY email_domains_tenant ON organization_email_domains TO resourcehive_tenant
USING (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id))
WITH CHECK (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id));
CREATE POLICY email_domains_auth ON organization_email_domains TO resourcehive_auth
USING (true);

CREATE POLICY email_allowlist_tenant ON organization_email_allowlist TO resourcehive_tenant
USING (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id))
WITH CHECK (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id));
CREATE POLICY email_allowlist_auth ON organization_email_allowlist TO resourcehive_auth
USING (true) WITH CHECK (true);

CREATE POLICY memberships_tenant ON organization_memberships TO resourcehive_tenant
USING (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id))
WITH CHECK (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id));
CREATE POLICY memberships_auth ON organization_memberships TO resourcehive_auth
USING (true) WITH CHECK (true);
CREATE POLICY memberships_platform ON organization_memberships TO resourcehive_platform_report
USING (true);

CREATE POLICY membership_audits_tenant ON organization_membership_audits TO resourcehive_tenant
USING (EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.id = membership_id
))
WITH CHECK (EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.id = membership_id
));

CREATE POLICY resources_tenant ON resources TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY resources_platform ON resources TO resourcehive_platform_report USING (true);
CREATE POLICY slots_platform ON resource_slots TO resourcehive_platform_report USING (true);

CREATE POLICY allowed_orgs_tenant ON resource_allowed_organizations TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY slots_tenant ON resource_slots TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY bookings_tenant ON bookings TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY bookings_platform ON bookings TO resourcehive_platform_report USING (true);

CREATE POLICY disputes_tenant ON booking_disputes TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY dispute_events_tenant ON booking_dispute_events TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));

CREATE POLICY points_tenant ON point_transactions TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY points_auth ON point_transactions TO resourcehive_auth
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY balances_tenant ON user_point_balances TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY balances_auth ON user_point_balances TO resourcehive_auth
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));

CREATE POLICY notifications_tenant ON notifications TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY notifications_worker ON notifications TO resourcehive_worker
USING (true) WITH CHECK (true);
CREATE POLICY deliveries_tenant ON notification_deliveries TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY deliveries_worker ON notification_deliveries TO resourcehive_worker
USING (true) WITH CHECK (true);
CREATE POLICY push_tenant ON web_push_subscriptions TO resourcehive_tenant
USING (root_organization_id::text = current_setting('app.root_organization_id', true))
WITH CHECK (root_organization_id::text = current_setting('app.root_organization_id', true));
CREATE POLICY push_worker ON web_push_subscriptions TO resourcehive_worker
USING (true) WITH CHECK (true);

CREATE POLICY ratings_tenant ON resource_ratings TO resourcehive_tenant
USING (EXISTS (SELECT 1 FROM resources r WHERE r.id = resource_id))
WITH CHECK (EXISTS (SELECT 1 FROM resources r WHERE r.id = resource_id));

CREATE POLICY users_tenant ON users TO resourcehive_tenant
USING (
    users.id::text = current_setting('app.user_id', true)
    OR EXISTS (
        SELECT 1 FROM organization_memberships m
        JOIN organizations o ON o.id = m.organization_id
        WHERE m.user_id = users.id
    )
)
WITH CHECK (users.id::text = current_setting('app.user_id', true));
CREATE POLICY users_auth ON users TO resourcehive_auth
USING (true) WITH CHECK (true);
CREATE POLICY users_worker ON users TO resourcehive_worker USING (true);

-- These tables remain global identity/session infrastructure and are only
-- granted to the authentication role, never to tenant application roles.
ALTER TABLE external_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY external_identities_auth ON external_identities TO resourcehive_auth
USING (true) WITH CHECK (true);
CREATE POLICY verification_tokens_auth ON email_verification_tokens TO resourcehive_auth
USING (true) WITH CHECK (true);
CREATE POLICY reset_tokens_auth ON password_reset_tokens TO resourcehive_auth
USING (true) WITH CHECK (true);
CREATE POLICY refresh_tokens_auth ON refresh_tokens TO resourcehive_auth
USING (true) WITH CHECK (true);

ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_email_domains FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_email_allowlist FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_membership_audits FORCE ROW LEVEL SECURITY;
ALTER TABLE resources FORCE ROW LEVEL SECURITY;
ALTER TABLE resource_allowed_organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE resource_slots FORCE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_disputes FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_dispute_events FORCE ROW LEVEL SECURITY;
ALTER TABLE point_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE user_point_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE web_push_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE resource_ratings FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE external_identities FORCE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;

COMMIT;
