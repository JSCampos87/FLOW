// Specs de embalamento do SAP (classificação Z09) -> data/sap.json
// Uso: exportar a folha do "SPECS EMB.XLSX" para CSV UTF-8 (Excel: Guardar como > CSV UTF-8) e correr
//   node scripts/build_specs.mjs "C:\caminho\specs.csv"
// O ficheiro gerado contém dados da empresa e não entra no Git (ver .gitignore).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('Indique o CSV exportado do SPECS EMB.XLSX'); process.exit(1); }

function parseCsv(txt) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const txt = fs.readFileSync(src, 'utf8').replace(/^\uFEFF/, '');
const [head, ...rows] = parseCsv(txt);
const ix = re => head.findIndex(h => re.test(h));
const C = {
  mm: ix(/^Objeto/i), descricao: ix(/Denomina/i), protecao: ix(/Protecao/i), separacao: ix(/Separacao/i),
  altura: ix(/Alt_MAX/i), cantoneiras: ix(/Cantoneiras/i), retratil: ix(/Retratil/i), base: ix(/Ma.o Base/i),
  camadas: ix(/Ma.o Altura/i), brick: ix(/Brick/i), filme: ix(/Filme/i), cintaL: ix(/Cinta Longitudinal/i), cintaT: ix(/Cinta Transversal/i)
};
const s = v => (v == null ? '' : String(v).trim());
const n = v => { const x = parseFloat(s(v).replace(/\s*cm$/i, '').replace(',', '.')); return isFinite(x) ? x : undefined; };
const yn = v => { const x = s(v).toUpperCase(); return /^(SIM|S|X|1)\b/.test(x) ? true : /^(NAO|NÃO|N|0)\b/.test(x) ? false : undefined; };

const out = [];
for (const r of rows) {
  const mm = s(r[C.mm]).replace(/\.0$/, ''); if (!mm) continue;
  const alt = n(r[C.altura]);
  const o = {
    mm, descricao: s(r[C.descricao]) || undefined,
    protecao: s(r[C.protecao]) || undefined, separacao: s(r[C.separacao]) || undefined,
    alturaPalete: alt != null ? Math.round(alt * 10) : undefined,       // cm -> mm
    cantoneiras: yn(r[C.cantoneiras]), retratil: yn(r[C.retratil]),
    macosBase: n(r[C.base]), camadas: n(r[C.camadas]),
    brick: s(r[C.brick]) || undefined, filme: s(r[C.filme]) || undefined,
    cintaL: n(r[C.cintaL]), cintaT: n(r[C.cintaT]),
    tampo: /madeira/i.test(s(r[C.protecao])) || undefined, fonte: 'SAP'
  };
  Object.keys(o).forEach(k => o[k] === undefined && delete o[k]);
  out.push(o);
}
const dest = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'sap.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log(out.length, 'MM ->', dest, (fs.statSync(dest).size / 1e6).toFixed(1) + ' MB');
