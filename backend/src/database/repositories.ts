import type { AuthUserRecord } from "../models/auth.model.js";
import type { OrganizationRecord } from "../models/organization.model.js";
import type { OrgUserRecord } from "../models/org-user.model.js";
import type { ProgramRecord } from "../models/program.model.js";
import { jsonStore } from "./json-store.js";

export class ProgramRepository {
  async list(partitionKey: string) {
    const state = await jsonStore.getPartitionState(partitionKey);
    return state.programs;
  }

  async findById(partitionKey: string, id: string) {
    const programs = await this.list(partitionKey);
    return programs.find((program) => program.id === id) || null;
  }

  async create(partitionKey: string, program: ProgramRecord) {
    await jsonStore.updatePartition(partitionKey, (state) => ({
      ...state,
      programs: [...state.programs, program],
    }));

    return program;
  }

  async update(partitionKey: string, id: string, updater: (current: ProgramRecord) => ProgramRecord) {
    let updated: ProgramRecord | null = null;

    await jsonStore.updatePartition(partitionKey, (state) => ({
      ...state,
      programs: state.programs.map((program) => {
        if (program.id !== id) {
          return program;
        }

        updated = updater(program);
        return updated;
      }),
    }));

    return updated;
  }
}

export class OrganizationRepository {
  async list(partitionKey: string) {
    const state = await jsonStore.getPartitionState(partitionKey);
    return state.organizations;
  }

  async findById(partitionKey: string, id: string) {
    const organizations = await this.list(partitionKey);
    return organizations.find((organization) => organization.id === id) || null;
  }

  async create(partitionKey: string, organization: OrganizationRecord) {
    await jsonStore.updatePartition(partitionKey, (state) => ({
      ...state,
      organizations: [...state.organizations, organization],
    }));

    return organization;
  }

  async update(partitionKey: string, id: string, updater: (current: OrganizationRecord) => OrganizationRecord) {
    let updated: OrganizationRecord | null = null;

    await jsonStore.updatePartition(partitionKey, (state) => ({
      ...state,
      organizations: state.organizations.map((organization) => {
        if (organization.id !== id) {
          return organization;
        }

        updated = updater(organization);
        return updated;
      }),
    }));

    return updated;
  }
}

export class OrgUserRepository {
  async list(partitionKey: string, orgId?: string) {
    const state = await jsonStore.getPartitionState(partitionKey);
    if (!orgId) {
      return state.users;
    }

    return state.users.filter((user) => user.orgId === orgId);
  }

  async findById(partitionKey: string, id: string) {
    const users = await this.list(partitionKey);
    return users.find((user) => user.id === id) || null;
  }

  async findByAuthUserId(partitionKey: string, authUserId: string, orgId: string) {
    const users = await this.list(partitionKey);
    return users.find((u) => u.authUserId === authUserId && u.orgId === orgId) || null;
  }

  async listByAuthUserId(partitionKey: string, authUserId: string) {
    const users = await this.list(partitionKey);
    return users.filter((u) => u.authUserId === authUserId && !u.deletedAt);
  }

  async linkAuthUser(partitionKey: string, email: string, authUserId: string) {
    const normalized = email.trim().toLowerCase();
    await jsonStore.updatePartition(partitionKey, (state) => ({
      ...state,
      users: state.users.map((u) =>
        u.email.toLowerCase() === normalized && !u.authUserId
          ? { ...u, authUserId, updatedAt: new Date().toISOString() }
          : u,
      ),
    }));
  }

  async create(partitionKey: string, user: OrgUserRecord) {
    await jsonStore.updatePartition(partitionKey, (state) => ({
      ...state,
      users: [...state.users, user],
    }));

    return user;
  }

  async update(partitionKey: string, id: string, updater: (current: OrgUserRecord) => OrgUserRecord) {
    let updated: OrgUserRecord | null = null;

    await jsonStore.updatePartition(partitionKey, (state) => ({
      ...state,
      users: state.users.map((user) => {
        if (user.id !== id) {
          return user;
        }

        updated = updater(user);
        return updated;
      }),
    }));

    return updated;
  }
}

export class AuthUserRepository {
  async list(partitionKey: string) {
    const state = await jsonStore.getPartitionState(partitionKey);
    return state.authUsers;
  }

  async findById(partitionKey: string, id: string) {
    const users = await this.list(partitionKey);
    return users.find((u) => u.id === id) || null;
  }

  async findByEmail(partitionKey: string, email: string) {
    const users = await this.list(partitionKey);
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async create(partitionKey: string, user: AuthUserRecord) {
    await jsonStore.updatePartition(partitionKey, (state) => ({
      ...state,
      authUsers: [...state.authUsers, user],
    }));
    return user;
  }

  async update(partitionKey: string, id: string, updater: (u: AuthUserRecord) => AuthUserRecord) {
    let updated: AuthUserRecord | null = null;

    await jsonStore.updatePartition(partitionKey, (state) => ({
      ...state,
      authUsers: state.authUsers.map((u) => {
        if (u.id !== id) return u;
        updated = updater(u);
        return updated;
      }),
    }));

    return updated;
  }
}

export const programRepository = new ProgramRepository();
export const organizationRepository = new OrganizationRepository();
export const orgUserRepository = new OrgUserRepository();
export const authUserRepository = new AuthUserRepository();
