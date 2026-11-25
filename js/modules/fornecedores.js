/* Qualidade: reclamações a fornecedores + painéis de indicadores (FII, FIQ, fornecedores). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, C='var(--c-qual)', I=window.Impressao, Q=window.Qualidade, Q2=window.Q2;
var fv=I.fv, F=I.F, selOpts=I.selOpts, bindFilters=I.bindFilters;
var MES=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var ANO=String(new Date().getFullYear());

/* ---------- ajudas de indicadores ---------- */
function cnt(rows, key, top, val){ var o={}; rows.forEach(function(r){ var k=(typeof key==='function'?key(r):r[key])||'Sem indicação'; o[k]=(o[k]||0)+(val?(val(r)||0):1) }); var a=Object.keys(o).map(function(k){return {l:k,v:o[k]}}).sort(function(x,y){return y.v-x.v}); return top? a.slice(0,top) : a }
function pareto(rows, key, top, val){ var a=cnt(rows,key,0,val), tot=a.reduce(function(s,x){return s+x.v},0), acc=0; return a.slice(0,top||12).map(function(x){ acc+=x.v; return {l:x.l,v:x.v,s:tot?'· '+fmt(acc/tot*100,0)+'% acum.':''} }) }
function yoy(rows, dateFn, anos, val){ return anos.map(function(y,i){ return {name:y, color:['var(--s3)','var(--s2)','var(--s1)'][anos.length-1-i]||'var(--s4)', vals:MES.map(function(m,k){ var mm=y+'-'+('0'+(k+1)).slice(-2); return rows.filter(function(r){return dateFn(r).slice(0,7)===mm}).reduce(function(s,r){return s+(val?(val(r)||0):1)},0) })} }) }
function ytd(rows, dateFn, ano){ var md=A.today().slice(4); return rows.filter(function(r){ var d=dateFn(r); return d.slice(0,4)===ano && (ano!==ANO || d.slice(4)<=md) }) }
function delta(a,b){ if(!b) return ''; var p=(a-b)/b*100; return '<span style="color:'+(p>0?'var(--bad)':'var(--ok)')+'">'+(p>0?'▲ ':'▼ ')+fmt(Math.abs(p),0)+'%</span> vs mesmo período '+(+ANO-1) }
function panel(t, sub, body, full){ return '<div class="panel"'+(full?' style="grid-column:1/-1"':'')+'><h2>'+t+'</h2>'+(sub?'<p class="small muted" style="margin:2px 0 8px">'+sub+'</p>':'<div style="height:8px"></div>')+body+'</div>' }
function heat(rows, key, dateFn, ano, top){
  var keys=cnt(rows.filter(function(r){return dateFn(r).slice(0,4)===ano}),key,top||12).map(function(x){return x.l}), mx=0, M={};
  keys.forEach(function(k){ M[k]=MES.map(function(m,i){ var mm=ano+'-'+('0'+(i+1)).slice(-2); var n=rows.filter(function(r){ return ((typeof key==='function'?key(r):r[key])||'Sem indicação')===k && dateFn(r).slice(0,7)===mm }).length; mx=Math.max(mx,n); return n }) });
  if(!keys.length) return '<div class="cht-empty">Sem dados.</div>';
  return '<div class="tw"><table class="t"><thead><tr><th></th>'+MES.map(function(m){return '<th class="n">'+m+'</th>'}).join('')+'<th class="n">Total</th></tr></thead><tbody>'+keys.map(function(k){ var tot=M[k].reduce(function(s,x){return s+x},0);
    return '<tr><td style="white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis"><b>'+esc(k)+'</b></td>'+M[k].map(function(n){ var a=mx?n/mx:0; return '<td class="n" style="background:rgba(42,120,214,'+(a*0.75).toFixed(2)+');color:'+(a>0.55?'#fff':'inherit')+'">'+(n||'')+'</td>' }).join('')+'<td class="n"><b>'+tot+'</b></td></tr>' }).join('')+'</tbody></table></div>';
}

