import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import { Role } from "../generated/prisma/client.js";
import type { AuthenticatedRequest } from "./auth.types.js";

@Injectable()
export class TechnicianGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    if (request.user.role !== Role.TECHNICIAN) {
      throw new ForbiddenException(
        "Cette action est réservée au technicien.",
      );
    }

    return true;
  }
}