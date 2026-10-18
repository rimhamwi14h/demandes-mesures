import {
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedRequest } from "./auth.types.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService)
    private readonly jwt: JwtService,

    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);

    if (!match) {
      throw new UnauthorizedException(
        "Token de connexion manquant.",
      );
    }

    let userId: string;

    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: unknown;
      }>(match[1], {
        algorithms: ["HS256"],
      });

      if (
        typeof payload.sub !== "string" ||
        payload.sub.length === 0
      ) {
        throw new Error("Invalid token subject.");
      }

      userId = payload.sub;
    } catch {
      throw new UnauthorizedException(
        "Token invalide ou expiré.",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        companyId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        "Compte utilisateur introuvable.",
      );
    }

    request.user = user;

    return true;
  }
}