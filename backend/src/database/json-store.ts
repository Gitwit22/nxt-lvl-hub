import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import type { DatabaseStatus } from "../models/api.model.js";
import type { AuthUserRecord } from "../models/auth.model.js";
import type { OrganizationRecord } from "../models/organization.model.js";
import type { OrgUserRecord } from "../models/org-user.model.js";
import type { ProgramRecord } from "../models/program.model.js";
import { normalizePartitionKey } from "../utils/partition.js";

export interface PartitionState {
  programs: ProgramRecord[];
  organizations: OrganizationRecord[];
  users: OrgUserRecord[];
  authUsers: AuthUserRecord[];
}

interface LegacyDatabaseState {
  programs?: ProgramRecord[];
  organizations?: OrganizationRecord[];
  partitions?: Record<string, PartitionState>;
}

interface DatabaseState {
  partitions: Record<string, PartitionState>;
}

const emptyPartitionState: PartitionState = {
  programs: [],
  organizations: [],
  users: [],
  authUsers: [],
};

const emptyState: DatabaseState = {
  partitions: {},
};

function clonePartitionState(state?: Partial<PartitionState>): PartitionState {
  return {
    programs: Array.isArray(state?.programs) ? state.programs : [],
    organizations: Array.isArray(state?.organizations) ? state.organizations : [],
    users: Array.isArray(state?.users) ? state.users : [],
    authUsers: Array.isArray(state?.authUsers) ? state.authUsers : [],
  };
}

function normalizeState(parsed: LegacyDatabaseState): DatabaseState {
  const normalizedPartitions: Record<string, PartitionState> = {};

  if (parsed.partitions && typeof parsed.partitions === "object") {
    for (const [key, partitionState] of Object.entries(parsed.partitions)) {
      normalizedPartitions[normalizePartitionKey(key)] = clonePartitionState(partitionState);
    }
  }

  const hasLegacyRootArrays = Array.isArray(parsed.programs) || Array.isArray(parsed.organizations);
  if (hasLegacyRootArrays) {
    const legacyPartition = normalizePartitionKey(env.appPartitionDefault);
    normalizedPartitions[legacyPartition] = {
      programs: Array.isArray(parsed.programs) ? parsed.programs : [],
      organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
      users: [],
      authUsers: [],
    };
  }

  return {
    partitions: normalizedPartitions,
  };
}

export class JsonStore {
  private writeQueue: Promise<void> = Promise.resolve();

  async initialize() {
    await fs.mkdir(path.dirname(env.dataFilePath), { recursive: true });
    await fs.mkdir(env.uploadPath, { recursive: true });

    try {
      await fs.access(env.dataFilePath);
    } catch {
      await fs.writeFile(env.dataFilePath, JSON.stringify(emptyState, null, 2), "utf8");
    }
  }

  async read(): Promise<DatabaseState> {
    await this.initialize();
    const raw = await fs.readFile(env.dataFilePath, "utf8");

    if (!raw.trim()) {
      return { ...emptyState };
    }

    const parsed = JSON.parse(raw) as LegacyDatabaseState;
    return normalizeState(parsed);
  }

  async write(mutator: (state: DatabaseState) => DatabaseState): Promise<DatabaseState> {
    let nextState: DatabaseState = emptyState;

    this.writeQueue = this.writeQueue.then(async () => {
      const currentState = await this.read();
      nextState = mutator(structuredClone(currentState));
      await fs.writeFile(env.dataFilePath, JSON.stringify(nextState, null, 2), "utf8");
    });

    await this.writeQueue;
    return nextState;
  }

  async getPartitionState(partitionKey: string): Promise<PartitionState> {
    const normalizedKey = normalizePartitionKey(partitionKey);
    const state = await this.read();
    return clonePartitionState(state.partitions[normalizedKey]);
  }

  async updatePartition(partitionKey: string, mutator: (current: PartitionState) => PartitionState) {
    const normalizedKey = normalizePartitionKey(partitionKey);

    return this.write((state) => {
      const currentPartition = clonePartitionState(state.partitions[normalizedKey]);
      const nextPartition = mutator(structuredClone(currentPartition));

      return {
        ...state,
        partitions: {
          ...state.partitions,
          [normalizedKey]: clonePartitionState(nextPartition),
        },
      };
    });
  }

  getStatus(state?: DatabaseState): DatabaseStatus {
    const partitionCount = state ? Object.keys(state.partitions).length : 0;

    return {
      mode: "file-json",
      databaseUrlConfigured: Boolean(env.databaseUrl),
      storagePath: env.dataFilePath,
      partitionCount,
      defaultPartition: env.appPartitionDefault,
    };
  }
}

export const jsonStore = new JsonStore();
