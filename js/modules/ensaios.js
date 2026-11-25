/* Ensaios de laboratório (Qualidade): deslizamento de verniz, deslizamento de cartolina, características de cartolina
   e rebentamento de cartão. Cada ensaio: OF / cliente / MM / cartolina, medições à mão (5 por omissão, até 20), valor objetivo,
   operador. Gráfico das medições com a linha do objetivo, comparação com ensaios anteriores do mesmo MM e folha de rosto
   em PT / ES / EN / FR (rosto.js). Histórico master inclui os controlos de cartolina (gramagem / espessura).
   Coleção 'ensaios'. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, C='var(--c-qual)', MOD='Qualidade', I=window.Impressao, Q2=window.Q2;
var fv=I.fv, selOpts=I.selOpts, bindFilters=I.bindFilters;

/* tipo → nome, grandeza e unidade por omissão, casas decimais, mínimo de medições, critério por omissão */
var TIPOS={
  verniz:{n:'Deslizamento de verniz',c:'Desl. verniz',g:'Coeficiente de fricção cinética',u:'',d:3,min:5,crit:'min',cond:'100 mm/min'},
  cartolina:{n:'Deslizamento de cartolina',c:'Desl. cartolina',g:'Coeficiente de fricção cinética',u:'',d:3,min:5,crit:'min',cond:'100 mm/min'},
  caract:{n:'Características de cartolina',c:'Caract. cartolina',g:'',u:'',d:2,min:3,crit:'ref',cond:''},
  rebent:{n:'Rebentamento de cartão',c:'Rebentamento',g:'Rebentamento',u:'kPa',d:1,min:3,crit:'min',cond:''}
};
var ORD=['verniz','cartolina','caract','rebent'];
var GRANDEZAS=[['Coeficiente de fricção cinética',''],['Coeficiente de fricção estática',''],['Rigidez','mN·m'],['Cobb 60','g/m²'],['Cobb 1800','g/m²'],['Gramagem','g/m²'],['Espessura','µm'],['Humidade','%'],['Brancura','%'],
  ['Rebentamento','kPa'],['ECT','kN/m'],['BCT','N'],['Força de vinco','N'],['Resistência à dobragem','']];
var CRIT=[['min','Mínimo — a média tem de ser ≥ objetivo'],['max','Máximo — a média tem de ser ≤ objetivo'],['ref','Referência — só mostra a linha no gráfico']];
var MAXM=20;

function okN(x){ return x!=null && x!=='' && isFinite(x) }
function lista(){ return A.list('ensaios') }
function veredicto(m, obj, crit){ if(m==null||!okN(obj)||crit==='ref'||!crit) return null; return (crit==='min'? m>=obj : m<=obj)? 'ok' : 'nc' }
function resPill(r){ return r==='ok'?'<span class="pill ok">Conforme</span>':r==='nc'?'<span class="pill bad">Não conforme</span>':r==='at'?'<span class="pill warn">Leituras fora</span>':'<span class="pill mute">Sem critério</span>' }
function tipoPill(t){ var T=TIPOS[t]; return '<span class="pill info">'+esc(T? T.c : 'Gramagem / espessura')+'</span>' }
function dec(e){ return e.dec!=null? e.dec : (TIPOS[e.tipo]||{}).d||2 }
function un(e){ return e.unidade? ' '+esc(e.unidade) : '' }
/* número: ENS-AAAA-NNN (sequência por ano, todos os tipos) */
function numero(data){ var y=String(data||A.today()).slice(0,4), mx=0; lista().forEach(function(e){ var m=/^ENS-(\d{4})-(\d+)$/.exec(e.numero||''); if(m&&m[1]===y) mx=Math.max(mx,+m[2]) }); return 'ENS-'+y+'-'+('00'+(mx+1)).slice(-3) }
function canon(t,v){ return A.canon? A.canon(t,v) : v }

