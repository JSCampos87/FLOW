/* Laboratório (Qualidade): todos os ensaios numa tabela master, com botões rápidos por tipo.
   Tipos: características de cartolina (gramagem / espessura — controlo de cartolina, qualidade.js, coleção cartolinactrl),
   deslizamento de verniz, deslizamento de cartolina, rebentamento, força de vincos, COBB e outras características
   (coleção 'ensaios'). Cada ensaio: OF / cliente / MM / cartolina, campos próprios do tipo, medições à mão (até 20),
   valor objetivo, operador; gráfico com a linha do objetivo, comparação com ensaios anteriores do mesmo MM e
   folha de rosto em PT / ES / EN / FR (rosto.js). Rota #laboratorio (#ensaios e #cartolina vêm para aqui). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, C='var(--c-qual)', MOD='Qualidade', I=window.Impressao, Q2=window.Q2;
var fv=I.fv, selOpts=I.selOpts, bindFilters=I.bindFilters;

/* ícones (traço, 24×24) */
var ICO={
  ctrl:'<path d="M3 17 17 3l4 4L7 21z"/><path d="M7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2"/>',
  verniz:'<path d="M14 3l7 7-6.5 6.5-7-7z"/><path d="M7.5 9.5 3 14c-1.2 1.2-1.2 3 0 4.2l2.8 2.8c1.2 1.2 3 1.2 4.2 0l4.5-4.5"/>',
  cartolina:'<path d="M3 20h18L3 9z"/><path d="M7.5 12.2l3.4-1.5 1.5 3.4-3.4 1.5z"/><path d="M15 9l3 1.6M17.4 7.6 18 10.6l-3 .6"/>',
  rebent:'<path d="M12 2.5l1.8 4.6 4.7-1.9-1.9 4.7 4.6 1.8-4.6 1.8 1.9 4.7-4.7-1.9L12 21.5l-1.8-4.7-4.7 1.9 1.9-4.7L2.5 12.3l4.9-1.8-1.9-4.7 4.7 1.9z"/>',
  forca:'<path d="M3 19 12 6l9 13"/><path d="M12 6V2.5M9.5 4.5 12 2l2.5 2.5"/><path d="M6.5 19h11" stroke-dasharray="2 2.5"/>',
  cobb:'<path d="M12 3s6 7 6 11.2a6 6 0 0 1-12 0C6 10 12 3 12 3z"/><path d="M9.2 14.5a2.8 2.8 0 0 0 2.8 2.8"/>',
  caract:'<path d="M9 3h6M10 3v6.2L4.3 18.6A1.6 1.6 0 0 0 5.7 21h12.6a1.6 1.6 0 0 0 1.4-2.4L14 9.2V3"/><path d="M7 15h10"/>'
};
function ico(t){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[t]||ICO.caract)+'</svg>' }

/* tipo → nome, curto, cor, grandeza e unidade por omissão, decimais, mínimo de medições, critério, condições, campos próprios */
var TIPOS={
  verniz:{n:'Deslizamento de verniz',c:'Desl. verniz',cor:'var(--s2)',g:'Coeficiente de fricção cinética',u:'',d:3,min:5,crit:'min',cond:'100 mm/min',ex:['verniz']},
  cartolina:{n:'Deslizamento de cartolina',c:'Desl. cartolina',cor:'var(--s7)',g:'Coeficiente de fricção cinética',u:'',d:3,min:5,crit:'min',cond:'100 mm/min',ex:[]},
  rebent:{n:'Rebentamento',c:'Rebentamento',cor:'var(--s8)',g:'Rebentamento',u:'kPa',d:1,min:3,crit:'min',cond:'',ex:['lado']},
  forca:{n:'Força de vincos',c:'Força de vincos',cor:'var(--s4)',g:'Força de vinco',u:'N',d:2,min:5,crit:'ref',cond:'',ex:['sentido','cortante']},
  cobb:{n:'COBB',c:'COBB',cor:'var(--s1)',g:'Cobb 60',u:'g/m²',d:1,min:3,crit:'max',cond:'',ex:['face','tempo']},
  caract:{n:'Outras características',c:'Outras caract.',cor:'var(--s6)',g:'',u:'',d:2,min:3,crit:'ref',cond:'',ex:[]}
};
var CTRL={n:'Características de cartolina',c:'Caract. cartolina',cor:'var(--c-qual)'};   /* gramagem / espessura na receção */
var ORD=['verniz','cartolina','rebent','forca','cobb','caract'];
var EXTRA={verniz:{l:'Verniz',list:'eDlVz',full:1}, lado:{l:'Lado ensaiado',t:'select',o:['Interior','Exterior','Ambos']}, sentido:{l:'Sentido do vinco',t:'select',o:['Longitudinal','Transversal']},
  cortante:{l:'Cortante'}, face:{l:'Face',t:'select',o:['Frente','Verso']}, tempo:{l:'Tempo de contacto',t:'select',o:['60 s','120 s','1800 s']}};
