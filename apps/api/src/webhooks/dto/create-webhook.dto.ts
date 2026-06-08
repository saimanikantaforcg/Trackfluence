import { IsString, IsUrl, IsOptional, IsArray, IsIn } from 'class-validator';

const VALID_EVENTS = [
  'payout.approved', 'payout.paid', 'payout.cancelled',
  'campaign.created', 'campaign.updated',
  'creator.created', 'creator.invited',
  'attribution.created',
];

export class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsIn(VALID_EVENTS, { each: true })
  events?: string[];
}
