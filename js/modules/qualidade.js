/* Módulo Qualidade: incidências FII/FIQ e controlo de cartolina (fornecedores / matérias-primas). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, C='var(--c-qual)', MOD='Qualidade', I=window.Impressao;
var fv=I.fv, selOpts=I.selOpts, bindFilters=I.bindFilters, Q2=window.Q2={};

/* =============== FII / FIQ =============== */
var ESTADOS=['Registada','Aberta','Em análise','Ação definida','Em implementação','Fechada'];
var EFIC=['Por verificar','Eficaz','Não eficaz'];
var M6=['Mão de Obra','Método','Máquina','Matéria-Prima','Meio-Ambiente','Medição','Não Aplicável'];
function estPill(e){ var c={'Aberta':'bad','Em análise':'warn','Ação definida':'info','Em implementação':'info','Fechada':'ok','Registada':'mute'}[e]||'mute'; return '<span class="pill '+c+'">'+esc(e||'–')+'</span>' }
function tipoPill(t){ return '<span class="pill '+(t==='FIQ'?'fiq':'fii')+'">'+esc(t)+'</span>' }
/* histórico (ficheiros) + registos novos/alterados na base de dados; um registo da BD com o mesmo id substitui o histórico */
function incList(){
  var H=S.hist, db=A.list('incidencias'), key=H.fii.length+'|'+H.fiq.length+'|'+db.length+'|'+(S._incStamp||0)+'|'+(A.canonKey? A.canonKey() : '');
  if(S._incCache && S._incCache.k===key) return S._incCache.v;
  var m={}; H.fii.forEach(function(r){ m[r.id]=r }); H.fiq.forEach(function(r){ m[r.id]=r });
  db.forEach(function(r){ if(r._del) delete m[r.id]; else m[r.id]=r });
  var v=Object.keys(m).map(function(k){return m[k]}); if(A.canonInc) v=v.map(A.canonInc); S._incCache={k:key,v:v}; return v;
}
A.list.inc=incList;
function incDate(i){ return String((i.tipo==='FIQ'? (i.dataReclamacao||i.dataIncidencia) : (i.dataIncidencia||i.dataReclamacao))||'') }
function nextNum(tipo, ano){ var mx=0, re=new RegExp('^'+tipo+'-'+ano+'-(\\d+)$'); incList().forEach(function(i){ var m=re.exec(i.numero||''); if(m) mx=Math.max(mx,+m[1]) }); return tipo+'-'+ano+'-'+('000'+(mx+1)).slice(-(tipo==='FII'?4:3)) }
function dl(id, arr){ return '<datalist id="'+id+'">'+Array.from(new Set(arr.filter(Boolean))).sort().slice(0,600).map(function(x){return '<option value="'+esc(x)+'">'}).join('')+'</datalist>' }
function setores(){ var s=new Set(A.SETORES); incList().forEach(function(i){ if(i.setorOrigem) s.add(i.setorOrigem) }); return Array.from(s) }
function incForm(v, tipo){
  var edit=!!v; tipo=(v&&v.tipo)||tipo||'FII'; var fiq=tipo==='FIQ';
  var H=incList().filter(function(i){return i.tipo===tipo});
  var mq=A.maquinas().map(function(m){return m.nome}).concat(H.map(function(i){return i.maqOrigem})), op=A.operadores().map(function(o){return o.nome});
  var vals=v||{estado:'Aberta', dataIncidencia:A.today(), dataReclamacao:fiq?A.today():'', eficacia:'Por verificar', unidade:'CXS'};
  var F=[
      {k:'numero',l:'N.º',ph:'automático',help:edit?'':'Vazio = numeração automática'},
      {k:'estado',l:'Estado',t:'select',o:ESTADOS,req:1},
      {k:'of',l:'Ordem de fabrico (OF)',req:1},
      {k:'mm',l:'MM (8000…)',ph:'8000…'},
      {k:'cliente',l:'Cliente',list:'dlCli',req:fiq},
      {k:'artigo',l:'Artigo / descrição'},
      {k:'cortante',l:'Cortante',list:'dlCort'}];
  if(fiq) F=F.concat([{k:'dataReclamacao',l:'Data da reclamação',t:'date',req:1},{k:'dataEntrega',l:'Data de entrega',t:'date'},{k:'recDev',l:'Reclamação / devolução',t:'select',o:[['Rec','Reclamação'],['Dev','Devolução']]},{k:'dataResposta',l:'Data de resposta ao cliente',t:'date'}]);
  else F=F.concat([{k:'dataIncidencia',l:'Data da incidência',t:'date',req:1},{k:'turno',l:'Turno',t:'select',o:['Turno 1','Turno 2','Turno 3']}]);
  F=F.concat([
      {k:'defeito',l:fiq?'Defeito (grupo)':'Motivo / defeito',list:'dlDef',req:1},
      {k:'defeitoDet',l:'Defeito pormenorizado',list:'dlDefD'},
      {t:'sep',l:'Onde foi detetado'},
      {k:'setorDetetado',l:'Setor',t:'select',o:setores().concat(['Cliente']),def:fiq?'Cliente':''},
      {k:'maqDetetou',l:'Máquina',list:'dlMaq'},
      {k:'opDetetou',l:'Operador',list:'dlOp'},
      {t:'sep',l:'Onde foi cometido o erro'},
      {k:'setorOrigem',l:'Setor',t:'select',o:setores(),req:1},
      {k:'maqOrigem',l:'Máquina',list:'dlMaq'},
      {k:'opOrigem',l:'Operador(es)',list:'dlOp'}]);
  if(!fiq) F.push({k:'autoDetecao',l:'Detetado pelo próprio operador?',t:'select',o:[['sim','Sim'],['não','Não']]});
  F=F.concat([{t:'sep',l:'Impacto'},
      {k:'qtdAfetada',l:fiq?'Quantidade entregue / afetada':'Quantidade afetada',t:'number'},
      {k:'qtdRejeitada',l:'Quantidade rejeitada',t:'number'},
      {k:'unidade',l:'Unidade',t:'select',o:['CXS','FLS','UN','KG','paletes']},
      {k:'devolucao',l:'Houve devolução',t:'check'},
      {k:'qtdDevolvida',l:'Quantidade devolvida',t:'number'},
      {k:'tempoReproc',l:'Tempo de reprocessamento (h)',t:'number'},
      {k:'custo',l:fiq?'Custo efetivo total (€)':'Custo da rejeição (€)',t:'number'}]);
  if(fiq) F=F.concat([{k:'impactoAlimentar',l:'Impacto alimentar',t:'select',o:['Não','Sim']},{k:'m6',l:'Causa (6M)',t:'select',o:M6}]);
  F=F.concat([{t:'sep',l:'Análise e ação'},
      {k:'descricao',l:fiq?'Razão da reclamação':'Descrição',t:'textarea',req:1},
      {k:'causa',l:fiq?'Causa raiz':'Causa',t:'textarea',rows:2},
      {k:'acao',l:'Ação corretiva / melhoria',t:'textarea',rows:2},
      {k:'responsavel',l:'Responsável pela ação',list:'dlOp'},
      {k:'prazo',l:'Prazo',t:'date'},
      {k:'dataFecho',l:'Data de fecho',t:'date'},
      {k:'eficacia',l:'Eficácia da ação',t:'select',o:EFIC},
      {k:'observacoes',l:'Observações',t:'textarea',rows:2},
      {t:'html',html:dl('dlMaq',mq)+dl('dlOp',op.concat(H.map(function(i){return i.opDetetou}),H.slice(0,400).map(function(i){return i.opOrigem})))+dl('dlCli',H.map(function(i){return i.cliente}))+
        dl('dlDef',H.map(function(i){return i.defeito}))+dl('dlDefD',H.map(function(i){return i.defeitoDet}))+dl('dlCort',H.slice(0,500).map(function(i){return i.cortante}))}]);
  A.openForm({ title:edit?'Editar '+v.numero:(fiq?'Nova FIQ — reclamação de cliente':'Nova FII — incidência interna'), values:vals, fields:F,
    intro:edit&&v.historico?'Registo importado do ficheiro histórico. As alterações ficam guardadas no FLOW.':'',
    del: edit && A.can('qualidade')? function(){ return v.historico? A.put('incidencias',v.id,{_del:true}) : A.del('incidencias',v.id) } : null,
    validate:function(x){ if(x.estado==='Fechada' && !x.dataFecho) return 'Indique a data de fecho.' },
    submit:function(x){
      x.tipo=tipo; if(fiq && !x.dataIncidencia) x.dataIncidencia=x.dataEntrega||x.dataReclamacao;
      if(fiq && x.dataResposta && x.dataReclamacao) x.tempoResposta=A.days(x.dataReclamacao,x.dataResposta);
      if(!x.numero) x.numero=nextNum(tipo, String(x.dataIncidencia||A.today()).slice(0,4));
      S._incStamp=(S._incStamp||0)+1;
      if(edit){ var o=Object.assign({},A.clean(v),x); delete o._k; return A.put('incidencias',v.id,o) }
      if(incList().some(function(i){return i.numero===x.numero})) throw A.uerr('Já existe uma incidência com o n.º '+x.numero+'.');
      return A.add('incidencias',x);
    }});
}
function incDetalhe(id){
  var i=incList().filter(function(x){return x.id===id})[0]; if(!i) return;
  var row=function(l,v){ return v==null||v===''? '' : '<div><dt>'+l+'</dt><dd>'+esc(v)+'</dd></div>' }, fiq=i.tipo==='FIQ';
  A.showModal('<h2>'+tipoPill(i.tipo)+' <span class="mono">'+esc(i.numero)+'</span> '+estPill(i.estado)+'</h2><dl class="detail">'+
    row('Cliente',i.cliente)+row('OF',i.of)+row('MM',i.mm)+row('Artigo',i.artigo)+row('Cortante',i.cortante)+
    row(fiq?'Data da reclamação':'Data',fdate(fiq?i.dataReclamacao:i.dataIncidencia))+(fiq?row('Data de entrega',i.dataEntrega&&fdate(i.dataEntrega))+row('Tempo de resposta',i.tempoResposta!=null?i.tempoResposta+' dias':''):'')+
    row('Defeito',i.defeito)+row('Pormenor',i.defeitoDet)+row('Setor de origem',i.setorOrigem)+row('Máquina',i.maqOrigem)+row('Operador(es)',i.opOrigem)+row('Detetado por',[i.setorDetetado,i.maqDetetou,i.opDetetou].filter(Boolean).join(' · '))+
    (i.autoDetecao?row('Detetado pelo próprio operador',i.autoDetecao):'')+row('Qtd afetada',i.qtdAfetada!=null?fmt(i.qtdAfetada,0)+' '+(i.unidade||''):'')+row('Qtd rejeitada',i.qtdRejeitada!=null?fmt(i.qtdRejeitada,0)+' '+(i.unidade||''):'')+
    row('Devolução',i.qtdDevolvida?fmt(i.qtdDevolvida,0):'')+row('Reprocessamento',i.tempoReproc!=null?fmt(i.tempoReproc,1)+' h':'')+row('Custo',i.custo!=null?fmt(i.custo,2)+' €':'')+(fiq?row('6M',i.m6)+row('Impacto alimentar',i.impactoAlimentar):'')+
    (i.descricao?'<div class="full"><dt>Descrição</dt><dd>'+esc(i.descricao)+'</dd></div>':'')+(i.causa?'<div class="full"><dt>Causa</dt><dd>'+esc(i.causa)+'</dd></div>':'')+
    (i.acao?'<div class="full"><dt>Ação</dt><dd>'+esc(i.acao)+'</dd></div>':'')+(i.observacoes?'<div class="full"><dt>Observações</dt><dd>'+esc(i.observacoes)+'</dd></div>':'')+'</dl>'+
    '<div class="foot">'+(i.historico&&!i.alteradoEm?'<span class="small muted" style="margin-right:auto">Importado do ficheiro histórico</span>':'')+'<button class="btn" id="iX">Fechar</button><button class="btn primary" id="iE">Editar</button></div>',
    function(){ $('iX').onclick=A.closeModal; $('iE').onclick=function(){ incForm(i) } });
}
function incFilt(){
  var q=fv('qq','').toLowerCase(), ft=fv('qt',''), fe=fv('qe',''), fa=fv('qa',String(new Date().getFullYear())), fs=fv('qs','');
  return incList().filter(function(i){
    var d=incDate(i);
    return (!ft||i.tipo===ft)&&(!fe||(fe==='abertas'? (i.estado!=='Fechada'&&i.estado!=='Registada') : i.estado===fe))&&(!fa||d.slice(0,4)===fa)&&(!fs||i.setorOrigem===fs)&&
      (!q||[i.numero,i.of,i.mm,i.cliente,i.artigo,i.descricao,i.defeito,i.maqOrigem,i.opOrigem,i.opDetetou].join(' ').toLowerCase().indexOf(q)>=0);
  }).sort(function(a,b){ var x=incDate(a), y=incDate(b); return y<x?-1:y>x?1:(b.numero||'')<(a.numero||'')?-1:1 });
}
function incStats(rows){
  var fech=rows.filter(function(i){return i.estado==='Fechada'&&i.dataFecho&&i.dataIncidencia}), rep=rows.map(function(i){return i.tempoReproc}).filter(function(x){return x!=null&&x>0});
  return { n:rows.length, fii:rows.filter(function(i){return i.tipo==='FII'}).length, fiq:rows.filter(function(i){return i.tipo==='FIQ'}).length,
    abertas:rows.filter(function(i){return i.estado!=='Fechada'&&i.estado!=='Registada'}).length, reproc:A.mean(rep), reprocTot:rep.reduce(function(s,x){return s+x},0),
    fecho:A.mean(fech.map(function(i){return A.days(i.dataIncidencia,i.dataFecho)}).filter(function(x){return x>=0})), devol:rows.filter(function(i){return i.devolucao}).length,
    custo:rows.reduce(function(s,i){return s+(i.custo||0)},0) };
}
A.register('incidencias',{
  html:function(){
    var t=A.tab('inc','lista'), rows=incFilt(), st=incStats(rows);
    var anos=Array.from(new Set(incList().map(function(i){return incDate(i).slice(0,4)}).filter(Boolean))).sort().reverse();
    var filt='<div class="filters"><input type="search" id="qq" data-f="qq" placeholder="Procurar n.º, OF, MM, cliente, defeito, operador…" value="'+esc(fv('qq',''))+'">'+
      '<select data-f="qt">'+selOpts([['FII','FII · internas'],['FIQ','FIQ · clientes']],fv('qt',''),'FII e FIQ')+'</select>'+
      '<select data-f="qe">'+selOpts([['abertas','Em aberto']].concat(ESTADOS),fv('qe',''),'Todos os estados')+'</select>'+
      '<select data-f="qa">'+selOpts(anos,fv('qa',String(new Date().getFullYear())),'Todos os anos')+'</select>'+
      '<select data-f="qs">'+selOpts(setores(),fv('qs',''),'Setor de origem')+'</select></div>';
    var body = !S.hist.ok? '<div class="panel empty">A carregar o histórico…</div>' : t==='lista'? A.table(rows,[
        {l:'N.º',v:function(i){return tipoPill(i.tipo)+' <b class="mono">'+esc(i.numero)+'</b>'}},
        {l:'Data',v:function(i){return fdate(incDate(i))}},
        {l:'OF / MM',v:function(i){return esc(i.of||'–')+'<div class="small muted mono">'+esc(i.mm||'')+'</div>'}},
        {l:'Cliente',v:function(i){return esc((i.cliente||'–').slice(0,30))}},
        {l:'Defeito',v:function(i){return esc(i.defeito||'–')}},
        {l:'Origem',v:function(i){return esc(i.setorOrigem||'–')+'<div class="small muted">'+esc([i.maqOrigem,(i.opOrigem||'').slice(0,30)].filter(Boolean).join(' · '))+'</div>'}},
        {l:'Rejeitado',n:1,v:function(i){return i.qtdRejeitada?fmt(i.qtdRejeitada,0)+' <span class="small muted">'+esc(i.unidade||'')+'</span>':'–'}},
        {l:'Custo',n:1,v:function(i){return i.custo?fmt(i.custo,0)+' €':'–'}},
        {l:'Estado',v:function(i){return estPill(i.estado)}}
      ],{click:1,max:200,empty:'Sem incidências com estes filtros.'}) : Q2.incDash(rows, fv('qt','')||'FII');
    return A.head({c:C,mod:MOD,title:'Incidências FII / FIQ',p:'FII — Ficha de Incidência Interna · FIQ — Ficha de Incidência de Qualidade (reclamação de cliente). Histórico desde 2024 + novos registos.',
        acts:'<button class="btn" id="qNewI">+ Nova FII</button><button class="btn primary" id="qNewC">+ Nova FIQ</button>'})+
      A.kpis([{v:fmt(st.fii,0),l:'FII (filtro atual)'},{v:fmt(st.fiq,0),l:'FIQ (filtro atual)'},{v:st.abertas,l:'Em aberto',cls:st.abertas?'warn':''},
        {v:fmt(st.custo,0)+' €',l:'Custo associado'},{v:st.reprocTot?fmt(st.reprocTot,0)+' h':'–',l:'Horas de reprocessamento'},{v:st.devol,l:'Com devolução'}])+
      A.tabs('inc',[['lista','Registos'],['graf','Indicadores']],t)+filt+body;
  },
  bind:function(r){ $('qNewI').onclick=function(){incForm(null,'FII')}; $('qNewC').onclick=function(){incForm(null,'FIQ')}; A.bindRows(r,incDetalhe); bindFilters(r); Charts.bind(r) }
});

