import { afterEach, describe, expect, it, vi } from "vitest";
import { loginApi, listPrograms, meApi, toCatalogProgramPayload, updateProgram, uploadLogoFile } from "./api";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hub API client against nxt-lvl-api2", () => {
  it("reads the catalog from /api/v1/suite/programs with cookies and the hub partition", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await listPrograms();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/suite\/programs$/);
    expect(init.credentials).toBe("include");
    expect(init.headers["x-app-partition"]).toBe("nxt-lvl-suites");
  });

  it("surfaces api2 error envelopes ({ error: { message } }) instead of a generic failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(403, { success: false, error: { code: "FORBIDDEN", message: "Only platform admins can manage the suite catalog." } })),
    );

    await expect(updateProgram("p1", { name: "x" })).rejects.toThrow("Only platform admins can manage the suite catalog.");
  });

  it("logs in with a cookie session and treats only super_admin as platform admin", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, { success: true, data: { admin: { id: "a1" } } }))
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, data: { id: "a1", email: "x@y.com", role: "org_admin", organizationId: "org-1" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const session = await loginApi("x@y.com", "pw");
    expect(session.accessToken).toBe("");
    const me = await meApi();
    expect(me.isPlatformAdmin).toBe(false);
    expect(me.orgMemberships).toEqual([{ orgId: "org-1", orgName: "", role: "org_admin", active: true }]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/v1\/auth\/login$/);
  });

  it("uploads logos to the api2 suite endpoint as multipart", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { success: true, data: { fileName: "a.png", logoUrl: "https://cdn/x.png" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadLogoFile(new File([new Uint8Array([1])], "a.png", { type: "image/png" }));

    expect(result.logoUrl).toBe("https://cdn/x.png");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/suite\/uploads\/logo$/);
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers["Content-Type"]).toBeUndefined();
  });
});

describe("toCatalogProgramPayload", () => {
  it("drops server-owned fields and turns null strings into empty strings so fields can be cleared", () => {
    expect(
      toCatalogProgramPayload({
        id: "p1",
        organizationId: null,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        name: "TimeFlow",
        logoUrl: null as unknown as string,
        cardGlowOpacity: null as unknown as number,
        isPublic: false,
      }),
    ).toEqual({ name: "TimeFlow", logoUrl: "", isPublic: false });
  });
});
