// Envia o histórico (data/*.json) para o Firebase, para a app publicada o ler.
// Cada ficheiro vai comprimido (gzip + base64) em partes < 900 KB: flow_hist/<nome>_p<i>,
// e um índice flow_hist/meta { <nome>: {v, partes, bytes} }.
// Uso: node scripts/upload_hist.mjs            (todos)
//      node scripts/upload_hist.mjs fii sap    (só alguns)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfgTxt = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
const KEY = /apiKey:\s*"([^"]+)"/.exec(cfgTxt)[1], PROJ = /projectId:\s*"([^"]+)"/.exec(cfgTxt)[1], PRE = (/prefixo:\s*"([^"]+)"/.exec(cfgTxt) || [, 'flow_'])[1];
const NOMES = process.argv.slice(2).length ? process.argv.slice(2) : ['fii', 'fiq', 'rf', 'mm', 'cort', 'sap'];
const PARTE = 900000;

const auth = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })).json();
if (!auth.idToken) throw new Error('Sem sessão no Firebase: ' + JSON.stringify(auth));
const H = { Authorization: 'Bearer ' + auth.idToken, 'Content-Type': 'application/json' };
const URL0 = `https://firestore.googleapis.com/v1/projects/${PROJ}/databases/(default)/documents/${PRE}hist/`;
const val = v => typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) };
async function put(id, obj) {
  const fields = {}; for (const k in obj) fields[k] = (obj[k] && typeof obj[k] === 'object') ? { mapValue: { fields: Object.fromEntries(Object.entries(obj[k]).map(([a, b]) => [a, (b && typeof b === 'object') ? { mapValue: { fields: Object.fromEntries(Object.entries(b).map(([c, d]) => [c, val(d)])) } } : val(b)])) } } : val(obj[k]);
  const r = await fetch(URL0 + encodeURIComponent(id), { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(id + ': ' + r.status + ' ' + (await r.text()).slice(0, 300));
}
// índice atual (para manter os ficheiros que não são enviados agora)
let meta = {};
try { const r = await (await fetch(URL0 + 'meta', { headers: H })).json(); const f = r.fields || {}; for (const k in f) { const m = f[k].mapValue.fields; meta[k] = { v: m.v.stringValue, partes: +m.partes.integerValue, bytes: +m.bytes.integerValue }; } } catch { }

for (const n of NOMES) {
  const f = path.join(ROOT, 'data', n + '.json');
  if (!fs.existsSync(f)) { console.log('falta', f); continue; }
  const raw = fs.readFileSync(f), gz = zlib.gzipSync(raw, { level: 9 }).toString('base64');
  const partes = Math.ceil(gz.length / PARTE), v = new Date().toISOString();
  for (let i = 0; i < partes; i++) await put(n + '_p' + i, { nome: n, parte: i, v, gz: gz.slice(i * PARTE, (i + 1) * PARTE) });
  meta[n] = { v, partes, bytes: raw.length };
  console.log(n, (raw.length / 1e6).toFixed(1) + ' MB ->', (gz.length / 1e6).toFixed(2) + ' MB em', partes, 'parte(s)');
}
await put('meta', meta);
console.log('índice atualizado:', Object.keys(meta).join(', '));
