import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrograms } from "@/context/ProgramContext";
import { useOrgPortal } from "@/context/OrgPortalContext";
import { getErrorMessage, uploadLogoFile } from "@/lib/api";
import { Bundle, Organization, OrganizationStatus, PlanType, SuiteProgram } from "@/types/orgPortal";
import { Program, CATEGORIES, ProgramStatus, ProgramType, ProgramOrigin } from "@/types/program";
import { getOrgBasePath, getOrgPortalUrl } from "@/lib/orgRoutes";
import { TempPasswordModal } from "@/components/TempPasswordModal";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ProgramLogo } from "@/components/ProgramLogo";
import { Screw } from "@/components/Screw";
import { StatusLED } from "@/components/StatusLED";
import { Check, Plus, Pencil, Trash2, Upload, Search, Eye, PauseCircle, PlayCircle, Globe, Building2 } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 8;

type AdminSection = "organizations" | "programs";
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
type DetailTab = "overview" | "programs" | "users" | "branding" | "domain" | "settings";

type WizardState = {
  name: string;
  slug: string;
  contactEmail: string;
  ownerEmail: string;
  ownerName: string;
  supportEmail: string;
  phoneNumber: string;
  industryType: string;
  notes: string;
  subdomain: string;
  assignedBundleIds: string[];
  assignedProgramIds: string[];
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  accentColor: string;
  planType: PlanType;
  trialDays: number;
  status: OrganizationStatus;
  seatLimit: number;
};

const DEFAULT_WIZARD_STATE: WizardState = {
  name: "",
  slug: "",
  contactEmail: "",
  ownerEmail: "",
  ownerName: "",
  supportEmail: "",
  phoneNumber: "",
  industryType: "",
  notes: "",
  subdomain: "",
  assignedBundleIds: [],
  assignedProgramIds: [],
  logoUrl: "",
  bannerUrl: "",
  primaryColor: "#2563eb",
  accentColor: "#0ea5e9",
  planType: "starter",
  trialDays: 30,
  status: "trial",
  seatLimit: 25,
};

const emptyProgramForm = (): Omit<Program, "id" | "createdAt" | "updatedAt"> => ({
  name: "",
  shortDescription: "",
  longDescription: "",
  category: "Operations",
  secondaryCategory: "",
  tags: [],
  status: "coming-soon" as ProgramStatus,
  type: "internal" as ProgramType,
  origin: "suite-native" as ProgramOrigin,
  internalRoute: "",
  externalUrl: "",
  openInNewTab: false,
  logoUrl: "",
  isFeatured: false,
  isPublic: true,
  requiresLogin: false,
  requiresApproval: false,
  launchLabel: "Launch",
  displayOrder: 99,
  notes: "",
  accentColor: "#4f46e5",
  cardBackgroundColor: "#4f46e5",
  cardBackgroundOpacity: 12,
  cardGlowColor: "#4f46e5",
  cardGlowOpacity: 22,
  cardHoverTintOpacity: 10,
  adminOnly: false,
});

function resolveProgramPreviewColor(color?: string) {
  if (!color) return undefined;
  if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl") || color.startsWith("var(")) {
    return color;
  }
  return `hsl(${color})`;
}

function parseLegacyHslToHex(color?: string, fallback = "#4f46e5") {
  if (!color) return fallback;
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    return color;
  }

  const match = color.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return fallback;

  const hue = Number(match[1]);
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const matchMap: Array<[number, number, number]> = [
    [chroma, secondComponent, 0],
    [secondComponent, chroma, 0],
    [0, chroma, secondComponent],
    [0, secondComponent, chroma],
    [secondComponent, 0, chroma],
    [chroma, 0, secondComponent],
  ];
  const [redBase, greenBase, blueBase] = matchMap[Math.floor(huePrime) % 6] ?? [0, 0, 0];
  const lightnessAdjustment = lightness - chroma / 2;
  const toHex = (value: number) => Math.round((value + lightnessAdjustment) * 255).toString(16).padStart(2, "0");

  return `#${toHex(redBase)}${toHex(greenBase)}${toHex(blueBase)}`;
}

function toCssColor(color?: string, fallback = "#4f46e5") {
  if (!color) return fallback;
  if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl") || color.startsWith("var(")) {
    return color;
  }
  if (/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/.test(color)) {
    return `hsl(${color})`;
  }
  return fallback;
}

function gradientCss(start: string, end: string, angle = 135) {
  return `linear-gradient(${Math.max(0, Math.min(angle, 360))}deg, ${toCssColor(start, "#0f172a")}, ${toCssColor(end, "#1d4ed8")})`;
}

