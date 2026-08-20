import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtAuthGuard } from "@resourcehive/service-auth";
import request from "supertest";
import { BookingCancellationService } from "../../src/bookings/booking-cancellation.service";
import { BookingCompletionService } from "../../src/bookings/booking-completion.service";
import { BookingCreationService } from "../../src/bookings/booking-creation.service";
import { BookingReadService } from "../../src/bookings/booking-read.service";
import { BookingsController } from "../../src/bookings/bookings.controller";

describe("BookingsController (e2e read and completion endpoints)", () => {
  let app: INestApplication;
  const getUserBookings = jest.fn();
  const getOrgBookings = jest.fn();
  const complete = jest.fn();
  const cancel = jest.fn();
  const create = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingReadService,
          useValue: { getUserBookings, getOrgBookings },
        },
        { provide: BookingCreationService, useValue: { create } },
        { provide: BookingCompletionService, useValue: { complete } },
        { provide: BookingCancellationService, useValue: { cancel } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          const req = context.switchToHttp().getRequest();
          req["user"] = {
            userId: "user-123",
            email: "user@example.com",
            organizationId: "org-456",
            role: "admin",
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

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getUserBookings.mockReset();
    getOrgBookings.mockReset();
    complete.mockReset();
    cancel.mockReset();
    create.mockReset();
  });

  it("GET /bookings/me returns user bookings", async () => {
    const dummy = [{ id: "b1" }];
    getUserBookings.mockResolvedValue(dummy);

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get("/bookings/me")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(dummy);
      });

    expect(getUserBookings).toHaveBeenCalledWith(
      "user-123",
      expect.any(Object),
    );
  });

  it("GET /bookings/org returns org bookings", async () => {
    const dummy = [{ id: "b2" }];
    getOrgBookings.mockResolvedValue(dummy);

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get("/bookings/org")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(dummy);
      });

    expect(getOrgBookings).toHaveBeenCalledWith("user-123", expect.any(Object));
  });

  it("PATCH /bookings/:bookingId/complete completes an organization booking", async () => {
    const bookingId = "d5000000-0000-4000-8000-000000000001";
    complete.mockResolvedValue({ id: bookingId, status: "COMPLETED" });

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/bookings/${bookingId}/complete`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: bookingId,
          status: "COMPLETED",
        });
      });

    expect(complete).toHaveBeenCalledWith(bookingId, "user-123");
  });

  it("PATCH /bookings/:bookingId/cancel cancels and refunds a booking", async () => {
    const bookingId = "d5000000-0000-4000-8000-000000000001";
    cancel.mockResolvedValue({
      id: bookingId,
      status: "CANCELLED",
      refundPoints: 25,
      slotStatus: "WITHDRAWN",
    });

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/bookings/${bookingId}/cancel`)
      .send({
        reason: "Resource unavailable",
        makeSlotAvailable: false,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: bookingId,
          status: "CANCELLED",
          refundPoints: 25,
          slotStatus: "WITHDRAWN",
        });
      });

    expect(cancel).toHaveBeenCalledWith(bookingId, "user-123", {
      reason: "Resource unavailable",
      makeSlotAvailable: false,
    });
  });
});
