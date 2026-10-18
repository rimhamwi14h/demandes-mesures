import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";
import {
  Prisma,
  Role,
} from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { AuthService } from "./auth.service.js";

describe("Internal registration", () => {
  const database = {
    team: {
      findUnique: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
  };

  const input = {
    name: "Rim",
    email: "rim@ecole.example",
    password: "RimDemo2026!!",
    teamId: "team-1",
  };

  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SCHOOL_EMAIL_DOMAIN", "ecole.example");

    database.team.findUnique.mockResolvedValue({
      id: "team-1",
    });

    service = new AuthService(
      database as unknown as PrismaService,
      new JwtService(),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a requester with a hashed password", async () => {
    const savedUser = {
      id: "user-1",
      name: input.name,
      email: input.email,
      role: Role.REQUESTER,
      teamId: input.teamId,
      companyId: null,
    };

    database.user.create.mockResolvedValue(savedUser);

    const result = await service.register(input);

    const createArguments =
      database.user.create.mock.calls[0][0];

    expect(createArguments.data.role).toBe(Role.REQUESTER);
    expect(createArguments.data.passwordHash).not.toBe(
      input.password,
    );

    expect(
      await compare(
        input.password,
        createArguments.data.passwordHash,
      ),
    ).toBe(true);

    expect(result).toEqual(savedUser);
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rejects an email from another domain", async () => {
    await expect(
      service.register({
        ...input,
        email: "rim@gmail.com",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(database.user.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown team", async () => {
    database.team.findUnique.mockResolvedValue(null);

    await expect(
      service.register(input),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(database.user.create).not.toHaveBeenCalled();
  });

  it("returns a conflict for an existing email", async () => {
    database.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "7.10.1",
        },
      ),
    );

    await expect(
      service.register(input),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});