var GRANDEZAS=[['Coeficiente de fricção cinética',''],['Coeficiente de fricção estática',''],['Rigidez','mN·m'],['Gramagem','g/m²'],['Espessura','µm'],['Humidade','%'],['Brancura','%'],
  ['Rebentamento','kPa'],['ECT','kN/m'],['BCT','N'],['Força de vinco','N'],['Cobb 60','g/m²'],['Cobb 1800','g/m²'],['Resistência à dobragem','']];
var CRIT=[['min','Mínimo — a média tem de ser ≥ objetivo'],['max','Máximo — a média tem de ser ≤ objetivo'],['ref','Referência — só mostra a linha no gráfico']];
var MAXM=20;

function okN(x){ return x!=null && x!=='' && isFinite(x) }
function lista(){ return A.list('ensaios') }
function T_(t){ return t==='ctrl'? CTRL : TIPOS[t]||TIPOS.caract }
function veredicto(m, obj, crit){ if(m==null||!okN(obj)||crit==='ref'||!crit) return null; return (crit==='min'? m>=obj : m<=obj)? 'ok' : 'nc' }
function resPill(r){ return r==='ok'?'<span class="pill ok">Conforme</span>':r==='nc'?'<span class="pill bad">Não conforme</span>':r==='at'?'<span class="pill warn">Leituras fora</span>':'<span class="pill mute">Sem critério</span>' }
function chip(t, nome){ var T=T_(t); return '<span class="labchip" style="--c:'+T.cor+'" title="'+esc(T.n)+'">'+ico(t)+(nome?'<span>'+esc(T.c)+'</span>':'')+'</span>' }
function dec(e){ return e.dec!=null? e.dec : (TIPOS[e.tipo]||{}).d||2 }
/* número: ENS-AAAA-NNN (sequência por ano, todos os tipos) */
function numero(data){ var y=String(data||A.today()).slice(0,4), mx=0; lista().forEach(function(e){ var m=/^ENS-(\d{4})-(\d+)$/.exec(e.numero||''); if(m&&m[1]===y) mx=Math.max(mx,+m[2]) }); return 'ENS-'+y+'-'+('00'+(mx+1)).slice(-3) }
function canon(t,v){ return A.canon? A.canon(t,v) : v }
function novo(t){ if(t==='ctrl'){ if(Q2.cartForm) Q2.cartForm(); return } ensForm(null,t) }

