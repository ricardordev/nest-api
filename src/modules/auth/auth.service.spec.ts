import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    refreshToken: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockJwt: { signAsync: ReturnType<typeof vi.fn> };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    login: 'test-key',
    password: '$2b$10$hashedpassword',
  };

  beforeEach(async () => {
    mockPrisma = {
      user: { findUnique: vi.fn() },
      refreshToken: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    mockJwt = {
      signAsync: vi.fn().mockResolvedValue('mock-access-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    authService = module.get(AuthService);

    vi.clearAllMocks();
  });

  describe('login()', () => {
    it('should authenticate with valid login + password and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (bcrypt.hash as any).mockResolvedValue('hashed-refresh-token');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login({
        login: 'test-key',
        password: '12345678',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { login: 'test-key' },
      });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('should authenticate with valid email + password and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (bcrypt.hash as any).mockResolvedValue('hashed-refresh-token');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login({
        email: 'test@example.com',
        password: '12345678',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException with invalid login + password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        authService.login({ login: 'test-key', password: 'wrong' }),
      ).rejects.toThrow('Invalid API credentials');
    });

    it('should throw UnauthorizedException with invalid email + password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw BadRequestException when no credential pair provided', async () => {
      await expect(authService.login({} as any)).rejects.toThrow(
        'Provide either email+password (front-end) or login+password (API integration)',
      );
    });
  });

  describe('refresh()', () => {
    it('should rotate tokens on valid refresh', async () => {
      const storedToken = {
        id: 'stored-id',
        tokenHash: 'stored-hash',
        lookupKey: expect.any(String) as string,
        userId: 1,
        family: 'family-1',
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        createdAt: new Date(),
        user: mockUser,
      };

      mockPrisma.refreshToken.findMany.mockResolvedValue([storedToken]);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      mockPrisma.refreshToken.update.mockResolvedValue({});
      (bcrypt.hash as any).mockResolvedValue('new-hashed-token');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'stored-id' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException on reused token (replay attack)', async () => {
      const storedToken = {
        id: 'stored-id',
        tokenHash: 'stored-hash',
        lookupKey: expect.any(String) as string,
        userId: 1,
        family: 'family-1',
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        createdAt: new Date(),
        user: mockUser,
      };

      mockPrisma.refreshToken.findMany.mockResolvedValue([storedToken]);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'revoked-in-family',
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});

      await expect(authService.refresh('reused-token')).rejects.toThrow(
        'Token reuse detected — all sessions revoked',
      );

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { family: 'family-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException with empty refresh token', async () => {
      await expect(authService.refresh('')).rejects.toThrow(
        'Refresh token is required',
      );
    });
  });

  describe('logout()', () => {
    it('should revoke all refresh tokens for the user', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});

      await authService.logout(1);

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
