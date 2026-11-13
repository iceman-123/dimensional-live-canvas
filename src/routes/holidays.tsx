import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/app/AppShell";
import { HOLIDAYS } from "@/lib/holidays";
import { formatMmDate, MM_MONTHS, toMyanmarDigits, weekdayOf } from "@/lib/time";

export const Route = createFileRoute("/holidays")({
  head: () => ({
    meta: [
      { title: "ပိတ်ရက် ပြက္ခဒိန် — ထိုင်းစတော့ ပိတ်ရက်များ | 2D3D Live" },
      { name: "description", content: "ထိုင်းစတော့ (SET) ပိတ်ရက်များ — စနေ၊ တနင်္ဂနွေနှင့် ဤရက်များတွင် 2D မထွက်ပါ" },
      { property: "og:title", content: "ပိတ်ရက် ပြက္ခဒိန် | 2D3D Live" },
      { property: "og:description", content: "2D မထွက်သော ထိုင်းစတော့ ပိတ်ရက်များ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HolidaysPage,
});

function HolidaysPage() {
  const groups = new Map<string, typeof HOLIDAYS>();
  for (const h of HOLIDAYS) {
    const k = h.date.slice(0, 7);
    groups.set(k, [...(groups.get(k) ?? []), h]);
  }

  return (
    <div>
      <PageHeader title="ပိတ်ရက် ပြက္ခဒိန်" subtitle="စနေ၊ တနင်္ဂနွေ နှင့် အောက်ပါရက်များတွင် 2D မထွက်ပါ" />
      <div className="space-y-5">
        {[...groups.entries()].map(([month, list]) => {
          const [y = "", m = "1"] = month.split("-");
          return (
            <section key={month}>
              <h2 className="mb-2 text-sm font-bold text-primary">
                {MM_MONTHS[Number(m) - 1]} {toMyanmarDigits(y)}
              </h2>
              <div className="space-y-2.5">
                {list.map((h) => (
                  <div key={h.date} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card-gradient p-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-date font-display text-lg font-bold text-primary">
                      {Number(h.date.slice(8))}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{h.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {weekdayOf(h.date)} · {formatMmDate(h.date, false)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
