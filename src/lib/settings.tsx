import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Settings = {
  autoRefresh: boolean;
  sound: boolean;
  showExtraSlots: boolean;
  bigNumbers: boolean;
};

const DEFAULTS: Settings = { autoRefresh: true, sound: false, showExtraSlots: true, bigNumbers: false };
const KEY = "2d3d-settings";

const Ctx = createContext<{ settings: Settings; update: (p: Partial<Settings>) => void }>({
  settings: DEFAULTS,
  update: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const update = (p: Partial<Settings>) =>
    setSettings((s) => {
      const next = { ...s, ...p };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
