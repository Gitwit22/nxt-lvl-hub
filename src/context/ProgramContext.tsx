import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  createProgram as createProgramRecord,
  deleteProgram as deleteProgramRecord,
  listPrograms,
  normalizeProgram,
  toProgramMutationInput,
  updateProgram as updateProgramRecord,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Program } from "@/types/program";

const PROGRAM_STORAGE_KEY = "nltops.programs";

function savePrograms(programs: Program[]) {
  localStorage.setItem(PROGRAM_STORAGE_KEY, JSON.stringify(programs));
}

interface ProgramContextType {
  programs: Program[];
  isLoading: boolean;
  /** Set when the API call fails and live data could not be fetched. */
  catalogError: Error | null;
  addProgram: (program: Omit<Program, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProgram: (id: string, updates: Partial<Program>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  getProgram: (id: string) => Program | undefined;
}

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<Error | null>(null);

  const hydratePrograms = useCallback(async () => {
    setIsLoading(true);
    setCatalogError(null);

    try {
      const records = await listPrograms();
      const normalizedPrograms = records.map(normalizeProgram);
      setPrograms(normalizedPrograms);
    } catch (error) {
      console.error("[programs] Failed to load programs from API.", error);
      setCatalogError(error instanceof Error ? error : new Error("Failed to load programs."));
      setPrograms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Rehydrate when auth state changes so admin users see non-public/admin programs after login.
  useEffect(() => {
    if (isInitializing) return;
    void hydratePrograms();
  }, [hydratePrograms, isAuthenticated, isInitializing]);

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
    <ProgramContext.Provider value={{ programs, isLoading, catalogError, addProgram, updateProgram, deleteProgram, getProgram }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function usePrograms() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error("usePrograms must be used within ProgramProvider");
  return ctx;
}
