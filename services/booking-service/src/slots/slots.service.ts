import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@resourcehive/database";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { CreateSlotDto, ListSlotsDto } from "./slot.dto";
import { SlotResourceNotFoundError } from "./slot.errors";
import { SlotRepository } from "./slot.repository";
import { SlotRecord, SlotView } from "./slot.types";

@Injectable()
export class SlotsService {
  constructor(
    private readonly repository: SlotRepository,
    private readonly authorization: BookingAuthorizationService,
  ) {}

  async create(dto: CreateSlotDto, user: AuthenticatedUser): Promise<SlotView> {
    const context = await this.authorization.resolve(user);
    if (dto.endsAt <= dto.startsAt) {
      throw new BadRequestException("endsAt must be later than startsAt");
    }
    const canManage = await this.repository.canManageResource(
      dto.resourceId,
      context.userId,
      context.rootOrganizationId,
    );
    if (!canManage) {
      throw new ForbiddenException("Administrator access is required");
    }
    try {
      const slot = await this.repository.create({
        ...dto,
        rootOrganizationId: context.rootOrganizationId,
      });
      return this.toView(slot);
    } catch (error) {
      if (error instanceof SlotResourceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2004"].includes(error.code)
      ) {
        throw new ConflictException("The slot overlaps an existing slot");
      }
      throw error;
    }
  }

  async findOne(slotId: string, user: AuthenticatedUser): Promise<SlotView> {
    const context = await this.authorization.resolve(user);
    const slot = await this.repository.findById({
      slotId,
      rootOrganizationId: context.rootOrganizationId,
    });
    if (
      !slot ||
      !(await this.repository.canAccessResource(
        slot.resourceId,
        context.userId,
        context.rootOrganizationId,
      ))
    ) {
      throw new NotFoundException("Slot not found");
    }
    return this.toView(slot);
  }

  async list(
    resourceId: string,
    query: ListSlotsDto,
    user: AuthenticatedUser,
  ): Promise<SlotView[]> {
    const context = await this.authorization.resolve(user);
    if (
      query.startsAtOrAfter &&
      query.startsBefore &&
      query.startsBefore <= query.startsAtOrAfter
    ) {
      throw new BadRequestException(
        "startsBefore must be later than startsAtOrAfter",
      );
    }
    const canAccess = await this.repository.canAccessResource(
      resourceId,
      context.userId,
      context.rootOrganizationId,
    );
    if (!canAccess) throw new NotFoundException("Resource not found");

    const slots = await this.repository.findByResource({
      resourceId,
      rootOrganizationId: context.rootOrganizationId,
      ...query,
    });
    return slots.map((slot) => this.toView(slot));
  }

  private toView(slot: SlotRecord): SlotView {
    return {
      id: slot.id,
      resourceId: slot.resourceId,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status: slot.status,
      createdAt: slot.createdAt,
      available:
        slot.status === "PUBLISHED" &&
        slot.resource.status === "ACTIVE" &&
        slot.endsAt > new Date() &&
        slot.bookings.length === 0,
    };
  }
}
