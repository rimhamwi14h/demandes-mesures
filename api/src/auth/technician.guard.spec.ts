import { describe, expect, it } from "vitest";
import {
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Role } from "../generated/prisma/client.js";
import { TechnicianGuard } from "./technician.guard.js";

function contextFor(role?: Role): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { role } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("TechnicianGuard", () => {
  const guard = new TechnicianGuard();

  it("allows the technician", () => {
    expect(
      guard.canActivate(contextFor(Role.TECHNICIAN)),
    ).toBe(true);
  });

  it.each([
    Role.REQUESTER,
    Role.TEAM_MANAGER,
    Role.COMPANY_CONTACT,
  ])("rejects the role %s", (role) => {
    expect(() =>
      guard.canActivate(contextFor(role)),
    ).toThrow(ForbiddenException);
  });

  it("rejects a missing authenticated user", () => {
    expect(() =>
      guard.canActivate(contextFor()),
    ).toThrow(UnauthorizedException);
  });
});