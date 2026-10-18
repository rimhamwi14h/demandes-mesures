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
import {
  RequestStatus,
  Role,
} from "../generated/prisma/client.js";
import type { AuthUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RequestsService } from "../requests/requests.service.js";
import { LocalFilesService } from "./local-files.service.js";
import { ResultsService } from "./results.service.js";

describe("ResultsService", () => {
  const database = {
    measurementRequest: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    result: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    resultFile: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const requests = {
    findOne: vi.fn(),
  };

  const storage = {
    save: vi.fn(),
    remove: vi.fn(),
    openForDownload: vi.fn(),
  };

  const technician: AuthUser = {
    id: "julien-id",
    name: "Julien",
    email: "julien@example.test",
    role: Role.TECHNICIAN,
    teamId: null,
    companyId: null,
  };

  const file = {
    originalname: "resultat.csv",
    mimetype: "text/csv",
    buffer: Buffer.from("sample,value\nA,10\n"),
  } as Express.Multer.File;

  let service: ResultsService;

  beforeEach(() => {
    vi.resetAllMocks();

    database.$transaction.mockImplementation(
      async (
        callback: (tx: typeof database) => Promise<unknown>,
      ) => callback(database),
    );

    database.measurementRequest.findUnique
      .mockResolvedValue({
        id: "request-1",
        status: RequestStatus.IN_PROGRESS,
      });

    database.measurementRequest.updateMany
      .mockResolvedValue({ count: 1 });

    database.result.create.mockResolvedValue({
      id: "result-1",
    });

    storage.save.mockResolvedValue({
      storageKey: "stored-key",
      originalName: "resultat.csv",
      mimeType: "text/csv",
      size: file.buffer.length,
    });

    storage.remove.mockResolvedValue(undefined);

    service = new ResultsService(
      database as unknown as PrismaService,
      requests as unknown as RequestsService,
      storage as unknown as LocalFilesService,
    );
  });

  it("publishes a result and completes the request", async () => {
    await service.publish(
      technician,
      "request-1",
      "Mesure terminée.",
      [file],
    );

    expect(storage.save).toHaveBeenCalledWith(file);

    expect(
      database.measurementRequest.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: "request-1",
        status: RequestStatus.IN_PROGRESS,
      },
      data: {
        status: RequestStatus.COMPLETED,
        completedAt: expect.any(Date),
        queuePosition: null,
      },
    });

    expect(database.result.create).toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("rejects publication without a file", async () => {
    await expect(
      service.publish(technician, "request-1", "Comment", []),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storage.save).not.toHaveBeenCalled();
  });

  it("rejects publication for a non-measurable request", async () => {
    database.measurementRequest.findUnique
      .mockResolvedValue({
        id: "request-1",
        status: RequestStatus.NOT_MEASURABLE,
      });

    await expect(
      service.publish(
        technician,
        "request-1",
        "Comment",
        [file],
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(storage.save).not.toHaveBeenCalled();
  });

  it("removes saved files if database publication fails", async () => {
    database.result.create.mockRejectedValue(
      new Error("Database failure"),
    );

    await expect(
      service.publish(
        technician,
        "request-1",
        "Comment",
        [file],
      ),
    ).rejects.toThrow("Database failure");

    expect(storage.remove).toHaveBeenCalledWith("stored-key");
  });

  it("checks request access before reading a result", async () => {
    requests.findOne.mockRejectedValue(
      new NotFoundException(),
    );

    await expect(
      service.findForRequest(technician, "hidden-request"),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(database.result.findUnique).not.toHaveBeenCalled();
  });

  it("checks request access before opening a file", async () => {
    requests.findOne.mockRejectedValue(
      new NotFoundException(),
    );

    await expect(
      service.download(
        technician,
        "hidden-request",
        "file-1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(storage.openForDownload).not.toHaveBeenCalled();
  });
});