/* Ficha técnica das máquinas de impressão (cores e películas por corpo, anilox, alceamento/cauchos de verniz,
   rolos com esquema, catálogo de consumíveis por MM, notas técnicas) e importador das apps do supervisor
   (Offset Print, Gestão de Cauchus 908 E / XL 105, Excel de consulta de cauchos com a folha CD2).
   Coleção imp_tec: {tipo:'corpo'|'anilox'|'alceamento'|'rolo'|'consumivel'|'nota', maquina, ...}. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao, R=window.Reservas, C='var(--c-imp)';
var fv=I.fv, F=I.F, selOpts=I.selOpts, bindFilters=I.bindFilters;

function podeEditar(){ return S.admin || A.can('tecnico') }
function docs(tipo, mid){ return A.list('imp_tec').filter(function(d){ return d.tipo===tipo && (mid==null || d.maquina===mid) }) }
function corpoOrd(a,b){ var x=parseInt(a.corpo)||99, y=parseInt(b.corpo)||99; return x-y || String(a.corpo||'').localeCompare(String(b.corpo||'')) }
function maqs(){ var ids={}; A.maquinas('Impressão').forEach(function(m){ ids[m.id]=m.nome }); A.list('imp_tec').forEach(function(d){ if(d.maquina&&!ids[d.maquina]) ids[d.maquina]=A.mName(d.maquina) }); return Object.keys(ids).map(function(k){return [k,ids[k]]}).sort(function(a,b){return a[1]<b[1]?-1:1}) }
function imgMaq(mid){ var n=R.nrm(A.mName(mid)+' '+((A.get('maquinas',mid)||{}).modelo||'')); return /908/.test(n)?'img/rolos/r908.png':/105/.test(n)?'img/rolos/xl105.png':/cd2|cd102|102/.test(n)?'img/rolos/cd102.png':'' }
var CATS=['Cauchos','Álcool e lavagem','Papel calibrado','Verniz','Diversos','Produtos antigos'];

/* ---------- formulários ---------- */
var DEF={
  corpo:{t:'Cor e película do corpo', f:[{k:'corpo',l:'Corpo',req:1,ph:'ex. 3 CI'},{k:'cor',l:'Cor',ph:'ex. Cyan'},{k:'pelicula',l:'Película (espessura mm)',t:'number'},{k:'obs',l:'Observações',t:'textarea',rows:2}]},
  anilox:{t:'Anilox', f:[{k:'corpo',l:'Corpo / suplente',req:1,ph:'ex. 9 CI ou Suplente'},{k:'volume',l:'Volume (cm³/m²)'},{k:'angulo',l:'Ângulo de gravação'},{k:'lineatura',l:'Lineatura'},{k:'mm',l:'MM'},{k:'responsavel',l:'Responsável'},{k:'obs',l:'Observações',t:'textarea',rows:2}]},
  alceamento:{t:'Alceamento / caucho de verniz', f:[{k:'corpo',l:'Corpo / suplente',req:1,ph:'ex. 9 CI ou Suplente'},{k:'espessura',l:'Espessura (mm)',t:'number'},{k:'fornecedor',l:'Fornecedor'},{k:'quantidade',l:'Quantidade / estado',ph:'ex. Em máquina, 1'},{k:'responsavel',l:'Responsável'},{k:'obs',l:'Observações',t:'textarea',rows:2}]},
  rolo:{t:'Rolo', f:[{k:'nome',l:'Rolo',req:1,ph:'ex. Tintador C252-01'},{k:'n',l:'Nº no esquema'},{k:'codCor',l:'Código / cor'},{k:'sap',l:'Código SAP'},{k:'qtd',l:'Quantidade em stock',ph:'número ou “Falta”'},{k:'de',l:'Ø exterior (mm)',t:'number'},{k:'di',l:'Ø interior (mm)',t:'number'},{k:'L',l:'Comprimento (mm)',t:'number'},{k:'obs',l:'Observações',t:'textarea',rows:2}]},
  consumivel:{t:'Consumível', f:[{k:'mm',l:'MM',req:1},{k:'produto',l:'Produto',req:1},{k:'fornecedor',l:'Fornecedor'},{k:'cat',l:'Categoria',t:'select',req:1,o:CATS},{k:'antigo',l:'Produto antigo (já não se usa)',t:'check'}]},
  nota:{t:'Nota técnica', f:[{k:'data',l:'Data',t:'date'},{k:'texto',l:'Nota',t:'textarea',rows:6,req:1}]}
};
function form(tipo, d, pre){
  if(!podeEditar()){ A.toast('Só o técnico de impressão ou um editor alteram a ficha técnica.'); return }
  var def=DEF[tipo], edit=!!(d&&d.id), semMaq=tipo==='consumivel';
  var fields=(semMaq?[]:[{k:'maquina',l:'Máquina',t:'select',req:tipo!=='nota',o:maqs}]).concat(def.f);
  A.openForm({title:(edit?'Editar ':'Novo · ')+def.t, values:Object.assign({}, pre||{}, d||{}), fields:fields,
    del: edit? function(){ return A.del('imp_tec',d.id) } : null,
    submit:function(x){ x.tipo=tipo; if(tipo==='consumivel'){ x.antigo=!!x.antigo; if(x.cat==='Produtos antigos') x.antigo=true }
      if(edit){ ['origem','ordem','criadoEm','criadoPor'].forEach(function(k){ if(d[k]!=null) x[k]=d[k] }); return A.put('imp_tec',d.id,x) } return A.add('imp_tec',x) }});
}

