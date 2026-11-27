/* Impressão › Cauchos: consumo, supermercado (stock), inventário e compras.
   - Operador (botões grandes): máquina → corpo → caucho do supermercado → motivo → contador da máquina → nome. Grava a troca e desconta 1 do stock.
     As folhas que o caucho que sai fez = contador agora − contador da troca anterior no mesmo corpo; os dias = desde essa troca.
   - Supermercado: o que há no armário, com alerta de stock baixo. Visível a todos.
   - Inventário (permissão "Stock e compras"): contagem semanal; a diferença para o stock calculado = cauchos usados sem registo.
   - Compras (idem): consumo semanal, cobertura em semanas e quantidade sugerida a encomendar.
   - Indicadores: folhas e dias por caucho em cada máquina e corpo, motivos, consumo por mês, custo.
   Coleções: cauchos_req (trocas; as requisições antigas continuam lá), cau_stock {codigo, descricao, medida, maquinas, stock, min, local, preco, fornecedor},
   cau_inv {data, por, linhas:[{codigo, antes, contado}]}. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao, C='var(--c-imp)';
var fv=I.fv, F=I.F, selOpts=I.selOpts, bindFilters=I.bindFilters;
var MOTIVOS=[['Empancamento de folhas','Empancamento','A folha encravou e marcou ou cortou o caucho'],['Desgaste natural','Desgaste natural','Chegou ao fim de vida'],['Outro','Outro motivo','Corte, contaminação, inchaço, troca de trabalho…']];
var EMP=/empanc|corte|dano/i, DESG=/desgaste|fim de vida/i;
var SEMANAS_ALVO=6;   /* compras: stock para 6 semanas de consumo, além do mínimo */
function podeGerir(){ return S.admin || A.can('stock') }
function maqs(){ return I.impMaq() }
function corpos(mid){ var m=A.get('maquinas',mid)||{}, n=+m.corpos||6, t=I.torres(m), p=[]; for(var i=1;i<=n;i++) p.push('Corpo '+i); for(var j=1;j<=t;j++) p.push(t>1?'Torre de verniz '+j:'Torre de verniz'); return p }
function trocas(){ return A.list('cauchos_req').filter(function(r){ return r.estado!=='Cancelada' }).sort(function(a,b){ return ((b.data||'')+(b.hora||'')+(b.criadoEm||''))<((a.data||'')+(a.hora||'')+(a.criadoEm||''))?-1:1 }) }
function stockL(){ return A.list('cau_stock').filter(function(s){ return !s._del }).sort(function(a,b){ return String(a.descricao||a.codigo).localeCompare(String(b.descricao||b.codigo)) }) }
function art(cod){ return A.list('cau_stock').filter(function(s){ return String(s.codigo)===String(cod) })[0] }
function anterior(mid, corpo){ return trocas().filter(function(r){ return r.maquina===mid && r.corpo===corpo && r.contador!=null })[0] }
function proxNumero(){ var y=String(new Date().getFullYear()).slice(2), mx=0; A.list('cauchos_req').forEach(function(r){ var m=/^CA(\d\d)-(\d+)$/.exec(r.numero||''); if(m&&m[1]===y) mx=Math.max(mx,+m[2]) }); return 'CA'+y+'-'+('000'+(mx+1)).slice(-4) }
function nivelStock(s){ var q=+s.stock||0, mn=s.min!=null? +s.min : 1; return q<=0?'bad':q<=mn?'warn':'ok' }
function motivoGrupo(m){ return EMP.test(m||'')?'Empancamento':DESG.test(m||'')?'Desgaste':'Outro' }
function media(a){ return a.length? a.reduce(function(s,x){ return s+x },0)/a.length : null }
function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v? JSON.parse(v) : d }catch(e){ return d } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){} }
/* consumo por artigo nas últimas n semanas */
function consumoSemanal(cod, n){ var lim=new Date(Date.now()-n*7*864e5).toISOString().slice(0,10);
  return trocas().filter(function(r){ return String(r.codigo||r.mm||'')===String(cod) && (r.data||'')>=lim }).reduce(function(s,r){ return s+(+r.qtd||1) },0)/n }
/* OF em produção na máquina agora (modo posto / Produção) */
function ofAberta(mid){ return A.list('producao').filter(function(r){ return r.maquina===mid && r.estado==='aberta' }).sort(function(a,b){ return (b.inicio||'')<(a.inicio||'')?-1:1 })[0] }
/* cartolinas conhecidas: biblioteca da Qualidade (nome + fornecedor) e receções recentes */
function cartolinas(){ var o={};
  (window.Q2&&Q2.lib? Q2.lib() : []).forEach(function(l){ if(l[1]) o[l[1]+'|'+(l[2]||'')]={nome:String(l[1]), forn:String(l[2]||'')} });
  A.list('cartolinactrl').forEach(function(c){ if(c.nome) o[c.nome+'|'+(c.fornecedor||'')]={nome:String(c.nome), forn:String(c.fornecedor||'')} });
  return Object.keys(o).map(function(k){ return o[k] }).sort(function(a,b){ return a.nome.localeCompare(b.nome) }) }
/* aviso mecânico: corpo cujos últimos cauchos (sem contar empancamentos) duram menos de metade da média da máquina */
var MEC_LIM=0.5;
function mecanicos(){ var out=[], L=trocas().filter(function(r){ return r.tiragem>0 && motivoGrupo(r.motivo)!=='Empancamento' });
  maqs().forEach(function(m){ var Lm=L.filter(function(r){ return r.maquina===m.id }); if(Lm.length<5) return; var ref=media(Lm.map(function(r){ return r.tiragem }));
    corpos(m.id).forEach(function(c){ var u=Lm.filter(function(r){ return r.corpo===c }).slice(0,3); if(u.length<2) return; var v=media(u.map(function(r){ return r.tiragem }));
      if(v<ref*MEC_LIM) out.push({maquina:m.id, nome:m.nome, corpo:c, v:v, ref:ref, n:u.length, ult:u[0].data}) }) });
  return out }
