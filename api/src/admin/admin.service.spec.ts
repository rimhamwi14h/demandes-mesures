import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { BadRequestException } from "@nestjs/common";
import { Role } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { AdminService } from "./admin.service.js";

describe("Manager assignment", () => {
  const tx = {
    team: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  };

  const database = {
    $transaction: vi.fn(),
  };

  let service: AdminService;

  beforeEach(() => {
    vi.resetAllMocks();

    database.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    tx.team.findUnique.mockResolvedValue({
      id: "team-1",
      managerId: "old-manager",
    });

    tx.user.findUnique.mockResolvedValue({
      id: "new-manager",
      teamId: "team-1",
      companyId: null,
      role: Role.REQUESTER,
    });

    tx.user.updateMany.mockResolvedValue({ count: 1 });
    tx.user.update.mockResolvedValue({});
    tx.team.update.mockResolvedValue({
      id: "team-1",
      managerId: "new-manager",
    });

    service = new AdminService(
      database as unknown as PrismaService,
    );
  });

  it("replaces the manager and demotes the previous one", async () => {
    await service.assignManager("team-1", "new-manager");

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "old-manager",
        role: Role.TEAM_MANAGER,
      },
      data: {
        role: Role.REQUESTER,
      },
    });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "new-manager" },
      data: { role: Role.TEAM_MANAGER },
    });

    expect(tx.team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { managerId: "new-manager" },
      }),
    );
  });

  it("rejects a member of another team", async () => {
    tx.user.findUnique.mockResolvedValue({
      id: "other-user",
      teamId: "team-2",
      companyId: null,
      role: Role.REQUESTER,
    });

    await expect(
      service.assignManager("team-1", "other-user"),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.team.update).not.toHaveBeenCalled();
  });

  it("rejects a company contact", async () => {
    tx.user.findUnique.mockResolvedValue({
      id: "company-contact",
      teamId: null,
      companyId: "company-1",
      role: Role.COMPANY_CONTACT,
    });

    await expect(
      service.assignManager("team-1", "company-contact"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});