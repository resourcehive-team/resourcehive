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
import { AppModule } from "../src/app.module";

describe("Notification reads (e2e)", () => {
  let app: INestApplication<App>;
  const notification = { findMany: jest.fn().mockResolvedValue([]) };
  const user = {
    findFirst: jest
      .fn()
      .mockResolvedValue({ id: "00000000-0000-4000-8000-000000000003" }),
  };

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
      .useValue({ notification, user })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it("returns only the authenticated user's notifications", async () => {
    await request(app.getHttpServer())
      .get("/notifications?unreadOnly=true")
      .expect(200)
      .expect([]);
    expect(notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "00000000-0000-4000-8000-000000000003",
          readAt: null,
        },
      }),
    );
  });

  afterAll(async () => app.close());
});
