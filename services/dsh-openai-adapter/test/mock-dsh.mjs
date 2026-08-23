/**
 * Mock für `dsh --profile headless`: akzeptiert dieselbe Argumentform
 * (--profile <name> <prompt>) und schreibt eine deterministische Antwort
 * auf stdout. Nur für Smoke-Tests des Adapters gedacht.
 *
 * Umgebungsvariablen:
 *   MOCK_DELAY_MS   künstliche Latenz vor der Antwort
 *   MOCK_EXIT_CODE  Prozess mit diesem Code beenden (Fehlerpfad testen)
 */
const args = process.argv.slice(2);
const idx = args.indexOf('--profile');
const prompt = (idx >= 0 ? args.slice(idx + 2) : args).join(' ');

if (process.env.MOCK_DELAY_MS) {
  await new Promise((r) => setTimeout(r, Number(process.env.MOCK_DELAY_MS) || 0));
}

if (process.env.MOCK_EXIT_CODE) {
  console.log('MOCK-PARTIAL (sollte ignoriert werden)');
  process.exit(Number(process.env.MOCK_EXIT_CODE) || 1);
}

process.stderr.write('mock-dsh: harmlose stderr-Zeile\n');

const tail = prompt.slice(-60).replace(/\s+/g, ' ');
console.log(`MOCK-OK (${prompt.length} Zeichen empfangen) …${tail}`);
