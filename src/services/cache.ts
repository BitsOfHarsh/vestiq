import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export async function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(`vc:${key}`);
    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (Date.now() - entry.ts < ttlMs) return entry.data;
    }
  } catch { /* cache miss — continue */ }

  const data = await fetcher();

  AsyncStorage.setItem(`vc:${key}`, JSON.stringify({ data, ts: Date.now() })).catch(() => {});

  return data;
}

export async function getStale<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`vc:${key}`);
    if (raw) return (JSON.parse(raw) as CacheEntry<T>).data;
  } catch {}
  return null;
}

export async function bustCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(`vc:${key}`).catch(() => {});
}
