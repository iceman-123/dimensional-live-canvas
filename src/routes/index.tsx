import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Gift, Moon, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SectionTitle } from "@/components/app/AppShell";
import { giftNumbers } from "@/lib/gift";
import { holidayOn, upcomingHolidays } from "@/lib/holidays";
import type { Slot } from "@/lib/lottery.functions";
import { liveQuery } from "@/lib/queries";
import { useSettings } from "@/lib/settings";
import { formatClock, formatMmDate, formatSlot, getSession, isLiveSession, mmtDateKey, type Session } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "2D Live — ယနေ့ တိုက်ရိုက် 2D ဂဏန်း | 2D3D Live" },
      { name: "description", content: "SET နှင့် Value မှ တိုက်ရိုက် 2D ဂဏန်း၊ 12:01 နှင့် 4:30 ထွက်ဂဏန်း၊ Modern / Internet နှင့် လက်ဆောင်ဂဏန်း" },
      { property: "og:title", content: "2D Live — ယနေ့ တိုက်ရိုက် 2D ဂဏန်း" },
      { property: "og:description", content: "SET / Value တိုက်ရိုက်၊ 12:01 နှင့် 4:30 ထွက်ဂဏန်း" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(liveQuery),
  component: LivePage,
});

const SESSION_LABEL: Record<Session, string> = {
  "closed-day": "ယနေ့ ဈေးပိတ်ရက်",
  pre: "မနက် 9:30 တွင် စတင်မည်",
  morning: "မနက်ပိုင်း တိုက်ရိုက်",
  break: "ညနေ 2:00 တွင် ပြန်စမည်",
  evening: "ညနေပိုင်း တိုက်ရိုက်",
  done: "ယနေ့အတွက် ပြီးဆုံးပါပြီ",
};

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    /* audio not available */
  }
}

