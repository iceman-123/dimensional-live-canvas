import { describe, expect, it } from "vitest";
import { getSession } from "@/lib/time";

// Myanmar time = UTC+6:30. 2026-11-13 is a Friday.
const mmt = (hhmm: string, day = "2026-11-13") => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.parse(`${day}T00:00:00Z`) + ((h! * 60 + m!) - 390) * 60_000);
};

describe("2D trading session (Myanmar time)", () => {
  it("is before opening at 9:29", () => expect(getSession(mmt("09:29"))).toBe("pre"));
  it("is morning live at 9:30", () => expect(getSession(mmt("09:30"))).toBe("morning"));
  it("is on break at 13:00", () => expect(getSession(mmt("13:00"))).toBe("break"));
  it("is evening live at 14:00", () => expect(getSession(mmt("14:00"))).toBe("evening"));
  it("is done after 16:31", () => expect(getSession(mmt("16:40"))).toBe("done"));
  it("is closed on Saturday", () => expect(getSession(mmt("10:00", "2026-11-14"))).toBe("closed-day"));
  it("is closed on a holiday", () => expect(getSession(mmt("10:00"), true)).toBe("closed-day"));
});
