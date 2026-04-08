import React, { createContext, useContext, useState } from "react";
import { organizations as seedOrganizations, suiteBundles, suitePrograms, users as seedUsers } from "@/data/orgPortalSeed";
import { Bundle, OrgRole, Organization, PortalUser, SuiteProgram } from "@/types/orgPortal";

const ORG_STORAGE_KEY = "nxtlvl.organizations";
const USER_STORAGE_KEY = "nxtlvl.orgUsers";
const ACTIVE_USER_STORAGE_KEY = "nxtlvl.activeUserByOrg";

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

function getInitialActiveUserByOrg(users: PortalUser[], organizations: Organization[]) {
  const raw = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string | undefined>;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // Fall through to generated map.
    }
  }

  const sortedUsers = [...users].sort((a, b) => roleWeight(b.role) - roleWeight(a.role));
  return organizations.reduce<Record<string, string | undefined>>((acc, org) => {
    const first = sortedUsers.find((user) => user.orgId === org.id && user.active);
    acc[org.id] = first?.id;
    return acc;
  }, {});
}

function saveActiveUserByOrg(map: Record<string, string | undefined>) {
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(map));
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
  activeUserByOrg: Record<string, string | undefined>;
  getOrganizationBySlug: (slug: string) => Organization | undefined;
  getOrganizationBySubdomain: (subdomain: string) => Organization | undefined;
  getOrganizationById: (orgId: string) => Organization | undefined;
  getBundleById: (bundleId: string) => Bundle | undefined;
  isSubdomainAvailable: (subdomain: string, exceptOrgId?: string) => boolean;
  getUsersForOrganization: (orgId: string) => PortalUser[];
  getOrganizationPrograms: (org: Organization) => SuiteProgram[];
  getProgramsForUser: (org: Organization, userId: string) => SuiteProgram[];
  inviteUser: (input: InviteUserInput) => void;
  createOrganization: (input: CreateOrganizationInput) => Organization;
  updateUser: (userId: string, updates: Partial<PortalUser>) => void;
  setActiveUserForOrg: (orgId: string, userId: string) => void;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => void;
  setOrganizationPrograms: (orgId: string, assignedProgramIds: string[], assignedBundleIds: string[]) => void;
}

const OrgPortalContext = createContext<OrgPortalContextType | undefined>(undefined);

function roleWeight(role: OrgRole) {
  switch (role) {
    case "Super Admin":
      return 4;
    case "Org Admin":
      return 3;
    case "Manager":
      return 2;
    case "Staff":
      return 1;
    default:
      return 1;
  }
}

export function canManageUsers(role: OrgRole) {
  return role === "Super Admin" || role === "Org Admin";
}

export function OrgPortalProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>(() => loadOrganizations());
  const [users, setUsers] = useState<PortalUser[]>(() => loadUsers());
  const [activeUserByOrg, setActiveUserByOrg] = useState<Record<string, string | undefined>>(() =>
    getInitialActiveUserByOrg(loadUsers(), loadOrganizations()),
  );

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
    return suitePrograms.filter((program) => programIds.has(program.id));
  };

  const getProgramsForUser = (org: Organization, userId: string) => {
    const user = users.find((entry) => entry.id === userId);
    if (!user || !user.active) return [];

    const orgPrograms = getOrganizationPrograms(org);
    const userProgramSet = new Set(user.assignedProgramIds);
    return orgPrograms.filter((program) => userProgramSet.has(program.id));
  };

  const inviteUser = (input: InviteUserInput) => {
    const nextUser: PortalUser = {
      id: `usr-${Date.now()}`,
      orgId: input.orgId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      active: true,
      assignedProgramIds: input.assignedProgramIds,
    };

    setUsers((prev) => {
      const next = [...prev, nextUser];
      saveUsers(next);
      return next;
    });
  };

  const createOrganization = (input: CreateOrganizationInput) => {
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
      subdomain: input.subdomain.trim().toLowerCase(),
      contactEmail: input.contactEmail.trim().toLowerCase(),
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
    };

    setOrganizations((prev) => {
      const next = [...prev, organization];
      saveOrganizations(next);
      return next;
    });

    return organization;
  };

  const updateUser = (userId: string, updates: Partial<PortalUser>) => {
    setUsers((prev) => {
      const next = prev.map((user) => (user.id === userId ? { ...user, ...updates } : user));
      saveUsers(next);
      return next;
    });
  };

  const setActiveUserForOrg = (orgId: string, userId: string) => {
    setActiveUserByOrg((prev) => {
      const next = { ...prev, [orgId]: userId };
      saveActiveUserByOrg(next);
      return next;
    });
  };

  const updateOrganization = (orgId: string, updates: Partial<Organization>) => {
    setOrganizations((prev) => {
      const next = prev.map((org) =>
        org.id === orgId ? { ...org, ...updates, lastActivityAt: new Date().toISOString() } : org,
      );
      saveOrganizations(next);
      return next;
    });
  };

  const setOrganizationPrograms = (orgId: string, assignedProgramIds: string[], assignedBundleIds: string[]) => {
    setOrganizations((prev) => {
      const next = prev.map((org) =>
        org.id === orgId
          ? {
              ...org,
              assignedProgramIds,
              assignedBundleIds,
              lastActivityAt: new Date().toISOString(),
            }
          : org,
      );
      saveOrganizations(next);
      return next;
    });
  };

  const value: OrgPortalContextType = {
    organizations,
    programs: suitePrograms,
    bundles: suiteBundles,
    users,
    activeUserByOrg,
    getOrganizationBySlug,
    getOrganizationBySubdomain,
    getOrganizationById,
    getBundleById,
    isSubdomainAvailable,
    getUsersForOrganization,
    getOrganizationPrograms,
    getProgramsForUser,
    inviteUser,
    createOrganization,
    updateUser,
    setActiveUserForOrg,
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
