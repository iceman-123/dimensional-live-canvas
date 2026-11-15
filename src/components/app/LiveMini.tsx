import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { holidayOn } from "@/lib/holidays";
import { liveQuery } from "@/lib/queries";
import { useSettings } from "@/lib/settings";
import { formatSlot, getSession, isLiveSession, mmtDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Small sticky strip with the current 2D number (used above the chat). */
export function LiveMini() {
  const { settings } = useSettings();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const today = now ? mmtDateKey(now) : null;
  const { data: resp } = useQuery({
    ...liveQuery,
    refetchInterval: (q) => {
      if (!settings.autoRefresh || !now) return false;
      const holiday = !!(q.state.data?.data?.holiday.isHoliday || (today && holidayOn(today)));
      return isLiveSession(getSession(now, holiday)) ? 3000 : 60_000;
    },
  });
  const data = resp?.data ?? null;
  const holiday = !!(data?.holiday.isHoliday || (today && holidayOn(today)));
  const live = now ? isLiveSession(getSession(now, holiday)) : false;
  const last = [...(data?.results ?? [])].reverse().find((r) => r.twod) ?? null;
  const number = live && data?.live.twod ? data.live.twod : (last?.twod ?? null);
  const label = live ? "Live 2D" : last ? `${formatSlot(last.time)} 2D` : "2D";

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-crimson/40 bg-surface/95 px-3 py-1.5 backdrop-blur">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {live && <span className="h-1.5 w-1.5 animate-live-blink rounded-full bg-live" />}
        {label}
      </span>
      <span
        className={cn(
          "font-display text-lg font-bold leading-none tabular text-gold-gradient",
          live && data?.live.twod && "animate-live-blink",
        )}
      >
        {number ?? "--"}
      </span>
      <span className="text-[11px] text-muted-foreground tabular">
        {live && data?.live.time ? data.live.time.slice(-8) : ""}
      </span>
    </div>
  );
}
