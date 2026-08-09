import { ValidationPipe } from '@nestjs/common';
import { ForgotPasswordDto } from './forgot-password.dto';

describe('ForgotPasswordDto', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  it('normalizes a valid email address', async () => {
    await expect(
      pipe.transform(
        { email: '  Alex@Example.EDU  ' },
        { type: 'body', metatype: ForgotPasswordDto },
      ),
    ).resolves.toMatchObject({ email: 'alex@example.edu' });
  });

  it('rejects an invalid email address', async () => {
    await expect(
      pipe.transform(
        { email: 'not-an-email' },
        { type: 'body', metatype: ForgotPasswordDto },
      ),
    ).rejects.toBeDefined();
  });
});
