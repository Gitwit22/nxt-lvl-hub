import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useOrgPortal } from "@/context/OrgPortalContext";

interface FeatureGateProps {
  /** enabledModules key, e.g. "analytics", "coupons" */
  module: string;
  children: ReactNode;
  /** Optional fallback rendered when the module is disabled */
  fallback?: ReactNode;
}

/**
 * Renders children only when the given module is enabled for the current
 * organization portal.
 *
 * Usage:
 *   <FeatureGate module="analytics">
 *     <AnalyticsPanel />
 *   </FeatureGate>
 */
export function FeatureGate({ module, children, fallback = null }: FeatureGateProps) {
  const { orgSlug = "" } = useParams();
  const { getOrganizationBySlug } = useOrgPortal();
  const org = getOrganizationBySlug(orgSlug);

  const enabled = org?.enabledModules?.includes(module) ?? false;
  return <>{enabled ? children : fallback}</>;
}
