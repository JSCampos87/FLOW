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
/* histórico (ficheiros) + registos novos/alterados na base de dados; um registo da BD com o mesmo id substitui o histórico.
   Um registo criado no FLOW também substitui o do histórico com o mesmo n.º (caso o Excel exportado volte a ser importado). */
function incList(){
  var H=S.hist, db=A.list('incidencias'), key=H.fii.length+'|'+H.fiq.length+'|'+db.length+'|'+(S._incStamp||0)+'|'+(A.canonKey? A.canonKey() : '');
  if(S._incCache && S._incCache.k===key) return S._incCache.v;
  var m={}, porNum={}; H.fii.concat(H.fiq).forEach(function(r){ m[r.id]=r; if(r.numero) porNum[r.numero]=r.id });
  db.forEach(function(r){ if(r._del){ delete m[r.id]; return } if(r.numero && porNum[r.numero] && porNum[r.numero]!==r.id) delete m[porNum[r.numero]]; m[r.id]=r });
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
      {k:'defeitoDet',l:'Defeito pormenorizado',list:'dlDefD'}]);
  /* na FIQ quem deteta é sempre o cliente: a secção não aparece (setorDetetado='Cliente' no submit) */
  if(!fiq) F=F.concat([
      {t:'sep',l:'Onde foi detetado'},
      {k:'setorDetetado',l:'Setor',t:'select',o:setores().concat(['Cliente'])},
      {k:'maqDetetou',l:'Máquina',list:'dlMaq'},
      {k:'opDetetou',l:'Operador',list:'dlOp'}]);
  F=F.concat([
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
  if(fiq) F=F.concat([{k:'stock',l:'Stock',t:'number'},{k:'impactoAlimentar',l:'Impacto alimentar',t:'select',o:['Não','Sim']},{k:'m6',l:'Causa (6M)',t:'select',o:M6}]);
  F=F.concat([{t:'sep',l:'Análise e ação'},
      {k:'descricao',l:fiq?'Razão da reclamação':'Descrição',t:'textarea',req:1},
      {k:'causa',l:fiq?'Causa raiz':'Causa',t:'textarea',rows:2}]);
  if(fiq) F.push({k:'acoesReativas',l:'Ações reativas',t:'textarea',rows:2});
  F=F.concat([
      {k:'acao',l:fiq?'Ações preventivas':'Ação corretiva / melhoria',t:'textarea',rows:2},
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
    after:function(){ autoFill(edit) },
    validate:function(x){ if(x.estado==='Fechada' && !x.dataFecho) return 'Indique a data de fecho.' },
    submit:function(x){
      x.tipo=tipo; if(fiq){ x.setorDetetado='Cliente'; if(!x.dataIncidencia) x.dataIncidencia=x.dataEntrega||x.dataReclamacao }
      if(x.cliente) x.cliente=A.canon('cliente',x.cliente);
      if(fiq && x.dataResposta && x.dataReclamacao) x.tempoResposta=A.days(x.dataReclamacao,x.dataResposta);
      if(!x.numero) x.numero=nextNum(tipo, String(x.dataIncidencia||A.today()).slice(0,4));
      S._incStamp=(S._incStamp||0)+1;
      if(edit){ var o=Object.assign({},A.clean(v),x); delete o._k; return A.put('incidencias',v.id,o) }
      if(incList().some(function(i){return i.numero===x.numero})) throw A.uerr('Já existe uma incidência com o n.º '+x.numero+'.');
      return A.add('incidencias',x);
    }});
}
/* ---------- preenchimento automático a partir da OF / MM ----------
   OF → MM (incidências anteriores, produção, mapa de entregas); MM → artigo e cortante (specs: SAP + Dados + Embalamento)
   e cliente (incidências anteriores da mesma OF/MM, specs, mapa de entregas). Como o PROCV do Excel das reclamações. */
function sameOF(a,b){ a=String(a||'').replace(/^A/i,'').trim(); return a!=='' && a===String(b||'').replace(/^A/i,'').trim() }
function ofInfo(of, mm){
  of=String(of||'').trim(); mm=String(mm||'').trim();
  var r={}, put=function(k,v){ if(!r[k] && v!=null && String(v).trim()!=='') r[k]=String(v).trim() };
  var inc=incList().slice().sort(function(a,b){ var x=incDate(a), y=incDate(b); return y<x?-1:y>x?1:0 });
  var ent=[]; if(window.Embalamento&&Embalamento.mapas) Embalamento.mapas().forEach(function(m){ (m.linhas||[]).forEach(function(l){ ent.push(l) }) });
  if(of){
    var hi=inc.filter(function(i){ return sameOF(i.of,of) });
    hi.forEach(function(i){ put('mm',i.mm); put('cliente',i.cliente); put('artigo',i.artigo); put('cortante',i.cortante) });
    A.list('producao').forEach(function(p){ if(sameOF(p.of,of)) put('mm',p.mm) });
    ent.forEach(function(l){ if(sameOF(l.of,of)){ put('mm',l.mm); put('cliente',l.cliente) } });
  }
  if(mm) r.mm=mm; mm=r.mm;
  if(mm){
    var s=(window.Embalamento&&Embalamento.specs? Embalamento.specs()[mm] : null)||{};
    var sa={artigo:s.descricao, cortante:s.cortante};
    ['artigo','cortante'].forEach(function(k){ if(sa[k]) r[k]=String(sa[k]).trim() });   /* a ficha do MM prevalece sobre registos antigos */
    put('cliente',s.cliente);
    inc.forEach(function(i){ if(String(i.mm||'')===mm){ put('cliente',i.cliente); put('artigo',i.artigo); put('cortante',i.cortante) } });
    ent.forEach(function(l){ if(String(l.mm||'')===mm) put('cliente',l.cliente) });
  }
  if(r.cliente) r.cliente=A.canon('cliente',r.cliente);
  return r;
}
function autoFill(edit){
  var fOf=$('f_of'), fMm=$('f_mm'); if(!fOf||!fMm) return;
  var KS=['mm','cliente','artigo','cortante'], hint=document.createElement('div'); hint.className='small muted'; hint.style.gridColumn='1/-1'; hint.style.marginTop='-4px';
  var ref=($('f_cortante')||fMm).closest('.fld'); if(ref&&ref.parentNode) ref.parentNode.insertBefore(hint, ref.nextSibling);
  /* só escreve em campos vazios ou que tenham sido preenchidos automaticamente (não apaga o que o utilizador escreveu) */
  var run=function(src){
    var info=ofInfo(fOf.value, src==='of'&&fMm.dataset.auto===fMm.value? '' : fMm.value), n=[];
    KS.forEach(function(k){ var el=$('f_'+k); if(!el||!info[k]) return; if(el.value.trim()==='' || el.dataset.auto===el.value){ if(el.value!==info[k]) n.push(k); el.value=info[k]; el.dataset.auto=info[k] } });
    hint.textContent=n.length? 'Preenchido automaticamente a partir da '+(src==='of'?'OF':'MM')+': '+n.map(function(k){return {mm:'MM',cliente:'cliente',artigo:'artigo',cortante:'cortante'}[k]}).join(', ')+'.' :
      (fOf.value.trim()||fMm.value.trim()) && !info.mm && !info.cliente? 'Sem dados conhecidos para esta OF / MM — preencha à mão.' : '';
  };
  fOf.addEventListener('change',function(){ run('of') }); fMm.addEventListener('change',function(){ run('mm') });
  if(!edit && (fOf.value||fMm.value)) run('of');
}
Q2.ofInfo=ofInfo;
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
    '<div class="foot">'+(i.historico&&!i.alteradoEm?'<span class="small muted" style="margin-right:auto">Importado do ficheiro histórico</span>':'')+'<button class="btn" id="iX">Fechar</button><button class="btn" id="iP">Imprimir folha de rosto</button><button class="btn primary" id="iE">Editar</button></div>',
    function(){ $('iX').onclick=A.closeModal; $('iE').onclick=function(){ incForm(i) }; $('iP').onclick=function(){ Q2.rosto(i.tipo,i) } });
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
        acts:(S.admin?'<button class="btn" id="qImpX">Importar Excel atualizado</button>':'')+'<button class="btn" id="qExp">Exportar Excel</button><button class="btn" id="qPdf">Gerar PDF</button><button class="btn" id="qNewI">+ Nova FII</button><button class="btn primary" id="qNewC">+ Nova FIQ</button>'})+expAviso()+
      A.kpis([{v:fmt(st.fii,0),l:'FII (filtro atual)'},{v:fmt(st.fiq,0),l:'FIQ (filtro atual)'},{v:st.abertas,l:'Em aberto',cls:st.abertas?'warn':''},
        {v:fmt(st.custo,0)+' €',l:'Custo associado'},{v:st.reprocTot?fmt(st.reprocTot,0)+' h':'–',l:'Horas de reprocessamento'},{v:st.devol,l:'Com devolução'}])+
      A.tabs('inc',[['lista','Registos'],['graf','Indicadores']],t)+filt+body;
  },
  bind:function(r){ $('qNewI').onclick=function(){incForm(null,'FII')}; $('qPdf').onclick=function(){ Q2.pdfDialog() }; $('qExp').onclick=expExcel; $('qNewC').onclick=function(){incForm(null,'FIQ')}; if($('qImpX')) $('qImpX').onclick=function(){ impExcel(['FII','FIQ']) }; A.bindRows(r,incDetalhe); bindFilters(r); Charts.bind(r) }
});