function abrirInc(x){ if(!I.intForm){ A.toast('Incidências técnicas indisponíveis.'); return }
  I.intForm(null,'Impressão',{maquina:x.maquina, corpo:x.corpo, tipo:'Avaria', estado:'Aberta',
    descricao:'Os cauchos do '+x.corpo+' estão a durar '+fmt(x.v,0)+' folhas (últimas '+x.n+' trocas), menos de metade da média da '+x.nome+' ('+fmt(x.ref,0)+'). Verificar pressão entre cilindros, calços/alceamento, rolos e cilindro do caucho.'}) }
function ultInv(){ return A.list('cau_inv').slice().sort(function(a,b){ return (b.data||'')<(a.data||'')?-1:1 })[0] }

/* ---------- troca guiada (operador) ---------- */
var T=null;   /* estado da troca em curso */
function trocar(preMaq, preCorpo){
  T={maquina:preMaq||'', corpo:preCorpo||'', codigo:'', motivo:'', contador:'', operador:lsGet('flow_cau_op','')};
  passo();
}
function cab(n, titulo){ var m=T.maquina? A.mName(T.maquina) : '';
  return '<div class="cau-cab"><div class="eb">Troca de caucho · passo '+n+' de 5'+(m?' · '+esc(m):'')+(T.corpo?' · '+esc(T.corpo):'')+'</div><h2>'+esc(titulo)+'</h2></div>' }