/* ---------- formulário ---------- */
function escolherTipo(){
  A.showModal('<h2>Novo ensaio</h2><p class="muted" style="margin:-6px 0 0">Escolha o tipo de ensaio.</p><div class="labtiles">'+
    ['ctrl'].concat(ORD).map(function(t){ var T=T_(t); return '<button class="labt" style="--c:'+T.cor+'" data-t="'+t+'">'+ico(t)+'<b>'+esc(T.n)+'</b><small>'+esc(t==='ctrl'?'Gramagem e espessura na receção':T.g? T.g+(T.u?' ('+T.u+')':'') : 'Rigidez, humidade, brancura…')+'</small></button>' }).join('')+'</div>'+
    '<div class="foot"><button class="btn" id="eTx">Cancelar</button></div>',
    function(){ $('eTx').onclick=A.closeModal; document.querySelectorAll('[data-t]').forEach(function(b){ b.onclick=function(){ novo(b.dataset.t) } }) });
}
function ensForm(v, tipo){
  var edit=!!(v&&v.id), t=(v&&v.tipo)||tipo||'verniz', T=TIPOS[t]||TIPOS.caract;
  var val=Object.assign({data:A.today(), grandeza:T.g, unidade:T.u, criterio:T.crit, condicoes:T.cond}, v||{}, {tipo:t});
  var meds=(v&&v.medicoes||[]).slice(); while(meds.length<T.min) meds.push(null);
  var all=lista(), cart=[];
  try{ cart=Q2.lib? Q2.lib().map(function(l){ return l[1] }) : [] }catch(e){}
  var dlx=function(id,arr){ return Q2.dl? Q2.dl(id,arr) : '' };
  var extra=Object.keys(EXTRA).map(function(k){ return Object.assign({k:k},EXTRA[k]) });
  var fields=[
    {k:'tipo',l:'Tipo de ensaio',t:'select',o:ORD.map(function(k){return [k,TIPOS[k].n]}),req:1},
    {k:'data',l:'Data do ensaio',t:'date',req:1},
    {k:'of',l:'OF'},
    {k:'mm',l:'MM'},
    {k:'cliente',l:'Cliente',list:'eDlCli',req:1},
    {k:'artigo',l:'Artigo / descrição',full:1},
    {k:'cartolina',l:'Cartolina',list:'eDlCart',full:1}].concat(extra,[
    {k:'grandeza',l:'Grandeza medida',list:'eDlGr',req:1},
    {k:'unidade',l:'Unidade',ph:'ex.: kPa, g/m², N'},
    {k:'condicoes',l:'Condições do ensaio',ph:'ex.: 100 mm/min, 23 °C, 50% HR'},
    {k:'criterio',l:'Critério',t:'select',o:CRIT,req:1},
    {k:'objetivo',l:'Valor objetivo',t:'number',req:1,help:'Aparece como linha no gráfico.'},
    {k:'operador',l:'Quem fez o ensaio',list:'eDlOp',req:1},
    {t:'html',html:'<small id="eHint" class="muted"></small>'+
      '<div class="sep" style="margin-top:4px">Medições <span class="small muted" id="eMinT"></span></div><div class="meas" id="eM"></div>'+
      '<div style="display:flex;gap:8px;margin-top:6px"><button type="button" class="btn sm" id="eAdd">+ Medição</button><button type="button" class="btn sm" id="eRem">− Medição</button></div>'+
      '<div class="live" id="eML"></div><div id="eCh" style="margin-top:8px"></div>'+
      dlx('eDlCli',all.map(function(e){return e.cliente}).concat(A.list('incidencias').map(function(i){return i.cliente})))+
      dlx('eDlCart',all.map(function(e){return e.cartolina}).concat(cart))+
      dlx('eDlVz',all.map(function(e){return e.verniz}))+
      dlx('eDlGr',GRANDEZAS.map(function(g){return g[0]}).concat(all.map(function(e){return e.grandeza})))+
      dlx('eDlOp',all.map(function(e){return e.operador}).concat(A.operadores('Qualidade').map(function(o){return o.nome})))},
    {k:'obs',l:'Observações',t:'textarea',rows:3}]);
  A.openForm({ title:(edit?'Editar ensaio ':'Novo ensaio · '+T.n)+(edit&&v.numero?' '+v.numero:''), values:val, noFocus:true, fields:fields,
    after:function(box){
      var cur=function(){ return TIPOS[$('f_tipo').value]||T };
      var draw=function(){
        var g=$('eM'); g.innerHTML=meds.map(function(x,i){ return '<input inputmode="decimal" aria-label="Medição '+(i+1)+'" placeholder="'+(i+1)+'" value="'+(x!=null?esc(String(x).replace('.',',')):'')+'">' }).join('');
        g.querySelectorAll('input').forEach(function(inp,i){
          inp.addEventListener('input',function(){ meds[i]=A.num(inp.value); live() });
          inp.addEventListener('keydown',function(e){ if(e.key!=='Enter') return; e.preventDefault(); var nx=g.querySelectorAll('input')[i+1]; if(nx) nx.focus(); else if(meds.length<MAXM){ meds.push(null); draw(); g.querySelectorAll('input')[i+1].focus() } });
        });
        live();
      };
      var live=function(){
        var c=cur(), d=c.d, obj=A.num($('f_objetivo').value), crit=$('f_criterio').value, x=meds.filter(okN), m=A.mean(x), r=veredicto(m,obj,crit);
        $('eMinT').textContent='— mínimo '+c.min+', até '+MAXM;
        $('eM').querySelectorAll('input').forEach(function(inp,i){ var y=meds[i]; inp.classList.toggle('out', okN(y)&&okN(obj)&&((crit==='min'&&y<obj)||(crit==='max'&&y>obj))) });
        $('eML').innerHTML=x.length? '<span>n <b>'+x.length+'</b></span><span>média <b>'+fmt(m,d)+'</b></span><span>desvio <b>'+fmt(A.sd(x),d)+'</b></span><span>mín <b>'+fmt(Math.min.apply(null,x),d)+'</b></span><span>máx <b>'+fmt(Math.max.apply(null,x),d)+'</b></span>'+(r?' '+resPill(r):'') : '';
        $('eCh').innerHTML=x.length && Q2.medChart? Q2.medChart({vals:meds, obj:obj, crit:crit, dec:d, unit:$('f_unidade').value, w:620, h:220}) : '';
      };
      var tipoCh=function(first){
        var c=cur(); Object.keys(EXTRA).forEach(function(k){ $('f_'+k).closest('.fld').hidden=c.ex.indexOf(k)<0 });
        if(!first){ ['grandeza','unidade','condicoes'].forEach(function(k){ var el=$('f_'+k), d={grandeza:c.g,unidade:c.u,condicoes:c.cond}[k]; if(el.value.trim()===''||el.dataset.def===el.value){ el.value=d; el.dataset.def=d } });
          var cr=$('f_criterio'); if(cr.dataset.def===cr.value||!cr.value) cr.value=c.crit; cr.dataset.def=c.crit;
          while(meds.length<c.min) meds.push(null); draw() }
      };
      ['grandeza','unidade','condicoes','criterio'].forEach(function(k){ $('f_'+k).dataset.def=$('f_'+k).value });
      $('f_tipo').onchange=function(){ tipoCh(false) };
      /* COBB: o tempo de contacto dá o nome da grandeza (Cobb 60 / Cobb 1800) */
      $('f_tempo').addEventListener('change',function(){ var g=$('f_grandeza'), n='Cobb '+parseInt($('f_tempo').value,10); if(/^cobb/i.test(g.value)||!g.value){ g.value=n; g.dataset.def=n } });
      $('f_grandeza').addEventListener('change',function(){ var g=GRANDEZAS.filter(function(x){ return x[0].toLowerCase()===$('f_grandeza').value.trim().toLowerCase() })[0]; if(g && ($('f_unidade').value.trim()===''||$('f_unidade').dataset.def===$('f_unidade').value)){ $('f_unidade').value=g[1]; $('f_unidade').dataset.def=g[1]; live() } });
      ['objetivo','criterio','unidade'].forEach(function(k){ $('f_'+k).addEventListener('input',live); $('f_'+k).addEventListener('change',live) });
      $('eAdd').onclick=function(){ if(meds.length<MAXM){ meds.push(null); draw(); var l=$('eM').querySelectorAll('input'); l[l.length-1].focus() } };
      $('eRem').onclick=function(){ if(meds.length>1){ meds.pop(); draw() } };
      /* OF / MM → cliente, MM e artigo (como nas FII / FIQ) */
      var KS=['mm','cliente','artigo'], run=function(src){
        if(!Q2.ofInfo) return; var fOf=$('f_of'), fMm=$('f_mm'), info=Q2.ofInfo(fOf.value, src==='of'&&fMm.dataset.auto===fMm.value? '' : fMm.value), n=[];
        KS.forEach(function(k){ var el=$('f_'+k); if(!el||!info[k]) return; if(el.value.trim()===''||el.dataset.auto===el.value){ if(el.value!==info[k]) n.push(k); el.value=info[k]; el.dataset.auto=info[k] } });
        if(info.cortante && $('f_cortante').value.trim()==='') $('f_cortante').value=info.cortante;
        $('eHint').textContent=n.length? 'Preenchido a partir da '+(src==='of'?'OF':'MM')+': '+n.map(function(k){return {mm:'MM',cliente:'cliente',artigo:'artigo'}[k]}).join(', ')+'.' : (fOf.value.trim()||fMm.value.trim())&&!info.mm&&!info.cliente? 'Sem dados conhecidos para esta OF / MM — preencha à mão.' : '';
      };
      $('f_of').addEventListener('change',function(){ run('of') }); $('f_mm').addEventListener('change',function(){ run('mm') });
      tipoCh(true); draw();
    },
    validate:function(x){ var c=TIPOS[x.tipo]||T, n=meds.filter(okN).length; if(n<c.min) return 'Faltam medições: '+n+' de '+c.min+' (mínimo).'; },
    submit:function(x){
      var c=TIPOS[x.tipo]||T, m=meds.slice(); while(m.length && !okN(m[m.length-1])) m.pop();
      var y=m.filter(okN), o=Object.assign({},x,{medicoes:m, dec:c.d});
      Object.keys(EXTRA).forEach(function(k){ if(c.ex.indexOf(k)<0) o[k]='' });
      o.cliente=canon('cliente',o.cliente); o.operador=canon('operador',o.operador);
      o.media=A.mean(y); o.desvio=A.sd(y); o.min=Math.min.apply(null,y); o.max=Math.max.apply(null,y); o.n=y.length;
      o.resultado=veredicto(o.media,o.objetivo,o.criterio);
      if(edit) return A.put('ensaios',v.id,Object.assign({},A.clean(v),o));
      o.numero=numero(o.data); return A.add('ensaios',o);
    },
    del: edit && A.can('qualidade')? function(){ return A.del('ensaios',v.id) } : null
  });
}