/* ---------- importar os Excel atualizados de FII e FIQ ----------
   Mesma leitura que scripts/build_data.py (folha BD, mesmas colunas e mesmos ids), feita no browser.
   O resultado substitui o histórico (flow_hist/fii ou fiq, gzip+base64 em partes, como scripts/upload_hist.mjs).
   Registos criados ou alterados na app (coleção incidencias) continuam a prevalecer sobre o histórico. */
var SETMAP={'fecho/ colagem':'Colagem','colagem':'Colagem','corte e vinco':'Corte e Vinco','cv':'Corte e Vinco','impressão':'Impressão','imp':'Impressão','logistica':'Logística','logística':'Logística','embalamento':'Embalamento','contracolagem':'Contracolagem','prepress':'Prepress','corte de cartolina':'Corte de Cartolina','guilhotinas':'Guilhotinas','janelas':'Janelas','estampagem':'Estampagem','subcontratação':'Subcontratação','supply chain':'Supply Chain','comercial':'Comercial','pasaban':'Pasaban','receção':'Receção','ptg':'PTG','laboratório':'Laboratório','cliente':'Cliente'};
var X={
  isD:function(v){ return v instanceof Date && !isNaN(v) },
  /* datas do Excel: Date (cellDates) com meio-dia de margem para o desvio de fuso do leitor, n.º de série, ou texto dd/mm/aaaa */
  d:function(v){ var p=function(n){return (n<10?'0':'')+n};
    if(X.isD(v)){ var t=new Date(v.getTime()+12*3600e3); return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate()) }
    if(typeof v==='number' && v>20000 && v<80000){ var u=new Date(Date.UTC(1899,11,30)+Math.floor(v)*864e5); return u.getUTCFullYear()+'-'+p(u.getUTCMonth()+1)+'-'+p(u.getUTCDate()) }
    if(typeof v==='string'){ var m=/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(v.trim()); if(m) return m[3]+'-'+p(+m[2])+'-'+p(+m[1]) }
    return null },
  n:function(v){ if(v==null||v==='') return null; if(typeof v==='number') return Number.isInteger(v)? v : Math.round(v*1e4)/1e4; if(X.isD(v)) return null; var f=parseFloat(String(v).replace(',','.')); return isNaN(f)||!/^\s*[-+]?[\d.,]+(e[-+]?\d+)?\s*$/i.test(String(v))? null : f },
  s:function(v){ if(v==null) return ''; if(X.isD(v)) return X.d(v)||''; return String(v).replace(/\s+/g,' ').trim() },
  py:function(v){ return v==null? 'None' : X.s(v) },   /* como o f-string do Python (ids iguais aos do build_data.py) */
  setor:function(v){ var k=X.s(v).toLowerCase(); return SETMAP[k]||X.s(v) },
  maq:function(v){ v=X.s(v).toUpperCase().replace(/ /g,''); var M={'B142-E':'B142E','LOGISTICA':'LOGÍSTICA','NÃOAPLICAVEL':'','NÃOAPLICÁVEL':''}; return v in M? M[v] : v },
  auto:function(a,b){ var r=''; [a,b].some(function(v){ var x=X.s(v).toLowerCase(); if(x.indexOf('sim')===0||x.indexOf('detetado')===0){ r='sim'; return true } if(x.indexOf('não')===0||x.indexOf('nao')===0){ r='não'; return true } }); return r },
  r2:function(v){ var x=X.n(v); return typeof x==='number'? Math.round(x*100)/100 : null },
  pad:function(v,n){ return ('0000'+Math.trunc(v)).slice(-Math.max(n,String(Math.trunc(v)).length)) },
  clean:function(o){ var r={}; Object.keys(o).forEach(function(k){ var v=o[k]; if(v!=null && v!=='' && !(Array.isArray(v)&&!v.length)) r[k]=v }); return r }
};
function parseFII(rows){
  var out=[];
  rows.forEach(function(r,i){ if(i===0 || !(r[1]||r[2])) return;
    var ano=r[37] || (X.isD(r[5])? new Date(r[5].getTime()+12*3600e3).getFullYear() : null);
    var ops=[r[25],r[26],r[27]].map(X.s).filter(Boolean), tr=X.n(r[15]);
    var o=X.clean({id:'h-fii-'+X.py(ano)+'-'+X.py(r[1]),tipo:'FII',numero:typeof r[1]==='number'? 'FII-'+X.py(ano)+'-'+X.pad(r[1],4) : 'FII-'+X.py(ano)+'-'+X.s(r[1]),
      of:X.s(r[2]),mm:X.s(r[31]),cliente:X.s(r[30]),artigo:X.s(r[29]),dataIncidencia:X.d(r[5]),defeito:X.s(r[3]),defeitoDet:X.s(r[4]),
      maqOrigem:X.maq(r[8]),setorOrigem:r[41]? X.setor(r[41]) : '',opOrigem:ops.join(', '),opDetetou:X.s(r[28]),
      autoDetecao:X.auto(r[43],r[19]),qtdAfetada:X.n(r[9]),qtdRejeitada:X.n(r[10]),unidade:X.s(r[11]),folhasRej:X.n(r[39]),
      tempoReproc:tr? Math.round(tr/60*100)/100 : null,tipoReproc:['N/A',''].indexOf(X.s(r[16]))<0? X.s(r[16]) : '',causa:X.s(r[13]),acao:X.s(r[14]),observacoes:X.s(r[20]),
      cortante:X.s(r[33]),custo:X.r2(r[49]),m2Rej:X.r2(r[47]),dataFecho:X.d(r[45]),estado:X.d(r[45])?'Fechada':'Registada',historico:1});
    var di=o.dataIncidencia;
    if(ano && (!di || Math.abs(+di.slice(0,4)-(+ano))>1)){
      var mes=(typeof r[36]==='number' && r[36]>=1 && r[36]<=12)? Math.trunc(r[36]) : 1, mm=(mes<10?'0':'')+mes;
      o.dataIncidencia=Math.trunc(+ano)+'-'+mm+'-'+(di && di.slice(5,7)===mm? di.slice(8,10) : '01'); o.dataAprox=1 }
    if(o.dataIncidencia) out.push(o) });
  return out;
}
function parseFIQ(rows){
  var out=[];
  rows.forEach(function(r,i){ if(i===0 || r[2]==null || r[2]==='' || !r[3]) return;
    var ano=r[45], tr=X.n(r[30]), est=X.s(r[34])||'Aberta', tresp=X.n(r[15]);
    out.push(X.clean({id:'h-fiq-'+X.py(ano)+'-'+X.s(r[2]),tipo:'FIQ',numero:typeof r[2]==='number'? 'FIQ-'+X.py(ano)+'-'+X.pad(r[2],3) : 'FIQ-'+X.py(ano)+'-'+X.s(r[2]),
      cliente:X.s(r[3]),dataReclamacao:X.d(r[4]),of:X.s(r[5]),mm:X.s(r[6]),recDev:X.s(r[7]),descricao:X.s(r[8]),dataEntrega:X.d(r[9]),dataIncidencia:X.d(r[9])||X.d(r[4]),
      qtdEntregue:X.n(r[10]),qtdDevolvida:X.n(r[11]),stock:X.n(r[12]),devolucao:((X.n(r[11])||0)>0||X.s(r[7])==='Dev')? 1 : null,dataResposta:X.d(r[14]),
      tempoResposta:(typeof tresp==='number' && tresp>=0 && tresp<400)? tresp : null,classificacao:X.s(r[16]),maqOrigem:X.maq(r[18]),turno:X.s(r[19]),opOrigem:X.s(r[20]),
      defeito:X.s(r[21]),defeitoDet:X.s(r[22]),setorOrigem:X.setor(r[23]),setorDetetado:'Cliente',acao:X.s(r[24]),qtdRejeitada:X.n(r[25]),valorCRC:X.n(r[28]),
      tempoReproc:tr? Math.round(tr/60*100)/100 : null,tipoReproc:X.s(r[29]),valorFatura:X.n(r[31]),acoesReativas:X.s(r[33]),estado:est.toLowerCase().indexOf('fech')===0?'Fechada':'Aberta',
      artigo:X.s(r[35]),causa:X.s(r[38]),cortante:X.s(r[40]),custoTransporte:X.n(r[52]),custoReproc:X.n(r[53]),custo:X.r2(r[54]),
      impactoAlimentar:X.s(r[56]),m6:X.s(r[58]),recusada:/recusad/.test((X.s(r[21])+X.s(r[23])).toLowerCase())? 1 : null,historico:1})) });
  return out;
}
async function gzipB64(txt){
  var buf=new Uint8Array(await new Response(new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()), bin='';
  for(var i=0;i<buf.length;i+=32768) bin+=String.fromCharCode.apply(null, buf.subarray(i,i+32768));
  return btoa(bin);
}
async function enviarHist(nome, arr){
  var raw=JSON.stringify(arr), gz=await gzipB64(raw), PARTE=900000, partes=Math.ceil(gz.length/PARTE), v=new Date().toISOString();
  for(var i=0;i<partes;i++) await A.put('hist', nome+'_p'+i, {nome:nome, parte:i, v:v, gz:gz.slice(i*PARTE,(i+1)*PARTE)});
  var meta=(await S.db.doc('hist/meta').get())||{}; meta=A.clean(meta); delete meta.alteradoEm;
  meta[nome]={v:v, partes:partes, bytes:raw.length};
  await A.put('hist','meta',meta);
  try{ localStorage.setItem('flow_hist_'+nome, JSON.stringify({v:v, gz:gz})) }catch(e){}
}
/* reclamações a fornecedores: folha Seixezelo, como no build_data.py (sem o limite de 600 linhas) */
function parseRF(rows){
  var out=[];
  rows.forEach(function(r,i){ if(i===0 || r[0]==null || r[0]==='' || !X.d(r[2]) || !r[7]) return;
    var dt=X.d(r[2]), ano=dt.slice(0,4), tf=X.s(r[5]);
    out.push(X.clean({id:'h-rf-'+ano+'-'+X.s(r[0]),numero:typeof r[0]==='number'? 'RF-'+ano+'-'+X.pad(r[0],3) : 'RF-'+ano+'-'+X.s(r[0]),data:dt,
      tipoForn:({F:'Fornecedor',S:'Subcontratado'})[tf]||tf,codFornecedor:X.s(r[6]),fornecedor:X.s(r[7]),mm:X.s(r[9]),produto:X.s(r[10]),sscc:X.s(r[11]),lote:X.s(r[12]),
      naoConformidade:X.s(r[13])||X.s(r[1]),tipoDefeito:X.s(r[16])!=='N/A'? X.s(r[16]) : '',localDetecao:X.setor(r[17]),ofPed:X.s(r[18]),guiaDevolucao:X.s(r[19])!=='0'? X.s(r[19]) : '',
      kg:X.n(r[20]),qtdAfetada:X.n(r[21]),unidade:X.s(r[22]).toUpperCase(),qtdDevolucao:X.n(r[23]),custoDevolucao:X.n(r[25]),custoProducao:X.n(r[26]),qtdRejeitada:X.n(r[27]),
      custoRejeicao:X.n(r[29]),custoTotal:X.n(r[30]),obs:X.s(r[31]).slice(0,600),dataResposta:X.d(r[32]),dataCredito:X.d(r[33]),valorCreditado:X.n(r[34]),notaCredito:X.s(r[36]),
      acoesCorretivas:X.s(r[37]),estado:X.s(r[38]).toLowerCase()==='sim'?'Fechada':'Aberta',historico:1})) });
  return out;
}
/* tipos de Excel que se podem importar: folha, leitura e histórico (S.hist[k]) onde fica */
var IMPX={
  FII:{k:'fii',folha:'BD',nome:'FII — Indicadores FIIs',fich:'INDICADORES_FIIs….xlsx',re:/fii/i,parse:parseFII,data:'dataIncidencia'},
  FIQ:{k:'fiq',folha:'BD',nome:'FIQ — Reclamações de clientes',fich:'Reclamações Clientes….xlsx',re:/fiq|cliente/i,parse:parseFIQ,data:'dataReclamacao'},
  RF:{k:'rf',folha:'Seixezelo',nome:'Reclamações a fornecedores',fich:'Reclamações Fornecedores….xlsx',re:/fornec/i,parse:parseRF,data:'data'}
};
/* tipos = lista de chaves de IMPX que este botão oferece */
function impExcel(tipos){
  tipos=Array.isArray(tipos)? tipos : ['FII','FIQ'];
  if(!S.db || typeof S.db.doc('hist/meta').get!=='function'){ A.toast('Sem ligação à base de dados partilhada.'); return }
  var titulo=tipos.join(' / '), folhas=Array.from(new Set(tipos.map(function(t){return IMPX[t].folha})));
  A.showModal('<h2>Importar Excel atualizado'+(tipos.length>1?' de '+esc(titulo):' · '+esc(IMPX[tipos[0]].nome))+'</h2><p class="muted" style="margin:0">Escolha o ficheiro mais recente: '+tipos.map(function(t){ return '<b>'+esc(IMPX[t].fich)+'</b>'+(tipos.length>1?' ('+t+')':'') }).join(' ou ')+
      '. É lida a folha <b>'+folhas.join('</b> / <b>')+'</b> e o histórico é substituído pelo do ficheiro. Os registos criados ou alterados aqui no FLOW mantêm-se.</p>'+
    (tipos.length>1?'<label class="fld">Tipo<select id="ixT"><option value="">Detetar pelo nome do ficheiro</option>'+tipos.map(function(t){ return '<option value="'+t+'">'+esc(IMPX[t].nome)+'</option>' }).join('')+'</select></label>':'')+
    '<label class="fld">Ficheiro Excel<input type="file" id="ixF" accept=".xlsx,.xlsm,.xls"></label><div id="ixS" class="small muted"></div>'+
    '<div class="foot"><button class="btn" id="ixX">Cancelar</button><button class="btn primary" id="ixOk" disabled>Importar</button></div>',
    function(){
      var res=null, erro=function(h){ $('ixS').innerHTML='<span style="color:var(--bad)">'+h+'</span>' }; $('ixX').onclick=A.closeModal;
      $('ixF').onchange=async function(){ var f=this.files[0]; res=null; $('ixOk').disabled=true; if(!f) return;
        $('ixS').textContent='A ler '+f.name+'…';
        try{ await A.loadX() }catch(e){ $('ixS').textContent='Não foi possível carregar o leitor de Excel.'; return }
        try{
          var tipo=tipos.length===1? tipos[0] : ($('ixT').value || tipos.filter(function(t){ return IMPX[t].re.test(f.name) })[0] || '');
          if(!tipo){ erro('Não consegui perceber pelo nome do ficheiro o tipo. Escolha o tipo e volte a escolher o ficheiro.'); return }
          var T=IMPX[tipo], wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true}), sn=wb.SheetNames.filter(function(n){return n.trim().toUpperCase()===T.folha.toUpperCase()})[0];
          if(!sn){ erro('O ficheiro não tem a folha <b>'+esc(T.folha)+'</b>.'); return }
          var rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null}), arr=T.parse(rows), atual=S.hist[T.k]||[];
          if(!arr.length){ erro('Nenhum registo encontrado na folha '+esc(T.folha)+'. Confirme que é o ficheiro certo.'); return }
          var ids={}; atual.forEach(function(x){ ids[x.id]=1 }); var novos=arr.filter(function(x){ return !ids[x.id] }).length;
          var anos={}; arr.forEach(function(x){ var a=String(x[T.data]||x.dataIncidencia||'').slice(0,4); if(a) anos[a]=(anos[a]||0)+1 });
          res={tipo:tipo, arr:arr, cab:(rows[0]||[]).map(function(c){ return X.s(c) })};
          $('ixS').innerHTML='<b>'+esc(T.nome)+'</b> · '+fmt(arr.length,0)+' registos no ficheiro (agora há '+fmt(atual.length,0)+'; <b>'+fmt(novos,0)+' novos</b>). Por ano: '+Object.keys(anos).sort().map(function(a){return a+': '+anos[a]}).join(' · ')+
            (arr.length<atual.length*0.8?'<br><span style="color:var(--warn)">Atenção: o ficheiro tem bastante menos registos do que o histórico atual.</span>':'');
          $('ixOk').disabled=false;
        }catch(e){ console.error(e); erro('Erro a ler o ficheiro: '+esc(e.message||e)) }
      };
      $('ixOk').onclick=async function(){ if(!res) return; var b=this, T=IMPX[res.tipo]; b.disabled=true; b.textContent='A enviar…';
        try{ await enviarHist(T.k, res.arr); S.hist[T.k]=res.arr;
          /* títulos das colunas, para a exportação usar os mesmos */
          var cab={}; cab[res.tipo]=res.cab; A.put('config','qualidadeCab',Object.assign({},A.clean(A.cfg('qualidadeCab')||{}),cab)).catch(function(){}); S._incCache=null; S._rfCache=null; A.closeModal(); A.toast(T.nome+' atualizado: '+fmt(res.arr.length,0)+' registos.'); A.render() }
        catch(e){ console.error(e); b.disabled=false; b.textContent='Importar'; erro('Não foi possível gravar: '+esc(e.message||e)) } };
    });
}
Q2.impExcel=impExcel;

