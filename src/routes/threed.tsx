import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ErrorNote, PageHeader } from "@/components/app/AppShell";
import { threeDQuery } from "@/lib/queries";
import { formatMmDate, toMyanmarDigits, MM_MONTHS } from "@/lib/time";

export const Route = createFileRoute("/threed")({
  head: () => ({
    meta: [
      { title: "3D ထွက်ဂဏန်း — ထိုင်းအစိုးရထီ ရလဒ် | 2D3D Live" },
      { name: "description", content: "ထိုင်းအစိုးရထီ ပထမဆု နောက်ဆုံး ၃ လုံး 3D ထွက်ဂဏန်းနှင့် ယခင်မှတ်တမ်းများ" },
      { property: "og:title", content: "3D ထွက်ဂဏန်း | 2D3D Live" },
      { property: "og:description", content: "ထိုင်းအစိုးရထီ 3D ရလဒ်များ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(threeDQuery),
  component: ThreeDPage,
});

const shortDate = (key: string) => {
  const [y = 0, m = 0, d = 0] = key.split("-").map(Number);
  return `${toMyanmarDigits(d)} ${MM_MONTHS[m - 1]} ${toMyanmarDigits(y)}`;
};

function ThreeDPage() {
  const { data } = useSuspenseQuery(threeDQuery);
  const [latest, ...rest] = data.results;

  return (
    <div>
      <PageHeader title="3D ထွက်ဂဏန်း" subtitle="ထိုင်းအစိုးရထီ ပထမဆု နောက်ဆုံး ၃ လုံး" />
      {data.error && !latest && <ErrorNote message={data.error} />}

      {latest && (
        <section className="rounded-3xl border border-primary/25 bg-hero px-5 pb-5 pt-5 text-center shadow-glow">
          <p className="text-xs text-foreground/80">နောက်ဆုံးထွက် · {formatMmDate(latest.date)}</p>
          <p className="py-3 font-display text-[7.5rem] font-bold leading-none tabular text-gold-gradient glow-gold">
            {latest.threeD}
          </p>
          <p className="font-display text-sm tracking-[0.35em] text-foreground/80 tabular">{latest.first}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Mini label="ရှေ့ ၃ လုံး" value={latest.front3.join(" · ")} />
            <Mini label="နောက် ၃ လုံး" value={latest.back3.join(" · ")} />
            <Mini label="နောက် ၂ လုံး" value={latest.last2} />
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-border/60 bg-card">
          <div className="grid grid-cols-[1fr_auto_4rem] gap-3 border-b border-border/60 bg-secondary/60 px-4 py-2 text-xs text-muted-foreground">
            <span>ရက်စွဲ</span>
            <span>ပထမဆု</span>
            <span className="text-right">3D</span>
          </div>
          {rest.map((r) => (
            <div
              key={r.date}
              className="grid grid-cols-[1fr_auto_4rem] items-center gap-3 border-b border-border/40 px-4 py-3.5 last:border-0"
            >
              <span className="text-sm">{shortDate(r.date)}</span>
              <span className="font-display text-sm tabular tracking-wider text-muted-foreground">{r.first}</span>
              <span className="text-right font-display text-2xl font-bold tabular text-primary">{r.threeD}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/35 px-2 py-2">
      <p className="text-[11px] text-foreground/60">{label}</p>
      <p className="font-display text-sm font-semibold tabular">{value || "--"}</p>
    </div>
  );
}
