import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { RequireOrg } from "../organizations/require-org.decorator";

@ApiTags("Search")
@Controller("api/v1/search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary:
      "Search across creators, customers, tracking links (scoped to current organization)",
  })
  async search(
    @Query("q") q = "",
    @RequireOrg() orgId: string,
    @Query("limit") limit?: string,
  ) {
    return this.searchService.search(q, limit ? parseInt(limit, 10) : 5, orgId);
  }
}
