import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { FeatureGate } from "@/components/FeatureGate";

const mockGetOrganizationBySlug = vi.fn();

vi.mock("@/context/OrgPortalContext", () => ({
  useOrgPortal: () => ({
    getOrganizationBySlug: mockGetOrganizationBySlug,
  }),
}));

function renderGate() {
  return render(
    <MemoryRouter initialEntries={["/org/acme/programs"]}>
      <Routes>
        <Route
          path="/org/:orgSlug/programs"
          element={(
            <FeatureGate module="analytics" fallback={<div>disabled</div>}>
              <div>enabled</div>
            </FeatureGate>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FeatureGate", () => {
  it("renders children when module is enabled", () => {
    mockGetOrganizationBySlug.mockReturnValue({ enabledModules: ["analytics"] });
    renderGate();

    expect(screen.getByText("enabled")).toBeInTheDocument();
    expect(screen.queryByText("disabled")).not.toBeInTheDocument();
  });

  it("renders fallback when module is disabled", () => {
    mockGetOrganizationBySlug.mockReturnValue({ enabledModules: ["messaging"] });
    renderGate();

    expect(screen.getByText("disabled")).toBeInTheDocument();
    expect(screen.queryByText("enabled")).not.toBeInTheDocument();
  });
});