/* ---------- exportar para Excel com a estrutura dos ficheiros originais (cópia de segurança semanal) ----------
   Cada valor vai para a mesma coluna que parseFII / parseFIQ / parseRF (e o build_data.py) leem, por isso o ficheiro
   exportado volta a ser importável. Títulos: os do último Excel importado (config/qualidadeCab); sem eles, os de CAB.
   Campos que só existem no FLOW vão em colunas extra no fim ("FLOW · …"), que a importação ignora. */
var CAB={
  FII:{n:52, c:{1:'N.º FII',2:'OF',3:'Motivo / defeito',4:'Defeito pormenorizado',5:'Data',8:'Máquina',9:'Qtd afetada',10:'Qtd rejeitada',11:'Unidade',13:'Causa',14:'Ação',15:'Tempo de reprocessamento (min)',16:'Tipo de reprocessamento',19:'Detetado pelo operador',20:'Observações',
    25:'Operador 1',26:'Operador 2',27:'Operador 3',28:'Detetado por',29:'Artigo',30:'Cliente',31:'MM',33:'Cortante',36:'Mês',37:'Ano',39:'Folhas rejeitadas',41:'Setor',43:'Detetado pelo próprio operador',45:'Data de fecho',47:'m² rejeitados',49:'Custo (€)'},
    extra:[['estado','Estado'],['setorDetetado','Setor que detetou'],['maqDetetou','Máquina que detetou'],['turno','Turno'],['descricao','Descrição'],['responsavel','Responsável'],['prazo','Prazo','d'],['eficacia','Eficácia'],['id','Id FLOW']]},
  FIQ:{n:60, c:{2:'N.º FIQ',3:'Cliente',4:'Data da reclamação',5:'OF',6:'MM',7:'Rec / Dev',8:'Razão da reclamação',9:'Data de entrega',10:'Qtd entregue',11:'Qtd devolvida',14:'Data de resposta',15:'Tempo de resposta (dias)',16:'Classificação',18:'Máquina',19:'Turno',20:'Operador',
    21:'Defeito',22:'Defeito pormenorizado',23:'Setor',24:'Ação',25:'Qtd rejeitada',28:'Valor CRC',29:'Tipo de reprocessamento',30:'Tempo de reprocessamento (min)',31:'Valor fatura',33:'Ações reativas',34:'Estado',35:'Artigo',38:'Causa raiz',40:'Cortante',45:'Ano',52:'Custo transporte',53:'Custo reprocessamento',54:'Custo efetivo total',56:'Impacto alimentar',58:'6M'},
    extra:[['responsavel','Responsável'],['prazo','Prazo','d'],['dataFecho','Data de fecho','d'],['eficacia','Eficácia'],['observacoes','Observações'],['id','Id FLOW']]},
  RF:{n:41, c:{0:'N.º',1:'Não conformidade',2:'Data',5:'F / S',6:'Código fornecedor',7:'Fornecedor',9:'MM',10:'Produto',11:'SSCC',12:'Lote',13:'Não conformidade',16:'Tipo de defeito',17:'Local de deteção',18:'OF / pedido',19:'Guia de devolução',20:'Kg',21:'Qtd afetada',22:'Unidade',
    23:'Qtd devolução',25:'Custo devolução',26:'Custo produção / escolha',27:'Qtd rejeitada',29:'Custo rejeição',30:'Total de custos',31:'Observações',32:'Respondido a',33:'Data do crédito',34:'Valor creditado',36:'N.º nota de crédito',37:'Ações corretivas',38:'Fechada'},
    extra:[['estado','Estado'],['id','Id FLOW']]}
};
var EXPX={FII:{folha:'BD',fich:'INDICADORES_FIIs'},FIQ:{folha:'BD',fich:'Reclamações Clientes'},RF:{folha:'Seixezelo',fich:'Reclamações Fornecedores'}};
function xd(s){ var m=/^(\d{4})-(\d\d)-(\d\d)/.exec(String(s||'')); return m? new Date(+m[1],+m[2]-1,+m[3]) : null }   /* data local → célula de data no Excel */
function xn(v){ return v==null||v===''? null : (typeof v==='number'||!/^[1-9]\d{0,14}$/.test(String(v))? v : +v) }   /* texto numérico → número (como no Excel), exceto com zeros à esquerda */
/* N.º "FII-2026-0012" → ano 2026 e 12 (número, como no Excel); outros formatos ficam em texto */
function numParts(numero, tipo, data){ var m=new RegExp('^'+tipo+'-(\\d{4})-(.+)$').exec(String(numero||'')); var ano=m? +m[1] : +String(data||'').slice(0,4)||null, n=m? m[2] : String(numero||'');
  return {ano:ano, n:/^\d+$/.test(n)? +n : n} }
