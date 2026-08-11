export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Deterministic PRNG so mock data derived from a seed (e.g. "which slots are
// taken" for a given date+employee) stays stable across re-renders instead
// of reshuffling on every render.
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
