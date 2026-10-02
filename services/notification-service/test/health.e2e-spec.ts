import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "@resourcehive/database";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { setupNotificationSwagger } from "../src/swagger";

describe("Notification service health (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .compile();

    app = moduleRef.createNestApplication();
    setupNotificationSwagger(app);
    await app.init();
  });

  it("returns service and database readiness", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200);
    expect(response.body).toMatchObject({
      service: "notification-service",
      status: "ok",
      database: "connected",
    });
  });

  it("serves the notification OpenAPI document and raw YAML document", async () => {
    const json = await request(app.getHttpServer())
      .get("/docs/notification/openapi.json")
      .expect(200);

    const document = json.body as {
      openapi?: string;
      paths?: Record<string, unknown>;
    };
    expect(document.openapi).toBeDefined();
    expect(document.paths).toHaveProperty("/notifications");
    expect(document.paths).toHaveProperty("/notifications/push-subscriptions");

    const yaml = await request(app.getHttpServer())
      .get("/docs/notification/openapi.yaml")
      .expect(200);
    expect(yaml.text).toContain("openapi:");
  });

  afterAll(async () => app.close());
});
