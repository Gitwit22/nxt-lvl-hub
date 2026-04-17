import { FormEvent, useMemo, useState } from "react";
import { usePrograms } from "@/context/ProgramContext";
import { getErrorMessage } from "@/lib/api";
import { CATEGORIES, Program, ProgramStatus, ProgramType } from "@/types/program";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ProgramFormState = {
  name: string;
  shortDescription: string;
  category: string;
  status: ProgramStatus;
  type: ProgramType;
  launchPath: string;
  tags: string;
};

const DEFAULT_FORM: ProgramFormState = {
  name: "",
  shortDescription: "",
  category: CATEGORIES[0],
  status: "coming-soon",
  type: "internal",
  launchPath: "",
  tags: "",
};

function makeProgramPayload(form: ProgramFormState, existingCount: number): Omit<Program, "id" | "createdAt" | "updatedAt"> {
  const name = form.name.trim();
  const shortDescription = form.shortDescription.trim();
  const launchPath = form.launchPath.trim();
  const tags = form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    name,
    slug,
    shortDescription,
    longDescription: shortDescription,
    category: form.category,
    secondaryCategory: "",
    tags,
    status: form.status,
    type: form.type,
    origin: "suite-native",
    internalRoute: form.type === "internal" ? launchPath : "",
    externalUrl: form.type === "external" ? launchPath : "",
    openInNewTab: form.type === "external",
    logoUrl: "",
    isFeatured: false,
    isPublic: true,
    requiresLogin: false,
    requiresApproval: false,
    launchLabel: "Launch",
    displayOrder: existingCount + 1,
    notes: "",
    accentColor: "#0ea5e9",
    cardBackgroundColor: "#0f172a",
    cardBackgroundOpacity: 14,
    cardGlowColor: "#0ea5e9",
    cardGlowOpacity: 24,
    cardHoverTintOpacity: 10,
    adminOnly: false,
  };
}

export default function AdminProgramsPage() {
  const { programs, isLoading, addProgram, deleteProgram } = usePrograms();

  const [form, setForm] = useState<ProgramFormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedPrograms = useMemo(
    () => [...programs].sort((left, right) => left.displayOrder - right.displayOrder),
    [programs],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.shortDescription.trim()) {
      toast.error("Program name and description are required.");
      return;
    }

    if (!form.launchPath.trim()) {
      toast.error(form.type === "external" ? "External URL is required." : "Internal route is required.");
      return;
    }

    setIsSaving(true);
    try {
      await addProgram(makeProgramPayload(form, programs.length));
      toast.success("Program added.");
      setForm(DEFAULT_FORM);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (programId: string, programName: string) => {
    const shouldDelete = window.confirm(`Delete ${programName}? This cannot be undone.`);
    if (!shouldDelete) return;

    setDeletingId(programId);
    try {
      await deleteProgram(programId);
      toast.success("Program removed.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#08111f_0%,_#0f172a_100%)] px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Nxt Lvl Hub Admin</p>
          <h1 className="mt-2 text-2xl font-semibold">Program Management</h1>
          <p className="mt-2 text-sm text-slate-300">Add and remove suite programs from the public catalog.</p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold">Add Program</h2>
          <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="program-name">Program Name</Label>
              <Input
                id="program-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="TimeFlow"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="program-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="program-description">Short Description</Label>
              <Textarea
                id="program-description"
                rows={3}
                value={form.shortDescription}
                onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
                placeholder="Short summary for the public catalog."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as ProgramType }))}
              >
                <SelectTrigger id="program-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as ProgramStatus }))}
              >
                <SelectTrigger id="program-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="coming-soon">Coming Soon</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="program-launch-path">{form.type === "external" ? "External URL" : "Internal Route"}</Label>
              <Input
                id="program-launch-path"
                value={form.launchPath}
                onChange={(event) => setForm((prev) => ({ ...prev, launchPath: event.target.value }))}
                placeholder={form.type === "external" ? "https://example.com" : "/workspace/timeflow"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="program-tags">Tags (comma-separated)</Label>
              <Input
                id="program-tags"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="operations, scheduling, planning"
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
                <Plus className="mr-2 h-4 w-4" />
                {isSaving ? "Adding Program..." : "Add Program"}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold">Existing Programs</h2>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Launch</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-slate-400">Loading programs...</TableCell>
                  </TableRow>
                ) : sortedPrograms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-slate-400">No programs found.</TableCell>
                  </TableRow>
                ) : (
                  sortedPrograms.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell>
                        <div className="font-medium text-white">{program.name}</div>
                        <div className="text-xs text-slate-400">{program.shortDescription}</div>
                      </TableCell>
                      <TableCell>{program.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{program.status}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{program.type}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-slate-300">
                        {program.type === "external" ? program.externalUrl : program.internalRoute}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void onDelete(program.id, program.name)}
                          disabled={deletingId === program.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === program.id ? "Removing..." : "Remove"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
