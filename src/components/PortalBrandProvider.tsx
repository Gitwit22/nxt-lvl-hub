import React, { createContext, useContext, useEffect, useRef } from "react";
import type { Organization } from "@/types/orgPortal";
import { DEFAULT_BRANDING } from "@/types/orgPortal";

interface PortalBrandContextType {
  organization: Organization | null;
}

const PortalBrandContext = createContext<PortalBrandContextType>({ organization: null });

export function usePortalBrand() {
  return useContext(PortalBrandContext);
}

function hslToHex(hsl: string): string {
  // Accepts "H S% L%" or "H SL" formats
  const parts = hsl.trim().split(/[\s,]+/);
  if (parts.length < 3) return hsl;
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function resolveColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  // If it looks like HSL without the hsl() wrapper, convert it
  if (/^\d+\s+\d/.test(value)) return hslToHex(value);
  return value;
}

interface Props {
  organization: Organization | null;
  children: React.ReactNode;
}

export function PortalBrandProvider({ organization, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const b = organization?.branding ?? DEFAULT_BRANDING;

    el.style.setProperty("--primary-color", resolveColor(b.primaryColor, "#3b82f6"));
    el.style.setProperty("--secondary-color", resolveColor(b.secondaryColor, "#1d4ed8"));
    el.style.setProperty("--accent-color", resolveColor(b.accentColor, "#06b6d4"));
    el.style.setProperty("--background-color", resolveColor(b.backgroundColor, "#0f172a"));
    el.style.setProperty("--font-family", b.fontFamily ?? DEFAULT_BRANDING.fontFamily);
    el.style.setProperty(
      "--portal-gradient",
      `linear-gradient(${b.gradientAngle ?? 135}deg, ${resolveColor(b.backgroundStartColor, "#0f172a")}, ${resolveColor(b.backgroundEndColor, "#1d4ed8")})`,
    );

    // Apply font family to the portal container
    el.style.fontFamily = `var(--font-family, inter), system-ui, sans-serif`;
  }, [organization]);

  return (
    <PortalBrandContext.Provider value={{ organization }}>
      <div ref={containerRef} className="portal-brand-root" style={{ display: "contents" }}>
        {children}
      </div>
    </PortalBrandContext.Provider>
  );
}
