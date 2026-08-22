import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtAuthGuard } from "@resourcehive/service-auth";
import request from "supertest";
import { App } from "supertest/types";
import { BookingService } from "../../src/bookings/booking.service";
import { BookingsController } from "../../src/bookings/bookings.controller";

describe("BookingsController (e2e)", () => {
  let app: INestApplication<App>;
  const createBooking = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingService,
          useValue: {
            createBooking,
            completeBooking: jest.fn(),
            cancelBooking: jest.fn(),
            getUserBookings: jest.fn(),
            getOrgBookings: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): { getRequest(): Record<string, unknown> };
        }) {
          context.switchToHttp().getRequest().user = {
            userId: "user-id",
            email: "user@example.edu",
            organizationId: "organization-id",
            role: "member",
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  beforeEach(() => {
    createBooking.mockReset();
  });

  it("creates a booking from only the slot identifier", async () => {
    createBooking.mockResolvedValue({
      id: "booking-id",
      resourceSlotId: "1ce65168-e330-4a82-a95b-72b25e761999",
      resourceId: "resource-id",
      resourceName: "Projector",
      userId: "user-id",
      status: "CONFIRMED",
      startsAt: "2030-08-01T10:00:00.000Z",
      endsAt: "2030-08-01T11:00:00.000Z",
      pointsDeducted: 25,
      createdAt: "2026-08-01T09:00:00.000Z",
    });

    await request(app.getHttpServer())
      .post("/bookings")
      .send({ resourceSlotId: "1ce65168-e330-4a82-a95b-72b25e761999" })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: "booking-id",
          status: "CONFIRMED",
          pointsDeducted: 25,
        });
      });
    expect(createBooking).toHaveBeenCalledWith(
      "1ce65168-e330-4a82-a95b-72b25e761999",
      expect.objectContaining({ userId: "user-id" }),
    );
  });

  it("rejects a malformed slot identifier before the service runs", async () => {
    await request(app.getHttpServer())
      .post("/bookings")
      .send({ resourceSlotId: "not-a-uuid", pointCost: 0 })
      .expect(400);
    expect(createBooking).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await app.close();
  });
});