/* =============== CONTROLO DE CARTOLINA =============== */
/* biblioteca: [classe, nome, fornecedor, g, gMax, gMin, e, eMax, eMin] */
function lib(){ var r=[]; A.list('cartolinas').slice().sort(function(a,b){return (a.parte||0)-(b.parte||0)}).forEach(function(d){ (d.linhas||[]).forEach(function(l){ r.push(l) }) }); return r }
function libKey(l){ return [l[2],l[1],l[3]].join('|') }
function stats(arr, lo, hi){ var v=arr.filter(function(x){return x!=null}); var m=A.mean(v); return {n:v.length, m:m, s:A.sd(v), mn:v.length?Math.min.apply(null,v):null, mx:v.length?Math.max.apply(null,v):null, out:v.filter(function(x){return (lo!=null&&x<lo)||(hi!=null&&x>hi)}).length, mOut:m!=null&&((lo!=null&&m<lo)||(hi!=null&&m>hi))} }
function veredicto(c){
  var g=stats(c.gram||[],c.gMin,c.gMax), e=stats(c.esp||[],c.eMin,c.eMax);
  if(g.mOut||e.mOut) return 'nc'; if(g.out||e.out) return 'at'; return 'ok';
}
function verPill(v){ return v==='nc'?'<span class="pill bad">Não conforme</span>':v==='at'?'<span class="pill warn">Leituras fora</span>':'<span class="pill ok">Conforme</span>' }
function measGrid(id, vals){ var h='<div class="meas" id="'+id+'">'; for(var i=0;i<10;i++) h+='<input inputmode="decimal" aria-label="Leitura '+(i+1)+'" placeholder="'+(i+1)+'" value="'+(vals&&vals[i]!=null?esc(String(vals[i]).replace('.',',')):'')+'">'; return h+'</div><div class="live" id="'+id+'L"></div>' }
function readMeas(id){ return Array.prototype.map.call($(id).querySelectorAll('input'),function(i){ return A.num(i.value) }) }
function cartForm(v){
  var L=lib(), edit=!!v, forn=Array.from(new Set(L.map(function(l){return l[2]}))).sort();
  var cur=v? {forn:v.fornecedor, key:v.libKey||''} : {};
  A.openForm({ title:edit?'Editar controlo de cartolina':'Novo controlo de cartolina', values:v||{data:A.today()}, noFocus:true,
    intro:L.length? '' : 'A biblioteca de cartolinas ainda não foi importada (Dados mestre). Pode introduzir a cartolina e as tolerâncias à mão.',
    fields:[
      {t:'html',html:'<div class="form" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">'+
        '<label class="fld">Fornecedor *<select id="cfF"><option value="">— escolher —</option>'+forn.map(function(f){return '<option'+(f===cur.forn?' selected':'')+'>'+esc(f)+'</option>'}).join('')+'<option value="__m"'+(edit&&!v.libKey?' selected':'')+'>Outro (manual)</option></select></label>'+
        '<label class="fld full">Cartolina *<select id="cfP"></select></label></div>'+
        '<div class="form" id="cfMan" style="margin-top:10px"></div><div id="cfNom" class="live" style="margin-top:6px"></div>'},
      {k:'data',l:'Data do controlo',t:'date',req:1},
      {k:'lote',l:'Lote / bobine'},
      {k:'palete',l:'Palete / guia de receção'},
      {k:'analista',l:'Analista',list:'dlAn'},
      {t:'html',html:'<div class="sep" style="margin-top:4px">Gramagem (g/m²) — 10 medições</div>'+measGrid('mG',v&&v.gram)+'<div class="sep" style="margin-top:12px">Espessura (µm) — 10 medições</div>'+measGrid('mE',v&&v.esp)+
        dl('dlAn',A.list('cartolinactrl').map(function(c){return c.analista}).concat(A.operadores('Qualidade').map(function(o){return o.nome})))},
      {k:'obs',l:'Observações',t:'textarea',rows:2}
    ],
    after:function(box){
      var fF=$('cfF'), fP=$('cfP'), man=$('cfMan');
      var nominal=function(){
        if(fF.value==='__m'){ var g=A.num(($('mnG')||{}).value), gt=A.num(($('mnGt')||{}).value)||5, e=A.num(($('mnE')||{}).value), et=A.num(($('mnEt')||{}).value)||5;
          return {fornecedor:($('mnF')||{}).value||'', nome:($('mnN')||{}).value||'', classe:'', g:g, gMin:g!=null?+(g*(1-gt/100)).toFixed(2):null, gMax:g!=null?+(g*(1+gt/100)).toFixed(2):null, e:e, eMin:e!=null?+(e*(1-et/100)).toFixed(2):null, eMax:e!=null?+(e*(1+et/100)).toFixed(2):null, libKey:''} }
        var l=L.filter(function(x){return libKey(x)===fP.value})[0]; if(!l) return null;
        return {fornecedor:l[2], nome:l[1], classe:l[0], g:l[3], gMax:l[4], gMin:l[5], e:l[6], eMax:l[7], eMin:l[8], libKey:libKey(l)};
      };
      var live=function(){
        var n=nominal(); $('cfNom').innerHTML=n&&n.g!=null? '<span>Gramagem nominal <b>'+fmt(n.g,0)+'</b> ('+fmt(n.gMin,1)+' – '+fmt(n.gMax,1)+')</span>'+(n.e!=null?'<span>Espessura nominal <b>'+fmt(n.e,0)+'</b> ('+fmt(n.eMin,1)+' – '+fmt(n.eMax,1)+')</span>':'<span>Sem espessura nominal na biblioteca</span>') : '';
        [['mG','gMin','gMax',1],['mE','eMin','eMax',1]].forEach(function(z){
          var lo=n?n[z[1]]:null, hi=n?n[z[2]]:null, ins=$(z[0]).querySelectorAll('input');
          ins.forEach(function(i){ var x=A.num(i.value); i.classList.toggle('out', x!=null&&((lo!=null&&x<lo)||(hi!=null&&x>hi))) });
          var s=stats(readMeas(z[0]),lo,hi);
          $(z[0]+'L').innerHTML=s.n? '<span>n <b>'+s.n+'</b></span><span>média <b style="color:'+(s.mOut?'var(--bad)':'inherit')+'">'+fmt(s.m,1)+'</b></span><span>desvio <b>'+fmt(s.s,2)+'</b></span><span>mín <b>'+fmt(s.mn,1)+'</b></span><span>máx <b>'+fmt(s.mx,1)+'</b></span>'+(s.out?'<span style="color:var(--bad)">'+s.out+' fora da tolerância</span>':'') : '';
        });
      };
      var fillP=function(){
        if(fF.value==='__m'){ fP.closest('.fld').hidden=true;
          man.innerHTML='<label class="fld">Fornecedor<input id="mnF" value="'+esc(v&&!v.libKey?v.fornecedor:'')+'"></label><label class="fld">Cartolina<input id="mnN" value="'+esc(v&&!v.libKey?v.nome:'')+'"></label><label class="fld">Gramagem nominal<input id="mnG" inputmode="decimal" value="'+esc(v&&!v.libKey&&v.g!=null?v.g:'')+'"></label><label class="fld">Tolerância gramagem ±%<input id="mnGt" inputmode="decimal" value="5"></label><label class="fld">Espessura nominal (µm)<input id="mnE" inputmode="decimal" value="'+esc(v&&!v.libKey&&v.e!=null?v.e:'')+'"></label><label class="fld">Tolerância espessura ±%<input id="mnEt" inputmode="decimal" value="5"></label>';
          man.querySelectorAll('input').forEach(function(i){i.addEventListener('input',live)}); live(); return }
        man.innerHTML=''; fP.closest('.fld').hidden=false;
        var items=L.filter(function(l){return l[2]===fF.value}).sort(function(a,b){ return a[1]<b[1]?-1:a[1]>b[1]?1:a[3]-b[3] });
        fP.innerHTML='<option value="">— escolher —</option>'+items.map(function(l){ var k=libKey(l); return '<option value="'+esc(k)+'"'+(k===cur.key?' selected':'')+'>'+esc(l[1])+' · '+fmt(l[3],0)+' g/m²'+(l[0]?' · '+esc(l[0]):'')+'</option>' }).join('');
        live();
      };
      fF.onchange=fillP; fP.onchange=live; box.querySelectorAll('.meas input').forEach(function(i){ i.addEventListener('input',live); i.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); var all=Array.from(box.querySelectorAll('.meas input')); var n=all[all.indexOf(i)+1]; if(n) n.focus() } }) });
      fillP(); cartForm._nominal=nominal;
    },
    validate:function(x){ var n=cartForm._nominal(); if(!n||!n.nome&&!n.fornecedor) return 'Escolha a cartolina.'; if(n.g==null) return 'Falta a gramagem nominal.'; var g=readMeas('mG').filter(function(z){return z!=null}).length, e=readMeas('mE').filter(function(z){return z!=null}).length; if(g<10 && e<10) return 'Faltam medições: '+g+'/10 de gramagem, '+e+'/10 de espessura.'; },
    submit:function(x){
      var n=cartForm._nominal(); var o=Object.assign({},x,n,{gram:readMeas('mG'),esp:readMeas('mE')});
      o.gMedia=A.mean(o.gram); o.eMedia=A.mean(o.esp); o.resultado=veredicto(o);
      if(edit){ o.criadoEm=v.criadoEm; o.criadoPor=v.criadoPor; return A.put('cartolinactrl',v.id,o) } return A.add('cartolinactrl',o);
    },
    del: edit && A.can('qualidade')? function(){ return A.del('cartolinactrl',v.id) } : null
  });
}
var LIBXLSX='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function loadX(){ return window.XLSX? Promise.resolve() : new Promise(function(res,rej){ var s=document.createElement('script'); s.src=LIBXLSX; s.onload=res; s.onerror=rej; document.head.appendChild(s) }) }
function parseLib(aoa){
  var norm=function(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'') };
  for(var r=0;r<Math.min(aoa.length,30);r++){
    var h=aoa[r].map(norm), iF=h.findIndex(function(x){return x.indexOf('fornecedor')>=0}), iG=h.findIndex(function(x){return x.indexOf('gramagem')>=0&&x.indexOf('nominal')>=0}), iE=h.findIndex(function(x){return x.indexOf('espessura')>=0&&x.indexOf('nominal')>=0});
    if(iF<0||iG<0) continue;
    var iN=h.findIndex(function(x){return /designa|produto|cartolina|nome|qualidade comercial/.test(x)}); if(iN<0||iN===iF) iN=iF-1;
    var iC=h.findIndex(function(x,i){return i!==iN&&i!==iF&&/classe|tipo|qualidade/.test(x)}); if(iC<0) iC=iN-1;
    var out=[];
    for(var k=r+1;k<aoa.length;k++){ var a=aoa[k], g=A.num(a[iG]); if(g==null||!a[iF]) continue;
      var e=iE>=0? A.num(a[iE]) : null;
      out.push([iC>=0?String(a[iC]||'').trim():'', String(a[iN]||'').trim(), String(a[iF]).trim(), g, A.num(a[iG+1]), A.num(a[iG+2]), e, iE>=0?A.num(a[iE+1]):null, iE>=0?A.num(a[iE+2]):null]);
    }
    /* garantir ordem máx/mín */
    out.forEach(function(l){ if(l[4]!=null&&l[5]!=null&&l[4]<l[5]){ var t=l[4]; l[4]=l[5]; l[5]=t } if(l[7]!=null&&l[8]!=null&&l[7]<l[8]){ var u=l[7]; l[7]=l[8]; l[8]=u } });
    return out;
  }
  return null;
}
function importLib(){
  if(!S.admin){ A.toast('Só um editor importa a biblioteca.'); return }
  A.showModal('<h2>Importar biblioteca de cartolinas</h2><p class="muted" style="margin:0">Use o ficheiro oficial <b>Base de dados de Cartolinas – Fornecedores.xlsx</b> (QM Quality Management › Controlo de Materiais, no SharePoint). A folha tem de ter as colunas “Fornecedor”, “Gramagem Nominal” e “Espessura Nominal”, cada uma seguida das colunas de máximo e mínimo.</p>'+
    '<input type="file" id="libF" accept=".xlsx,.xls,.csv"><div id="libS" class="muted small"></div><div class="foot"><button class="btn" id="libX">Fechar</button><button class="btn primary" id="libOk" disabled>Importar</button></div>',
    function(){
      var rows=null; $('libX').onclick=A.closeModal;
      $('libF').onchange=async function(e){ var f=e.target.files[0]; if(!f) return; $('libS').textContent='A ler…';
        try{ await loadX() }catch(err){ $('libS').textContent='Não foi possível carregar o leitor de Excel.'; return }
        try{ var wb=XLSX.read(await f.arrayBuffer(),{type:'array'}), best=null; wb.SheetNames.forEach(function(n){ var p=parseLib(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''})); if(p&&(!best||p.length>best.rows.length)) best={n:n,rows:p} });
          if(!best||!best.rows.length){ $('libS').textContent='Não encontrei as colunas esperadas.'; return }
          rows=best.rows; $('libS').innerHTML='Folha <b>'+esc(best.n)+'</b>: '+rows.length+' cartolinas de '+new Set(rows.map(function(r){return r[2]})).size+' fornecedores.'; $('libOk').disabled=false;
        }catch(err){ $('libS').textContent='Não foi possível ler o ficheiro.' } };
      $('libOk').onclick=async function(){ this.disabled=true; $('libS').textContent='A gravar…';
        try{ var parts=Math.ceil(rows.length/400); for(var i=0;i<parts;i++) await S.db.doc('cartolinas/p'+i).set({parte:i, linhas:rows.slice(i*400,(i+1)*400)});
          var old=A.list('cartolinas').filter(function(d){ var m=/^p(\d+)$/.exec(d.id); return !m || +m[1]>=parts }); for(var j=0;j<old.length;j++) await S.db.doc('cartolinas/'+old[j].id).delete();
          await S.db.doc('config/cartolinasMeta').set({total:rows.length, importadoEm:A.nowIso(), importadoPor:S.uid||''});
          A.closeModal(); A.toast(rows.length+' cartolinas importadas.');
        }catch(err){ $('libS').textContent='Não foi possível gravar.'; this.disabled=false } };
    });
}
function cartDetalhe(id){
  var c=A.get('cartolinactrl',id); if(!c) return;
  var g=stats(c.gram||[],c.gMin,c.gMax), e=stats(c.esp||[],c.eMin,c.eMax);
  var rowV=function(arr,lo,hi,d){ return arr.map(function(x){ var o=x!=null&&((lo!=null&&x<lo)||(hi!=null&&x>hi)); return '<td class="n" style="'+(o?'color:var(--bad);font-weight:600':'')+'">'+fmt(x,d)+'</td>' }).join('') };
  A.showModal('<h2>'+esc(c.nome)+' '+verPill(c.resultado)+'</h2><dl class="detail">'+
    [['Fornecedor',c.fornecedor],['Classe',c.classe],['Data',fdate(c.data)],['Lote',c.lote],['Palete / guia',c.palete],['Analista',c.analista]].map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+esc(r[1]||'–')+'</dd></div>'}).join('')+'</dl>'+
    '<div class="tw"><table class="t"><thead><tr><th></th>'+[1,2,3,4,5,6,7,8,9,10].map(function(i){return '<th class="n">'+i+'</th>'}).join('')+'<th class="n">Média</th><th class="n">Desvio</th><th class="n">Tolerância</th></tr></thead><tbody>'+
    '<tr><td><b>Gramagem</b></td>'+rowV(c.gram||[],c.gMin,c.gMax,1)+'<td class="n"><b>'+fmt(g.m,1)+'</b></td><td class="n">'+fmt(g.s,2)+'</td><td class="n">'+fmt(c.gMin,1)+' – '+fmt(c.gMax,1)+'</td></tr>'+
    '<tr><td><b>Espessura</b></td>'+rowV(c.esp||[],c.eMin,c.eMax,0)+'<td class="n"><b>'+fmt(e.m,1)+'</b></td><td class="n">'+fmt(e.s,2)+'</td><td class="n">'+fmt(c.eMin,0)+' – '+fmt(c.eMax,0)+'</td></tr></tbody></table></div>'+
    (c.obs?'<p><b>Observações:</b> '+esc(c.obs)+'</p>':'')+'<div class="foot"><button class="btn" id="kX">Fechar</button><button class="btn primary" id="kE">Editar</button></div>',
    function(){ $('kX').onclick=A.closeModal; $('kE').onclick=function(){cartForm(c)} });
}
A.register('cartolina',{
  html:function(){
    var all=A.list('cartolinactrl').slice().sort(A.by('data',-1)), t=A.tab('cart','reg'), L=lib(), meta=A.cfg('cartolinasMeta');
    var d90=all.filter(function(c){return A.days(c.data)<=90}), nc=d90.filter(function(c){return c.resultado==='nc'}).length;
    var dev=function(c,k){ var m=k==='g'?c.gMedia:c.eMedia, n=k==='g'?c.g:c.e; return m!=null&&n? (m-n)/n*100 : null };
    var body='';
    if(t==='reg'){
      var ff=fv('kf',''), q=fv('kq','').toLowerCase();
      var rows=all.filter(function(c){ return (!ff||c.fornecedor===ff)&&(!q||[c.nome,c.lote,c.palete,c.analista].join(' ').toLowerCase().indexOf(q)>=0) });
      body='<div class="filters"><input type="search" id="kq" data-f="kq" placeholder="Procurar cartolina, lote, palete…" value="'+esc(fv('kq',''))+'"><select data-f="kf">'+selOpts(Array.from(new Set(all.map(function(c){return c.fornecedor}))).sort(),ff,'Todos os fornecedores')+'</select></div>'+
        A.table(rows,[{l:'Data',v:function(c){return fdate(c.data)}},{l:'Cartolina',v:function(c){return '<b>'+esc(c.nome)+'</b><div class="small muted">'+esc(c.fornecedor)+'</div>'}},{l:'Lote',v:function(c){return esc(c.lote||'–')}},
          {l:'Gramagem',n:1,v:function(c){var d=dev(c,'g');return fmt(c.gMedia,1)+' <span class="small muted">/ '+fmt(c.g,0)+'</span><div class="small" style="color:'+(Math.abs(d||0)>((c.gMax-c.g)/c.g*100||5)?'var(--bad)':'var(--muted)')+'">'+(d!=null?(d>0?'+':'')+fmt(d,1)+'%':'')+'</div>'}},
          {l:'Espessura',n:1,v:function(c){var d=dev(c,'e');return fmt(c.eMedia,0)+' <span class="small muted">/ '+fmt(c.e,0)+'</span><div class="small muted">'+(d!=null?(d>0?'+':'')+fmt(d,1)+'%':'')+'</div>'}},
          {l:'Analista',v:function(c){return esc(c.analista||'–')}},{l:'Resultado',v:function(c){return verPill(c.resultado)}}],{click:1,empty:'Ainda sem controlos. Registe o primeiro com “Novo controlo”.'});
    } else if(t==='evo'){
      var prods=Array.from(new Set(all.map(function(c){return c.nome+'|'+c.g+'|'+c.fornecedor}))).sort();
      var sel=fv('kp', prods[0]||''), sp=sel.split('|'), pc=all.filter(function(c){return c.nome+'|'+c.g+'|'+c.fornecedor===sel});
      var last=pc[0]||{};
      var fl=Array.from(new Set(all.map(function(c){return c.fornecedor}))).sort();
      body='<div class="filters"><select data-f="kp">'+selOpts(prods.map(function(p){var s=p.split('|');return [p,s[0]+' · '+s[1]+' g/m² · '+s[2]]}),sel)+'</select></div>'+
        '<div class="grid2"><div class="panel"><h2>Gramagem média por controlo</h2><p class="small muted" style="margin:2px 0 8px">'+esc(sp[0]||'')+' — faixa = tolerância da biblioteca</p>'+Charts.line({series:[{name:'Gramagem média',color:'var(--s1)',pts:pc.map(function(c){return {x:c.data,y:c.gMedia,note:c.lote?'Lote '+c.lote:''}})}],band:last.gMin!=null?{lo:last.gMin,hi:last.gMax}:null,bandLabel:'Tolerância',unit:'g/m²',dec:1,label:'Gramagem'})+'</div>'+
        '<div class="panel"><h2>Espessura média por controlo</h2><p class="small muted" style="margin:2px 0 8px">µm</p>'+Charts.line({series:[{name:'Espessura média',color:'var(--s2)',pts:pc.map(function(c){return {x:c.data,y:c.eMedia,note:c.lote?'Lote '+c.lote:''}})}],band:last.eMin!=null?{lo:last.eMin,hi:last.eMax}:null,bandLabel:'Tolerância',unit:'µm',dec:0,label:'Espessura'})+'</div>'+
        '<div class="panel" style="grid-column:1/-1"><h2>Desvio da gramagem ao nominal, por fornecedor</h2><p class="small muted" style="margin:2px 0 8px">Permite comparar cartolinas de gramagens diferentes · % sobre o nominal</p>'+Charts.line({series:fl.slice(0,8).map(function(f){return {name:f,pts:all.filter(function(c){return c.fornecedor===f}).map(function(c){return {x:c.data,y:dev(c,'g'),note:c.nome+' '+fmt(c.g,0)}})}}),unit:'%',dec:1,w:1240,h:280,band:{lo:-5,hi:5},bandLabel:'±5% referência'})+'</div></div>';
    } else if(t==='forn'){
      var g={}; all.forEach(function(c){ (g[c.fornecedor]=g[c.fornecedor]||[]).push(c) });
      var rows2=Object.keys(g).map(function(f){ var a=g[f]; return {id:f, f:f, n:a.length, ok:a.filter(function(c){return c.resultado==='ok'}).length/a.length*100, nc:a.filter(function(c){return c.resultado==='nc'}).length,
        dg:A.mean(a.map(function(c){return dev(c,'g')})), de:A.mean(a.map(function(c){return dev(c,'e')})), sg:A.mean(a.map(function(c){return A.sd(c.gram||[])})), ult:a[0].data} }).sort(function(a,b){return b.n-a.n});
      body=A.table(rows2,[{l:'Fornecedor',v:function(r){return '<b>'+esc(r.f)+'</b>'}},{l:'Controlos',n:1,v:function(r){return r.n}},{l:'Conformes',n:1,v:function(r){return '<span class="pill '+(r.ok>=95?'ok':r.ok>=80?'warn':'bad')+'">'+fmt(r.ok,0)+'%</span>'}},{l:'Não conformes',n:1,v:function(r){return r.nc}},
        {l:'Desvio gram. médio',n:1,v:function(r){return r.dg!=null?(r.dg>0?'+':'')+fmt(r.dg,1)+'%':'–'}},{l:'Desvio esp. médio',n:1,v:function(r){return r.de!=null?(r.de>0?'+':'')+fmt(r.de,1)+'%':'–'}},{l:'Variação interna (σ gram.)',n:1,v:function(r){return fmt(r.sg,2)}},{l:'Último',n:1,v:function(r){return fdate(r.ult)}}],{empty:'Ainda sem controlos.'});
    } else {
      body='<div class="panel"><div class="ph"><h2>Biblioteca de cartolinas</h2>'+(S.admin?'<button class="btn" id="kImp">Importar Excel</button>':'')+'</div><p class="muted" style="margin:0 0 10px">'+(L.length? L.length+' cartolinas de '+new Set(L.map(function(l){return l[2]})).size+' fornecedores'+(meta.importadoEm?' · importada a '+fdate(meta.importadoEm):'') : 'Ainda não importada. Um editor importa o ficheiro oficial do SharePoint (o mesmo que o Contador de Folhas usa).')+'</p>'+
        '<div class="filters"><input type="search" id="kl" data-f="kl" placeholder="Procurar na biblioteca…" value="'+esc(fv('kl',''))+'"></div>'+
        A.table(L.filter(function(l){var q=fv('kl','').toLowerCase();return !q||l.join(' ').toLowerCase().indexOf(q)>=0}).map(function(l,i){return {id:'l'+i,l:l}}),[{l:'Fornecedor',v:function(r){return esc(r.l[2])}},{l:'Cartolina',v:function(r){return esc(r.l[1])}},{l:'Classe',v:function(r){return esc(r.l[0]||'–')}},{l:'g/m²',n:1,v:function(r){return fmt(r.l[3],0)+' <span class="small muted">('+fmt(r.l[5],1)+'–'+fmt(r.l[4],1)+')</span>'}},{l:'Espessura µm',n:1,v:function(r){return r.l[6]!=null?fmt(r.l[6],0)+' <span class="small muted">('+fmt(r.l[8],0)+'–'+fmt(r.l[7],0)+')</span>':'–'}}],{max:150,empty:'Sem cartolinas.'})+'</div>';
    }
    return A.head({c:C,mod:MOD,title:'Controlo de cartolina',p:'Controlo de matérias-primas por fornecedor: 10 medições de gramagem e 10 de espessura por receção, comparadas com a tolerância da biblioteca.',acts:'<button class="btn primary" id="kNew">+ Novo controlo</button>'})+
      A.kpis([{v:d90.length,l:'Controlos (90 dias)'},{v:d90.length?fmt(d90.filter(function(c){return c.resultado==='ok'}).length/d90.length*100,0)+'%':'–',l:'Conformes (90 dias)'},{v:nc,l:'Não conformes (90 dias)',cls:nc?'bad':''},{v:L.length||'–',l:'Cartolinas na biblioteca'}])+
      A.tabs('cart',[['reg','Controlos'],['evo','Evolução'],['forn','Fornecedores'],['lib','Biblioteca']],t)+body;
  },
  bind:function(r){ $('kNew').onclick=function(){cartForm()}; if($('kImp')) $('kImp').onclick=importLib; A.bindRows(r,function(id){ if(id[0]!=='l'||A.get('cartolinactrl',id)) cartDetalhe(id) }); bindFilters(r); Charts.bind(r) }
});
window.Qualidade={ incForm:incForm, incDetalhe:incDetalhe, incStats:incStats, veredicto:veredicto, incList:incList, incDate:incDate, setores:setores, estPill:estPill, tipoPill:tipoPill };
})();
