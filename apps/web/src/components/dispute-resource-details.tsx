import Link from "next/link";

import type { Dispute } from "@/lib/booking-service/types";

export function DisputeResourceDetails({
  dispute,
}: {
  dispute: Dispute;
}) {
  const { resource } = dispute.booking.resourceSlot;
  const startsAt = new Date(dispute.booking.resourceSlot.startsAt);
  const endsAt = new Date(dispute.booking.resourceSlot.endsAt);
  const dateTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="grid gap-1 text-sm">
      <Link
        className="w-fit font-medium underline-offset-4 hover:underline"
        href={`/dashboard/resources/${resource.id}?organization=${encodeURIComponent(resource.ownerOrganizationId)}`}
      >
        {resource.name}
      </Link>
      <p className="text-muted-foreground">
        {resource.ownerOrganization.name}
      </p>
      <p className="text-muted-foreground">
        <time dateTime={startsAt.toISOString()}>{dateTime.format(startsAt)}</time>
        {" – "}
        <time dateTime={endsAt.toISOString()}>{dateTime.format(endsAt)}</time>
      </p>
    </div>
  );
}