function rowFII(i){ var r=[], p=numParts(i.numero,'FII',i.dataIncidencia), ops=String(i.opOrigem||'').split(',').map(function(s){return s.trim()}).filter(Boolean);
  r[1]=p.n; r[2]=xn(i.of); r[3]=i.defeito; r[4]=i.defeitoDet; r[5]=xd(i.dataIncidencia); r[8]=i.maqOrigem; r[9]=i.qtdAfetada; r[10]=i.qtdRejeitada; r[11]=i.unidade; r[13]=i.causa; r[14]=i.acao;
  r[15]=i.tempoReproc!=null? Math.round(i.tempoReproc*60*100)/100 : null; r[16]=i.tipoReproc; r[20]=i.observacoes; r[25]=ops[0]; r[26]=ops[1]; r[27]=ops.slice(2).join(', ')||null; r[28]=i.opDetetou;
  r[29]=i.artigo; r[30]=i.cliente; r[31]=xn(i.mm); r[33]=i.cortante; r[36]=i.dataIncidencia? +String(i.dataIncidencia).slice(5,7) : null; r[37]=p.ano; r[39]=i.folhasRej; r[41]=i.setorOrigem;
  r[43]=i.autoDetecao==='sim'?'Sim':i.autoDetecao==='não'?'Não':null; r[45]=xd(i.dataFecho); r[47]=i.m2Rej; r[49]=i.custo; return r }
