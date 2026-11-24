/* Modo posto: ecrã simples para o tablet junto à máquina (#posto-<máquina>, aberto também pela etiqueta QR).
   O operador identifica-se pelo n.º de colaborador e regista com botões grandes: iniciar OF, paragens,
   quantidades, terminar OF, e as ações do setor (caucho, água, intervenção, FII). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, I=window.Impressao, Q=window.Qualidade;
function P(){ return window.Producao }
function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v? JSON.parse(v) : d }catch(e){ return d } }
function lsSet(k,v){ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,JSON.stringify(v)) }catch(e){} }
function corSetor(s){ return {'Impressão':'var(--c-imp)','Corte e Vinco':'var(--c-cv)','Colagem':'var(--c-col)','Embalamento':'var(--c-emb)'}[s]||'var(--brand)' }
function icoSetor(s){ return {'Impressão':'impressao','Corte e Vinco':'corte-vinco','Colagem':'colagem','Embalamento':'embalamento'}[s]||'oficina' }
function maqDe(arg){ return A.get('maquinas',arg) || A.list('maquinas').filter(function(m){ return A.idKey(m.nome)===arg || m.nome===arg })[0] }
function opAtual(mid){ var o=lsGet('flow_posto_op_'+mid,null); if(o && o.ate>Date.now()) return o; return null }
function aberta(mid){ return A.list('producao').filter(function(r){ return r.maquina===mid && r.estado==='aberta' }).sort(function(a,b){ return (b.inicio||'')<(a.inicio||'')?-1:1 })[0] }
function parAberta(r){ return (r&&r.paragens||[]).filter(function(p){ return p.ini && !p.fim })[0] }
var tick=null;

/* ---------- escolha da máquina ---------- */
A.register('posto',{
  html:function(){
    var ult=lsGet('flow_posto',null), grupos={};
    A.maquinas().forEach(function(m){ (grupos[m.setor||'Outros']=grupos[m.setor||'Outros']||[]).push(m) });
    var ordem=['Impressão','Corte e Vinco','Colagem','Embalamento'];
    var keys=Object.keys(grupos).sort(function(a,b){ var x=ordem.indexOf(a), y=ordem.indexOf(b); return (x<0?99:x)-(y<0?99:y)||a.localeCompare(b) });
    return '<div class="head" style="--c:var(--brand)"><div><div class="eyebrow">Modo posto</div><h1>Escolha a máquina</h1><p>Este dispositivo fica associado à máquina escolhida. Para não ter de escolher, cole na máquina a etiqueta QR (Configuração › Etiquetas QR).</p></div><div class="acts"><a class="btn" href="#inicio">Sair</a></div></div>'+
      (ult&&maqDe(ult)?'<a class="tile go" href="#posto-'+encodeURIComponent(ult)+'" style="margin-bottom:14px;min-height:0"><b>Continuar em '+esc(maqDe(ult).nome)+'</b><span>Último posto usado neste dispositivo</span></a>':'')+
      (keys.length? keys.map(function(k){ return '<h2 style="font-size:20px;margin:14px 0 8px;color:'+corSetor(k)+'">'+esc(k)+'</h2><div class="tiles">'+grupos[k].map(function(m){ var ab=aberta(m.id);
        return '<a class="tile" href="#posto-'+encodeURIComponent(m.id)+'" style="--c:'+corSetor(k)+';text-decoration:none;min-height:100px"><b>'+esc(m.nome)+'</b><span>'+(ab?'A produzir OF '+esc(ab.of):esc(m.modelo||'Livre'))+'</span></a>' }).join('')+'</div>' }).join('')
        : '<div class="panel empty">Ainda não há máquinas nos dados mestre.</div>');
  }
});

