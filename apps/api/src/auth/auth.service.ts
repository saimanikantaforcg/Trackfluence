import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import type { JwtPayload } from './jwt.strategy';

const RESET_TOKEN_TTL_MINUTES = 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly analytics: AnalyticsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        organizations: {
          create: {
            role: 'ADMIN',
            organization: {
              create: {
                name: `${dto.name}'s Organization`,
                slug:
                  dto.email.split('@')[0] +
                  '-' +
                  crypto.randomBytes(4).toString('hex'),
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        currentOrganizationId: true,
        createdAt: true,
      },
    });

    // Set currentOrganizationId to the newly created org
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (membership && !user.currentOrganizationId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { currentOrganizationId: membership.organizationId },
      });
      user.currentOrganizationId = membership.organizationId;
    }

    // Fire-and-forget — don't block registration if email fails
    void this.email.sendWelcome(user.email, user.name);
    this.analytics.track(user.id, 'user.registered', {
      email: user.email,
      name: user.name,
    });
    this.analytics.identify(user.id, {
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return {
      user,
      token: this.sign(
        user.id,
        user.email,
        user.role,
        user.currentOrganizationId ?? undefined,
      ),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    this.analytics.track(user.id, 'user.login', { email: user.email });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        currentOrganizationId: user.currentOrganizationId,
      },
      token: this.sign(
        user.id,
        user.email,
        user.role,
        user.currentOrganizationId,
      ),
    };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        currentOrganizationId: true,
        createdAt: true,
      },
    });
  }

  // ── Forgot password ───────────────────────────────────────
  async forgotPassword(email: string, appBaseUrl: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Silent — don't reveal whether the email exists
    if (!user) return;

    // Invalidate any previous unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = `${appBaseUrl}/reset-password?token=${rawToken}`;
    void this.email.sendPasswordReset(user.email, user.name, resetUrl);
  }

  // ── Reset password ────────────────────────────────────────
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private sign(sub: string, email: string, role: string, orgId?: string) {
    const payload: JwtPayload = { sub, email, role, organizationId: orgId };
    return this.jwt.sign(payload);
  }
}