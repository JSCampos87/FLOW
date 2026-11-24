/* Gestão de Cauchus (reservas de verniz) — biblioteca dos cauchos de verniz recortados por cortante (desenho técnico):
   em que máquina, em que posição/cor estão guardados, número SAP e tipo de reserva.
   Substitui as apps "Gestão de Cauchus" do supervisor (Roland 908 E, XL 105) e a folha CD2.
   Dados: coleção em blocos rv_lib (p0..pn, importação) + rv_libx (alterações individuais; _del = eliminado). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao, C='var(--c-imp)';
var fv=I.fv, F=I.F, selOpts=I.selOpts, bindFilters=I.bindFilters;

/* ---------- cores de arrumação (XL 105) ---------- */
var CORES={'#00B0F0':'Azul claro','#FFFFFF':'Branco','#C0C0C0':'Cinzento','#00FF99':'Verde menta','#CDFFFA':'Azul-gelo','#000099':'Azul escuro','#000000':'Preto','#996633':'Castanho',
  '#FFFF00':'Amarelo','#9A1A91':'Roxo','#F6BB00':'Laranja','#FFCCFF':'Rosa','#008E40':'Verde escuro','#FF00FF':'Magenta','#FF0000':'Vermelho','#66FF33':'Verde lima'};
function corNome(h){ h=String(h||'').toUpperCase(); return CORES[h]||h }
function sw(h){ return '<span style="display:inline-block;width:16px;height:16px;border-radius:4px;border:1px solid var(--line-2,#9aa);vertical-align:-3px;margin-right:6px;background:'+esc(h)+'"></span>' }
function posHtml(r){ return r.cor? sw(r.cor)+'<span>'+esc(corNome(r.cor))+'</span>'+(r.pos&&r.pos!==r.cor?' <span class="mono small">'+esc(r.pos)+'</span>':'') : '<b class="mono">'+esc(r.pos||'–')+'</b>' }
function posKey(r){ return r.cor? String(r.cor).toUpperCase() : (r.pos||'') }
function posLabel(k){ return /^#/.test(k)? corNome(k) : k }

/* ---------- máquina do supervisor -> máquina do FLOW ---------- */
var MALI={cd102:'cd2',heidelbergcd102:'cd2',r908e:'r908',roland908e:'r908',roland908:'r908',manrolandr908:'r908',r908:'r908',heidelbergxl105:'xl105',xl105:'xl105'};
function nrm(s){ return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'') }
function maqDe(label){
  var n=nrm(label), t=MALI[n]||n, ms=A.list('maquinas');
  var hit=ms.filter(function(m){ return nrm(m.nome)===t || nrm(m.modelo)===n || (m.aliases||[]).some(function(a){ return nrm(a)===n||nrm(a)===t }) })[0];
  if(!hit && A.canon){ var c=A.canon('maquina',label); hit=ms.filter(function(m){ return m.nome===c })[0] }
  if(!hit){ var dg=t.replace(/\D/g,''), lt=t.replace(/\d/g,''); if(dg) hit=ms.filter(function(m){ var x=nrm(m.nome); return m.setor==='Impressão' && x.replace(/\D/g,'')===dg && (!lt||x.replace(/\d/g,'')===lt||lt.indexOf(x.replace(/\d/g,''))>=0) })[0] }
  return hit? hit.id : (MALI[n]? MALI[n].toUpperCase() : String(label||'').trim());
}

/* ---------- dados ---------- */
var _c=null;
function lib(){
  var k=A.list('rv_lib').length+'|'+A.list('rv_libx').map(function(d){return d.id+(d.alteradoEm||d.criadoEm||'')}).join(); if(_c&&_c.k===k) return _c.v;
  var v=A.chunked('rv_lib','rv_libx','k'); _c={k:k,v:v}; return v;
}
function nq(s){ return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[\s\-]+/g,'') }
function procurar(q, rows){
  q=nq(q); if(!q) return rows;
  var r=rows.filter(function(x){ return nq(x.desenho).indexOf(q)>=0 || nq(x.sap).indexOf(q)>=0 });
  return r.sort(function(a,b){ var ea=nq(a.desenho)===q||nq(a.sap)===q||nq(a.desenho).slice(-q.length)===q, eb=nq(b.desenho)===q||nq(b.sap)===q||nq(b.desenho).slice(-q.length)===q; return ea===eb?0:ea?-1:1 });
}
/* códigos de cortante dentro de um texto (descrição do MM, nome do cortante): S0037B, M0035B, 2127A… */
function codigos(txt){ var o=[], re=/(?:^|[^A-Z0-9])([A-Z]?\d{4}[A-Z])(?![A-Z0-9])/g, m, t=String(txt||'').toUpperCase(); while((m=re.exec(t))) if(o.indexOf(m[1])<0) o.push(m[1]); return o }
function paraTexto(txt){
  var cs=codigos(txt); if(!cs.length) return [];
  return lib().filter(function(r){ var d=nq(r.desenho); return cs.some(function(c){ return d===c || (/^\d/.test(d) && c.slice(-5)===d) || (/^\d/.test(c) && d.slice(-5)===c) }) });
}
function podeEditar(){ return S.admin || A.can('tecnico') || A.can('stock') }

