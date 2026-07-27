import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AdminJwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Missing or invalid authorization header",
      );
    }

    const token = authHeader.replace("Bearer ", "");
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.getOrThrow<string>("JWT_SECRET"),
      });
      if (payload.role !== "ADMIN") {
        throw new UnauthorizedException("Admin access required");
      }
      next();
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
