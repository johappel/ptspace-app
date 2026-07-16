/**
 * Session Manager (CHAT-PERFORMANCE-TASKS TASK 7, ARCHITECTURE-SESSION-MODEL Abschnitt 8).
 *
 * Verwaltet flüchtige Runtime-Sessions als Cache pro Planungsraum. Sessions
 * beschleunigen das Gespräch (Provider-/Kernel-Kontext wiederverwenden), sind
 * aber niemals die einzige Quelle relevanter Informationen – der Workspace
 * bleibt Single Source of Truth.
 *
 * Session-Key: planningSpaceId + provider + model + kernelHash.
 * Ändert sich einer dieser Werte, muss eine neue Session erzeugt werden.
 */

export type RuntimeSessionStatus = "starting" | "ready" | "busy" | "expired" | "failed";

export type RuntimeSession<TNative = unknown> = {
  id: string;
  planningSpaceId: string;
  provider: string;
  model: string;
  kernelHash: string;
  createdAtMs: number;
  lastUsedAtMs: number;
  status: RuntimeSessionStatus;
  native: TNative;
};

export type SessionKeyInput = {
  planningSpaceId: string;
  provider: string;
  model: string;
  kernelHash: string;
};

export function sessionKey(input: SessionKeyInput): string {
  return `${input.planningSpaceId}::${input.provider}::${input.model}::${input.kernelHash}`;
}

export type SessionManagerOptions = {
  idleTimeoutMs?: number;
  absoluteTimeoutMs?: number;
  clock?: () => number;
};

export type SessionLookup<TNative> =
  | { reused: true; session: RuntimeSession<TNative> }
  | { reused: false; reason: "missing" | "idle_expired" | "absolute_expired" };

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minuten
const DEFAULT_ABSOLUTE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 Stunden

let sessionCounter = 0;

export class SessionManager<TNative = unknown> {
  private readonly sessions = new Map<string, RuntimeSession<TNative>>();
  private readonly idleTimeoutMs: number;
  private readonly absoluteTimeoutMs: number;
  private readonly clock: () => number;

  constructor(options: SessionManagerOptions = {}) {
    this.idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    this.absoluteTimeoutMs = options.absoluteTimeoutMs ?? DEFAULT_ABSOLUTE_TIMEOUT_MS;
    this.clock = options.clock ?? (() => Date.now());
  }

  /** Sucht eine gültige Session für den Key oder meldet, warum keine wiederverwendbar ist. */
  lookup(input: SessionKeyInput): SessionLookup<TNative> {
    const key = sessionKey(input);
    const session = this.sessions.get(key);
    if (!session) return { reused: false, reason: "missing" };
    const now = this.clock();
    if (now - session.createdAtMs > this.absoluteTimeoutMs) {
      session.status = "expired";
      this.sessions.delete(key);
      return { reused: false, reason: "absolute_expired" };
    }
    if (now - session.lastUsedAtMs > this.idleTimeoutMs) {
      session.status = "expired";
      this.sessions.delete(key);
      return { reused: false, reason: "idle_expired" };
    }
    session.lastUsedAtMs = now;
    return { reused: true, session };
  }

  register(input: SessionKeyInput, native: TNative): RuntimeSession<TNative> {
    const now = this.clock();
    const session: RuntimeSession<TNative> = {
      id: `rt-session-${++sessionCounter}-${now}`,
      planningSpaceId: input.planningSpaceId,
      provider: input.provider,
      model: input.model,
      kernelHash: input.kernelHash,
      createdAtMs: now,
      lastUsedAtMs: now,
      status: "ready",
      native
    };
    this.sessions.set(sessionKey(input), session);
    return session;
  }

  touch(input: SessionKeyInput): void {
    const session = this.sessions.get(sessionKey(input));
    if (session) session.lastUsedAtMs = this.clock();
  }

  markStatus(input: SessionKeyInput, status: RuntimeSessionStatus): void {
    const session = this.sessions.get(sessionKey(input));
    if (session) session.status = status;
  }

  drop(input: SessionKeyInput): RuntimeSession<TNative> | undefined {
    const key = sessionKey(input);
    const session = this.sessions.get(key);
    this.sessions.delete(key);
    return session;
  }

  /** Entfernt abgelaufene Sessions und gibt sie zum sauberen Schließen zurück. */
  reapExpired(): RuntimeSession<TNative>[] {
    const now = this.clock();
    const expired: RuntimeSession<TNative>[] = [];
    for (const [key, session] of this.sessions) {
      const idleExpired = now - session.lastUsedAtMs > this.idleTimeoutMs;
      const absoluteExpired = now - session.createdAtMs > this.absoluteTimeoutMs;
      if (idleExpired || absoluteExpired) {
        session.status = "expired";
        expired.push(session);
        this.sessions.delete(key);
      }
    }
    return expired;
  }

  get size(): number {
    return this.sessions.size;
  }
}