function hexToRgbaPreview(hex: string, opacityPercent: number) {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((segment) => `${segment}${segment}`).join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return undefined;
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(opacityPercent, 100)) / 100})`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function subdomainify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function StatusPill({ status }: { status: OrganizationStatus }) {
  const map: Record<OrganizationStatus, string> = {
    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    pending: "bg-blue-500/20 text-blue-200 border-blue-500/30",
    suspended: "bg-red-500/20 text-red-300 border-red-500/30",
    trial: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  };

  return <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider", map[status])}>{status}</span>;
}

function ProgramManagerTab() {
  const { programs, isLoading, addProgram, updateProgram, deleteProgram } = usePrograms();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProgramForm());
  const [tagsInput, setTagsInput] = useState("");
  const [logoInputMode, setLogoInputMode] = useState<"url" | "upload">("url");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadedLogoName, setUploadedLogoName] = useState("");
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyProgramForm());
    setTagsInput("");
    setLogoInputMode("url");
    setUploadedLogoName("");
    setOpen(true);
  };

  const openEdit = (program: Program) => {
    setEditingId(program.id);
    setForm({
      ...program,
      accentColor: parseLegacyHslToHex(program.accentColor),
      cardBackgroundColor: program.cardBackgroundColor || parseLegacyHslToHex(program.accentColor, "#334155"),
      cardBackgroundOpacity: program.cardBackgroundOpacity ?? 12,
      cardGlowColor: program.cardGlowColor || parseLegacyHslToHex(program.accentColor, "#4f46e5"),
      cardGlowOpacity: program.cardGlowOpacity ?? 22,
      cardHoverTintOpacity: program.cardHoverTintOpacity ?? 10,
    });
    setTagsInput(program.tags.join(", "));
    setLogoInputMode(program.logoUrl?.startsWith("http") ? "url" : "upload");
    setUploadedLogoName(program.logoUrl?.split("/").pop() ?? "");
    setOpen(true);
  };

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const normalizeUploadedLogoUrl = (logoUrl: string) => {
    if (/^https?:\/\//i.test(logoUrl)) {
      return logoUrl;
    }

    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? window.location.origin;
    try {
      return new URL(logoUrl, apiBaseUrl).toString();
    } catch {
      return logoUrl;
    }
  };

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploadingLogo(true);

    try {
      const upload = await uploadLogoFile(file);
      set("logoUrl", normalizeUploadedLogoUrl(upload.logoUrl));
      setUploadedLogoName(upload.fileName || file.name);
      setLogoInputMode("upload");
      toast.success("Logo uploaded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.shortDescription.trim() || !form.longDescription.trim()) {
      toast.error("Program name and descriptions are required");
      return;
    }
    if (form.type === "internal" && !form.internalRoute?.trim()) {
      toast.error("Internal route, path, or subdomain is required");
      return;
    }
    if (form.type === "external") {
      if (!form.externalUrl?.trim()) {
        toast.error("External URL is required");
        return;
      }
      try {
        new URL(form.externalUrl);
      } catch {
        toast.error("Enter a valid external URL");
        return;
      }
    }

    const data = {
      ...form,
      tags: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean),
      name: form.name.trim(),
      shortDescription: form.shortDescription.trim(),
      longDescription: form.longDescription.trim(),
      internalRoute: form.type === "internal" ? form.internalRoute?.trim() : "",
      externalUrl: form.type === "external" ? form.externalUrl?.trim() : "",
      logoUrl: form.logoUrl?.trim() || "",
      launchLabel: form.launchLabel.trim() || "Launch",
    };

    try {
      if (editingId) {
        await updateProgram(editingId, data);
        toast.success("Program updated");
      } else {
        await addProgram(data);
        toast.success("Program added");
      }
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (programId: string) => {
    try {
      await deleteProgram(programId);
      toast.success("Program archived");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="metal-raised rounded-lg p-6 flex items-center justify-between relative">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <div>
          <h2 className="font-mono text-lg font-bold tracking-tight">PROGRAM CATALOG CONTROL</h2>
          <p className="text-xs text-muted-foreground font-mono">Manage suite-wide programs and launch destinations.</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Program</Button>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground font-mono">Loading catalog...</p>}
        {[...programs].sort((a, b) => a.displayOrder - b.displayOrder).map((program) => (
          <div key={program.id} className="metal-panel rounded-lg p-4 flex items-center gap-4 relative">
            <Screw className="absolute top-2 left-2" />
            <ProgramLogo name={program.name} logoUrl={program.logoUrl} accentColor={program.accentColor} className="w-8 h-8" textClassName="text-xs" />
            <div className="flex-1 min-w-0">
              <p className="font-mono font-medium text-foreground text-sm truncate">{program.name}</p>
              <p className="text-[10px] stamped-label">
                {program.category}
                {program.secondaryCategory ? ` / ${program.secondaryCategory}` : ""}
                {` · Order: ${program.displayOrder}`}
              </p>
            </div>
            <StatusLED status={program.status} className="hidden sm:flex" />
            {!program.isPublic && <span className="stamped-label text-[8px] hidden sm:inline">Private</span>}
            {program.adminOnly && <span className="stamped-label text-[8px] hidden sm:inline">Admin Only</span>}
            <div className="flex gap-1 shrink-0">
              <button onClick={() => openEdit(program)} className="metal-button rounded p-1.5 hover:text-primary transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => void handleDelete(program.id)} className="metal-button rounded p-1.5 hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto metal-raised border-border">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider text-sm">{editingId ? "Edit Program" : "Add Program"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Program Name *</Label>
                <Input value={form.name} onChange={(event) => set("name", event.target.value)} className="bg-secondary font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Category</Label>
                <Select value={form.category} onValueChange={(value) => set("category", value)}>
                  <SelectTrigger className="bg-secondary font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Secondary Category (Optional)</Label>
                <Select
                  value={form.secondaryCategory || "none"}
                  onValueChange={(value) => set("secondaryCategory", value === "none" ? "" : value)}
                >
                  <SelectTrigger className="bg-secondary font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Short Description</Label>
              <Input value={form.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} className="bg-secondary font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Long Description</Label>
              <Textarea value={form.longDescription} onChange={(event) => set("longDescription", event.target.value)} rows={3} className="bg-secondary font-mono text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Status</Label>
                <Select value={form.status} onValueChange={(value) => set("status", value as ProgramStatus)}>
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
                <Select value={form.type} onValueChange={(value) => set("type", value as ProgramType)}>
                  <SelectTrigger className="bg-secondary font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="metal-panel rounded-lg p-4 space-y-3">
              <Label className="font-mono text-xs uppercase tracking-wider">Program Logo / Image</Label>
              <div className="flex items-center gap-4">
                <ProgramLogo
                  name={form.name || "Program"}
                  logoUrl={form.logoUrl}
                  accentColor={form.accentColor}
                  className="w-14 h-14"
                  textClassName="text-lg"
                />
                <div className="flex gap-2">
                  <Button type="button" variant={logoInputMode === "url" ? "default" : "outline"} size="sm" onClick={() => setLogoInputMode("url")}>Image URL</Button>
                  <Button type="button" variant={logoInputMode === "upload" ? "default" : "outline"} size="sm" onClick={() => setLogoInputMode("upload")}>Upload</Button>
                </div>
              </div>

              {logoInputMode === "url" ? (
                <Input value={form.logoUrl || ""} onChange={(event) => {
                  setUploadedLogoName("");
                  set("logoUrl", event.target.value);
                }} placeholder="https://cdn.nltops.com/logos/app.png" className="bg-secondary font-mono text-xs" />
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-xs font-mono cursor-pointer metal-button rounded px-3 py-2"
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    <Upload className="h-3.5 w-3.5" /> {isUploadingLogo ? "Uploading..." : "Choose Image"}
                  </button>
                  <input
                    ref={logoFileInputRef}
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleLogoUpload(event.target.files?.[0])}
                    disabled={isUploadingLogo}
                  />
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {uploadedLogoName ? `Uploaded: ${uploadedLogoName}` : form.logoUrl ? "Uploaded image ready" : "PNG, JPG, GIF, WEBP up to 5MB"}
                  </p>
                </div>
              )}
            </div>

            {form.type === "internal" ? (
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Internal Route / Path / Subdomain</Label>
                <Input value={form.internalRoute || ""} onChange={(event) => set("internalRoute", event.target.value)} placeholder="/apps/my-app or app.nltops.com" className="bg-secondary font-mono text-xs" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">External URL</Label>
                <Input value={form.externalUrl || ""} onChange={(event) => set("externalUrl", event.target.value)} placeholder="https://..." className="bg-secondary font-mono text-xs" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Tags (comma separated)</Label>
              <Input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} className="bg-secondary font-mono text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Launch Label</Label>
                <Input value={form.launchLabel} onChange={(event) => set("launchLabel", event.target.value)} className="bg-secondary font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Display Order</Label>
                <Input type="number" value={form.displayOrder} onChange={(event) => set("displayOrder", parseInt(event.target.value, 10) || 0)} className="bg-secondary font-mono text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Origin</Label>
                <Select value={form.origin} onValueChange={(value) => set("origin", value as ProgramOrigin)}>
                  <SelectTrigger className="bg-secondary font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suite-native">Suite Native</SelectItem>
                    <SelectItem value="external-partner">External Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Logo / Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={parseLegacyHslToHex(form.accentColor)}
                    onChange={(event) => set("accentColor", event.target.value)}
                    className="h-10 w-14 rounded border border-input bg-secondary p-1"
                  />
                  <Input value={form.accentColor || ""} onChange={(event) => set("accentColor", event.target.value)} placeholder="#4f46e5" className="bg-secondary font-mono text-xs" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Card Background Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.cardBackgroundColor || "#334155"}
                    onChange={(event) => set("cardBackgroundColor", event.target.value)}
                    className="h-10 w-14 rounded border border-input bg-secondary p-1"
                  />
                  <Input value={form.cardBackgroundColor || ""} onChange={(event) => set("cardBackgroundColor", event.target.value)} placeholder="#334155" className="bg-secondary font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2 min-w-[180px]">
                <Label className="font-mono text-xs uppercase tracking-wider">Background Opacity</Label>
                <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.cardBackgroundOpacity ?? 0}
                    onChange={(event) => set("cardBackgroundOpacity", Number(event.target.value))}
                    className="w-full"
                  />
                  <div className="text-[10px] font-mono text-muted-foreground">{form.cardBackgroundOpacity ?? 0}%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Border Glow Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.cardGlowColor || "#4f46e5"}
                    onChange={(event) => set("cardGlowColor", event.target.value)}
                    className="h-10 w-14 rounded border border-input bg-secondary p-1"
                  />
                  <Input value={form.cardGlowColor || ""} onChange={(event) => set("cardGlowColor", event.target.value)} placeholder="#4f46e5" className="bg-secondary font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Glow Intensity</Label>
                <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.cardGlowOpacity ?? 0}
                    onChange={(event) => set("cardGlowOpacity", Number(event.target.value))}
                    className="w-full"
                  />
                  <div className="text-[10px] font-mono text-muted-foreground">{form.cardGlowOpacity ?? 0}%</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Hover Tint Boost</Label>
                <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.cardHoverTintOpacity ?? 0}
                    onChange={(event) => set("cardHoverTintOpacity", Number(event.target.value))}
                    className="w-full"
                  />
                  <div className="text-[10px] font-mono text-muted-foreground">+{form.cardHoverTintOpacity ?? 0}% on hover</div>
                </div>
              </div>
            </div>

            <div className="metal-panel rounded-lg p-4 space-y-3">
              <Label className="font-mono text-xs uppercase tracking-wider">Card Preview</Label>
              <div
                className="rounded-lg border p-4 transition-all duration-200"
                style={{
                  backgroundColor: hexToRgbaPreview(form.cardBackgroundColor || "#334155", form.cardBackgroundOpacity ?? 0),
                  borderColor: hexToRgbaPreview(form.cardGlowColor || "#4f46e5", Math.max(form.cardGlowOpacity ?? 0, 6)),
                  boxShadow: `0 0 0 1px ${hexToRgbaPreview(form.cardGlowColor || "#4f46e5", Math.max(form.cardGlowOpacity ?? 0, 6))}, 0 0 20px ${hexToRgbaPreview(form.cardGlowColor || "#4f46e5", Math.max((form.cardGlowOpacity ?? 0) * 0.65, 8))}`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <ProgramLogo
                    name={form.name || "Program"}
                    logoUrl={form.logoUrl}
                    accentColor={resolveProgramPreviewColor(form.accentColor)}
                    className="w-14 h-14"
                    textClassName="text-lg"
                  />
                  <StatusLED status={form.status} />
                </div>
                <div className="text-sm font-semibold text-foreground">{form.name || "Program Name"}</div>
                <div className="text-xs text-muted-foreground mt-1">{form.shortDescription || "Short description preview"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {([
                ["isFeatured", "Featured"],
                ["isPublic", "Public"],
                ["adminOnly", "Admin Only"],
                ["requiresLogin", "Requires Login"],
                ["requiresApproval", "Requires Approval"],
                ["openInNewTab", "New Tab"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={form[key] as boolean} onCheckedChange={(checked) => set(key, checked)} />
                  <Label className="font-mono text-[10px] uppercase tracking-wider">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()}>{editingId ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrganizationsTab() {
  const navigate = useNavigate();
  const {
    organizations,
    bundles,
    programs,
    users,
    isLoading,
    createOrganization,
    updateOrganization,
    setOrganizationPrograms,
    isSubdomainAvailable,
  } = useOrgPortal();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrganizationStatus | "all">("all");
  const [bundleFilter, setBundleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardState, setWizardState] = useState<WizardState>(DEFAULT_WIZARD_STATE);
  const [slugLocked, setSlugLocked] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id ?? "");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [orgTempPassword, setOrgTempPassword] = useState<{ password: string; email: string } | null>(null);

  useEffect(() => {
    if (!selectedOrgId && organizations[0]?.id) {
      setSelectedOrgId(organizations[0].id);
      return;
    }

    if (selectedOrgId && !organizations.some((organization) => organization.id === selectedOrgId) && organizations[0]?.id) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [organizations, selectedOrgId]);

  const selectedOrg = organizations.find((organization) => organization.id === selectedOrgId) ?? organizations[0];

  const usersByOrgId = useMemo(() => {
    return users.reduce<Record<string, number>>((accumulator, user) => {
      accumulator[user.orgId] = (accumulator[user.orgId] || 0) + 1;
      return accumulator;
    }, {});
  }, [users]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return organizations
      .filter((organization) => {
        if (!lower) return true;
        return [organization.name, organization.slug, organization.subdomain, organization.contactEmail].some((entry) => entry.toLowerCase().includes(lower));
      })
      .filter((organization) => statusFilter === "all" || organization.status === statusFilter)
      .filter((organization) => bundleFilter === "all" || organization.assignedBundleIds.includes(bundleFilter))
      .sort((left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime());
  }, [organizations, search, statusFilter, bundleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectedPrograms = useMemo(() => {
    if (!selectedOrg) return [];
    const bundleProgramIds = selectedOrg.assignedBundleIds.flatMap((bundleId) => bundles.find((bundle) => bundle.id === bundleId)?.programIds ?? []);
    const ids = new Set([...selectedOrg.assignedProgramIds, ...bundleProgramIds]);
    return programs.filter((program) => ids.has(program.id));
  }, [selectedOrg, bundles, programs]);

  const activeUsers = selectedOrg ? users.filter((user) => user.orgId === selectedOrg.id && user.active).length : 0;
  const inactiveUsers = selectedOrg ? users.filter((user) => user.orgId === selectedOrg.id && !user.active).length : 0;

  const updateWizard = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setWizardState((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArray = (key: "assignedBundleIds" | "assignedProgramIds", value: string) => {
    setWizardState((prev) => {
      const exists = prev[key].includes(value);
      return {
        ...prev,
        [key]: exists ? prev[key].filter((item) => item !== value) : [...prev[key], value],
      };
    });
  };

  const openWizard = () => {
    setWizardState(DEFAULT_WIZARD_STATE);
    setSlugLocked(false);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const validateStep = () => {
    if (wizardStep === 1) {
      if (!wizardState.name.trim() || !wizardState.contactEmail.trim() || !wizardState.ownerEmail.trim() || !wizardState.supportEmail.trim()) {
        toast.error("Name, contact email, owner email, and support email are required");
        return false;
      }
      if (!wizardState.slug.trim()) {
        toast.error("Organization slug is required");
        return false;
      }
    }

    if (wizardStep === 2) {
      const subdomain = subdomainify(wizardState.subdomain);
      if (!subdomain) {
        toast.error("Subdomain is required");
        return false;
      }
      if (!isSubdomainAvailable(subdomain)) {
        toast.error("Subdomain is already assigned to another organization");
        return false;
      }
      updateWizard("subdomain", subdomain);
    }

    if (wizardStep === 3) {
      if (wizardState.assignedBundleIds.length === 0 && wizardState.assignedProgramIds.length === 0) {
        toast.error("Assign at least one bundle or program");
        return false;
      }
    }

    if (wizardStep === 5 && wizardState.seatLimit <= 0) {
      toast.error("Seat limit must be greater than 0");
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setWizardStep((prev) => (prev < 6 ? (prev + 1) as WizardStep : prev));
  };

  const prevStep = () => setWizardStep((prev) => (prev > 1 ? (prev - 1) as WizardStep : prev));

  const handleCreate = async () => {
    const trialEndsAt = wizardState.status === "trial"
      ? new Date(Date.now() + wizardState.trialDays * 24 * 60 * 60 * 1000).toISOString()
      : "";

    const contactUser = wizardState.ownerEmail.trim() && wizardState.ownerName.trim()
      ? { name: wizardState.ownerName.trim(), email: wizardState.ownerEmail.trim() }
      : undefined;

    try {
      const result = await createOrganization({
        name: wizardState.name,
        slug: wizardState.slug,
        subdomain: wizardState.subdomain,
        contactEmail: wizardState.contactEmail,
        ownerEmail: wizardState.ownerEmail,
        supportEmail: wizardState.supportEmail,
        phoneNumber: wizardState.phoneNumber,
        industryType: wizardState.industryType,
        notes: wizardState.notes,
        logoUrl: wizardState.logoUrl,
        bannerUrl: wizardState.bannerUrl,
        primaryColor: wizardState.primaryColor,
        accentColor: wizardState.accentColor,
        assignedBundleIds: wizardState.assignedBundleIds,
        assignedProgramIds: wizardState.assignedProgramIds,
        planType: wizardState.planType,
        status: wizardState.status,
        seatLimit: wizardState.seatLimit,
        trialEndsAt,
        ...(contactUser ? { contactUser } : {}),
      });

      setSelectedOrgId(result.id);
      setWizardOpen(false);
      setWizardStep(1);

      if (result.tempPassword && result.contactUserEmail) {
        setOrgTempPassword({ password: result.tempPassword, email: result.contactUserEmail });
      } else {
        toast.success("Organization created");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleOrgStatus = async (organization: Organization) => {
    const nextStatus: OrganizationStatus = organization.status === "suspended" ? "active" : "suspended";

    try {
      await updateOrganization(organization.id, { status: nextStatus });
      toast.success(nextStatus === "active" ? "Organization reactivated" : "Organization suspended");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const renderWizardStep = () => {
    if (wizardStep === 1) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Organization Name</Label>
            <Input
              value={wizardState.name}
              onChange={(event) => {
                const name = event.target.value;
                updateWizard("name", name);
                if (!slugLocked) {
                  updateWizard("slug", slugify(name));
                }
              }}
              placeholder="MI Roundtable"
            />
          </div>

          <div className="space-y-2">
            <Label>Organization Slug</Label>
            <Input
              value={wizardState.slug}
              onChange={(event) => {
                setSlugLocked(true);
                updateWizard("slug", slugify(event.target.value));
              }}
              placeholder="miroundtable"
            />
          </div>

          <div className="space-y-2">
            <Label>Industry Type</Label>
            <Input value={wizardState.industryType} onChange={(event) => updateWizard("industryType", event.target.value)} placeholder="Nonprofit" />
          </div>

          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input value={wizardState.contactEmail} onChange={(event) => updateWizard("contactEmail", event.target.value)} placeholder="ops@organization.org" />
          </div>

          <div className="space-y-2">
            <Label>Owner Email</Label>
            <Input value={wizardState.ownerEmail} onChange={(event) => updateWizard("ownerEmail", event.target.value)} placeholder="owner@organization.org" />
          </div>

          <div className="space-y-2">
            <Label>Owner Name <span className="text-muted-foreground/60 font-normal text-xs">(creates their account with a temp password)</span></Label>
            <Input value={wizardState.ownerName} onChange={(event) => updateWizard("ownerName", event.target.value)} placeholder="Jane Smith" />
          </div>

          <div className="space-y-2">
            <Label>Support Email</Label>
            <Input value={wizardState.supportEmail} onChange={(event) => updateWizard("supportEmail", event.target.value)} placeholder="support@organization.org" />
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={wizardState.phoneNumber} onChange={(event) => updateWizard("phoneNumber", event.target.value)} placeholder="(313) 555-0100" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Notes (optional)</Label>
            <Textarea value={wizardState.notes} onChange={(event) => updateWizard("notes", event.target.value)} rows={3} />
          </div>
        </div>
      );
    }

    if (wizardStep === 2) {
      const normalized = subdomainify(wizardState.subdomain);
      const available = normalized ? isSubdomainAvailable(normalized) : false;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Subdomain</Label>
            <Input
              value={wizardState.subdomain}
              onChange={(event) => updateWizard("subdomain", subdomainify(event.target.value))}
              placeholder="miroundtable"
            />
            <p className="text-xs text-muted-foreground">Portal URL: {getOrgPortalUrl(wizardState.slug || "org-slug")}</p>
            <p className={cn("text-xs", available ? "text-emerald-300" : "text-amber-300")}>
              {normalized ? (available ? "Slug available" : "Slug already in use") : "Enter a subdomain to validate"}
            </p>
          </div>
        </div>
      );
    }

    if (wizardStep === 3) {
      return (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Bundles</p>
            {bundles.map((bundle) => {
              const checked = wizardState.assignedBundleIds.includes(bundle.id);
              return (
                <label key={bundle.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{bundle.name}</p>
                    <p className="text-xs text-muted-foreground">{bundle.programIds.length} programs</p>
                  </div>
                  <Switch checked={checked} onCheckedChange={() => toggleArray("assignedBundleIds", bundle.id)} />
                </label>
              );
            })}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Individual Programs</p>
            {programs.map((program) => {
              const checked = wizardState.assignedProgramIds.includes(program.id);
              return (
                <label key={program.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <span className="text-sm">{program.name}</span>
                  <Switch checked={checked} onCheckedChange={() => toggleArray("assignedProgramIds", program.id)} />
                </label>
              );
            })}
          </div>

          <div className="md:col-span-2 rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground mb-2">Selected Programs</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set([
                ...wizardState.assignedProgramIds,
                ...wizardState.assignedBundleIds.flatMap((bundleId) => bundles.find((bundle) => bundle.id === bundleId)?.programIds ?? []),
              ])].map((programId) => {
                const program = programs.find((entry) => entry.id === programId);
                if (!program) return null;
                return <Badge key={programId} variant="secondary">{program.name}</Badge>;
              })}
            </div>
          </div>
        </div>
      );
    }

    if (wizardStep === 4) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Organization Logo URL</Label>
            <Input value={wizardState.logoUrl} onChange={(event) => updateWizard("logoUrl", event.target.value)} placeholder="https://cdn.../logo.png" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Banner URL (optional)</Label>
            <Input value={wizardState.bannerUrl} onChange={(event) => updateWizard("bannerUrl", event.target.value)} placeholder="https://cdn.../banner.jpg" />
          </div>

          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={parseLegacyHslToHex(wizardState.primaryColor, "#2563eb")}
                onChange={(event) => updateWizard("primaryColor", event.target.value)}
                className="h-10 w-14 rounded border border-input bg-secondary p-1"
              />
              <Input value={wizardState.primaryColor} onChange={(event) => updateWizard("primaryColor", event.target.value)} placeholder="#2563eb" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={parseLegacyHslToHex(wizardState.accentColor, "#0ea5e9")}
                onChange={(event) => updateWizard("accentColor", event.target.value)}
                className="h-10 w-14 rounded border border-input bg-secondary p-1"
              />
              <Input value={wizardState.accentColor} onChange={(event) => updateWizard("accentColor", event.target.value)} placeholder="#0ea5e9" />
            </div>
          </div>

          <div className="md:col-span-2 rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Branding Preview</p>
            <div className="rounded-lg px-4 py-6" style={{ background: gradientCss(wizardState.primaryColor, wizardState.accentColor, 120) }}>
              <p className="text-white text-sm font-semibold">{wizardState.name || "Organization Portal"}</p>
              <p className="text-white/80 text-xs">Branded portal header preview</p>
            </div>
          </div>
        </div>
      );
    }

    if (wizardStep === 5) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Plan Type</Label>
            <Select value={wizardState.planType} onValueChange={(value) => updateWizard("planType", value as PlanType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={wizardState.status} onValueChange={(value) => updateWizard("status", value as OrganizationStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>User Seat Limit</Label>
            <Input type="number" value={wizardState.seatLimit} onChange={(event) => updateWizard("seatLimit", parseInt(event.target.value, 10) || 0)} />
          </div>

          <div className="space-y-2">
            <Label>Trial Period (days)</Label>
            <Input type="number" value={wizardState.trialDays} onChange={(event) => updateWizard("trialDays", parseInt(event.target.value, 10) || 0)} disabled={wizardState.status !== "trial"} />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Organization Info</p>
          <p className="mt-2 font-medium">{wizardState.name}</p>
          <p className="text-xs text-muted-foreground">Slug: {wizardState.slug}</p>
          <p className="text-xs text-muted-foreground">Contact: {wizardState.contactEmail}</p>
          <p className="text-xs text-muted-foreground">Owner: {wizardState.ownerEmail}</p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Portal URL</p>
          <p className="mt-2">{getOrgPortalUrl(wizardState.slug)}</p>
        </div>

        {wizardState.ownerEmail.trim() && wizardState.ownerName.trim() && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-xs uppercase tracking-wider text-amber-400 font-medium">Owner Account</p>
            <p className="mt-2 text-sm font-medium">{wizardState.ownerName}</p>
            <p className="text-xs text-muted-foreground">{wizardState.ownerEmail}</p>
            <p className="mt-1 text-xs text-amber-400">A temporary password will be generated. Copy it from the next screen and share it securely.</p>
          </div>
        )}

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Programs & Bundles</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {wizardState.assignedBundleIds.map((bundleId) => {
              const bundle = bundles.find((entry) => entry.id === bundleId);
              return bundle ? <Badge key={bundleId} variant="secondary">{bundle.name}</Badge> : null;
            })}
            {wizardState.assignedProgramIds.map((programId) => {
              const program = programs.find((entry) => entry.id === programId);
              return program ? <Badge key={programId} variant="outline">{program.name}</Badge> : null;
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Branding & Plan</p>
          <p className="mt-2">Plan: {wizardState.planType}</p>
          <p>Status: {wizardState.status}</p>
          <p>Seat Limit: {wizardState.seatLimit}</p>
          <p className="text-xs text-muted-foreground">Primary: {wizardState.primaryColor} | Accent: {wizardState.accentColor}</p>
        </div>
      </div>
    );
  };

  const updateSelectedPrograms = async (bundleIds: string[], programIds: string[]) => {
    if (!selectedOrg) return;

    try {
      await setOrganizationPrograms(selectedOrg.id, programIds, bundleIds);
      toast.success("Organization programs updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="metal-raised rounded-lg p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <div>
          <h2 className="font-mono text-lg font-bold tracking-tight">ORGANIZATION MANAGEMENT</h2>
          <p className="text-xs text-muted-foreground font-mono">Centralized control center for all client organizations.</p>
        </div>
        <Button onClick={openWizard}><Plus className="h-4 w-4" /> Create Organization</Button>
      </div>

      <div className="metal-panel rounded-lg p-4">
        {isLoading && <p className="mb-3 text-xs text-muted-foreground">Loading organizations...</p>}
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by organization, slug, subdomain, or email" className="pl-10" />
          </div>

          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as OrganizationStatus | "all"); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select value={bundleFilter} onValueChange={(value) => { setBundleFilter(value); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Filter bundle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All bundles</SelectItem>
              {bundles.map((bundle) => (
                <SelectItem key={bundle.id} value={bundle.id}>{bundle.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Portal URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Bundle</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  No organizations match your filters.
                </TableCell>
              </TableRow>
            )}

            {paged.map((organization) => {
              const mainBundle = bundles.find((bundle) => organization.assignedBundleIds.includes(bundle.id));
              return (
                <TableRow key={organization.id} className={cn(selectedOrg?.id === organization.id && "bg-secondary/30")}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{organization.name}</p>
                      <p className="text-xs text-muted-foreground">{organization.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium">{getOrgPortalUrl(organization.slug)}</div>
                  </TableCell>
                  <TableCell><StatusPill status={organization.status} /></TableCell>
                  <TableCell>{mainBundle?.name || "Custom"}</TableCell>
                  <TableCell>{usersByOrgId[organization.id] || 0}</TableCell>
                  <TableCell>{formatDate(organization.createdAt)}</TableCell>
                  <TableCell>{formatDate(organization.lastActivityAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedOrgId(organization.id); setDetailTab("overview"); }}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedOrgId(organization.id); setDetailTab("settings"); }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void toggleOrgStatus(organization)}>
                        {organization.status === "suspended" ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filtered.length === 0
            ? "Showing 0 organizations"
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1} - ${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} organizations`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((prev) => prev - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((prev) => prev + 1)}>Next</Button>
        </div>
      </div>

      {selectedOrg && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center text-white font-semibold" style={{ background: gradientCss(selectedOrg.branding.primaryColor, selectedOrg.branding.accentColor, selectedOrg.branding.gradientAngle ?? 130) }}>
                {selectedOrg.logo}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organization Detail</p>
                <h3 className="text-lg font-semibold">{selectedOrg.name}</h3>
                <p className="text-xs text-muted-foreground">{getOrgPortalUrl(selectedOrg.slug)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void toggleOrgStatus(selectedOrg)}>{selectedOrg.status === "suspended" ? "Reactivate" : "Suspend"}</Button>
              <Button variant="outline" size="sm" onClick={() => setDetailTab("branding")}>Edit Branding</Button>
              <Button size="sm" onClick={() => navigate(getOrgBasePath(selectedOrg.slug))}>Open Portal</Button>
            </div>
          </div>

          <Tabs value={detailTab} onValueChange={(value) => setDetailTab(value as DetailTab)}>
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
              <TabsTrigger value="overview" className="bg-secondary/40 data-[state=active]:bg-secondary">Overview</TabsTrigger>
              <TabsTrigger value="programs" className="bg-secondary/40 data-[state=active]:bg-secondary">Programs</TabsTrigger>
              <TabsTrigger value="users" className="bg-secondary/40 data-[state=active]:bg-secondary">Users Summary</TabsTrigger>
              <TabsTrigger value="branding" className="bg-secondary/40 data-[state=active]:bg-secondary">Branding</TabsTrigger>
              <TabsTrigger value="domain" className="bg-secondary/40 data-[state=active]:bg-secondary">Domain Settings</TabsTrigger>
              <TabsTrigger value="settings" className="bg-secondary/40 data-[state=active]:bg-secondary">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <article className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organization</p>
                  <p className="mt-2 font-medium">{selectedOrg.name}</p>
                  <p className="text-xs text-muted-foreground">Plan: {selectedOrg.planType}</p>
                </article>
                <article className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Portal URL</p>
                  <p className="mt-2 font-medium text-xs break-all">{getOrgPortalUrl(selectedOrg.slug)}</p>
                </article>
                <article className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Users</p>
                  <p className="mt-2 font-medium">{usersByOrgId[selectedOrg.id] || 0}</p>
                  <p className="text-xs text-muted-foreground">Seat limit: {selectedOrg.seatLimit}</p>
                </article>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Program Assignments</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPrograms.map((program) => (
                    <Badge key={program.id} variant="secondary">{program.name}</Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="programs" className="space-y-4">
              <ProgramAssignmentsPanel
                key={`${selectedOrg.id}-programs`}
                org={selectedOrg}
                bundles={bundles}
                programs={programs}
                onSave={updateSelectedPrograms}
              />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Users</p>
                  <p className="mt-2 text-2xl font-semibold">{usersByOrgId[selectedOrg.id] || 0}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Users</p>
                  <p className="mt-2 text-2xl font-semibold">{activeUsers}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Inactive Users</p>
                  <p className="mt-2 text-2xl font-semibold">{inactiveUsers}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate(getOrgBasePath(selectedOrg.slug) + "/users")}>Go To User Manager</Button>
            </TabsContent>

            <TabsContent value="branding" className="space-y-4">
              <BrandingPanel key={`${selectedOrg.id}-branding`} org={selectedOrg} onSave={(updates) => updateOrganization(selectedOrg.id, updates)} />
            </TabsContent>

            <TabsContent value="domain" className="space-y-4">
              <DomainPanel
                key={`${selectedOrg.id}-domain`}
                org={selectedOrg}
                isSubdomainAvailable={isSubdomainAvailable}
                onSave={async () => undefined}
              />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <SettingsPanel key={`${selectedOrg.id}-settings`} org={selectedOrg} onSave={(updates) => updateOrganization(selectedOrg.id, updates)} />
            </TabsContent>
          </Tabs>
        </section>
      )}

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Organization · Step {wizardStep} of 6</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div key={step} className={cn("h-1 rounded-full", wizardStep >= step ? "bg-primary" : "bg-muted")} />
              ))}
            </div>

            {renderWizardStep()}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={prevStep} disabled={wizardStep === 1}>Back</Button>
              {wizardStep < 6 ? (
                <Button onClick={nextStep}>Next</Button>
              ) : (
                <Button onClick={() => void handleCreate()}><Check className="h-4 w-4" /> Confirm & Create</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {orgTempPassword && (
        <TempPasswordModal
          open={true}
          onClose={() => setOrgTempPassword(null)}
          tempPassword={orgTempPassword.password}
          userEmail={orgTempPassword.email}
          context="org"
        />
      )}
    </div>
  );
}