/* ---------- vista ---------- */
A.register('ficha-imp',{
  html:function(){
    var t=A.tab('ft','corpos'), ms=maqs(), fm=fv('ftM', ms[0]?ms[0][0]:''), ed=podeEditar(), body='';
    var vazio=!A.list('imp_tec').length;
    var selM='<select data-f="ftM">'+selOpts(ms,fm)+'</select>';
    if(t==='corpos'){
      var cps=docs('corpo',fm).sort(corpoOrd), an=docs('anilox',fm).sort(corpoOrd), al=docs('alceamento',fm).sort(corpoOrd);
      body='<div class="filters">'+selM+'</div><div class="grid2"><div class="panel"><div class="ph"><h2>Cores e películas</h2>'+(ed?'<button class="btn sm" data-add="corpo">+ Corpo</button>':'')+'</div>'+
        A.table(cps,[{l:'Corpo',v:function(d){return '<b>'+esc(d.corpo)+'</b>'}},{l:'Cor',v:function(d){return esc(d.cor||'–')}},{l:'Película',n:1,v:function(d){return d.pelicula!=null?fmt(d.pelicula,2)+' mm':'–'}},{l:'Obs.',v:function(d){return '<span class="small">'+esc(d.obs||'')+'</span>'}}],{click:1,empty:'Sem cores registadas.'})+'</div>'+
        '<div class="panel"><div class="ph"><h2>Anilox</h2>'+(ed?'<button class="btn sm" data-add="anilox">+ Anilox</button>':'')+'</div>'+
        A.table(an,[{l:'Corpo',v:function(d){return '<b>'+esc(d.corpo)+'</b>'}},{l:'Volume',n:1,v:function(d){return esc(d.volume==null?'–':d.volume)}},{l:'Ângulo',v:function(d){return esc(d.angulo||'–')}},{l:'Lineatura',n:1,v:function(d){return esc(d.lineatura==null?'–':d.lineatura)}},{l:'MM',v:function(d){return '<span class="mono small">'+esc(d.mm||'')+'</span>'}}],{click:1,empty:'Sem anilox registados.'})+'</div></div>'+
        '<div class="panel" style="margin-top:14px"><div class="ph"><h2>Alceamento e cauchos de verniz</h2>'+(ed?'<button class="btn sm" data-add="alceamento">+ Registo</button>':'')+'</div>'+
        A.table(al,[{l:'Corpo',v:function(d){return '<b>'+esc(d.corpo)+'</b>'}},{l:'Espessura',n:1,v:function(d){return d.espessura!=null?fmt(d.espessura,2)+' mm':'–'}},{l:'Fornecedor',v:function(d){return esc(d.fornecedor||'–')}},
          {l:'Quantidade / estado',v:function(d){ var q=d.quantidade; return q===0||q==='0'?'<span class="pill bad">0</span>':/m[aá]quina/i.test(q||'')?'<span class="pill ok">'+esc(q)+'</span>':esc(q==null?'–':q) }},{l:'Observações',v:function(d){return '<span class="small">'+esc(d.obs||'')+'</span>'}}],{click:1,empty:'Sem registos.'})+'</div>';
    } else if(t==='rolos'){
      var rs=I.rolosMaq(fm), img=imgMaq(fm), ints=A.list('intervencoes').filter(function(i){ return i.maquina===fm && i.rolo }).sort(function(a,b){ return (b.data||'')<(a.data||'')?-1:1 });
      var falta=rs.filter(function(r){ return r.qtd===0||r.qtd==='0'||/falta/i.test(r.qtd||'') }).length;
      body='<div class="filters">'+selM+(falta?'<span class="pill bad">'+falta+' rolo'+(falta>1?'s':'')+' sem stock</span>':'')+'<span style="flex:1"></span><button class="btn" id="ftTroca">Registar troca de rolo</button>'+(ed?'<button class="btn" data-add="rolo">+ Rolo</button>':'')+'</div>'+
        '<div class="grid2" style="grid-template-columns:minmax(240px,380px) 1fr"><div class="panel">'+(img?'<img src="'+img+'" alt="Esquema dos rolos de '+esc(A.mName(fm))+'" style="width:100%;height:auto;display:block" onerror="this.replaceWith(Object.assign(document.createElement(\'p\'),{className:\'muted\',textContent:\'Sem esquema para esta máquina.\'}))">':'<p class="muted">Sem esquema para esta máquina.</p>')+'<p class="small muted" style="margin:8px 0 0">Os números do esquema correspondem à coluna Nº / código.</p></div><div class="panel">'+
        A.table(rs,[{l:'Rolo',v:function(r){return '<b>'+esc(r.nome)+'</b>'}},{l:'Nº',v:function(r){return '<span class="mono">'+esc(r.n!=null&&r.n!==''?r.n:(r.codCor||''))+'</span>'+(r.n!=null&&r.n!==''&&r.codCor?'<div class="small muted">'+esc(r.codCor)+'</div>':'')}},{l:'SAP',v:function(r){return '<span class="mono small">'+esc(r.sap||'–')+'</span>'}},
          {l:'Stock',n:1,v:function(r){ var q=r.qtd; return q===0||q==='0'||/falta/i.test(q||'')?'<span class="pill bad">'+esc(q===0||q==='0'?'0':q)+'</span>':esc(q==null||q===''?'–':q) }},{l:'Ø e / Ø i / L',n:1,v:function(r){return '<span class="mono small">'+[r.de,r.di,r.L].map(function(x){return x==null||x===''?'·':x}).join(' / ')+'</span>'}},
          {l:'Última troca',v:function(r){ var lb=I.roloLabel(r), i=ints.filter(function(x){ return x.rolo===lb })[0]; return i? fdate(i.data)+' <span class="small muted">'+esc(i.corpo||'')+'</span><div>'+I.estPill(i.estadoRolo)+'</div>' : '<span class="muted">–</span>' }}],{click:1,empty:'Sem lista de rolos para esta máquina.'})+'</div></div>';
    } else if(t==='cons'){
      var fc=fv('ftC',''), q=fv('ftQ','').toLowerCase(), all=docs('consumivel');
      var L=all.filter(function(d){ return (!fc||d.cat===fc) && (!q||[d.mm,d.produto,d.fornecedor].join(' ').toLowerCase().indexOf(q)>=0) }).sort(function(a,b){ return (CATS.indexOf(a.cat)-CATS.indexOf(b.cat)) || String(a.produto).localeCompare(String(b.produto)) });
      body='<div class="filters"><input type="search" id="ftQ" data-f="ftQ" placeholder="Procurar MM, produto, fornecedor…" value="'+esc(fv('ftQ',''))+'"><select data-f="ftC">'+selOpts(CATS.map(function(c){ return [c,c+' ('+all.filter(function(d){return d.cat===c}).length+')'] }),fc,'Todas as categorias')+'</select>'+(ed?'<span style="flex:1"></span><button class="btn" data-add="consumivel">+ Consumível</button>':'')+'</div>'+
        A.table(L,[{l:'MM',v:function(d){return '<b class="mono">'+esc(d.mm)+'</b>'}},{l:'Produto',v:function(d){return esc(d.produto)+(d.antigo?' <span class="pill mute">antigo</span>':'')}},{l:'Fornecedor',v:function(d){return esc(d.fornecedor||'–')}},{l:'Categoria',v:function(d){return esc(d.cat||'')}}],{click:1,empty:'Sem consumíveis.'});
    } else {
      var N=docs('nota').sort(function(a,b){ return (b.data||b.criadoEm||'')<(a.data||a.criadoEm||'')?-1:1 });
      body='<div class="filters"><span class="small muted">Afinações de referência, durezas dos rolos, cuidados por máquina.</span><span style="flex:1"></span>'+(ed?'<button class="btn" data-add="nota">+ Nota</button>':'')+'</div>'+
        (N.length? N.map(function(n){ return '<div class="panel click" data-nota="'+esc(n.id)+'" style="margin-bottom:10px;cursor:pointer"><div class="small muted">'+(n.maquina?esc(A.mName(n.maquina))+' · ':'')+(n.data?fdate(n.data):'')+'</div><div style="white-space:pre-wrap;margin-top:4px">'+esc(n.texto)+'</div></div>' }).join('') : '<div class="panel empty">Sem notas técnicas.</div>');
    }
    return A.head({c:C,mod:'Impressão',title:'Ficha técnica das máquinas',p:'Cores, películas, anilox e alceamento por corpo, rolos com esquema e stock, catálogo de consumíveis (MM) e notas técnicas.',
        acts:(ed?'<button class="btn'+(vazio?' primary':'')+'" id="ftImp">Importar do supervisor</button>':'')})+
      (vazio?'<div class="banner">A ficha ainda está vazia. Use “Importar do supervisor” e escolha o ficheiro <b>Offset Print</b> (.html ou a cópia .json) ou o Excel <b>Controlo do estado das máquinas</b>.</div>':'')+
      A.tabs('ft',[['corpos','Corpos'],['rolos','Rolos'],['cons','Consumíveis'],['notas','Notas técnicas']],t)+body;
  },
  bind:function(r){
    var fm=fv('ftM', (maqs()[0]||[])[0]||'');
    if($('ftImp')) $('ftImp').onclick=importar;
    if($('ftTroca')) $('ftTroca').onclick=function(){ I.intForm(null,'Impressão',{maquina:fm, tipo:'Substituição de rolos'}) };
    r.querySelectorAll('[data-add]').forEach(function(b){ b.onclick=function(){ form(b.dataset.add, null, {maquina:fm, data:A.today(), cat:fv('ftC','')||'Diversos'}) } });
    r.querySelectorAll('[data-nota]').forEach(function(b){ b.onclick=function(){ var d=A.get('imp_tec',b.dataset.nota); form('nota',d) } });
    A.bindRows(r,function(id){ var d=A.get('imp_tec',id); if(d) form(d.tipo,d) }); bindFilters(r);
  }
});

