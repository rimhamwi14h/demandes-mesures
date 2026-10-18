import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { RequestStatus } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ProcessingService } from "./processing.service.js";

describe("ProcessingService", () => {
  const database = {
    measurementRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  let service: ProcessingService;

  beforeEach(() => {
    vi.resetAllMocks();

    database.$transaction.mockImplementation(
      async (
        callback: (tx: typeof database) => Promise<unknown>,
      ) => callback(database),
    );

    database.measurementRequest.updateMany.mockResolvedValue({
      count: 1,
    });

    database.measurementRequest.findUniqueOrThrow
      .mockResolvedValue({ id: "request-1" });

    service = new ProcessingService(
      database as unknown as PrismaService,
    );
  });

  it("starts only a pending request", async () => {
    await service.start("request-1");

    expect(
      database.measurementRequest.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: "request-1",
        status: RequestStatus.PENDING,
        startedAt: null,
      },
      data: {
        status: RequestStatus.IN_PROGRESS,
        startedAt: expect.any(Date),
        queuePosition: null,
      },
    });
  });

  it("rejects starting a request in another state", async () => {
    database.measurementRequest.updateMany
      .mockResolvedValue({ count: 0 });

    database.measurementRequest.findUnique
      .mockResolvedValue({ id: "request-1" });

    await expect(
      service.start("request-1"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("returns 404 for an unknown request", async () => {
    database.measurementRequest.updateMany
      .mockResolvedValue({ count: 0 });

    database.measurementRequest.findUnique
      .mockResolvedValue(null);

    await expect(
      service.start("unknown"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("requires a meaningful non-measurable reason", async () => {
    await expect(
      service.markNotMeasurable("request-1", "   "),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      database.measurementRequest.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("stores the reason and the non-measurable status", async () => {
    await service.markNotMeasurable(
      "request-1",
      "  Échantillon abîmé  ",
    );

    expect(
      database.measurementRequest.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: RequestStatus.NOT_MEASURABLE,
          nonMeasurableReason: "Échantillon abîmé",
          queuePosition: null,
        },
      }),
    );
  });

  it("rejects an incomplete manual ordering", async () => {
    database.measurementRequest.findMany.mockResolvedValue([
      { id: "request-1" },
      { id: "request-2" },
    ]);

    await expect(
      service.reorderQueue(["request-1"]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      database.measurementRequest.updateMany,
    ).not.toHaveBeenCalled();
  });
});