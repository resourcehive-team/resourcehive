GRANT SELECT ON organizations, organization_memberships TO resourcehive_worker;
CREATE POLICY organizations_worker ON organizations TO resourcehive_worker
USING (true);
CREATE POLICY memberships_worker ON organization_memberships TO resourcehive_worker
USING (true);

ALTER TABLE notifications
    ADD CONSTRAINT notifications_root_organization_fk
        FOREIGN KEY (root_organization_id) REFERENCES organizations (id);
ALTER TABLE notification_deliveries
    ADD CONSTRAINT notification_deliveries_root_organization_fk
        FOREIGN KEY (root_organization_id) REFERENCES organizations (id);
ALTER TABLE web_push_subscriptions
    ADD CONSTRAINT web_push_subscriptions_root_organization_fk
        FOREIGN KEY (root_organization_id) REFERENCES organizations (id);
