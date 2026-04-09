import type { Organization } from "@/types/orgPortal";
import type { PortalUser } from "@/types/orgPortal";
import type { Program } from "@/types/program";
import { PROGRAM_DOMAIN } from "@/config/program";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
  error: string | null;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const APP_PARTITION = PROGRAM_DOMAIN;
const REQUEST_TIMEOUT_MS = 12000;

// ─── Access-token store ───────────────────────────────────────────────────────
let _accessToken: string | null = null;
let _authErrorCallback: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken() {
  return _accessToken;
}

export function setAuthErrorCallback(cb: () => void) {
  _authErrorCallback = cb;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Low-level refresh (avoids circular dependency with apiRequest) ───────────
async function doRefresh(): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    console.log("[auth] doRefresh: calling POST /api/auth/refresh");
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "x-app-partition": APP_PARTITION },
    });
    if (!response.ok) {
      console.warn(`[auth] doRefresh: ${response.status} ${response.statusText}`);
      return null;
    }
    const payload = (await response.json()) as ApiEnvelope<{ accessToken: string; expiresIn: number }>;
    if (!payload.success) {
      console.warn(`[auth] doRefresh: API returned success=false`);
      return null;
    }
    console.log("[auth] doRefresh: success");
    return payload.data;
  } catch (err) {
    console.error("[auth] doRefresh error:", err);
    return null;
  }
}

// ─── Core request helper ──────────────────────────────────────────────────────
function toApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiRequest<T>(path: string, init: RequestInit = {}, _retry = true): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    "x-app-partition": APP_PARTITION,
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };
  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const response = await fetchWithTimeout(toApiUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });

  if (response.status === 401 && _retry && !path.startsWith("/api/auth/")) {
    console.warn(`[auth] 401 on ${path}, attempting refresh...`);
    const refreshed = await doRefresh();
    if (refreshed) {
      _accessToken = refreshed.accessToken;
      console.log(`[auth] refresh succeeded, retrying ${path}`);
      return apiRequest<T>(path, init, false);
    }
    console.error(`[auth] refresh failed, clearing session`);
    _authErrorCallback?.();
  }

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    console.error(`[api] ${response.status} ${path}: ${payload.error || payload.message}`);
    throw new Error(payload.error || payload.message || "Request failed.");
  }

  return payload.data;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export interface MeResponse {
  id: string;
  email: string;
  isPlatformAdmin: boolean;
  orgMemberships: Array<{
    orgId: string;
    orgName: string;
    role: string;
    active: boolean;
  }>;
}

export interface AuthTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export async function loginApi(email: string, password: string): Promise<AuthTokenResponse> {
  return apiRequest<AuthTokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(email: string, password: string, setupToken?: string): Promise<AuthTokenResponse> {
  return apiRequest<AuthTokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, ...(setupToken ? { setupToken } : {}) }),
  });
}

export async function logoutApi(): Promise<void> {
  await apiRequest<void>("/api/auth/logout", { method: "POST" });
}

export async function refreshToken(): Promise<AuthTokenResponse | null> {
  return doRefresh();
}

export async function meApi(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/api/auth/me");
}

export async function bootstrapAdminApi(setupToken: string): Promise<AuthTokenResponse> {
  return apiRequest<AuthTokenResponse>("/api/auth/bootstrap-admin", {
    method: "POST",
    body: JSON.stringify({ setupToken }),
  });
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed.";
}

export interface ProgramRecord extends Program {
  slug: string;
  organizationId?: string | null;
  deletedAt?: string | null;
}

export interface OrganizationRecord extends Organization {
  description?: string;
  ownerUserId?: string | null;
  tags?: string[];
  deletedAt?: string | null;
}

