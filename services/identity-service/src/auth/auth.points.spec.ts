import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';

describe('AuthService current user points', () => {
  const userPointBalance = {
    findUnique: jest.fn(),
  };
  const prisma = {
    userPointBalance,
  } as unknown as PrismaService;
  const service = new AuthService(
    prisma,
    new JwtService(),
    {} as EmailService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the projected balance for the authenticated user', async () => {
    userPointBalance.findUnique.mockResolvedValue({
      availablePoints: 75,
      updatedAt: new Date('2026-08-19T10:30:00.000Z'),
    });

    await expect(service.getCurrentUserPoints('user-id')).resolves.toEqual({
      userId: 'user-id',
      availablePoints: 75,
      updatedAt: '2026-08-19T10:30:00.000Z',
    });
    expect(userPointBalance.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      select: {
        availablePoints: true,
        updatedAt: true,
      },
    });
  });

  it('returns zero when the user has no point transactions yet', async () => {
    userPointBalance.findUnique.mockResolvedValue(null);

    await expect(service.getCurrentUserPoints('new-user-id')).resolves.toEqual({
      userId: 'new-user-id',
      availablePoints: 0,
      updatedAt: null,
    });
  });
});
