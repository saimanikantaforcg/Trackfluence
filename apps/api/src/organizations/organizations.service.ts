import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      membershipId: m.id,
    }));
  }

  async switchOrganization(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new BadRequestException(
        "You are not a member of this organization",
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentOrganizationId: organizationId },
    });

    this.logger.log(
      `User ${userId} switched to organization ${organizationId}`,
    );
    return {
      success: true,
      organization: membership.organization,
      role: membership.role,
    };
  }

  async getCurrentOrganization(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentOrganizationId: true },
    });

    if (!user?.currentOrganizationId) {
      return null;
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.currentOrganizationId,
          userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return null;
    }

    return {
      organization: membership.organization,
      role: membership.role,
    };
  }
}
