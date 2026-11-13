import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GoogleButton } from "@/components/app/GoogleButton";
import { PageHeader } from "@/components/app/AppShell";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { parseGiftGroups, splitNumbers } from "@/lib/extras";
import { mmtDateKey } from "@/lib/time";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin | 2D3D Live" },
      {
        name: "description",
        content: "9:30 / 2:00 Modern Internet၊ လက်ဆောင်ဂဏန်းနှင့် ကြေညာချက် စီမံရန်",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin | 2D3D Live" },
      { property: "og:description", content: "2D3D Live စီမံခန့်ခွဲမှု" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const input =
  "h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60";
const saveBtn =
  "h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50";

function AdminPage() {
  const { ready, userId, isAdmin, email } = useAuth();

  if (!ready) return <PageHeader title="Admin" />;
  if (!userId)
    return (
      <div>
        <PageHeader title="Admin" subtitle="Admin အကောင့်ဖြင့် ဝင်ပါ" />
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <GoogleButton label="Google ဖြင့် ဝင်မည်" />
        </div>
      </div>
    );
  if (!isAdmin)
    return (
      <div>
        <PageHeader title="Admin" />
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {email} သည် admin မဟုတ်ပါ။
        </p>
      </div>
    );

  return (
    <div className="space-y-5">
      <PageHeader title="Admin" subtitle="9:30 / 2:00 နှင့် လက်ဆောင်ဂဏန်း" />
      <ExtrasForm />
      <TickerForm />
    </div>
  );
}

type GroupDraft = { title: string; numbers: string };

function ExtrasForm() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => mmtDateKey());
  const [vals, setVals] = useState({
    modern_930: "",
    internet_930: "",
    modern_200: "",
    internet_200: "",
  });
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from("daily_extras")
      .select("*")
      .eq("date", date)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setVals({
          modern_930: data?.modern_930 ?? "",
          internet_930: data?.internet_930 ?? "",
          modern_200: data?.modern_200 ?? "",
          internet_200: data?.internet_200 ?? "",
        });
        setGroups(
          parseGiftGroups(data?.gift_groups).map((g) => ({
            title: g.title,
            numbers: g.numbers.join(" "),
          })),
        );
      });
    return () => {
      alive = false;
    };
  }, [date]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = (s: string) => s.trim().slice(0, 4) || null;
    const gift_groups = groups
      .map((g) => ({
        title: g.title.trim().slice(0, 40),
        numbers: splitNumbers(g.numbers).slice(0, 20),
      }))
      .filter((g) => g.numbers.length > 0);
    setSaving(true);
    const { error } = await supabase.from("daily_extras").upsert({
      date,
      modern_930: clean(vals.modern_930),
      internet_930: clean(vals.internet_930),
      modern_200: clean(vals.modern_200),
      internet_200: clean(vals.internet_200),
      gift_groups,
    });
    setSaving(false);
    if (error) {
      toast.error("သိမ်းမရပါ");
      return;
    }
    toast.success("သိမ်းပြီးပါပြီ");
    void queryClient.invalidateQueries({ queryKey: ["daily-extras"] });
  };

  const field = (key: keyof typeof vals, label: string) => (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      <input
        className={`${input} text-center font-display text-lg font-bold tabular`}
        inputMode="numeric"
        maxLength={4}
        placeholder="--"
        value={vals[key]}
        onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-border/60 bg-card p-4">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold">ရက်စွဲ</span>
        <input
          type="date"
          className={input}
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
      </label>

      <div>
        <p className="mb-2 text-xs font-semibold">Modern / Internet</p>
        <div className="grid grid-cols-2 gap-2">
          {field("modern_930", "9:30 Modern")}
          {field("internet_930", "9:30 Internet")}
          {field("modern_200", "2:00 Modern")}
          {field("internet_200", "2:00 Internet")}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold">လက်ဆောင်ဂဏန်း အမျိုးအစားများ</p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          အမျိုးအစား မထည့်ပါက app မှ အလိုအလျောက် ထုတ်ပေးပါမည်။
        </p>
        <div className="space-y-2">
          {groups.map((g, i) => (
            <div
              key={i}
              className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3"
            >
              <div className="flex gap-2">
                <input
                  className={input}
                  placeholder="အမျိုးအစား အမည် (ဥပမာ ထိပ်စီး)"
                  maxLength={40}
                  value={g.title}
                  onChange={(e) =>
                    setGroups((gs) =>
                      gs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setGroups((gs) => gs.filter((_, j) => j !== i))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-destructive"
                  aria-label="ဖျက်မည်"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                className={`${input} font-display tabular`}
                placeholder="12 34 56 78  (space ခြားပြီး ထည့်ပါ)"
                value={g.numbers}
                onChange={(e) =>
                  setGroups((gs) =>
                    gs.map((x, j) => (j === i ? { ...x, numbers: e.target.value } : x)),
                  )
                }
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setGroups((gs) => [...gs, { title: "", numbers: "" }])}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> အမျိုးအစား ထည့်မည်
          </button>
        </div>
      </div>

      <button type="submit" disabled={saving} className={`${saveBtn} w-full`}>
        {saving ? "သိမ်းနေသည်..." : "သိမ်းမည်"}
      </button>
    </form>
  );
}

function TickerForm() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("ticker_text, ticker_enabled")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setText(data?.ticker_text ?? "");
        setEnabled(data?.ticker_enabled ?? true);
      });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ ticker_text: text.trim().slice(0, 300), ticker_enabled: enabled })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error("သိမ်းမရပါ");
      return;
    }
    toast.success("သိမ်းပြီးပါပြီ");
    void queryClient.invalidateQueries({ queryKey: ["site-settings"] });
  };

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> အပေါ်ဆုံး ကြေညာချက်
        </p>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="ကြေညာချက် ပြမည်" />
      </div>
      <textarea
        className={`${input} h-24 resize-none py-2`}
        maxLength={300}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ကြေညာချက် စာသား"
      />
      <button type="submit" disabled={saving} className={`${saveBtn} w-full`}>
        {saving ? "သိမ်းနေသည်..." : "သိမ်းမည်"}
      </button>
    </form>
  );
}
