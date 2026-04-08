import { useState, useMemo } from "react";
import { usePrograms } from "@/context/ProgramContext";
import { ProgramCard } from "@/components/ProgramCard";
import { Screw } from "@/components/Screw";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import { CATEGORIES, ProgramStatus } from "@/types/program";
import { useNavigate } from "react-router-dom";

const statuses: { value: ProgramStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "live", label: "Live" },
  { value: "beta", label: "Beta" },
  { value: "coming-soon", label: "Coming Soon" },
  { value: "internal", label: "Internal" },
  { value: "archived", label: "Archived" },
];

export default function ApplicationsPage() {
  const { programs } = usePrograms();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    return programs
      .filter((p) => p.isPublic || status === "all")
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.shortDescription.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => category === "all" || p.category === category)
      .filter((p) => status === "all" || p.status === status)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [programs, search, category, status]);

  const hasPrograms = programs.length > 0;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header panel */}
      <div className="metal-raised rounded-lg p-6 relative">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <h1 className="font-mono text-xl font-bold tracking-tight mb-1">APPLICATIONS</h1>
        <p className="text-xs text-muted-foreground font-mono">Browse and launch all available Nxt Lvl programs.</p>
      </div>

      {/* Filters — recessed control strip */}
      <div className="metal-panel rounded-lg p-4 relative">
        <Screw className="absolute top-2.5 left-2.5" />
        <Screw className="absolute top-2.5 right-2.5" />
        <div className="flex flex-col sm:flex-row gap-3 px-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search programs..." className="pl-10 bg-secondary border-border font-mono text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-secondary border-border font-mono text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary border-border font-mono text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      ) : (
        <div className="metal-panel rounded-lg p-12 md:p-16 text-center relative">
          <Screw className="absolute top-2.5 left-2.5" />
          <Screw className="absolute top-2.5 right-2.5" />
          <div className="mx-auto h-12 w-12 rounded-full metal-raised flex items-center justify-center mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          {hasPrograms ? (
            <>
              <p className="stamped-label text-xs">No programs match your filters.</p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">Try adjusting search, category, or status.</p>
            </>
          ) : (
            <>
              <p className="stamped-label text-xs">No programs added yet.</p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">Create your first program to start building the suite.</p>
              <Button size="sm" className="mt-5" onClick={() => navigate("/admin")}>
                Open Program Manager
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
