import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { programCatalogSeed } from "@/data/programCatalogSeed";
import {
  createProgram as createProgramRecord,
  deleteProgram as deleteProgramRecord,
  listPrograms,
  normalizeProgram,
  toProgramMutationInput,
  updateProgram as updateProgramRecord,
} from "@/lib/api";
import { Program } from "@/types/program";

const PROGRAM_STORAGE_KEY = "nltops.programs";

function loadPrograms(): Program[] {
  const raw = localStorage.getItem(PROGRAM_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Program[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePrograms(programs: Program[]) {
  localStorage.setItem(PROGRAM_STORAGE_KEY, JSON.stringify(programs));
}

function getDefaultPrograms(): Program[] {
  const now = new Date().toISOString();

  return programCatalogSeed.map((program) => ({
    ...program,
    createdAt: now,
    updatedAt: now,
  }));
}

interface ProgramContextType {
  programs: Program[];
  isLoading: boolean;
  addProgram: (program: Omit<Program, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProgram: (id: string, updates: Partial<Program>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  getProgram: (id: string) => Program | undefined;
}

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [programs, setPrograms] = useState<Program[]>(() => loadPrograms());
  const [isLoading, setIsLoading] = useState(true);

  const hydratePrograms = useCallback(async () => {
    setIsLoading(true);

    try {
      const records = await listPrograms();

      if (records.length === 0) {
        const legacyPrograms = loadPrograms();
        const fallbackPrograms = legacyPrograms.length > 0 ? legacyPrograms : getDefaultPrograms();

        if (fallbackPrograms.length > 0) {
          // Seed programs one-by-one so a single failure doesn't block the rest.
          await Promise.allSettled(
            fallbackPrograms.map((program) =>
              createProgramRecord(toProgramMutationInput(program)).catch((err) => {
                console.warn("[programs] Seed create failed for", program.id, err);
              }),
            ),
          );
          const seededRecords = await listPrograms();
          const normalizedPrograms = seededRecords.map(normalizeProgram);
          setPrograms(normalizedPrograms);
          savePrograms(normalizedPrograms);
        } else {
          setPrograms([]);
        }
      } else {
        const normalizedPrograms = records.map(normalizeProgram);
        setPrograms(normalizedPrograms);
        savePrograms(normalizedPrograms);
      }
    } catch (error) {
      console.error("Failed to load programs from API.", error);
      const fallbackPrograms = loadPrograms();
      const nextPrograms = fallbackPrograms.length > 0 ? fallbackPrograms : getDefaultPrograms();
      setPrograms(nextPrograms);
      savePrograms(nextPrograms);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount — GET /api/programs is public, no auth required.
  useEffect(() => {
    void hydratePrograms();
  }, [hydratePrograms]);

  const addProgram = useCallback(async (data: Omit<Program, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newProgram: Program = {
      ...data,
      id: crypto.randomUUID(),
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      createdAt: now,
      updatedAt: now,
    };

    const created = await createProgramRecord(toProgramMutationInput(newProgram));
    setPrograms((prev) => {
      const next = [...prev, normalizeProgram(created)].sort((left, right) => left.displayOrder - right.displayOrder);
      savePrograms(next);
      return next;
    });
  }, []);

  const updateProgram = useCallback(async (id: string, updates: Partial<Program>) => {
    const current = programs.find((program) => program.id === id);
    if (!current) {
      return;
    }

    const merged: Program = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    let updated: Awaited<ReturnType<typeof updateProgramRecord>>;
    try {
      updated = await updateProgramRecord(id, toProgramMutationInput(merged));
    } catch (updateError) {
      // The program's local ID doesn't exist in the backend (stale localStorage or
      // wiped server data).  Re-create it under a fresh UUID so the edit is not lost.
      const isNotFound =
        updateError instanceof Error &&
        (updateError.message.toLowerCase().includes("not found") || updateError.message.includes("404"));

      if (!isNotFound) {
        throw updateError;
      }

      console.warn("[programs] Program not found on server, recreating:", id);
      const fresh: Program = { ...merged, id: crypto.randomUUID(), createdAt: merged.createdAt || new Date().toISOString() };
      updated = await createProgramRecord(toProgramMutationInput(fresh));

      // Replace the stale local entry with the newly created backend record.
      setPrograms((prev) => {
        const next = prev
          .map((p) => (p.id === id ? normalizeProgram(updated) : p))
          .sort((l, r) => l.displayOrder - r.displayOrder);
        savePrograms(next);
        return next;
      });
      return;
    }

    setPrograms((prev) => {
      const next = prev
        .map((program) => (program.id === id ? normalizeProgram(updated) : program))
        .sort((left, right) => left.displayOrder - right.displayOrder);
      savePrograms(next);
      return next;
    });
  }, [programs]);

  const deleteProgram = useCallback(async (id: string) => {
    await deleteProgramRecord(id);
    setPrograms((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePrograms(next);
      return next;
    });
  }, []);

  const getProgram = useCallback(
    (id: string) => programs.find((p) => p.id === id),
    [programs]
  );

  return (
    <ProgramContext.Provider value={{ programs, isLoading, addProgram, updateProgram, deleteProgram, getProgram }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function usePrograms() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error("usePrograms must be used within ProgramProvider");
  return ctx;
}
