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

type ApiRecord = Record<string, unknown>;

const DEFAULT_HOSTED_API_BASE_URL = "https://community-chronicle.onrender.com";
const COMPAT_PLATFORM_ADMIN_EMAILS = new Set([
  "nxtlvltechllc@gmail.com",
  "itstheplugllc@gmail.com",
]);

function getDefaultApiBaseUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const host = window.location.hostname.toLowerCase();
  const isSuiteHost =
    host === "ntlops.com" ||
    host.endsWith(".ntlops.com") ||
    host === "nltops.com" ||
    host.endsWith(".nltops.com") ||
    host.endsWith(".pages.dev");

  if (isSuiteHost) {
    return DEFAULT_HOSTED_API_BASE_URL;
  }

  return "";
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl() || "").replace(/\/$/, "");
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

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return isRecord(value) && typeof value.success === "boolean" && "data" in value;
}

function parseJsonResponse(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorFromPayload(payload: unknown, fallback: string) {
  if (!isRecord(payload)) {
    return fallback;
  }

  if (typeof payload.error === "string" && payload.error.length > 0) {
    return payload.error;
  }

  if (typeof payload.message === "string" && payload.message.length > 0) {
    return payload.message;
  }

  return fallback;
}

function unwrapApiPayload<T>(response: Response, payload: unknown, path: string): T {
  if (isApiEnvelope<T>(payload)) {
    if (!response.ok || !payload.success) {
      const message = getErrorFromPayload(payload, `Request failed for ${path}.`);
      console.error(`[api] ${response.status} ${path}: ${message}`);
      throw new Error(message);
    }

    return payload.data;
  }

  if (!response.ok) {
    const message = getErrorFromPayload(payload, `Request failed for ${path}.`);
    console.error(`[api] ${response.status} ${path}: ${message}`);
    throw new Error(message);
  }

  return payload as T;
}

function decodeJwtExpiresIn(accessToken: string) {
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) {
      return 15 * 60;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded)) as { exp?: number };

    if (typeof decoded.exp === "number") {
      return Math.max(Math.floor(decoded.exp - Date.now() / 1000), 0);
    }
  } catch {
    // Ignore decode failures and fall back to a reasonable default.
  }

  return 15 * 60;
}

function normalizeMeResponse(payload: unknown): MeResponse {
  const source = isRecord(payload) && isRecord(payload.user) ? payload.user : payload;

  if (!isRecord(source)) {
    throw new Error("Profile response was not an object.");
  }

  const id = typeof source.id === "string" ? source.id : "";
  const email = typeof source.email === "string" ? source.email : "";
  const role = typeof source.role === "string" ? source.role.toLowerCase() : "member";
  const isPlatformAdmin =
    source.isPlatformAdmin === true ||
    role === "admin" ||
    role === "owner" ||
    role === "super_admin" ||
    role === "org_admin" ||
    COMPAT_PLATFORM_ADMIN_EMAILS.has(email.toLowerCase());

  if (Array.isArray(source.orgMemberships)) {
    return {
      id,
      email,
      isPlatformAdmin,
      orgMemberships: source.orgMemberships.map((membership) => {
        const record = isRecord(membership) ? membership : {};

        return {
          orgId: typeof record.orgId === "string" ? record.orgId : "",
          orgName: typeof record.orgName === "string" ? record.orgName : "Unknown",
          role: typeof record.role === "string" ? record.role : "member",
          active: record.active !== false,
        };
      }),
    };
  }

  const organizationId = typeof source.organizationId === "string" ? source.organizationId : "";
  return {
    id,
    email,
    isPlatformAdmin,
    orgMemberships: organizationId
      ? [
          {
            orgId: organizationId,
            orgName: organizationId === "default-org" ? "Default Organization" : organizationId,
            role,
            active: true,
          },
        ]
      : [],
  };
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
    const text = await response.text();
    const payload = parseJsonResponse(text);
    const data = unwrapApiPayload<unknown>(response, payload, "/api/auth/refresh");
    const normalized = normalizeAuthResponse(data);
    console.log("[auth] doRefresh: success");
    return {
      accessToken: normalized.accessToken,
      expiresIn: normalized.expiresIn,
    };
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
    // Do not force global logout for every 401 from non-auth endpoints.
    // Public pages/providers can trigger protected fetches before login, and
    // clearing session here causes post-login redirect flicker/blink loops.
    console.warn(`[auth] refresh failed for ${path}; preserving session state and returning 401 to caller`);
  }

  const text = response.status === 204 ? "" : await response.text();
  const payload = parseJsonResponse(text);
  return unwrapApiPayload<T>(response, payload, path);
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
  profile?: MeResponse;
  appInitialized?: boolean;
  appInitState?: string;
}