function rowFIQ(i){ var r=[], p=numParts(i.numero,'FIQ',i.dataReclamacao);
  r[2]=p.n; r[3]=i.cliente; r[4]=xd(i.dataReclamacao); r[5]=xn(i.of); r[6]=xn(i.mm); r[7]=i.recDev||(i.devolucao?'Dev':null); r[8]=i.descricao; r[9]=xd(i.dataEntrega); r[10]=i.qtdEntregue!=null? i.qtdEntregue : i.qtdAfetada; r[11]=i.qtdDevolvida; r[12]=i.stock;
  r[14]=xd(i.dataResposta); r[15]=i.tempoResposta; r[16]=i.classificacao; r[18]=i.maqOrigem; r[19]=i.turno; r[20]=i.opOrigem; r[21]=i.defeito; r[22]=i.defeitoDet; r[23]=i.setorOrigem; r[24]=i.acao; r[25]=i.qtdRejeitada;
  r[28]=i.valorCRC; r[29]=i.tipoReproc; r[30]=i.tempoReproc!=null? Math.round(i.tempoReproc*60*100)/100 : null; r[31]=i.valorFatura; r[33]=i.acoesReativas; r[34]=i.estado; r[35]=i.artigo; r[38]=i.causa; r[40]=i.cortante; r[45]=p.ano;
  r[52]=i.custoTransporte; r[53]=i.custoReproc; r[54]=i.custo; r[56]=i.impactoAlimentar; r[58]=i.m6; return r }
