/* Reservas de verniz — biblioteca dos cauchos de verniz recortados por cortante (desenho técnico):
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

/* ---------- vista ---------- */
A.register('verniz',{
  html:function(){
    var t=A.tab('rv','lib'), L=lib(), ms=maqOpts();
    var head=A.head({c:C,mod:'Impressão',title:'Reservas de verniz',p:'Cauchos de verniz recortados por cortante: em que posição estão guardados, número SAP e tipo de reserva. Procure pelo código do cortante ou pelo SAP.',
      acts:(podeEditar()?'<button class="btn" id="rvImp">Importar</button><button class="btn primary" id="rvNew">+ Nova reserva</button>':'')});
    var porM={}; L.forEach(function(r){ porM[r.maq]=(porM[r.maq]||0)+1 });
    var kp=A.kpis([{v:fmt(L.length,0),l:'Reservas na biblioteca'}].concat(Object.keys(porM).sort().slice(0,3).map(function(k){ return {v:fmt(porM[k],0),l:A.mName(k)} })));
    var tabs=A.tabs('rv',[['lib','Biblioteca'],['pos','Por posição'],['sob','Sobras de verniz (kg)']],t);
    if(t==='sob') return head+tabs+I.SOBRAS.html();
    var fm=fv('rvM',''), fp=fv('rvP',''), q=fv('rvQ','');
    var base=L.filter(function(r){ return !fm||r.maq===fm });
    if(!L.length) return head+kp+tabs+'<div class="panel empty"><p style="margin:0 0 10px">A biblioteca ainda está vazia.</p>'+(podeEditar()?'<p class="small muted" style="margin:0 0 12px">Importe as apps do supervisor (<b>Gestão de Cauchus Roland 908 E</b> e <b>XL 105</b>, ficheiros .html ou as cópias .json) e o Excel <b>Ficheiro de Consulta de cauchue 908 E</b> (folha CD2).</p><button class="btn primary" id="rvImp2">Importar agora</button>':'<p class="small muted">Peça ao técnico de impressão para importar a biblioteca.</p>')+'</div>';
    if(t==='pos'){
      var g={}; base.forEach(function(r){ var k=r.maq+'|'+posKey(r); (g[k]=g[k]||{maq:r.maq,pos:posKey(r),n:0,cor:r.cor}).n++ });
      var byM={}; Object.keys(g).forEach(function(k){ (byM[g[k].maq]=byM[g[k].maq]||[]).push(g[k]) });
      return head+kp+tabs+'<div class="filters"><select data-f="rvM">'+selOpts(ms,fm,'Todas as máquinas')+'</select></div>'+
        Object.keys(byM).sort().map(function(m){ return '<div class="panel" style="margin-bottom:14px"><h2 style="margin-bottom:10px">'+esc(A.mName(m))+'</h2><div class="tiles" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">'+
          byM[m].sort(function(a,b){ return String(a.pos).localeCompare(String(b.pos),'pt',{numeric:true}) }).map(function(p){ return '<button class="tile" data-pos="'+esc(m+'|'+p.pos)+'" style="min-height:64px"><b style="font-size:18px">'+(p.cor?sw(p.cor):'')+esc(posLabel(p.pos)||'Sem posição')+'</b><span>'+p.n+' reserva'+(p.n===1?'':'s')+'</span></button>' }).join('')+'</div></div>' }).join('');
    }
    var poss=Array.from(new Set(base.map(posKey))).filter(Boolean).sort(function(a,b){ return String(a).localeCompare(String(b),'pt',{numeric:true}) });
    var rows=procurar(q, base.filter(function(r){ return q || !fp || posKey(r)===fp }));
    var N=300, more=rows.length>N;
    return head+kp+tabs+
      '<div class="panel" style="margin-bottom:12px"><label class="fld full" style="margin:0"><span style="font:600 13px var(--f-cond,inherit)">Procurar cortante ou número SAP</span><input type="search" id="rvQ" data-f="rvQ" value="'+esc(q)+'" placeholder="Ex.: 2127A ou 130017414" autocomplete="off" style="font-size:22px;padding:12px 14px"></label></div>'+
      '<div class="filters"><select data-f="rvM">'+selOpts(ms,fm,'Todas as máquinas')+'</select><select data-f="rvP">'+selOpts(poss.map(function(p){return [p,posLabel(p)]}),fp,'Todas as posições')+'</select><span class="small muted">'+fmt(rows.length,0)+' resultado'+(rows.length===1?'':'s')+(more?' · a mostrar os primeiros '+N:'')+'</span></div>'+
      A.table(rows.slice(0,N).map(function(r){ return Object.assign({id:r._k},r) }),[
        {l:'Cortante',v:function(r){return '<b class="mono" style="font-size:16px">'+esc(r.desenho)+'</b>'}},
        {l:'Máquina',v:function(r){return esc(A.mName(r.maq))}},
        {l:'Posição',v:posHtml},
        {l:'SAP',v:function(r){return '<span class="mono">'+esc(r.sap||'–')+'</span>'}},
        {l:'Reserva',v:function(r){return esc(r.reserva||'–')+(r.usaNa?' <span class="pill info">usa na '+esc(r.usaNa)+'</span>':'')}},
        {l:'Observações',v:function(r){return '<span class="small">'+esc(r.obs||r.entrada||'')+'</span>'}}
      ],{click:1,empty:q?'Nenhuma reserva para “'+esc(q)+'”.':'Sem reservas nesta seleção.'});
  },
  bind:function(r){
    if(A.tab('rv','lib')==='sob'){ I.SOBRAS.bind(r); return }
    if($('rvNew')) $('rvNew').onclick=function(){ rvForm() };
    [$('rvImp'),$('rvImp2')].forEach(function(b){ if(b) b.onclick=function(){ window.FichaTec.importar() } });
    r.querySelectorAll('[data-pos]').forEach(function(b){ b.onclick=function(){ var p=b.dataset.pos.split('|'); F.rvM=p[0]; F.rvP=p[1]; F.rvQ=''; S.tabs.rv='lib'; A.render() } });
    A.bindRows(r,detalhe); bindFilters(r);
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
