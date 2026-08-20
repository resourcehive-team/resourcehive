export interface ResourceSlot {
  id: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  available: boolean;
}

export interface CreatedBooking {
  id: string;
  resourceSlotId: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  pointsDeducted: number;
  createdAt: string;
}
