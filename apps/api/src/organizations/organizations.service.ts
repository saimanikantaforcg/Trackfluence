import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, InviteMemberDto, UpdateOrganizationDto } from './dto/organization.dto';
import { EmailService } from '../email/email.service';
import { nanoid } from 'nanoid';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Create ────────────────────────────────────────────────

  async create(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        members: { create: { userId, role: 'OWNER' } },
      },
      include: { members: true },
    });
  }

  // ─── Read ──────────────────────────────────────────────────

  async findMine(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    });
    return memberships.map((m) => ({ ...m.organization, role: m.role }));
  }

  async findOne(orgId: string, userId: string) {
    await this.assertMember(orgId, userId);
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: { members: true, invites: { where: { acceptedAt: null } } },
    });
  }

  // ─── Update ────────────────────────────────────────────────

  async update(orgId: string, userId: string, dto: UpdateOrganizationDto) {
    await this.assertRole(orgId, userId, ['OWNER', 'ADMIN']);
    return this.prisma.organization.update({
      where: { id: orgId },
      data: { name: dto.name },
    });
  }

  // ─── Members ───────────────────────────────────────────────

  async invite(orgId: string, userId: string, dto: InviteMemberDto, appUrl: string) {
    await this.assertRole(orgId, userId, ['OWNER', 'ADMIN']);
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

    // Upsert invite (re-send if same email already invited)
    const token = nanoid(32);
    await this.prisma.organizationInvite.upsert({
      where: { organizationId_email: { organizationId: orgId, email: dto.email } },
      create: {
        organizationId: orgId,
        email: dto.email,
        role: dto.role ?? 'MEMBER',
        invitedBy: userId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      update: {
        token,
        role: dto.role ?? 'MEMBER',
        invitedBy: userId,
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const acceptUrl = `${appUrl}/accept-invite?token=${token}`;
    await this.email.sendCreatorInvite(dto.email, org.name, acceptUrl);
    return { message: 'Invite sent', email: dto.email };
  }

  async acceptInvite(token: string, userId: string, userEmail: string) {
    const invite = await this.prisma.organizationInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.acceptedAt) throw new ConflictException('Invite already accepted');
    if (invite.expiresAt < new Date()) throw new ForbiddenException('Invite has expired');
    if (invite.email.toLowerCase() !== userEmail.toLowerCase())
      throw new ForbiddenException('This invite is for a different email address');

    const [member] = await this.prisma.$transaction([
      this.prisma.organizationMember.create({
        data: { organizationId: invite.organizationId, userId, role: invite.role },
      }),
      this.prisma.organizationInvite.update({
        where: { token },
        data: { acceptedAt: new Date() },
      }),
    ]);
    return member;
  }

  async removeMember(orgId: string, requesterId: string, targetUserId: string) {
    await this.assertRole(orgId, requesterId, ['OWNER', 'ADMIN']);
    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot remove the owner');
    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    return { message: 'Member removed' };
  }

  // ─── White-label domain + notification webhooks ────────────

  async getDomainSettings(orgId: string, userId: string) {
    await this.assertMember(orgId, userId);
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { id: true, trackingDomain: true, slackWebhookUrl: true, discordWebhookUrl: true },
    });
    return org;
  }

  async setDomainSettings(
    orgId: string,
    userId: string,
    dto: { trackingDomain?: string; slackWebhookUrl?: string; discordWebhookUrl?: string },
  ) {
    await this.assertRole(orgId, userId, ['OWNER', 'ADMIN']);
    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(dto.trackingDomain !== undefined && { trackingDomain: dto.trackingDomain || null }),
        ...(dto.slackWebhookUrl !== undefined && { slackWebhookUrl: dto.slackWebhookUrl || null }),
        ...(dto.discordWebhookUrl !== undefined && { discordWebhookUrl: dto.discordWebhookUrl || null }),
      },
      select: { id: true, trackingDomain: true, slackWebhookUrl: true, discordWebhookUrl: true },
    });
  }

  // ─── Guards ────────────────────────────────────────────────

  async assertMember(orgId: string, userId: string) {
    const m = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!m) throw new ForbiddenException('You are not a member of this organization');
    return m;
  }

  private async assertRole(
    orgId: string,
    userId: string,
    allowed: Array<'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'>,
  ) {
    const m = await this.assertMember(orgId, userId);
    if (!allowed.includes(m.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'))
      throw new ForbiddenException(`Requires role: ${allowed.join(' or ')}`);
    return m;
  }
}
