import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Megaphone, MessagesSquare, Radio, Settings, Ticket } from "lucide-react";
import type { ReactNode } from "react";
import { siteSettingsQuery } from "@/lib/extras";
import { cn } from "@/lib/utils";

const DEFAULT_MARQUEE = "2D3D ထွက်ဂဏန်းများကို အချိန်နဲ့တပြေးညီ ကြည့်ရှုနိုင်ပါပြီ";

const NAV = [
  { to: "/", label: "Live", icon: Radio },
  { to: "/history", label: "2D မှတ်တမ်း", icon: History },
  { to: "/threed", label: "3D", icon: Ticket },
  { to: "/chat", label: "ချက်တင်", icon: MessagesSquare },
  { to: "/settings", label: "ဆက်တင်", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: site } = useQuery(siteSettingsQuery);
  const MARQUEE = site?.ticker_text?.trim() || DEFAULT_MARQUEE;
  const showTicker = site?.ticker_enabled ?? true;
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        {showTicker && (
          <div className="sticky top-0 z-30 flex items-center gap-2 overflow-hidden border-b border-crimson/40 bg-surface/95 px-3 py-1.5 backdrop-blur">
            <Megaphone className="h-4 w-4 shrink-0 text-primary" />
            <div className="relative flex-1 overflow-hidden">
              <div className="animate-marquee flex w-max whitespace-nowrap text-xs text-foreground/90">
                <span className="pr-16">{MARQUEE}</span>
                <span className="pr-16" aria-hidden>
                  {MARQUEE}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="px-4 pb-28">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-surface/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group flex flex-col items-center gap-1 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
                      isActive && "bg-primary/15",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="leading-none">{label}</span>
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <header className="-mx-4 mb-4 flex items-start justify-between gap-3 border-b border-border/50 px-4 pb-3 pt-3">
      <div>
        <h1 className="text-lg font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({
  title,
  note,
  icon,
}: {
  title: string;
  note?: string | undefined;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-end justify-between">
      <h2 className="flex items-center gap-1.5 text-sm font-bold">
        {icon}
        {title}
      </h2>
      {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-xs text-destructive">
      {message}
    </p>
  );
}
