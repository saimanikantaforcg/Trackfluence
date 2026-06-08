import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across creators, customers, tracking links' })
  async search(
    @Query('q') q = '',
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search(q, limit ? parseInt(limit, 10) : 5);
  }
}