/* ---------- ecrã do posto ---------- */
function identificar(m){
  var ops=A.operadores(m.setor);
  A.showModal('<h2>Quem está na '+esc(m.nome)+'?</h2><p class="muted" style="margin:-6px 0 0">Escreva o n.º de colaborador ou escolha o nome.</p>'+
    '<input id="opN" class="bigin" inputmode="numeric" autocomplete="off" placeholder="N.º de colaborador"><div class="keypad">'+[1,2,3,4,5,6,7,8,9,'⌫',0,'OK'].map(function(k){return '<button type="button" data-k="'+k+'">'+k+'</button>'}).join('')+'</div>'+
    '<div id="opMsg" class="small" style="color:var(--bad)"></div>'+
    (ops.length?'<div class="sep">Ou escolha</div><div style="display:flex;flex-wrap:wrap;gap:6px;max-height:220px;overflow:auto">'+ops.map(function(o){return '<button class="btn" data-op="'+esc(o.nome)+'">'+esc(o.nome)+'</button>'}).join('')+'</div>':'')+
    '<div class="foot"><button class="btn" id="opX">Fechar</button></div>',
    function(){
      var inp=$('opN'), ok=function(nome){ lsSet('flow_posto_op_'+m.id,{nome:nome, ate:Date.now()+12*3600e3}); A.closeModal(); A.toast('Bom trabalho, '+nome.split(' ')[0]+'!') };
      var porNum=function(){ var n=inp.value.trim().replace(/^0+/,''); var o=A.list('operadores').filter(function(x){ return String(x.numero||'').replace(/^[A-Za-z]*0*/,'')===n || String(x.numero||'')===inp.value.trim() })[0];
        if(o) ok(o.nome); else $('opMsg').textContent='N.º não encontrado nos dados mestre. Escolha o nome na lista.' };
      document.querySelectorAll('[data-k]').forEach(function(b){ b.onclick=function(){ var k=b.dataset.k; if(k==='⌫') inp.value=inp.value.slice(0,-1); else if(k==='OK') porNum(); else inp.value+=k } });
      inp.onkeydown=function(e){ if(e.key==='Enter') porNum() };
      document.querySelectorAll('[data-op]').forEach(function(b){ b.onclick=function(){ ok(b.dataset.op) } });
      $('opX').onclick=A.closeModal; inp.focus();
    });
}
function iniciarOF(m, op){
  var mapa=[]; if(window.Embalamento&&Embalamento.mapas) Embalamento.mapas().forEach(function(x){ x.linhas.forEach(function(l){ if(l.of) mapa.push(l) }) });
  A.openForm({title:'Iniciar OF na '+m.nome, values:{velNominal:m.velocidade||''},
    fields:[{k:'of',l:'N.º da OF',req:1,list:'dlOfs'},{k:'mm',l:'MM',help:'Preenchido automaticamente quando a OF está no mapa'},{k:'velNominal',l:'Velocidade nominal (un./h)',t:'number'},
      {t:'html',html:'<datalist id="dlOfs">'+mapa.slice(0,300).map(function(l){return '<option value="'+esc(l.of)+'">'+esc((l.cliente||'')+' · '+(l.mm||''))+'</option>'}).join('')+'</datalist>'}],
    after:function(){ $('f_of').addEventListener('change',function(){ var l=mapa.filter(function(x){return String(x.of)===this.value.trim()},this)[0]; if(l&&!$('f_mm').value) $('f_mm').value=l.mm||'' }) },
    submit:function(x){ var now=new Date(); return A.add('producao',{setor:m.setor, maquina:m.id, of:String(x.of).trim(), mm:x.mm, operador:op.nome, turno:P().turnoDe(now), inicio:now.toISOString(), data:A.today(), qtdBoa:0, qtdDesperdicio:0, unidade:'folhas', velNominal:x.velNominal||m.velocidade||null, paragens:[], estado:'aberta'}) },
    ok:'Iniciar', done:'OF iniciada.'});
}
function paragem(m, r){
  var mot=P().motivos(m.setor);
  A.showModal('<h2>Motivo da paragem</h2><div class="tiles">'+mot.map(function(x){return '<button class="tile" data-mot="'+esc(x)+'" style="min-height:70px"><b style="font-size:18px">'+esc(x)+'</b></button>'}).join('')+'</div><div class="foot"><button class="btn" id="pX">Cancelar</button></div>',
    function(){ $('pX').onclick=A.closeModal; document.querySelectorAll('[data-mot]').forEach(function(b){ b.onclick=async function(){ var o=A.clean(r); o.paragens=(r.paragens||[]).concat([{motivo:b.dataset.mot, ini:new Date().toISOString()}]);
      try{ await A.put('producao',r.id,o); A.closeModal(); A.toast('Paragem iniciada: '+b.dataset.mot) }catch(e){ A.toast('Não foi possível gravar.') } } }) });
}
async function fimParagem(r){ var o=A.clean(r), now=new Date().toISOString(); o.paragens=(r.paragens||[]).map(function(p){ if(p.ini&&!p.fim){ p=Object.assign({},p,{fim:now}); p.min=Math.round(P().mins(p.ini,p.fim)) } return p });
  try{ await A.put('producao',r.id,o); A.toast('Máquina a produzir.') }catch(e){ A.toast('Não foi possível gravar.') } }
