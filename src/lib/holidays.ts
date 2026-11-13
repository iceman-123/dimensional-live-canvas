// Thai stock exchange (SET) closing days — no 2D results on these dates.
export const HOLIDAYS: { date: string; name: string }[] = [
  { date: "2026-01-01", name: "နှစ်သစ်ကူးနေ့" },
  { date: "2026-01-02", name: "နှစ်သစ် အထူးပိတ်ရက်" },
  { date: "2026-03-03", name: "မာခါဗူချာနေ့" },
  { date: "2026-04-06", name: "ချက္ကရီ အောက်မေ့ဖွယ်နေ့" },
  { date: "2026-04-13", name: "သင်္ကြန် (ဆွန်ခရန်)" },
  { date: "2026-04-14", name: "သင်္ကြန် (ဆွန်ခရန်)" },
  { date: "2026-04-15", name: "သင်္ကြန် (ဆွန်ခရန်)" },
  { date: "2026-05-01", name: "အလုပ်သမားနေ့" },
  { date: "2026-05-04", name: "နန်းတက်ပွဲ အထိမ်းအမှတ်နေ့" },
  { date: "2026-06-01", name: "ဝိသာခါဗူချာနေ့ (အစားထိုး)" },
  { date: "2026-06-03", name: "မိဖုရား ဆူသီဒါ မွေးနေ့" },
  { date: "2026-07-28", name: "ဘုရင် မွေးနေ့" },
  { date: "2026-07-29", name: "အာဆာလဗူချာနေ့" },
  { date: "2026-08-12", name: "မယ်တော်မိဖုရား မွေးနေ့ / မိခင်များနေ့" },
  { date: "2026-10-13", name: "ဘုရင် ဘူမိဘော အောက်မေ့ဖွယ်နေ့" },
  { date: "2026-10-23", name: "ချူလာလောင်ကွန်း အောက်မေ့ဖွယ်နေ့" },
  { date: "2026-12-07", name: "ဖခင်များနေ့ (အစားထိုး)" },
  { date: "2026-12-10", name: "ဖွဲ့စည်းပုံ အခြေခံဥပဒေနေ့" },
  { date: "2026-12-31", name: "နှစ်ကုန်နေ့" },
  { date: "2027-01-01", name: "နှစ်သစ်ကူးနေ့" },
];

export const holidayOn = (date: string) => HOLIDAYS.find((h) => h.date === date) ?? null;
export const upcomingHolidays = (from: string, n = 3) => HOLIDAYS.filter((h) => h.date >= from).slice(0, n);