/* ---------- painel FII / FIQ ---------- */
Q2.incDash=function(_rows, tipo, ano){
  ano=ano||fv('qa',ANO)||ANO; var fs=fv('qs','');
  var all=Q.incList().filter(function(i){ return i.tipo===tipo && (!fs||i.setorOrigem===fs) }), d=Q.incDate;
  var anos=Array.from(new Set(all.map(function(i){return d(i).slice(0,4)}))).filter(Boolean).sort().slice(-3);
  var cur=all.filter(function(i){return d(i).slice(0,4)===ano}), y1=ytd(all,d,ano), y0=ytd(all,d,String(+ano-1));
  var custo=cur.reduce(function(s,i){return s+(i.custo||0)},0), horas=cur.reduce(function(s,i){return s+(i.tempoReproc||0)},0);
  var head=tipo==='FII'? (function(){ var resp=cur.filter(function(i){return i.autoDetecao}), auto=resp.filter(function(i){return /^s/.test(i.autoDetecao)}).length;
      return A.kpis([{v:fmt(cur.length,0),l:'FII em '+ano,s:ano===ANO?delta(y1.length,y0.length):''},{v:fmt(custo,0)+' €',l:'Custo de rejeição '+ano},{v:fmt(cur.reduce(function(s,i){return s+(i.qtdRejeitada||0)},0),0),l:'Unidades rejeitadas'},
        {v:fmt(horas,0)+' h',l:'Horas de reprocessamento'},{v:resp.length?fmt(auto/resp.length*100,0)+'%':'–',l:'Detetadas pelo próprio operador',s:resp.length+' com resposta'}]) })()
    : (function(){ var ab=cur.filter(function(i){return i.estado==='Aberta'||(['Em análise','Ação definida','Em implementação'].indexOf(i.estado)>=0)}).length, tr=cur.map(function(i){return i.tempoResposta}).filter(function(x){return x!=null&&x>=0}), rec=cur.filter(function(i){return i.recusada}).length;
      return A.kpis([{v:cur.length,l:'FIQ em '+ano,s:ano===ANO?delta(y1.length,y0.length):''},{v:ab,l:'Em aberto',cls:ab?'warn':''},{v:fmt(custo,0)+' €',l:'Custo efetivo total'},
        {v:tr.length?fmt(A.mean(tr),1)+' d':'–',l:'Tempo médio de resposta'},{v:cur.length?fmt(rec/cur.length*100,0)+'%':'–',l:'Reclamações recusadas'},{v:cur.filter(function(i){return i.impactoAlimentar==='Sim'}).length,l:'Com impacto alimentar'}]) })();
  var g='<div class="grid2">'+
    panel(tipo+' por mês','Comparação entre anos',Charts.bars({cats:MES,series:yoy(all,d,anos),unit:tipo}))+
    panel('Custo por mês · '+ano,tipo==='FII'?'Custo da rejeição (€)':'Custo efetivo total (€)',Charts.bars({cats:MES,series:yoy(all,d,[ano],function(i){return i.custo}).map(function(s){s.color='var(--s7)';return s}),unit:'€',dec:0}))+
    panel('Pareto de defeitos · '+ano,'Top 12, com % acumulada',Charts.hbars({rows:pareto(cur,'defeito',12),color:'var(--s1)'}))+
    panel('Setor de origem · '+ano,'Onde o erro foi cometido',Charts.hbars({rows:cnt(cur,'setorOrigem',12),color:'var(--s3)'}))+
    panel('Máquinas de origem · '+ano,'Top 15',Charts.hbars({rows:cnt(cur.filter(function(i){return i.maqOrigem}),'maqOrigem',15),color:'var(--s4)'}))+
    panel('Clientes mais afetados · '+ano,'Top 10',Charts.hbars({rows:cnt(cur.filter(function(i){return i.cliente}),function(i){return i.cliente.slice(0,34)},10),color:'var(--s2)'}))+
    (tipo==='FII'? panel('Ocorrências por operador · '+ano,'Top 10 — operador que cometeu o erro',Charts.hbars({rows:cnt(cur.filter(function(i){return i.opOrigem}),function(i){return i.opOrigem.split(',')[0].trim()},10),color:'var(--s5)'}))+
        panel('Custo por defeito · '+ano,'€ — top 10',Charts.hbars({rows:cnt(cur,'defeito',10,function(i){return i.custo}),unit:'€',dec:0,color:'var(--s7)'}))
      : panel('Tempo de resposta ao cliente','Dias, média mensal',Charts.line({series:anos.map(function(y,k){ return {name:y,color:['var(--s3)','var(--s2)','var(--s1)'][anos.length-1-k],pts:MES.map(function(m,i){ var mm=y+'-'+('0'+(i+1)).slice(-2); var v=all.filter(function(r){return d(r).slice(0,7)===mm&&r.tempoResposta!=null&&r.tempoResposta>=0}).map(function(r){return r.tempoResposta}); return {x:mm+'-15',y:A.mean(v)} })} }),unit:'dias',dec:1}))+
        panel('Causa (6M) · '+ano,'',Charts.hbars({rows:cnt(cur,'m6'),color:'var(--s5)'})))+
    panel('Setor × mês · '+ano,'N.º de '+tipo+' por setor de origem',heat(all,'setorOrigem',d,ano,12),true)+
  '</div>';
  return head+g;
};

