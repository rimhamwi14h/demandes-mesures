import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  MeasurementType,
  RequestStatus,
  Role,
} from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { RequestsService } from "./requests.service.js";

describe("RequestsService", () => {
  const database = {
    measurementRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    sample: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const user: AuthUser = {
    id: "rim-id",
    name: "Rim",
    email: "rim@ecole.example",
    role: Role.REQUESTER,
    teamId: "team-1",
    companyId: null,
  };

  const data = {
    measurementType: MeasurementType.MICROSCOPY,
    desiredDate: "2026-10-23",
    samples: [
      { reference: "SAMPLE-1" },
    ],
  };

  let service: RequestsService;

  beforeEach(() => {
    vi.resetAllMocks();

    database.$transaction.mockImplementation(
      async (
        callback: (tx: typeof database) => Promise<unknown>,
      ) => callback(database),
    );

    database.measurementRequest.findFirst.mockResolvedValue({
      id: "request-1",
      status: RequestStatus.PENDING,
      startedAt: null,
    });

    database.measurementRequest.updateMany.mockResolvedValue({
      count: 1,
    });

    database.measurementRequest.findUniqueOrThrow
      .mockResolvedValue({ id: "request-1" });

    service = new RequestsService(
      database as unknown as PrismaService,
    );
  });

  it("creates a pending request owned by the authenticated user", async () => {
    await service.create(user, data);

    expect(
      database.measurementRequest.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requesterId: user.id,
          status: RequestStatus.PENDING,
          measurementType: MeasurementType.MICROSCOPY,
        }),
      }),
    );
  });

  it("restricts a requester list to their own requests", async () => {
    await service.findAll(user);

    expect(
      database.measurementRequest.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requesterId: user.id },
      }),
    );
  });

  it("includes team requests for the team manager", async () => {
    await service.findAll({
      ...user,
      role: Role.TEAM_MANAGER,
    });

    expect(
      database.measurementRequest.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { requesterId: user.id },
            {
              requester: {
                teamId: user.teamId,
                companyId: null,
              },
            },
          ],
        },
      }),
    );
  });

  it("returns 404 when a request is not visible", async () => {
    database.measurementRequest.findFirst
      .mockResolvedValue(null);

    await expect(
      service.findOne(user, "hidden-request"),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(
      database.measurementRequest.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { id: "hidden-request" },
            { requesterId: user.id },
          ],
        },
      }),
    );
  });

  it("replaces samples when updating a pending request", async () => {
    await service.update(user, "request-1", data);

    expect(
      database.sample.deleteMany,
    ).toHaveBeenCalledWith({
      where: { requestId: "request-1" },
    });

    expect(
      database.sample.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          requestId: "request-1",
          reference: "SAMPLE-1",
          description: undefined,
        },
      ],
    });
  });

  it.each([
    RequestStatus.IN_PROGRESS,
    RequestStatus.COMPLETED,
    RequestStatus.NOT_MEASURABLE,
    RequestStatus.CANCELLED,
  ])("rejects editing a request with status %s", async (status) => {
    database.measurementRequest.findFirst
      .mockResolvedValue({
        id: "request-1",
        status,
        startedAt: null,
      });

    await expect(
      service.update(user, "request-1", data),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(
      database.measurementRequest.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("rejects cancellation if the status changed before the write", async () => {
    database.measurementRequest.updateMany
      .mockResolvedValue({ count: 0 });

    await expect(
      service.cancel(user, "request-1"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("checks ownership before allowing an update", async () => {
    database.measurementRequest.findFirst
      .mockResolvedValue(null);

    await expect(
      service.update(user, "request-1", data),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(
      database.measurementRequest.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "request-1",
          requesterId: user.id,
        },
      }),
    );
  });
});