/* =================== IMPORTAÇÃO DAS APPS DO SUPERVISOR =================== */
function jsonApos(txt, marca){ var i=txt.indexOf(marca); if(i<0) return null; i+=marca.length; while(/\s/.test(txt[i])) i++;
  var open=txt[i], close=open==='['?']':open==='{'?'}':null; if(!close) return null; var d=0, str=false, q='', esc2=false;
  for(var j=i;j<txt.length;j++){ var c=txt[j]; if(str){ if(esc2) esc2=false; else if(c==='\\') esc2=true; else if(c===q) str=false; continue }
    if(c==='"'||c==="'"){ str=true; q=c; continue } if(c===open) d++; else if(c===close){ d--; if(!d) return JSON.parse(txt.slice(i,j+1)) } }
  return null }
function limpa(v){ return v==null? '' : String(v).replace(/ /g,' ').replace(/\s+/g,' ').trim() }
function dataDe(v){ if(v==null||v==='') return ''; if(v instanceof Date) return v.toISOString().slice(0,10);
  if(typeof v==='number' && v>20000 && v<80000) return new Date(Math.round((v-25569)*864e5)).toISOString().slice(0,10);
  var s=String(v).trim(), m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(m) return m[0]; m=/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(s); if(m) return (m[3].length===2?'20'+m[3]:m[3])+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2); return '' }