function pe(voltar){ return '<div class="foot">'+(voltar?'<button class="btn" id="cbBack">Voltar</button>':'')+'<button class="btn" id="cbX">Cancelar</button></div>' }
function ligar(voltar){ $('cbX').onclick=function(){ T=null; A.closeModal() }; if($('cbBack')) $('cbBack').onclick=voltar }
function passo(){
  if(!T.maquina){
    A.showModal(cab(1,'Em que máquina?')+'<div class="tiles">'+maqs().map(function(m){ return '<button class="tile" data-m="'+esc(m.id)+'" style="--c:var(--c-imp);min-height:90px"><b>'+esc(m.nome)+'</b><span>'+esc(m.modelo||'')+'</span></button>' }).join('')+'</div>'+pe(),
      function(b){ ligar(); b.querySelectorAll('[data-m]').forEach(function(x){ x.onclick=function(){ T.maquina=x.dataset.m; passo() } }) }); return }
  if(!T.corpo){
    A.showModal(cab(2,'Que corpo?')+'<div class="tiles cau-corpos">'+corpos(T.maquina).map(function(p){ var a=anterior(T.maquina,p);
        return '<button class="tile" data-c="'+esc(p)+'" style="--c:var(--c-imp);min-height:86px"><b>'+esc(p)+'</b><span>'+(a?'Último: há '+A.days(a.data)+' d':'Sem registo')+'</span></button>' }).join('')+'</div>'+pe(1),
      function(b){ ligar(function(){ T.maquina=''; passo() }); b.querySelectorAll('[data-c]').forEach(function(x){ x.onclick=function(){ T.corpo=x.dataset.c; passo() } }) }); return }
  if(!T.codigo){
    var mn=A.mName(T.maquina), L=stockL().filter(function(s){ return !s.maquinas || A.norm(s.maquinas).indexOf(A.norm(mn))>=0 }), usado=(anterior(T.maquina,T.corpo)||{}).codigo;
    if(usado) L.sort(function(a,b){ return (b.codigo===usado)-(a.codigo===usado) });
    A.showModal(cab(3,'Que caucho vais montar?')+
      (L.length? '<div class="tiles">'+L.map(function(s){ var nv=nivelStock(s);
        return '<button class="tile cau-art" data-a="'+esc(s.codigo)+'" style="--c:var(--c-imp)"'+(+s.stock>0?'':' aria-describedby="semst"')+'><b>'+esc(s.medida||s.descricao||s.codigo)+'</b><span>'+esc(s.descricao&&s.medida?s.descricao:'')+'</span>'+
          '<span class="mono small">'+esc(s.codigo)+(s.local?' · '+esc(s.local):'')+'</span><span class="pill '+nv+'">'+(+s.stock||0)+' no armário</span>'+(s.codigo===usado?'<span class="pill info">o mesmo da última vez</span>':'')+'</button>' }).join('')+'</div>'
        : '<div class="banner">Ainda não há cauchos no supermercado'+(stockL().length?' para a '+esc(mn):'')+'. Podes continuar sem escolher; o responsável do stock carrega a lista.</div>')+
      '<div class="foot"><button class="btn" id="cbBack">Voltar</button><button class="btn" id="cbX">Cancelar</button><button class="btn" id="cbSem">Não está na lista</button></div>',
      function(b){ ligar(function(){ T.corpo=''; passo() }); $('cbSem').onclick=function(){ T.codigo='-'; passo() };
        b.querySelectorAll('[data-a]').forEach(function(x){ x.onclick=function(){ T.codigo=x.dataset.a; passo() } }) }); return }
  if(!T.motivo){
    A.showModal(cab(4,'Porque trocaste?')+'<div class="tiles">'+MOTIVOS.map(function(m,i){ return '<button class="tile'+(i===0?' stop':'')+'" data-mo="'+esc(m[0])+'" style="min-height:110px"><b>'+esc(m[1])+'</b><span>'+esc(m[2])+'</span></button>' }).join('')+'</div>'+pe(1),
      function(b){ ligar(function(){ T.codigo=''; passo() }); b.querySelectorAll('[data-mo]').forEach(function(x){ x.onclick=function(){ T.motivo=x.dataset.mo; passo() } }) }); return }
  var a=anterior(T.maquina,T.corpo), ops=A.operadores('Impressão').filter(function(o){ return !o.maquina || A.norm(o.maquina).indexOf(A.norm(A.mName(T.maquina)))>=0 });
  if(!ops.length) ops=A.operadores('Impressão');
  A.showModal(cab(5,'Contador da máquina agora')+
    '<input id="cbCt" class="bigin" inputmode="numeric" autocomplete="off" placeholder="folhas no contador" value="'+esc(T.contador)+'">'+
    '<div class="cau-calc" id="cbCalc"></div>'+
    '<label class="fld">O teu nome<select id="cbOp"><option value="">— escolher —</option>'+ops.map(function(o){ return '<option'+(o.nome===T.operador?' selected':'')+'>'+esc(o.nome)+'</option>' }).join('')+'</select></label>'+
    (T.motivo==='Outro'?'<label class="fld">O que aconteceu?<input id="cbObs" placeholder="ex. contaminação com solvente"></label>':'')+
    (T.motivo==='Empancamento de folhas'? (function(){ var cs=cartolinas(), ult=lsGet('flow_cau_cart_'+T.maquina,''), of=ofAberta(T.maquina);
      return '<label class="fld">Que cartolina estava a passar?<select id="cbCart"><option value="">Não sei</option>'+cs.map(function(c){ var k=c.nome+'|'+c.forn; return '<option value="'+esc(k)+'"'+(k===ult?' selected':'')+'>'+esc(c.nome)+(c.forn?' · '+esc(c.forn):'')+'</option>' }).join('')+'</select>'+
        '<small>Ajuda a perceber se há cartolinas ou fornecedores que encravam mais.'+(of?' OF em produção: <b>'+esc(of.of)+'</b>.':'')+'</small></label>' })() : '')+
    '<div class="foot"><span class="err" id="cbE"></span><button class="btn" id="cbBack">Voltar</button><button class="btn" id="cbX">Cancelar</button><button class="btn primary" id="cbOk">Registar troca</button></div>',
  function(){
    ligar(function(){ T.contador=$('cbCt').value; T.motivo=''; passo() });
    var calc=function(){ var v=A.num($('cbCt').value);
      $('cbCalc').innerHTML= !a? 'Primeira troca registada neste corpo: a partir de agora o FLOW conta as folhas de cada caucho.' :
        v==null? 'Troca anterior: <b>'+fdate(a.data)+'</b>, contador em <b>'+fmt(a.contador,0)+'</b>.' :
        v>a.contador? 'O caucho que sai fez <b>'+fmt(v-a.contador,0)+' folhas</b> em <b>'+A.days(a.data)+' dias</b>.' :
        '<span style="color:var(--bad)">O contador é menor do que na troca anterior ('+fmt(a.contador,0)+'). Foi reposto a zero? Grava na mesma; as folhas ficam por calcular.</span>' };
    $('cbCt').oninput=calc; calc(); $('cbCt').focus();
    $('cbOk').onclick=async function(){ var b=this, ct=A.num($('cbCt').value), op=$('cbOp').value;
      if(ct==null){ $('cbE').textContent='Escreve o número do contador.'; return } if(!op){ $('cbE').textContent='Escolhe o teu nome.'; return }
      b.disabled=true; lsSet('flow_cau_op',op);
      var s=T.codigo&&T.codigo!=='-'? art(T.codigo) : null, agora=new Date();
      var o={tipo:'troca', numero:proxNumero(), data:A.today(), hora:('0'+agora.getHours()).slice(-2)+':'+('0'+agora.getMinutes()).slice(-2), maquina:T.maquina, corpo:T.corpo, qtd:1, motivo:T.motivo, contador:ct, operador:op, estado:'Registada'};
      if(s){ o.codigo=String(s.codigo); o.ref=s.medida||s.descricao||'' }
      if(a){ o.contAnt=a.contador; o.dias=A.days(a.data); if(ct>a.contador) o.tiragem=ct-a.contador }
      if($('cbObs')&&$('cbObs').value.trim()) o.obs=$('cbObs').value.trim();
      var pr=ofAberta(T.maquina); if(pr){ if(pr.of) o.of=String(pr.of); if(pr.mm) o.mm=String(pr.mm) }
      if($('cbCart')&&$('cbCart').value){ var cp=$('cbCart').value.split('|'); o.cartolina=cp[0]; if(cp[1]) o.fornecedor=cp[1]; lsSet('flow_cau_cart_'+T.maquina,$('cbCart').value) }
      try{ await A.add('cauchos_req',o);
        if(s && s.stock!=null) await A.put('cau_stock',s.id,Object.assign(A.clean(s),{stock:Math.max(0,(+s.stock||0)-1)}));
        var mq=T.maquina, cpo=T.corpo; T=null; A.closeModal();
        A.toast(o.tiragem? 'Registado. O caucho que saiu fez '+fmt(o.tiragem,0)+' folhas.' : 'Troca registada.');
        var al=mecanicos().filter(function(x){ return x.maquina===mq && x.corpo===cpo })[0];
        if(al) setTimeout(function(){ A.showModal('<h2>Atenção ao '+esc(cpo)+'</h2><p>Os últimos cauchos deste corpo fizeram em média <b>'+fmt(al.v,0)+' folhas</b>. A média da '+esc(al.nome)+' é <b>'+fmt(al.ref,0)+'</b>: estão a durar menos de metade.</p><p class="muted">Pode ser mecânico: pressão, calços, rolos ou o cilindro do caucho. Vale a pena avisar a manutenção.</p>'+
          '<div class="foot"><button class="btn" id="mcX">Agora não</button><button class="btn primary" id="mcOk">Abrir incidência técnica</button></div>', function(){ $('mcX').onclick=A.closeModal; $('mcOk').onclick=function(){ A.closeModal(); abrirInc(al) } }) },1500);
      }catch(e){ b.disabled=false; $('cbE').textContent=e&&e.user? e.message : 'Não foi possível gravar.' } };
  });
}

