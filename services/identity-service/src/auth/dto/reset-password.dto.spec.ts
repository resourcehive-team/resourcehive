import { ValidationPipe } from '@nestjs/common';
import { ResetPasswordDto } from './reset-password.dto';

describe('ResetPasswordDto', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  it('accepts a reset token and strong password', async () => {
    await expect(
      pipe.transform(
        {
          token: 'a'.repeat(43),
          password: 'NewPassword123!',
        },
        { type: 'body', metatype: ResetPasswordDto },
      ),
    ).resolves.toMatchObject({
      token: 'a'.repeat(43),
      password: 'NewPassword123!',
    });
  });

  it('rejects a weak password or short token', async () => {
    await expect(
      pipe.transform(
        { token: 'short', password: 'password' },
        { type: 'body', metatype: ResetPasswordDto },
      ),
    ).rejects.toBeDefined();
  });
});
