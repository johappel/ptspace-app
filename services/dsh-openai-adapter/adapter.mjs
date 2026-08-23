#!/usr/bin/env node
/**
 * dsh-openai-adapter
 * ------------------
 * Ein kleiner, abhängigkeitsfreier HTTP-Server (Node >= 18), der eine
 * OpenAI-kompatible Schnittstelle bereitstellt und jeden Request als einen
 * `dsh --profile headless "<prompt>"`-Subprozess ausführt.
 *
 *   POST /v1/chat/completions   (JSON, optional SSE-Streaming)
 *   GET  /v1/models
 *   GET  /v1/models/{id}
 *   GET  /healthz
 *
 * Start:   node adapter.mjs           (oder: npm start)
 * Konfig:  Umgebungsvariablen, siehe README.md (PORT, ADAPTER_HOST,
 *          ADAPTER_API_KEY, DSH_BIN, DSH_PROFILE, REQUEST_TIMEOUT_MS, ...)
 */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PKG_NAME = '@deepseek-ai/dsh';
const ADAPTER_DIR = path.dirname(fileURLToPath(import.meta.url));
const STARTED_AT = Math.floor(Date.now() / 1000);

/* ------------------------------------------------------------------ utils */

function log(...args) {
  console.error(new Date().toISOString(), ...args);
}