/* ---------- supermercado: artigos, entradas, inventário ---------- */
function artForm(s){
  if(!podeGerir()){ A.toast('Só quem tem a permissão Stock e compras altera o supermercado.'); return }
  var edit=!!s;
  A.openForm({title:edit?'Caucho '+(s.medida||s.codigo):'Novo caucho no supermercado', values:s||{min:2,stock:0},
    fields:[{k:'codigo',l:'Código',req:1,ph:'código SAP / chave'},{k:'descricao',l:'Descrição do material',req:1,full:1},{k:'medida',l:'Medida / nome curto',ph:'ex. 1077 × 885 c/ barras'},
      {k:'maquinas',l:'Máquinas onde serve',ph:'ex. XL105, CD6 (vazio = todas)'},{k:'local',l:'Localização no armário',ph:'ex. Prateleira 2'},
      {k:'stock',l:'Quantidade no armário',t:'number'},{k:'min',l:'Stock mínimo',t:'number',help:'Abaixo disto aparece alerta de compra'},{k:'preco',l:'Preço unitário (€)',t:'number'},{k:'fornecedor',l:'Fornecedor'}],
    del: edit? function(){ return A.del('cau_stock',s.id) } : null,
    submit:function(x){ x.codigo=String(x.codigo).trim(); if(!edit && art(x.codigo)) throw A.uerr('Já existe o código '+x.codigo+'.');
      return A.put('cau_stock', edit? s.id : A.idKey(x.codigo), Object.assign({}, edit? A.clean(s) : {}, x)) }});
}
function entrada(){
  if(!podeGerir()){ A.toast('Sem permissão.'); return }
  var L=stockL(); if(!L.length){ A.toast('Carregue primeiro os cauchos do supermercado.'); return }
  A.openForm({title:'Entrada de cauchos (compra recebida)', fields:[{k:'codigo',l:'Caucho',t:'select',req:1,o:L.map(function(s){ return [s.codigo,(s.medida||s.descricao)+' · '+s.codigo] })},{k:'qtd',l:'Quantidade recebida',t:'number',req:1}],
    submit:function(x){ var s=art(x.codigo); return A.put('cau_stock',s.id,Object.assign(A.clean(s),{stock:(+s.stock||0)+(+x.qtd||0), ultEntrada:A.today()})) }, ok:'Somar ao stock', done:'Stock atualizado.'});
}
function inventario(){
  if(!podeGerir()){ A.toast('Sem permissão.'); return }
  var L=stockL(); if(!L.length){ A.toast('Carregue primeiro os cauchos do supermercado.'); return }
  A.showModal('<h2>Inventário do armário</h2><p class="muted" style="margin:0">Conta o que está fisicamente no armário e escreve a quantidade. Se for diferente do que o FLOW calculou, a diferença fica registada: são cauchos que saíram sem troca registada (ou entradas por lançar).</p>'+
    '<div class="tw"><table class="t"><thead><tr><th>Caucho</th><th class="n">FLOW calcula</th><th class="n">Contado</th></tr></thead><tbody>'+
    L.map(function(s){ return '<tr><td><b>'+esc(s.medida||s.descricao)+'</b><div class="small muted mono">'+esc(s.codigo)+(s.local?' · '+esc(s.local):'')+'</div></td><td class="n mono">'+(+s.stock||0)+'</td><td class="n"><input class="inv-q" data-inv="'+esc(s.codigo)+'" inputmode="numeric" value="'+(+s.stock||0)+'"></td></tr>' }).join('')+'</tbody></table></div>'+
    '<div class="foot"><span class="err" id="ivE"></span><button class="btn" id="ivX">Cancelar</button><button class="btn primary" id="ivOk">Gravar inventário</button></div>',
  function(b){ $('ivX').onclick=A.closeModal;
    $('ivOk').onclick=async function(){ var bt=this; bt.disabled=true; var linhas=[];
      b.querySelectorAll('[data-inv]').forEach(function(i){ var s=art(i.dataset.inv), c=A.num(i.value); if(s && c!=null) linhas.push({codigo:s.codigo, antes:+s.stock||0, contado:c, s:s}) });
      try{ for(var k=0;k<linhas.length;k++){ var l=linhas[k]; if(l.antes!==l.contado) await A.put('cau_stock',l.s.id,Object.assign(A.clean(l.s),{stock:l.contado})) }
        await A.add('cau_inv',{data:A.today(), por:S.names[S.uid]||'', linhas:linhas.map(function(l){ return {codigo:l.codigo, antes:l.antes, contado:l.contado} })});
        var dif=linhas.reduce(function(t,l){ return t+(l.antes-l.contado) },0);
        A.closeModal(); A.toast('Inventário gravado.'+(dif>0?' '+dif+' cauchos saíram sem registo.':dif<0?' Há '+(-dif)+' a mais do que o calculado.':' Bate certo.')) }
      catch(e){ bt.disabled=false; $('ivE').textContent='Não foi possível gravar.' } };
  });
}
/* lista do material (Excel ou colado): procura as colunas código, descrição e quantidade pelo cabeçalho */
function importar(){
  if(!podeGerir()){ A.toast('Sem permissão.'); return }
  A.showModal('<h2>Carregar cauchos do armário</h2><p class="muted" style="margin:0">Ficheiro Excel ou linhas coladas com <b>código</b> e <b>descrição</b> (e, se tiver, <b>quantidade</b>, <b>mínimo</b>, <b>localização</b>, <b>máquina</b>, <b>preço</b>). Os códigos que já existem são atualizados; nada é apagado.</p>'+
    '<label class="fld">Ficheiro<input type="file" id="ciF" accept=".xlsx,.xls,.csv"></label><label class="fld">ou cole aqui<textarea id="ciT" rows="6" placeholder="Código&#9;Descrição&#9;Quantidade"></textarea></label><div id="ciS" class="small"></div>'+
    '<div class="foot"><button class="btn" id="ciX">Fechar</button><button class="btn primary" id="ciOk" disabled>Carregar</button></div>',
  function(){ var P=[]; $('ciX').onclick=A.closeModal;
    var ler=function(rows){ rows=rows.filter(function(r){ return r && r.some(function(c){ return String(c).trim() }) }); if(!rows.length) return;
      var h=rows[0].map(function(c){ return A.norm(c) }), col=function(re){ return h.findIndex(function(c){ return re.test(c) }) };
      var ic=col(/^(codigo|cod|codigochave|chave|sap|material|artigo|mm)/), id=col(/desc|designa|texto|nome/), iq=col(/^(quant|qtd|stock|existenc)/), im=col(/^(min)/), il=col(/local|prateleira|posic/), ima=col(/maquin/), ip=col(/preco|custo/);
      var corpo=rows; if(ic>=0 && id>=0) corpo=rows.slice(1); else { ic=0; id=1; iq=2 }
      P=corpo.map(function(r){ var c=String(r[ic]==null?'':r[ic]).trim(); if(!c) return null; var o={codigo:c, descricao:String(r[id]||'').trim()};
        var q=iq>=0? A.num(r[iq]) : null; if(q!=null) o.stock=q; var m=im>=0? A.num(r[im]) : null; if(m!=null) o.min=m;
        if(il>=0&&r[il]) o.local=String(r[il]).trim(); if(ima>=0&&r[ima]) o.maquinas=String(r[ima]).trim(); var p=ip>=0? A.num(r[ip]) : null; if(p!=null) o.preco=p; return o }).filter(Boolean);
      var novos=P.filter(function(o){ return !art(o.codigo) }).length;
      $('ciS').innerHTML='<b>'+P.length+'</b> cauchos lidos · <b>'+novos+'</b> novos · <b>'+(P.length-novos)+'</b> a atualizar'+(P[0]?'<div class="muted">Ex.: '+esc(P[0].codigo+' · '+P[0].descricao)+'</div>':'');
      $('ciOk').disabled=!P.length };
    $('ciT').oninput=function(){ ler(this.value.split(/\r?\n/).map(function(l){ return l.split(/\t|;/) })) };
    $('ciF').onchange=async function(e){ var f=e.target.files[0]; if(!f) return; try{ await A.loadX(); var wb=XLSX.read(await f.arrayBuffer(),{type:'array'}); ler(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''})) }catch(err){ $('ciS').textContent='Não foi possível ler o ficheiro.' } };
    $('ciOk').onclick=async function(){ this.disabled=true; try{ for(var i=0;i<P.length;i++){ var o=P[i], s=art(o.codigo); await A.put('cau_stock', s? s.id : A.idKey(o.codigo), Object.assign({min:2, stock:0}, s? A.clean(s) : {}, o)) } A.closeModal(); A.toast(P.length+' cauchos carregados.') }catch(e){ $('ciS').textContent='Parou com erro.'; this.disabled=false } };
  });
}

