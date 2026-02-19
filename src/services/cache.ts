type CacheEntry<T> = {
  ts: number;
  data: T;
};

type CachePromise<T> = {
  ts: number;
  promise: Promise<T>;
};

const DATA = new Map<string, CacheEntry<any>>();
const INFLIGHT = new Map<string, CachePromise<any>>();

export function cacheGet<T>(key: string, ttlMs: number): T | null {
  const hit = DATA.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > ttlMs) {
    DATA.delete(key);
    return null;
  }
  return hit.data as T;
}

export function cacheSet<T>(key: string, data: T) {
  DATA.set(key, { ts: Date.now(), data });
}

export function cacheInvalidate(prefix: string) {
  for (const k of DATA.keys()) {
    if (k.startsWith(prefix)) DATA.delete(k);
  }
  for (const k of INFLIGHT.keys()) {
    if (k.startsWith(prefix)) INFLIGHT.delete(k);
  }
}

export async function cacheFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = cacheGet<T>(key, ttlMs);
  if (cached !== null) return cached;

  const inflight = INFLIGHT.get(key);
  if (inflight && Date.now() - inflight.ts < ttlMs) return inflight.promise as Promise<T>;

  const p = fetcher()
    .then((d) => {
      cacheSet(key, d);
      return d;
    })
    .finally(() => {
      INFLIGHT.delete(key);
    });

  INFLIGHT.set(key, { ts: Date.now(), promise: p });
  return p;
}
