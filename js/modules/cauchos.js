/* Impressão › Cauchos: requisição de cauchos novos pelo operador e controlo da tiragem (impressões) que cada caucho fez.
   O operador pede o caucho para a máquina e o corpo, indica o motivo e o contador da máquina; a tiragem do caucho que sai
   calcula-se pela diferença para o contador da troca anterior no mesmo corpo (pode corrigir-se à mão).
   O stock entrega (ou cancela). Coleção: cauchos_req {numero, data, maquina, corpo, mm, ref, qtd, motivo, contador, tiragem,
   operador, of, urgente, obs, estado: Pedida|Entregue|Cancelada}. O registo antigo (coleção cauchos) fica em "Registo anterior". */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao, C='var(--c-imp)';
var fv=I.fv, F=I.F, selOpts=I.selOpts, bindFilters=I.bindFilters;
var MOTIVOS=['Fim de vida','Corte / dano','Afundamento','Contaminação / inchaço','Troca de trabalho','Outro'], ESTADOS=['Pedida','Entregue','Cancelada'];
function podeGerir(){ return S.admin || A.can('stock') }
function maqs(){ return I.impMaq() }
function corpos(mid){ var m=A.get('maquinas',mid)||{}, n=+m.corpos||6, t=I.torres(m), p=[]; for(var i=1;i<=n;i++) p.push('Corpo '+i); for(var j=1;j<=t;j++) p.push(t>1?'Torre de verniz '+j:'Torre de verniz'); return p }
function reqs(){ return A.list('cauchos_req').slice().sort(function(a,b){ return ((b.data||'')+(b.criadoEm||''))<((a.data||'')+(a.criadoEm||''))?-1:1 }) }
/* catálogo de cauchos: folha "Cauchus" do Offset Print + consumíveis da ficha técnica */
function catalogo(){ var o={};
  A.list('op_linhas').filter(function(l){ return /^cauch/i.test(l.folha||'') }).forEach(function(l){ var v=l.v||{}; if(v.MM) o[String(v.MM)]={mm:String(v.MM), ref:v.Produto||'', forn:v.Fornecedor||''} });
  (I.catalogo? I.catalogo('Cauchos') : []).forEach(function(c){ if(c.mm&&!o[c.mm]) o[c.mm]={mm:String(c.mm), ref:c.produto||'', forn:c.fornecedor||''} });
  return Object.keys(o).map(function(k){ return o[k] }) }
function proxNumero(){ var y=String(new Date().getFullYear()).slice(2), mx=0; A.list('cauchos_req').forEach(function(r){ var m=/^CA(\d\d)-(\d+)$/.exec(r.numero||''); if(m&&m[1]===y) mx=Math.max(mx,+m[2]) }); return 'CA'+y+'-'+('000'+(mx+1)).slice(-4) }
/* troca anterior no mesmo corpo (para a tiragem) */
function anterior(mid, corpo, antesDe){ return reqs().filter(function(r){ return r.maquina===mid && r.corpo===corpo && r.estado!=='Cancelada' && r.contador!=null && (!antesDe||(r.data||'')<=antesDe) })[0] }
function estPill(e){ return '<span class="pill '+({Pedida:'warn',Entregue:'ok',Cancelada:'mute'}[e]||'mute')+'">'+esc(e||'–')+'</span>' }

