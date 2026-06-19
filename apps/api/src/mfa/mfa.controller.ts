import { Controller, Post, Get, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { MfaService } from "./mfa.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

interface AuthedRequest {
  user: { sub: string };
}

@ApiTags("MFA")
@Controller("api/v1/mfa")
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly mfa: MfaService) {}

  @Post("enable")
  @ApiOperation({
    summary: "Enable MFA — returns secret, QR URL, and backup codes",
  })
  async enable(@CurrentUser() user: { sub: string }) {
    return this.mfa.enableMfa(user.sub);
  }

  @Post("confirm")
  @ApiOperation({ summary: "Confirm MFA setup with TOTP token" })
  async confirm(
    @CurrentUser() user: { sub: string },
    @Body("token") token: string,
  ) {
    await this.mfa.confirmMfa(user.sub, token);
    return { enabled: true };
  }

  @Post("verify")
  @ApiOperation({ summary: "Verify MFA token during login" })
  async verify(@Body("userId") userId: string, @Body("token") token: string) {
    const valid = await this.mfa.verifyMfa(userId, token);
    if (!valid) {
      // Try backup code
      const backupValid = await this.mfa.verifyBackupCode(userId, token);
      if (!backupValid) {
        throw new Error("Invalid MFA token or backup code");
      }
    }
    return { valid: true };
  }

  @Post("disable")
  @ApiOperation({ summary: "Disable MFA" })
  async disable(@CurrentUser() user: { sub: string }) {
    await this.mfa.disableMfa(user.sub);
    return { disabled: true };
  }

  @Get("status")
  @ApiOperation({ summary: "Get MFA status" })
  async status(@CurrentUser() user: { sub: string }) {
    return this.mfa.getMfaStatus(user.sub);
  }
}
