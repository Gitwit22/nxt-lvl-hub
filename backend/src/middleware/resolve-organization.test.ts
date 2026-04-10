import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../utils/app-error.js";
import { resolveOrganizationFromHost } from "./resolve-organization.js";

const { listMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
}));

vi.mock("../database/repositories.js", () => ({
  organizationRepository: {
    list: listMock,
  },
}));

vi.mock("../config/env.js", () => ({
  env: {
    appPartitionDefault: "nxt-lvl-suites",
  },
}));

function createRequest(hostname: string, forwardedHost?: string) {
  return {
    hostname,
    headers: forwardedHost ? { "x-forwarded-host": forwardedHost } : {},
  } as Request;
}

describe("resolveOrganizationFromHost", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("passes through when host is not an ntlops portal hostname", async () => {
    const request = createRequest("localhost");
    const response = {} as Response;
    const nextFn = vi.fn();
    const next = nextFn as unknown as NextFunction;

    await resolveOrganizationFromHost(request, response, next);

    expect(listMock).not.toHaveBeenCalled();
    expect(nextFn).toHaveBeenCalledWith();
  });

  it("attaches resolvedOrganization when subdomain matches", async () => {
    listMock.mockResolvedValue([
      {
        id: "org-1",
        slug: "acme",
        subdomain: "acme",
        name: "Acme",
        status: "active",
        assignedProgramIds: ["program-1"],
        enabledModules: ["analytics"],
        deletedAt: null,
      },
    ]);

    const request = createRequest("acme.ntlops.com") as Request & {
      resolvedOrganization?: unknown;
    };
    const response = {} as Response;
    const nextFn = vi.fn();
    const next = nextFn as unknown as NextFunction;

    await resolveOrganizationFromHost(request, response, next);

    expect(request.resolvedOrganization).toEqual({
      id: "org-1",
      slug: "acme",
      subdomain: "acme",
      name: "Acme",
      status: "active",
      enabledPrograms: ["program-1"],
      enabledModules: ["analytics"],
    });
    expect(nextFn).toHaveBeenCalledWith();
  });

  it("calls next with 404 AppError when subdomain does not map to an organization", async () => {
    listMock.mockResolvedValue([]);

    const request = createRequest("missing.ntlops.com");
    const response = {} as Response;
    const nextFn = vi.fn();
    const next = nextFn as unknown as NextFunction;

    await resolveOrganizationFromHost(request, response, next);

    expect(nextFn).toHaveBeenCalledTimes(1);
    const [error] = nextFn.mock.calls[0] as [AppError];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Portal not found.");
  });
});
