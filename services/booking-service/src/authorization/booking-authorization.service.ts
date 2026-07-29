import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { BookingAuthorizationContext } from "./booking-authorization.types";

@Injectable()
export class BookingAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(user: AuthenticatedUser): Promise<BookingAuthorizationContext> {
    if (!user.organizationId) {
      throw new UnauthorizedException("An active organization is required");
    }
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        userId: user.userId,
        organizationId: user.organizationId,
        status: "APPROVED",
        user: { status: "ACTIVE" },
        organization: { status: "ACTIVE" },
      },
      select: {
        organizationId: true,
        role: true,
        organization: { select: { rootOrganizationId: true } },
      },
    });
    if (!membership) {
      throw new UnauthorizedException(
        "An active approved membership is required",
      );
    }
    return {
      userId: user.userId,
      organizationId: membership.organizationId,
      rootOrganizationId: membership.organization.rootOrganizationId,
      role: membership.role,
    };
  }
}