/* ---------- requisição ---------- */
function pedir(preMaq, preCorpo){
  var cat=catalogo();
  A.openForm({title:'Requisitar caucho', values:{data:A.today(), maquina:preMaq||fv('caM','')||'', corpo:preCorpo||'', qtd:1, motivo:'Fim de vida'},
    fields:[
      {k:'maquina',l:'Máquina',t:'select',req:1,o:function(){ return maqs().map(function(m){ return [m.id,m.nome] }) }},
      {k:'corpo',l:'Corpo',t:'select',req:1,o:[]},
      {k:'mm',l:'Caucho (MM)',list:'dlCa',ph:'ex. 4000000012',help:cat.length?'Escolha da lista: a referência é preenchida':''},
      {k:'ref',l:'Referência / medida',ph:'ex. Cautchu 105 1077x885 c/barr IMP XL'},
      {k:'qtd',l:'Quantidade',t:'number',req:1},
      {k:'motivo',l:'Motivo da troca',t:'select',o:MOTIVOS,req:1},
      {k:'contador',l:'Contador da máquina agora',t:'number',help:'Impressões no contador da máquina no momento da troca'},
      {k:'tiragem',l:'Tiragem do caucho que sai (impressões)',t:'number',help:'Calculada pelo contador da troca anterior neste corpo; pode corrigir'},
      {k:'operador',l:'Operador',req:1,list:'dlCaOp'},
      {k:'data',l:'Data',t:'date',req:1},
      {k:'of',l:'OF em produção'},
      {k:'urgente',l:'Urgente (máquina parada)',t:'check'},
      {k:'obs',l:'Observações',t:'textarea',rows:2},
      {t:'html',html:'<div id="caAnt" class="small muted"></div><datalist id="dlCa">'+cat.map(function(c){ return '<option value="'+esc(c.mm)+'">'+esc(c.ref)+'</option>' }).join('')+'</datalist><datalist id="dlCaOp">'+A.operadores('Impressão').map(function(o){ return '<option value="'+esc(o.nome)+'">' }).join('')+'</datalist>'}],
    after:function(){
      var mq=$('f_maquina'), cp=$('f_corpo'), ct=$('f_contador'), tg=$('f_tiragem'), mm=$('f_mm'), mexeu=false;
      var calc=function(){ var a=mq.value&&cp.value? anterior(mq.value,cp.value) : null;
        $('caAnt').innerHTML=a? 'Troca anterior neste corpo: <b>'+fdate(a.data)+'</b> com o contador em <b>'+fmt(a.contador,0)+'</b>.' : (cp.value?'Sem troca anterior registada neste corpo: indique a tiragem à mão, se a souber.':'');
        if(!mexeu && a && ct.value!==''){ var d=+ct.value-(+a.contador); tg.value=d>0? d : '' } };
      var corp=function(){ var cur=cp.value||preCorpo||''; cp.innerHTML='<option value="">— escolher —</option>'+(mq.value?corpos(mq.value):[]).map(function(p){ return '<option'+(p===cur?' selected':'')+'>'+esc(p)+'</option>' }).join(''); calc() };
      mq.onchange=corp; cp.onchange=calc; ct.oninput=calc; tg.oninput=function(){ mexeu=true }; corp();
      mm.onchange=function(){ var c=cat.filter(function(x){ return x.mm===mm.value.trim() })[0]; if(c&&!$('f_ref').value) $('f_ref').value=c.ref };
    },
    validate:function(x){ if(!(x.qtd>=1&&x.qtd<=20)) return 'Quantidade entre 1 e 20.'; if(!x.mm&&!x.ref) return 'Indique o MM ou a referência do caucho.' },
    submit:function(x){ x.numero=proxNumero(); x.estado='Pedida'; x.urgente=!!x.urgente; Object.keys(x).forEach(function(k){ if(x[k]===''||x[k]==null) delete x[k] }); return A.add('cauchos_req',x) },
    ok:'Requisitar', done:'Caucho requisitado.'});
}
function mudar(r, est){ var n=Object.assign({},A.clean(r),{estado:est}); n['em'+est]=new Date().toISOString(); n['por'+est]=S.names[S.uid]||S.uid||''; return A.put('cauchos_req',r.id,n).then(function(){ A.toast('Requisição '+est.toLowerCase()+'.') }) }
function editar(r){
  A.openForm({title:'Corrigir '+r.numero, values:r,
    fields:[{k:'contador',l:'Contador da máquina',t:'number'},{k:'tiragem',l:'Tiragem do caucho que saiu (impressões)',t:'number'},{k:'motivo',l:'Motivo',t:'select',o:MOTIVOS},{k:'obs',l:'Observações',t:'textarea',rows:2}],
    del: podeGerir()? function(){ return A.del('cauchos_req',r.id) } : null,
    submit:function(x){ var n=Object.assign({},A.clean(r),x); Object.keys(n).forEach(function(k){ if(n[k]===''||n[k]==null) delete n[k] }); return A.put('cauchos_req',r.id,n) }});
}
function detalhe(id){
  var r=A.get('cauchos_req',id); if(!r) return; var g=podeGerir();
  A.showModal('<h2><span class="mono">'+esc(r.numero||'')+'</span> '+estPill(r.estado)+(r.urgente?' <span class="pill bad">urgente</span>':'')+'</h2><dl class="detail">'+
    [['Máquina',A.mName(r.maquina)],['Corpo',r.corpo],['Caucho',[r.mm,r.ref].filter(Boolean).join(' · ')],['Quantidade',r.qtd],['Motivo',r.motivo],['Tiragem do que saiu',r.tiragem!=null?fmt(r.tiragem,0)+' impressões':'–'],['Contador',r.contador!=null?fmt(r.contador,0):'–'],['Operador',r.operador],['Data',fdate(r.data)],['OF',r.of],
     ['Entregue',r.emEntregue?fdate(r.emEntregue.slice(0,10))+' · '+(r.porEntregue||''):'–']].map(function(x){ return '<div><dt>'+x[0]+'</dt><dd>'+esc(x[1]==null||x[1]===''?'–':x[1])+'</dd></div>' }).join('')+
    (r.obs?'<div class="full"><dt>Observações</dt><dd>'+esc(r.obs)+'</dd></div>':'')+'</dl>'+
    '<div class="foot"><button class="btn" id="caX">Fechar</button><button class="btn" id="caE">Corrigir</button>'+(g&&r.estado==='Pedida'?'<button class="btn danger" id="caC">Cancelar</button><button class="btn primary" id="caOk">Marcar entregue</button>':'')+'</div>',
  function(){ $('caX').onclick=A.closeModal; $('caE').onclick=function(){ editar(r) };
    var go=function(e){ return function(){ A.closeModal(); mudar(r,e).catch(function(){ A.toast('Não foi possível gravar.') }) } };
    if($('caOk')) $('caOk').onclick=go('Entregue'); if($('caC')) $('caC').onclick=go('Cancelada') });
}