function rowRF(x){ var p=numParts(x.numero,'RF',x.data), r=[];
  r[0]=p.n; r[1]=x.naoConformidade; r[2]=xd(x.data); r[5]=({Fornecedor:'F',Subcontratado:'S'})[x.tipoForn]||x.tipoForn; r[6]=xn(x.codFornecedor); r[7]=x.fornecedor; r[9]=xn(x.mm); r[10]=x.produto; r[11]=x.sscc; r[12]=x.lote; r[13]=x.naoConformidade;
  r[16]=x.tipoDefeito; r[17]=x.localDetecao; r[18]=x.ofPed; r[19]=x.guiaDevolucao; r[20]=x.kg; r[21]=x.qtdAfetada; r[22]=x.unidade; r[23]=x.qtdDevolucao; r[25]=x.custoDevolucao; r[26]=x.custoProducao; r[27]=x.qtdRejeitada;
  r[29]=x.custoRejeicao; r[30]=x.custoTotal; r[31]=x.obs; r[32]=xd(x.dataResposta); r[33]=xd(x.dataCredito); r[34]=x.valorCreditado; r[36]=x.notaCredito; r[37]=x.acoesCorretivas; r[38]=x.estado==='Fechada'?'Sim':'Não'; return r }
function folhaExp(tipo){
  var C=CAB[tipo], cab=(A.cfg('qualidadeCab')||{})[tipo], recs, fn, d;
  if(tipo==='RF'){ recs=window.Fornecedores? Fornecedores.rfList() : []; fn=rowRF; d=function(x){return String(x.data||'')} }
  else { recs=incList().filter(function(i){return i.tipo===tipo}); fn=tipo==='FII'?rowFII:rowFIQ; d=incDate }
  recs=recs.slice().sort(function(a,b){ var x=d(a), y=d(b); return x<y?-1:x>y?1:(a.numero||'')<(b.numero||'')?-1:1 });
  var n=Math.max(C.n, cab&&cab.length||0), h=[];
  for(var k=0;k<n;k++) h[k]=(cab&&cab[k]!=null&&cab[k]!=='')? cab[k] : (C.c[k]||'');
  C.extra.forEach(function(e){ h.push('FLOW · '+e[1]) });
  var aoa=[h].concat(recs.map(function(x){ var r=fn(x); for(var k=0;k<n;k++) if(r[k]===undefined||r[k]==='') r[k]=null;
    C.extra.forEach(function(e,j){ var v=x[e[0]]; r[n+j]=v==null||v===''? null : e[2]==='d'? xd(v) : v }); return r }));
  var ws=XLSX.utils.aoa_to_sheet(aoa,{cellDates:false,dateNF:'dd/mm/yyyy'});
  ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:aoa.length-1,c:h.length-1}})};
  return {ws:ws, n:recs.length};
}
function expExcel(){
  var ult=(A.cfg('qualidadeExport')||{}).em, tem=(A.cfg('qualidadeCab')||{});
  A.showModal('<h2>Exportar para Excel</h2><p class="muted" style="margin:-6px 0 0">Cópia de segurança com a mesma estrutura dos ficheiros originais (folha <b>BD</b> para FII e FIQ, <b>Seixezelo</b> para fornecedores): cada coluna no mesmo sítio, por isso o ficheiro pode voltar a ser importado. Os campos que só existem no FLOW vão em colunas extra no fim. Recomendado: uma vez por semana.</p>'+
    '<div class="form"><label class="fld check full"><input type="checkbox" id="exFII" checked>FII — INDICADORES_FIIs (folha BD)</label><label class="fld check full"><input type="checkbox" id="exFIQ" checked>FIQ — Reclamações Clientes (folha BD)</label><label class="fld check full"><input type="checkbox" id="exRF" checked>Reclamações Fornecedores (folha Seixezelo)</label></div>'+
    '<p class="small muted" style="margin:0">'+(ult?'Última exportação: '+fdate(ult)+' ('+A.days(ult)+' dias).':'Ainda sem exportações registadas.')+(['FII','FIQ','RF'].some(function(t){return !tem[t]})?' Os títulos das colunas são os do último Excel importado; para os tipos ainda não importados no FLOW usam-se títulos descritivos (as posições das colunas são sempre as originais).':'')+'</p>'+
    '<div id="exS" class="small muted"></div><div class="foot"><button class="btn" id="exX">Cancelar</button><button class="btn primary" id="exOk">Exportar</button></div>',
  function(){ $('exX').onclick=A.closeModal;
    $('exOk').onclick=async function(){ var b=this, tipos=['FII','FIQ','RF'].filter(function(t){return $('ex'+t).checked}); if(!tipos.length) return;
      b.disabled=true; $('exS').textContent='A preparar…';
      try{ await A.loadX();
        var dia=A.today(), tot=[];
        for(var i=0;i<tipos.length;i++){ var t=tipos[i], f=folhaExp(t), wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,f.ws,EXPX[t].folha);
          XLSX.writeFile(wb, EXPX[t].fich+'_FLOW_'+dia+'.xlsx'); tot.push(t+': '+fmt(f.n,0)) }
        A.put('config','qualidadeExport',Object.assign({},A.clean(A.cfg('qualidadeExport')||{}),{em:A.nowIso(), tipos:tipos, registos:tot.join(' · ')})).catch(function(){});
        A.closeModal(); A.toast('Exportado ('+tot.join(' · ')+').');
      }catch(e){ console.error(e); b.disabled=false; $('exS').innerHTML='<span style="color:var(--bad)">Não foi possível exportar: '+esc(e.message||e)+'</span>' } };
  });
}
/* aviso na página quando a última cópia tem mais de 7 dias */
function expAviso(){ if(!(S.admin||A.can('qualidade'))) return ''; var u=(A.cfg('qualidadeExport')||{}).em, n=u? A.days(u) : null;
  return n!=null && n<=7? '' : '<p class="small" style="margin:-6px 0 12px;color:var(--warn)">'+(u?'Última cópia em Excel há '+n+' dias':'Ainda não foi feita nenhuma cópia em Excel')+' — use “Exportar Excel” (recomendado semanalmente).</p>' }
Q2.expExcel=expExcel; Q2.expAviso=expAviso; Q2.folhaExp=folhaExp; Q2.parsers={FII:parseFII, FIQ:parseFIQ, RF:parseRF};

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
    (c.obs?'<p><b>Observações:</b> '+esc(c.obs)+'</p>':'')+'<div class="foot"><button class="btn" id="kX">Fechar</button><button class="btn" id="kP">Imprimir relatório de ensaio</button><button class="btn primary" id="kE">Editar</button></div>',
    function(){ $('kX').onclick=A.closeModal; $('kE').onclick=function(){cartForm(c)}; $('kP').onclick=function(){ Q2.rosto('ENSAIO',c) } });
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
