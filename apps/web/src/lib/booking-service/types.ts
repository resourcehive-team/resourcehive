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

export interface UserBooking {
  id: string;
  resourceSlotId: string;
  userId: string;
  status: string;
  createdAt: string;
  cancelledAt?: string | null;
  completedAt?: string | null;
  resourceSlot: {
    startsAt: string;
    endsAt: string;
    resource: {
      id: string;
      name: string;
      pointCost: number;
    };
  };
}