/* ---------- detalhe ---------- */
function detalhe(id){
  var e=A.get('ensaios',id); if(!e) return;
  var d=dec(e), m=e.medicoes||[], row=function(l,v){ return v==null||v===''? '' : '<div><dt>'+l+'</dt><dd>'+esc(v)+'</dd></div>' };
  var hist=lista().filter(function(x){ return x.tipo===e.tipo && (x.mm||x.cartolina) && (x.mm||x.cartolina)===(e.mm||e.cartolina) && A.norm(x.grandeza||'')===A.norm(e.grandeza||'') && x.media!=null }).sort(function(a,b){ return (a.data+(a.numero||''))<(b.data+(b.numero||''))?-1:1 }).slice(-10);
  A.showModal('<h2>'+chip(e.tipo,1)+' <span class="mono">'+esc(e.numero||'')+'</span> '+resPill(e.resultado)+'</h2><dl class="detail">'+
    row('Data',fdate(e.data))+row('Cliente',e.cliente)+row('OF',e.of)+row('MM',e.mm)+row('Artigo',e.artigo)+row('Cartolina',e.cartolina)+
    Object.keys(EXTRA).map(function(k){ return row(EXTRA[k].l,e[k]) }).join('')+
    row('Ensaio',(e.grandeza||'')+(e.unidade?' ('+e.unidade+')':''))+row('Condições',e.condicoes)+row('Objetivo',okN(e.objetivo)? fmt(e.objetivo,d)+(e.unidade?' '+e.unidade:'')+' · '+({min:'mínimo',max:'máximo',ref:'referência'}[e.criterio]||'') : '')+
    row('Média',fmt(e.media,d)+(e.unidade?' '+e.unidade:''))+row('Desvio padrão',fmt(e.desvio,d))+row('Operador',e.operador)+'</dl>'+
    '<div class="tw"><table class="t"><thead><tr>'+m.map(function(x,i){return '<th class="n">'+(i+1)+'</th>'}).join('')+'</tr></thead><tbody><tr>'+m.map(function(x){ var b=okN(x)&&okN(e.objetivo)&&((e.criterio==='min'&&x<e.objetivo)||(e.criterio==='max'&&x>e.objetivo)); return '<td class="n" style="'+(b?'color:var(--bad);font-weight:600':'')+'">'+(okN(x)?fmt(x,d):'')+'</td>' }).join('')+'</tr></tbody></table></div>'+
    '<div class="grid2" style="margin-top:10px"><div class="panel" style="padding:10px"><h3 style="margin:0 0 4px;font-size:15px">Medições vs objetivo</h3>'+Q2.medChart({vals:m, obj:e.objetivo, crit:e.criterio, dec:d, unit:e.unidade, w:560, h:220})+'</div>'+
    (hist.length>1? '<div class="panel" style="padding:10px"><h3 style="margin:0 0 4px;font-size:15px">Comparação — '+esc(e.mm||e.cartolina)+'</h3>'+Q2.medChart({vals:hist.map(function(x){return x.media}), xl:hist.map(function(x){return fdate(x.data).slice(0,5)}), cur:hist.map(function(x){return x.id}).indexOf(e.id), bars:true, obj:e.objetivo, crit:e.criterio, dec:d, w:560, h:220, xt:'Média por ensaio'})+'</div>' : '')+'</div>'+
    (e.obs?'<p><b>Observações:</b> '+esc(e.obs)+'</p>':'')+
    '<div class="foot"><button class="btn" id="eX">Fechar</button><button class="btn" id="eDup">Repetir ensaio</button><button class="btn" id="eP">Folha de rosto (PT / ES / EN / FR)</button><button class="btn primary" id="eE">Editar</button></div>',
    function(){ $('eX').onclick=A.closeModal; $('eE').onclick=function(){ ensForm(e) }; $('eP').onclick=function(){ Q2.rosto('ENS',e) };
      $('eDup').onclick=function(){ var c=A.clean(e); ['numero','medicoes','media','desvio','min','max','n','resultado','obs','criadoEm','criadoPor','alteradoEm'].forEach(function(k){ delete c[k] }); c.data=A.today(); ensForm(c) } });
}

