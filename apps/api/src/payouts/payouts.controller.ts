import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
  Res,
} from "@nestjs/common";
import { PayoutsService } from "./payouts.service";
import { CreatePayoutDto } from "./dto/create-payout.dto";
import { Roles } from "../auth/roles.decorator";
import { CurrentOrg } from "../organizations/current-org.decorator";
import { Request, Response } from "express";

interface AuthedRequest extends Request {
  user: { sub: string; role: string };
}

@Controller("api/v1/payouts")
export class PayoutsController {
  constructor(private readonly svc: PayoutsService) {}

  @Post()
  @Roles("ADMIN")
  create(@Body() dto: CreatePayoutDto, @CurrentOrg() orgId?: string) {
    return this.svc.create(dto, orgId);
  }

  @Get()
  findAll(
    @Query("creatorId") creatorId?: string,
    @Query("status") status?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @CurrentOrg() orgId?: string,
  ) {
    return this.svc.findAll({ creatorId, status, page, limit }, orgId);
  }

  @Get("calculate")
  calculate(
    @Query("creatorId") creatorId: string,
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
    @CurrentOrg() orgId?: string,
  ) {
    return this.svc.calculateForCreator(
      creatorId,
      new Date(periodStart),
      new Date(periodEnd),
      orgId,
    );
  }

  @Post(":id/approve")
  @Roles("ADMIN")
  approve(
    @Param("id") id: string,
    @Req() req: AuthedRequest,
    @CurrentOrg() orgId?: string,
  ) {
    return this.svc.approve(id, req.user.sub, orgId);
  }

  @Post("bulk-approve")
  @Roles("ADMIN")
  bulkApprove(
    @Body() body: { ids: string[] },
    @Req() req: AuthedRequest,
    @CurrentOrg() orgId?: string,
  ) {
    return this.svc.bulkApprove(body.ids, req.user.sub, orgId);
  }

  @Post(":id/pay")
  @Roles("ADMIN")
  markPaid(
    @Param("id") id: string,
    @Req() req: AuthedRequest,
    @CurrentOrg() orgId?: string,
  ) {
    return this.svc.markPaid(id, req.user.sub, orgId);
  }

  @Post(":id/cancel")
  @Roles("ADMIN")
  cancel(@Param("id") id: string, @CurrentOrg() orgId?: string) {
    return this.svc.cancel(id, orgId);
  }

  @Get("export/csv")
  @Roles("ADMIN")
  async exportCsv(
    @Query("status") status: string | undefined,
    @Query("creatorId") creatorId: string | undefined,
    @Res() res: Response,
    @CurrentOrg() orgId?: string,
  ) {
    const { items } = await this.svc.findAll(
      { status, creatorId, page: 1, limit: 10000 },
      orgId,
    );
    const header =
      "id,creator,amount,currency,status,periodStart,periodEnd,paidAt\n";
    const rows = items
      .map((p) =>
        [
          p.id,
          `"${p.creator.name}"`,
          p.amount,
          p.currency,
          p.status,
          new Date(p.periodStart).toISOString().slice(0, 10),
          new Date(p.periodEnd).toISOString().slice(0, 10),
          p.paidAt ? new Date(p.paidAt).toISOString().slice(0, 10) : "",
        ].join(","),
      )
      .join("\n");
    const csv = header + rows;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="payouts.csv"');
    res.send(csv);
  }
}
