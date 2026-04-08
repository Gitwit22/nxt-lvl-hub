import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrograms } from "@/context/ProgramContext";
import { useOrgPortal } from "@/context/OrgPortalContext";
import { Bundle, Organization, OrganizationStatus, PlanType, SuiteProgram } from "@/types/orgPortal";
import { Program, CATEGORIES, ProgramStatus, ProgramType, ProgramOrigin } from "@/types/program";
import { getOrgBasePath, getOrgPortalFallbackUrl, getOrgPortalUrl } from "@/lib/orgRoutes";
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
import { Check, Plus, Pencil, Trash2, Upload, Search, Eye, PauseCircle, PlayCircle, Globe, Building2, Users } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 8;
const ROOT_DOMAIN = "nxtlvlsuite.com";

type AdminTab = "organizations" | "programs";
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
type DetailTab = "overview" | "programs" | "users" | "branding" | "domain" | "settings";

type WizardState = {
  name: string;
  slug: string;
  contactEmail: string;
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
  supportEmail: "",
  phoneNumber: "",
  industryType: "",
  notes: "",
  subdomain: "",
  assignedBundleIds: [],
  assignedProgramIds: [],
  logoUrl: "",
  bannerUrl: "",
  primaryColor: "217 80% 56%",
  accentColor: "191 85% 47%",
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
  accentColor: "",
});

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
    suspended: "bg-red-500/20 text-red-300 border-red-500/30",
    trial: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  };

  return <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider", map[status])}>{status}</span>;
}