/* ---------- vista ---------- */
A.register('cauchos',{
  html:function(){
    var t=A.tab('ca','req'), all=reqs(), fm=fv('caM',''), ms=maqs().map(function(m){ return [m.id,m.nome] }), velhos=A.list('cauchos');
    var validos=all.filter(function(r){ return r.estado!=='Cancelada' });
    var abertas=all.filter(function(r){ return r.estado==='Pedida' });
    var ano=new Date().getFullYear()+'', noAno=validos.filter(function(r){ return (r.data||'').slice(0,4)===ano }).reduce(function(s,r){ return s+(+r.qtd||1) },0);
    var tir=validos.filter(function(r){ return r.tiragem>0 }), med=tir.length? tir.reduce(function(s,r){ return s+r.tiragem },0)/tir.length : null;
    var head=A.head({c:C,mod:'Impressão',title:'Cauchos',p:'Requisição de cauchos pelo operador e controlo da tiragem que cada caucho fez em cada máquina e corpo.',
      acts:'<button class="btn primary" id="caNew">Requisitar caucho</button>'});
    var kp=A.kpis([{v:abertas.length,l:'Por entregar',cls:abertas.some(function(r){return r.urgente})?'bad':abertas.length?'warn':''},{v:fmt(noAno,0),l:'Cauchos pedidos em '+ano},{v:med!=null?fmt(med,0):'–',l:'Tiragem média por caucho'},{v:tir.length,l:'Trocas com tiragem registada'}]);
    var tabs=A.tabs('ca',[['req','Requisições'+(abertas.length?' ('+abertas.length+')':'')],['maq','Por máquina'],['tir','Tiragem']].concat(velhos.length?[['old','Registo anterior']]:[]),t);
    var body='';
    if(t==='req'){
      var fe=fv('caE','todas');
      var R=all.filter(function(r){ return (!fm||r.maquina===fm) && (fe==='todas'||r.estado===fe) });
      body='<div class="filters"><select data-f="caE">'+selOpts([['todas','Todas']].concat(ESTADOS.map(function(e){return [e,e]})),fe)+'</select><select data-f="caM">'+selOpts(ms,fm,'Todas as máquinas')+'</select></div>'+
        A.table(R,[{l:'N.º',v:function(r){ return '<b class="mono">'+esc(r.numero||'')+'</b>'+(r.urgente?' <span class="pill bad">urgente</span>':'') }},{l:'Data',v:function(r){ return fdate(r.data) }},{l:'Máquina',v:function(r){ return esc(A.mName(r.maquina)) }},{l:'Corpo',v:function(r){ return esc(r.corpo||'–') }},
          {l:'Caucho',v:function(r){ return esc(r.ref||r.mm||'–')+(r.qtd>1?' <b>× '+r.qtd+'</b>':'') }},{l:'Motivo',v:function(r){ return esc(r.motivo||'–') }},{l:'Tiragem',n:1,v:function(r){ return r.tiragem!=null?fmt(r.tiragem,0):'–' }},{l:'Operador',v:function(r){ return esc(r.operador||'–') }},{l:'Estado',v:function(r){ return estPill(r.estado) }}],{click:1,empty:'Ainda não há requisições de cauchos.'});
    } else if(t==='maq'){
      body='<div class="mach">'+maqs().filter(function(m){ return !fm||m.id===fm }).map(function(m){
        return '<div class="panel"><div class="ph"><h2>'+esc(m.nome)+'</h2><button class="btn sm" data-req="'+esc(m.id)+'">Requisitar</button></div><table class="t"><thead><tr><th>Corpo</th><th>Última troca</th><th class="n">Tiragem média</th><th class="n">Trocas</th></tr></thead><tbody>'+
          corpos(m.id).map(function(p){ var rs=validos.filter(function(r){ return r.maquina===m.id && r.corpo===p }), u=rs[0], tg=rs.filter(function(r){ return r.tiragem>0 }), md=tg.length? tg.reduce(function(s,r){return s+r.tiragem},0)/tg.length : null;
            return '<tr class="click" data-req="'+esc(m.id)+'" data-corpo="'+esc(p)+'"><td><b>'+esc(p)+'</b></td><td>'+(u?fdate(u.data)+' <span class="small muted">há '+A.days(u.data)+' d</span>':'<span class="muted">–</span>')+'</td><td class="n">'+(md!=null?fmt(md,0):'–')+'</td><td class="n">'+rs.length+'</td></tr>' }).join('')+'</tbody></table></div>' }).join('')+'</div>';
    } else if(t==='tir'){
      var porM={}, porC={}, porMes={};
      tir.filter(function(r){ return !fm||r.maquina===fm }).forEach(function(r){ var k=A.mName(r.maquina); (porM[k]=porM[k]||[]).push(r.tiragem); var kc=k+' · '+r.corpo; (porC[kc]=porC[kc]||[]).push(r.tiragem) });
      validos.filter(function(r){ return !fm||r.maquina===fm }).forEach(function(r){ var k=(r.data||'').slice(0,7); if(k) porMes[k]=(porMes[k]||0)+(+r.qtd||1) });
      var media=function(o){ return Object.keys(o).map(function(k){ var a=o[k]; return {l:k, v:Math.round(a.reduce(function(s,x){return s+x},0)/a.length), s:a.length+' troca'+(a.length>1?'s':'')} }).sort(function(a,b){ return b.v-a.v }) };
      var meses=Object.keys(porMes).sort().slice(-12).map(function(k){ return {l:k.slice(5)+'/'+k.slice(2,4), v:porMes[k]} });
      var vazio='<p class="muted">Ainda sem trocas com tiragem registada.</p>';
      body='<div class="filters"><select data-f="caM">'+selOpts(ms,fm,'Todas as máquinas')+'</select></div><div class="grid2">'+
        '<div class="panel"><h2>Tiragem média por máquina</h2><div style="margin-top:10px">'+(tir.length?Charts.hbars({rows:media(porM),unit:'imp.',color:'var(--c-imp)'}):vazio)+'</div></div>'+
        '<div class="panel"><h2>Tiragem média por corpo</h2><div style="margin-top:10px">'+(tir.length?Charts.hbars({rows:media(porC).slice(0,20),unit:'imp.',color:'var(--s1)'}):vazio)+'</div></div></div>'+
        '<div class="panel" style="margin-top:14px"><h2>Cauchos pedidos por mês</h2><div style="margin-top:10px">'+(meses.length?Charts.hbars({rows:meses,unit:'un.',color:'var(--s4)'}):'<p class="muted">Ainda sem requisições.</p>')+'</div></div>';
    } else {
      body='<p class="small muted">Cauchos registados na versão anterior (entrada em stock, montagem e retirada por código).</p>'+
        A.table(velhos.slice().sort(A.by('codigo')),[{l:'Código',v:function(c){ return '<b class="mono">'+esc(c.codigo||'')+'</b>' }},{l:'Referência',v:function(c){ return esc(c.referencia||'–') }},{l:'Estado',v:function(c){ return esc(c.estado||'–') }},
          {l:'Máquina',v:function(c){ return c.maquina? esc(A.mName(c.maquina)+' · '+(c.posicao||'')) : '–' }},{l:'Impressões',n:1,v:function(c){ var v=I.vida? I.vida(c) : {}; return v.imp!=null?fmt(v.imp,0):'–' }}],{empty:'Sem registos.'});
    }
    return head+kp+tabs+body;
  },
  bind:function(r){
    $('caNew').onclick=function(){ pedir() };
    r.querySelectorAll('[data-req]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); pedir(b.dataset.req, b.dataset.corpo||'') } });
    if(A.tab('ca','req')==='req') A.bindRows(r,detalhe);
    bindFilters(r); if(window.Charts&&Charts.bind) Charts.bind(r);
  }
});
/* modo posto: "Requisitar caucho" abre já com a máquina */
I.cauchoMontar=function(mid){ pedir(mid) };
I.cauchoDetalhe=function(){};
window.Cauchos={pedir:pedir};
})();
