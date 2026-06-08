import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RevenueIntelligenceService } from './revenue-intelligence.service';
import { resolveModel } from '../revenue-attribution/revenue-attribution.service';

@ApiTags('Revenue Intelligence')
@Controller('api/v1/revenue-intelligence')
export class RevenueIntelligenceController {
  constructor(private readonly revenueIntelligenceService: RevenueIntelligenceService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get revenue intelligence dashboard metrics' })
  async getDashboard(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('model') model?: string,
  ) {
    return this.revenueIntelligenceService.getDashboardMetrics({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      model: model ? resolveModel(model) : undefined,
    });
  }

  @Get('roas')
  @ApiOperation({ summary: 'Get ROAS metrics' })
  async getRoas(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('model') model?: string,
  ) {
    return this.revenueIntelligenceService.getRoas({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      model: model ? resolveModel(model) : undefined,
    });
  }

  @Get('creators/performance')
  @ApiOperation({ summary: 'Get creator performance leaderboard' })
  async getCreatorPerformance(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.revenueIntelligenceService.getCreatorPerformance({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('cohorts')
  @ApiOperation({ summary: 'Get cohort analysis' })
  async getCohorts(@Query('type') type: string = 'creator') {
    return this.revenueIntelligenceService.getCohortAnalysis(type);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get campaign-level attribution breakdown' })
  async getCampaigns(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.revenueIntelligenceService.getCampaignBreakdown({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('connectors/status')
  @ApiOperation({ summary: 'Get connector sync status' })
  async getConnectorStatus() {
    return this.revenueIntelligenceService.getConnectorStatus();
  }

  @Get('creators/scores')
  @ApiOperation({ summary: 'Get creator performance scores (0-100) with tier ranking' })
  async getCreatorScores() {
    return this.revenueIntelligenceService.getCreatorScores();
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Get monthly revenue timeseries for chart' })
  async getTimeSeries(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.revenueIntelligenceService.getTimeSeries({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Revenue forecast for next N months using linear regression' })
  async getForecast(@Query('months') months?: string) {
    return this.revenueIntelligenceService.getForecast(months ? parseInt(months, 10) : 3);
  }

  @Get('currency-breakdown')
  @ApiOperation({ summary: 'Revenue breakdown by currency' })
  async getCurrencyBreakdown() {
    return this.revenueIntelligenceService.getCurrencyBreakdown();
  }
}