function ProgramManagerTab() {
  const { programs, addProgram, updateProgram, deleteProgram } = usePrograms();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProgramForm());
  const [tagsInput, setTagsInput] = useState("");
  const [logoInputMode, setLogoInputMode] = useState<"url" | "upload">("url");

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyProgramForm());
    setTagsInput("");
    setLogoInputMode("url");
    setOpen(true);
  };

  const openEdit = (p: Program) => {
    setEditingId(p.id);
    setForm({ ...p });
    setTagsInput(p.tags.join(", "));
    setLogoInputMode(p.logoUrl?.startsWith("data:") ? "upload" : "url");
    setOpen(true);
  };

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogoUpload = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("logoUrl", typeof reader.result === "string" ? reader.result : "");
      setLogoInputMode("upload");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
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
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      name: form.name.trim(),
      shortDescription: form.shortDescription.trim(),
      longDescription: form.longDescription.trim(),
      internalRoute: form.type === "internal" ? form.internalRoute?.trim() : "",
      externalUrl: form.type === "external" ? form.externalUrl?.trim() : "",
      logoUrl: form.logoUrl?.trim() || "",
      launchLabel: form.launchLabel.trim() || "Launch",
    };

    if (editingId) {
      updateProgram(editingId, data);
      toast.success("Program updated");
    } else {
      addProgram(data);
      toast.success("Program added");
    }
    setOpen(false);
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
        {[...programs].sort((a, b) => a.displayOrder - b.displayOrder).map((p) => (
          <div key={p.id} className="metal-panel rounded-lg p-4 flex items-center gap-4 relative">
            <Screw className="absolute top-2 left-2" />
            <ProgramLogo name={p.name} logoUrl={p.logoUrl} accentColor={p.accentColor} className="w-8 h-8" textClassName="text-xs" />
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
              <button onClick={() => deleteProgram(p.id)} className="metal-button rounded p-1.5 hover:text-destructive transition-colors">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Program Name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-secondary font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className="bg-secondary font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                <Input value={form.logoUrl || ""} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://cdn.nltops.com/logos/app.png" className="bg-secondary font-mono text-xs" />
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="logo-upload" className="inline-flex items-center gap-2 text-xs font-mono cursor-pointer metal-button rounded px-3 py-2">
                    <Upload className="h-3.5 w-3.5" /> Choose Image
                  </Label>
                  <Input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
                </div>
              )}
            </div>

            {form.type === "internal" ? (
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Internal Route / Path / Subdomain</Label>
                <Input value={form.internalRoute || ""} onChange={(e) => set("internalRoute", e.target.value)} placeholder="/apps/my-app or app.nltops.com" className="bg-secondary font-mono text-xs" />
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
                <Input type="number" value={form.displayOrder} onChange={(e) => set("displayOrder", parseInt(e.target.value, 10) || 0)} className="bg-secondary font-mono text-xs" />
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

function OrganizationsTab() {
  const navigate = useNavigate();
  const {
    organizations,
    bundles,
    programs,
    users,
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

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) ?? organizations[0];

  const usersByOrgId = useMemo(() => {
    return users.reduce<Record<string, number>>((acc, user) => {
      acc[user.orgId] = (acc[user.orgId] || 0) + 1;
      return acc;
    }, {});
  }, [users]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return organizations
      .filter((org) => {
        if (!lower) return true;
        return [org.name, org.slug, org.subdomain, org.contactEmail].some((entry) => entry.toLowerCase().includes(lower));
      })
      .filter((org) => statusFilter === "all" || org.status === statusFilter)
      .filter((org) => bundleFilter === "all" || org.assignedBundleIds.includes(bundleFilter))
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
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
      if (!wizardState.name.trim() || !wizardState.contactEmail.trim() || !wizardState.supportEmail.trim()) {
        toast.error("Name, contact email, and support email are required");
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

  const handleCreate = () => {
    const trialEndsAt = wizardState.status === "trial"
      ? new Date(Date.now() + wizardState.trialDays * 24 * 60 * 60 * 1000).toISOString()
      : "";

    const organization = createOrganization({
      name: wizardState.name,
      slug: wizardState.slug,
      subdomain: wizardState.subdomain,
      contactEmail: wizardState.contactEmail,
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
    });

    toast.success("Organization created");
    setSelectedOrgId(organization.id);
    setWizardOpen(false);
    setWizardStep(1);
  };

  const toggleOrgStatus = (org: Organization) => {
    const nextStatus: OrganizationStatus = org.status === "suspended" ? "active" : "suspended";
    updateOrganization(org.id, { status: nextStatus });
    toast.success(nextStatus === "active" ? "Organization reactivated" : "Organization suspended");
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
            <p className="text-xs text-muted-foreground">Full URL preview: {normalized || "your-org"}.{ROOT_DOMAIN}</p>
            <p className={cn("text-xs", available ? "text-emerald-300" : "text-amber-300")}>
              {normalized ? (available ? "Subdomain available" : "Subdomain already in use") : "Enter a subdomain to validate"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
            Routing supported: {getOrgPortalUrl(normalized || "your-org")} and {getOrgPortalFallbackUrl(wizardState.slug || "org-slug")}
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
            <Label>Primary Color (HSL)</Label>
            <Input value={wizardState.primaryColor} onChange={(event) => updateWizard("primaryColor", event.target.value)} placeholder="217 80% 56%" />
          </div>

          <div className="space-y-2">
            <Label>Accent Color (HSL)</Label>
            <Input value={wizardState.accentColor} onChange={(event) => updateWizard("accentColor", event.target.value)} placeholder="191 85% 47%" />
          </div>

          <div className="md:col-span-2 rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Branding Preview</p>
            <div
              className="rounded-lg px-4 py-6"
              style={{ background: `linear-gradient(120deg, hsl(${wizardState.primaryColor}), hsl(${wizardState.accentColor}))` }}
            >
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
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Domain</p>
          <p className="mt-2">{wizardState.subdomain}.{ROOT_DOMAIN}</p>
          <p className="text-xs text-muted-foreground">Fallback: /org/{wizardState.slug}</p>
        </div>

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

  const updateSelectedPrograms = (bundleIds: string[], programIds: string[]) => {
    if (!selectedOrg) return;
    setOrganizationPrograms(selectedOrg.id, programIds, bundleIds);
    toast.success("Organization programs updated");
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
              <TableHead>Subdomain</TableHead>
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

            {paged.map((org) => {
              const mainBundle = bundles.find((bundle) => org.assignedBundleIds.includes(bundle.id));
              return (
                <TableRow key={org.id} className={cn(selectedOrg?.id === org.id && "bg-secondary/30")}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground">{org.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p className="font-medium">{org.subdomain}.{ROOT_DOMAIN}</p>
                      <p className="text-muted-foreground">/org/{org.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell><StatusPill status={org.status} /></TableCell>
                  <TableCell>{mainBundle?.name || "Custom"}</TableCell>
                  <TableCell>{usersByOrgId[org.id] || 0}</TableCell>
                  <TableCell>{formatDate(org.createdAt)}</TableCell>
                  <TableCell>{formatDate(org.lastActivityAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedOrgId(org.id); setDetailTab("overview"); }}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedOrgId(org.id); setDetailTab("settings"); }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleOrgStatus(org)}>
                        {org.status === "suspended" ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
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
              <div className="h-11 w-11 rounded-lg flex items-center justify-center text-white font-semibold" style={{ background: `linear-gradient(130deg, hsl(${selectedOrg.branding.primaryColor}), hsl(${selectedOrg.branding.accentColor}))` }}>
                {selectedOrg.logo}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organization Detail</p>
                <h3 className="text-lg font-semibold">{selectedOrg.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedOrg.subdomain}.{ROOT_DOMAIN}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleOrgStatus(selectedOrg)}>{selectedOrg.status === "suspended" ? "Reactivate" : "Suspend"}</Button>
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
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Domain</p>
                  <p className="mt-2 font-medium">{selectedOrg.subdomain}.{ROOT_DOMAIN}</p>
                  <p className="text-xs text-muted-foreground">{getOrgPortalFallbackUrl(selectedOrg.slug)}</p>
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
                onSave={(subdomain) => updateOrganization(selectedOrg.id, { subdomain })}
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
                <Button onClick={handleCreate}><Check className="h-4 w-4" /> Confirm & Create</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  onSave: (bundleIds: string[], programIds: string[]) => void;
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
        <Button onClick={() => onSave(bundleIds, programIds)}>Save Programs</Button>
      </div>
    </div>
  );
}

function BrandingPanel({ org, onSave }: { org: Organization; onSave: (updates: Partial<Organization>) => void }) {
  const [logoUrl, setLogoUrl] = useState(org.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(org.bannerUrl || "");
  const [primaryColor, setPrimaryColor] = useState(org.branding.primaryColor);
  const [accentColor, setAccentColor] = useState(org.branding.accentColor);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Logo URL</Label>
          <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Banner URL</Label>
          <Input value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Primary Color (HSL)</Label>
          <Input value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Accent Color (HSL)</Label>
          <Input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Live Preview</p>
        <div className="rounded-lg px-4 py-7" style={{ background: `linear-gradient(135deg, hsl(${primaryColor}), hsl(${accentColor}))` }}>
          <p className="text-white font-semibold">{org.name}</p>
          <p className="text-white/80 text-xs">Portal header preview</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => {
          onSave({
            logoUrl,
            bannerUrl,
            branding: { primaryColor, accentColor },
          });
          toast.success("Branding updated");
        }}>
          Save Branding
        </Button>
      </div>
    </div>
  );
}

function DomainPanel({
  org,
  isSubdomainAvailable,
  onSave,
}: {
  org: Organization;
  isSubdomainAvailable: (subdomain: string, exceptOrgId?: string) => boolean;
  onSave: (subdomain: string) => void;
}) {
  const [subdomain, setSubdomain] = useState(org.subdomain);
  const normalized = subdomainify(subdomain);
  const available = normalized === org.subdomain || isSubdomainAvailable(normalized, org.id);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Subdomain</Label>
          <Input value={subdomain} onChange={(event) => setSubdomain(subdomainify(event.target.value))} />
          <p className={cn("text-xs", available ? "text-emerald-300" : "text-red-300")}>
            {available ? "Subdomain available" : "Subdomain already in use"}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Full URL</Label>
          <div className="rounded-md border border-border px-3 py-2 text-sm">{normalized || "org"}.{ROOT_DOMAIN}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 text-sm">
        <p className="font-medium">Fallback Route</p>
        <p className="text-muted-foreground">/org/{org.slug}</p>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Custom domain support is prepared for future release. Example: portal.organization.org
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!normalized || !available}
          onClick={() => {
            onSave(normalized);
            toast.success("Domain settings updated");
          }}
        >
          <Globe className="h-4 w-4" /> Save Domain
        </Button>
      </div>
    </div>
  );
}

function SettingsPanel({ org, onSave }: { org: Organization; onSave: (updates: Partial<Organization>) => void }) {
  const [supportEmail, setSupportEmail] = useState(org.supportEmail);
  const [contactEmail, setContactEmail] = useState(org.contactEmail);
  const [phoneNumber, setPhoneNumber] = useState(org.phoneNumber || "");
  const [seatLimit, setSeatLimit] = useState(org.seatLimit);
  const [status, setStatus] = useState<OrganizationStatus>(org.status);
  const [featureFlags, setFeatureFlags] = useState({
    advancedAnalytics: true,
    userProvisioning: true,
    apiAccess: false,
  });

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

      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Feature Flags</p>
        {Object.entries(featureFlags).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <p className="text-sm">{key}</p>
            <Switch checked={value} onCheckedChange={(checked) => setFeatureFlags((prev) => ({ ...prev, [key]: checked }))} />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            onSave({ supportEmail, contactEmail, phoneNumber, seatLimit, status });
            toast.success("Organization settings updated");
          }}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("organizations");

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="metal-raised rounded-lg p-6 relative">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <p className="stamped-label text-[10px]">Nxt Lvl Suite Admin Panel</p>
        <h1 className="font-mono text-xl font-bold tracking-tight">Platform Control Center</h1>
        <p className="text-xs text-muted-foreground font-mono">Manage organizations, bundles, domains, branding, and platform access from one place.</p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as AdminTab)}>
        <TabsList>
          <TabsTrigger value="organizations" className="gap-2"><Users className="h-4 w-4" /> Organizations</TabsTrigger>
          <TabsTrigger value="programs" className="gap-2"><Building2 className="h-4 w-4" /> Program Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="mt-5">
          <OrganizationsTab />
        </TabsContent>
        <TabsContent value="programs" className="mt-5">
          <ProgramManagerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
