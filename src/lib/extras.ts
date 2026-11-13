import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GiftGroup = { title: string; numbers: string[] };
export type DailyExtras = {
  date: string;
  modern_930: string | null;
  internet_930: string | null;
  modern_200: string | null;
  internet_200: string | null;
  gift_groups: GiftGroup[];
};

export function parseGiftGroups(v: unknown): GiftGroup[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((g) => {
      const o = (g ?? {}) as { title?: unknown; numbers?: unknown };
      return {
        title: typeof o.title === "string" ? o.title.trim() : "",
        numbers: Array.isArray(o.numbers) ? o.numbers.map(String).map((s) => s.trim()).filter(Boolean) : [],
      };
    })
    .filter((g) => g.numbers.length > 0);
}

/** "12 34, 56" -> ["12","34","56"] */
export const splitNumbers = (s: string) => s.split(/[\s,၊]+/).map((x) => x.trim()).filter(Boolean);

export const siteSettingsQuery = queryOptions({
  queryKey: ["site-settings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("ticker_text, ticker_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
});

export const extrasQuery = (dates: string[]) =>
  queryOptions({
    queryKey: ["daily-extras", dates],
    enabled: dates.length > 0,
    queryFn: async (): Promise<Record<string, DailyExtras>> => {
      const { data, error } = await supabase.from("daily_extras").select("*").in("date", dates);
      if (error) throw error;
      const out: Record<string, DailyExtras> = {};
      for (const r of data ?? []) out[r.date] = { ...r, gift_groups: parseGiftGroups(r.gift_groups) };
      return out;
    },
    staleTime: 60_000,
  });
