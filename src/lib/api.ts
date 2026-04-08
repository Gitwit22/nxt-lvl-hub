import type { Organization } from "@/types/orgPortal";
import type { PortalUser } from "@/types/orgPortal";
import type { Program } from "@/types/program";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
  error: string | null;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const APP_PARTITION = (import.meta.env.VITE_APP_PARTITION || "nxt-lvl-hub").trim().toLowerCase();

function toApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const response = await fetch(toApiUrl(path), {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      "x-app-partition": APP_PARTITION,
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || payload.message || "Request failed.");
  }

  return payload.data;
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