/* ---------- formulário ---------- */
function escolherTipo(){
  A.showModal('<h2>Novo ensaio</h2><p class="muted" style="margin:-6px 0 0">Escolha o tipo de ensaio.</p><div style="display:grid;gap:8px">'+
    ORD.map(function(t){ var T=TIPOS[t]; return '<button class="btn" data-t="'+t+'" style="justify-content:flex-start;text-align:left"><b>'+esc(T.n)+'</b>'+(T.g?'<span class="small muted">&nbsp;· '+esc(T.g)+(T.u?' ('+esc(T.u)+')':'')+'</span>':'<span class="small muted">&nbsp;· rigidez, Cobb, humidade, brancura…</span>')+'</button>' }).join('')+
    '<a class="btn" href="#cartolina" style="justify-content:flex-start"><b>Gramagem e espessura</b><span class="small muted">&nbsp;· controlo de cartolina na receção</span></a></div>'+
    '<div class="foot"><button class="btn" id="eTx">Cancelar</button></div>',
    function(){ $('eTx').onclick=A.closeModal; document.querySelectorAll('[data-t]').forEach(function(b){ b.onclick=function(){ ensForm(null,b.dataset.t) } }) });
}
function ensForm(v, tipo){
  var edit=!!(v&&v.id), t=(v&&v.tipo)||tipo||'verniz', T=TIPOS[t];
  var val=Object.assign({data:A.today(), grandeza:T.g, unidade:T.u, criterio:T.crit, condicoes:T.cond}, v||{}, {tipo:t});
  var meds=(v&&v.medicoes||[]).slice(); while(meds.length<T.min) meds.push(null);
  var all=lista(), cart=[];
  try{ cart=Q2.lib? Q2.lib().map(function(l){ return l[1] }) : [] }catch(e){}
  var dlx=function(id,arr){ return Q2.dl? Q2.dl(id,arr) : '' };
  var fields=[
    {k:'tipo',l:'Tipo de ensaio',t:'select',o:ORD.map(function(k){return [k,TIPOS[k].n]}),req:1},
    {k:'data',l:'Data do ensaio',t:'date',req:1},
    {k:'of',l:'OF'},
    {k:'mm',l:'MM'},
    {k:'cliente',l:'Cliente',list:'eDlCli',req:1},
    {k:'artigo',l:'Artigo / descrição',full:1},
    {k:'cartolina',l:'Cartolina',list:'eDlCart',full:1},
    {k:'verniz',l:'Verniz',list:'eDlVz',full:1},
    {k:'grandeza',l:'Grandeza medida',list:'eDlGr',req:1},
    {k:'unidade',l:'Unidade',ph:'ex.: kPa, g/m², mN·m'},
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
    {k:'obs',l:'Observações',t:'textarea',rows:3}
  ];
  A.openForm({ title:(edit?'Editar ensaio ':'Novo ensaio')+(edit&&v.numero?' '+v.numero:''), values:val, noFocus:true, fields:fields,
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
        var c=cur(); $('f_verniz').closest('.fld').hidden=$('f_tipo').value!=='verniz';
        if(!first){ ['grandeza','unidade','condicoes'].forEach(function(k){ var el=$('f_'+k), d={grandeza:c.g,unidade:c.u,condicoes:c.cond}[k]; if(el.value.trim()===''||el.dataset.def===el.value){ el.value=d; el.dataset.def=d } });
          $('f_criterio').value=$('f_criterio').dataset.def===$('f_criterio').value||!$('f_criterio').value? c.crit : $('f_criterio').value; $('f_criterio').dataset.def=c.crit;
          while(meds.length<c.min) meds.push(null); draw() }
      };
      ['grandeza','unidade','condicoes','criterio'].forEach(function(k){ $('f_'+k).dataset.def=$('f_'+k).value });
      $('f_tipo').onchange=function(){ tipoCh(false) };
      $('f_grandeza').addEventListener('change',function(){ var g=GRANDEZAS.filter(function(x){ return x[0].toLowerCase()===$('f_grandeza').value.trim().toLowerCase() })[0]; if(g && ($('f_unidade').value.trim()===''||$('f_unidade').dataset.def===$('f_unidade').value)){ $('f_unidade').value=g[1]; $('f_unidade').dataset.def=g[1]; live() } });
      ['objetivo','criterio','unidade'].forEach(function(k){ $('f_'+k).addEventListener('input',live); $('f_'+k).addEventListener('change',live) });
      $('eAdd').onclick=function(){ if(meds.length<MAXM){ meds.push(null); draw(); var l=$('eM').querySelectorAll('input'); l[l.length-1].focus() } };
      $('eRem').onclick=function(){ if(meds.length>1){ meds.pop(); draw() } };
      /* OF / MM → cliente, MM e artigo (como nas FII / FIQ) */
      var KS=['mm','cliente','artigo'], run=function(src){
        if(!Q2.ofInfo) return; var fOf=$('f_of'), fMm=$('f_mm'), info=Q2.ofInfo(fOf.value, src==='of'&&fMm.dataset.auto===fMm.value? '' : fMm.value), n=[];
        KS.forEach(function(k){ var el=$('f_'+k); if(!el||!info[k]) return; if(el.value.trim()===''||el.dataset.auto===el.value){ if(el.value!==info[k]) n.push(k); el.value=info[k]; el.dataset.auto=info[k] } });
        $('eHint').textContent=n.length? 'Preenchido a partir da '+(src==='of'?'OF':'MM')+': '+n.map(function(k){return {mm:'MM',cliente:'cliente',artigo:'artigo'}[k]}).join(', ')+'.' : (fOf.value.trim()||fMm.value.trim())&&!info.mm&&!info.cliente? 'Sem dados conhecidos para esta OF / MM — preencha à mão.' : '';
      };
      $('f_of').addEventListener('change',function(){ run('of') }); $('f_mm').addEventListener('change',function(){ run('mm') });
      tipoCh(true); draw();
    },
    validate:function(x){ var c=TIPOS[x.tipo]||T, n=meds.filter(okN).length; if(n<c.min) return 'Faltam medições: '+n+' de '+c.min+' (mínimo).'; },
    submit:function(x){
      var c=TIPOS[x.tipo]||T, m=meds.slice(); while(m.length && !okN(m[m.length-1])) m.pop();
      var y=m.filter(okN), o=Object.assign({},x,{medicoes:m, dec:c.d});
      if(x.tipo!=='verniz') o.verniz='';
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
  A.showModal('<h2>'+tipoPill(e.tipo)+' <span class="mono">'+esc(e.numero||'')+'</span> '+resPill(e.resultado)+'</h2><dl class="detail">'+
    row('Data',fdate(e.data))+row('Cliente',e.cliente)+row('OF',e.of)+row('MM',e.mm)+row('Artigo',e.artigo)+row('Cartolina',e.cartolina)+row('Verniz',e.verniz)+
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

/* ---------- histórico master: ensaios + controlos de cartolina ---------- */
function master(){
  var r=lista().map(function(e){ return {id:e.id, src:'e', tipo:e.tipo, numero:e.numero, data:e.data, cliente:e.cliente, artigo:e.artigo, of:e.of, mm:e.mm, cartolina:e.cartolina, verniz:e.verniz, grandeza:e.grandeza, unidade:e.unidade, media:e.media, objetivo:e.objetivo, criterio:e.criterio, d:dec(e), operador:e.operador, resultado:e.resultado} });
  A.list('cartolinactrl').forEach(function(c){ r.push({id:'k:'+c.id, src:'k', tipo:'ctrl', numero:c.numero, data:c.data, cliente:'', artigo:'', of:'', mm:c.mm, cartolina:c.nome, verniz:'', grandeza:'Gramagem / espessura', unidade:'g/m²', media:c.gMedia, objetivo:c.g, criterio:'nom', d:1, operador:c.analista, resultado:c.resultado, extra:c.eMedia!=null? fmt(c.eMedia,0)+' µm' : ''}) });
  return r.sort(function(a,b){ var x=(a.data||'')+(a.numero||''), y=(b.data||'')+(b.numero||''); return x<y?1:x>y?-1:0 });
}
function cols(){
  return [{l:'N.º / data',v:function(r){return '<span class="mono">'+esc(r.numero||'–')+'</span><div class="small muted">'+fdate(r.data)+'</div>'}},
    {l:'Tipo',v:function(r){return tipoPill(r.tipo)}},
    {l:'Cliente / artigo',v:function(r){return '<b>'+esc(r.cliente||'–')+'</b><div class="small muted">'+esc(r.artigo||'')+'</div>'}},
    {l:'OF · MM',v:function(r){return '<span class="mono">'+esc([r.of,r.mm].filter(Boolean).join(' · ')||'–')+'</span>'}},
    {l:'Cartolina / verniz',v:function(r){return esc(r.cartolina||'–')+(r.verniz?'<div class="small muted">'+esc(r.verniz)+'</div>':'')}},
    {l:'Ensaio',v:function(r){return esc(r.grandeza||'–')}},
    {l:'Média / objetivo',n:1,v:function(r){return '<b>'+fmt(r.media,r.d)+'</b>'+(r.unidade?' <span class="small muted">'+esc(r.unidade)+'</span>':'')+'<div class="small muted">'+(okN(r.objetivo)?(r.criterio==='nom'?'nominal ':r.criterio==='max'?'≤ ':r.criterio==='min'?'≥ ':'ref. ')+fmt(r.objetivo,r.d):'')+(r.extra?' · '+esc(r.extra):'')+'</div>'}},
    {l:'Operador',v:function(r){return esc(r.operador||'–')}},
    {l:'Resultado',v:function(r){return resPill(r.resultado)}}];
}

/* ---------- exportar Excel (cópia de segurança e consulta) ---------- */
async function exportar(){
  try{ await Q2.loadX() }catch(e){ A.toast('Não foi possível carregar o leitor de Excel.'); return }
  var wb=XLSX.utils.book_new(), nm=0; lista().forEach(function(e){ nm=Math.max(nm,(e.medicoes||[]).length) });
  var H=['N.º','Data','Tipo','OF','Cliente','MM','Artigo','Cartolina','Verniz','Ensaio','Unidade','Condições','Critério','Objetivo'], M=[]; for(var i=1;i<=nm;i++) M.push('Medição '+i);
  var linha=function(e){ return [e.numero,e.data,(TIPOS[e.tipo]||{}).n||e.tipo,e.of,e.cliente,e.mm,e.artigo,e.cartolina,e.verniz,e.grandeza,e.unidade,e.condicoes,{min:'Mínimo',max:'Máximo',ref:'Referência'}[e.criterio]||'',e.objetivo]
    .concat(M.map(function(x,i){ var v=(e.medicoes||[])[i]; return okN(v)? v : '' }),[e.media,e.desvio,e.min,e.max,{ok:'Conforme',nc:'Não conforme'}[e.resultado]||'',e.operador,e.obs]).map(function(v){ return v==null? '' : v }) };
  var cab=H.concat(M,['Média','Desvio padrão','Mínimo','Máximo','Resultado','Operador','Observações']);
  var todos=lista().slice().sort(function(a,b){ return (a.data||'')<(b.data||'')?-1:1 });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cab].concat(todos.map(linha))), 'Todos');
  ORD.forEach(function(t){ var r=todos.filter(function(e){return e.tipo===t}); if(r.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cab].concat(r.map(linha))), TIPOS[t].c.replace(/\./g,'')) });
  XLSX.writeFile(wb, 'FLOW_Ensaios_'+A.today()+'.xlsx'); A.toast('Exportado ('+todos.length+' ensaios).');
}

