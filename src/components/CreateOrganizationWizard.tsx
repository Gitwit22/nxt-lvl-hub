import { useMemo, useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, uploadLogoFile } from "@/lib/api";
import type { Bundle, Organization, OrganizationStatus, PlanType, SuiteProgram } from "@/types/orgPortal";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RESERVED_PORTAL_SUBDOMAINS, getOrgPortalUrl } from "@/lib/orgRoutes";
const AVAILABLE_MODULES = ["announcements", "analytics", "messaging", "support", "billing"];

type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface CreateOrganizationWizardInput {
  name: string;
  slug: string;
  subdomain: string;
  contactEmail: string;
  ownerEmail: string;
  supportEmail: string;
  phoneNumber?: string;
  industryType?: string;
  notes?: string;
  logoUrl?: string;
  faviconUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor: string;
  backgroundColor?: string;
  fontFamily?: string;
  assignedProgramIds: string[];
  assignedBundleIds: string[];
  enabledModules: string[];
  planType: PlanType;
  status: OrganizationStatus;
  seatLimit: number;
  trialDays: number;
  supportPhone?: string;
  billingPlan?: string;
  customDomain?: string;
  portalTitle?: string;
  welcomeMessage?: string;
}

interface CreateOrganizationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundles: Bundle[];
  programs: SuiteProgram[];
  isSubdomainAvailable: (subdomain: string, exceptOrgId?: string) => boolean;
  onCreate: (input: CreateOrganizationWizardInput) => Promise<Organization>;
  onCreated?: (organization: Organization) => void;
}

type WizardState = CreateOrganizationWizardInput;

const DEFAULT_WIZARD_STATE: WizardState = {
  name: "",
  slug: "",
  subdomain: "",
  contactEmail: "",
  ownerEmail: "",
  supportEmail: "",
  phoneNumber: "",
  industryType: "",
  notes: "",
  logoUrl: "",
  faviconUrl: "",
  bannerUrl: "",
  primaryColor: "#2563eb",
  secondaryColor: "#1d4ed8",
  accentColor: "#0ea5e9",
  backgroundColor: "#0f172a",
  fontFamily: "Inter",
  assignedProgramIds: [],
  assignedBundleIds: [],
  enabledModules: ["announcements"],
  planType: "starter",
  status: "trial",
  seatLimit: 25,
  trialDays: 30,
  supportPhone: "",
  billingPlan: "",
  customDomain: "",
  portalTitle: "",
  welcomeMessage: "",
};

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

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

