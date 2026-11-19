// MASTERDATA.xlsx -> Dados mestre do FLOW no Firebase (flow_maquinas, flow_operadores).
// Exportar cada folha para CSV UTF-8 (1 = MAQUINAS, 2 = pessoas por setor/máquina/turno) e correr:
//   node scripts/import_masterdata.mjs maquinas.csv pessoas.csv
// Os ids derivam do nome, por isso pode correr-se de novo sem duplicar (atualiza os registos).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [fMaq, fPes] = process.argv.slice(2);
if (!fMaq || !fPes) { console.error('Uso: node scripts/import_masterdata.mjs maquinas.csv pessoas.csv'); process.exit(1); }
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
const KEY = /apiKey:\s*"([^"]+)"/.exec(cfg)[1], PROJ = /projectId:\s*"([^"]+)"/.exec(cfg)[1], PRE = (/prefixo:\s*"([^"]+)"/.exec(cfg) || [, 'flow_'])[1];

function csv(f) {
  const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''), rows = []; let row = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; continue; }
    if (ch === '"') q = true; else if (ch === ',') { row.push(c); c = ''; } else if (ch === '\n') { row.push(c.replace(/\r$/, '')); rows.push(row); row = []; c = ''; } else c += ch; }
  if (c || row.length) { row.push(c); rows.push(row); }
  return rows.map(r => r.map(x => x.replace(/\s+/g, ' ').trim()));
}
const idKey = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------- máquinas ---------- */
const GRUPO = { 'IMPRESSÃO': 'Impressão', 'CORTE E VINCO': 'Corte e Vinco', 'COLAGEM': 'Colagem', 'PAPER CONVERTING': 'Guilhotinas', 'PREPRESS': 'Prepress', 'INKMAKER': 'Impressão', 'LAMINATING': 'Contracolagem' };
const SETOR_MAQ = { 'PAS C165': 'Pasaban', 'JAN': 'Janelas', 'VOLTEADOR': 'Impressão' };
const maquinas = []; let grupo = '';
for (const r of csv(fMaq)) {
  if (GRUPO[r[1]] && (!r[0] || r[0] === 'Nome Abreviado')) { grupo = GRUPO[r[1]]; continue; }
  if (!r[1]) continue;
  const nome = r[0] || r[1], m = { nome, modelo: r[1], setor: SETOR_MAQ[r[0]] || grupo, ativo: true };
  if (r[2]) m.sn = r[2]; if (/^\d{4}$/.test(r[3])) m.ano = +r[3]; if (r[4]) m.formatoMax = r[4]; if (r[5]) m.formatoMin = r[5];
  if (/^\d+$/.test(r[6])) m.velocidade = +r[6];
  maquinas.push(m);
}

/* ---------- pessoas ---------- */
const SETOR_P = { 'Pré-Impressão': 'Prepress', 'Impressão': 'Impressão', 'Termo Estampagem': 'Estampagem', 'Contra-colagem': 'Contracolagem', 'Corte e Vinco': 'Corte e Vinco',
  'Pré Corte e Vinco': 'Corte e Vinco', 'Colagem': 'Colagem', 'Embalamento': 'Embalamento', 'Janelas': 'Janelas', 'SC-Pasaban': 'Pasaban', 'SC-Guilhotinas': 'Guilhotinas', 'Logistica Interna': 'Logística' };
