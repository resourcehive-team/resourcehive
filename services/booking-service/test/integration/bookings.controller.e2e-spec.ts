import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '@resourcehive/service-auth';
import request from 'supertest';
import { BookingsController } from '../../src/bookings/bookings.controller';
import { BookingReadService } from '../../src/bookings/booking-read.service';

describe('BookingsController (e2e GET endpoints)', () => {
  let app: INestApplication;
  const getUserBookings = jest.fn();
  const getOrgBookings = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [{ provide: BookingReadService, useValue: { getUserBookings, getOrgBookings } }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            userId: 'user-123',
            email: 'user@example.com',
            organizationId: 'org-456',
            role: 'admin',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getUserBookings.mockReset();
    getOrgBookings.mockReset();
  });

  it('GET /bookings/me returns user bookings', async () => {
    const dummy = [{ id: 'b1' }];
    getUserBookings.mockResolvedValue(dummy);

    await request(app.getHttpServer())
      .get('/bookings/me')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(dummy);
      });

    expect(getUserBookings).toHaveBeenCalledWith('user-123', expect.any(Object));
  });

  it('GET /bookings/org returns org bookings', async () => {
    const dummy = [{ id: 'b2' }];
    getOrgBookings.mockResolvedValue(dummy);

    await request(app.getHttpServer())
      .get('/bookings/org')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(dummy);
      });

    expect(getOrgBookings).toHaveBeenCalledWith(['org-456'], expect.any(Object));
  });
});
