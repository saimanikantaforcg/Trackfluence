import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, InviteMemberDto, UpdateOrganizationDto } from './dto/organization.dto';
import { CurrentUser } from '../auth/current-user.decorator';

class OrgDomainDto {
  @IsString()
  @IsOptional()
  trackingDomain?: string;

  @IsUrl()
  @IsOptional()
  slackWebhookUrl?: string;

  @IsUrl()
  @IsOptional()
  discordWebhookUrl?: string;
}

interface JwtUser {
  sub: string;
  email: string;
}

@ApiTags('Organizations')
@Controller('api/v1/organizations')
export class OrganizationsController {
  constructor(
    private readonly orgs: OrganizationsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrganizationDto) {
    return this.orgs.create(user.sub, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the current user's organizations" })
  mine(@CurrentUser() user: JwtUser) {
    return this.orgs.findMine(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details and members' })
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orgs.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization name' })
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgs.update(id, user.sub, dto);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a member by email' })
  invite(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    return this.orgs.invite(id, user.sub, dto, appUrl);
  }

  @Post('accept-invite/:token')
  @ApiOperation({ summary: 'Accept an organization invite' })
  acceptInvite(@CurrentUser() user: JwtUser, @Param('token') token: string) {
    return this.orgs.acceptInvite(token, user.sub, user.email);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  removeMember(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.orgs.removeMember(id, user.sub, targetUserId);
  }

  @Get(':id/domain')
  @ApiOperation({ summary: 'Get org white-label domain settings' })
  getDomain(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orgs.getDomainSettings(id, user.sub);
  }

  @Patch(':id/domain')
  @ApiOperation({ summary: 'Update org tracking domain and notification webhooks' })
  setDomain(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: OrgDomainDto,
  ) {
    return this.orgs.setDomainSettings(id, user.sub, dto);
  }
}
