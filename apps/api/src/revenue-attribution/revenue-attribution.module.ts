import { Module } from '@nestjs/common';
import { RevenueAttributionController } from './revenue-attribution.controller';
import { RevenueAttributionService } from './revenue-attribution.service';

@Module({
  controllers: [RevenueAttributionController],
  providers: [RevenueAttributionService],
  exports: [RevenueAttributionService],
})
export class RevenueAttributionModule {}
