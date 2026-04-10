import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AppFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  accessType: string;
  onAccessTypeChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
}

export function AppFilters({
  search,
  onSearchChange,
  accessType,
  onAccessTypeChange,
  category,
  onCategoryChange,
  categories,
}: AppFiltersProps) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_40px_rgba(8,15,30,0.25)] backdrop-blur-xl sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by app name"
            className="h-11 border-white/10 bg-slate-950/70 pl-10 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <Select value={accessType} onValueChange={onAccessTypeChange}>
          <SelectTrigger className="h-11 border-white/10 bg-slate-950/70 text-slate-100">
            <SelectValue placeholder="Access Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Access Types</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="external">External</SelectItem>
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-11 border-white/10 bg-slate-950/70 text-slate-100">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((entry) => (
              <SelectItem key={entry} value={entry}>{entry}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}