/* ---------- formulários ---------- */
function maqOpts(){ var ids={}; A.maquinas('Impressão').forEach(function(m){ ids[m.id]=m.nome }); lib().forEach(function(r){ if(r.maq&&!ids[r.maq]) ids[r.maq]=A.mName(r.maq) }); return Object.keys(ids).map(function(k){return [k,ids[k]]}).sort(function(a,b){return a[1]<b[1]?-1:1}) }
function rvForm(r, preMaq){
  if(!podeEditar()){ A.toast('Só o técnico de impressão, o stock ou um editor alteram a biblioteca.'); return }
  var edit=!!r, cores=Object.keys(CORES);
  A.openForm({title:edit?'Editar reserva · '+r.desenho:'Nova reserva de verniz', values:Object.assign({maq:preMaq||fv('rvM','')}, r||{}),
    fields:[
      {k:'maq',l:'Máquina',t:'select',req:1,o:maqOpts},
      {k:'desenho',l:'Cortante / desenho técnico',req:1,ph:'ex. 2127A ou S2127A'},
      {k:'sap',l:'Número SAP',ph:'ex. 130017414'},
      {k:'pos',l:'Posição',ph:'ex. D1, A-05',help:'Na XL 105 a arrumação é por cor: escolha a cor abaixo'},
      {k:'cor',l:'Cor de arrumação',t:'select',o:cores.map(function(h){return [h,corNome(h)]})},
      {k:'reserva',l:'Tipo de reserva',list:'dlRes',ph:'ex. BOCA 13MM, FUNDO GERAL'},
      {k:'entrada',l:'Entrada',ph:'ex. DT'},
      {k:'usaNa',l:'Usa-se também na',ph:'ex. UV'},
      {k:'obs',l:'Observações',t:'textarea',rows:2},
      {t:'html',html:'<datalist id="dlRes">'+Array.from(new Set(lib().map(function(x){return x.reserva}).filter(Boolean))).sort().map(function(x){return '<option value="'+esc(x)+'">'}).join('')+'</datalist>'}
    ],
    validate:function(x){ if(!x.pos && !x.cor) return 'Indique a posição ou a cor de arrumação.' },
    del: edit? function(){ return S.db.doc('rv_libx/'+A.idKey(r._k)).set({_del:true, alteradoEm:new Date().toISOString()}).then(function(){ A.audit('rv_libx',r._k,'eliminar',{desenho:r.desenho,maq:r.maq}) }) } : null,
    submit:function(x){ var k=edit? r._k : 'n'+Date.now().toString(36); x.k=k; if(edit) ['origem'].forEach(function(f){ if(r[f]) x[f]=r[f] }); return A.put('rv_libx',A.idKey(k),x) }});
}
function detalhe(k){
  var r=lib().filter(function(x){return x._k===k})[0]; if(!r) return;
  var mms=(S.hist.sap||[]).concat(S.hist.mm||[]).filter(function(m){ return paraTextoUm(r, (m.descricao||'')+' '+(m.cortante||'')) });
  var seen={}; mms=mms.filter(function(m){ if(seen[m.mm]) return false; seen[m.mm]=1; return true }).slice(0,12);
  A.showModal('<h2><span class="mono">'+esc(r.desenho)+'</span></h2><dl class="detail">'+
    [['Máquina',esc(A.mName(r.maq))],['Posição',posHtml(r)],['Número SAP','<span class="mono">'+esc(r.sap||'–')+'</span>'],['Tipo de reserva',esc(r.reserva||'–')],['Entrada',esc(r.entrada||'–')],['Usa-se também na',esc(r.usaNa||'–')]].map(function(x){ return '<div><dt>'+x[0]+'</dt><dd>'+x[1]+'</dd></div>' }).join('')+
    (r.obs?'<div class="full"><dt>Observações</dt><dd>'+esc(r.obs)+'</dd></div>':'')+'</dl>'+
    (mms.length?'<h3 style="font-size:16px;margin:12px 0 6px">Materiais (MM) com este cortante</h3>'+mms.map(function(m){ return '<div class="small"><a class="mono" href="#mm-'+encodeURIComponent(m.mm)+'">'+esc(m.mm)+'</a> · '+esc(m.descricao||'')+'</div>' }).join(''):'')+
    '<div class="foot"><button class="btn" id="rvX">Fechar</button>'+(podeEditar()?'<button class="btn primary" id="rvE">Editar</button>':'')+'</div>',
  function(){ $('rvX').onclick=A.closeModal; if($('rvE')) $('rvE').onclick=function(){ rvForm(r) } });
}
function paraTextoUm(r, txt){ var d=nq(r.desenho); return codigos(txt).some(function(c){ return d===c || (/^\d/.test(d) && c.slice(-5)===d) }) }

