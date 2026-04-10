import type { AppCatalogEntry } from "@/lib/appCatalog";
import { AppCard } from "@/components/public/AppCard";

export function AppGrid({ apps }: { apps: AppCatalogEntry[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => (
        <AppCard key={app.id} app={app} />
      ))}
    </div>
  );
}