function corpoN(s){ s=limpa(s); var m=/(\d+)\s*CI/i.exec(s); if(m) return m[1]+' CI'; if(/suplente/i.test(s)) return 'Suplente'; return s.replace(/[·\s]+$/,'') }
function corDe(s){ var p=limpa(s).split('·'); return p.length>1? limpa(p[1]).replace(/^\((definir cor)\)$/i,'') : '' }
function hash(s){ var h=5381; for(var i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36) }
function numOu(v){ if(v==null||v==='') return null; if(typeof v==='number') return v; var n=A.num(v); return n==null? limpa(v) : n }
function maqLabelTitulo(t){ t=String(t||''); return /908/.test(t)?'R908 E':/xl\s*105/i.test(t)?'XL 105':/cd\s*2|cd\s*102/i.test(t)?'CD2':'' }

/* biblioteca de reservas: devolve {maq(label), rows:[{desenho,sap,pos,cor,reserva,obs,entrada,usaNa}]} */
function libDe908(arr){ return arr.map(function(r){ return {desenho:limpa(r.desenho), sap:limpa(r.sap).replace(/\D+$/,''), pos:limpa(r.pos).toUpperCase(), reserva:limpa(r.reserva)} }).filter(function(r){ return r.desenho }) }
function libDeXL(arr){ return arr.map(function(r){ var c=limpa(r.cor||r.pos).toUpperCase(); return {desenho:limpa(r.desenho), sap:limpa(r.sap), pos:/^#/.test(c)?'':c, cor:/^#/.test(c)?c:'', obs:limpa(r.observacao)} }).filter(function(r){ return r.desenho }) }
function posCD2(p){ p=limpa(p).toUpperCase(); var m=/^([A-Z])\s*-?\s*(\d+)$/.exec(p); return m? m[1]+'-'+('0'+m[2]).slice(-2) : p }

/* folhas de Excel -> [{name, headers, rows}] no mesmo formato da app Offset Print */
function folhasXlsx(wb){
  return wb.SheetNames.map(function(n){ var a=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}), hi=-1;
    for(var i=0;i<Math.min(a.length,6);i++){ var ne=(a[i]||[]).filter(function(x){return limpa(x)}).length; if(ne>=3 && (a[i+1]||[]).some(function(x){return limpa(x)})){ hi=i; break } }
    if(hi<0) return {name:limpa(n), headers:[], rows:a.map(function(r){ var o={}; r.forEach(function(v,j){ if(limpa(v)) o['Campo '+(j+1)]=v }); return o })};
    var h=(a[hi]||[]).map(function(x,j){ return limpa(x)||('Campo '+(j+1)) });
    return {name:limpa(n), headers:h, rows:a.slice(hi+1).map(function(r){ var o={}; h.forEach(function(k,j){ var v=r[j]; if(v!==''&&v!=null) o[k]=v }); return o }).filter(function(o){ return Object.keys(o).length })} });
}
function col(row, re){ var k=Object.keys(row).filter(function(k){ return re.test(limpa(k)) })[0]; return k? row[k] : undefined }

/* Offset Print -> plano de escrita */
function planoOffset(app){
  var P={ints:[], tec:[], maqs:{}}, sh={}; (app.sheets||[]).forEach(function(s){ sh[limpa(s.name).toLowerCase()]=s });
  var get=function(re){ var k=Object.keys(sh).filter(function(k){ return re.test(k) })[0]; return k? sh[k].rows||[] : [] };
  var M=function(l){ l=limpa(l); if(!l) return ''; var id=R.maqDe(l); P.maqs[l]=id; return id };
  var addTec=function(o, chave){ o.origem='Offset Print'; P.tec.push({id:'op-'+o.tipo+'-'+hash(chave||JSON.stringify(o)), o:o}) };
  var addInt=function(o, chave){ o.setor='Impressão'; o.origem='Offset Print'; P.ints.push({id:'op-'+hash(chave), o:o}) };
  /* cores por corpo (Densidades) + películas */
  var cores={};
  get(/^densidades/).forEach(function(r){ var m=M(r['Máquina']), c=corpoN(r['Corpo / Cor']); if(!m||!c) return; cores[m+'|'+c]={maquina:m, corpo:c, cor:corDe(r['Corpo / Cor'])} });
  get(/^peliculas|^películas/).forEach(function(r){ var m=M(r['Máquina']), c=corpoN(r['Corpo / Cor']); if(!m||!c) return; var x=cores[m+'|'+c]=cores[m+'|'+c]||{maquina:m, corpo:c, cor:corDe(r['Corpo / Cor'])}; if(!x.cor) x.cor=corDe(r['Corpo / Cor']); x.pelicula=numOu(col(r,/^expessura|^espessura/i)); if(r['Observações']) x.obs=limpa(r['Observações']) });
  Object.keys(cores).forEach(function(k){ var x=cores[k]; x.tipo='corpo'; addTec(x,'corpo|'+k) });
  get(/^anilox/).forEach(function(r,i){ var m=M(r['Máquina']); if(!m) return; addTec({tipo:'anilox', maquina:m, corpo:corpoN(col(r,/^corpo/i)), volume:numOu(r['Volume']), angulo:limpa(col(r,/angle|[aâ]ngulo/i)), lineatura:numOu(r['Lineatura']), mm:limpa(r['MM']), responsavel:limpa(r['Responsável']), obs:limpa(r['Observações'])}, 'anilox|'+m+'|'+i) });
  get(/^alceamento/).forEach(function(r,i){ var m=M(r['Máquina']); if(!m) return; addTec({tipo:'alceamento', maquina:m, corpo:corpoN(r['Corpo / Cor']), espessura:numOu(col(r,/^expessura|^espessura/i)), fornecedor:limpa(col(r,/^fornecedor/i)), quantidade:numOu(col(r,/^quantidade/i)), responsavel:limpa(r['Responsável']), obs:limpa(r['Observações'])}, 'alc|'+m+'|'+i) });
  /* rolos */
  Object.keys(sh).filter(function(k){ return /^rolagem/.test(k) }).forEach(function(k){ var s=sh[k], h=(s.headers||[])[0]||'', m=M(h||k.replace(/^rolagem\s*/,''));
    (s.rows||[]).forEach(function(r,i){ var nome=limpa(r[h]); if(!nome) return; addTec({tipo:'rolo', maquina:m, ordem:i, nome:nome, sap:limpa(r['COD_SAP']), n:limpa(r['Nº']), codCor:limpa(r['COD_COR']), qtd:numOu(r['QTD']), de:numOu(r['øe']), di:numOu(r['øi']), L:numOu(r['L'])}, 'rolo|'+m+'|'+nome+'|'+limpa(r['Nº'])+'|'+limpa(r['COD_SAP'])+'|'+i) }) });
  /* consumíveis */
  [[/^cauchus|^cauchos/,'Cauchos'],[/^alcool|^álcool/,'Álcool e lavagem'],[/^papel calibrado/,'Papel calibrado'],[/^verniz$/,'Verniz'],[/^diversos/,'Diversos'],[/^produtos antigos/,'Produtos antigos']].forEach(function(c){
    get(c[0]).forEach(function(r){ var mm=limpa(r['MM']), p=limpa(r['Produto']); if(!mm||!p) return; addTec({tipo:'consumivel', cat:c[1], mm:mm, produto:p, fornecedor:limpa(col(r,/^fornecedor/i)), antigo:c[1]==='Produtos antigos'}, 'cons|'+c[1]+'|'+mm+'|'+p) }) });
  /* notas */
  var linhas=get(/^observa/).map(function(r){ return Object.keys(r).map(function(k){ var v=r[k]; var d=/^\d{4}-\d{2}-\d{2}T/.test(String(v))||v instanceof Date? fdate(dataDe(v)) : limpa(v); return d }).filter(Boolean).join(' · ') }).filter(function(t){ return t && !/^observa[cç][oõ]es$/i.test(t) });
  if(linhas.length) addTec({tipo:'nota', maquina:'', data:A.today(), texto:linhas.join('\n')}, 'nota|excel');
  /* estado mecânico por corpo */
  var mec=function(re, tipo, cRol, cDRol, cQRol, cGar, cDGar){ get(re).forEach(function(r,i){ var m=M(r['Máquina']); if(!m) return;
    var rol=limpa(col(r,cRol)), dRol=dataDe(col(r,cDRol)), qRol=limpa(col(r,cQRol)), gar=limpa(col(r,cGar)), dGar=dataDe(col(r,cDGar)), quem=limpa(col(r,/^quem afinou/i)), resp=limpa(r['Responsável']), obs=limpa(r['Observações']);
    if(!rol && !gar && !dRol && !dGar && !obs) return;
    var d=[dRol,dGar].filter(Boolean).sort().pop()||'';
    var txt=[rol?'Rolamento: '+rol+(dRol?' (substituído a '+fdate(dRol)+(qRol?' por '+qRol:'')+')':''):'', gar?'Garras: '+gar+(dGar?' (afinadas a '+fdate(dGar)+(quem?' por '+quem:'')+')':''):''].filter(Boolean).join('. ');
    var pior=/danific/i.test(rol+gar)?'nok':/desgaste/i.test(rol+gar)?'obs':'ok';
    addInt({data:d||A.today(), semData:!d||undefined, maquina:m, tipo:tipo, corpo:corpoN(r['Corpo / Cor']), local:corpoN(r['Corpo / Cor']), estRol:rol, estGarras:gar, executante:quem||qRol||resp||'—', responsavel:resp, resultado:pior, descricao:txt||obs, obs:txt?obs:''}, tipo+'|'+m+'|'+limpa(r['Corpo / Cor'])+'|'+d+'|'+rol+'|'+gar+'|'+i) }) };
  mec(/^mt garras rolam cilindro/,'Rolamentos e garras — cilindro impressor',/^rol\. cilindro/i,/^data substit/i,/^quem subs/i,/^garras/i,/^data afina/i);
  mec(/^mt garras rolam tra/,'Rolamentos e garras — transferência',/^rol\. transf/i,/^data substit/i,/^quem subs/i,/^garras/i,/^data afina/i);
  /* avarias e alterações */
  get(/^avarias/).forEach(function(r,i){ var m=M(r['Máquina']); if(!m) return; var tp=/altera/i.test(r['Tipo']||'')?'Alteração / melhoria':'Avaria', est=/resolv/i.test(r['Estado']||'')?'Resolvida':/curso/i.test(r['Estado']||'')?'Em curso':'Aberta', d=dataDe(col(r,/^data identif/i));
    addInt({data:d||A.today(), maquina:m, tipo:tp, corpo:corpoN(r['Corpo / Cor']), local:corpoN(r['Corpo / Cor']), estado:est, dataResolucao:dataDe(col(r,/^data resolu/i)), descricao:limpa(col(r,/identificada/i))||limpa(r['Tipo']), acao:limpa(col(r,/^a[cç][aã]o/i)), executante:limpa(r['Responsável'])||'—', responsavel:limpa(r['Responsável']), obs:limpa(r['Observações']), resultado:est==='Resolvida'?'ok':'nok'}, 'av|'+m+'|'+d+'|'+limpa(col(r,/identificada/i))+'|'+i) });
  /* trocas de rolos registadas na app (cópia .json com "logs") */
  Object.keys(app.logs||{}).forEach(function(k){ var m=M(/908/.test(k)?'R908 E':/105/.test(k)?'XL 105':/102|cd2/i.test(k)?'CD2':k);
    (app.logs[k]||[]).forEach(function(x,i){ addInt({data:dataDe(x.date)||A.today(), maquina:m, tipo:'Substituição de rolos', corpo:corpoN(x.unit), local:corpoN(x.unit), rolo:limpa(x.roll), estadoRolo:limpa(x.status), executante:limpa(x.operator).replace(/^Responsavel\s+/i,'')||'—', resultado:'ok', descricao:'Rolo substituído / alterado: '+limpa(x.roll)}, 'log|'+k+'|'+JSON.stringify(x)) }) });
  P.ints.forEach(function(x){ Object.keys(x.o).forEach(function(k){ if(x.o[k]===''||x.o[k]==null) delete x.o[k] }) });
  P.tec.forEach(function(x){ Object.keys(x.o).forEach(function(k){ if(x.o[k]===''||x.o[k]==null) delete x.o[k] }) });
  return P;
}

var XURL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function loadX(){ return window.XLSX? Promise.resolve() : new Promise(function(res,rej){ var s=document.createElement('script'); s.src=XURL; s.onload=res; s.onerror=rej; document.head.appendChild(s) }) }
async function lerFicheiro(f){
  var nome=f.name, out={libs:[], offset:null, erro:''};
  if(/\.xlsx?$/i.test(nome)){
    await loadX(); var wb=XLSX.read(await f.arrayBuffer(),{type:'array', cellStyles:true});
    var ns=wb.SheetNames.map(limpa);
    if(ns.some(function(n){ return /^avarias|^rolagem|^anilox/i.test(n) })){ out.offset={sheets:folhasXlsx(wb), logs:{}}; return out }
    wb.SheetNames.forEach(function(n){ var ws=wb.Sheets[n], a=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:'',blankrows:true}), ln=limpa(n);
      if(/retirar/i.test(ln)) return;   /* "XL105 Para retirar": lista de trabalho, não é a localização */
      var hi=a.findIndex(function(r){ return r.some(function(x){ return /desenho|deenho/i.test(limpa(x)) }) }); if(hi<0) return; var h=a[hi].map(function(x){return limpa(x).toLowerCase()});
      var ix=function(re){ return h.findIndex(function(x){ return re.test(x) }) }, iD=ix(/desenho|deenho/), iP=ix(/posi/), iS=ix(/^sap/), iR=ix(/reserva/), iE=ix(/entrada/), iU=ix(/usa na/), iC=ix(/^cor/);
      if(iS<0) iS=ix(/sap/); if(iR===iS) iR=-1;
      /* XL105: a cor da prateleira é a cor de fundo da célula da coluna COR */
      var o0=ws['!ref']? XLSX.utils.decode_range(ws['!ref']).s : {r:0,c:0};
      var fundo=function(i){ if(iC<0) return ''; var c=ws[XLSX.utils.encode_cell({r:o0.r+i, c:o0.c+iC})], rgb=c&&c.s&&c.s.fgColor&&c.s.fgColor.rgb; return rgb&&/^[0-9A-F]{6,8}$/i.test(rgb)? '#'+String(rgb).slice(-6).toUpperCase() : '' };
      var rows=a.slice(hi+1).map(function(r,j){ var d=limpa(r[iD]); if(!d||/desenho|deenho/i.test(d)) return null; var p=iP>=0? limpa(r[iP]) : ''; if(/^posi/i.test(p)) return null;
        var rv=iR>=0? limpa(r[iR]) : '', sr=iS>=0? limpa(r[iS]) : '', ms=/(\d{6,})\s*[-–]?\s*(.*)$/.exec(sr), sap=ms? ms[1] : sr.replace(/[^\d]/g,'');
        if(ms && ms[2] && !rv) rv=ms[2].trim(); if(!sap && /^\d{6,}$/.test(rv)){ sap=rv; rv='' }
        var cor=fundo(hi+1+j);
        if(iC>=0){ if(!cor) return null;   /* XL105: sem cor = não está no armário */
          return {desenho:d, sap:sap, pos:'', cor:cor, reserva:rv, obs:p, entrada:iE>=0?limpa(r[iE]):'', usaNa:iU>=0?limpa(r[iU]):''} }
        return {desenho:d, sap:sap, pos:/cd\s*2/i.test(ln)? posCD2(p) : p.toUpperCase(), reserva:/^reserva verniz$/i.test(rv)?'':rv, entrada:iE>=0?limpa(r[iE]):'', usaNa:iU>=0?limpa(r[iU]):''} }).filter(Boolean);
      if(!rows.length || ln===')') return;
      var lab=/cd\s*2/i.test(ln)?'CD2':maqLabelTitulo(ln)||maqLabelTitulo(limpa((a[0]||[])[0]))||ln;
      if(out.libs.some(function(l){ return l.maq===lab })) return;
      out.libs.push({maq:lab, rows:rows, fonte:nome+' › '+ln}) });
    return out;
  }
  var txt=await f.text();
  if(/\.html?$/i.test(nome)){
    var tit=(/<title>([^<]*)/i.exec(txt)||[])[1]||'';
    if(txt.indexOf('const APP=')>=0){ var app=jsonApos(txt,'const APP='); out.offset={sheets:app.sheets, logs:{}}; return out }
    var arr=jsonApos(txt,'const ORIGINAL='); if(!arr){ out.erro='não reconheço esta app'; return out }
    var xl=arr.some(function(r){ return r.cor }); out.libs.push({maq:xl?'XL 105':maqLabelTitulo(tit)||'R908 E', rows:xl?libDeXL(arr):libDe908(arr), fonte:nome}); return out;
  }
  var j=JSON.parse(txt);
  if(j && j.sheets){ out.offset={sheets:j.sheets, logs:j.logs||{}}; return out }
  if(Array.isArray(j)){ var xl2=j.some(function(r){ return r.cor }); out.libs.push({maq:xl2?'XL 105':maqLabelTitulo(nome)||'R908 E', rows:xl2?libDeXL(j):libDe908(j), fonte:nome}); return out }
  out.erro='formato desconhecido'; return out;
}
async function lote(items, fn){ for(var i=0;i<items.length;i+=20) await Promise.all(items.slice(i,i+20).map(fn)) }

