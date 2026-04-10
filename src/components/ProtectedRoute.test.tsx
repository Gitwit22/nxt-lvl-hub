import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const authState = {
  isInitializing: false,
  isAuthenticated: false,
  isPlatformAdmin: false,
  me: undefined as
    | {
      orgMemberships: Array<{ orgId: string; orgName: string; role: string; active: boolean }>;
    }
    | undefined,
};

const orgState = {
  organizations: [] as Array<{ id: string; slug: string }>,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/context/OrgPortalContext", () => ({
  useOrgPortal: () => orgState,
}));

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route element={<ProtectedRoute requirePlatformAdmin />}>
          <Route path="/admin" element={<div>admin-page</div>} />
        </Route>
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/org/:orgSlug" element={<div>org-home</div>} />
        <Route path="/" element={<div>root-page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to login", () => {
    authState.isInitializing = false;
    authState.isAuthenticated = false;
    authState.isPlatformAdmin = false;
    authState.me = undefined;
    orgState.organizations = [];

    renderProtected();
    expect(screen.getByText("login-page")).toBeInTheDocument();
  });

  it("redirects non-platform admins to their organization", () => {
    authState.isInitializing = false;
    authState.isAuthenticated = true;
    authState.isPlatformAdmin = false;
    authState.me = {
      orgMemberships: [{ orgId: "org-1", orgName: "Acme", role: "manager", active: true }],
    };
    orgState.organizations = [{ id: "org-1", slug: "acme" }];

    renderProtected();
    expect(screen.getByText("org-home")).toBeInTheDocument();
  });
});
