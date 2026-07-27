export interface SlotLookup {
  slotId: string;
  rootOrganizationId: string;
}

export interface SlotListQuery {
  resourceId: string;
  rootOrganizationId: string;
  startsAtOrAfter?: Date;
  startsBefore?: Date;
  skip?: number;
  take?: number;
}

export interface CreateSlotInput {
  resourceId: string;
  rootOrganizationId: string;
  startsAt: Date;
  endsAt: Date;
}

export interface SlotRecord {
  id: string;
  resourceId: string;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  resource: {
    id: string;
    name: string;
    status: string;
    rootOrganizationId: string;
    ownerOrganizationId: string;
    pointCost: number;
  };
}
