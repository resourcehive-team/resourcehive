import { PrismaService } from "@resourcehive/database";
import { UnauthorizedException } from "@nestjs/common";
import { BookingAuthorizationService } from "./booking-authorization.service";

describe("BookingAuthorizationService", () => {
  const organizationMembership = { findFirst: jest.fn() };
  const service = new BookingAuthorizationService({
    organizationMembership,
  } as unknown as PrismaService);
  const user = {
    userId: "user-id",
    email: "user@example.edu",
    organizationId: "organization-id",
    role: "member",
  };

  beforeEach(() => jest.clearAllMocks());

  it("derives the root tenant from an active approved membership", async () => {
    organizationMembership.findFirst.mockResolvedValue({
      organizationId: "organization-id",
      role: "MEMBER",
      organization: { rootOrganizationId: "root-id" },
    });

    await expect(service.resolve(user)).resolves.toEqual({
      userId: "user-id",
      organizationId: "organization-id",
      rootOrganizationId: "root-id",
      role: "MEMBER",
    });
    expect(organizationMembership.findFirst).toHaveBeenCalledTimes(1);
  });

  it("rejects a token without an active organization", async () => {
    await expect(
      service.resolve({ ...user, organizationId: null }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a suspended user or unapproved membership", async () => {
    organizationMembership.findFirst.mockResolvedValue(null);
    await expect(service.resolve(user)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