/* ---------- indicadores ---------- */
function filtrar(L){ var fm=fv('caM',''), per=fv('caP','365'), lim=per==='tudo'? '' : new Date(Date.now()-(+per)*864e5).toISOString().slice(0,10);
  return L.filter(function(r){ return (!fm||r.maquina===fm) && (!lim||(r.data||'')>=lim) }) }
function indicadores(){
  var L=filtrar(trocas()), tg=L.filter(function(r){ return r.tiragem>0 }), dd=L.filter(function(r){ return r.dias>0 });
  var nE=L.filter(function(r){ return motivoGrupo(r.motivo)==='Empancamento' }).length, custo=L.reduce(function(s,r){ var a=art(r.codigo); return s+(a&&a.preco? +a.preco*(+r.qtd||1) : 0) },0);
  var kp=A.kpis([{v:fmt(L.reduce(function(s,r){ return s+(+r.qtd||1) },0),0),l:'Cauchos trocados'},{v:tg.length?fmt(media(tg.map(function(r){return r.tiragem})),0):'–',l:'Folhas por caucho (média)'},
    {v:dd.length?fmt(media(dd.map(function(r){return r.dias})),0)+' d':'–',l:'Duração média'},{v:L.length?fmt(nE/L.length*100,0)+'%':'–',l:'Por empancamento',cls:L.length&&nE/L.length>0.3?'warn':'',s:'evitável: folha encravada'},
    {v:custo?fmt(custo,0)+' €':'–',l:'Custo dos cauchos'}]);
  /* máquina × corpo */
  var lin=[]; maqs().filter(function(m){ return !fv('caM','')||m.id===fv('caM','') }).forEach(function(m){ corpos(m.id).forEach(function(p){ var rs=L.filter(function(r){ return r.maquina===m.id && r.corpo===p }); if(!rs.length) return;
    var t=rs.filter(function(r){return r.tiragem>0}).map(function(r){return r.tiragem}), d=rs.filter(function(r){return r.dias>0}).map(function(r){return r.dias});
    lin.push({id:m.id+'|'+p, m:m.nome, p:p, n:rs.length, f:media(t), d:media(d), e:rs.filter(function(r){ return motivoGrupo(r.motivo)==='Empancamento' }).length/rs.length}) }) });
  var fs=lin.filter(function(x){ return x.f!=null }).map(function(x){ return x.f }), fmed=media(fs);
  var porMes={}; L.forEach(function(r){ var k=(r.data||'').slice(0,7); if(k){ porMes[k]=porMes[k]||{E:0,D:0,O:0}; porMes[k][motivoGrupo(r.motivo).charAt(0)]+=(+r.qtd||1) } });
  var meses=Object.keys(porMes).sort().slice(-12);
  var mec=mecanicos().filter(function(x){ return !fv('caM','')||x.maquina===fv('caM','') });
  var Le=L.filter(function(r){ return motivoGrupo(r.motivo)==='Empancamento' }), comC=Le.filter(function(r){ return r.cartolina });
  var conta=function(arr,f){ var o={}; arr.forEach(function(r){ var k=f(r); if(k) o[k]=(o[k]||0)+1 }); return Object.keys(o).map(function(k){ return {l:k, v:o[k]} }).sort(function(a,b){ return b.v-a.v }) };
  var porOF=conta(Le.filter(function(r){ return r.of }),function(r){ var i=window.Qualidade&&Q2.ofInfo? Q2.ofInfo(r.of,r.mm) : {}; return 'OF '+r.of+(i.cliente?' · '+String(i.cliente).slice(0,28):'') }).filter(function(x){ return x.v>1 });
  return kp+
    (mec.length?'<div class="panel cau-mec"><h2>Possível problema mecânico</h2><p class="small muted" style="margin:2px 0 8px">Corpos cujos últimos cauchos (sem contar empancamentos) duram menos de metade da média da máquina.</p>'+
      mec.map(function(x,i){ return '<div class="cau-mec-l"><span><b>'+esc(x.nome)+' · '+esc(x.corpo)+'</b><small>'+fmt(x.v,0)+' folhas por caucho · média da máquina '+fmt(x.ref,0)+' · última troca '+fdate(x.ult)+'</small></span><button class="btn sm" data-mec="'+i+'">Abrir incidência técnica</button></div>' }).join('')+'</div>':'')+
    '<div class="panel"><div class="ph"><h2>Folhas por caucho em cada corpo</h2><span class="small muted">Vermelho: abaixo de 70% da média · os corpos que gastam mais cauchos</span></div>'+
    (lin.length? A.table(lin.sort(function(a,b){ return (a.f==null)-(b.f==null) || (a.f||0)-(b.f||0) }),[{l:'Máquina',v:function(x){ return '<b>'+esc(x.m)+'</b>' }},{l:'Corpo',v:function(x){ return esc(x.p) }},
      {l:'Trocas',n:1,v:function(x){ return x.n }},{l:'Folhas / caucho',n:1,v:function(x){ return x.f==null?'–':'<span style="'+(fmed&&x.f<fmed*0.7?'color:var(--bad);font-weight:700':'')+'">'+fmt(x.f,0)+'</span>' }},
      {l:'Dias / caucho',n:1,v:function(x){ return x.d==null?'–':fmt(x.d,0) }},{l:'Empancamento',n:1,v:function(x){ return '<span class="pill '+(x.e>0.5?'bad':x.e>0.2?'warn':'ok')+'">'+fmt(x.e*100,0)+'%</span>' }}],{max:80}) : '<p class="muted">Ainda sem trocas neste período.</p>')+'</div>'+
    '<div class="grid2" style="margin-top:14px"><div class="panel"><h2>Trocas por mês e motivo</h2><div style="margin-top:10px">'+(meses.length? '<div class="legend"><span><i style="background:var(--bad)"></i>Empancamento</span><span><i style="background:var(--c-imp)"></i>Desgaste</span><span><i style="background:var(--faint)"></i>Outro</span></div>'+
      meses.map(function(k){ var x=porMes[k], t=x.E+x.D+x.O, mx=Math.max.apply(null,meses.map(function(j){ var y=porMes[j]; return y.E+y.D+y.O }));
        return '<div class="cau-mes"><span class="mono small">'+k.slice(5)+'/'+k.slice(2,4)+'</span><span class="cau-stk" style="width:'+Math.round(t/mx*100)+'%"><i style="flex:'+x.E+';background:var(--bad)"></i><i style="flex:'+x.D+';background:var(--c-imp)"></i><i style="flex:'+x.O+';background:var(--faint)"></i></span><b class="mono small">'+t+'</b></div>' }).join('') : '<p class="muted">Sem dados.</p>')+'</div></div>'+
    '<div class="panel"><h2>Empancamentos por cartolina e fornecedor</h2><p class="small muted" style="margin:2px 0 8px">'+Le.length+' empancamentos no período, '+comC.length+' com a cartolina indicada.</p>'+
      (comC.length? '<h3 class="cau-h3">Por fornecedor</h3>'+Charts.hbars({rows:conta(comC,function(r){ return r.fornecedor||'Sem fornecedor' }).slice(0,8),unit:'emp.',color:'var(--bad)'})+
        '<h3 class="cau-h3">Por cartolina</h3>'+Charts.hbars({rows:conta(comC,function(r){ return r.cartolina }).slice(0,10),unit:'emp.',color:'var(--s2)'}) : '<p class="muted">Ainda sem empancamentos com cartolina indicada. Ao registar um empancamento, o operador escolhe a cartolina.</p>')+
      (porOF.length?'<h3 class="cau-h3">OF com mais de um empancamento</h3>'+Charts.hbars({rows:porOF.slice(0,8),unit:'emp.',color:'var(--s7)'}):'')+'</div>'+
    '<div class="panel"><h2>Quem troca e porquê</h2><div style="margin-top:10px">'+(L.length? Charts.hbars({rows:Object.entries(L.reduce(function(o,r){ var k=r.operador||'–'; o[k]=(o[k]||0)+(+r.qtd||1); return o },{})).map(function(e){ return {l:e[0], v:e[1]} }).sort(function(a,b){ return b.v-a.v }).slice(0,12),unit:'trocas',color:'var(--s1)'}) : '<p class="muted">Sem dados.</p>')+'</div></div></div>';
}
function compras(){
  var L=stockL(), inv=ultInv(), difInv=inv? (inv.linhas||[]).reduce(function(t,l){ return t+Math.max(0,(l.antes||0)-(l.contado||0)) },0) : null;
  var rows=L.map(function(s){ var cs=consumoSemanal(s.codigo,8), q=+s.stock||0, mn=s.min!=null? +s.min : 1, cob=cs>0? q/cs : null, sug=Math.max(0, Math.ceil(cs*SEMANAS_ALVO+mn-q));
    return Object.assign({cs:cs, cob:cob, sug:sug, id:s.id}, s) });
  var aComprar=rows.filter(function(r){ return r.sug>0 }), valor=aComprar.reduce(function(t,r){ return t+(r.preco? r.preco*r.sug : 0) },0);
  return A.kpis([{v:aComprar.length,l:'Artigos a encomendar',cls:aComprar.length?'warn':''},{v:valor?fmt(valor,0)+' €':'–',l:'Valor da encomenda sugerida'},
      {v:inv?fdate(inv.data):'nunca',l:'Último inventário',cls:!inv||A.days(inv.data)>7?'warn':'',s:inv?'por '+esc(inv.por||'–'):''},{v:difInv!=null?difInv:'–',l:'Saíram sem registo (último inventário)',cls:difInv?'bad':''}])+
    '<p class="small muted">Sugestão = consumo médio das últimas 8 semanas × '+SEMANAS_ALVO+' semanas + stock mínimo − stock atual.</p>'+
    A.table(rows.sort(function(a,b){ return b.sug-a.sug || (a.cob==null)-(b.cob==null) || (a.cob||0)-(b.cob||0) }),[{l:'Caucho',v:function(r){ return '<b>'+esc(r.medida||r.descricao)+'</b><div class="small muted mono">'+esc(r.codigo)+'</div>' }},
      {l:'Stock',n:1,v:function(r){ return '<span class="pill '+nivelStock(r)+'">'+(+r.stock||0)+'</span>' }},{l:'Mín.',n:1,v:function(r){ return r.min!=null?r.min:'–' }},
      {l:'Consumo / semana',n:1,v:function(r){ return r.cs?fmt(r.cs,1):'–' }},{l:'Cobertura',n:1,v:function(r){ return r.cob==null?'–':'<span style="'+(r.cob<2?'color:var(--bad);font-weight:700':'')+'">'+fmt(r.cob,1)+' sem.</span>' }},
      {l:'Encomendar',n:1,v:function(r){ return r.sug? '<b>'+r.sug+'</b>' : '–' }},{l:'Valor',n:1,v:function(r){ return r.sug&&r.preco? fmt(r.sug*r.preco,0)+' €' : '–' }}],{click:1,empty:'Ainda sem cauchos no supermercado.'});
}