/* ---------- tabela master: ensaios + controlos de cartolina ---------- */
function master(){
  var r=lista().map(function(e){ return {id:e.id, tipo:e.tipo, numero:e.numero, data:e.data, cliente:e.cliente, artigo:e.artigo, of:e.of, mm:e.mm, cartolina:e.cartolina, verniz:e.verniz,
    grandeza:e.grandeza, det:[e.lado,e.sentido,e.face].filter(Boolean).join(' · '), unidade:e.unidade, media:e.media, objetivo:e.objetivo, criterio:e.criterio, d:dec(e), operador:e.operador, resultado:e.resultado} });
  A.list('cartolinactrl').forEach(function(c){ r.push({id:'k:'+c.id, tipo:'ctrl', numero:c.numero, data:c.data, cliente:c.fornecedor, artigo:'', of:'', mm:c.mm, cartolina:c.nome, verniz:'', grandeza:'Gramagem / espessura', det:c.lote?'Lote '+c.lote:'', unidade:'g/m²', media:c.gMedia, objetivo:c.g, criterio:'nom', d:1, operador:c.analista, resultado:c.resultado, extra:c.eMedia!=null? fmt(c.eMedia,0)+' µm' : ''}) });
  return r.sort(function(a,b){ var x=(a.data||'')+(a.numero||''), y=(b.data||'')+(b.numero||''); return x<y?1:x>y?-1:0 });
}
function cols(){
  return [{l:'Tipo',v:function(r){return chip(r.tipo)}},
    {l:'N.º / data',v:function(r){return '<span class="mono" style="white-space:nowrap">'+esc(r.numero||'–')+'</span><div class="small muted">'+fdate(r.data)+'</div>'}},
    {l:'Ensaio',v:function(r){return '<b>'+esc(T_(r.tipo).c)+'</b><div class="small muted">'+esc([r.grandeza,r.det].filter(Boolean).join(' · '))+'</div>'}},
    {l:'Cliente / fornecedor',v:function(r){return '<b>'+esc(r.cliente||'–')+'</b><div class="small muted">'+esc((r.artigo||'').slice(0,44))+'</div>'}},
    {l:'OF · MM',v:function(r){return '<span class="mono">'+esc([r.of,r.mm].filter(Boolean).join(' · ')||'–')+'</span>'}},
    {l:'Cartolina / verniz',v:function(r){return esc(r.cartolina||'–')+(r.verniz?'<div class="small muted">'+esc(r.verniz)+'</div>':'')}},
    {l:'Média / objetivo',n:1,v:function(r){return '<b>'+fmt(r.media,r.d)+'</b>'+(r.unidade?' <span class="small muted">'+esc(r.unidade)+'</span>':'')+'<div class="small muted">'+(okN(r.objetivo)?(r.criterio==='nom'?'nominal ':r.criterio==='max'?'≤ ':r.criterio==='min'?'≥ ':'ref. ')+fmt(r.objetivo,r.d):'')+(r.extra?' · '+esc(r.extra):'')+'</div>'}},
    {l:'Operador',v:function(r){return esc(r.operador||'–')}},
    {l:'Resultado',v:function(r){return resPill(r.resultado)}}];
}