/* =============== RECLAMAÇÕES A FORNECEDORES =============== */
var NC=['Atraso na entrega','Contaminação','Deficiente acondiconamento','Difere da especificação - afecta a produção','Difere da especificação - não afecta a produção','Difere da especificação - Reclamação de cliente','Diferença de quantidade','Produto danificado - afecta a produção','Produto danificado - reclamação do cliente','Produto danificado -não  afecta a produção','Produto danificado no transporte - afecta a produção','Produto danificado no transporte - Reclamação de cliente','Produto trocado'];
function rfList(){
  var db=A.list('recfor'), key=S.hist.rf.length+'|'+db.length+'|'+(S._rfStamp||0); if(S._rfCache&&S._rfCache.k===key) return S._rfCache.v;
  /* um registo do FLOW substitui o do histórico com o mesmo n.º (Excel exportado e reimportado) */
  var m={}, porNum={}; S.hist.rf.forEach(function(r){ m[r.id]=r; if(r.numero) porNum[r.numero]=r.id });
  db.forEach(function(r){ if(r._del){ delete m[r.id]; return } if(r.numero && porNum[r.numero] && porNum[r.numero]!==r.id) delete m[porNum[r.numero]]; m[r.id]=r });
  var v=Object.keys(m).map(function(k){return m[k]}); S._rfCache={k:key,v:v}; return v;
}
function rfNext(ano){ var mx=0, re=new RegExp('^RF-'+ano+'-(\\d+)$'); rfList().forEach(function(r){ var m=re.exec(r.numero||''); if(m) mx=Math.max(mx,+m[1]) }); return 'RF-'+ano+'-'+('00'+(mx+1)).slice(-3) }
function dlist(id, arr){ return '<datalist id="'+id+'">'+Array.from(new Set(arr.filter(Boolean))).sort().map(function(x){return '<option value="'+esc(x)+'">'}).join('')+'</datalist>' }
function rfForm(v){
  var edit=!!v, H=rfList();
  if(edit && Q2.fechada(v)){ A.toast(v.numero+' está fechada: reabra-a para editar.'); return }
  A.openForm({title:edit?'Editar '+v.numero:'Nova reclamação a fornecedor', values:v||{data:A.today(),tipoForn:'Fornecedor',estado:'Aberta',unidade:'UN'},
    intro:edit&&v.historico?'Registo importado do ficheiro histórico. As alterações ficam guardadas no FLOW.':'',
    fields:[{k:'numero',l:'N.º',ph:'automático'},{k:'data',l:'Data',t:'date',req:1},{k:'estado',l:'Estado',t:'select',o:['Aberta','Fechada'],req:1,help:'Ao gravar como Fechada, fica só de leitura'},
      {k:'tipoForn',l:'Tipo',t:'select',o:['Fornecedor','Subcontratado']},{k:'fornecedor',l:'Fornecedor',list:'dlFo',req:1},{k:'codFornecedor',l:'Código do fornecedor'},
      {k:'mm',l:'MM do produto'},{k:'produto',l:'Produto',list:'dlPr'},{k:'lote',l:'Lote'},{k:'sscc',l:'SSCC'},{k:'ofPed',l:'OF / pedido'},
      {k:'naoConformidade',l:'Não conformidade',t:'select',o:NC,req:1,full:1},{k:'tipoDefeito',l:'Tipo de defeito',list:'dlTd'},{k:'localDetecao',l:'Local de deteção',t:'select',o:['Receção','Laboratório','PTG','Pasaban'].concat(Q.setores())},
      {t:'sep',l:'Quantidades e custos'},{k:'kg',l:'Kg reclamados',t:'number'},{k:'qtdAfetada',l:'Quantidade afetada',t:'number'},{k:'unidade',l:'Unidade',t:'select',o:['UN','KG','FL','CXS','MT']},
      {k:'qtdDevolucao',l:'Quantidade devolvida',t:'number'},{k:'guiaDevolucao',l:'Guia de devolução'},{k:'custoDevolucao',l:'Custo devolução (€)',t:'number'},{k:'custoProducao',l:'Custos produção / escolha (€)',t:'number'},
      {k:'qtdRejeitada',l:'Quantidade rejeitada',t:'number'},{k:'custoRejeicao',l:'Custo rejeição (€)',t:'number'},{k:'custoTotal',l:'Total de custos (€)',t:'number',help:'Vazio = soma automática'},
      {t:'sep',l:'Resposta e crédito'},{k:'dataResposta',l:'Respondido a',t:'date'},{k:'dataCredito',l:'Data do crédito',t:'date'},{k:'valorCreditado',l:'Valor creditado (€)',t:'number'},{k:'notaCredito',l:'N.º nota de crédito'},
      {k:'acoesCorretivas',l:'Ações corretivas do fornecedor',t:'select',o:['Sim','Não']},{k:'obs',l:'Observações / comunicação',t:'textarea',rows:3},
      {t:'html',html:dlist('dlFo',H.map(function(r){return r.fornecedor}))+dlist('dlPr',H.map(function(r){return r.produto}))+dlist('dlTd',H.map(function(r){return r.tipoDefeito}))}],
    del: edit&&A.can('qualidade')? function(){ return v.historico? A.put('recfor',v.id,{_del:true}) : A.del('recfor',v.id) } : null,
    submit:function(x){
      if(x.custoTotal==null){ var s=(x.custoDevolucao||0)+(x.custoProducao||0)+(x.custoRejeicao||0); if(s) x.custoTotal=s }
      if(!x.numero) x.numero=rfNext(String(x.data).slice(0,4)); S._rfStamp=(S._rfStamp||0)+1;
      if(edit){ var o=Object.assign({},A.clean(v),x); return A.put('recfor',v.id,o) } return A.add('recfor',x);
    }});
}
function rfDetalhe(id){
  var r=rfList().filter(function(x){return x.id===id})[0]; if(!r) return;
  var row=function(l,v){ return v==null||v===''? '' : '<div><dt>'+l+'</dt><dd>'+esc(v)+'</dd></div>' };
  A.showModal('<h2><span class="mono">'+esc(r.numero)+'</span> '+Q.estPill(r.estado)+'</h2><p class="muted" style="margin:-6px 0 0"><b>'+esc(r.fornecedor)+'</b> · '+fdate(r.data)+'</p><dl class="detail">'+
    row('Não conformidade',r.naoConformidade)+row('Tipo de defeito',r.tipoDefeito)+row('Local de deteção',r.localDetecao)+row('Produto',r.produto)+row('MM',r.mm)+row('Lote',r.lote)+row('OF / pedido',r.ofPed)+
    row('Qtd afetada',r.qtdAfetada?fmt(r.qtdAfetada,0)+' '+(r.unidade||''):'')+row('Kg',r.kg?fmt(r.kg,0):'')+row('Total de custos',r.custoTotal?fmt(r.custoTotal,2)+' €':'')+row('Creditado',r.valorCreditado?fmt(r.valorCreditado,2)+' € ('+fdate(r.dataCredito)+')':'')+row('Nota de crédito',r.notaCredito)+row('Respondido a',r.dataResposta&&fdate(r.dataResposta))+
    (r.obs?'<div class="full"><dt>Observações</dt><dd style="white-space:pre-wrap">'+esc(r.obs)+'</dd></div>':'')+'</dl><div class="foot"><button class="btn" id="rX">Fechar</button>'+(pastaBtn(r)||(S.admin||A.can('qualidade')?'<button class="btn" id="rPc">Ligar pasta SharePoint</button>':''))+'<button class="btn" id="rP">Imprimir folha de rosto</button>'+Q2.edBotoes(r,'r')+'</div>',
    function(){ $('rX').onclick=A.closeModal; $('rP').onclick=function(){ Q2.rosto('RF',r) }; if($('rPc')) $('rPc').onclick=pastaForm; pastaBind($('box'));
      Q2.edBind(r,'r',function(){ rfForm(r) },function(){ var o=Object.assign({},A.clean(r),{estado:'Aberta',reabertaEm:A.nowIso()}); S._rfStamp=(S._rfStamp||0)+1; return A.put('recfor',r.id,o) }) });
}
/* Pasta da reclamação no SharePoint (fotografias e emails, colocados pela Qualidade): o FLOW só guarda o endereço
   base (config/rfPasta, fora do código porque o site é público) e abre a pasta noutro separador — nada é carregado.
   Pasta: <base>/<ano>/Rec<n>_<ano>  (ex.: RF-2026-185 → 2026/Rec185_2026); o modelo pode ser mudado. */
