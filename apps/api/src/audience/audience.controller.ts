import { Controller, Get, Post, Delete, Param, Body, HttpCode, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AudienceService } from './audience.service';
import { CreateAudienceDto, ExportAudienceDto } from './dto/audience.dto';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';

@ApiTags('Audience Activation')
@Controller('api/v1/audiences')
export class AudienceController {
  constructor(private readonly audienceService: AudienceService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create an audience segment' })
  async create(@Body() dto: CreateAudienceDto) {
    return this.audienceService.createAudience(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List audience segments' })
  async list() {
    return this.audienceService.listAudiences();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audience segment details' })
  async get(@Param('id') id: string) {
    return this.audienceService.getAudience(id);
  }

  @Post(':id/compute')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Compute audience membership' })
  async compute(@Param('id') id: string) {
    return this.audienceService.computeAudience(id);
  }

  @Post(':id/export')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Export audience to a destination' })
  async export(@Param('id') id: string, @Body() dto: ExportAudienceDto) {
    return this.audienceService.exportAudience(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an audience segment' })
  async remove(@Param('id') id: string) {
    return this.audienceService.deleteAudience(id);
  }

  @Get(':id/csv')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Download audience members as CSV' })
  async downloadCsv(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.audienceService.exportAudienceCsv(id);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audience-${id}.csv"`,
    });
    res.send(csv);
  }
}