function normalizeAuthResponse(payload: unknown): AuthTokenResponse {
  if (!isRecord(payload)) {
    throw new Error("Authentication response was not an object.");
  }

  const nestedData = isRecord(payload.data) ? payload.data : undefined;
  const nestedAuth = isRecord(payload.auth) ? payload.auth : undefined;
  const nestedUser = isRecord(payload.user)
    ? payload.user
    : isRecord(nestedData?.user)
      ? nestedData.user
      : undefined;

  const accessToken = [
    payload.accessToken,
    payload.token,
    payload.authToken,
    nestedAuth?.accessToken,
    nestedAuth?.token,
    nestedData?.accessToken,
    nestedData?.token,
  ].find((value): value is string => typeof value === "string" && value.length > 0);

  if (!accessToken) {
    throw new Error("Authentication response did not include an access token.");
  }

  const expiresIn = [payload.expiresIn, nestedData?.expiresIn].find(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  ) ?? decodeJwtExpiresIn(accessToken);

  return {
    accessToken,
    expiresIn,
    profile: nestedUser ? normalizeMeResponse({ user: nestedUser }) : undefined,
    appInitialized: payload.appInitialized === true,
    appInitState: typeof payload.appInitState === "string" ? payload.appInitState : undefined,
  };
}

export async function loginApi(email: string, password: string): Promise<AuthTokenResponse> {
  const payload = await apiRequest<unknown>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return normalizeAuthResponse(payload);
}

export async function registerApi(email: string, password: string, setupToken?: string): Promise<AuthTokenResponse> {
  const payload = await apiRequest<unknown>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, ...(setupToken ? { setupToken } : {}) }),
  });
  return normalizeAuthResponse(payload);
}

export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest<void>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function logoutApi(): Promise<void> {
  await apiRequest<void>("/api/auth/logout", { method: "POST" });
}

export async function refreshToken(): Promise<AuthTokenResponse | null> {
  return doRefresh();
}

export async function meApi(): Promise<MeResponse> {
  const payload = await apiRequest<unknown>("/api/auth/me");
  return normalizeMeResponse(payload);
}

export async function bootstrapAdminApi(setupToken: string): Promise<AuthTokenResponse> {
  const payload = await apiRequest<unknown>("/api/auth/bootstrap-admin", {
    method: "POST",
    body: JSON.stringify({ setupToken }),
  });
  return normalizeAuthResponse(payload);
}

export async function generateLaunchTokenApi(organizationId: string | undefined, programDomain: string): Promise<string> {
  const data = await apiRequest<{ launchToken: string }>("/api/auth/launch-token", {
    method: "POST",
    body: JSON.stringify({ programDomain, ...(organizationId ? { organizationId } : {}) }),
  });
  return data.launchToken;
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
  const source = record as ProgramRecord & { key?: string; routePrefix?: string };
  const { deletedAt: _deletedAt, ...program } = source;
  const now = new Date().toISOString();
  const routePrefix = typeof source.routePrefix === "string" ? source.routePrefix : "";
  const derivedRoute = routePrefix || source.internalRoute || `/applications/${source.id}`;

  return {
    id: source.id,
    slug: source.slug || source.key || source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    organizationId: source.organizationId ?? undefined,
    name: source.name,
    shortDescription: source.shortDescription || `${source.name} workspace`,
    longDescription: source.longDescription || source.shortDescription || `${source.name} workspace`,
    category: source.category || "Operations",
    secondaryCategory: source.secondaryCategory ?? undefined,
    tags: Array.isArray(source.tags) ? source.tags : [],
    status: source.status || "live",
    type: source.type || (source.externalUrl ? "external" : "internal"),
    origin: source.origin || "suite-native",
    internalRoute: source.type === "external" ? undefined : derivedRoute,
    externalUrl: source.type === "external" ? source.externalUrl || routePrefix || undefined : source.externalUrl || undefined,
    openInNewTab: source.openInNewTab ?? source.type === "external",
    logoUrl: source.logoUrl ?? undefined,
    screenshotUrl: source.screenshotUrl ?? undefined,
    accentColor: source.accentColor ?? undefined,
    cardBackgroundColor: source.cardBackgroundColor ?? undefined,
    cardBackgroundOpacity: typeof source.cardBackgroundOpacity === "number" ? source.cardBackgroundOpacity : undefined,
    cardGlowColor: source.cardGlowColor ?? undefined,
    cardGlowOpacity: typeof source.cardGlowOpacity === "number" ? source.cardGlowOpacity : undefined,
    cardHoverTintOpacity: typeof source.cardHoverTintOpacity === "number" ? source.cardHoverTintOpacity : undefined,
    adminOnly: source.adminOnly ?? false,
    isFeatured: source.isFeatured ?? false,
    isPublic: source.isPublic ?? true,
    requiresLogin: source.requiresLogin ?? false,
    requiresApproval: source.requiresApproval ?? false,
    launchLabel: source.launchLabel || ((source.status || "live") === "coming-soon" ? "Coming Soon" : "Launch"),
    displayOrder: source.displayOrder ?? 999,
    notes: source.notes || "",
    createdAt: source.createdAt || now,
    updatedAt: source.updatedAt || now,
  };
}

