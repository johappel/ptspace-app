/**
 * Generischer TTL-Cache mit Deduplizierung laufender Aktualisierungen
 * (CHAT-PERFORMANCE-TASKS TASK 10, ARCHITECTURE-SESSION-MODEL Abschnitt 15).
 *
 * Wird u. a. für den Availability Cache genutzt: checkAvailability() soll nicht
 * mehrfach kurz hintereinander ausgeführt werden.
 */

type Clock = () => number;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type TtlCacheResult<T> = {
  value: T;
  fromCache: boolean;
};

export class TtlCache<T> {
  private entry?: CacheEntry<T>;
  private inflight?: Promise<T>;

  constructor(
    private readonly ttlMs: number,
    private readonly clock: Clock = () => Date.now()
  ) {}

  /**
   * Liefert den gecachten Wert, falls gültig, sonst wird `loader` ausgeführt.
   * Parallele Aufrufe während eines laufenden Ladevorgangs teilen dasselbe Promise.
   */
  async get(loader: () => Promise<T>): Promise<TtlCacheResult<T>> {
    const now = this.clock();
    if (this.entry && this.entry.expiresAt > now) {
      return { value: this.entry.value, fromCache: true };
    }
    if (this.inflight) {
      return { value: await this.inflight, fromCache: true };
    }
    this.inflight = loader();
    try {
      const value = await this.inflight;
      this.entry = { value, expiresAt: this.clock() + this.ttlMs };
      return { value, fromCache: false };
    } finally {
      this.inflight = undefined;
    }
  }

  peek(): T | undefined {
    if (this.entry && this.entry.expiresAt > this.clock()) return this.entry.value;
    return undefined;
  }

  invalidate(): void {
    this.entry = undefined;
  }
}
