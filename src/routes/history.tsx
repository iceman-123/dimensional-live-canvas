import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ErrorNote, PageHeader } from "@/components/app/AppShell";
import { extrasQuery } from "@/lib/extras";
import type { Slot } from "@/lib/lottery.functions";
import { historyQuery } from "@/lib/queries";
import { formatMmDate, formatSlot } from "@/lib/time";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "2D မှတ်တမ်း — ယခင်ရက်များ ထွက်ဂဏန်း | 2D3D Live" },
      {
        name: "description",
        content: "ယခင်ရက်များ၏ 12:01 နှင့် 4:30 2D ထွက်ဂဏန်း၊ SET နှင့် Value မှတ်တမ်း",
      },
      { property: "og:title", content: "2D မှတ်တမ်း | 2D3D Live" },
      { property: "og:description", content: "ယခင်ရက်များ၏ 2D ထွက်ဂဏန်းများ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(historyQuery),
  component: HistoryPage,
});

function HistoryPage() {
  const { data } = useSuspenseQuery(historyQuery);
  const { data: extras } = useQuery(extrasQuery(data.days.map((d) => d.date)));

  return (
    <div>
      <PageHeader title="2D မှတ်တမ်း" subtitle="ယခင်ရက်များ၏ ထွက်ဂဏန်း" />
      {data.error && <ErrorNote message={data.error} />}
      <div className="space-y-3">
        {data.days.map((day) => {
          const find = (t: string) => day.results.find((r) => r.time.startsWith(t)) ?? null;
          const main = [find("12:01"), find("16:30")].filter((s): s is Slot => !!s?.twod);
          const extra = [find("11:00"), find("15:00")].filter((s): s is Slot => !!s?.twod);
          const ex = extras?.[day.date];
          const hasMi = !!(
            ex &&
            (ex.modern_930 || ex.internet_930 || ex.modern_200 || ex.internet_200)
          );
          return (
            <article
              key={day.date}
              className="overflow-hidden rounded-3xl border border-border/60 bg-card-gradient"
            >
              <h2 className="border-b border-border/50 px-4 py-3 text-sm font-bold">
                {formatMmDate(day.date)}
              </h2>
              <div className={main.length > 1 ? "grid grid-cols-2 divide-x divide-border/50" : ""}>
                {main.map((s) => (
                  <div key={s.time} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-semibold text-muted-foreground">
                        {formatSlot(s.time)}
                      </span>
                      <span className="font-display text-3xl font-bold tabular text-gold-gradient">
                        {s.twod}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] tabular text-muted-foreground">
                      <span>{s.set}</span>
                      <span>{s.value}</span>
                    </div>
                  </div>
                ))}
                {main.length === 0 && (
                  <p className="px-4 py-3 text-xs text-muted-foreground">ထွက်ဂဏန်း မရှိသေးပါ</p>
                )}
              </div>
              {(extra.length > 0 || hasMi) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 bg-background/30 px-4 py-2 text-xs text-muted-foreground">
                  {extra.map((s) => (
                    <span key={s.time}>
                      {formatSlot(s.time)} <b className="font-display text-foreground">{s.twod}</b>
                    </span>
                  ))}
                  {hasMi && ex && (
                    <>
                      <span>
                        9:30 <b className="font-display text-primary">{ex.modern_930 || "--"}</b>/
                        <b className="font-display text-live">{ex.internet_930 || "--"}</b>
                      </span>
                      <span>
                        2:00 <b className="font-display text-primary">{ex.modern_200 || "--"}</b>/
                        <b className="font-display text-live">{ex.internet_200 || "--"}</b>
                      </span>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