function quantidade(r, fechar){
  A.openForm({title:fechar?'Terminar OF '+r.of:'Registar quantidade · OF '+r.of, intro:fechar?'Indique o total final. Depois de terminar, a OF sai deste posto.':'Some o que produziu desde o último registo.',
    values:fechar?{qtdBoa:r.qtdBoa||'',qtdDesperdicio:r.qtdDesperdicio||''}:{},
    fields:fechar?[{k:'qtdBoa',l:'Total bom',t:'number',req:1},{k:'qtdDesperdicio',l:'Total de desperdício',t:'number'},{k:'obs',l:'Observações',t:'textarea',rows:2}]
      : [{k:'boa',l:'+ Boas',t:'number'},{k:'desp',l:'+ Desperdício',t:'number'}],
    submit:function(x){ var o=A.clean(r);
      if(fechar){ o.qtdBoa=x.qtdBoa||0; o.qtdDesperdicio=x.qtdDesperdicio||0; if(x.obs) o.obs=x.obs; var now=new Date().toISOString(); o.paragens=(o.paragens||[]).map(function(p){ if(p.ini&&!p.fim){ p=Object.assign({},p,{fim:now}); p.min=Math.round(P().mins(p.ini,p.fim)) } return p }); o.fim=now; o.estado='fechada' }
      else { o.qtdBoa=(+r.qtdBoa||0)+(x.boa||0); o.qtdDesperdicio=(+r.qtdDesperdicio||0)+(x.desp||0) }
      return A.put('producao',r.id,o) }, ok:fechar?'Terminar OF':'Somar', done:fechar?'OF terminada.':'Quantidade registada.'});
}
function tile(id, b, s, cls, c){ return '<button class="tile '+(cls||'')+'" data-t="'+id+'"'+(c?' style="--c:'+c+'"':'')+'><b>'+b+'</b><span>'+s+'</span></button>' }
A.registerPrefix('posto-',{
  html:function(){
    var m=maqDe(A.routeArg()); if(!m) return '<div class="panel empty">Máquina não encontrada. <a href="#posto">Escolher outra</a>.</div>';
    lsSet('flow_posto',m.id);
    var c=corSetor(m.setor), op=opAtual(m.id), r=aberta(m.id), pa=parAberta(r), o=r? P().oee(r) : null;
    var top='<div class="posto-top" style="--c:'+c+'">'+A.ico(icoSetor(m.setor),'lg')+'<div><div class="eyebrow" style="font:600 11px var(--f-mono);letter-spacing:.08em;color:'+c+'">'+esc((m.setor||'').toUpperCase())+'</div><h1>'+esc(m.nome)+'</h1></div>'+
      '<div class="op">'+(op?'<span>Operador: <b>'+esc(op.nome)+'</b></span><button class="btn sm" id="pTroca">Trocar</button>':'<button class="btn primary" id="pId">Identificar-me</button>')+'<a class="btn sm ghost" href="#posto">Outra máquina</a><a class="btn sm ghost" href="#inicio">Sair</a></div></div>';
    if(!op) return top+'<div class="panel empty" style="font-size:17px">Identifique-se para começar a registar.</div>';
    var run=r? '<div class="run" style="border-left:6px solid '+(pa?'var(--bad)':'var(--ok)')+'"><div><span>OF</span><b><a href="#of-'+encodeURIComponent(r.of)+'" style="color:inherit">'+esc(r.of)+'</a></b></div><div><span>'+(pa?'Parada há':'A produzir há')+'</span><b id="pClock">'+P().hm(pa?P().mins(pa.ini):P().mins(r.inicio))+'</b></div>'+
      '<div><span>Boas</span><b>'+fmt(r.qtdBoa||0,0)+'</b></div><div><span>Desperdício</span><b>'+fmt(r.qtdDesperdicio||0,0)+'</b></div><div><span>Paragens</span><b>'+P().hm(P().paragensMin(r))+'</b></div><div><span>OEE até agora</span><b>'+P().pct(o.oee)+'</b></div></div>' : '';
    var t=[];
    if(!r) t.push(tile('ini','Iniciar OF','Começar a registar uma ordem de fabrico','go'));
    else { t.push(pa? tile('fimpar','Retomar produção','Terminar a paragem: '+esc(pa.motivo),'go') : tile('par','Paragem','Registar o motivo da paragem','stop'));
      t.push(tile('qtd','Registar quantidade','Somar boas e desperdício')); t.push(tile('fim','Terminar OF','Fechar com o total final')); t.push(tile('verOF','Ver a OF','Histórico, specs, incidências')) }
    if(m.setor==='Impressão'){ t.push(tile('rv','Reserva de verniz','Onde está o caucho do cortante','', 'var(--c-imp)')); t.push(tile('cau','Requisitar caucho','Caucho novo e tiragem do que sai','', 'var(--c-imp)')); t.push(tile('agua','Medir água','Álcool, condutividade, pH','', 'var(--c-imp)')) }
    t.push(tile('int','Intervenção técnica','Inspeção, troca de rolo, ajuste','', 'var(--c-man)')); t.push(tile('av','Avaria','Comunicar uma avaria na máquina','', 'var(--bad)'));
    if(m.setor==='Colagem') t.push(tile('req','Requisitar material','Correias e peças (com foto)','', 'var(--c-col)'));
    t.push(tile('fii','Registar FII','Incidência interna','', 'var(--warn)'));
    return top+run+'<div class="tiles">'+t.join('')+'</div>';
  },
  bind:function(){
    var m=maqDe(A.routeArg()); if(!m) return; var op=opAtual(m.id), r=aberta(m.id);
    if($('pId')) $('pId').onclick=function(){ identificar(m) }; if($('pTroca')) $('pTroca').onclick=function(){ lsSet('flow_posto_op_'+m.id,null); identificar(m) };
    if(!op && $('modal').hidden) setTimeout(function(){ if(!opAtual(m.id)) identificar(m) },300);
    document.querySelectorAll('[data-t]').forEach(function(b){ b.onclick=function(){ var k=b.dataset.t; op=opAtual(m.id); if(!op){ identificar(m); return }
      if(k==='ini') iniciarOF(m,op); else if(k==='par') paragem(m,r); else if(k==='fimpar') fimParagem(r); else if(k==='qtd') quantidade(r,false); else if(k==='fim') quantidade(r,true);
      else if(k==='verOF') location.hash='of-'+encodeURIComponent(r.of);
      else if(k==='cau') I.cauchoMontar(m.id); else if(k==='agua') I.aguaForm();
      else if(k==='int') I.intForm(null, m.setor||'Impressão', {maquina:m.id, executante:op.nome});
      else if(k==='av') I.intForm(null, m.setor||'Impressão', {maquina:m.id, executante:op.nome, tipo:'Avaria', estado:'Aberta', resultado:'nok'});
      else if(k==='rv' && window.Reservas) Reservas.procuraRapida(m.id);
      else if(k==='req' && window.Requisicoes) Requisicoes.abrir(m.id);
      else if(k==='fii' && Q.incForm) Q.incForm(null,'FII');
    } });
    clearInterval(tick); tick=setInterval(function(){ var el=$('pClock'); if(!el||!S.route.indexOf||S.route.indexOf('posto-')!==0){ clearInterval(tick); return } var rr=aberta(m.id); if(!rr) return; var pa=parAberta(rr); el.textContent=P().hm(pa?P().mins(pa.ini):P().mins(rr.inicio)) },30000);
  }
});
})();