function envStr(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function envInt(name, fallback) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

const estTokens = (s) => Math.max(1, Math.round(s.length / 4));
const newId = () =>
  'chatcmpl-' + crypto.randomBytes(12).toString('hex');

function oneLine(s, max = 400) {
  return String(s ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(-max);
}

/** OpenAI-kompatibler Fehlerbody */
function errorBody(message, type = 'api_error', code = null) {
  return { error: { message, type, param: null, code } };
}

/* --------------------------------------------------- DSH-Binary-Auflösung */

/**
 * Liefert {kind,file|cmd}, wobei kind einer von:
 *   node   – JS-Einstiegsdatei, wird mit process.execPath ausgeführt (Standardfall)
 *   exe    – direkte ausführbare Datei
 *   shell  – .cmd/.bat (wird über cmd.exe /c ausgeführt, best-effort quoting)
 *   path   – nackter Befehlsname vom PATH (POSIX)
 */
/** npm prefix -g – nur als echter Fallback (vermeidet DEP0190: String-Kommando + shell). */
function npmGlobalPrefix() {
  return new Promise((resolve, reject) => {
    if (process.platform === 'win32') {
      execFile('npm prefix -g', { shell: true, timeout: 8000 },
        (err, stdout) => (err ? reject(err) : resolve(stdout.trim())));
    } else {
      execFile('npm', ['prefix', '-g'], { timeout: 8000 },
        (err, stdout) => (err ? reject(err) : resolve(stdout.trim())));
    }
  });
}

/** Prüft einen Kandidaten (Paketordner ODER Datei). Gibt bei Treffer {kind,...} zurück. */
function tryCandidate(cand, tried) {
  tried.push(cand);
  const pkgFile = path.join(cand, 'package.json');
  let entry = null;
  if (fs.existsSync(pkgFile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
      const bin = pkg.bin ?? {};
      const binRel =
        typeof bin === 'string' ? bin : (bin.dsh ?? bin['.'] ?? Object.values(bin)[0]);
      if (binRel) entry = path.join(cand, binRel);
    } catch { /* defekte package.json – weiter */ }
  }
  // Kandidat kann auch selbst eine Datei sein (via DSH_BIN)
  if (!entry && fs.existsSync(cand) && fs.statSync(cand).isFile()) entry = cand;

  if (entry && fs.existsSync(entry)) return classifyDsh(entry);
  return null;
}

async function resolveDsh(dshBinOpt) {
  const tried = [];

  if (dshBinOpt) {
    const hit = tryCandidate(path.resolve(dshBinOpt), tried);
    if (hit) return hit;
  } else {
    const rel = path.join('node_modules', ...PKG_NAME.split('/'));
    const bases = [
      path.dirname(process.execPath), // nvm-windows: node.exe liegt neben node_modules/
      ADAPTER_DIR,
      process.cwd(),
      path.join(os.homedir(), 'AppData', 'Roaming', 'npm'),
    ];
    for (const base of [...new Set(bases)]) {
      const hit = tryCandidate(path.join(base, rel), tried);
      if (hit) return hit;
    }
    // letzter Ausweg: npm prefix -g
    try {
      const prefix = await npmGlobalPrefix();
      if (prefix) {
        const hit = tryCandidate(path.join(prefix, 'node_modules', ...PKG_NAME.split('/')), tried);
        if (hit) return hit;
      }
    } catch { /* npm nicht verfügbar – ignorieren */ }
  }

  if (process.platform !== 'win32' && !dshBinOpt) return { kind: 'path', cmd: 'dsh' };

  throw new Error(
    `Konnte ${PKG_NAME} nicht finden. Setze DSH_BIN auf die JS-Einstiegsdatei der CLI, ` +
    `z. B. C:\\nvm4w\\nodejs\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js.\nVersucht wurden:\n - ` +
    tried.join('\n - '),
  );
}

function classifyDsh(file) {
  const ext = path.extname(file).toLowerCase();
  if (['.js', '.mjs', '.cjs'].includes(ext)) return { kind: 'node', file };
  if (ext === '.exe' || ext === '.com') return { kind: 'exe', file };
  if (ext === '.cmd' || ext === '.bat') return { kind: 'shell', file };
  return { kind: 'exe', file }; // POSIX: Shebang-Datei
}

/* --------------------------------------------------------- Prompt-Building */

function msgText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === 'string' ? p : p && p.type === 'text' ? p.text : ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

/**
 * Wandelt OpenAI-Messages in einen einzelnen Headless-Prompt um.
 * Der letzte User-Beitrag ist die Aufgabe; alles davor ist Kontext.
 */
function buildPrompt(messages, budget) {
  const HEADER =
    'Dies ist der Verlauf einer Chat-Sitzung mit einem Agenten. ' +
    'Der LETZTE User-Beitrag ist die aktuelle Aufgabe. Führe sie aus und antworte ' +
    'direkt mit der Antwort an den User (keine Kommentare über dieses Prompt-Format).';

  const sys = [];
  const dial = [];
  let sysChars = 0;
  let lastUser = '';

  for (const m of messages) {
    const text = msgText(m.content);
    if (!text) continue;
    const role = m.role === 'developer' ? 'system' : m.role;
    if (role === 'system') {
      sys.push(text);
      sysChars += text.length;
    } else {
      dial.push({ role, text });
      if (role === 'user') lastUser = text;
    }
  }

  // Kürzen: behalte Header + Systemblock + möglichst viele der NEUESTEN Turns.
  let acc = HEADER.length + sysChars;
  let start = dial.length; // alles ab Index `start` wird behalten
  while (start > 0) {
    const cost = dial[start - 1].text.length;
    if (acc + cost > budget) break;
    acc += cost;
    start--;
  }

  // Sicherheitsnetz: die aktuelle Aufgabe (letzter Beitrag) muss überleben.
  let forcedLast = false;
  if (start === dial.length && dial.length > 0) {
    const last = dial[dial.length - 1];
    const avail = Math.max(200, budget - HEADER.length - sysChars);
    dial[dial.length - 1] = { role: last.role, text: last.text.slice(0, avail) };
    start--;
    forcedLast = true;
  }

  const kept = dial.slice(Math.max(0, start));
  const cut = Math.max(0, start); // Anzahl entferkter älterer Nachrichten

  const parts = [HEADER];
  if (sys.length) {
    parts.push('<system_instructions>\n' + sys.join('\n\n') + '\n</system_instructions>');
  }
  if (cut > 0) {
    parts.push(`<truncated>${cut} ältere Nachricht(en) gekürzt (Limit ${budget} Zeichen${forcedLast ? ', letzte Aufgabe gekappt' : ''})</truncated>`);
  }
  for (const { role, text } of kept) {
    parts.push(`<${role}>\n${text}\n</${role}>`);
  }

  const prompt = parts.join('\n\n');
  return { prompt, truncated: cut };
}

/* ----------------------------------------------------------- Subprozess-Layer */

/** Windows-cmd-Quoting (nur für den seltenen .cmd/.bat-Fall). */
function winQuote(arg) {
  let q = '"' + String(arg).replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1') + '"';
  // cmd-Metazeichen entschärfen (best effort; der Normalfall läuft OHNE shell)
  q = q.replace(/[\^&|<>()]/g, '^$&').replace(/%/g, '%%');
  return q;
}

function dshCommand(dsh, profile, prompt) {
  switch (dsh.kind) {
    case 'node':
      return { file: process.execPath, args: [dsh.file, '--profile', profile, prompt] };
    case 'exe':
    case 'path':
      return { file: dsh.file ?? dsh.cmd, args: ['--profile', profile, prompt] };
    case 'shell':
      return {
        file: process.env.comspec || 'cmd.exe',
        args: ['/d', '/s', '/c', winQuote([dsh.file, '--profile', profile, prompt].join(' '))],
      };
    default:
      throw new Error('unbekannter dsh.kind: ' + dsh.kind);
  }
}

const liveChildren = new Set();

/**
 * Führt einen Headless-Turn aus.
 * Resolve: {code,signal,timedOut,stdout,stderr,spawnError?}
 */
function runDsh(dsh, profile, prompt, timeoutMs) {
  const { file, args } = dshCommand(dsh, profile, prompt);
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(file, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (e) {
      resolve({ code: -1, signal: null, timedOut: false, stdout: '', stderr: '', spawnError: e });
      return;
    }
    liveChildren.add(child);

    const out = [];
    const err = [];
    let outLen = 0;
    let errLen = 0;
    const CAP_OUT = 8 << 20; // 8 MB
    const CAP_ERR = 1 << 20;

    child.stdout.on('data', (d) => {
      if (outLen < CAP_OUT) { out.push(d); outLen += d.length; }
    });
    child.stderr.on('data', (d) => {
      if (errLen < CAP_ERR) { err.push(d); errLen += d.length; }
    });

    let settled = false;
    let hardTimer = null;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill(); } catch { /* egal */ }
      hardTimer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch { /* egal */ }
      }, 5000);
      hardTimer.unref?.();
    }, timeoutMs);

    const finish = (extra = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (hardTimer) clearTimeout(hardTimer);
      liveChildren.delete(child);
      resolve({
        code: child.exitCode ?? null,
        signal: child.signalCode ?? null,
        timedOut,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
        ...extra,
      });
    };

    child.on('error', (e) => finish({ spawnError: e }));
    child.on('close', () => finish());
  });
}

