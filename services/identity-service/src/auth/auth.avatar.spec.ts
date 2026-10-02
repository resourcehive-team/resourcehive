import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';

describe('AuthService uploadAvatar', () => {
  const user = {
    update: jest.fn(),
  };

  const prisma = {
    user,
  } as unknown as PrismaService;

  const emailService = {} as EmailService;
  const service = new AuthService(prisma, new JwtService(), emailService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the user avatarUrl', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: 'http://example.com/avatar.png',
    };
    user.update.mockResolvedValue(mockUser);

    const result = await service.uploadAvatar(
      'user-1',
      'http://example.com/avatar.png',
    );

    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarUrl: 'http://example.com/avatar.png' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });
    expect(result).toEqual(mockUser);
  });
});