/* ---------- exportar Excel ---------- */
async function exportar(){
  try{ await Q2.loadX() }catch(e){ A.toast('Não foi possível carregar o leitor de Excel.'); return }
  var wb=XLSX.utils.book_new(), nm=0; lista().forEach(function(e){ nm=Math.max(nm,(e.medicoes||[]).length) });
  var M=[]; for(var i=1;i<=nm;i++) M.push('Medição '+i);
  var cab=['N.º','Data','Tipo','OF','Cliente','MM','Artigo','Cartolina'].concat(Object.keys(EXTRA).map(function(k){return EXTRA[k].l}),['Ensaio','Unidade','Condições','Critério','Objetivo'],M,['Média','Desvio padrão','Mínimo','Máximo','Resultado','Operador','Observações']);
  var linha=function(e){ return [e.numero,e.data,T_(e.tipo).n,e.of,e.cliente,e.mm,e.artigo,e.cartolina].concat(Object.keys(EXTRA).map(function(k){return e[k]}),[e.grandeza,e.unidade,e.condicoes,{min:'Mínimo',max:'Máximo',ref:'Referência'}[e.criterio]||'',e.objetivo],
    M.map(function(x,i){ var v=(e.medicoes||[])[i]; return okN(v)? v : '' }),[e.media,e.desvio,e.min,e.max,{ok:'Conforme',nc:'Não conforme'}[e.resultado]||'',e.operador,e.obs]).map(function(v){ return v==null? '' : v }) };
  var todos=lista().slice().sort(function(a,b){ return (a.data||'')<(b.data||'')?-1:1 });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cab].concat(todos.map(linha))), 'Todos');
  ORD.forEach(function(t){ var r=todos.filter(function(e){return e.tipo===t}); if(r.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cab].concat(r.map(linha))), TIPOS[t].c.replace(/\./g,'')) });
  var ct=A.list('cartolinactrl').slice().sort(function(a,b){ return (a.data||'')<(b.data||'')?-1:1 }), n20=[]; for(var j=1;j<=20;j++) n20.push(j);
  if(ct.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['N.º','Data','Fornecedor','Cartolina','MM','Lote','Palete','Analista','Gram. nominal','Gram. mín','Gram. máx'].concat(n20.map(function(j){return 'G'+j}),['Gram. média','Esp. nominal','Esp. mín','Esp. máx'],n20.map(function(j){return 'E'+j}),['Esp. média','Resultado','Observações'])]
    .concat(ct.map(function(c){ return [c.numero,c.data,c.fornecedor,c.nome,c.mm,c.lote,c.palete,c.analista,c.g,c.gMin,c.gMax].concat(n20.map(function(j){ var v=(c.gram||[])[j-1]; return okN(v)?v:'' }),[c.gMedia,c.e,c.eMin,c.eMax],n20.map(function(j){ var v=(c.esp||[])[j-1]; return okN(v)?v:'' }),[c.eMedia,{ok:'Conforme',at:'Leituras fora',nc:'Não conforme'}[c.resultado]||'',c.obs]).map(function(v){ return v==null?'':v }) }))), 'Caract cartolina');
  XLSX.writeFile(wb, 'FLOW_Laboratorio_'+A.today()+'.xlsx'); A.toast('Exportado ('+(todos.length+ct.length)+' ensaios).');
}