/* -------------------------------------------------------------- Semaphore */

function makeLimiter(max) {
  let active = 0;
  const waiters = [];
  return {
    acquire() {
      return new Promise((res) => {
        if (active < max) { active++; res(); } else waiters.push(res);
      });
    },
    release() {
      const next = waiters.shift();
      if (next) next(); // Platz wandert direkt weiter
      else active--;
    },
    get active() { return active; },
    get queued() { return waiters.length; },
  };
}

/* ------------------------------------------------------------ HTTP-Helfer */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    ...CORS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let len = 0;
    req.on('data', (d) => {
      len += d.length;
      if (len > limitBytes) {
        reject(Object.assign(new Error('Request-Body zu groß'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(d);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* --------------------------------------------------------------- Streaming */

/** Text in ~target-große, wortgrenzen-freundliche Stücke splitten. */
function chunksOf(text, target = 48) {
  const pieces = [];
  const re = /\S+\s*|\s+/g;
  let buf = '';
  let m;
  while ((m = re.exec(text)) !== null) {
    buf += m[0];
    if (buf.length >= target) { pieces.push(buf); buf = ''; }
  }
  if (buf) pieces.push(buf);
  return pieces;
}

function baseChunk(id, model, extra) {
  return {
    id,
    object: 'chat.completion.chunk',
    created: STARTED_AT,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: null, ...extra }],
  };
}

/* --------------------------------------------------------------- Chatflow */

function handleChatCompletion(ctx, req, res, rawBody) {
  let body;
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    sendJson(res, 400, errorBody('Ungültiges JSON im Request-Body', 'invalid_request_error'));
    return Promise.resolve();
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    sendJson(res, 400, errorBody("'messages' muss ein nicht-leeres Array sein", 'invalid_request_error'));
    return Promise.resolve();
  }
  for (const m of messages) {
    if (!m || typeof m !== 'object' || typeof m.role !== 'string') {
      sendJson(res, 400, errorBody("Jede Message braucht 'role' und 'content'", 'invalid_request_error'));
      return Promise.resolve();
    }
  }

  const { cfg, dsh, limiter } = ctx;
  const model = typeof body.model === 'string' && body.model ? body.model : 'dsh-headless';
  const { prompt, truncated } = buildPrompt(messages, cfg.maxPromptChars);
  const id = newId();

  if (limiter.active >= cfg.maxConcurrent) {
    res.writeHead(429, { ...CORS, 'Retry-After': '5', 'Content-Type': 'application/json' });
    res.end(JSON.stringify(errorBody(
      `Server beschäftigt (${cfg.maxConcurrent} laufende Headless-Turns), bitte später erneut versuchen.`,
      'rate_limit_error', 'busy',
    )));
    return Promise.resolve();
  }

  return limiter.acquire().then(async () => {
    const t0 = Date.now();
    let clientGone = false;
    res.on('close', () => { clientGone = true; });
    try {
      log(`turn start model=${model} prompt_chars=${prompt.length}${truncated ? ` (gekürzt: ${truncated})` : ''}`);
      const r = await runDsh(dsh, cfg.profile, prompt, cfg.timeoutMs);
      const durationMs = Date.now() - t0;

      if (clientGone) { log('turn discarded (client weg)'); return; }

      if (r.spawnError) {
        sendJson(res, 502, errorBody(`dsh konnte nicht gestartet werden: ${r.spawnError.message}`));
        return;
      }
      // Vertrag des Headless-Profils: Exit 0 = erfolgreicher Turn.
      if (r.timedOut || r.code !== 0) {
        const why = r.timedOut
          ? `Timeout nach ${cfg.timeoutMs} ms`
          : `dsh beendet mit code=${r.code}${r.signal ? ` signal=${r.signal}` : ''}`;
        const detail = [];
        if (r.stderr.trim()) detail.push(`stderr: ${oneLine(r.stderr)}`);
        if (!r.timedOut && r.stdout.trim()) detail.push(`stdout-Auszug: ${oneLine(r.stdout)}`);
        sendJson(res, r.timedOut ? 504 : 502, errorBody(
          `${why}. ${detail.join(' | ') || '(keine Ausgabe)'}`,
        ));
        return;
      }

      const content = r.stdout.trim();
      const usage = {
        prompt_tokens: estTokens(prompt),
        completion_tokens: estTokens(content),
        total_tokens: estTokens(prompt) + estTokens(content),
      };

      if (body.stream) {
        res.writeHead(200, {
          ...CORS,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

        send(baseChunk(id, model, { delta: { role: 'assistant', content: '' } }));

        // Pseudo-Streaming: Headless liefert erst am Ende – wir portionieren
        // die fertige Antwort zügig als SSE-Deltas (Gesamt-Zusatz ~<=1.2 s).
        const pieces = chunksOf(content);
        const perDelay = Math.min(30, Math.max(2, Math.floor(1200 / Math.max(1, pieces.length))));
        const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
        for (const piece of pieces) {
          if (clientGone) break;
          send(baseChunk(id, model, { delta: { content: piece } }));
          if (perDelay > 2) await sleep(perDelay);
        }
        if (!clientGone) {
          if (body.stream_options?.include_usage) {
            const u = baseChunk(id, model, { delta: {} });
            u.usage = usage;
            send(u);
          }
          const fin = baseChunk(id, model, { delta: {}, finish_reason: 'stop' });
          send(fin);
          res.write('data: [DONE]\n\n');
          res.end();
        }
        log(`turn done (stream) ${durationMs}ms chars=${content.length}`);
      } else {
        sendJson(res, 200, {
          id,
          object: 'chat.completion',
          created: STARTED_AT,
          model,
          choices: [{
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop',
          }],
          usage,
          dsh_meta: { profile: cfg.profile, duration_ms: durationMs },
        });
        log(`turn done ${durationMs}ms chars=${content.length}`);
      }
    } finally {
      limiter.release();
    }
  });
}

/* ----------------------------------------------------------------- Server */

function createHandler(ctx) {
  const authOk = (req) => {
    if (!ctx.cfg.apiKey) return true;
    const got = req.headers.authorization || '';
    return got === `Bearer ${ctx.cfg.apiKey}`;
  };

  return async (req, res) => {
    const t0 = Date.now();
    const url = new URL(req.url, 'http://localhost');
    const route = `${req.method} ${url.pathname}`;

    res.on('finish', () => {
      log(`${route} -> ${res.statusCode} ${Date.now() - t0}ms`);
    });

    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      res.end();
      return;
    }

    if (url.pathname === '/healthz') {
      sendJson(res, 200, {
        ok: true,
        model: 'dsh-headless',
        profile: ctx.cfg.profile,
        active_turns: ctx.limiter.active,
        queued_turns: ctx.limiter.queued,
        uptime_s: Math.round(process.uptime()),
      });
      return;
    }

    if (!authOk(req)) {
      res.writeHead(401, { ...CORS, 'WWW-Authenticate': 'Bearer realm="dsh-openai-adapter"' });
      res.end(JSON.stringify(errorBody('Fehlender oder falscher API-Key (Authorization: Bearer …)', 'auth_error', 'invalid_api_key')));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/models') {
      sendJson(res, 200, {
        object: 'list',
        data: [
          { id: 'dsh-headless', object: 'model', created: STARTED_AT, owned_by: 'deepseek-harness' },
          { id: 'dsh', object: 'model', created: STARTED_AT, owned_by: 'deepseek-harness' },
        ],
      });
      return;
    }

    const singleModel = url.pathname.match(/^\/v1\/models\/([^/]+)$/);
    if (req.method === 'GET' && singleModel) {
      const id = decodeURIComponent(singleModel[1]);
      if (id === 'dsh-headless' || id === 'dsh') {
        sendJson(res, 200, { id, object: 'model', created: STARTED_AT, owned_by: 'deepseek-harness' });
      } else {
        sendJson(res, 404, errorBody(`Unbekanntes Model: ${id}`, 'invalid_request_error', 'model_not_found'));
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      let raw;
      try {
        raw = await readBody(req, 20 << 20);
      } catch (e) {
        sendJson(res, e.status ?? 400, errorBody(e.message, 'invalid_request_error'));
        return;
      }
      await handleChatCompletion(ctx, req, res, raw);
      return;
    }

    sendJson(res, 404, errorBody(`Unbekannter Endpoint: ${route}`, 'invalid_request_error'));
  };
}

/* ------------------------------------------------------------- Bootstrap */

export function defaultConfigFromEnv() {
  return {
    host: envStr('ADAPTER_HOST', '127.0.0.1'),
    port: envInt('PORT', 3110),
    apiKey: envStr('ADAPTER_API_KEY', ''),
    profile: envStr('DSH_PROFILE', 'headless'),
    dshBin: envStr('DSH_BIN', ''),
    timeoutMs: envInt('REQUEST_TIMEOUT_MS', 600_000),
    maxConcurrent: envInt('MAX_CONCURRENT', 4),
    maxPromptChars: envInt('MAX_PROMPT_CHARS', 24_000),
  };
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '::ffff:127.0.0.1']);

export async function startAdapter(opts = {}) {
  const cfg = { ...defaultConfigFromEnv(), ...opts };
  const dsh = await resolveDsh(cfg.dshBin);

  if (!LOOPBACK.has(String(cfg.host)) && !cfg.apiKey) {
    throw new Error(
      `ADAPTER_HOST='${cfg.host}' ist nicht loopback und es ist kein ADAPTER_API_KEY gesetzt. ` +
      'Der Adapter hat keinen Auth-Layer – bitte ADAPTER_API_KEY setzen oder loopback lassen.',
    );
  }

  const limiter = makeLimiter(cfg.maxConcurrent);
  const server = http.createServer(createHandler({ cfg, dsh, limiter }));

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(cfg.port, cfg.host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const addr = server.address();
  log(`dsh-openai-adapter listening on http://${addr.address}:${addr.port}/v1`);
  log(`dsh: ${dsh.kind === 'node' ? `${process.execPath} ${dsh.file}` : (dsh.file ?? dsh.cmd)} (profile=${cfg.profile})`);
  log(`auth: ${cfg.apiKey ? 'enabled (Bearer)' : 'disabled'} | timeout=${cfg.timeoutMs}ms | maxConcurrent=${cfg.maxConcurrent}`);

  return {
    server,
    port: addr.port,
    dsh,
    cfg,
    close: () => new Promise((ok) => server.close(ok)),
  };
}

/* ------------------------------------------------------------ main guard */

function isMainModule() {
  try {
    return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  startAdapter().catch((e) => {
    console.error('[dsh-openai-adapter] Start fehlgeschlagen:', e.message);
    process.exitCode = 1;
  });

  const shutdown = (sig) => {
    log(`${sig} empfangen – fahre herunter`);
    for (const c of liveChildren) { try { c.kill(); } catch { /* egal */ } }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
