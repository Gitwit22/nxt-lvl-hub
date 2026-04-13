import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, uploadLogoFile } from "@/lib/api";
import type { Organization } from "@/types/orgPortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function gradientCss(start: string, end: string, angle = 135) {
  return `linear-gradient(${Math.max(0, Math.min(angle, 360))}deg, ${start}, ${end})`;
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

interface OrganizationBrandingSettingsProps {
  org: Organization;
  onSave: (updates: Partial<Organization>) => Promise<void>;
}

export function OrganizationBrandingSettings({ org, onSave }: OrganizationBrandingSettingsProps) {
  const [logoUrl, setLogoUrl] = useState(org.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(org.bannerUrl || "");
  const [faviconUrl, setFaviconUrl] = useState(org.faviconUrl || "");
  const [portalTitle, setPortalTitle] = useState(org.portalTitle || "");
  const [welcomeMessage, setWelcomeMessage] = useState(org.welcomeMessage || "");
  const [supportPhone, setSupportPhone] = useState(org.supportPhone || "");
  const [fontFamily, setFontFamily] = useState(org.branding.fontFamily || "Inter");
  const [primaryColor, setPrimaryColor] = useState(parseLegacyHslToHex(org.branding.primaryColor, "#2563eb"));
  const [secondaryColor, setSecondaryColor] = useState(parseLegacyHslToHex(org.branding.secondaryColor, "#1d4ed8"));
  const [accentColor, setAccentColor] = useState(parseLegacyHslToHex(org.branding.accentColor, "#0ea5e9"));
  const [backgroundColor, setBackgroundColor] = useState(parseLegacyHslToHex(org.branding.backgroundColor, "#0f172a"));
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

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

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const upload = await uploadLogoFile(file);
      setLogoUrl(normalizeUploadedAssetUrl(upload.logoUrl));
      toast.success("Logo uploaded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploadingBanner(true);
    try {
      const upload = await uploadLogoFile(file);
      setBannerUrl(normalizeUploadedAssetUrl(upload.logoUrl));
      toast.success("Banner uploaded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const save = async () => {
    try {
      await onSave({
        logoUrl,
        bannerUrl,
        faviconUrl,
        portalTitle,
        welcomeMessage,
        supportPhone,
        branding: {
          ...org.branding,
          primaryColor,
          secondaryColor,
          accentColor,
          backgroundColor,
          fontFamily,
        },
      });
      toast.success("Branding updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Portal Title</Label>
          <Input value={portalTitle} onChange={(event) => setPortalTitle(event.target.value)} placeholder={org.name} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Welcome Message</Label>
          <Textarea rows={3} value={welcomeMessage} onChange={(event) => setWelcomeMessage(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Logo URL</Label>
          <div className="flex gap-2">
            <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
            <Label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-input bg-secondary px-3 text-xs font-medium hover:bg-secondary/80">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleLogoUpload(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </Label>
          </div>
          {isUploadingLogo && <p className="text-xs text-muted-foreground">Uploading logo...</p>}
        </div>

        <div className="space-y-2">
          <Label>Banner URL</Label>
          <div className="flex gap-2">
            <Input value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} />
            <Label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-input bg-secondary px-3 text-xs font-medium hover:bg-secondary/80">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleBannerUpload(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </Label>
          </div>
          {isUploadingBanner && <p className="text-xs text-muted-foreground">Uploading banner...</p>}
        </div>

        <div className="space-y-2">
          <Label>Favicon URL</Label>
          <Input value={faviconUrl} onChange={(event) => setFaviconUrl(event.target.value)} placeholder="https://cdn.../favicon.ico" />
        </div>

        <div className="space-y-2">
          <Label>Support Phone</Label>
          <Input value={supportPhone} onChange={(event) => setSupportPhone(event.target.value)} placeholder="(313) 555-0100" />
        </div>

        <div className="space-y-2">
          <Label>Portal Font</Label>
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter">Inter</SelectItem>
              <SelectItem value="Poppins">Poppins</SelectItem>
              <SelectItem value="Montserrat">Montserrat</SelectItem>
              <SelectItem value="Work Sans">Work Sans</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Primary Color</Label>
          <Input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Secondary Color</Label>
          <Input type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Accent Color</Label>
          <Input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Background Color</Label>
          <Input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-4" style={{ background: gradientCss(backgroundColor, primaryColor, 140) }}>
        <div
          className="rounded-lg border border-white/20 bg-black/20 px-4 py-6 text-white"
          style={{
            fontFamily,
            backgroundImage: bannerUrl ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${bannerUrl})` : undefined,
            backgroundSize: bannerUrl ? "cover" : undefined,
            backgroundPosition: bannerUrl ? "center" : undefined,
          }}
        >
          <p className="text-sm font-semibold">{portalTitle || org.name}</p>
          <p className="text-xs text-white/80">{welcomeMessage || "Welcome to your organization workspace."}</p>
          <div className="mt-3 h-8 w-8 rounded-md" style={{ background: gradientCss(primaryColor, accentColor) }} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void save()}>Save Branding</Button>
      </div>
    </div>
  );
}
