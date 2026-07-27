import { Module } from '@nestjs/common';
import { CreatorsController } from './creators.controller';

@Module({
  controllers: [CreatorsController],
})
export class CreatorsModule {}
