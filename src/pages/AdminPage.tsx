import { useState } from "react";
import { usePrograms } from "@/context/ProgramContext";
import { Program, CATEGORIES, ProgramStatus, ProgramType, ProgramOrigin, STATUS_CONFIG } from "@/types/program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
          <p className="text-muted-foreground">Manage programs in the suite.</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Add Program</Button>
      </div>

      {/* Program List */}
      <div className="space-y-3">
        {programs.sort((a, b) => a.displayOrder - b.displayOrder).map((p) => {
          const sc = STATUS_CONFIG[p.status];
          return (
            <div key={p.id} className="glass-card rounded-lg p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center font-bold text-primary text-sm shrink-0">
                {p.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category} · Order: {p.displayOrder}</p>
              </div>
              <Badge variant="outline" className={`text-xs ${sc.className} hidden sm:inline-flex`}>{sc.label}</Badge>
              {!p.isPublic && <Badge variant="outline" className="text-xs hidden sm:inline-flex">Private</Badge>}
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Program" : "Add Program"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Program Name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Long Description</Label>
              <Textarea value={form.longDescription} onChange={(e) => set("longDescription", e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v as ProgramStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v as ProgramType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === "internal" ? (
              <div className="space-y-2">
                <Label>Internal Route / Path</Label>
                <Input value={form.internalRoute || ""} onChange={(e) => set("internalRoute", e.target.value)} placeholder="/apps/my-app" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>External URL</Label>
                <Input value={form.externalUrl || ""} onChange={(e) => set("externalUrl", e.target.value)} placeholder="https://..." />
              </div>
            )}
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="nonprofit, media, operations" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Launch Button Label</Label>
                <Input value={form.launchLabel} onChange={(e) => set("launchLabel", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input type="number" value={form.displayOrder} onChange={(e) => set("displayOrder", parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Select value={form.origin} onValueChange={(v) => set("origin", v as ProgramOrigin)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suite-native">Suite Native</SelectItem>
                    <SelectItem value="external-partner">External Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Accent Color (HSL)</Label>
                <Input value={form.accentColor || ""} onChange={(e) => set("accentColor", e.target.value)} placeholder="217 91% 60%" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {([
                ["isFeatured", "Featured on Home"],
                ["isPublic", "Public"],
                ["requiresLogin", "Requires Login"],
                ["requiresApproval", "Requires Approval"],
                ["openInNewTab", "Open in New Tab"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={form[key] as boolean} onCheckedChange={(v) => set(key, v)} />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? "Update" : "Add"} Program</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
