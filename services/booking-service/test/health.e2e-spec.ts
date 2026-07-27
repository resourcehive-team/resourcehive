import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "@resourcehive/database";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";

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
    await app.init();
  });

  it("returns service and database readiness", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200);
    expect(response.body).toMatchObject({
      service: "booking-service",
      status: "ok",
      database: "connected",
    });
  });

  afterAll(async () => app.close());
});
