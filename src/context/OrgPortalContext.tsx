import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { organizations as seedOrganizations, suiteBundles, users as seedUsers } from "@/data/orgPortalSeed";
import {
  createOrgUser as createOrgUserRecord,
  createOrganization as createOrganizationRecord,
  listOrgUsers,
  listOrganizations,
  normalizeOrgUser,
  normalizeOrganization,
  toOrgUserMutationInput,
  toOrganizationMutationInput,
  updateOrgUser as updateOrgUserRecord,
  updateOrganization as updateOrganizationRecord,
} from "@/lib/api";
import { usePrograms } from "@/context/ProgramContext";
import { useAuth } from "@/context/AuthContext";
import { Bundle, OrgRole, Organization, PortalUser, SuiteProgram } from "@/types/orgPortal";

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

interface InviteUserInput {
  orgId: string;
  name: string;
  email: string;
  role: OrgRole;
  assignedProgramIds: string[];
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
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  accentColor: string;
  assignedProgramIds: string[];
  assignedBundleIds: string[];
  planType: Organization["planType"];
  status: Organization["status"];
  seatLimit: number;
  trialEndsAt?: string;
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
  inviteUser: (input: InviteUserInput) => Promise<void>;
  createOrganization: (input: CreateOrganizationInput) => Promise<Organization>;
  updateUser: (userId: string, updates: Partial<PortalUser>) => Promise<void>;
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

  const programs = useMemo<SuiteProgram[]>(() => {
    return catalogPrograms.map((program) => ({
      id: program.id,
      name: program.name,
      description: program.shortDescription,
      logo: program.name
        .split(/\s+/)
        .slice(0, 2)
        .map((segment) => segment[0]?.toUpperCase() ?? "")
        .join(""),
      launchUrl: program.type === "external" ? program.externalUrl || `/applications/${program.id}` : program.internalRoute || `/applications/${program.id}`,
      status:
        program.status === "live"
          ? "active"
          : program.status === "beta"
            ? "beta"
            : program.status === "coming-soon"
              ? "coming-soon"
              : "maintenance",
    }));
  }, [catalogPrograms]);

  const hydrateOrganizations = useCallback(async () => {
    setIsLoading(true);

    try {
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
    const userProgramSet = new Set(user.assignedProgramIds);
    return orgPrograms.filter((program) => userProgramSet.has(program.id));
  };

  const inviteUser = async (input: InviteUserInput) => {
    const nextUser: PortalUser = {
      id: `usr-${Date.now()}`,
      orgId: input.orgId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      active: true,
      assignedProgramIds: input.assignedProgramIds,
    };

    const created = normalizeOrgUser(await createOrgUserRecord(input.orgId, toOrgUserMutationInput(nextUser)));

    setUsers((prev) => {
      const next = [...prev, created];
      saveUsers(next);
      return next;
    });
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
      bannerUrl: input.bannerUrl || "",
      welcomeMessage: `Welcome to ${input.name.trim()}. Your organization portal is ready.`,
      supportContactName: `${input.name.trim()} Support`,
      phoneNumber: input.phoneNumber?.trim() || "",
      industryType: input.industryType?.trim() || "",
      notes: input.notes?.trim() || "",
      planType: input.planType,
      seatLimit: input.seatLimit,
      status: input.status,
      trialEndsAt: input.trialEndsAt || "",
      createdAt: now,
      lastActivityAt: now,
      branding: {
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
      },
      assignedProgramIds: input.assignedProgramIds,
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

    const created = normalizeOrganization(await createOrganizationRecord(toOrganizationMutationInput(organization)));

    setOrganizations((prev) => {
      const next = [...prev, created];
      saveOrganizations(next);
      return next;
    });

    return created;
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
