import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AnalyticsService } from '../analytics/analytics.service';

// ── Helpers ───────────────────────────────────────────────────
const mockUser = {
  id: 'user_1',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'MEMBER',
  // bcrypt hash of "password123"
  passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9bO.6',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
  };
}

function makeJwtMock() {
  return { sign: jest.fn().mockReturnValue('mock.jwt.token') };
}

// ── Tests ─────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let jwt: ReturnType<typeof makeJwtMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    jwt = makeJwtMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: EmailService, useValue: { sendWelcome: jest.fn().mockResolvedValue(undefined) } },
        { provide: AnalyticsService, useValue: { track: jest.fn(), identify: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register ──────────────────────────────────────────────
  describe('register', () => {
    it('creates a new user and returns token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user_new',
        name: 'Bob',
        email: 'bob@example.com',
        role: 'MEMBER',
        createdAt: new Date(),
      });

      const result = await service.register({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'strongpass',
      });

      expect(result.token).toBe('mock.jwt.token');
      expect(result.user.email).toBe('bob@example.com');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({ name: 'Alice', email: 'alice@example.com', password: 'pass' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ─────────────────────────────────────────────────
  describe('login', () => {
    it('returns token for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // bcrypt.compare is async — mock it so test stays fast
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true as never);

      const result = await service.login({
        email: 'alice@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('mock.jwt.token');
      expect(result.user.email).toBe('alice@example.com');
    });

    it('throws UnauthorizedException for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'alice@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── me ────────────────────────────────────────────────────
  describe('me', () => {
    it('returns user profile by id', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
      });

      const result = await service.me('user_1');
      expect(result.id).toBe('user_1');
      expect(result.email).toBe('alice@example.com');
    });
  });
});
