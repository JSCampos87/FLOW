// Grava a foto de um artigo do catálogo de requisições (mat_fotos) a partir de um JPEG já reduzido.
// Uso: node scripts/foto_artigo.mjs <codigo SAP> <ficheiro.jpg>        (sem ficheiro: só mostra o artigo)
// A chave da foto é a mesma da app (requisicoes.js › fotoKey): part number, senão SAP, senão id.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfgTxt = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
const KEY = /apiKey:\s*"([^"]+)"/.exec(cfgTxt)[1], PROJ = /projectId:\s*"([^"]+)"/.exec(cfgTxt)[1], PRE = (/prefixo:\s*"([^"]+)"/.exec(cfgTxt) || [, 'flow_'])[1];
const [sap, img] = process.argv.slice(2);
if (!sap) { console.log('Uso: node scripts/foto_artigo.mjs <SAP> [foto.jpg]'); process.exit(1); }

const auth = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })).json();
if (!auth.idToken) throw new Error('Sem sessão no Firebase');
const H = { Authorization: 'Bearer ' + auth.idToken, 'Content-Type': 'application/json' };
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJ}/databases/(default)/documents/`;
const idKey = s => String(s).trim().replace(/[\/\s.#$\[\]]+/g, '_').slice(0, 120) || 'x';

const q = await (await fetch(`https://firestore.googleapis.com/v1/projects/${PROJ}/databases/(default)/documents:runQuery`, { method: 'POST', headers: H,
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: PRE + 'mat_cat' }], where: { fieldFilter: { field: { fieldPath: 'sap' }, op: 'EQUAL', value: { stringValue: sap } } } } }) })).json();
const docs = q.filter(x => x.document).map(x => ({ id: x.document.name.split('/').pop(), f: Object.fromEntries(Object.entries(x.document.fields || {}).map(([k, v]) => [k, Object.values(v)[0]])) }));
if (!docs.length) { console.log('Artigo com SAP', sap, 'não encontrado em', PRE + 'mat_cat'); process.exit(1); }
for (const d of docs) console.log('artigo', d.id, '|', d.f.nome, '| pn', d.f.pn || '-', '| maq', d.f.maquina, '| ativo', d.f.ativo);
if (!img) process.exit(0);

const a = docs[0].f, k = idKey(a.pn || a.sap || docs[0].id);
const data = 'data:image/jpeg;base64,' + fs.readFileSync(img).toString('base64');
if (data.length > 900000) throw new Error('Foto grande demais (' + data.length + ' bytes): reduza para ~600 px');
const fields = { img: { stringValue: data }, pn: { stringValue: a.pn || '' }, sap: { stringValue: sap }, em: { stringValue: new Date().toISOString() } };
const r = await fetch(BASE + PRE + 'mat_fotos/' + encodeURIComponent(k), { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 300));
console.log('foto gravada em', PRE + 'mat_fotos/' + k, '(' + Math.round(data.length / 1024) + ' KB)');
