import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "@resourcehive/database";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../../src/app.module";
import { setupBookingSwagger } from "../../src/swagger";

describe("Booking service health (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .compile();

    app = moduleRef.createNestApplication();
    setupBookingSwagger(app);
    await app.init();
  });

  it("returns service and database readiness", async () => {
    const response = await request(app.getHttpServer())
      .get("/health/ready")
      .expect(200);
    expect(response.body).toMatchObject({
      service: "booking-service",
      status: "ok",
      database: "connected",
    });
  });

  it("returns liveness without querying the database", async () => {
    const response = await request(app.getHttpServer())
      .get("/health/live")
      .expect(200);
    expect(response.body).toMatchObject({
      service: "booking-service",
      status: "ok",
    });
  });

  it("serves the booking OpenAPI document and raw YAML document", async () => {
    const json = await request(app.getHttpServer())
      .get("/docs/booking/openapi.json")
      .expect(200);

    const document = json.body as {
      openapi?: string;
      paths?: Record<string, unknown>;
    };
    expect(document.openapi).toBeDefined();
    expect(document.paths).toHaveProperty("/bookings");
    expect(document.paths).toHaveProperty("/slots");

    const yaml = await request(app.getHttpServer())
      .get("/docs/booking/openapi.yaml")
      .expect(200);
    expect(yaml.text).toContain("openapi:");
  });

  afterAll(async () => app.close());
});
