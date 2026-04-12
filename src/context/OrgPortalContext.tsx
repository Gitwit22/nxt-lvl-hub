import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { organizations as seedOrganizations, suiteBundles, users as seedUsers } from "@/data/orgPortalSeed";
import {
  createOrgUser as createOrgUserRecord,
  createOrganization as createOrganizationRecord,
  getPortalBootstrap,
  listOrgUsers,
  listOrganizations,
  normalizeProgram,
  normalizeOrgUser,
  normalizeOrganization,
  removeOrgUser as removeOrgUserRecord,
  resetOrgUserPassword as resetOrgUserPasswordRecord,
  toOrgUserMutationInput,
  toOrganizationMutationInput,
  updateOrgUser as updateOrgUserRecord,
  updateOrganization as updateOrganizationRecord,
} from "@/lib/api";
import { usePrograms } from "@/context/ProgramContext";
import { useAuth } from "@/context/AuthContext";
import { Bundle, OrgRole, Organization, PortalUser, SuiteProgram } from "@/types/orgPortal";
import { getOrganizationSlugFromHost } from "@/lib/orgRoutes";

const ORG_STORAGE_KEY = "nxtlvl.organizations";
const USER_STORAGE_KEY = "nxtlvl.orgUsers";

function loadOrganizations() {
  const raw = localStorage.getItem(ORG_STORAGE_KEY);
  if (!raw) return seedOrganizations;
  try {
    const parsed = JSON.parse(raw) as Organization[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedOrganizations;
  } catch {
    return seedOrganizations;
  }
}

function saveOrganizations(organizations: Organization[]) {
  localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(organizations));
}

function loadUsers() {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return seedUsers;
  try {
    const parsed = JSON.parse(raw) as PortalUser[];
    return Array.isArray(parsed) ? parsed : seedUsers;
  } catch {
    return seedUsers;
  }
}

function saveUsers(users: PortalUser[]) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}

function toPortalProgramStatus(status: string): SuiteProgram["status"] {
  if (status === "live") return "active";
  if (status === "beta") return "beta";
  if (status === "coming-soon") return "coming-soon";
  return "maintenance";
}

interface InviteUserInput {
  orgId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: OrgRole;
  passwordMode?: "auto" | "manual";
  tempPassword?: string;
  assignedProgramIds: string[];
}

interface InviteUserResult {
  tempPassword?: string;
  manualTempPassword?: string;
  passwordWasGenerated: boolean;
  existingUser: boolean;
  email: string;
  mustChangePassword?: boolean;
}

interface ResetUserPasswordResult {
  tempPassword: string;
  email: string;
  mustChangePassword?: boolean;
}

interface CreateOrganizationInput {
  name: string;
  slug: string;
  subdomain: string;
  contactEmail: string;
  ownerEmail: string;
  supportEmail: string;
  phoneNumber?: string;
  industryType?: string;
  notes?: string;
  contactUser?: { name: string; email: string };
  logoUrl?: string;
  faviconUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor: string;
  backgroundColor?: string;
  fontFamily?: string;
  assignedProgramIds: string[];
  assignedBundleIds: string[];
  enabledModules?: string[];
  planType: Organization["planType"];
  status: Organization["status"];
  seatLimit: number;
  trialEndsAt?: string;
  supportPhone?: string;
  billingPlan?: string;
  customDomain?: string;
  portalTitle?: string;
  welcomeMessage?: string;
}

