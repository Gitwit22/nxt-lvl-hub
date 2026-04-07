import { useState } from "react";
import { usePrograms } from "@/context/ProgramContext";
import { Program, CATEGORIES, ProgramStatus, ProgramType, ProgramOrigin, STATUS_CONFIG } from "@/types/program";
import { StatusLED } from "@/components/StatusLED";
import { Screw } from "@/components/Screw";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const emptyForm = (): Omit<Program, "id" | "createdAt" | "updatedAt"> => ({
  name: "",
  shortDescription: "",
  longDescription: "",
  category: "Operations",
  tags: [],
  status: "coming-soon" as ProgramStatus,
  type: "internal" as ProgramType,
  origin: "suite-native" as ProgramOrigin,
  internalRoute: "",
  externalUrl: "",
  openInNewTab: false,
  isFeatured: false,
  isPublic: true,
  requiresLogin: false,
  requiresApproval: false,
  launchLabel: "Launch",
  displayOrder: 99,
  notes: "",
  accentColor: "",
});

export default function AdminPage() {
  const { programs, addProgram, updateProgram, deleteProgram } = usePrograms();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [tagsInput, setTagsInput] = useState("");

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setTagsInput("");
    setOpen(true);
  };

  const openEdit = (p: Program) => {
    setEditingId(p.id);
    setForm({ ...p });
    setTagsInput(p.tags.join(", "));
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const data = { ...form, tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean) };
    if (editingId) {
      updateProgram(editingId, data);
      toast.success("Program updated");
    } else {
      addProgram(data);
      toast.success("Program added");
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteProgram(id);
    toast.success("Program deleted");
  };

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="metal-raised rounded-lg p-6 flex items-center justify-between relative">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight">ADMIN PANEL</h1>
          <p className="text-xs text-muted-foreground font-mono">Manage programs in the suite.</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Program</Button>
      </div>

      {/* Program List */}
      <div className="space-y-2">
        {programs.sort((a, b) => a.displayOrder - b.displayOrder).map((p) => (
          <div key={p.id} className="metal-panel rounded-lg p-4 flex items-center gap-4 relative">
            <Screw className="absolute top-2 left-2" />
            <div
              className="w-8 h-8 rounded metal-raised flex items-center justify-center font-mono font-bold text-xs shrink-0"
              style={p.accentColor ? { color: `hsl(${p.accentColor})` } : {}}
            >
              {p.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono font-medium text-foreground text-sm truncate">{p.name}</p>
              <p className="text-[10px] stamped-label">{p.category} · Order: {p.displayOrder}</p>
            </div>
            <StatusLED status={p.status} className="hidden sm:flex" />
            {!p.isPublic && <span className="stamped-label text-[8px] hidden sm:inline">Private</span>}
            <div className="flex gap-1 shrink-0">
              <button onClick={() => openEdit(p)} className="metal-button rounded p-1.5 hover:text-primary transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(p.id)} className="metal-button rounded p-1.5 hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto metal-raised border-border">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider text-sm">
              {editingId ? "Edit Program" : "Add Program"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Program Name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-secondary font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className="bg-secondary font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Short Description</Label>
              <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className="bg-secondary font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Long Description</Label>
              <Textarea value={form.longDescription} onChange={(e) => set("longDescription", e.target.value)} rows={3} className="bg-secondary font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v as ProgramStatus)}>
                  <SelectTrigger className="bg-secondary font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="beta">Beta</SelectItem>
                    <SelectItem value="coming-soon">Coming Soon</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v as ProgramType)}>
                  <SelectTrigger className="bg-secondary font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === "internal" ? (
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Internal Route</Label>
                <Input value={form.internalRoute || ""} onChange={(e) => set("internalRoute", e.target.value)} placeholder="/apps/my-app" className="bg-secondary font-mono text-xs" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">External URL</Label>
                <Input value={form.externalUrl || ""} onChange={(e) => set("externalUrl", e.target.value)} placeholder="https://..." className="bg-secondary font-mono text-xs" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Tags (comma separated)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="bg-secondary font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Launch Label</Label>
                <Input value={form.launchLabel} onChange={(e) => set("launchLabel", e.target.value)} className="bg-secondary font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Display Order</Label>
                <Input type="number" value={form.displayOrder} onChange={(e) => set("displayOrder", parseInt(e.target.value) || 0)} className="bg-secondary font-mono text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Origin</Label>
                <Select value={form.origin} onValueChange={(v) => set("origin", v as ProgramOrigin)}>
                  <SelectTrigger className="bg-secondary font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suite-native">Suite Native</SelectItem>
                    <SelectItem value="external-partner">External Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Accent Color (HSL)</Label>
                <Input value={form.accentColor || ""} onChange={(e) => set("accentColor", e.target.value)} placeholder="217 80% 56%" className="bg-secondary font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="bg-secondary font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {([
                ["isFeatured", "Featured"],
                ["isPublic", "Public"],
                ["requiresLogin", "Requires Login"],
                ["requiresApproval", "Requires Approval"],
                ["openInNewTab", "New Tab"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={form[key] as boolean} onCheckedChange={(v) => set(key, v)} />
                  <Label className="font-mono text-[10px] uppercase tracking-wider">{label}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