/* ---------- vista ---------- */
A.register('cauchos',{
  html:function(){
    var g=podeGerir(), t=A.tab('ca','trocas'), all=trocas(), L=stockL(), fm=fv('caM',''), ms=maqs().map(function(m){ return [m.id,m.nome] });
    var baixos=L.filter(function(s){ return nivelStock(s)!=='ok' }), inv=ultInv(), hoje7=all.filter(function(r){ return A.days(r.data)<=7 }).length;
    var head=A.head({c:C,mod:'Impressão',title:'Cauchos',p:'Troca de cauchos junto à máquina, supermercado do armário e quanto dura cada caucho em cada corpo.',
      acts:(g?'<button class="btn" id="caInv">Inventário</button><button class="btn" id="caEnt">Entrada</button>':'')+'<button class="btn primary" id="caNew">Trocar caucho</button>'});
    var kp=A.kpis([{v:hoje7,l:'Trocas nos últimos 7 dias'},{v:L.reduce(function(s,x){ return s+(+x.stock||0) },0),l:'Cauchos no armário'},{v:baixos.length,l:'Artigos em falta ou no mínimo',cls:baixos.some(function(s){return nivelStock(s)==='bad'})?'bad':baixos.length?'warn':''},
      {v:inv?'há '+A.days(inv.data)+' d':'nunca',l:'Último inventário',cls:!inv||A.days(inv.data)>7?'warn':''}]);
    var tabs=A.tabs('ca',[['trocas','Trocas'],['super','Supermercado'+(baixos.length?' ('+baixos.length+')':'')],['ind','Indicadores']].concat(g?[['comp','Compras']]:[]),t);
    var filtros='<div class="filters"><select data-f="caM">'+selOpts(ms,fm,'Todas as máquinas')+'</select>'+(t==='ind'?'<select data-f="caP">'+selOpts([['90','Últimos 90 dias'],['365','Últimos 12 meses'],['tudo','Tudo']],fv('caP','365'))+'</select>':'')+'</div>';
    var body='';
    if(t==='trocas'){
      body=filtros+A.table(all.filter(function(r){ return !fm||r.maquina===fm }).slice(0,300),[{l:'Data',v:function(r){ return fdate(r.data)+(r.hora?' <span class="small muted mono">'+esc(r.hora)+'</span>':'') }},{l:'Máquina',v:function(r){ return esc(A.mName(r.maquina)) }},{l:'Corpo',v:function(r){ return esc(r.corpo||'–') }},
        {l:'Caucho',v:function(r){ return esc(r.ref||r.codigo||r.mm||'–') }},{l:'Motivo',v:function(r){ var gr=motivoGrupo(r.motivo); return '<span class="pill '+(gr==='Empancamento'?'bad':gr==='Desgaste'?'ok':'mute')+'">'+esc(r.motivo||'–')+'</span>' }},
        {l:'Folhas',n:1,v:function(r){ return r.tiragem!=null?fmt(r.tiragem,0):'–' }},{l:'Dias',n:1,v:function(r){ return r.dias!=null?r.dias:'–' }},{l:'Operador',v:function(r){ return esc(r.operador||'–') }}],{click:1,empty:'Ainda sem trocas. Carrega em “Trocar caucho” (ou no modo posto da máquina).'});
    } else if(t==='super'){
      var mn=fm? A.mName(fm) : '';
      var V=L.filter(function(s){ return !mn || !s.maquinas || A.norm(s.maquinas).indexOf(A.norm(mn))>=0 });
      body=filtros+(g?'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn sm" id="caImp">Carregar lista do armário</button><button class="btn sm" id="caArt">+ Caucho</button></div>':'')+
        (V.length? '<div class="cau-super">'+V.map(function(s){ var nv=nivelStock(s); return '<button class="cau-it '+nv+'" data-art="'+esc(s.id)+'"><b class="q">'+(+s.stock||0)+'</b><span><b>'+esc(s.medida||s.descricao)+'</b><small>'+esc(s.medida&&s.descricao?s.descricao:'')+'</small><small class="mono">'+esc(s.codigo)+(s.local?' · '+esc(s.local):'')+'</small></span>'+
          '<span class="pill '+nv+'">'+(nv==='bad'?'Esgotado':nv==='warn'?'No mínimo':'Disponível')+'</span></button>' }).join('')+'</div>'
          : '<div class="panel empty">Ainda não há cauchos no supermercado.'+(g?' Use “Carregar lista do armário” com o ficheiro do material.':' O responsável do stock vai carregar a lista.')+'</div>');
    } else if(t==='ind') body=filtros+indicadores();
    else body=compras();
    return head+kp+tabs+body;
  },
  bind:function(r){
    $('caNew').onclick=function(){ trocar(fv('caM','')) };
    if($('caInv')) $('caInv').onclick=inventario; if($('caEnt')) $('caEnt').onclick=entrada; if($('caImp')) $('caImp').onclick=importar; if($('caArt')) $('caArt').onclick=function(){ artForm() };
    r.querySelectorAll('[data-art]').forEach(function(b){ b.onclick=function(){ var s=A.get('cau_stock',b.dataset.art); if(podeGerir()) artForm(s); else A.toast((s.medida||s.descricao)+': '+(+s.stock||0)+' no armário'+(s.local?' ('+s.local+')':'')+'.') } });
    var t=A.tab('ca','trocas'); if(t==='trocas') A.bindRows(r,detalhe);
    r.querySelectorAll('[data-mec]').forEach(function(b){ b.onclick=function(){ var x=mecanicos().filter(function(y){ return !fv('caM','')||y.maquina===fv('caM','') })[+b.dataset.mec]; if(x) abrirInc(x) } }); if(t==='comp') A.bindRows(r,function(id){ artForm(A.get('cau_stock',id)) });
    bindFilters(r); if(window.Charts&&Charts.bind) Charts.bind(r);
  }
});
function detalhe(id){
  var r=A.get('cauchos_req',id); if(!r) return;
  A.showModal('<h2><span class="mono">'+esc(r.numero||'')+'</span> · '+esc(A.mName(r.maquina))+' · '+esc(r.corpo||'')+'</h2><dl class="detail">'+
    [['Data',fdate(r.data)+(r.hora?' '+r.hora:'')],['Caucho',[r.ref,r.codigo||r.mm].filter(Boolean).join(' · ')],['Motivo',r.motivo],['Folhas do que saiu',r.tiragem!=null?fmt(r.tiragem,0):'–'],['Dias de vida',r.dias!=null?r.dias:'–'],
     ['Contador',r.contador!=null?fmt(r.contador,0)+(r.contAnt!=null?' (anterior '+fmt(r.contAnt,0)+')':''):'–'],['Operador',r.operador],['OF em produção',r.of],['Cartolina',[r.cartolina,r.fornecedor].filter(Boolean).join(' · ')],['Estado',r.estado]].map(function(x){ return '<div><dt>'+x[0]+'</dt><dd>'+esc(x[1]==null||x[1]===''?'–':x[1])+'</dd></div>' }).join('')+
    (r.obs?'<div class="full"><dt>Observações</dt><dd>'+esc(r.obs)+'</dd></div>':'')+'</dl><div class="foot"><button class="btn" id="caX">Fechar</button>'+(podeGerir()?'<button class="btn" id="caE">Corrigir</button>':'')+'</div>',
  function(){ $('caX').onclick=A.closeModal; if($('caE')) $('caE').onclick=function(){
    A.openForm({title:'Corrigir '+(r.numero||''), values:r, fields:[{k:'contador',l:'Contador',t:'number'},{k:'tiragem',l:'Folhas do caucho que saiu',t:'number'},{k:'dias',l:'Dias de vida',t:'number'},{k:'motivo',l:'Motivo',t:'select',o:MOTIVOS.map(function(m){return m[0]}).concat(r.motivo&&!MOTIVOS.some(function(m){return m[0]===r.motivo})?[r.motivo]:[])},{k:'operador',l:'Operador'},{k:'obs',l:'Observações',t:'textarea',rows:2}],
      del:function(){ return A.del('cauchos_req',r.id) },
      submit:function(x){ var n=Object.assign({},A.clean(r),x); Object.keys(n).forEach(function(k){ if(n[k]===''||n[k]==null) delete n[k] }); return A.put('cauchos_req',r.id,n) }}) } });
}
/* alertas: stock em falta e inventário atrasado (só para quem gere o stock) */
var ex0=A.alertasExtra;
A.alertasExtra=function(add){ if(ex0) ex0(add);
  if(podeGerir() || A.can('tecnico') || ['gestor','master'].indexOf(S.nivel)>=0) mecanicos().forEach(function(x){ add('warn','Manutenção','Cauchos do '+x.corpo+' da '+x.nome+' duram '+fmt(x.v,0)+' folhas (média '+fmt(x.ref,0)+'): possível problema mecânico','#cauchos','caumec|'+x.maquina+'|'+x.corpo+'|'+x.ult) });
  if(!podeGerir()) return;
  stockL().filter(function(s){ return nivelStock(s)==='bad' }).forEach(function(s){ add('bad','Cauchos','Esgotado no armário: '+(s.medida||s.descricao)+' ('+s.codigo+')','#cauchos','cau0|'+s.codigo+'|'+(s.ultEntrada||'')) });
  var inv=ultInv(); if(stockL().length && (!inv || A.days(inv.data)>7)) add('warn','Cauchos','Inventário semanal do armário de cauchos em atraso'+(inv?' (último há '+A.days(inv.data)+' dias)':''),'#cauchos','cauinv|'+(inv?inv.data:'')) };
/* modo posto: "Trocar caucho" abre já com a máquina */
I.cauchoMontar=function(mid){ trocar(mid) };
I.cauchoDetalhe=function(){};
window.Cauchos={pedir:trocar, trocar:trocar};
})();