function LivePage() {
  const { settings } = useSettings();
  const now = useNow();
  const today = now ? mmtDateKey(now) : null;
  const localHoliday = today ? holidayOn(today) : null;
  const initial = useSuspenseQuery(liveQuery).data;
  const isHoliday = !!(initial.data?.holiday.isHoliday || localHoliday);
  const session = now ? getSession(now, isHoliday) : "pre";
  const live = isLiveSession(session);

  const { data: resp, isFetching, refetch } = useQuery({
    ...liveQuery,
    refetchInterval: settings.autoRefresh ? (live ? 3000 : 60_000) : false,
  });
  const data = resp?.data ?? null;

  const slot = (t: string): Slot | null => data?.results.find((r) => r.time.startsWith(t)) ?? null;
  const isToday = data?.resultDate === today;
  const lastResult = [...(data?.results ?? [])].reverse().find((r) => r.twod)?.twod ?? null;
  const bigNumber = live && data?.live.twod ? data.live.twod : isToday ? lastResult : live ? null : lastResult;
  const refSlot = slot("16:30")?.twod ? slot("16:30") : slot("12:01");
  const setValue = live ? data?.live.set : refSlot?.set;
  const valueValue = live ? data?.live.value : refSlot?.value;

  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (!bigNumber) return;
    if (prev.current && prev.current !== bigNumber && settings.sound) beep();
    prev.current = bigNumber;
  }, [bigNumber, settings.sound]);

  const gifts = useMemo(() => {
    if (!today) return null;
    const done = (data?.results ?? []).map((r) => r.twod).filter((v): v is string => !!v).reverse();
    return giftNumbers(today, done);
  }, [today, data]);
  const nextHoliday = today ? upcomingHolidays(today, 1)[0] : undefined;

  return (
    <div className="pt-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-hero font-display text-sm font-bold text-primary shadow-glow">
            2D
          </div>
          <div>
            <p className="font-display text-base font-bold leading-none tracking-wide">
              2D3D <span className="text-primary">Live</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{today ? formatMmDate(today) : "\u00a0"}</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-primary"
          aria-label="ပြန်လည်ရယူမည်"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-hero px-5 pb-5 pt-4 shadow-glow">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              live ? "bg-live/15 text-live" : "bg-background/30 text-foreground/80",
            )}
          >
            <span className="relative flex h-2 w-2">
              {live && <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-live" />}
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", live ? "bg-live" : "bg-muted-foreground")} />
            </span>
            {SESSION_LABEL[session]}
          </span>
          <span className="font-display text-xs tabular text-foreground/70">{now ? formatClock(now) : ""}</span>
        </div>

        <div className="flex flex-col items-center py-4">
          <span
            className={cn(
              "font-display font-bold leading-none tabular text-gold-gradient glow-gold",
              settings.bigNumbers ? "text-[10rem]" : "text-[8.5rem]",
              live && data?.live.twod && "animate-live-blink",
            )}
          >
            {bigNumber ?? "--"}
          </span>
          {!live && !isToday && data?.resultDate && (
            <span className="mt-1 text-xs text-foreground/70">နောက်ဆုံးထွက် · {formatMmDate(data.resultDate)}</span>
          )}
          {live && data?.live.time && <span className="mt-1 text-xs text-foreground/70">Updated · {data.live.time}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="SET" value={setValue} />
          <Stat label="Value" value={valueValue} />
        </div>
        {resp?.error && <p className="mt-3 text-center text-xs text-destructive">{resp.error}</p>}
      </section>

      {isHoliday && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <Moon className="h-4 w-4 shrink-0 text-destructive" />
          <span>ယနေ့ ပိတ်ရက် — {localHoliday?.name ?? data?.holiday.name ?? "ထိုင်းစတော့ ပိတ်ရက်"}</span>
        </div>
      )}

      <section className="mt-5">
        <SectionTitle title="ထွက်ဂဏန်းများ" note={data?.resultDate ? formatMmDate(data.resultDate, false) : undefined} />
        <div className="grid grid-cols-2 gap-2.5">
          {["12:01", "16:30"].map((t) => (
            <ResultTile key={t} label={formatSlot(t)} slot={slot(t)} highlight />
          ))}
        </div>
        {settings.showExtraSlots && (
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {["11:00", "15:00"].map((t) => (
              <ResultTile key={t} label={formatSlot(t)} slot={slot(t)} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-5">
        <SectionTitle title="Modern / Internet" />
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="grid grid-cols-3 border-b border-border/60 bg-secondary/60 px-4 py-2 text-xs text-muted-foreground">
            <span>အချိန်</span>
            <span className="text-center">Modern</span>
            <span className="text-center">Internet</span>
          </div>
          {["9:30 AM", "2:00 PM"].map((t) => (
            <div key={t} className="grid grid-cols-3 items-center border-b border-border/40 px-4 py-3 last:border-0">
              <span className="font-display text-sm font-semibold">{t}</span>
              <span className="text-center font-display text-2xl font-bold tabular text-primary">--</span>
              <span className="text-center font-display text-2xl font-bold tabular text-live">--</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <SectionTitle title="ယနေ့ လက်ဆောင်ဂဏန်း" icon={<Gift className="h-4 w-4 text-primary" />} />
        <div className="rounded-2xl border border-border/60 bg-card-gradient p-4">
          <div className="grid grid-cols-6 gap-2">
            {(gifts?.numbers ?? Array.from({ length: 6 }, () => "--")).map((n, i) => (
              <div
                key={`${n}-${i}`}
                className="flex aspect-square items-center justify-center rounded-full border border-primary/40 bg-crimson/30 font-display text-lg font-bold tabular text-primary"
              >
                {n}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            ပါဝါ <span className="font-display font-semibold text-primary">{gifts?.power.join(" · ") ?? "-"}</span> · ဖျော်ဖြေရန်သာ
          </p>
        </div>
      </section>

      <Link
        to="/holidays"
        className="mt-5 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 transition-colors hover:border-primary/40"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-crimson/30 text-primary">
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">ပိတ်ရက် ပြက္ခဒိန်</span>
          {nextHoliday && (
            <span className="block text-[11px] text-muted-foreground">
              နောက်ပိတ်ရက် · {formatMmDate(nextHoliday.date, false)} {nextHoliday.name}
            </span>
          )}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
        ဒေတာများကို ထိုင်းစတော့ (SET) မှ အခမဲ့ရင်းမြစ်များမှ ရယူထားခြင်းဖြစ်ပြီး ပညာပေး/ကိုယ်ပိုင်အသုံးအတွက်သာ ဖြစ်ပါသည်။
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div className="rounded-2xl bg-background/35 px-3 py-2 text-center">
      <p className="text-[11px] text-foreground/60">{label}</p>
      <p className="font-display text-lg font-semibold tabular">{value ?? "--"}</p>
    </div>
  );
}

function ResultTile({ label, slot, highlight = false }: { label: string; slot: Slot | null; highlight?: boolean }) {
  const value = slot?.twod ?? null;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center",
        highlight ? "border-primary/40 bg-card-gradient shadow-glow" : "border-border/60 bg-card",
      )}
    >
      <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-display tabular font-bold leading-none",
          highlight ? "mt-1.5 text-4xl text-gold-gradient" : "mt-1 text-2xl text-foreground",
          !value && "text-muted-foreground",
        )}
      >
        {value ?? "--"}
      </span>
      {slot?.set && (
        <span className="mt-1.5 text-[10px] tabular text-muted-foreground">
          {slot.set} · {slot.value}
        </span>
      )}
    </div>
  );
}
