import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import * as speakeasy from "speakeasy";
import * as crypto from "crypto";

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async enableMfa(
    userId: string,
  ): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    const secret = speakeasy.generateSecret({
      name: `Trackfluence (${userId})`,
      issuer: "Trackfluence",
    });

    const backupCodes = Array.from({ length: 10 }, () =>
      crypto
        .randomBytes(4)
        .toString("hex")
        .slice(0, 8),
    );
    const backupCodeHashes = backupCodes.map((code) =>
      crypto
        .createHash("sha256")
        .update(code)
        .digest("hex"),
    );

    await this.prisma.mfaSecret.create({
      data: {
        userId,
        secret: secret.base32,
        backupCodes: {
          create: backupCodeHashes.map((hash) => ({ codeHash: hash })),
        },
      },
    });

    this.logger.log(`MFA enabled for user ${userId}`);
    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url!,
      backupCodes,
    };
  }

  async verifyMfa(userId: string, token: string): Promise<boolean> {
    const mfaSecret = await this.prisma.mfaSecret.findUnique({
      where: { userId },
      include: { backupCodes: true },
    });

    if (!mfaSecret || !mfaSecret.enabled) {
      return false;
    }

    const isValid = speakeasy.totp.verify({
      secret: mfaSecret.secret,
      encoding: "base32",
      token,
      window: 1,
    });

    return isValid;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const mfaSecret = await this.prisma.mfaSecret.findUnique({
      where: { userId },
      include: { backupCodes: { where: { usedAt: null } } },
    });

    if (!mfaSecret) return false;

    const codeHash = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");
    const backupCode = mfaSecret.backupCodes.find(
      (bc) => bc.codeHash === codeHash,
    );

    if (!backupCode) return false;

    await this.prisma.mfaBackupCode.update({
      where: { id: backupCode.id },
      data: { usedAt: new Date() },
    });

    this.logger.log(`Backup code used for user ${userId}`);
    return true;
  }

  async confirmMfa(userId: string, token: string): Promise<void> {
    const isValid = await this.verifyMfa(userId, token);
    if (!isValid) {
      throw new BadRequestException("Invalid MFA token");
    }

    await this.prisma.mfaSecret.update({
      where: { userId },
      data: { enabled: true },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    this.logger.log(`MFA confirmed for user ${userId}`);
  }

  async disableMfa(userId: string): Promise<void> {
    await this.prisma.mfaSecret.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false },
    });

    this.logger.log(`MFA disabled for user ${userId}`);
  }

  async getMfaStatus(
    userId: string,
  ): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
    const mfaSecret = await this.prisma.mfaSecret.findUnique({
      where: { userId },
      include: { backupCodes: { where: { usedAt: null } } },
    });

    return {
      enabled: mfaSecret?.enabled ?? false,
      backupCodesRemaining: mfaSecret?.backupCodes.length ?? 0,
    };
  }
}