/* ---------- vista: Gestão de Cauchus (espelho das apps Roland 908 E / XL 105, um separador por máquina) ---------- */
function sapN(s){ var v=String(s==null?'':s).trim(); return /^\d+$/.test(v)? Number(v) : null }
function cmpSap(a,b,dir){ var x=sapN(a.sap), y=sapN(b.sap); if(x!==null&&y===null) return -1; if(x===null&&y!==null) return 1; if(x!==null&&y!==null&&x!==y) return dir==='desc'? y-x : x-y; return String(a.sap||'').localeCompare(String(b.sap||''),'pt',{numeric:true}) }
function porCor(rows){ return rows.some(function(r){ return r.cor }) }
function nomeTab(m){ var n=A.mName(m); return n||m }
A.register('verniz',{
  html:function(){
    var L=lib(), ed=podeEditar(), ms=Array.from(new Set(L.map(function(r){ return r.maq }))).sort(function(a,b){ return nomeTab(a).localeCompare(nomeTab(b),'pt',{numeric:true}) });
    var t=A.tab('rv', ms[0]||'sob'); if(t!=='sob' && ms.indexOf(t)<0) t=ms[0]||'sob';
    var xl=t!=='sob' && porCor(L.filter(function(r){ return r.maq===t }));
    var head=A.head({c:C,mod:'Impressão',title:t==='sob'?'Gestão de Cauchus':'Gestão de Cauchus — '+nomeTab(t),p:t==='sob'?'Sobras de verniz em kg.':'Consulta, pesquisa e manutenção '+(xl?'dos cauchus por cor.':'da lista de cortantes.'),
      acts:(ed?'<button class="btn" id="rvImp">Importar</button>'+(t!=='sob'?'<button class="btn primary" id="rvNew">+ Adicionar '+(xl?'cauchu':'cortante')+'</button>':''):'')});
    var tabs=A.tabs('rv',ms.map(function(m){ return [m,nomeTab(m)] }).concat([['sob','Sobras de verniz (kg)']]),t);
    if(t==='sob') return head+tabs+I.SOBRAS.html();
    if(!L.length) return head+tabs+'<div class="panel empty"><p style="margin:0 0 10px">A lista ainda está vazia.</p>'+(ed?'<p class="small muted" style="margin:0 0 12px">Importe as apps <b>Gestão de Cauchus</b> (Roland 908 E e XL 105, ficheiros .html ou as cópias .json) e o Excel <b>Ficheiro de Consulta de cauchue 908 E</b> (folha CD2).</p><button class="btn primary" id="rvImp2">Importar</button>':'')+'</div>';
    var base=L.filter(function(r){ return r.maq===t }), q=fv('rvQ',''), fp=fv('rvP',''), dir=fv('rvS','asc'), nq0=nq(q);
    if(fp && !base.some(function(r){ return posKey(r)===fp })) fp='';
    var rows=base.filter(function(r){ if(xl) return (!nq0||nq(r.desenho).indexOf(nq0)>=0||nq(r.sap).indexOf(nq0)>=0) && (!fp||posKey(r)===fp); if(nq0) return nq(r.desenho).indexOf(nq0)>=0||nq(r.sap).indexOf(nq0)>=0; return !fp||posKey(r)===fp });
    rows.sort(function(a,b){
      if(xl) return String(posKey(a)).localeCompare(String(posKey(b)))||String(a.desenho).localeCompare(String(b.desenho),'pt',{numeric:true})||cmpSap(a,b,dir);
      if(nq0){ var ea=nq(a.desenho)===nq0||nq(a.sap)===nq0, eb=nq(b.desenho)===nq0||nq(b.sap)===nq0; if(ea!==eb) return ea?-1:1 }
      return String(a.pos||'').localeCompare(String(b.pos||''),'pt',{numeric:true})||cmpSap(a,b,dir) });
    var poss=Array.from(new Set(base.map(posKey))).filter(Boolean).sort(function(a,b){ return String(a).localeCompare(String(b),'pt',{numeric:true}) });
    var kp=A.kpis([{v:fmt(base.length,0),l:'Registos na lista'},{v:fmt(poss.length,0),l:xl?'Cores':'Posições diferentes'},{v:fmt(rows.length,0),l:'Resultados apresentados'}]);
    var filtro= xl? '<div class="fld"><span>Filtrar apenas por cor</span><div class="gc-sw">'+poss.map(function(c){ return '<button type="button" data-cor="'+esc(c)+'" class="'+(c===fp?'on':'')+'" title="'+esc(posLabel(c))+'" style="background:'+esc(/^#/.test(c)?c:'var(--surface)')+'">'+(/^#/.test(c)?'':esc(c))+'</button>' }).join('')+'</div></div>'
      : '<label class="fld"><span>Filtrar por posição</span><select id="rvP">'+selOpts(poss.map(function(p){return [p,posLabel(p)]}),fp,'Todas as posições')+'</select></label>';
    var cols= xl? [
        {l:'Cor',v:function(r){ return r.cor? sw(r.cor)+'<span class="small">'+esc(corNome(r.cor))+'</span>' : esc(r.pos||'–') }},
        {l:'Desenho técnico',v:function(r){return '<b class="mono" style="font-size:15px">'+esc(r.desenho)+'</b>'}},
        {l:'Número SAP',v:function(r){return '<b class="mono">'+esc(r.sap||'—')+'</b>'}},
        {l:'Posição / observações',v:function(r){return esc([r.cor&&r.pos&&r.pos!==r.cor?r.pos:'',r.obs].filter(Boolean).join(' · ')||'—')}}]
      : [
        {l:'Posição',v:function(r){return '<b class="mono">'+esc(r.pos||'—')+'</b>'}},
        {l:'Número SAP',v:function(r){return '<b class="mono">'+esc(r.sap||'—')+'</b>'}},
        {l:'Cortante / desenho técnico',v:function(r){return '<span class="mono" style="font-size:15px">'+esc(r.desenho)+'</span>'}},
        {l:'Reserva de verniz',v:function(r){return esc(r.reserva||'—')}}].concat(
        base.some(function(r){ return r.entrada||r.usaNa||r.obs })? [{l:'Entrada / usa na / obs.',v:function(r){ return '<span class="small">'+esc([r.entrada,r.usaNa?'usa na '+r.usaNa:'',r.obs].filter(Boolean).join(' · ')||'')+'</span>' }}] : []);
    var lbl= q? rows.length+' resultado(s) para “'+esc(q.trim())+'”' : rows.length+' registo(s)'+(fp?(xl?' na cor ':' na posição ')+esc(posLabel(fp)):'');
    return head+tabs+kp+
      '<div class="panel"><div class="gc-ctl"><div class="wide"><label class="fld" for="rvQ"><span>Pesquisar por '+(xl?'desenho técnico':'cortante')+' ou número SAP</span></label><div class="gc-sl"><input id="rvQ" type="search" autocomplete="off" value="'+esc(q)+'" placeholder="'+(xl?'Ex.: S0001A ou 130017970':'Ex.: 2127A ou 130017414')+'"><button class="btn primary" id="rvGo">Pesquisar</button></div><div class="small muted" style="margin-top:6px">A pesquisa consulta a lista completa. Escreva o código; a posição correta aparece nos resultados.</div></div>'+
      filtro+
      '<label class="fld"><span>Ordenar SAP</span><select id="rvS"><option value="asc"'+(dir==='asc'?' selected':'')+'>Menor → maior</option><option value="desc"'+(dir==='desc'?' selected':'')+'>Maior → menor</option></select></label>'+
      '<div><button class="btn" id="rvClr">Limpar</button></div></div></div>'+
      '<div class="gc-sum"><span>'+lbl+'</span><span>'+(ed?'Clique numa linha para editar ou eliminar.':'Modo de consulta: para alterar registos é necessário perfil de técnico de impressão, stock ou editor.')+'</span></div>'+
      A.table(rows.map(function(r){ return Object.assign({id:r._k},r) }),cols,{click:1,max:2000,empty:'Não foram encontrados registos.'});
  },
  bind:function(r){
    if(A.tab('rv','')==='sob'){ I.SOBRAS.bind(r); [$('rvImp')].forEach(function(b){ if(b) b.onclick=function(){ window.FichaTec.importar() } }); return }
    var L=lib(), ms=Array.from(new Set(L.map(function(x){ return x.maq }))).sort(function(a,b){ return nomeTab(a).localeCompare(nomeTab(b),'pt',{numeric:true}) });
    var t=A.tab('rv', ms[0]||'sob'); if(ms.indexOf(t)<0) t=ms[0];
    if($('rvNew')) $('rvNew').onclick=function(){ rvForm(null,t) };
    [$('rvImp'),$('rvImp2')].forEach(function(b){ if(b) b.onclick=function(){ window.FichaTec.importar() } });
    var qi=$('rvQ'); if(qi){ qi.oninput=function(){ var p=qi.selectionStart; F.rvQ=qi.value; A.render(); var n=$('rvQ'); if(n){ n.focus(); try{ n.setSelectionRange(p,p) }catch(e){} } }; qi.onkeydown=function(e){ if(e.key==='Enter') e.preventDefault() } }
    if($('rvGo')) $('rvGo').onclick=function(){ F.rvQ=$('rvQ').value; A.render() };
    if($('rvP')) $('rvP').onchange=function(){ F.rvP=this.value; A.render() };
    if($('rvS')) $('rvS').onchange=function(){ F.rvS=this.value; A.render() };
    r.querySelectorAll('[data-cor]').forEach(function(b){ b.onclick=function(){ F.rvP=F.rvP===b.dataset.cor?'':b.dataset.cor; A.render() } });
    if($('rvClr')) $('rvClr').onclick=function(){ F.rvQ=''; F.rvP=''; A.render() };
    A.bindRows(r,detalhe);
  }
});

/* procura rápida (modo posto): só as reservas desta máquina */
function procuraRapida(mid){
  A.showModal('<h2>Reserva de verniz</h2><input type="search" id="rqQ" placeholder="Código do cortante ou SAP" autocomplete="off" style="font-size:26px;padding:14px;width:100%"><div id="rqR" style="margin-top:12px;max-height:55vh;overflow:auto"></div><div class="foot"><button class="btn" id="rqX">Fechar</button></div>',
  function(){ $('rqX').onclick=A.closeModal; var inp=$('rqQ'); inp.focus();
    inp.oninput=function(){ var v=inp.value.trim(); if(v.length<2){ $('rqR').innerHTML=''; return }
      var rs=procurar(v, lib().filter(function(r){ return !mid || r.maq===mid })), outras=!rs.length&&mid? procurar(v, lib()) : [];
      var card=function(r){ return '<div class="panel" style="margin-bottom:8px;display:flex;gap:16px;align-items:center"><div style="font:700 30px var(--f-cond,inherit);min-width:120px">'+posHtml(r)+'</div><div><b class="mono" style="font-size:18px">'+esc(r.desenho)+'</b> <span class="small muted">'+esc(A.mName(r.maq))+'</span><div class="small">SAP '+esc(r.sap||'–')+(r.reserva?' · '+esc(r.reserva):'')+'</div></div></div>' };
      $('rqR').innerHTML=rs.length? rs.slice(0,20).map(card).join('') : outras.length? '<p class="small muted">Não está nesta máquina. Noutras máquinas:</p>'+outras.slice(0,10).map(card).join('') : '<p class="muted">Sem resultados.</p>' };
  });
}

window.Reservas={lib:lib, maqDe:maqDe, paraTexto:paraTexto, posHtml:posHtml, procuraRapida:procuraRapida, corNome:corNome, nrm:nrm, invalidar:function(){ _c=null }};
})();
