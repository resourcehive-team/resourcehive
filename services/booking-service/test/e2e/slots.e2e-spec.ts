import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "@resourcehive/database";
import { AuthenticatedRequest, JwtAuthGuard } from "@resourcehive/service-auth";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../../src/app.module";

describe("Booking slot availability (e2e)", () => {
  let app: INestApplication<App>;
  const resourceId = "00000000-0000-4000-8000-000000000001";
  const organizationMembership = {
    findFirst: jest.fn().mockResolvedValue({
      organizationId: "00000000-0000-4000-8000-000000000002",
      role: "MEMBER",
      organization: {
        rootOrganizationId: "00000000-0000-4000-8000-000000000002",
      },
    }),
  };
  const resource = {
    findFirst: jest.fn().mockResolvedValue({
      ownerOrganizationId: "00000000-0000-4000-8000-000000000002",
      allowedOrganizations: [],
    }),
  };
  const resourceSlot = { findMany: jest.fn().mockResolvedValue([]) };

  beforeAll(async () => {
    const guard: CanActivate = {
      canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest<AuthenticatedRequest>().user = {
          userId: "00000000-0000-4000-8000-000000000003",
          email: "user@example.edu",
          organizationId: "00000000-0000-4000-8000-000000000002",
          role: "member",
        };
        return true;
      },
    };
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(guard)
      .overrideProvider(PrismaService)
      .useValue({
        organizationMembership,
        resource,
        resourceSlot,
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it("returns tenant-authorized slot availability", async () => {
    await request(app.getHttpServer())
      .get(`/resources/${resourceId}/slots`)
      .expect(200)
      .expect([]);
    expect(resourceSlot.findMany).toHaveBeenCalled();
  });

  afterAll(async () => app.close());
});
