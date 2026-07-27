import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { encrypt, decrypt } from "../../common/crypto.util";

interface SalesforceTokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  issued_at: string;
  scope: string;
  token_type: string;
}

interface SalesforceContact {
  Id?: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Description?: string;
  Trackfluence_Creator_ID__c?: string;
  Trackfluence_Attribution_Source__c?: string;
}

interface SalesforceQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

@Injectable()
export class SalesforceService {
  private readonly logger = new Logger(SalesforceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── OAuth helpers ─────────────────────────────────────────

  buildAuthorizationUrl(state?: string): string {
    const clientId = this.config.get<string>("SALESFORCE_CLIENT_ID");
    const redirectUri = this.config.get<string>("SALESFORCE_REDIRECT_URI");
    const loginUrl = this.config.get<string>(
      "SALESFORCE_LOGIN_URL",
      "https://login.salesforce.com",
    );

    if (!clientId || !redirectUri) {
      throw new BadRequestException("Salesforce OAuth is not configured");
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "api refresh_token",
      ...(state ? { state } : {}),
    });

    return `${loginUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Resolve the token encryption secret.
   * - Missing TOKEN_ENCRYPTION_KEY always fails fast (throws).
   * - No plaintext fallback is allowed.
   */
  private getEncryptionSecret(): string {
    const secret = this.config.get<string>("TOKEN_ENCRYPTION_KEY");
    if (!secret) {
      throw new Error(
        "TOKEN_ENCRYPTION_KEY is required for OAuth token encryption",
      );
    }
    return secret;
  }

  private readonly ENCRYPTED_PREFIX = "enc:v1:";

  /**
   * Check if a value is already encrypted.
   * Accepts both new format (enc:v1:iv:authTag:ciphertext) and legacy format (iv:authTag:ciphertext).
   * Rejects plaintext values.
   */
  private isEncrypted(value: string): boolean {
    // New format with prefix
    if (value.startsWith(this.ENCRYPTED_PREFIX)) return true;
    // Legacy format: contains : separator (iv:authTag:ciphertext)
    if (value.includes(":")) return true;
    return false;
  }

  /**
   * Encrypt a token with the stable prefix format.
   */
  private encryptToken(plaintext: string, secret: string): string {
    return this.ENCRYPTED_PREFIX + encrypt(plaintext, secret);
  }

  /**
   * Decrypt a token, handling both new prefixed and legacy formats.
   */
  private decryptToken(encryptedValue: string, secret: string): string {
    // Strip prefix if present (new format)
    const value = encryptedValue.startsWith(this.ENCRYPTED_PREFIX)
      ? encryptedValue.slice(this.ENCRYPTED_PREFIX.length)
      : encryptedValue;
    return decrypt(value, secret);
  }

  async handleOAuthCallback(
    code: string,
  ): Promise<{ instanceUrl: string; scope: string }> {
    const clientId = this.config.get<string>("SALESFORCE_CLIENT_ID");
    const clientSecret = this.config.get<string>("SALESFORCE_CLIENT_SECRET");
    const redirectUri = this.config.get<string>("SALESFORCE_REDIRECT_URI");
    const loginUrl = this.config.get<string>(
      "SALESFORCE_LOGIN_URL",
      "https://login.salesforce.com",
    );

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException("Salesforce OAuth is not configured");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const res = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      this.logger.error(
        `Salesforce token exchange failed: ${res.status} ${err}`,
      );
      throw new BadRequestException(
        "Failed to exchange Salesforce authorization code",
      );
    }

    const data = (await res.json()) as SalesforceTokenResponse;
    const encryptionSecret = this.getEncryptionSecret();

    // Always encrypt tokens with stable prefix - no plaintext fallback
    const accessToken = this.encryptToken(data.access_token, encryptionSecret);
    const refreshToken = this.encryptToken(
      data.refresh_token,
      encryptionSecret,
    );

    await this.prisma.oAuthToken.upsert({
      where: { provider: "salesforce" },
      create: {
        provider: "salesforce",
        instanceUrl: data.instance_url,
        accessToken,
        refreshToken,
        scope: data.scope,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      update: {
        instanceUrl: data.instance_url,
        accessToken,
        refreshToken,
        scope: data.scope,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Salesforce OAuth connected for ${data.instance_url}`);
    return { instanceUrl: data.instance_url, scope: data.scope };
  }

  async getConnectionStatus(): Promise<{
    connected: boolean;
    instanceUrl?: string;
    scope?: string;
    expiresAt?: Date | null;
  }> {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { provider: "salesforce" },
    });
    if (!token) return { connected: false };
    return {
      connected: true,
      instanceUrl: token.instanceUrl,
      scope: token.scope ?? undefined,
      expiresAt: token.expiresAt,
    };
  }

  async disconnect(): Promise<void> {
    await this.prisma.oAuthToken.deleteMany({
      where: { provider: "salesforce" },
    });
    this.logger.log("Salesforce disconnected");
  }

  private async getAccessToken(): Promise<{
    accessToken: string;
    instanceUrl: string;
  }> {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { provider: "salesforce" },
    });
    if (!token) throw new UnauthorizedException("Salesforce is not connected");

    const encryptionSecret = this.getEncryptionSecret();

    // Fail closed if access token is not encrypted
    if (!this.isEncrypted(token.accessToken)) {
      throw new Error(
        "OAuth token is not encrypted. Run the OAuth token encryption migration before using this connector.",
      );
    }

    const decryptedAccessToken = this.decryptToken(
      token.accessToken,
      encryptionSecret,
    );

    const needsRefresh =
      !token.expiresAt ||
      token.expiresAt < new Date(Date.now() + 5 * 60 * 1000);
    if (!needsRefresh)
      return {
        accessToken: decryptedAccessToken,
        instanceUrl: token.instanceUrl,
      };

    return this.refreshAccessToken(token);
  }

  private async refreshAccessToken(token: {
    id: string;
    refreshToken: string;
    instanceUrl: string;
  }): Promise<{ accessToken: string; instanceUrl: string }> {
    const clientId = this.config.get<string>("SALESFORCE_CLIENT_ID");
    const clientSecret = this.config.get<string>("SALESFORCE_CLIENT_SECRET");
    const loginUrl = this.config.get<string>(
      "SALESFORCE_LOGIN_URL",
      "https://login.salesforce.com",
    );

    if (!clientId || !clientSecret)
      throw new BadRequestException("Salesforce OAuth is not configured");

    const encryptionSecret = this.getEncryptionSecret();

    // Fail closed if refresh token is not encrypted
    if (!this.isEncrypted(token.refreshToken)) {
      throw new Error(
        "OAuth refresh token is not encrypted. Run the OAuth token encryption migration before using this connector.",
      );
    }

    const decryptedRefreshToken = this.decryptToken(
      token.refreshToken,
      encryptionSecret,
    );

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptedRefreshToken,
    });

    const res = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      this.logger.error(`Salesforce token refresh failed: ${res.status}`);
      throw new UnauthorizedException(
        "Salesforce token refresh failed — please reconnect",
      );
    }

    const data = (await res.json()) as SalesforceTokenResponse;

    // Always encrypt the new access token with stable prefix
    const encryptedAccessToken = this.encryptToken(
      data.access_token,
      encryptionSecret,
    );

    await this.prisma.oAuthToken.update({
      where: { id: token.id },
      data: {
        accessToken: encryptedAccessToken,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    this.logger.log("Salesforce access token refreshed");
    return { accessToken: data.access_token, instanceUrl: token.instanceUrl };
  }

  private async sfFetch<T>(
    instanceUrl: string,
    accessToken: string,
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${instanceUrl}/services/data/v60.0${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      throw new Error(`Salesforce API error ${res.status}: ${err}`);
    }

    // PATCH returns 204 No Content
    if (res.status === 204) return (undefined as unknown) as T;
    return res.json() as Promise<T>;
  }

  // ── Contact sync ──────────────────────────────────────────

  async syncContacts() {
    this.logger.log("Starting Salesforce contact sync");

    const syncRecord = await this.prisma.connectorSync.create({
      data: {
        connectorType: "salesforce",
        direction: "outbound",
        status: "PROCESSING",
      },
    });

    try {
      const { accessToken, instanceUrl } = await this.getAccessToken();

      const creators = await this.prisma.creator.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          touchpoints: {
            select: { channel: true },
            take: 1,
            orderBy: { timestamp: "desc" },
          },
        },
        take: 200,
      });

      let upserted = 0;

      for (const creator of creators) {
        if (!creator.email) continue;

        const [firstName, ...rest] = creator.name.split(" ");
        const lastName = rest.join(" ") || firstName;

        const contact: SalesforceContact = {
          FirstName: firstName,
          LastName: lastName,
          Email: creator.email,
          Description: "Synced from Trackfluence",
          Trackfluence_Creator_ID__c: creator.id,
          Trackfluence_Attribution_Source__c:
            creator.touchpoints[0]?.channel ?? "",
        };

        const query = encodeURIComponent(
          `SELECT Id FROM Contact WHERE Email = '${creator.email}' LIMIT 1`,
        );
        const result = await this.sfFetch<
          SalesforceQueryResult<{ Id: string }>
        >(instanceUrl, accessToken, `/query?q=${query}`).catch(() => null);

        if (result && result.records.length > 0) {
          const contactId = result.records[0].Id;
          await this.sfFetch(
            instanceUrl,
            accessToken,
            `/sobjects/Contact/${contactId}`,
            {
              method: "PATCH",
              body: JSON.stringify(contact),
            },
          );
        } else {
          await this.sfFetch<{ id: string }>(
            instanceUrl,
            accessToken,
            "/sobjects/Contact",
            {
              method: "POST",
              body: JSON.stringify(contact),
            },
          );
        }
        upserted++;
      }

      await this.prisma.connectorSync.update({
        where: { id: syncRecord.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          recordsCount: upserted,
        },
      });

      this.logger.log(
        `Salesforce sync complete: ${upserted} contacts upserted`,
      );
      return {
        syncId: syncRecord.id,
        status: "COMPLETED",
        recordsCount: upserted,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.connectorSync.update({
        where: { id: syncRecord.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: message,
        },
      });
      this.logger.error(`Salesforce sync failed: ${message}`);
      throw err;
    }
  }

  async pushToDataCloud(audienceId: string) {
    this.logger.log(`Pushing audience ${audienceId} to Salesforce Data Cloud`);

    const syncRecord = await this.prisma.connectorSync.create({
      data: {
        connectorType: "salesforce_data_cloud",
        direction: "outbound",
        status: "PROCESSING",
        metadata: { audienceId },
      },
    });

    try {
      const audience = await this.prisma.audience.findUnique({
        where: { id: audienceId },
        include: { members: { select: { customerId: true } } },
      });
      if (!audience) throw new Error(`Audience ${audienceId} not found`);

      const { accessToken, instanceUrl } = await this.getAccessToken();
      const members = audience.members.map((m) => m.customerId);

      if (members.length > 0) {
        const body = {
          data: members.map((id) => ({
            trackfluence_id: id,
            audience_name: audience.name,
          })),
        };
        const res = await fetch(
          `${instanceUrl}/services/data/v60.0/ssot/ingest/jobs`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30_000),
          },
        );
        if (!res.ok) {
          const err = await res.text().catch(() => "unknown");
          throw new Error(`Data Cloud ingest failed: ${res.status} ${err}`);
        }
      }

      await this.prisma.connectorSync.update({
        where: { id: syncRecord.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          recordsCount: members.length,
        },
      });

      return {
        syncId: syncRecord.id,
        status: "COMPLETED",
        recordsCount: members.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.connectorSync.update({
        where: { id: syncRecord.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: message,
        },
      });
      throw err;
    }
  }

  async pushToSFMC(audienceId: string) {
    this.logger.log(`Pushing audience ${audienceId} to SFMC`);

    const syncRecord = await this.prisma.connectorSync.create({
      data: {
        connectorType: "sfmc",
        direction: "outbound",
        status: "PROCESSING",
        metadata: { audienceId },
      },
    });

    try {
      const audience = await this.prisma.audience.findUnique({
        where: { id: audienceId },
        include: { members: { select: { customerId: true } } },
      });
      if (!audience) throw new Error(`Audience ${audienceId} not found`);

      const { accessToken, instanceUrl } = await this.getAccessToken();
      const members = audience.members.map((m) => m.customerId);
      const deKey = `TF_Audience_${audienceId}`;

      if (members.length > 0) {
        const body = {
          items: members.map((id) => ({
            PrimaryKey: id,
            AudienceName: audience.name,
          })),
        };
        const res = await fetch(
          `${instanceUrl}/services/data/v60.0/marketing/dataextensions/key:${deKey}/rows`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30_000),
          },
        );
        if (!res.ok) {
          const err = await res.text().catch(() => "unknown");
          throw new Error(`SFMC push failed: ${res.status} ${err}`);
        }
      }

      await this.prisma.connectorSync.update({
        where: { id: syncRecord.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          recordsCount: members.length,
        },
      });

      return {
        syncId: syncRecord.id,
        status: "COMPLETED",
        recordsCount: members.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.connectorSync.update({
        where: { id: syncRecord.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: message,
        },
      });
      throw err;
    }
  }
}
