BEGIN;

ALTER TABLE booking_disputes
    ADD COLUMN resolver_organization_id UUID;

-- Backfill existing rows to the resource's owning organization, the prior
-- (implicit) resolver, before the column becomes mandatory.
UPDATE booking_disputes bd
SET resolver_organization_id = r.owner_organization_id
FROM bookings b
JOIN resource_slots rs ON rs.id = b.resource_slot_id
JOIN resources r ON r.id = rs.resource_id
WHERE b.id = bd.booking_id;

ALTER TABLE booking_disputes
    ALTER COLUMN resolver_organization_id SET NOT NULL,
    ADD CONSTRAINT booking_disputes_resolver_organization_id_fkey
        FOREIGN KEY (resolver_organization_id) REFERENCES organizations(id);

CREATE INDEX booking_disputes_resolver_org_status_idx
    ON booking_disputes (resolver_organization_id, status);

COMMIT;
