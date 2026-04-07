import { useState, useMemo } from "react";
import { usePrograms } from "@/context/ProgramContext";
import { ProgramCard } from "@/components/ProgramCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { CATEGORIES, ProgramStatus } from "@/types/program";

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

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Applications</h1>
        <p className="text-muted-foreground">Browse and launch all available Nxt Lvl programs.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search programs..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
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
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No programs match your filters.</p>
        </div>
      )}
    </div>
  );
}
