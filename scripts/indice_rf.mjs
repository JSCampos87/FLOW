// Índice dos documentos das reclamações a fornecedores (fotografias, PDF, emails) para o FLOW.
// Lê só os NOMES, tamanhos e datas na pasta sincronizada do SharePoint (não descarrega os ficheiros do OneDrive)
// e grava um documento por ano em flow_rf_docs/<ano>: { v, h, f: { "<n>": [{n, s, t}] } }.
// O FLOW lê esse documento ao passar o rato no botão "Fotos e emails" e abre cada ficheiro no SharePoint.
// Só grava quando algo mudou. Pensado para correr de 15 em 15 minutos (Agendador de Tarefas) num PC com a pasta sincronizada.
// Uso: node scripts/indice_rf.mjs                 (ano atual e anterior)
//      node scripts/indice_rf.mjs --todos         (todos os anos)
//      node scripts/indice_rf.mjs --pasta "D:\…\Reclamações a Fornecedores"
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null };
const PASTA = arg('--pasta') || path.join(process.env.USERPROFILE || '', 'Hinojosa Packaging Group', 'Produção - QM - Quality Management', 'Reclamações a Fornecedores');
const TODOS = process.argv.includes('--todos');
if (!fs.existsSync(PASTA)) { console.error('Pasta não encontrada:', PASTA); process.exit(1) }

const cfgTxt = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
const KEY = /apiKey:\s*"([^"]+)"/.exec(cfgTxt)[1], PROJ = /projectId:\s*"([^"]+)"/.exec(cfgTxt)[1], PRE = (/prefixo:\s*"([^"]+)"/.exec(cfgTxt) || [, 'flow_'])[1];

const IGN = /^(desktop\.ini|thumbs\.db|\.ds_store)$|^~\$|^\./i;
/* lista ficheiros (até 2 níveis de subpastas); statSync não descarrega ficheiros "só online" */
function ficheiros(dir, rel = '', nivel = 0) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGN.test(e.name)) continue;
    const p = path.join(dir, e.name), r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) { if (nivel < 2) out = out.concat(ficheiros(p, r, nivel + 1)); continue }
    try { const st = fs.statSync(p); out.push({ n: r, s: st.size, t: st.mtime.toISOString().slice(0, 16) }) } catch { }
  }
  return out.sort((a, b) => a.n.localeCompare(b.n, 'pt'));
}

const anoAtual = new Date().getFullYear();
const anos = fs.readdirSync(PASTA, { withFileTypes: true }).filter(e => e.isDirectory() && /^\d{4}$/.test(e.name)).map(e => e.name)
  .filter(a => TODOS || +a >= anoAtual - 1);

const auth = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })).json();
if (!auth.idToken) throw new Error('Sem sessão no Firebase: ' + JSON.stringify(auth));
const H = { Authorization: 'Bearer ' + auth.idToken, 'Content-Type': 'application/json' };
const URL0 = `https://firestore.googleapis.com/v1/projects/${PROJ}/databases/(default)/documents/${PRE}rf_docs/`;
const sv = v => typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) };
const mapa = o => ({ mapValue: { fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? { arrayValue: { values: v.map(mapa) } } : (v && typeof v === 'object') ? mapa(v) : sv(v)])) } });

for (const ano of anos) {
  const f = {};
  for (const e of fs.readdirSync(path.join(PASTA, ano), { withFileTypes: true })) {
    const m = e.isDirectory() && /^Rec\s*0*(\d+)[_ -]+(\d{4})$/i.exec(e.name); if (!m) continue;
    f[m[1]] = ficheiros(path.join(PASTA, ano, e.name));
  }
  const h = crypto.createHash('sha1').update(JSON.stringify(f)).digest('hex');
  let antigo = null;
  try { const r = await (await fetch(URL0 + ano + '?mask.fieldPaths=h', { headers: H })).json(); antigo = r.fields && r.fields.h && r.fields.h.stringValue } catch { }
  const n = Object.keys(f).length, nf = Object.values(f).reduce((s, l) => s + l.length, 0);
  if (antigo === h) { console.log(ano, 'sem alterações (' + n + ' pastas, ' + nf + ' ficheiros)'); continue }
  const corpo = JSON.stringify({ fields: { v: sv(new Date().toISOString()), h: sv(h), f: mapa(f) } });
  if (corpo.length > 950000) { console.error(ano, 'índice demasiado grande (' + corpo.length + ' bytes)'); continue }
  const r = await fetch(URL0 + ano, { method: 'PATCH', headers: H, body: corpo });
  if (!r.ok) throw new Error(ano + ': ' + r.status + ' ' + (await r.text()).slice(0, 300));
  console.log(ano, 'atualizado:', n, 'pastas,', nf, 'ficheiros');
}