function importar(){
  if(!(S.admin || A.can('tecnico') || A.can('stock'))){ A.toast('Só o técnico de impressão ou um editor importam.'); return }
  if(!S.db){ A.toast('Sem ligação à base de dados.'); return }
  A.showModal('<h2>Importar do supervisor de impressão</h2><p class="muted" style="margin:0">Escolha um ou vários ficheiros: as apps <b>Gestão de Cauchus</b> (Roland 908 E e XL 105) e <b>Offset Print</b> — o próprio .html ou a cópia .json feita com “Exportar cópia” (traz também as alterações feitas nesse computador) — e os Excel <b>Ficheiro de Consulta de cauchue 908 E</b> (folha CD2) e <b>Controlo do estado das máquinas</b>.</p>'+
    '<label class="fld">Ficheiros<input type="file" id="ipF" multiple accept=".html,.htm,.json,.xlsx,.xls"></label><div id="ipS" class="small"></div>'+
    '<div class="foot"><button class="btn" id="ipX">Fechar</button><button class="btn primary" id="ipOk" disabled>Importar</button></div>',
  function(){
    var plano=null; $('ipX').onclick=A.closeModal;
    $('ipF').onchange=async function(e){ var fs=Array.from(e.target.files||[]); if(!fs.length) return; $('ipS').textContent='A ler…'; $('ipOk').disabled=true;
      var libs=[], offs=[], erros=[];
      for(var i=0;i<fs.length;i++){ try{ var o=await lerFicheiro(fs[i]); if(o.erro) erros.push(fs[i].name+': '+o.erro); libs=libs.concat(o.libs); if(o.offset) offs.push(o.offset) }catch(err){ console.error(err); erros.push(fs[i].name+': não foi possível ler') } }
      /* a mesma máquina em dois ficheiros: fica o primeiro .json/.html (mais recente que o Excel) */
      var porM={}; libs.forEach(function(l){ var id=R.maqDe(l.maq); if(!porM[id] || /\.xlsx?/i.test(porM[id].fonte)&&!/\.xlsx?/i.test(l.fonte)) porM[id]=Object.assign({id:id},l) });
      var off=null; offs.forEach(function(o){ var p=planoOffset(o); if(!off) off=p; else { off.ints=off.ints.concat(p.ints); off.tec=off.tec.concat(p.tec); Object.assign(off.maqs,p.maqs) } });
      if(off){ var vis={}; off.ints=off.ints.filter(function(x){ if(vis[x.id]) return false; vis[x.id]=1; return true }); off.tec=off.tec.filter(function(x){ if(vis[x.id]) return false; vis[x.id]=1; return true }) }
      plano={libs:Object.keys(porM).map(function(k){return porM[k]}), off:off};
      var ok=function(id){ return A.get('maquinas',id)? '<span class="pill ok">'+esc(A.mName(id))+'</span>' : '<span class="pill warn">máquina “'+esc(id)+'” não existe nos Dados mestre — fica com este nome</span>' };
      var h=plano.libs.map(function(l){ var atual=R.lib().filter(function(r){return r.maq===l.id}).length; return '<div>• Reservas de verniz <b>'+esc(l.maq)+'</b>: '+fmt(l.rows.length,0)+' cortantes → '+ok(l.id)+(atual?' <span class="small muted">(substitui as '+fmt(atual,0)+' atuais)</span>':'')+'<div class="small muted" style="margin-left:12px">'+esc(l.fonte)+'</div></div>' });
      if(off){ var c={}; off.tec.forEach(function(x){ c[x.o.tipo]=(c[x.o.tipo]||0)+1 });
        h.push('<div>• Offset Print: <b>'+off.ints.length+'</b> intervenções (estado mecânico, avarias, trocas de rolos), '+(c.rolo||0)+' rolos, '+(c.consumivel||0)+' consumíveis, '+(c.corpo||0)+' corpos, '+(c.anilox||0)+' anilox, '+(c.alceamento||0)+' registos de alceamento'+(c.nota?', notas':'')+'.</div><div class="small" style="margin-left:12px">Máquinas: '+Object.keys(off.maqs).map(function(k){ return esc(k)+' → '+ok(off.maqs[k]) }).join(' ')+'</div>') }
      if(erros.length) h.push('<div style="color:var(--bad)">'+erros.map(esc).join('<br>')+'</div>');
      $('ipS').innerHTML=h.join('')||'Nada para importar nestes ficheiros.'; $('ipOk').disabled=!(plano.libs.length||off);
    };
    $('ipOk').onclick=async function(){ var b=this; b.disabled=true;
      try{
        for(var i=0;i<plano.libs.length;i++){ var l=plano.libs[i]; $('ipS').innerHTML+='<div>A gravar reservas '+esc(l.maq)+'…</div>';
          var pref=R.nrm(l.maq).toUpperCase(); var base=[]; A.list('rv_lib').forEach(function(d){ (d.linhas||[]).forEach(function(r){ if(r.maq!==l.id) base.push(r) }) });
          var novas=l.rows.map(function(r,j){ var o={k:pref+'-'+('000'+(j+1)).slice(-4), maq:l.id}; Object.keys(r).forEach(function(k){ if(r[k]!==''&&r[k]!=null) o[k]=r[k] }); return o });
          await A.writeChunks('rv_lib', base.concat(novas));
          var ov=A.list('rv_libx').filter(function(d){ return d.maq===l.id || (d.k && novas.some(function(n){return n.k===d.k})) }); await lote(ov,function(d){ return S.db.doc('rv_libx/'+d.id).delete() });
          A.audit('rv_lib',l.id,'importar',{maquina:l.maq, linhas:novas.length, fonte:l.fonte}) }
        if(plano.off){ $('ipS').innerHTML+='<div>A gravar ficha técnica e intervenções…</div>';
          await lote(plano.off.tec,function(x){ return S.db.doc('imp_tec/'+x.id).set(Object.assign({criadoEm:new Date().toISOString(), criadoPor:S.uid||''},x.o)) });
          await lote(plano.off.ints,function(x){ var ja=A.get('intervencoes',x.id); return ja? Promise.resolve() : S.db.doc('intervencoes/'+x.id).set(Object.assign({criadoEm:new Date().toISOString(), criadoPor:S.uid||''},x.o)) });
          A.audit('imp_tec','offset','importar',{fichas:plano.off.tec.length, intervencoes:plano.off.ints.length}) }
        R.invalidar(); A.closeModal(); A.toast('Importação concluída.');
      }catch(err){ console.error(err); $('ipS').innerHTML+='<div style="color:var(--bad)">Não foi possível gravar tudo. Tente de novo.</div>'; b.disabled=false }
    };
  });
}
window.FichaTec={importar:importar, planoOffset:planoOffset, lerFicheiro:lerFicheiro, jsonApos:jsonApos};
})();
