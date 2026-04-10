import type { LucideIcon } from "lucide-react";
import {
  Clock3,
  Globe,
  Handshake,
  Layers3,
  Newspaper,
  Route,
} from "lucide-react";
import type { AppCatalogEntry } from "@/lib/appCatalog";

const appIconMap: Record<string, LucideIcon> = {
  "community-chronicle": Newspaper,
  "timeflow": Clock3,
  "support-hub": Handshake,
  "horizon": Globe,
  "mejay": Layers3,
  "streamline": Route,
};

function resolveIcon(app: AppCatalogEntry) {
  return appIconMap[app.slug] || Layers3;
}

export function AppIdentityMark({ app, className = "h-14 w-14" }: { app: AppCatalogEntry; className?: string }) {
  const Icon = resolveIcon(app);

  if (app.logoUrl) {
    return (
      <img
        src={app.logoUrl}
        alt={`${app.name} logo`}
        className={`${className} rounded-2xl border border-white/10 bg-white/5 object-cover`}
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-100`}>
      <Icon className="h-6 w-6" />
    </div>
  );
}