export function normalizeOrganization(record: OrganizationRecord): Organization {
  const source = record as Partial<OrganizationRecord>;
  const now = new Date().toISOString();
  const slug = source.slug || source.id || "organization";
  const subdomain = source.subdomain || slug;
  const name = source.name || "Organization";
  const initials = (source.logo || name)
    .split(/\s+/)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("") || "OR";

  return {
    id: source.id || slug,
    name,
    slug,
    description: source.description || source.notes || "",
    subdomain,
    contactEmail: source.contactEmail || source.supportEmail || "support@ntlops.com",
    ownerEmail: source.ownerEmail || source.contactEmail || source.supportEmail || "owner@ntlops.com",
    ownerUserId: source.ownerUserId ?? undefined,
    logo: source.logo || initials,
    logoUrl: source.logoUrl ?? undefined,
    faviconUrl: source.faviconUrl ?? undefined,
    bannerUrl: source.bannerUrl ?? undefined,
    backgroundUrl: source.backgroundUrl ?? undefined,
    portalTitle: source.portalTitle || "",
    welcomeMessage: source.welcomeMessage || `Welcome to ${name}.`,
    supportEmail: source.supportEmail || source.contactEmail || "support@ntlops.com",
    supportContactName: source.supportContactName || `${name} Support`,
    supportPhone: source.supportPhone || undefined,
    phoneNumber: source.phoneNumber || undefined,
    industryType: source.industryType || undefined,
    notes: source.notes || undefined,
    planType: source.planType || "starter",
    billingPlan: source.billingPlan ?? undefined,
    seatLimit: source.seatLimit ?? 25,
    status: (source.status as Organization["status"]) || (source.isActive === false ? "suspended" : "active"),
    trialEndsAt: source.trialEndsAt || undefined,
    customDomain: source.customDomain ?? undefined,
    createdAt: source.createdAt || now,
    lastActivityAt: source.lastActivityAt || source.createdAt || now,
    branding: {
      primaryColor: source.branding?.primaryColor || "217 80% 56%",
      secondaryColor: source.branding?.secondaryColor || "220 70% 40%",
      accentColor: source.branding?.accentColor || "191 85% 47%",
      backgroundColor: source.branding?.backgroundColor || "#0f172a",
      backgroundStartColor: source.branding?.backgroundStartColor || "#0f172a",
      backgroundEndColor: source.branding?.backgroundEndColor || "#1d4ed8",
      bannerStartColor: source.branding?.bannerStartColor || "#1e293b",
      bannerEndColor: source.branding?.bannerEndColor || "#0ea5e9",
      gradientAngle: typeof source.branding?.gradientAngle === "number" ? source.branding.gradientAngle : 135,
      fontFamily: source.branding?.fontFamily || "inter",
    },
    assignedProgramIds: Array.isArray(source.assignedProgramIds) ? source.assignedProgramIds : [],
    enabledModules: Array.isArray(source.enabledModules) ? source.enabledModules : [],
    assignedBundleIds: Array.isArray(source.assignedBundleIds) ? source.assignedBundleIds : [],
    announcements: Array.isArray(source.announcements) ? source.announcements : [],
    tags: Array.isArray(source.tags) ? source.tags : [],
  };
}

export function normalizeOrgUser(record: OrgUserRecord): PortalUser {
  const source = record as Partial<OrgUserRecord>;
  return {
    id: source.id || crypto.randomUUID(),
    orgId: source.orgId || "",
    name: source.name || source.email || "User",
    email: source.email || "",
    role: source.role || "staff",
    active: source.active ?? true,
    assignedProgramIds: Array.isArray(source.assignedProgramIds) ? source.assignedProgramIds : [],
    authUserId: source.authUserId ?? undefined,
  };
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
    secondaryCategory: program.secondaryCategory || null,
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
    cardBackgroundColor: program.cardBackgroundColor || null,
    cardBackgroundOpacity: program.cardBackgroundOpacity ?? null,
    cardGlowColor: program.cardGlowColor || null,
    cardGlowOpacity: program.cardGlowOpacity ?? null,
    cardHoverTintOpacity: program.cardHoverTintOpacity ?? null,
    adminOnly: program.adminOnly ?? false,
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
    backgroundUrl: organization.backgroundUrl || null,
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

export interface PortalStatusResponse {
  organizationId: string;
  slug: string;
  subdomain: string;
  name: string;
  status: string;
  enabledPrograms: string[];
  enabledModules: string[];
  portalTitle: string;
  customDomain: string | null;
}

export function getPortalStatus(slugOrSubdomain: string) {
  return apiRequest<PortalStatusResponse>(`/api/organization/portal-status?slug=${encodeURIComponent(slugOrSubdomain)}`);
}

export interface PortalBootstrapResponse {
  organization: OrganizationRecord;
  branding: OrganizationRecord["branding"];
  membership: {
    orgId: string;
    userId: string;
    role: string;
    active: boolean;
    email: string;
    name: string;
  } | null;
  enabledModules: string[];
  enabledPrograms: ProgramRecord[];
  portalStatus: {
    status: string;
    isPending: boolean;
    isActive: boolean;
    isSuspended: boolean;
  };
}

export function getPortalBootstrap() {
  return apiRequest<PortalBootstrapResponse>("/api/portal/bootstrap");
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