export interface OrgUserRecord extends PortalUser {
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type ProgramMutationInput = Omit<ProgramRecord, "createdAt" | "updatedAt" | "deletedAt">;
export type OrganizationMutationInput = Omit<OrganizationRecord, "createdAt" | "lastActivityAt" | "deletedAt"> & {
  createdAt?: string;
  lastActivityAt?: string;
};
export type OrgUserMutationInput = Omit<OrgUserRecord, "createdAt" | "updatedAt" | "deletedAt">;

export function normalizeProgram(record: ProgramRecord): Program {
  const { deletedAt: _deletedAt, ...program } = record;
  return {
    ...program,
    organizationId: record.organizationId ?? undefined,
    internalRoute: record.internalRoute ?? undefined,
    externalUrl: record.externalUrl ?? undefined,
    logoUrl: record.logoUrl ?? undefined,
    screenshotUrl: record.screenshotUrl ?? undefined,
    accentColor: record.accentColor ?? undefined,
  };
}

export function normalizeOrganization(record: OrganizationRecord): Organization {
  const { deletedAt: _deletedAt, ...organization } = record;
  return {
    ...organization,
    ownerUserId: record.ownerUserId ?? undefined,
    logoUrl: record.logoUrl ?? undefined,
    bannerUrl: record.bannerUrl ?? undefined,
    phoneNumber: record.phoneNumber || undefined,
    industryType: record.industryType || undefined,
    notes: record.notes || undefined,
    trialEndsAt: record.trialEndsAt || undefined,
  };
}

export function normalizeOrgUser(record: OrgUserRecord): PortalUser {
  const { deletedAt: _deletedAt, createdAt: _createdAt, updatedAt: _updatedAt, ...user } = record;
  return user;
}

export function toProgramMutationInput(program: Program): ProgramMutationInput {
  return {
    id: program.id,
    slug: program.slug || program.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    organizationId: program.organizationId || null,
    name: program.name,
    shortDescription: program.shortDescription,
    longDescription: program.longDescription,
    category: program.category,
    tags: program.tags,
    status: program.status,
    type: program.type,
    origin: program.origin,
    internalRoute: program.internalRoute || null,
    externalUrl: program.externalUrl || null,
    openInNewTab: program.openInNewTab,
    logoUrl: program.logoUrl || null,
    screenshotUrl: program.screenshotUrl || null,
    accentColor: program.accentColor || null,
    isFeatured: program.isFeatured,
    isPublic: program.isPublic,
    requiresLogin: program.requiresLogin,
    requiresApproval: program.requiresApproval,
    launchLabel: program.launchLabel,
    displayOrder: program.displayOrder,
    notes: program.notes,
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

export function toOrganizationMutationInput(organization: Organization): OrganizationMutationInput {
  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    description: organization.description || organization.notes || "",
    subdomain: organization.subdomain,
    contactEmail: organization.contactEmail,
    ownerEmail: organization.ownerEmail,
    ownerUserId: organization.ownerUserId || null,
    logo: organization.logo,
    logoUrl: organization.logoUrl || null,
    bannerUrl: organization.bannerUrl || null,
    welcomeMessage: organization.welcomeMessage,
    supportEmail: organization.supportEmail,
    supportContactName: organization.supportContactName,
    phoneNumber: organization.phoneNumber || "",
    industryType: organization.industryType || "",
    notes: organization.notes || "",
    planType: organization.planType,
    seatLimit: organization.seatLimit,
    status: organization.status,
    trialEndsAt: organization.trialEndsAt || null,
    branding: organization.branding,
    assignedProgramIds: organization.assignedProgramIds,
    assignedBundleIds: organization.assignedBundleIds,
    announcements: organization.announcements,
    tags: organization.tags || [],
    createdAt: organization.createdAt,
    lastActivityAt: organization.lastActivityAt,
  };
}

export function toOrgUserMutationInput(user: PortalUser): OrgUserMutationInput {
  return {
    id: user.id,
    orgId: user.orgId,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    assignedProgramIds: user.assignedProgramIds,
  };
}

export function listPrograms() {
  return apiRequest<ProgramRecord[]>("/api/programs");
}

export function createProgram(payload: ProgramMutationInput) {
  return apiRequest<ProgramRecord>("/api/programs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProgram(id: string, payload: Partial<ProgramMutationInput>) {
  return apiRequest<ProgramRecord>(`/api/programs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProgram(id: string) {
  return apiRequest<ProgramRecord>(`/api/programs/${id}`, {
    method: "DELETE",
  });
}

export function listOrganizations() {
  return apiRequest<OrganizationRecord[]>("/api/orgs");
}

export function createOrganization(payload: OrganizationMutationInput) {
  return apiRequest<OrganizationRecord>("/api/orgs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOrganization(id: string, payload: Partial<OrganizationMutationInput>) {
  return apiRequest<OrganizationRecord>(`/api/orgs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listOrgUsers(orgId: string) {
  return apiRequest<OrgUserRecord[]>(`/api/orgs/${orgId}/users`);
}

export function createOrgUser(orgId: string, payload: OrgUserMutationInput) {
  return apiRequest<OrgUserRecord>(`/api/orgs/${orgId}/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOrgUser(orgId: string, userId: string, payload: Partial<OrgUserMutationInput>) {
  return apiRequest<OrgUserRecord>(`/api/orgs/${orgId}/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadLogoFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ fileName: string; logoUrl: string }>("/api/uploads/logo", {
    method: "POST",
    body: formData,
  });
}
