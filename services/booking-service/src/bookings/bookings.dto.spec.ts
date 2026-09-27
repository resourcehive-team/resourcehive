import { ValidationPipe } from '@nestjs/common';
import { GetUserBookingsDto, GetOrgBookingsDto } from './bookings.dto';

describe('Booking pagination query validation', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  for (const metatype of [GetUserBookingsDto, GetOrgBookingsDto]) {
    it(`converts numeric query strings for ${metatype.name}`, async () => {
      const result = await pipe.transform({ skip: '0', take: '20' }, { type: 'query', metatype });
      expect(result).toMatchObject({ skip: 0, take: 20 });
    });
    it(`rejects invalid pagination for ${metatype.name}`, async () => {
      for (const query of [{ skip: '-1' }, { take: '0' }, { take: 'abc' }, { take: '1.5' }]) {
        await expect(pipe.transform(query, { type: 'query', metatype })).rejects.toThrow();
      }
    });
  }
});
