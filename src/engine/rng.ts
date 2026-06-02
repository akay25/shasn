// Tiny deterministic PRNG. mulberry32 — 32-bit state, good enough for shuffles.
// Stored seed advances after every random draw so the engine remains pure:
// callers receive both the value and the next seed.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates with a seeded RNG. Returns the shuffled array AND the next
// seed (we advance the seed by hashing the resulting numbers so subsequent
// shuffles use a fresh state).
export function shuffle<T>(items: readonly T[], seed: number): { shuffled: T[]; nextSeed: number } {
  const arr = items.slice();
  const rng = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // advance seed: combine with a few more rng draws
  const next = Math.floor(rng() * 0xffffffff) >>> 0;
  return { shuffled: arr, nextSeed: next === 0 ? 1 : next };
}

export function randomInt(maxExclusive: number, seed: number): { value: number; nextSeed: number } {
  const rng = mulberry32(seed);
  const value = Math.floor(rng() * maxExclusive);
  const next = Math.floor(rng() * 0xffffffff) >>> 0;
  return { value, nextSeed: next === 0 ? 1 : next };
}
