import { createServerFn } from "@tanstack/react-start";

export type Slot = { time: string; set: string | null; value: string | null; twod: string | null };
export type LiveData = {
  live: { set: string | null; value: string | null; twod: string | null; time: string | null };
  results: Slot[];
  resultDate: string | null;
  holiday: { isHoliday: boolean; name: string | null };
};
export type DayResult = { date: string; results: Slot[] };
export type ThreeDResult = {
  date: string;
  first: string;
  threeD: string;
  front3: string[];
  back3: string[];
  last2: string;
};

const clean = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" || s === "--" || s === "NULL" ? null : s;
};

const HEADERS = { accept: "application/json", "user-agent": "Mozilla/5.0 (2D3D Live)" };

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

const SERVICE_ERROR = "ဒေတာ ယူ၍မရပါ။ ခဏနေ ပြန်ကြိုးစားပါ။";

export const getLive = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ data: LiveData | null; error: string | null }> => {
    try {
      type Raw = {
        live?: { set?: string; value?: string; time?: string; twod?: string; date?: string };
        result?: { set?: string; value?: string; open_time?: string; twod?: string; stock_date?: string }[];
        holiday?: { status?: string; name?: string };
      };
      const raw = await getJson<Raw>("https://api.thaistock2d.com/live");
      const results: Slot[] = (raw.result ?? []).map((r) => ({
        time: (r.open_time ?? "").slice(0, 5),
        set: clean(r.set),
        value: clean(r.value),
        twod: clean(r.twod),
      }));
      const holidayName = clean(raw.holiday?.name);
      return {
        data: {
          live: {
            set: clean(raw.live?.set),
            value: clean(raw.live?.value),
            twod: clean(raw.live?.twod),
            time: clean(raw.live?.time),
          },
          results,
          resultDate: clean(raw.result?.[0]?.stock_date) ?? clean(raw.live?.date),
          holiday: { isHoliday: raw.holiday?.status === "1" && !!holidayName, name: holidayName },
        },
        error: null,
      };
    } catch (e) {
      console.error("getLive failed", e);
      return { data: null, error: SERVICE_ERROR };
    }
  },
);

export const get2DHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ days: DayResult[]; error: string | null }> => {
    try {
      type Raw = { date: string; child?: { time?: string; set?: string; value?: string; twod?: string }[] }[];
      const raw = await getJson<Raw>("https://api.thaistock2d.com/2d_result");
      const days = raw.map((d) => ({
        date: d.date,
        results: (d.child ?? []).map((c) => ({
          time: (c.time ?? "").slice(0, 5),
          set: clean(c.set),
          value: clean(c.value),
          twod: clean(c.twod),
        })),
      }));
      return { days, error: null };
    } catch (e) {
      console.error("get2DHistory failed", e);
      return { days: [], error: SERVICE_ERROR };
    }
  },
);

type GloNumbers = { number?: { round?: number; value?: string }[] };
type GloData = { first?: GloNumbers; last3f?: GloNumbers; last3b?: GloNumbers; last2?: GloNumbers };

const GLO = "https://www.glo.or.th/api/lottery";
const post = <T,>(path: string, body: unknown) =>
  getJson<T>(`${GLO}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const vals = (n?: GloNumbers) =>
  [...(n?.number ?? [])].sort((a, b) => (a.round ?? 0) - (b.round ?? 0)).map((x) => x.value ?? "").filter(Boolean);

function toThreeD(date: string, d: GloData | undefined): ThreeDResult | null {
  const first = vals(d?.first)[0];
  if (!first) return null;
  return {
    date,
    first,
    threeD: first.slice(-3),
    front3: vals(d?.last3f),
    back3: vals(d?.last3b),
    last2: vals(d?.last2)[0] ?? "",
  };
}

let threeDCache: { at: number; value: ThreeDResult[] } | null = null;

export const get3DResults = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ results: ThreeDResult[]; error: string | null }> => {
    if (threeDCache && Date.now() - threeDCache.at < 10 * 60 * 1000) {
      return { results: threeDCache.value, error: null };
    }
    try {
      const year = new Date().getUTCFullYear();
      type Periods = { response?: { result?: { date: string }[] } };
      const periodLists = await Promise.all(
        [year, year - 1].map((y) =>
          post<Periods>("getPeriodsByYear", { year: String(y), type: "CHECKED" }).catch(() => ({}) as Periods),
        ),
      );
      const dates = [...new Set(periodLists.flatMap((p) => p.response?.result?.map((r) => r.date) ?? []))]
        .sort()
        .reverse()
        .slice(0, 12);

      type Result = { response?: { data?: GloData } };
      const results: ThreeDResult[] = [];
      // Fetch at most 6 at a time.
      for (let i = 0; i < dates.length; i += 6) {
        const chunk = dates.slice(i, i + 6);
        const rows = await Promise.all(
          chunk.map(async (date) => {
            const [y, m, d] = date.split("-");
            try {
              const r = await post<Result>("getLotteryResult", { date: d, month: m, year: y });
              return toThreeD(date, r.response?.data);
            } catch {
              return null;
            }
          }),
        );
        for (const r of rows) if (r) results.push(r);
      }
      if (!results.length) throw new Error("no 3D results");
      threeDCache = { at: Date.now(), value: results };
      return { results, error: null };
    } catch (e) {
      console.error("get3DResults failed", e);
      return { results: threeDCache?.value ?? [], error: SERVICE_ERROR };
    }
  },
);
