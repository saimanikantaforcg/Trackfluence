import { Module } from "@nestjs/common";
import { AiRecommendationsController } from "./ai-recommendations.controller";
import { AiRecommendationsService } from "./ai-recommendations.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AiRecommendationsController],
  providers: [AiRecommendationsService],
  exports: [AiRecommendationsService],
})
export class AiRecommendationsModule {}
