import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Info } from "lucide-react";

import { PageHeader } from "@/components/app/AppShell";
import { Switch } from "@/components/ui/switch";
import { useSettings, type Settings } from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ဆက်တင် | 2D3D Live" },
      { name: "description", content: "အလိုအလျောက် ပြန်လည်ရယူခြင်း၊ အသံ၊ ဂဏန်းအရွယ်အစား စသည့် 2D3D Live ဆက်တင်များ" },
      { property: "og:title", content: "ဆက်တင် | 2D3D Live" },
      { property: "og:description", content: "2D3D Live ပြသမှု ဆက်တင်များ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const ROWS: { key: keyof Settings; label: string; hint?: string }[] = [
  { key: "autoRefresh", label: "အလိုအလျောက် ပြန်လည်ရယူမည်", hint: "Live အချိန်တွင် ၃ စက္ကန့်တိုင်း" },
  { key: "sound", label: "ဂဏန်းပြောင်းလျှင် အသံပေးမည်" },
  { key: "showExtraSlots", label: "11:00 / 3:00 ဂဏန်းများ ပြမည်" },
  { key: "bigNumbers", label: "Live ဂဏန်း အကြီးပြမည်" },
];

function SettingsPage() {
  const { settings, update } = useSettings();

  return (
    <div>
      <PageHeader title="ဆက်တင်" />

      <h2 className="mb-2 text-xs font-semibold text-muted-foreground">ပြသမှု</h2>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        {ROWS.map((r) => (
          <label
            key={r.key}
            className="flex cursor-pointer items-center justify-between gap-3 border-b border-border/40 px-4 py-3 last:border-0"
          >
            <span>
              <span className="block text-sm">{r.label}</span>
              {r.hint && <span className="block text-[11px] text-muted-foreground">{r.hint}</span>}
            </span>
            <Switch checked={settings[r.key]} onCheckedChange={(v) => update({ [r.key]: v })} />
          </label>
        ))}
      </div>

      <h2 className="mb-2 mt-5 text-xs font-semibold text-muted-foreground">အခြား</h2>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <Link to="/holidays" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm">ပိတ်ရက် ပြက္ခဒိန်</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <div className="mt-5 flex gap-3 rounded-2xl border border-border/60 bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          2D ဂဏန်းများကို ထိုင်းစတော့ SET Index နှင့် Value မှ တွက်ချက်ထားပြီး 3D ကို ထိုင်းအစိုးရထီ (GLO) ပထမဆုမှ
          ယူထားပါသည်။ ပညာပေးနှင့် ကိုယ်ပိုင်အသုံးအတွက်သာ ဖြစ်ပါသည်။
        </p>
      </div>
    </div>
  );
}