export function CreateOrganizationWizard({
  open,
  onOpenChange,
  bundles,
  programs,
  isSubdomainAvailable,
  onCreate,
  onCreated,
}: CreateOrganizationWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [slugLocked, setSlugLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<WizardState>(DEFAULT_WIZARD_STATE);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

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

  const uploadAsset = async (file: File | undefined, target: "logoUrl" | "bannerUrl") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    if (target === "logoUrl") {
      setIsUploadingLogo(true);
    } else {
      setIsUploadingBanner(true);
    }

    try {
      const upload = await uploadLogoFile(file);
      update(target, normalizeUploadedAssetUrl(upload.logoUrl));
      toast.success(target === "logoUrl" ? "Logo uploaded." : "Banner uploaded.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      if (target === "logoUrl") {
        setIsUploadingLogo(false);
        if (logoInputRef.current) logoInputRef.current.value = "";
      } else {
        setIsUploadingBanner(false);
        if (bannerInputRef.current) bannerInputRef.current.value = "";
      }
    }
  };

  const reset = () => {
    setStep(1);
    setSlugLocked(false);
    setIsSubmitting(false);
    setState(DEFAULT_WIZARD_STATE);
  };

  const close = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset();
    }
  };

  const selectedProgramIds = useMemo(() => {
    const bundleProgramIds = state.assignedBundleIds.flatMap((bundleId) => bundles.find((bundle) => bundle.id === bundleId)?.programIds ?? []);
    return [...new Set([...state.assignedProgramIds, ...bundleProgramIds])];
  }, [state.assignedBundleIds, state.assignedProgramIds, bundles]);

  const validateStep = () => {
    if (step === 1) {
      if (!state.name.trim() || !state.slug.trim() || !state.contactEmail.trim() || !state.ownerEmail.trim() || !state.supportEmail.trim()) {
        toast.error("Name, slug, and admin contact emails are required.");
        return false;
      }
    }

    if (step === 2) {
      const subdomain = subdomainify(state.slug);
      if (!subdomain) {
        toast.error("A valid organization slug is required.");
        return false;
      }
      if (RESERVED_PORTAL_SUBDOMAINS.has(subdomain)) {
        toast.error("This slug is reserved and cannot be used for a portal hostname.");
        return false;
      }
      if (!isSubdomainAvailable(subdomain)) {
        toast.error("Subdomain is already in use.");
        return false;
      }
      update("subdomain", subdomain);
    }

    if (step === 3) {
      if (selectedProgramIds.length === 0) {
        toast.error("Select at least one program or bundle.");
        return false;
      }
    }

    if (step === 4) {
      if (state.seatLimit <= 0) {
        toast.error("Seat limit must be greater than 0.");
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((prev) => (prev < 5 ? (prev + 1) as WizardStep : prev));
  };

  const previousStep = () => setStep((prev) => (prev > 1 ? (prev - 1) as WizardStep : prev));

  const submit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await onCreate({
        ...state,
        name: state.name.trim(),
        slug: state.slug.trim(),
        subdomain: subdomainify(state.slug),
        contactEmail: state.contactEmail.trim().toLowerCase(),
        ownerEmail: state.ownerEmail.trim().toLowerCase(),
        supportEmail: state.supportEmail.trim().toLowerCase(),
        phoneNumber: state.phoneNumber?.trim(),
        supportPhone: state.supportPhone?.trim(),
        billingPlan: state.billingPlan?.trim(),
        customDomain: state.customDomain?.trim(),
        portalTitle: state.portalTitle?.trim(),
        welcomeMessage: state.welcomeMessage?.trim(),
      });

      toast.success("Organization created.");
      onCreated?.(created);
      close(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Organization Name</Label>
            <Input
              value={state.name}
              onChange={(event) => {
                const name = event.target.value;
                update("name", name);
                if (!slugLocked) {
                  update("slug", slugify(name));
                }
              }}
              placeholder="MI Roundtable"
            />
          </div>

          <div className="space-y-2">
            <Label>Organization Slug</Label>
            <Input
              value={state.slug}
              onChange={(event) => {
                setSlugLocked(true);
                update("slug", slugify(event.target.value));
              }}
              placeholder="mi-roundtable"
            />
          </div>

          <div className="space-y-2">
            <Label>Industry Type</Label>
            <Input value={state.industryType} onChange={(event) => update("industryType", event.target.value)} placeholder="Nonprofit" />
          </div>

          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input value={state.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} placeholder="ops@organization.org" />
          </div>

          <div className="space-y-2">
            <Label>Owner Email</Label>
            <Input value={state.ownerEmail} onChange={(event) => update("ownerEmail", event.target.value)} placeholder="owner@organization.org" />
          </div>

          <div className="space-y-2">
            <Label>Support Email</Label>
            <Input value={state.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} placeholder="support@organization.org" />
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={state.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} placeholder="(313) 555-0100" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Internal Notes</Label>
            <Textarea rows={3} value={state.notes} onChange={(event) => update("notes", event.target.value)} />
          </div>
        </div>
      );
    }

    if (step === 2) {
      const normalizedSubdomain = subdomainify(state.slug);
      const available = normalizedSubdomain ? isSubdomainAvailable(normalizedSubdomain) : false;

      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Portal Subdomain</Label>
            <Input value={normalizedSubdomain} readOnly disabled placeholder="generated from slug" />
            <p className="text-xs text-muted-foreground">Portal URL: {getOrgPortalUrl(state.slug || "org-slug")}</p>
            <p className={cn("text-xs", available ? "text-emerald-300" : "text-amber-300")}>{normalizedSubdomain ? (available ? "Slug available" : "Slug already in use") : "Enter a slug"}</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Portal Title</Label>
            <Input value={state.portalTitle} onChange={(event) => update("portalTitle", event.target.value)} placeholder="MI Roundtable Portal" />
          </div>

          <div className="space-y-2">
            <Label>Logo URL</Label>
            <div className="flex gap-2">
              <Input value={state.logoUrl} onChange={(event) => update("logoUrl", event.target.value)} placeholder="https://cdn.../logo.png" />
              <Label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-input bg-secondary px-3 text-xs font-medium hover:bg-secondary/80">
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    void uploadAsset(event.target.files?.[0], "logoUrl");
                  }}
                />
              </Label>
            </div>
            {isUploadingLogo && <p className="text-xs text-muted-foreground">Uploading logo...</p>}
          </div>

          <div className="space-y-2">
            <Label>Favicon URL</Label>
            <Input value={state.faviconUrl} onChange={(event) => update("faviconUrl", event.target.value)} placeholder="https://cdn.../favicon.ico" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Banner URL</Label>
            <div className="flex gap-2">
              <Input value={state.bannerUrl} onChange={(event) => update("bannerUrl", event.target.value)} placeholder="https://cdn.../banner.jpg" />
              <Label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-input bg-secondary px-3 text-xs font-medium hover:bg-secondary/80">
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    void uploadAsset(event.target.files?.[0], "bannerUrl");
                  }}
                />
              </Label>
            </div>
            {isUploadingBanner && <p className="text-xs text-muted-foreground">Uploading banner...</p>}
          </div>

          <div className="space-y-2">
            <Label>Primary Color</Label>
            <Input type="color" value={state.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <Input type="color" value={state.secondaryColor || "#1d4ed8"} onChange={(event) => update("secondaryColor", event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>
            <Input type="color" value={state.accentColor} onChange={(event) => update("accentColor", event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Background Color</Label>
            <Input type="color" value={state.backgroundColor || "#0f172a"} onChange={(event) => update("backgroundColor", event.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Font Family</Label>
            <Select value={state.fontFamily || "Inter"} onValueChange={(value) => update("fontFamily", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Poppins">Poppins</SelectItem>
                <SelectItem value="Montserrat">Montserrat</SelectItem>
                <SelectItem value="Work Sans">Work Sans</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Bundles</p>
              {bundles.map((bundle) => (
                <label key={bundle.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{bundle.name}</p>
                    <p className="text-xs text-muted-foreground">{bundle.programIds.length} programs</p>
                  </div>
                  <Switch checked={state.assignedBundleIds.includes(bundle.id)} onCheckedChange={() => update("assignedBundleIds", toggleId(state.assignedBundleIds, bundle.id))} />
                </label>
              ))}
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Programs</p>
              {programs.map((program) => (
                <label key={program.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <span className="text-sm">{program.name}</span>
                  <Switch checked={state.assignedProgramIds.includes(program.id)} onCheckedChange={() => update("assignedProgramIds", toggleId(state.assignedProgramIds, program.id))} />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Enabled Modules</p>
            <div className="grid gap-2 md:grid-cols-2">
              {AVAILABLE_MODULES.map((moduleName) => (
                <label key={moduleName} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm capitalize">{moduleName}</span>
                  <Switch checked={state.enabledModules.includes(moduleName)} onCheckedChange={() => update("enabledModules", toggleId(state.enabledModules, moduleName))} />
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Plan Type</Label>
            <Select value={state.planType} onValueChange={(value) => update("planType", value as PlanType)}>
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
            <Select value={state.status} onValueChange={(value) => update("status", value as OrganizationStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Seat Limit</Label>
            <Input type="number" value={state.seatLimit} onChange={(event) => update("seatLimit", Number.parseInt(event.target.value, 10) || 0)} />
          </div>

          <div className="space-y-2">
            <Label>Trial Days</Label>
            <Input type="number" value={state.trialDays} disabled={state.status !== "trial"} onChange={(event) => update("trialDays", Number.parseInt(event.target.value, 10) || 0)} />
          </div>

          <div className="space-y-2">
            <Label>Support Phone</Label>
            <Input value={state.supportPhone} onChange={(event) => update("supportPhone", event.target.value)} placeholder="(313) 555-0100" />
          </div>

          <div className="space-y-2">
            <Label>Billing Plan Label</Label>
            <Input value={state.billingPlan} onChange={(event) => update("billingPlan", event.target.value)} placeholder="Growth Annual" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Custom Domain (optional)</Label>
            <Input value={state.customDomain} onChange={(event) => update("customDomain", event.target.value)} placeholder="portal.organization.org" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Welcome Message</Label>
            <Textarea rows={3} value={state.welcomeMessage} onChange={(event) => update("welcomeMessage", event.target.value)} placeholder="Welcome to your organizational workspace." />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Organization</p>
          <p className="mt-2 font-medium">{state.name}</p>
          <p className="text-xs text-muted-foreground">Portal URL: {getOrgPortalUrl(state.slug)}</p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Programs & Bundles</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.assignedBundleIds.map((bundleId) => {
              const bundle = bundles.find((entry) => entry.id === bundleId);
              return bundle ? <Badge key={bundle.id} variant="secondary">{bundle.name}</Badge> : null;
            })}
            {selectedProgramIds.map((programId) => {
              const program = programs.find((entry) => entry.id === programId);
              return program ? <Badge key={program.id} variant="outline">{program.name}</Badge> : null;
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Portal Configuration</p>
          <p className="mt-2">Title: {state.portalTitle || state.name}</p>
          <p className="text-xs text-muted-foreground">Support Email: {state.supportEmail}</p>
          <p className="text-xs text-muted-foreground">Support Phone: {state.supportPhone || "Not set"}</p>
          <p className="text-xs text-muted-foreground">Status: {state.status}</p>
          <p className="text-xs text-muted-foreground">Plan: {state.planType}</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Organization · Step {step} of 5</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((marker) => (
              <div key={marker} className={cn("h-1 rounded-full", step >= marker ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          {renderStep()}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={previousStep} disabled={step === 1 || isSubmitting}>Back</Button>
            {step < 5 ? (
              <Button onClick={nextStep} disabled={isSubmitting}>Next</Button>
            ) : (
              <Button onClick={() => void submit()} disabled={isSubmitting}>
                <Check className="h-4 w-4" />
                Confirm & Create
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