/* ---------- página ---------- */
var LF={tipo:''};   /* botão rápido escolhido */
A.register('laboratorio',{
  html:function(){
    var t=A.tab('lab','hist'), all=master(), q=fv('eq','').toLowerCase(), d90=all.filter(function(e){return A.days(e.data)<=90});
    var comR=d90.filter(function(e){return e.resultado}), nc=d90.filter(function(e){return e.resultado==='nc'}).length;
    var proc=function(r){ return !q || [r.numero,r.of,r.mm,r.cliente,r.artigo,r.cartolina,r.verniz,r.grandeza,r.operador,r.det].join(' ').toLowerCase().indexOf(q)>=0 };
    var cont={}; all.forEach(function(r){ var c=cont[r.tipo]=cont[r.tipo]||{n:0,u:''}; c.n++; if((r.data||'')>c.u) c.u=r.data });
    /* botões rápidos: filtrar a tabela (clique) ou começar um ensaio desse tipo (+) */
    var tiles='<div class="labtiles">'+['ctrl'].concat(ORD).map(function(k){ var T=T_(k), c=cont[k]||{n:0};
      return '<div class="labt'+(LF.tipo===k?' on':'')+'" style="--c:'+T.cor+'" role="button" tabindex="0" data-lt="'+k+'" aria-pressed="'+(LF.tipo===k)+'">'+ico(k)+'<b>'+esc(T.n)+'</b><small>'+c.n+' ensaio'+(c.n===1?'':'s')+(c.u?' · último '+fdate(c.u).slice(0,5):'')+'</small>'+
        '<button class="labplus" data-ln="'+k+'" title="Novo: '+esc(T.n)+'" aria-label="Novo ensaio: '+esc(T.n)+'">+</button></div>' }).join('')+'</div>';
    var body='';
    if(t==='hist'){
      var fr=fv('er','');
      var rows=all.filter(function(r){ return proc(r) && (!LF.tipo||r.tipo===LF.tipo) && (!fr||(fr==='sem'? !r.resultado : r.resultado===fr)) });
      body=tiles+'<div class="filters"><input type="search" id="eq" data-f="eq" placeholder="Procurar N.º, OF, MM, cliente, cartolina, operador…" value="'+esc(fv('eq',''))+'">'+
        '<select data-f="er">'+selOpts([['ok','Conforme'],['nc','Não conforme'],['at','Leituras fora'],['sem','Sem critério']],fr,'Todos os resultados')+'</select>'+
        (LF.tipo?'<button class="btn sm" data-lt="">Mostrar todos os tipos</button>':'')+'</div>'+
        A.table(rows,cols(),{click:1,empty:LF.tipo? 'Ainda sem ensaios deste tipo. Use o “+” no botão do tipo.' : 'Ainda sem ensaios. Registe o primeiro com “+ Novo ensaio”.'});
    } else if(t==='cmp'){
      var ct=fv('ect','verniz'), rs=all.filter(function(r){ return r.tipo===ct && proc(r) });
      var chaves={}; rs.forEach(function(r){ var k=r.mm||r.cartolina; if(!k) return; var key=k+'|'+(r.grandeza||''); (chaves[key]=chaves[key]||{k:key,l:k+(r.cliente?' · '+r.cliente:'')+(ct==='caract'||ct==='ctrl'?'':' · '+(r.grandeza||'')),n:0,u:r.data}).n++ });
      var ks=Object.keys(chaves).map(function(k){return chaves[k]}).sort(function(a,b){ return a.u<b.u?1:-1 }), sel=fv('ek_'+ct,''); if(!chaves[sel]) sel=ks[0]?ks[0].k:'';
      var sp=sel.split('|'), serie=rs.filter(function(r){ return (r.mm||r.cartolina)===sp[0] && (r.grandeza||'')===(sp[1]||'') && r.media!=null }).slice().reverse().slice(-15), ult=serie[serie.length-1]||{};
      body='<div class="filters"><select data-f="ect">'+selOpts(['ctrl'].concat(ORD).map(function(k){return [k,T_(k).n]}),ct)+'</select>'+(ks.length?'<select data-f="ek_'+ct+'">'+selOpts(ks.map(function(k){return [k.k,k.l+' ('+k.n+')']}),sel)+'</select>':'')+'</div>'+
        (serie.length? '<div class="panel" style="margin-bottom:14px"><h2>'+chip(ct)+' '+esc(sp[0])+'</h2><p class="small muted" style="margin:2px 0 8px">Média de cada ensaio'+(ult.grandeza?' · '+esc(ult.grandeza)+(ult.unidade?' ('+esc(ult.unidade)+')':''):'')+' · linha = '+(ct==='ctrl'?'nominal':'objetivo')+' do último ensaio</p>'+
          Q2.medChart({vals:serie.map(function(r){return r.media}), xl:serie.map(function(r){return fdate(r.data).slice(0,5)}), bars:true, cur:serie.length-1, obj:ult.objetivo, crit:ct==='ctrl'?'ref':ult.criterio, dec:ult.d, w:1100, h:260, xt:'Ensaios por data', L:ct==='ctrl'?{obj:'Nominal'}:null})+'</div>' : '<div class="panel empty">Ainda sem ensaios deste tipo com MM ou cartolina.</div>')+
        A.table(serie.slice().reverse(),cols(),{click:1,empty:''});
    } else body=Q2.cartCorpo? Q2.cartCorpo(t) : '';
    return A.head({c:C,mod:MOD,title:'Laboratório',p:'Todos os ensaios numa só tabela: características de cartolina, deslizamento de verniz e de cartolina, rebentamento, força de vincos, COBB e outras características. Cada ensaio tem gráfico com o objetivo e folha de rosto em PT / ES / EN / FR.',
        acts:'<button class="btn" id="eExp">Exportar Excel</button><button class="btn primary" id="eNew">+ Novo ensaio</button>'})+
      A.kpis([{v:d90.length,l:'Ensaios (90 dias)'},{v:comR.length?fmt(comR.filter(function(e){return e.resultado==='ok'}).length/comR.length*100,0)+'%':'–',l:'Conformes (90 dias)'},{v:nc,l:'Não conformes (90 dias)',cls:nc?'bad':''},{v:all.length,l:'Ensaios no histórico'}])+
      A.tabs('lab',[['hist','Ensaios'],['cmp','Comparação'],['evo','Cartolina · evolução'],['forn','Cartolina · fornecedores'],['lib','Biblioteca de cartolinas']],t)+body;
  },
  bind:function(r){
    $('eNew').onclick=function(){ if(LF.tipo) novo(LF.tipo); else escolherTipo() };
    $('eExp').onclick=exportar;
    r.querySelectorAll('[data-lt]').forEach(function(b){ var go=function(){ LF.tipo=LF.tipo===b.dataset.lt? '' : b.dataset.lt; A.render() };
      b.addEventListener('click',go); b.addEventListener('keydown',function(e){ if(e.target===b&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); go() } }) });
    r.querySelectorAll('[data-ln]').forEach(function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); novo(b.dataset.ln) }) });
    A.bindRows(r,function(id){ if(id.slice(0,2)==='k:'){ if(Q2.cartDetalhe) Q2.cartDetalhe(id.slice(2)) } else if(A.get('ensaios',id)) detalhe(id); else if(A.get('cartolinactrl',id) && Q2.cartDetalhe) Q2.cartDetalhe(id) });
    if(Q2.cartBind) Q2.cartBind(r);
    bindFilters(r); if(window.Charts) Charts.bind(r);
  }
});
/* rota antiga */
A.register('ensaios',{ html:function(){ setTimeout(function(){ location.replace('#laboratorio') },0); return '' }, bind:function(){} });
window.Ensaios={TIPOS:TIPOS, form:ensForm, detalhe:detalhe, ico:ico};
})();