function ProgramAssignmentsPanel({
  org,
  bundles,
  programs,
  onSave,
}: {
  org: Organization;
  bundles: Bundle[];
  programs: SuiteProgram[];
  onSave: (bundleIds: string[], programIds: string[]) => Promise<void>;
}) {
  const [bundleIds, setBundleIds] = useState<string[]>(org.assignedBundleIds);
  const [programIds, setProgramIds] = useState<string[]>(org.assignedProgramIds);

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((id) => id !== value) : [...list, value]);

  const effectiveProgramIds = useMemo(() => {
    const fromBundles = bundleIds.flatMap((bundleId) => bundles.find((bundle) => bundle.id === bundleId)?.programIds ?? []);
    return [...new Set([...programIds, ...fromBundles])];
  }, [bundleIds, programIds, bundles]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Switch Bundles</p>
          {bundles.map((bundle) => (
            <label key={bundle.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">{bundle.name}</span>
              <Switch checked={bundleIds.includes(bundle.id)} onCheckedChange={() => setBundleIds((prev) => toggle(prev, bundle.id))} />
            </label>
          ))}
        </article>

        <article className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Add / Remove Programs</p>
          {programs.map((program) => (
            <label key={program.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">{program.name}</span>
              <Switch checked={programIds.includes(program.id)} onCheckedChange={() => setProgramIds((prev) => toggle(prev, program.id))} />
            </label>
          ))}
        </article>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Program Status</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {programs.filter((program) => effectiveProgramIds.includes(program.id)).map((program) => (
            <div key={program.id} className="rounded-md border border-border px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{program.name}</p>
                  <p className="text-xs text-muted-foreground">{program.launchUrl}</p>
                </div>
              </div>
              <Badge variant="outline">Enabled</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void onSave(bundleIds, programIds)}>Save Programs</Button>
      </div>
    </div>
  );
}

function BrandingPanel({ org, onSave }: { org: Organization; onSave: (updates: Partial<Organization>) => Promise<void> }) {
  const [logoUrl, setLogoUrl] = useState(org.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(org.bannerUrl || "");
  const [backgroundUrl, setBackgroundUrl] = useState(org.backgroundUrl || "");
  const [primaryColor, setPrimaryColor] = useState(parseLegacyHslToHex(org.branding.primaryColor, "#2563eb"));
  const [accentColor, setAccentColor] = useState(parseLegacyHslToHex(org.branding.accentColor, "#0ea5e9"));
  const [backgroundStartColor, setBackgroundStartColor] = useState(parseLegacyHslToHex(org.branding.backgroundStartColor, "#0f172a"));
  const [backgroundEndColor, setBackgroundEndColor] = useState(parseLegacyHslToHex(org.branding.backgroundEndColor, "#1d4ed8"));
  const [bannerStartColor, setBannerStartColor] = useState(parseLegacyHslToHex(org.branding.bannerStartColor, "#1e293b"));
  const [bannerEndColor, setBannerEndColor] = useState(parseLegacyHslToHex(org.branding.bannerEndColor, "#0ea5e9"));
  const [gradientAngle, setGradientAngle] = useState(org.branding.gradientAngle ?? 135);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  const normalizeUploadedAssetUrl = (assetUrl: string) => {
    if (/^https?:\/\//i.test(assetUrl)) {
      return assetUrl;
    }

    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? window.location.origin;
    try {
      return new URL(assetUrl, apiBaseUrl).toString();
    } catch {
      return assetUrl;
    }
  };

  const handleAssetUpload = async (file: File | undefined, target: "banner" | "background") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (target === "banner") {
      setIsUploadingBanner(true);
    } else {
      setIsUploadingBackground(true);
    }

    try {
      const upload = await uploadLogoFile(file);
      const resolved = normalizeUploadedAssetUrl(upload.logoUrl);
      if (target === "banner") {
        setBannerUrl(resolved);
      } else {
        setBackgroundUrl(resolved);
      }
      toast.success(`${target === "banner" ? "Banner" : "Background"} image uploaded`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      if (target === "banner") {
        setIsUploadingBanner(false);
      } else {
        setIsUploadingBackground(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Logo URL</Label>
          <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Banner Image</Label>
          <div className="flex gap-2">
            <Input value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} placeholder="https://cdn.../banner.jpg" />
            <Label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-input bg-secondary px-3 text-xs font-medium hover:bg-secondary/80">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleAssetUpload(event.target.files?.[0], "banner");
                  event.currentTarget.value = "";
                }}
              />
            </Label>
            <Button type="button" variant="outline" onClick={() => setBannerUrl("")} disabled={isUploadingBanner}>Clear</Button>
          </div>
          {isUploadingBanner && <p className="text-xs text-muted-foreground">Uploading banner...</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Background Image (Page Backdrop)</Label>
          <div className="flex gap-2">
            <Input value={backgroundUrl} onChange={(event) => setBackgroundUrl(event.target.value)} placeholder="https://cdn.../background.jpg" />
            <Label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-input bg-secondary px-3 text-xs font-medium hover:bg-secondary/80">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleAssetUpload(event.target.files?.[0], "background");
                  event.currentTarget.value = "";
                }}
              />
            </Label>
            <Button type="button" variant="outline" onClick={() => setBackgroundUrl("")} disabled={isUploadingBackground}>Clear</Button>
          </div>
          {isUploadingBackground && <p className="text-xs text-muted-foreground">Uploading background...</p>}
        </div>

        <div className="space-y-2">
          <Label>Primary Brand Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={parseLegacyHslToHex(primaryColor, "#2563eb")} onChange={(event) => setPrimaryColor(event.target.value)} className="h-10 w-14 rounded border border-input bg-secondary p-1" />
            <Input value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Accent Brand Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={parseLegacyHslToHex(accentColor, "#0ea5e9")} onChange={(event) => setAccentColor(event.target.value)} className="h-10 w-14 rounded border border-input bg-secondary p-1" />
            <Input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Background Gradient Start</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={parseLegacyHslToHex(backgroundStartColor, "#0f172a")} onChange={(event) => setBackgroundStartColor(event.target.value)} className="h-10 w-14 rounded border border-input bg-secondary p-1" />
            <Input value={backgroundStartColor} onChange={(event) => setBackgroundStartColor(event.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Background Gradient End</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={parseLegacyHslToHex(backgroundEndColor, "#1d4ed8")} onChange={(event) => setBackgroundEndColor(event.target.value)} className="h-10 w-14 rounded border border-input bg-secondary p-1" />
            <Input value={backgroundEndColor} onChange={(event) => setBackgroundEndColor(event.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Banner Gradient Start</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={parseLegacyHslToHex(bannerStartColor, "#1e293b")} onChange={(event) => setBannerStartColor(event.target.value)} className="h-10 w-14 rounded border border-input bg-secondary p-1" />
            <Input value={bannerStartColor} onChange={(event) => setBannerStartColor(event.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Banner Gradient End</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={parseLegacyHslToHex(bannerEndColor, "#0ea5e9")} onChange={(event) => setBannerEndColor(event.target.value)} className="h-10 w-14 rounded border border-input bg-secondary p-1" />
            <Input value={bannerEndColor} onChange={(event) => setBannerEndColor(event.target.value)} />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Gradient Angle</Label>
          <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
            <input type="range" min="0" max="360" value={gradientAngle} onChange={(event) => setGradientAngle(Number(event.target.value))} className="w-full" />
            <div className="text-[10px] font-mono text-muted-foreground">{gradientAngle}deg</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Live Preview</p>
        <div
          className="rounded-lg border border-border p-3"
          style={{
            backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : gradientCss(backgroundStartColor, backgroundEndColor, gradientAngle),
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="rounded-lg px-4 py-7"
            style={{
              backgroundImage: bannerUrl
                ? `linear-gradient(rgba(15, 23, 42, 0.38), rgba(15, 23, 42, 0.38)), url(${bannerUrl})`
                : gradientCss(bannerStartColor, bannerEndColor, gradientAngle),
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <p className="text-white font-semibold">{org.name}</p>
            <p className="text-white/80 text-xs">Banner preview</p>
          </div>
          <div className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-md text-xs font-semibold text-white" style={{ background: gradientCss(primaryColor, accentColor, gradientAngle) }}>
            {org.logo}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={async () => {
          try {
            await onSave({
              logoUrl,
              bannerUrl,
              backgroundUrl,
              branding: {
                primaryColor,
                accentColor,
                backgroundStartColor,
                backgroundEndColor,
                bannerStartColor,
                bannerEndColor,
                gradientAngle,
              },
            });
            toast.success("Branding updated");
          } catch (error) {
            toast.error(getErrorMessage(error));
          }
        }}>
          Save Branding
        </Button>
      </div>
    </div>
  );
}

function DomainPanel({
  org,
}: {
  org: Organization;
  isSubdomainAvailable: (subdomain: string, exceptOrgId?: string) => boolean;
  onSave: (subdomain: string) => Promise<void>;
}) {
  const portalUrl = getOrgPortalUrl(org.slug);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Canonical Portal URL</p>
        <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm font-mono break-all">{portalUrl}</div>
        <p className="text-xs text-muted-foreground">This is the direct link for this organization's portal. Share it with org admins and members.</p>
      </div>

      <div className="rounded-lg border border-border p-4 text-sm space-y-1">
        <p className="font-medium">Slug</p>
        <p className="text-muted-foreground font-mono">{org.slug}</p>
        <p className="text-xs text-muted-foreground mt-1">To change the slug, update it in the Settings tab — the portal URL updates automatically.</p>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Custom domain support is prepared for a future release. Example: portal.organization.org
      </div>
    </div>
  );
}

function SettingsPanel({ org, onSave }: { org: Organization; onSave: (updates: Partial<Organization>) => Promise<void> }) {
  const [supportEmail, setSupportEmail] = useState(org.supportEmail);
  const [contactEmail, setContactEmail] = useState(org.contactEmail);
  const [ownerEmail, setOwnerEmail] = useState(org.ownerEmail);
  const [phoneNumber, setPhoneNumber] = useState(org.phoneNumber || "");
  const [seatLimit, setSeatLimit] = useState(org.seatLimit);
  const [status, setStatus] = useState<OrganizationStatus>(org.status);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Support Email</Label>
          <Input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Contact Email</Label>
          <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Owner Email</Label>
          <Input value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Seat Limit</Label>
          <Input type="number" value={seatLimit} onChange={(event) => setSeatLimit(parseInt(event.target.value, 10) || 0)} />
        </div>

        <div className="space-y-2">
          <Label>Organization Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as OrganizationStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-2 text-sm text-muted-foreground">
        <p className="text-xs uppercase tracking-wider">Feature Flags</p>
        <p>
          Feature-level toggles are not persisted by the current organization API yet, so they are hidden from the edit flow for now.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={async () => {
            try {
              await onSave({ supportEmail, contactEmail, ownerEmail, phoneNumber, seatLimit, status });
              toast.success("Organization settings updated");
            } catch (error) {
              toast.error(getErrorMessage(error));
            }
          }}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}

interface AdminPageProps {
  section?: AdminSection;
}

export default function AdminPage({ section = "organizations" }: AdminPageProps) {
  const isOrganizationsView = section === "organizations";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="metal-raised rounded-lg p-6 relative">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <p className="stamped-label text-[10px]">Nxt Lvl Suite Admin Panel</p>
        <h1 className="font-mono text-xl font-bold tracking-tight">
          {isOrganizationsView ? "Organization Management" : "Program Control Center"}
        </h1>
        <img
          src="/3_banner.png"
          alt="Admin banner"
          className="mt-3 h-24 w-full rounded-md border border-border/60 object-cover"
        />
        <p className="text-xs text-muted-foreground font-mono">
          {isOrganizationsView
            ? "Manage organizations, branding, and access."
            : "Manage programs, launch paths, and visibility."}
        </p>
      </div>

      {isOrganizationsView ? <OrganizationsTab /> : <ProgramManagerTab />}
    </div>
  );
}
