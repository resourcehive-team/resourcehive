import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('normalizes a valid signup request', async () => {
    const registration = plainToInstance(RegisterDto, {
      firstName: '  Alex ',
      lastName: ' Student  ',
      email: ' Alex@Example.EDU ',
      password: 'Password123!',
    });

    await expect(validate(registration)).resolves.toHaveLength(0);
    expect(registration).toMatchObject({
      firstName: 'Alex',
      lastName: 'Student',
      email: 'alex@example.edu',
    });
  });

  it('rejects weak passwords and invalid emails', async () => {
    const registration = plainToInstance(RegisterDto, {
      firstName: 'Alex',
      lastName: 'Student',
      email: 'not-an-email',
      password: 'password',
    });

    const errors = await validate(registration);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });
});