interface OrgPortalContextType {
  organizations: Organization[];
  programs: SuiteProgram[];
  bundles: Bundle[];
  users: PortalUser[];
  isLoading: boolean;
  getOrganizationBySlug: (slug: string) => Organization | undefined;
  getOrganizationBySubdomain: (subdomain: string) => Organization | undefined;
  getOrganizationById: (orgId: string) => Organization | undefined;
  getBundleById: (bundleId: string) => Bundle | undefined;
  isSubdomainAvailable: (subdomain: string, exceptOrgId?: string) => boolean;
  getUsersForOrganization: (orgId: string) => PortalUser[];
  getOrganizationPrograms: (org: Organization) => SuiteProgram[];
  getOrgCurrentUser: (orgId: string) => PortalUser | undefined;
  getProgramsForUser: (org: Organization, userId: string) => SuiteProgram[];
  inviteUser: (input: InviteUserInput) => Promise<InviteUserResult>;
  createOrganization: (input: CreateOrganizationInput) => Promise<Organization & { tempPassword?: string; contactUserEmail?: string; contactUserId?: string }>;
  updateUser: (userId: string, updates: Partial<PortalUser>) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string) => Promise<ResetUserPasswordResult>;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => Promise<void>;
  setOrganizationPrograms: (orgId: string, assignedProgramIds: string[], assignedBundleIds: string[]) => Promise<void>;
}

const OrgPortalContext = createContext<OrgPortalContextType | undefined>(undefined);

function roleWeight(role: OrgRole) {
  switch (role) {
    case "super_admin":
      return 4;
    case "org_admin":
      return 3;
    case "manager":
      return 2;
    case "staff":
      return 1;
    default:
      return 1;
  }
}

export function canManageUsers(role: OrgRole) {
  return role === "super_admin" || role === "org_admin";
}

