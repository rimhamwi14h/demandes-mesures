import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { PrismaService } from "../prisma/prisma.service.js";

describe("HealthController", () => {
  const database = {
    $queryRaw: vi.fn(),
  };

  let controller: HealthController;

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new HealthController(
      database as unknown as PrismaService,
    );
  });

  it("reports success when PostgreSQL responds", async () => {
    database.$queryRaw.mockResolvedValue([{ value: 1 }]);

    await expect(controller.check()).resolves.toEqual({
      status: "ok",
      database: "connected",
    });
  });

  it("returns a 503 exception when PostgreSQL is unavailable", async () => {
    database.$queryRaw.mockRejectedValue(
      new Error("Database connection failed"),
    );

    try {
      await controller.check();
      expect.fail("Expected a ServiceUnavailableException");
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(
        (error as ServiceUnavailableException).getStatus(),
      ).toBe(503);
    }
  });
});