/**
 * Smoke-Test für den dsh-openai-adapter – startet den Server in-process
 * gegen den Mock-DSH (test/mock-dsh.mjs) und prüft:
 *
 *   1. GET  /v1/models
 *   2. POST /v1/chat/completions (nicht-streamend, inkl. Shell-kritischer
 *      Zeichen im Prompt -> beweist sichere Argumentübergabe ohne shell)
 *   3. POST /v1/chat/completions (stream:true, SSE + [DONE])
 *   4. Auth: 401 ohne/falschen Key, 200 mit Key
 *   5. Fehlerpfad: Mock-Exitcode != 0 -> 502 mit error-Objekt
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.DSH_BIN ||= ''; // nichts Nötiges; wir übergeben dshBin direkt

const { startAdapter } = await import('../adapter.mjs');

const here = path.dirname(fileURLToPath(import.meta.url));
const mockBin = path.join(here, 'mock-dsh.mjs');

let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name} ${extra}`);
  }
}

async function readSse(response) {
  const text = await response.text();
  const events = [];
  for (const block of text.split('\n\n')) {
    const line = block.split('\n').find((l) => l.startsWith('data: '));
    if (!line) continue;
    const data = line.slice(6);
    if (data === '[DONE]') { events.push('[DONE]'); continue; }
    try { events.push(JSON.parse(data)); } catch { /* ignorieren */ }
  }
  return events;
}

const TRICKY_USER =
  'Sag "Hallo" & mehr <tag> %VAR% ^caret\nZeile2 |pipe| a&b';

console.log('\n[1] Instanz A: ohne Auth, Mock-DSH');
{
  const a = await startAdapter({ port: 0, dshBin: mockBin });
  const base = `http://127.0.0.1:${a.port}`;

  // healthz
  const health = await fetch(`${base}/healthz`);
  check('GET /healthz -> 200', health.status === 200);

  // models
  const modelsRes = await fetch(`${base}/v1/models`);
  const models = await modelsRes.json();
  check(
    'GET /v1/models -> 200 + dsh-headless',
    modelsRes.status === 200 &&
      Array.isArray(models.data) &&
      models.data.some((m) => m.id === 'dsh-headless'),
    JSON.stringify(models),
  );

  // chat, nicht-streamend
  const chatBody = {
    model: 'dsh',
    messages: [
      { role: 'system', content: 'Du bist ein Testbutler.' },
      { role: 'user', content: 'Erste Frage?' },
      { role: 'assistant', content: 'Erste Antwort.' },
      { role: 'user', content: TRICKY_USER },
    ],
  };
  const chatRes = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chatBody),
  });
  const chat = await chatRes.json();
  const content = chat.choices?.[0]?.message?.content ?? '';
  check('POST chat -> 200', chatRes.status === 200, JSON.stringify(chat));
  check('content beginnt mit MOCK-OK', content.startsWith('MOCK-OK'), content);
  check(
    'Prompt kam vollständig & unverändert an (kritische Zeichen)',
    content.includes('"Hallo"') && content.includes('<tag>') && content.includes('|pipe|'),
    content,
  );
  check('id hat chatcmpl-Präfix', typeof chat.id === 'string' && chat.id.startsWith('chatcmpl-'));
  check('usage.total_tokens > 0', (chat.usage?.total_tokens ?? 0) > 0);
  check('dsh_meta.profile=headless', chat.dsh_meta?.profile === 'headless');

  // chat, streamend
  const streamRes = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...chatBody, stream: true }),
  });
  check('POST stream -> 200 + text/event-stream',
    streamRes.status === 200 &&
      (streamRes.headers.get('content-type') || '').includes('text/event-stream'));

  const events = await readSse(streamRes);
  check('SSE endet mit [DONE]', events.at(-1) === '[DONE]');
  const deltas = events
    .filter((e) => e !== '[DONE]')
    .map((e) => e.choices?.[0]?.delta)
    .filter(Boolean);
  check('erster Delta trägt role=assistant', deltas[0]?.role === 'assistant');
  const streamed = deltas.map((d) => d.content ?? '').join('');
  check('gestreamter Text == nicht-gestreamter Text', streamed === content,
    JSON.stringify({ streamed, content }));
  check(
    'letztes Event finish_reason=stop',
    events.at(-2)?.choices?.[0]?.finish_reason === 'stop',
  );

  await a.close();
}

console.log('\n[2] Instanz B: mit ADAPTER_API_KEY');
{
  const b = await startAdapter({ port: 0, dshBin: mockBin, apiKey: 'secret123' });
  const base = `http://127.0.0.1:${b.port}`;

  const noAuth = await fetch(`${base}/v1/models`);
  check('ohne Key -> 401', noAuth.status === 401);

  const badAuth = await fetch(`${base}/v1/models`, {
    headers: { Authorization: 'Bearer falsch' },
  });
  check('falscher Key -> 401', badAuth.status === 401);

  const goodAuth = await fetch(`${base}/v1/models`, {
    headers: { Authorization: 'Bearer secret123' },
  });
  check('richtiger Key -> 200', goodAuth.status === 200);

  const healthOpen = await fetch(`${base}/healthz`);
  check('/healthz bleibt ohne Key erreichbar', healthOpen.status === 200);

  await b.close();
}

console.log('\n[3] Instanz C: Fehlerpfad (Mock beendet sich mit Code 7)');
{
  process.env.MOCK_EXIT_CODE = '7';
  const c = await startAdapter({ port: 0, dshBin: mockBin });
  const res = await fetch(`http://127.0.0.1:${c.port}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'kaputt' }] }),
  });
  const body = await res.json();
  delete process.env.MOCK_EXIT_CODE;
  check('Exitcode != 0 -> 502', res.status === 502, String(res.status));
  check('error.type vorhanden', typeof body.error?.type === 'string', JSON.stringify(body));
  check(
    'Exitcode + Ausgabe-Auszug in message',
    (body.error?.message ?? '').includes('code=7') &&
      /stderr:|stdout-Auszug:/.test(body.error?.message ?? ''),
    JSON.stringify(body),
  );
  await c.close();
}

console.log(`\nErgebnis: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
