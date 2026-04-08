import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import type { DatabaseStatus } from "../models/api.model.js";
import type { OrganizationRecord } from "../models/organization.model.js";
import type { ProgramRecord } from "../models/program.model.js";

interface DatabaseState {
  programs: ProgramRecord[];
  organizations: OrganizationRecord[];
}

const emptyState: DatabaseState = {
  programs: [],
  organizations: [],
};

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

    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    return {
      programs: Array.isArray(parsed.programs) ? parsed.programs : [],
      organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
    };
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

  getStatus(): DatabaseStatus {
    return {
      mode: "file-json",
      databaseUrlConfigured: Boolean(env.databaseUrl),
      storagePath: env.dataFilePath,
    };
  }
}

export const jsonStore = new JsonStore();