function rfLoc(r){
  var c=A.cfg('rfPasta'), base=String(c.base||'').trim().replace(/\/+$/,''); if(!base) return null;
  var m=/^RF-(\d{4})-0*(\d+)$/i.exec(String(r.numero||'').trim()); if(!m) return null;
  var nome=String(c.modelo||'{ano}/Rec{n}_{ano}').replace(/\{ano\}/g,m[1]).replace(/\{n\}/g,m[2]);
  var u; try{ u=new URL(base) }catch(e){ return null }
  return {o:u.origin, p:encodeURI(decodeURIComponent(u.pathname))+'/'+nome.split('/').map(encodeURIComponent).join('/'), ano:m[1], n:m[2], nome:nome.split('/').pop()};
}
/* o endereço direto de uma pasta dá "404 NOT FOUND" no SharePoint; o formato de link de pasta /:f:/r/<caminho> abre a vista da pasta */
function rfPasta(r){ var l=rfLoc(r); return l? l.o+'/:f:/r'+l.p : null }
/* ficheiro: caminho direto; PDF e Office com ?web=1 (abrem no visualizador do SharePoint em vez de descarregar) */
function rfFich(l, rel){ var u=l.o+l.p+'/'+rel.split('/').map(encodeURIComponent).join('/'); return /\.(pdf|docx?|xlsx?|xlsm|pptx?)$/i.test(rel)? u+'?web=1' : u }

