import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { hash } from "bcryptjs";
import { AuthService } from "./auth.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

describe("AuthService", () => {
  const database = {
    user: {
      findUnique: vi.fn(),
    },
  };

  const jwt = new JwtService({
    secret: "test-secret-for-unit-tests-only-123456",
    signOptions: {
      expiresIn: "1h",
      algorithm: "HS256",
    },
  });

  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hash("CorrectPassword123!", 4);
  });

  beforeEach(() => {
    vi.resetAllMocks();

    service = new AuthService(
      database as unknown as PrismaService,
      jwt,
    );
  });

  it("issues a signed token without exposing the password hash", async () => {
    database.user.findUnique.mockResolvedValue({
      id: "julien-id",
      name: "Julien",
      email: "julien@example.test",
      passwordHash,
      role: "TECHNICIAN",
      teamId: null,
      companyId: null,
    });

    const result = await service.login(
      "julien@example.test",
      "CorrectPassword123!",
    );

    const payload = await jwt.verifyAsync(result.accessToken);

    expect(payload.sub).toBe("julien-id");
    expect(payload.exp).toBeGreaterThan(payload.iat);
    expect(result.user.role).toBe("TECHNICIAN");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(payload).not.toHaveProperty("passwordHash");
  });

  it("rejects an incorrect password", async () => {
    database.user.findUnique.mockResolvedValue({
      id: "julien-id",
      passwordHash,
    });

    await expect(
      service.login("julien@example.test", "WrongPassword"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an unknown email", async () => {
    database.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login("unknown@example.test", "AnyPassword"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});