import type { OrganizationRecord } from "../models/organization.model.js";
import type { ProgramRecord } from "../models/program.model.js";
import { jsonStore } from "./json-store.js";

export class ProgramRepository {
  async list() {
    const state = await jsonStore.read();
    return state.programs;
  }

  async findById(id: string) {
    const programs = await this.list();
    return programs.find((program) => program.id === id) || null;
  }

  async create(program: ProgramRecord) {
    await jsonStore.write((state) => ({
      ...state,
      programs: [...state.programs, program],
    }));

    return program;
  }

  async update(id: string, updater: (current: ProgramRecord) => ProgramRecord) {
    let updated: ProgramRecord | null = null;

    await jsonStore.write((state) => ({
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
  async list() {
    const state = await jsonStore.read();
    return state.organizations;
  }

  async findById(id: string) {
    const organizations = await this.list();
    return organizations.find((organization) => organization.id === id) || null;
  }

  async create(organization: OrganizationRecord) {
    await jsonStore.write((state) => ({
      ...state,
      organizations: [...state.organizations, organization],
    }));

    return organization;
  }

  async update(id: string, updater: (current: OrganizationRecord) => OrganizationRecord) {
    let updated: OrganizationRecord | null = null;

    await jsonStore.write((state) => ({
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

export const programRepository = new ProgramRepository();
export const organizationRepository = new OrganizationRepository();