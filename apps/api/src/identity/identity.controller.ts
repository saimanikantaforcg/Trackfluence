import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { ResolveIdentityDto, CreateCustomerDto } from './dto/identity.dto';

@ApiTags('Identity Resolution')
@Controller('api/v1/identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('resolve')
  @ApiOperation({ summary: 'Resolve identities to a unified customer profile' })
  async resolve(@Body() dto: ResolveIdentityDto) {
    return this.identityService.resolveIdentity(dto);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create a customer profile' })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.identityService.createCustomer(dto);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer profile with identity graph' })
  async getCustomer(@Param('id') id: string) {
    return this.identityService.getCustomerProfile(id);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Search customers with pagination' })
  async searchCustomers(
    @Query('email') email?: string,
    @Query('creatorAcquired') creatorAcquired?: string,
    @Query('segment') segment?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.identityService.searchCustomers({
      email,
      creatorAcquired: creatorAcquired === 'true' ? true : creatorAcquired === 'false' ? false : undefined,
      segment,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('customers/:id/graph')
  @ApiOperation({ summary: 'Get identity graph for a customer' })
  async getIdentityGraph(@Param('id') id: string) {
    return this.identityService.getIdentityGraph(id);
  }
}
