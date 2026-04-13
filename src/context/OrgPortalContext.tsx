/**
 * OrgPortalContext — backwards-compat re-export shim.
 *
 * The portal model has been removed. All org workspace logic now lives in
 * OrgContext.tsx. This file exists so that older imports and test mocks
 * that reference "@/context/OrgPortalContext" continue to resolve.
 *
 * New code should import from "@/context/OrgContext" directly.
 */
export * from "@/context/OrgContext";

// Named aliases for the legacy symbols used in existing imports
export { OrgProvider as OrgPortalProvider } from "@/context/OrgContext";
export { useOrg as useOrgPortal } from "@/context/OrgContext";
