-- Disputes belong to the organization responsible for the booked resource.
-- Correct previous submitter-based assignments without altering review history.
UPDATE booking_disputes AS dispute
SET resolver_organization_id = resource.owner_organization_id
FROM bookings AS booking
JOIN resource_slots AS slot ON slot.id = booking.resource_slot_id
JOIN resources AS resource ON resource.id = slot.resource_id
WHERE dispute.booking_id = booking.id
  AND dispute.root_organization_id = resource.root_organization_id
  AND dispute.resolver_organization_id IS DISTINCT FROM resource.owner_organization_id;
