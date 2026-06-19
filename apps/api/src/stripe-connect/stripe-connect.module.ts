import { Module } from "@nestjs/common";
import { StripeConnectController } from "./stripe-connect.controller";
import { StripeConnectService } from "./stripe-connect.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [StripeConnectController],
  providers: [StripeConnectService],
  exports: [StripeConnectService],
})
export class StripeConnectModule {}
