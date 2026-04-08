import React, { createContext, useContext, useState, useCallback } from "react";
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

interface ProgramContextType {
  programs: Program[];
  addProgram: (program: Omit<Program, "id" | "createdAt" | "updatedAt">) => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  getProgram: (id: string) => Program | undefined;
}

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [programs, setPrograms] = useState<Program[]>(() => loadPrograms());

  const addProgram = useCallback((data: Omit<Program, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newProgram: Program = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setPrograms((prev) => {
      const next = [...prev, newProgram];
      savePrograms(next);
      return next;
    });
  }, []);

  const updateProgram = useCallback((id: string, updates: Partial<Program>) => {
    setPrograms((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
      savePrograms(next);
      return next;
    });
  }, []);

  const deleteProgram = useCallback((id: string) => {
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
    <ProgramContext.Provider value={{ programs, addProgram, updateProgram, deleteProgram, getProgram }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function usePrograms() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error("usePrograms must be used within ProgramProvider");
  return ctx;
}