export function OrgPortalProvider({ children }: { children: React.ReactNode }) {
  const { programs: catalogPrograms } = usePrograms();
  const { authUserId, isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>(() => loadOrganizations());
  const [users, setUsers] = useState<PortalUser[]>(() => loadUsers());
  const [bootstrapPrograms, setBootstrapPrograms] = useState<SuiteProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateUsers = useCallback(async (orgRecords: Organization[]) => {
    if (orgRecords.length === 0) {
      setUsers([]);
      saveUsers([]);
      return;
    }

    const settled = await Promise.allSettled(orgRecords.map((organization) => listOrgUsers(organization.id)));
    const records = settled.flatMap((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      console.error("Failed to load organization users from API.", result.reason);
      return [];
    });
    const merged = records.map(normalizeOrgUser);

    if (merged.length === 0) {
      const legacyUsers = loadUsers().filter((user) => orgRecords.some((organization) => organization.id === user.orgId));
      if (legacyUsers.length > 0) {
        await Promise.allSettled(
          legacyUsers.map((user) => createOrgUserRecord(user.orgId, toOrgUserMutationInput(user))),
        );

        const seededSettled = await Promise.allSettled(orgRecords.map((organization) => listOrgUsers(organization.id)));
        const normalizedSeededUsers = seededSettled
          .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
          .map(normalizeOrgUser);
        setUsers(normalizedSeededUsers);
        saveUsers(normalizedSeededUsers);
        return;
      }
    }

    setUsers(merged);
    saveUsers(merged);
  }, []);

  const catalogSuitePrograms = useMemo<SuiteProgram[]>(() => {
    return catalogPrograms.map((program) => ({
      id: program.id,
      name: program.name,
      description: program.shortDescription,
      logo: program.name
        .split(/\s+/)
        .slice(0, 2)
        .map((segment) => segment[0]?.toUpperCase() ?? "")
        .join(""),
      logoUrl: program.logoUrl,
      launchUrl: program.type === "external" ? program.externalUrl || `/applications/${program.id}` : program.internalRoute || `/applications/${program.id}`,
      status: toPortalProgramStatus(program.status),
      programDomain: program.slug || program.id.replace(/^program-/, ""),
    }));
  }, [catalogPrograms]);

  const programs = useMemo<SuiteProgram[]>(() => {
    if (bootstrapPrograms.length === 0) {
      return catalogSuitePrograms;
    }

    if (catalogSuitePrograms.length === 0) {
      return bootstrapPrograms;
    }

    const merged = new Map(catalogSuitePrograms.map((program) => [program.id, program]));
    bootstrapPrograms.forEach((program) => {
      if (!merged.has(program.id)) {
        merged.set(program.id, program);
      }
    });

    return Array.from(merged.values());
  }, [catalogSuitePrograms, bootstrapPrograms]);

  const hydrateOrganizations = useCallback(async () => {
    setIsLoading(true);

    try {
      const portalSlug = typeof window !== "undefined" ? getOrganizationSlugFromHost(window.location.hostname) : null;

      if (portalSlug) {
        const bootstrap = await getPortalBootstrap();
        const organization = normalizeOrganization(bootstrap.organization);
        const normalizedPrograms = bootstrap.enabledPrograms.map(normalizeProgram).map((program) => ({
          id: program.id,
          name: program.name,
          description: program.shortDescription,
          logo: program.name
            .split(/\s+/)
            .slice(0, 2)
            .map((segment) => segment[0]?.toUpperCase() ?? "")
            .join(""),
          logoUrl: program.logoUrl,
          launchUrl: program.type === "external" ? program.externalUrl || `/applications/${program.id}` : program.internalRoute || `/applications/${program.id}`,
          status: toPortalProgramStatus(program.status),
          programDomain: program.slug || program.id.replace(/^program-/, ""),
        }));
        setBootstrapPrograms(normalizedPrograms);

        const portalUsers: PortalUser[] = bootstrap.membership
          ? [
              {
                id: bootstrap.membership.userId,
                orgId: bootstrap.membership.orgId,
                name: bootstrap.membership.name,
                email: bootstrap.membership.email,
                role: bootstrap.membership.role as OrgRole,
                active: bootstrap.membership.active,
                assignedProgramIds: normalizedPrograms.map((program) => program.id),
                authUserId,
              },
            ]
          : [];

        setOrganizations([organization]);
        setUsers(portalUsers);
        saveOrganizations([organization]);
        saveUsers(portalUsers);

        return;
      }

      setBootstrapPrograms([]);

      const records = await listOrganizations();

      if (records.length === 0) {
        const legacyOrganizations = loadOrganizations();

        if (legacyOrganizations.length > 0) {
          await Promise.all(legacyOrganizations.map((organization) => createOrganizationRecord(toOrganizationMutationInput(organization))));
          const seededRecords = await listOrganizations();
          const normalizedOrganizations = seededRecords.map(normalizeOrganization);
          setOrganizations(normalizedOrganizations);
          saveOrganizations(normalizedOrganizations);
          await hydrateUsers(normalizedOrganizations);
        } else {
          setOrganizations([]);
          saveOrganizations([]);
          setUsers([]);
          saveUsers([]);
        }
      } else {
        const normalizedOrganizations = records.map(normalizeOrganization);
        setOrganizations(normalizedOrganizations);
        saveOrganizations(normalizedOrganizations);
        await hydrateUsers(normalizedOrganizations);
      }
    } catch (error) {
      console.error("Failed to load organizations from API.", error);
      const fallbackOrganizations = loadOrganizations();
      const fallbackUsers = loadUsers();
      setOrganizations(fallbackOrganizations);
      setUsers(fallbackUsers);
      setBootstrapPrograms([]);
      saveOrganizations(fallbackOrganizations);
      saveUsers(fallbackUsers);
    } finally {
      setIsLoading(false);
    }
  }, [hydrateUsers]);

  useEffect(() => {
    void hydrateOrganizations();
  }, [hydrateOrganizations, isAuthenticated]);

  const getOrganizationBySlug = (slug: string) => organizations.find((org) => org.slug === slug);
  const getOrganizationBySubdomain = (subdomain: string) =>
    organizations.find((org) => org.subdomain.toLowerCase() === subdomain.trim().toLowerCase());
  const getOrganizationById = (orgId: string) => organizations.find((org) => org.id === orgId);
  const getBundleById = (bundleId: string) => suiteBundles.find((bundle) => bundle.id === bundleId);
  const isSubdomainAvailable = (subdomain: string, exceptOrgId?: string) => {
    const normalized = subdomain.trim().toLowerCase();
    if (!normalized) return false;
    return !organizations.some((org) => org.subdomain.toLowerCase() === normalized && org.id !== exceptOrgId);
  };

  const getUsersForOrganization = (orgId: string) => users.filter((user) => user.orgId === orgId);

  const getOrganizationPrograms = (org: Organization) => {
    const bundleProgramIds = org.assignedBundleIds.flatMap((bundleId) => getBundleById(bundleId)?.programIds ?? []);
    const programIds = new Set([...org.assignedProgramIds, ...bundleProgramIds]);
    return programs.filter((program) => programIds.has(program.id));
  };

  const getProgramsForUser = (org: Organization, userId: string) => {
    const user = users.find((entry) => entry.id === userId);
    if (!user || !user.active) return [];

    const orgPrograms = getOrganizationPrograms(org);
    if (canManageUsers(user.role)) {
      return orgPrograms;
    }

    const userProgramSet = new Set(user.assignedProgramIds);
    return orgPrograms.filter((program) => userProgramSet.has(program.id));
  };

  const inviteUser = async (input: InviteUserInput): Promise<InviteUserResult> => {
    const result = await createOrgUserRecord(input.orgId, {
      name: input.name.trim(),
      firstName: input.firstName?.trim() || undefined,
      lastName: input.lastName?.trim() || undefined,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      passwordMode: input.passwordMode,
      tempPassword: input.tempPassword,
      assignedProgramIds: input.assignedProgramIds,
      active: true,
    });
    const created = normalizeOrgUser(result);

    setUsers((prev) => {
      const next = [...prev, created];
      saveUsers(next);
      return next;
    });

    return {
      tempPassword: result.tempPassword,
      manualTempPassword: result.manualTempPassword,
      passwordWasGenerated: result.passwordWasGenerated === true,
      existingUser: result.existingUser === true,
      email: created.email,
      mustChangePassword: result.mustChangePassword,
    };
  };

  const createOrganization = async (input: CreateOrganizationInput) => {
    const now = new Date().toISOString();
    const orgId = `org-${crypto.randomUUID()}`;
    const initials = input.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase() ?? "")
      .join("");

    const organization: Organization = {
      id: orgId,
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.notes?.trim() || "",
      subdomain: input.subdomain.trim().toLowerCase(),
      contactEmail: input.contactEmail.trim().toLowerCase(),
      ownerEmail: input.ownerEmail.trim().toLowerCase(),
      supportEmail: input.supportEmail.trim().toLowerCase(),
      logo: initials || "OR",
      logoUrl: input.logoUrl || "",
      faviconUrl: input.faviconUrl || "",
      bannerUrl: input.bannerUrl || "",
      backgroundUrl: "",
      portalTitle: input.portalTitle?.trim() || "",
      welcomeMessage: input.welcomeMessage?.trim() || `Welcome to ${input.name.trim()}. Your organization portal is ready.`,
      supportContactName: `${input.name.trim()} Support`,
      supportPhone: input.supportPhone?.trim() || "",
      phoneNumber: input.phoneNumber?.trim() || "",
      industryType: input.industryType?.trim() || "",
      notes: input.notes?.trim() || "",
      planType: input.planType,
      billingPlan: input.billingPlan?.trim() || null,
      seatLimit: input.seatLimit,
      status: input.status,
      trialEndsAt: input.trialEndsAt || "",
      customDomain: input.customDomain?.trim() || null,
      createdAt: now,
      lastActivityAt: now,
      branding: {
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor || "",
        accentColor: input.accentColor,
        backgroundColor: input.backgroundColor || "",
        backgroundStartColor: input.primaryColor,
        backgroundEndColor: input.accentColor,
        bannerStartColor: input.primaryColor,
        bannerEndColor: input.accentColor,
        gradientAngle: 135,
        fontFamily: input.fontFamily || "inter",
      },
      assignedProgramIds: input.assignedProgramIds,
      enabledModules: input.enabledModules || [],
      assignedBundleIds: input.assignedBundleIds,
      announcements: [
        {
          id: `ann-${Date.now()}`,
          title: "Organization created",
          message: "Portal provisioning completed from platform admin.",
          createdAt: now.slice(0, 10),
        },
      ],
      tags: input.industryType?.trim() ? [input.industryType.trim()] : [],
    };

    const payload = {
      ...toOrganizationMutationInput(organization),
      ...(input.contactUser ? { contactUser: input.contactUser } : {}),
    };
    const result = await createOrganizationRecord(payload);
    const created = normalizeOrganization(result);

    setOrganizations((prev) => {
      const next = [...prev, created];
      saveOrganizations(next);
      return next;
    });

    return {
      ...created,
      tempPassword: result.tempPassword,
      contactUserEmail: result.contactUserEmail,
      contactUserId: result.contactUserId,
    };
  };

  const updateUser = async (userId: string, updates: Partial<PortalUser>) => {
    const current = users.find((user) => user.id === userId);
    if (!current) {
      return;
    }

    const merged: PortalUser = {
      ...current,
      ...updates,
    };

    const updated = normalizeOrgUser(
      await updateOrgUserRecord(current.orgId, userId, toOrgUserMutationInput(merged)),
    );

    setUsers((prev) => {
      const next = prev.map((user) => (user.id === userId ? updated : user));
      saveUsers(next);
      return next;
    });
  };

  const removeUser = async (userId: string) => {
    const current = users.find((user) => user.id === userId);
    if (!current) {
      return;
    }

    await removeOrgUserRecord(current.orgId, userId);

    setUsers((prev) => {
      const next = prev.filter((user) => user.id !== userId);
      saveUsers(next);
      return next;
    });
  };

  const resetUserPassword = async (userId: string): Promise<ResetUserPasswordResult> => {
    const current = users.find((user) => user.id === userId);
    if (!current) {
      throw new Error("User not found.");
    }

    const result = await resetOrgUserPasswordRecord(current.orgId, userId);
    return {
      tempPassword: result.tempPassword,
      email: result.email,
    };
  };

  const getOrgCurrentUser = useCallback(
    (orgId: string) => users.find((u) => u.orgId === orgId && u.authUserId === authUserId),
    [users, authUserId],
  );

  const updateOrganization = async (orgId: string, updates: Partial<Organization>) => {
    const current = organizations.find((org) => org.id === orgId);

    if (!current) {
      return;
    }

    const merged: Organization = {
      ...current,
      ...updates,
      branding: updates.branding ? { ...current.branding, ...updates.branding } : current.branding,
      lastActivityAt: new Date().toISOString(),
    };

    const updated = normalizeOrganization(await updateOrganizationRecord(orgId, toOrganizationMutationInput(merged)));

    setOrganizations((prev) => {
      const next = prev.map((org) => (org.id === orgId ? updated : org));
      saveOrganizations(next);
      return next;
    });
  };

  const setOrganizationPrograms = async (orgId: string, assignedProgramIds: string[], assignedBundleIds: string[]) => {
    await updateOrganization(orgId, { assignedProgramIds, assignedBundleIds });
  };

  const value: OrgPortalContextType = {
    organizations,
    programs,
    bundles: suiteBundles,
    users,
    isLoading,
    getOrganizationBySlug,
    getOrganizationBySubdomain,
    getOrganizationById,
    getBundleById,
    isSubdomainAvailable,
    getUsersForOrganization,
    getOrganizationPrograms,
    getOrgCurrentUser,
    getProgramsForUser,
    inviteUser,
    createOrganization,
    updateUser,
    removeUser,
    resetUserPassword,
    updateOrganization,
    setOrganizationPrograms,
  };

  return <OrgPortalContext.Provider value={value}>{children}</OrgPortalContext.Provider>;
}

export function useOrgPortal() {
  const context = useContext(OrgPortalContext);
  if (!context) {
    throw new Error("useOrgPortal must be used inside OrgPortalProvider");
  }

  return context;
}
