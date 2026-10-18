import type { Request } from "express";
import type { Role } from "../generated/prisma/client.js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  companyId: string | null;
}

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};