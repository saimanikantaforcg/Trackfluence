import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { FTCCheckDto } from './dto/compliance.dto';

@ApiTags('Compliance & Trust')
@Controller('api/v1/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('ftc/check')
  @ApiOperation({ summary: 'Run FTC compliance check on content' })
  async checkFTC(@Body() dto: FTCCheckDto) {
    return this.complianceService.runFTCCheck(dto);
  }

  @Get('ftc/creators')
  @ApiOperation({ summary: 'Get compliance overview for all creators' })
  async getAllCreatorCompliance() {
    return this.complianceService.getAllCreatorCompliance();
  }

  @Get('ftc/creator/:creatorId')
  @ApiOperation({ summary: 'Get compliance history for a creator' })
  async getCreatorCompliance(@Param('creatorId') creatorId: string) {
    return this.complianceService.getCreatorCompliance(creatorId);
  }

  @Get('ftc/summary')
  @ApiOperation({ summary: 'Get overall compliance summary' })
  async getSummary() {
    return this.complianceService.getComplianceSummary();
  }
}
