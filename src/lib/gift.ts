// Deterministic "lucky numbers" for a day: same date + same results always give the same set.
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function giftNumbers(date: string, results: string[] = []) {
  const next = rng(hash(`${date}|${results.join(",")}`));
  const nums = new Set<string>();
  for (const r of results.slice(0, 2)) if (/^\d{2}$/.test(r)) nums.add(`${r[1]}${r[0]}`);
  while (nums.size < 6) nums.add(String(Math.floor(next() * 100)).padStart(2, "0"));
  const power = new Set<string>();
  while (power.size < 2) power.add(String(Math.floor(next() * 10)));
  return { numbers: [...nums].slice(0, 6), power: [...power] };
}
