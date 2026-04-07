import React, { createContext, useContext, useState, useCallback } from "react";
import { Program } from "@/types/program";
import { seedPrograms } from "@/data/seed-programs";

interface ProgramContextType {
  programs: Program[];
  addProgram: (program: Omit<Program, "id" | "createdAt" | "updatedAt">) => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  getProgram: (id: string) => Program | undefined;
}

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [programs, setPrograms] = useState<Program[]>(seedPrograms);

  const addProgram = useCallback((data: Omit<Program, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newProgram: Program = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setPrograms((prev) => [...prev, newProgram]);
  }, []);

  const updateProgram = useCallback((id: string, updates: Partial<Program>) => {
    setPrograms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
  }, []);

  const deleteProgram = useCallback((id: string) => {
    setPrograms((prev) => prev.filter((p) => p.id !== id));
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
