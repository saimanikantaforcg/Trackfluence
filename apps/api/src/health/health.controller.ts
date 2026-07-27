import { Controller, Get, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
} from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../auth/public.decorator";

@Public()
@Controller("api/health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: any,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck("database", this.prisma),
      async () => {
        try {
          await this.cacheManager.set("health:ping", Date.now());
          const val = await this.cacheManager.get("health:ping");
          return {
            cache: {
              status: val ? "up" : "down",
            },
          };
        } catch (e) {
          return {
            cache: {
              status: "down",
              message: (e as Error).message,
            },
          };
        }
      },
    ]);
  }
}
