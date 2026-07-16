/**
 * Leichte, providerunabhängige Tokenabschätzung.
 *
 * Es wird bewusst keine modell-spezifische Tokenizer-Bibliothek eingebunden,
 * weil die Architektur (ARCHITECTURE-SESSION-MODEL.md, Abschnitt 6) eine grobe
 * Budgetierung verlangt, die frei von Provider-Abhängigkeiten bleibt.
 *
 * Heuristik: ~4 Zeichen pro Token (guter Mittelwert für Deutsch/Englisch),
 * mindestens jedoch die Wortanzahl, damit kurze, wortreiche Texte nicht
 * unterschätzt werden.
 */

const CHARS_PER_TOKEN = 4;

export type TokenEstimateCache = Map<string, number>;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const byChars = Math.ceil(trimmed.length / CHARS_PER_TOKEN);
  const byWords = trimmed.split(/\s+/).length;
  return Math.max(byChars, byWords);
}

/**
 * Tokenabschätzungen für unveränderte Texte wiederverwenden
 * (ARCHITECTURE-SESSION-MODEL.md, Abschnitt 15 – Token Estimate Cache).
 */
export function estimateTokensCached(text: string, cache: TokenEstimateCache): number {
  const cached = cache.get(text);
  if (cached !== undefined) return cached;
  const estimate = estimateTokens(text);
  cache.set(text, estimate);
  return estimate;
}

export function estimateTotalTokens(parts: Array<string | undefined>): number {
  return parts.reduce((total, part) => total + (part ? estimateTokens(part) : 0), 0);
}