/* lista de documentos ao passar o rato: índice flow_rf_docs/<ano> (só nomes), gravado por scripts/indice_rf.mjs.
   Lê-se um documento por ano, só quando é preciso, e guarda-se 2 minutos em memória. */
var DOCS={};
function docsAno(ano){ var c=DOCS[ano]; if(c && Date.now()-c.t<120000) return c.p;
  var p=S.db? S.db.doc('rf_docs/'+ano).get().catch(function(){ return null }) : Promise.resolve(null); DOCS[ano]={t:Date.now(),p:p}; return p }
function tipoF(n){ var e=(/\.([a-z0-9]+)$/i.exec(n)||[,''])[1].toLowerCase();
  return /^(jpe?g|png|gif|webp|heic|bmp|tiff?)$/.test(e)? ['IMG','i'] : e==='pdf'? ['PDF','p'] : /^(msg|eml)$/.test(e)? ['MAIL','m'] : /^(xlsx?|xlsm|csv)$/.test(e)? ['XLS','x'] : /^(docx?)$/.test(e)? ['DOC','x'] : /^(mp4|mov|avi)$/.test(e)? ['VID','i'] : [(e||'?').slice(0,4).toUpperCase(),''] }
function kb(s){ return s>=1048576? fmt(s/1048576,1)+' MB' : fmt(Math.max(1,Math.round(s/1024)),0)+' KB' }
var POP=null, popT=null;
function popFecha(){ clearTimeout(popT); popT=setTimeout(function(){ if(POP){ POP.remove(); POP=null } },250) }
function popAbre(a){
  var r=rfList().filter(function(x){ return x.numero===a.dataset.rf })[0], l=r&&rfLoc(r); if(!l) return;
  clearTimeout(popT); if(POP) POP.remove();
  POP=document.createElement('div'); POP.className='docpop'; POP.setAttribute('role','dialog'); POP.innerHTML='<h4>'+esc(l.nome)+'</h4><div class="small muted" style="padding:4px 6px">A carregar…</div>';
  POP.onmouseenter=function(){ clearTimeout(popT) }; POP.onmouseleave=popFecha; document.body.appendChild(POP);
  var pos=function(){ if(!POP) return; var b=a.getBoundingClientRect(), w=POP.offsetWidth, h=POP.offsetHeight, x=Math.min(Math.max(8,b.right-w), innerWidth-w-8), y=b.bottom+6; if(y+h>innerHeight-8) y=Math.max(8,b.top-h-6); POP.style.left=x+'px'; POP.style.top=y+'px' };
  pos(); var alvo=POP;
  docsAno(l.ano).then(function(d){
    if(POP!==alvo) return;
    var fs=d&&d.f? d.f[l.n] : null, idade=d&&d.v? Math.round((Date.now()-Date.parse(d.v))/60000) : null;
    var lista=!d? '<p class="small muted" style="margin:4px 6px">Índice de documentos ainda não criado (scripts/indice_rf.mjs).</p>' :
      !fs? '<p class="small muted" style="margin:4px 6px">Pasta ainda não encontrada no SharePoint.</p>' :
      !fs.length? '<p class="small muted" style="margin:4px 6px">Pasta vazia.</p>' :
      fs.map(function(f){ var t=tipoF(f.n); return '<a class="f" href="'+esc(rfFich(l,f.n))+'" target="_blank" rel="noopener"><span class="ic '+t[1]+'">'+t[0]+'</span><span class="nm" title="'+esc(f.n)+'">'+esc(f.n)+'</span><small>'+kb(f.s||0)+'</small></a>' }).join('');
    POP.innerHTML='<h4>'+esc(l.nome)+(fs?' · '+fs.length+' ficheiro'+(fs.length===1?'':'s'):'')+'</h4>'+lista+
      '<div class="ft"><a href="'+esc(rfPasta(r))+'" target="_blank" rel="noopener">Abrir a pasta no SharePoint</a><span class="muted">'+(idade==null?'':idade<60? 'há '+idade+' min' : idade<2880? 'há '+Math.round(idade/60)+' h' : 'há '+Math.round(idade/1440)+' dias')+'</span></div>';
    pos();
  });
}
/* liga os botões "Fotos e emails": rato por cima (ou foco pelo teclado) mostra a lista; clique abre a pasta */
function pastaBind(root){
  root.querySelectorAll('[data-pasta]').forEach(function(a){
    a.addEventListener('click',function(e){ e.stopPropagation() });
    var t=null; a.addEventListener('mouseenter',function(){ clearTimeout(t); t=setTimeout(function(){ popAbre(a) },180) });
    a.addEventListener('mouseleave',function(){ clearTimeout(t); popFecha() });
    a.addEventListener('focus',function(){ popAbre(a) }); a.addEventListener('blur',popFecha);
  });
}
window.addEventListener('hashchange',function(){ if(POP){ POP.remove(); POP=null } });
function pastaForm(){
  var c=A.cfg('rfPasta');
  A.openForm({title:'Pasta das reclamações no SharePoint', values:{base:c.base||'', modelo:c.modelo||'{ano}/Rec{n}_{ano}'},
    intro:'Endereço da pasta "Reclamações a Fornecedores" no SharePoint (abra-a no browser e copie o endereço). Só abre para quem tem acesso no SharePoint.',
    fields:[{k:'base',l:'Endereço base',req:1,full:1,ph:'https://…sharepoint.com/sites/…/Reclamações a Fornecedores'},
      {k:'modelo',l:'Modelo da subpasta',req:1,full:1,help:'{ano} e {n} = ano e número da reclamação. RF-2026-185 → 2026/Rec185_2026'}],
    validate:function(x){ if(!/^https:\/\/[\w.-]+\.sharepoint\.com\//i.test(x.base)) return 'O endereço tem de começar por https://….sharepoint.com/'; },
    /* guarda o endereço legível (sem %20); a codificação faz-se ao abrir. Aceita também o link da vista
       (…/Forms/AllItems.aspx?id=/sites/…/pasta), que é o que o browser mostra ao navegar na biblioteca. */
    submit:function(x){ var u=new URL(x.base.trim()), id=u.searchParams.get('id')||u.searchParams.get('RootFolder'), b;
      try{ b=u.origin+(id? id : decodeURIComponent(u.pathname)) }catch(e){ b=u.origin+u.pathname }
      b=b.replace(/\/Forms\/[^/]*\.aspx$/i,'').replace(/\/+$/,'');
      return A.put('config','rfPasta',Object.assign({},A.clean(c),{base:b,modelo:x.modelo})) }});
}
function pastaBtn(r, cls){ var u=rfPasta(r); return u? '<a class="btn '+(cls||'')+'" href="'+esc(u)+'" target="_blank" rel="noopener" data-pasta data-rf="'+esc(r.numero)+'">Fotos e emails</a>' : '' }
Q2.rfDash=function(ano){
  ano=ano||ANO; var all=rfList(), d=function(r){return String(r.data||'')}, cur=all.filter(function(r){return d(r).slice(0,4)===ano});
  var anos=Array.from(new Set(all.map(function(r){return d(r).slice(0,4)}))).filter(Boolean).sort().slice(-3);
  var custo=cur.reduce(function(s,r){return s+(r.custoTotal||0)},0), cred=cur.reduce(function(s,r){return s+(r.valorCreditado||0)},0), ab=cur.filter(function(r){return r.estado!=='Fechada'}).length;
  var fo={}; cur.forEach(function(r){ var f=fo[r.fornecedor]=fo[r.fornecedor]||{f:r.fornecedor,n:0,c:0,cr:0,ab:0}; f.n++; f.c+=r.custoTotal||0; f.cr+=r.valorCreditado||0; if(r.estado!=='Fechada') f.ab++ });
  var tf=Object.keys(fo).map(function(k){ var x=fo[k]; x.id=k; return x }).sort(function(a,b){return b.n-a.n||b.c-a.c});
  return A.kpis([{v:cur.length,l:'Reclamações em '+ano},{v:ab,l:'Em aberto',cls:ab?'warn':''},{v:fmt(custo,0)+' €',l:'Custos reclamados'},{v:fmt(cred,0)+' €',l:'Valor creditado'},
      {v:custo?fmt(cred/custo*100,0)+'%':'–',l:'Taxa de recuperação'},{v:Object.keys(fo).length,l:'Fornecedores envolvidos'}])+
    '<div class="grid2">'+
      panel('Reclamações por mês','Comparação entre anos',Charts.bars({cats:MES,series:yoy(all,d,anos),unit:'rec.'}))+
      panel('Custos reclamados vs creditados · '+ano,'€ por mês',Charts.bars({cats:MES,series:[{name:'Reclamado',color:'var(--s2)',vals:MES.map(function(m,i){var mm=ano+'-'+('0'+(i+1)).slice(-2);return cur.filter(function(r){return d(r).slice(0,7)===mm}).reduce(function(s,r){return s+(r.custoTotal||0)},0)})},{name:'Creditado',color:'var(--s3)',vals:MES.map(function(m,i){var mm=ano+'-'+('0'+(i+1)).slice(-2);return cur.filter(function(r){return d(r).slice(0,7)===mm}).reduce(function(s,r){return s+(r.valorCreditado||0)},0)})}],unit:'€',dec:0}))+
      panel('Tipologia de não conformidade · '+ano,'',Charts.hbars({rows:pareto(cur,function(r){return (r.naoConformidade||'').replace(' - ',' · ')},10),color:'var(--s1)'}))+
      panel('Tipo de defeito · '+ano,'Top 10',Charts.hbars({rows:cnt(cur.filter(function(r){return r.tipoDefeito}),'tipoDefeito',10),color:'var(--s7)'}))+
      panel('Local de deteção · '+ano,'',Charts.hbars({rows:cnt(cur,'localDetecao',10),color:'var(--s4)'}))+
      panel('Custos por fornecedor · '+ano,'€ — top 10',Charts.hbars({rows:tf.slice().sort(function(a,b){return b.c-a.c}).slice(0,10).map(function(x){return {l:x.f.slice(0,34),v:x.c}}),unit:'€',dec:0,color:'var(--s2)'}))+
      panel('Fornecedores · '+ano,'Ordenado por n.º de reclamações',A.table(tf,[{l:'Fornecedor',v:function(x){return '<b>'+esc(x.f)+'</b>'}},{l:'Reclamações',n:1,v:function(x){return x.n}},{l:'Em aberto',n:1,v:function(x){return x.ab||''}},{l:'Custos',n:1,v:function(x){return fmt(x.c,0)+' €'}},{l:'Creditado',n:1,v:function(x){return fmt(x.cr,0)+' €'}},{l:'Recuperação',n:1,v:function(x){return x.c?'<span class="pill '+(x.cr/x.c>=0.8?'ok':x.cr/x.c>=0.4?'warn':'bad')+'">'+fmt(x.cr/x.c*100,0)+'%</span>':'–'}}],{empty:'Sem reclamações.'}),true)+
    '</div>';
};
A.register('fornecedores',{
  html:function(){
    var t=A.tab('rf','lista'), all=rfList(), anos=Array.from(new Set(all.map(function(r){return String(r.data||'').slice(0,4)}))).filter(Boolean).sort().reverse();
    var fa=fv('ra',ANO), ff=fv('rfo',''), fe=fv('re',''), q=fv('rq','').toLowerCase();
    var rows=all.filter(function(r){ return (!fa||String(r.data).slice(0,4)===fa)&&(!ff||r.fornecedor===ff)&&(!fe||r.estado===fe)&&(!q||[r.numero,r.fornecedor,r.produto,r.lote,r.tipoDefeito,r.naoConformidade,r.ofPed].join(' ').toLowerCase().indexOf(q)>=0) }).sort(function(a,b){return (b.data||'')<(a.data||'')?-1:1});
    var body=!S.hist.ok? '<div class="panel empty">A carregar o histórico…</div>' : t==='lista'?
      '<div class="filters"><input type="search" id="rq" data-f="rq" placeholder="Procurar fornecedor, produto, lote, defeito…" value="'+esc(fv('rq',''))+'"><select data-f="ra">'+selOpts(anos,fa,'Todos os anos')+'</select><select data-f="rfo">'+selOpts(Array.from(new Set(all.map(function(r){return r.fornecedor}))).sort(),ff,'Todos os fornecedores')+'</select><select data-f="re">'+selOpts(['Aberta','Fechada'],fe,'Todos os estados')+'</select></div>'+
      A.table(rows,[{l:'N.º',v:function(r){return '<b class="mono">'+esc(r.numero)+'</b>'}},{l:'Data',v:function(r){return fdate(r.data)}},{l:'Fornecedor',v:function(r){return '<b>'+esc(r.fornecedor)+'</b><div class="small muted">'+esc((r.produto||'').slice(0,44))+'</div>'}},
        {l:'Não conformidade',v:function(r){return esc((r.naoConformidade||'–').slice(0,46))+'<div class="small muted">'+esc(r.tipoDefeito||'')+'</div>'}},{l:'Deteção',v:function(r){return esc(r.localDetecao||'–')}},
        {l:'Custos',n:1,v:function(r){return r.custoTotal?fmt(r.custoTotal,0)+' €':'–'}},{l:'Creditado',n:1,v:function(r){return r.valorCreditado?fmt(r.valorCreditado,0)+' €':'–'}},{l:'Estado',v:function(r){return Q.estPill(r.estado)}},{l:'Pasta',v:function(r){return pastaBtn(r,'sm')||'<span class="muted">–</span>'}}],{click:1,max:250,empty:'Sem reclamações com estes filtros.'})
      : '<div class="filters"><select data-f="ra">'+selOpts(anos,fa||ANO)+'</select></div>'+Q2.rfDash(fa||ANO);
    return A.head({c:C,mod:'Qualidade',title:'Reclamações a fornecedores',p:'Não conformidades de matérias-primas e subcontratados: custos reclamados, créditos e ações do fornecedor.',acts:(S.admin||A.can('qualidade')?'<button class="btn" id="rPasta" title="Pasta das fotografias e emails no SharePoint">Pasta SharePoint</button><button class="btn" id="rImpX" title="Opção temporária, enquanto os Excel ainda são usados">Importar Excel</button>':'')+'<button class="btn" id="rExp">Exportar Excel</button><button class="btn primary" id="rNew">+ Nova reclamação</button>'})+Q2.expAviso()+
      A.tabs('rf',[['lista','Registos'],['graf','Indicadores']],t)+body;
  },
  bind:function(r){ $('rNew').onclick=function(){rfForm()}; $('rExp').onclick=function(){ Q2.expExcel() }; if($('rImpX')) $('rImpX').onclick=function(){ window.Q2.impExcel(['RF']) }; if($('rPasta')) $('rPasta').onclick=pastaForm; if(POP){ POP.remove(); POP=null } pastaBind(r); A.bindRows(r,function(id){ if(A.tab('rf','lista')==='lista') rfDetalhe(id) }); bindFilters(r); Charts.bind(r) }
});

/* =============== INDICADORES DE QUALIDADE (setor Indicadores) =============== */
A.register('ind-qualidade',{
  html:function(){
    var t=A.tab('iq','FII'), all=Q.incList(), anos=Array.from(new Set(all.map(function(i){return Q.incDate(i).slice(0,4)}).concat(rfList().map(function(r){return String(r.data||'').slice(0,4)})))).filter(Boolean).sort().reverse();
    var ano=fv('iqa',ANO);
    return '<div class="head" style="--c:var(--c-ind)"><div><div class="eyebrow">Indicadores</div><h1>Indicadores de qualidade</h1><p>Incidências internas (FII), reclamações de clientes (FIQ) e reclamações a fornecedores — histórico desde 2024.</p></div><div class="acts"><button class="btn primary" id="qPdf">Gerar PDF FII / FIQ</button></div></div>'+
      A.tabs('iq',[['FII','FII · internas'],['FIQ','FIQ · clientes'],['RF','Fornecedores']],t)+
      '<div class="filters"><select data-f="iqa">'+selOpts(anos,ano)+'</select></div>'+
      (!S.hist.ok? '<div class="panel empty">A carregar o histórico…</div>' : t==='RF'? Q2.rfDash(ano) : (F.qs='', Q2.incDash(null,t,ano)));
  },
  bind:function(r){ $('qPdf').onclick=function(){ Q2.pdfDialog() }; bindFilters(r); Charts.bind(r) }
});
window.Fornecedores={rfList:rfList};
Q2.h={cnt:cnt, pareto:pareto, panel:panel, MES:MES};   /* usados pelo relatório PDF (relqualidade.js) */
})();