A.register('ensaios',{
  html:function(){
    var t=A.tab('ens','hist'), all=master(), q=fv('eq','').toLowerCase(), d90=lista().filter(function(e){return A.days(e.data)<=90});
    var comR=d90.filter(function(e){return e.resultado}), nc=d90.filter(function(e){return e.resultado==='nc'}).length;
    var proc=function(r){ return !q || [r.numero,r.of,r.mm,r.cliente,r.artigo,r.cartolina,r.verniz,r.grandeza,r.operador].join(' ').toLowerCase().indexOf(q)>=0 };
    var body='';
    if(t==='hist'){
      var ft=fv('et',''), fr=fv('er','');
      var rows=all.filter(function(r){ return proc(r) && (!ft||r.tipo===ft) && (!fr||(fr==='sem'? !r.resultado : r.resultado===fr)) });
      body='<div class="filters"><input type="search" id="eq" data-f="eq" placeholder="Procurar N.º, OF, MM, cliente, cartolina, operador…" value="'+esc(fv('eq',''))+'">'+
        '<select data-f="et">'+selOpts(ORD.map(function(k){return [k,TIPOS[k].n]}).concat([['ctrl','Gramagem / espessura (controlo de cartolina)']]),ft,'Todos os tipos')+'</select>'+
        '<select data-f="er">'+selOpts([['ok','Conforme'],['nc','Não conforme'],['at','Leituras fora'],['sem','Sem critério']],fr,'Todos os resultados')+'</select></div>'+
        A.table(rows,cols(),{click:1,empty:'Ainda sem ensaios. Registe o primeiro com “+ Novo ensaio”.'});
    } else {
      var T=TIPOS[t], rs=all.filter(function(r){ return r.tipo===t && proc(r) });
      var chaves={}; rs.forEach(function(r){ var k=r.mm||r.cartolina; if(!k) return; var key=k+'|'+(r.grandeza||''); (chaves[key]=chaves[key]||{k:key,l:k+(r.cliente?' · '+r.cliente:'')+(t==='caract'?' · '+(r.grandeza||''):''),n:0,u:r.data}).n++ });
      var ks=Object.keys(chaves).map(function(k){return chaves[k]}).sort(function(a,b){ return a.u<b.u?1:-1 }), sel=fv('ek_'+t, ks[0]?ks[0].k:''), sp=sel.split('|');
      var serie=rs.filter(function(r){ return (r.mm||r.cartolina)===sp[0] && (r.grandeza||'')===(sp[1]||'') && r.media!=null }).slice().reverse().slice(-15), ult=serie[serie.length-1]||{};
      body='<div class="filters"><input type="search" id="eq" data-f="eq" placeholder="Procurar…" value="'+esc(fv('eq',''))+'">'+(ks.length?'<select data-f="ek_'+t+'">'+selOpts(ks.map(function(k){return [k.k,k.l+' ('+k.n+')']}),sel)+'</select>':'')+'</div>'+
        (serie.length? '<div class="panel" style="margin-bottom:14px"><h2>Comparação de ensaios — '+esc(sp[0])+'</h2><p class="small muted" style="margin:2px 0 8px">Média de cada ensaio'+(ult.grandeza?' · '+esc(ult.grandeza)+(ult.unidade?' ('+esc(ult.unidade)+')':''):'')+' · linha vermelha = objetivo do último ensaio</p>'+
          Q2.medChart({vals:serie.map(function(r){return r.media}), xl:serie.map(function(r){return fdate(r.data).slice(0,5)}), bars:true, cur:serie.length-1, obj:ult.objetivo, crit:ult.criterio, dec:ult.d, w:1100, h:260, xt:'Ensaios por data'})+'</div>' : '')+
        A.table(rs,cols().filter(function(c){return c.l!=='Tipo'}),{click:1,empty:'Ainda sem ensaios de '+esc(T.n.toLowerCase())+'.'});
    }
    return A.head({c:C,mod:MOD,title:'Ensaios de laboratório',p:'Deslizamento de verniz e de cartolina, características de cartolina e rebentamento de cartão: medições, valor objetivo, gráfico e folha de rosto em PT / ES / EN / FR. O histórico inclui os controlos de cartolina.',
        acts:'<button class="btn" id="eExp">Exportar Excel</button><button class="btn primary" id="eNew">+ Novo ensaio</button>'})+
      A.kpis([{v:d90.length,l:'Ensaios (90 dias)'},{v:comR.length?fmt(comR.filter(function(e){return e.resultado==='ok'}).length/comR.length*100,0)+'%':'–',l:'Conformes (90 dias)'},{v:nc,l:'Não conformes (90 dias)',cls:nc?'bad':''},{v:lista().length,l:'Ensaios no histórico'}])+
      A.tabs('ens',[['hist','Histórico']].concat(ORD.map(function(k){return [k,TIPOS[k].n]})),t)+body;
  },
  bind:function(r){
    $('eNew').onclick=function(){ var t=A.tab('ens','hist'); if(TIPOS[t]) ensForm(null,t); else escolherTipo() };
    $('eExp').onclick=exportar;
    A.bindRows(r,function(id){ if(id.slice(0,2)==='k:'){ if(Q2.cartDetalhe) Q2.cartDetalhe(id.slice(2)) } else detalhe(id) });
    bindFilters(r);
  }
});
window.Ensaios={TIPOS:TIPOS, form:ensForm, detalhe:detalhe};
})();
