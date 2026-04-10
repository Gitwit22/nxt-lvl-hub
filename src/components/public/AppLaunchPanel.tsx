import { ExternalLink, LockKeyhole, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getLaunchBehavior, type AppCatalogEntry } from "@/lib/appCatalog";
import { useAuth } from "@/context/AuthContext";

function isExternalDestination(destination: string) {
  return /^https?:\/\//i.test(destination) || destination.startsWith("mailto:");
}

export function AppLaunchPanel({ app }: { app: AppCatalogEntry }) {
  const navigate = useNavigate();
  const { me } = useAuth();
  const behavior = getLaunchBehavior(app, me);

  const handleLaunch = () => {
    if (!behavior.canLaunch || !behavior.destination) {
      return;
    }

    if (behavior.requiresAuth) {
      navigate(behavior.destination);
      return;
    }

    if (behavior.openInNewTab) {
      window.open(behavior.destination, "_blank", "noopener,noreferrer");
      return;
    }

    if (isExternalDestination(behavior.destination)) {
      window.location.assign(behavior.destination);
      return;
    }

    navigate(behavior.destination);
  };

  const icon = app.visibilityStatus === "coming_soon"
    ? <Rocket className="h-4 w-4" />
    : app.accessType === "external"
      ? <ExternalLink className="h-4 w-4" />
      : <LockKeyhole className="h-4 w-4" />;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6 shadow-[0_16px_50px_rgba(8,15,30,0.3)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-sky-100/70">Access / Launch</p>
          <h2 className="text-2xl font-semibold text-white">{app.accessType === "internal" ? "Suite-aware launch flow" : "Direct launch flow"}</h2>
          <p className="max-w-2xl text-base leading-8 text-slate-300">{behavior.helperText}</p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            {app.visibilityStatus === "coming_soon"
              ? "This app is listed publicly so visitors can see what is coming, but the launch control remains disabled until release."
              : app.accessType === "internal"
                ? "Internal apps respect Suite authentication. Logged-out users are sent to sign in before the Suite forwards them into the app workspace."
                : "External apps launch directly to their own URL and handle any downstream authentication in that destination."}
          </div>
        </div>

        <div className="w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-medium text-white">Launch Status</p>
          <p className="mt-2 text-sm leading-7 text-slate-400">{behavior.buttonText}</p>

          <Button className="mt-5 w-full" size="lg" onClick={handleLaunch} disabled={!behavior.canLaunch}>
            {icon}
            {behavior.buttonText}
          </Button>

          <p className="mt-4 text-xs leading-6 text-slate-500">
            Target: {behavior.destination || "Unavailable until release"}
          </p>
        </div>
      </div>
    </section>
  );
}