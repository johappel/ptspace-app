// Safe UUID generator that works even outside secure contexts
// (crypto.randomUUID is only available on https or localhost).
export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  // RFC4122 v4 fallback
  return "10000000-2000-4000-8000-900000000000".replace(/[018]/g, (ch) => {
    const digit = Number(ch);
    return (digit ^ (Math.random() * 256 >> (digit / 4))).toString(16);
  });
}
