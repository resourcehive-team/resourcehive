import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyEmailDto } from './verify-email.dto';

describe('VerifyEmailDto', () => {
  it('accepts a verification token', async () => {
    const input = plainToInstance(VerifyEmailDto, {
      token: ` ${'a'.repeat(32)} `,
    });

    await expect(validate(input)).resolves.toHaveLength(0);
    expect(input.token).toBe('a'.repeat(32));
  });

  it('rejects a short verification token', async () => {
    const input = plainToInstance(VerifyEmailDto, { token: 'short' });

    await expect(validate(input)).resolves.not.toHaveLength(0);
  });
});
