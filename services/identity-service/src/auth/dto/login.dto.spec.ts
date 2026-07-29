import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('preserves valid credentials when the validation pipe transforms them', async () => {
    const input = plainToInstance(LoginDto, {
      email: ' Demo@Example.EDU ',
      password: 'DemoPassword123!',
    });

    await expect(validate(input)).resolves.toHaveLength(0);
    expect(input).toEqual({
      email: 'demo@example.edu',
      password: 'DemoPassword123!',
    });
  });

  it('rejects invalid login fields', async () => {
    const input = plainToInstance(LoginDto, {
      email: 'not-an-email',
      password: '',
    });

    await expect(validate(input)).resolves.not.toHaveLength(0);
  });
});
