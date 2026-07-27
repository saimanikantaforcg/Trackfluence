import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ApiKeysService } from "./api-keys.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import { CurrentOrg } from "../organizations/current-org.decorator";

@ApiTags("API Keys")
@ApiBearerAuth()
@Controller("api/v1/api-keys")
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: "List your API keys" })
  list(@Request() req: { user: { sub: string } }) {
    return this.apiKeys.listForUser(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: "Generate a new API key (shown once)" })
  generate(
    @Request() req: { user: { sub: string } },
    @Body() dto: CreateApiKeyDto,
    @CurrentOrg() orgId?: string,
  ) {
    return this.apiKeys.generate(req.user.sub, dto.name, dto.scopes, orgId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Revoke an API key" })
  revoke(@Param("id") id: string, @Request() req: { user: { sub: string } }) {
    return this.apiKeys.revoke(req.user.sub, id);
  }
}