const FUNCAO_P = { 'Pré Corte e Vinco': 'Pré-corte e vinco', 'Vira Pilhas': 'Vira-pilhas', 'Logistica Interna': 'Logística interna' };
// nome da máquina igual ao da lista de máquinas (BMaster -> BMASTER, IOBOX -> IOBOX 1450)
const nomeMaq = s => { const u = s.trim().toUpperCase(); const m = maquinas.find(x => x.nome.toUpperCase() === u) || maquinas.find(x => x.nome.toUpperCase().startsWith(u + ' ')); return m ? m.nome : s.trim(); };
const isTurno = s => /^\d\d-\d\d|^HN$|^Normal$|^4ºTurno$|^Horário rotativo$|^\d\d-\d\dh/.test(s);
const pessoas = new Map(); let setor = '', maquina = '', funcao = '', turnos = [], responsavel = false;
function addPessoa(raw, turno) {
  for (let part of raw.split('/')) {
    part = part.trim(); if (!part) continue;
    const o = { setor, ativo: true };
    let m;
    if ((m = /^Formação:\s*(.+)$/i.exec(part))) { part = m[1]; o.formacao = true; }
    if ((m = /^TT\s+(.+)$/.exec(part))) { part = m[1]; o.obs = 'TT'; }
    if ((m = /^(.+?)\s*\((.+)\)$/.exec(part))) { const inner = m[2]; part = m[1];
      if (/^\d\d-\d\d$/.test(inner)) turno = inner + 'h'; else { const t = /^(.+?)\s+TT$/.exec(inner); if (t) addPessoaObj(t[1], Object.assign({}, o, { obs: 'TT', turno }));} }
    addPessoaObj(part, Object.assign(o, { turno }));
  }
}
function addPessoaObj(nome, o) {
  nome = nome.replace(/\s+/g, ' ').trim(); if (!nome) return;
  if (maquina) o.maquina = maquina; if (funcao) o.funcao = funcao; if (responsavel) o.funcao = 'Responsável de produção';
  if (!o.turno) delete o.turno; o.nome = nome;
  const k = idKey(nome); if (!pessoas.has(k)) pessoas.set(k, o); else Object.assign(pessoas.get(k), Object.fromEntries(Object.entries(o).filter(([a, b]) => b && !pessoas.get(k)[a])));
}
const rows = csv(fPes);
for (let i = 0; i < rows.length; i++) {
  const r = rows[i], a = r[0], vals = r.filter(Boolean);
  if (!vals.length) continue;
  if (a === 'GRAPHICSLEADER PRODUÇÃO') { responsavel = true; continue; }
  if (responsavel && !a && r[1]) { setor = 'Produção'; addPessoaObj(r[1], { setor: 'Produção', ativo: true }); responsavel = false; continue; }
  responsavel = false;
  if (vals.length === 1 && a && SETOR_P[a] !== undefined) { setor = SETOR_P[a]; funcao = FUNCAO_P[a] || ''; maquina = ''; turnos = []; continue; }
  if (vals.length === 1 && a === 'Vira Pilhas') { setor = 'Impressão'; funcao = 'Vira-pilhas'; maquina = ''; continue; }
  if (vals.length === 1 && a === 'Acabamentos') continue;
  // linha só com um texto na 1.ª coluna: é máquina se a linha seguinte (não vazia) for de turnos; senão é uma pessoa
  if (vals.length === 1 && a && !isTurno(a)) {
    let j = i + 1; while (j < rows.length && !rows[j].some(Boolean)) j++;
    const nx = rows[j] || [];
    if (nx.some(isTurno) && nx.filter(x => x && !isTurno(x)).length === 0) { maquina = nomeMaq(a); continue; }
  }
  if (r.some(isTurno) && r.filter(x => x && !isTurno(x)).length === 0) {   // linha de turnos
    turnos = r.map((x, j) => x === 'Horário rotativo' ? 'rotativo' : x || (r[0] === 'Horário rotativo' && j < 3 ? 'rotativo' : ''));
    continue;
  }
  r.forEach((x, j) => { if (x) addPessoa(x, (turnos[j] || '').replace(/ \(.+\)$/, '')); });
}

if (process.env.DRY) { console.log(JSON.stringify(maquinas)); console.log([...pessoas.values()].map(p => [p.nome, p.setor, p.maquina || '', p.turno || '', p.funcao || '', p.obs || '', p.formacao ? 'formação' : ''].join(' | ')).join('\n')); process.exit(0); }

/* ---------- gravar ---------- */
const auth = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })).json();
const H = { Authorization: 'Bearer ' + auth.idToken, 'Content-Type': 'application/json' };
const v = x => typeof x === 'boolean' ? { booleanValue: x } : typeof x === 'number' ? { integerValue: String(x) } : { stringValue: String(x) };
async function put(col, id, o) {
  o.criadoEm = o.criadoEm || new Date().toISOString(); o.fonte = 'MASTERDATA.xlsx';
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJ}/databases/(default)/documents/${PRE}${col}/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) }) });
  if (!r.ok) throw new Error(col + '/' + id + ': ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
for (const m of maquinas) await put('maquinas', 'm-' + idKey(m.nome), m);
for (const [k, p] of pessoas) await put('operadores', 'p-' + k, p);
console.log(maquinas.length, 'máquinas ·', pessoas.size, 'pessoas');
const porSetor = {}; for (const p of pessoas.values()) porSetor[p.setor] = (porSetor[p.setor] || 0) + 1; console.log(porSetor);
if (process.env.MOSTRAR) { console.log(maquinas); console.log([...pessoas.values()]); }
