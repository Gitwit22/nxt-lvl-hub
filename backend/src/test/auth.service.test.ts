import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../services/auth.service.js";
import { authUserRepository, orgUserRepository } from "../database/repositories.js";
import { AppError } from "../utils/app-error.js";

// Stub the repositories so tests never touch the filesystem.
vi.mock("../database/repositories.js", () => ({
  authUserRepository: {
    list: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  orgUserRepository: {
    findByAuthUserId: vi.fn(),
    listByAuthUserId: vi.fn(),
    linkAuthUser: vi.fn(),
  },
  organizationRepository: {
    list: vi.fn(async () => []),
  },
}));

// env defaults are safe for tests (short expiry string isn't validated by the mock)
vi.mock("../config/env.js", () => ({
  env: {
    appPartitionDefault: "test",
    jwtSecret: "test-secret",
    jwtRefreshSecret: "test-refresh-secret",
    jwtExpiresIn: "15m",
    jwtRefreshExpiresIn: "7d",
    platformSetupToken: "setup-token",
  },
}));

const mockedAuthRepo = authUserRepository as unknown as {
  list: ReturnType<typeof vi.fn>;
  findByEmail: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};
const mockedOrgUserRepo = orgUserRepository as unknown as {
  linkAuthUser: ReturnType<typeof vi.fn>;
  listByAuthUserId: ReturnType<typeof vi.fn>;
};

function makeUser(
  overrides: Partial<{ passwordHash: string; deletedAt: string | null; isPlatformAdmin: boolean }> = {},
) {
  return {
    id: "auth-123",
    email: "test@example.com",
    passwordHash: overrides.passwordHash ?? "",
    isPlatformAdmin: overrides.isPlatformAdmin ?? false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe("AuthService.register", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    vi.clearAllMocks();
  });

  it("creates a new user and auto-links org users", async () => {
    mockedAuthRepo.list.mockResolvedValue([]);
    mockedAuthRepo.findByEmail.mockResolvedValue(null);
    mockedAuthRepo.create.mockImplementation(async (_p: string, user: unknown) => user);
    mockedOrgUserRepo.linkAuthUser.mockResolvedValue(undefined);

    const created = await service.register({ email: "New@Example.com", password: "password123" });

    expect(created.email).toBe("new@example.com");
    expect(created.passwordHash).not.toBe("password123"); // hashed
    expect(mockedOrgUserRepo.linkAuthUser).toHaveBeenCalledWith("test", "new@example.com", created.id);
  });

  it("throws 409 when email is already registered", async () => {
    mockedAuthRepo.list.mockResolvedValue([]);
    mockedAuthRepo.findByEmail.mockResolvedValue(makeUser());

    await expect(service.register({ email: "test@example.com", password: "password123" })).rejects.toThrow(
      AppError,
    );

    await expect(service.register({ email: "test@example.com", password: "password123" }))
      .rejects
      .toMatchObject({ statusCode: 409 });
  });

  it("allows first platform admin bootstrap", async () => {
    mockedAuthRepo.list.mockResolvedValue([]);
    mockedAuthRepo.findByEmail.mockResolvedValue(null);
    mockedAuthRepo.create.mockImplementation(async (_p: string, user: unknown) => user);
    mockedOrgUserRepo.linkAuthUser.mockResolvedValue(undefined);

    const created = await service.register({
      email: "admin@example.com",
      password: "password123",
      isPlatformAdmin: true,
    });

    expect(created.isPlatformAdmin).toBe(true);
  });

  it("blocks second platform admin bootstrap", async () => {
    mockedAuthRepo.list.mockResolvedValue([makeUser({ isPlatformAdmin: true })]);
    mockedAuthRepo.findByEmail.mockResolvedValue(null);

    await expect(
      service.register({
        email: "another-admin@example.com",
        password: "password123",
        isPlatformAdmin: true,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("AuthService.login", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    vi.clearAllMocks();
  });

  it("returns tokens for valid credentials", async () => {
    // bcryptjs is not mocked — use a pre-hashed password
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correct-password", 4); // low rounds for speed
    mockedAuthRepo.findByEmail.mockResolvedValue(makeUser({ passwordHash: hash }));

    const result = await service.login({ email: "test@example.com", password: "correct-password" });

    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it("throws 401 for wrong password", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correct-password", 4);
    mockedAuthRepo.findByEmail.mockResolvedValue(makeUser({ passwordHash: hash }));

    await expect(service.login({ email: "test@example.com", password: "wrong-password" })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("throws 401 (not 404) for unknown email — prevents user enumeration", async () => {
    // Simulate timing-safe path: no user found
    mockedAuthRepo.findByEmail.mockResolvedValue(null);

    await expect(service.login({ email: "nobody@example.com", password: "anything" })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("throws 401 for soft-deleted user", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("password", 4);
    mockedAuthRepo.findByEmail.mockResolvedValue(
      makeUser({ passwordHash: hash, deletedAt: "2026-01-01T00:00:00.000Z" }),
    );

    await expect(service.login({ email: "test@example.com", password: "password" })).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

describe("AuthService.bootstrapPlatformAdmin", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    vi.clearAllMocks();
  });

  it("upgrades logged-in user to platform admin when token is valid and no admin exists", async () => {
    mockedAuthRepo.findById.mockResolvedValue(makeUser());
    mockedAuthRepo.list.mockResolvedValue([]);
    mockedAuthRepo.update.mockImplementation(async (_p: string, _id: string, updater: (u: ReturnType<typeof makeUser>) => ReturnType<typeof makeUser>) => {
      return updater(makeUser());
    });

    const upgraded = await service.bootstrapPlatformAdmin("auth-123", "test", "setup-token");
    expect(upgraded.isPlatformAdmin).toBe(true);
  });

  it("blocks bootstrap when a platform admin already exists", async () => {
    mockedAuthRepo.findById.mockResolvedValue(makeUser());
    mockedAuthRepo.list.mockResolvedValue([makeUser({ isPlatformAdmin: true })]);

    await expect(service.bootstrapPlatformAdmin("auth-123", "test", "setup-token")).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
