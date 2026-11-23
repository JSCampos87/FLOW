/* Página da OF (#of-1216075) e do MM (#mm-8000041818): junta num só sítio tudo o que o FLOW sabe sobre
   uma ordem de fabrico — produção e OEE, paragens, cauchos, águas do dia, verniz, intervenções,
   FII/FIQ, entregas e specs de embalamento. Pesquisa pelo botão 🔍 do cabeçalho. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao, Q=window.Qualidade;
var C='var(--brand)';
function P(){ return window.Producao }
function same(a,b){ return String(a||'').replace(/^A/i,'').trim()===String(b||'').replace(/^A/i,'').trim() && String(a||'').trim()!=='' }
function sapMM(mm){ var s=(S.hist.sap||[]).filter(function(x){return x.mm===String(mm)})[0]; var e=window.Embalamento&&Embalamento.specs? Embalamento.specs()[String(mm)] : null; return Object.assign({}, s||{}, e||{}) }
function mapaRows(){ var r=[]; if(window.Embalamento&&Embalamento.mapas) Embalamento.mapas().forEach(function(m){ m.linhas.forEach(function(l){ r.push(Object.assign({mapa:m.nome},l)) }) }); return r }

/* ---------- pesquisa (botão do cabeçalho) ---------- */
function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v? JSON.parse(v) : d }catch(e){ return d } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){} }
function abrir(txt){ txt=String(txt||'').trim(); if(!txt) return; var mm=/^8\d{9}$/.test(txt)||/^3\d{9}$/.test(txt);
  var r=lsGet('flow_of_rec',[]).filter(function(x){return x!==txt}); r.unshift(txt); lsSet('flow_of_rec',r.slice(0,8));
  location.hash=(mm?'mm-':'of-')+encodeURIComponent(txt) }
function pesquisa(){
  var rec=lsGet('flow_of_rec',[]);
  A.showModal('<h2>Abrir OF ou MM</h2><p class="muted" style="margin:-6px 0 0">Escreva o n.º da ordem de fabrico (ex.: 1216075) ou o código MM (8000…).</p>'+
    '<input id="ofIn" class="bigin" inputmode="numeric" autocomplete="off" placeholder="OF ou MM">'+
    (rec.length?'<div style="display:flex;gap:6px;flex-wrap:wrap"><span class="small muted" style="align-self:center">Recentes:</span>'+rec.map(function(x){return '<button class="btn sm" data-rec="'+esc(x)+'">'+esc(x)+'</button>'}).join('')+'</div>':'')+
    '<div class="foot"><button class="btn" id="ofX">Cancelar</button><button class="btn primary" id="ofGo">Abrir</button></div>',
    function(){ var i=$('ofIn'); i.focus(); var go=function(v){ A.closeModal(); abrir(v) };
      $('ofGo').onclick=function(){ go(i.value) }; $('ofX').onclick=A.closeModal; i.onkeydown=function(e){ if(e.key==='Enter') go(i.value) };
      document.querySelectorAll('[data-rec]').forEach(function(b){ b.onclick=function(){ go(b.dataset.rec) } }) });
}
document.addEventListener('click',function(e){ if(e.target.closest('#ofBtn')) pesquisa() });
document.addEventListener('keydown',function(e){ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); pesquisa() } });

/* ---------- recolha de eventos ---------- */
function eventos(of){
  var ev=[], add=function(d,c,t,txt,href){ ev.push({d:String(d||''),c:c,t:t,txt:txt,href:href}) };
  var prod=A.list('producao').filter(function(r){return same(r.of,of)});
  prod.forEach(function(r){ var o=P().oee(r); add(r.inicio,'var(--c-imp)','Produção · '+A.mName(r.maquina), (r.operador?r.operador+' · ':'')+fmt(r.qtdBoa||0,0)+' '+(r.unidade||'')+' boas'+(r.qtdDesperdicio?' · '+fmt(r.qtdDesperdicio,0)+' desperdício':'')+' · OEE '+P().pct(o.oee)+(P().paragensMin(r)?' · paragens '+P().hm(P().paragensMin(r)):''), '#producao-imp');
    (r.paragens||[]).forEach(function(p){ if(p.ini) add(p.ini,'var(--warn)','Paragem · '+A.mName(r.maquina), p.motivo+' · '+P().hm(p.min!=null?p.min:P().mins(p.ini,p.fim))) }) });
  var inc=Q.incList().filter(function(i){return same(i.of,of)});
  inc.forEach(function(i){ add(Q.incDate(i),i.tipo==='FIQ'?'var(--bad)':'var(--warn)',i.tipo+' '+i.numero, (i.defeito||'')+(i.setorOrigem?' · origem '+i.setorOrigem:'')+(i.maqOrigem?' / '+i.maqOrigem:'')+(i.custo?' · '+fmt(i.custo,0)+' €':''), '#incidencias') });
  A.list('cauchos').forEach(function(c){ if(c.montagem&&same(c.montagem.of,of)) add(c.montagem.d,'var(--c-imp)','Caucho montado · '+c.codigo, A.mName(c.maquina)+' · '+(c.posicao||'')) });
  A.list('verniz').forEach(function(v){ (v.movs||[]).forEach(function(m){ if(same(m.of,of)) add(m.d,'var(--c-imp)','Verniz usado · '+v.referencia, fmt(m.kg,1)+' kg'+(m.maquina?' · '+A.mName(m.maquina):'')) }) });
  A.list('intervencoes').forEach(function(i){ if(same(i.of,of)) add(i.data,'var(--c-man)','Intervenção · '+A.mName(i.maquina), i.tipo+' · '+(i.descricao||'').slice(0,80)) });
  var ent=mapaRows().filter(function(l){return same(l.of,of)});
  ent.forEach(function(l){ add(l.data,'var(--c-emb)','Entrega prevista', (l.cliente||'')+' · '+fmt(l.qtd||0,0)+' un.'+(l.obs?' · '+l.obs:''), '#cargas') });
  /* águas: leituras das máquinas onde a OF passou, nos dias em que passou */
  var dias={}; prod.forEach(function(r){ if(r.maquina) dias[String(r.inicio||r.data).slice(0,10)+'|'+r.maquina]=1 });
  I.leituras().forEach(function(l){ if(!dias[l.data+'|'+l.ponto]) return; var fora=['alcool','cond','ph'].filter(function(p){ return l[p]!=null && I.outL(l.ponto,p,l[p]) });
    add(l.data,fora.length?'var(--bad)':'var(--ok)','Água · '+A.mName(l.ponto), ['alcool','cond','ph'].filter(function(p){return l[p]!=null}).map(function(p){ return I.PAR[p].l+' '+fmt(l[p],I.PAR[p].dec) }).join(' · ')+(fora.length?' — fora do limite':''), '#aguas') });
  ev.sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0 });
  return {ev:ev, prod:prod, inc:inc, ent:ent};
}
function timeline(ev){ return ev.length? '<div class="tl">'+ev.map(function(e){ return '<div class="tl-i" style="--c:'+e.c+'"><i></i><div><div class="tl-h"><span class="tl-d">'+esc(e.d.slice(0,16).replace('T',' '))+'</span><b>'+(e.href?'<a href="'+e.href+'" style="color:inherit">'+esc(e.t)+'</a>':esc(e.t))+'</b></div><p>'+esc(e.txt)+'</p></div></div>' }).join('')+'</div>' : '<div class="cht-empty">Ainda não há registos desta OF no FLOW.</div>' }
function specBox(mm){
  var s=sapMM(mm); if(!s.mm&&!s.descricao) return '<p class="muted small">MM sem specs na biblioteca.</p>';
  var kv=[['Descrição',s.descricao],['Cortante',s.cortante],['Maços por base',s.macosBase],['Maços por altura',s.camadas],['Unidades por palete',s.unPalete],['Altura da palete',s.alturaPalete?s.alturaPalete+' mm':''],['Cantoneiras',s.cantoneiras===true?'Sim':s.cantoneiras===false?'Não':''],['Tampo',s.tampo?'Sim':''],['Filme',s.filme]];
  return '<dl class="detail">'+kv.filter(function(x){return x[1]!=null&&x[1]!==''}).map(function(x){return '<div><dt>'+x[0]+'</dt><dd>'+esc(x[1])+'</dd></div>'}).join('')+'</dl>';
}

/* ---------- vista OF ---------- */
A.registerPrefix('of-',{
  html:function(){
    var of=A.routeArg(), E=eventos(of);
    var mm=(E.prod[0]||{}).mm||(E.inc[0]||{}).mm||(E.ent[0]||{}).mm||'', cli=(E.inc[0]||{}).cliente||(E.ent[0]||{}).cliente||'', art=(E.inc[0]||{}).artigo||(sapMM(mm).descricao)||'';
    var boa=E.prod.reduce(function(s,r){return s+(+r.qtdBoa||0)},0), desp=E.prod.reduce(function(s,r){return s+(+r.qtdDesperdicio||0)},0);
    var os=E.prod.map(P().oee).filter(function(o){return o.oee!=null}), custo=E.inc.reduce(function(s,i){return s+(i.custo||0)},0);
    var maqs=Array.from(new Set(E.prod.map(function(r){return A.mName(r.maquina)})));
    return '<section class="shero" style="--c:var(--brand)"><span class="ico lg" style="--c:var(--brand)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6M9 13h8M9 17h6"/></svg></span>'+
      '<div><div class="eyebrow" style="font:600 11px var(--f-mono);letter-spacing:.08em;color:var(--muted)">ORDEM DE FABRICO</div><h1 class="mono">'+esc(of)+'</h1><p>'+esc([cli,art].filter(Boolean).join(' · ')||'Sem dados de cliente')+(mm?' · <a href="#mm-'+encodeURIComponent(mm)+'" class="mono">MM '+esc(mm)+'</a>':'')+'</p></div>'+
      '<div class="acts"><button class="btn" id="ofOutra">Outra OF</button></div></section>'+
      A.kpis([{v:fmt(boa,0),l:'Quantidade boa produzida',s:maqs.join(' · ')},{v:fmt(desp,0),l:'Desperdício',s:boa+desp?fmt(desp/(boa+desp)*100,1)+'%':''},{v:os.length?P().pct(A.mean(os.map(function(o){return o.oee}))):'–',l:'OEE médio'},
        {v:E.inc.length,l:'FII / FIQ',cls:E.inc.some(function(i){return i.tipo==='FIQ'})?'bad':E.inc.length?'warn':''},{v:custo?fmt(custo,0)+' €':'–',l:'Custo da não-qualidade'}])+
      '<div class="grid2"><div class="panel"><h2 style="margin-bottom:10px">Linha do tempo</h2>'+timeline(E.ev)+'</div>'+
      '<div class="stack"><div class="panel"><h2 style="margin-bottom:8px">Specs do MM</h2>'+(mm?specBox(mm):'<p class="muted small">MM desconhecido.</p>')+'</div>'+
      (E.inc.length?'<div class="panel"><h2 style="margin-bottom:8px">Incidências</h2>'+A.table(E.inc,[{l:'N.º',v:function(i){return Q.tipoPill(i.tipo)+' <span class="mono">'+esc(i.numero)+'</span>'}},{l:'Defeito',v:function(i){return esc(i.defeito||'–')}},{l:'Estado',v:function(i){return Q.estPill(i.estado)}}],{click:1})+'</div>':'')+
      (E.ent.length?'<div class="panel"><h2 style="margin-bottom:8px">Entregas</h2>'+A.table(E.ent.map(function(l,i){l.id='e'+i;return l}),[{l:'Data',v:function(l){return fdate(l.data)}},{l:'Cliente',v:function(l){return esc(l.cliente||'–')}},{l:'Qtd',n:1,v:function(l){return fmt(l.qtd||0,0)}}])+'</div>':'')+
      '</div></div>';
  },
  bind:function(r){ $('ofOutra').onclick=pesquisa; A.bindRows(r,function(id){ if(Q.incDetalhe) Q.incDetalhe(id) }) }
});

/* ---------- vista MM ---------- */
A.registerPrefix('mm-',{
  html:function(){
    var mm=A.routeArg(), s=sapMM(mm), ofs={};
    A.list('producao').forEach(function(r){ if(String(r.mm)===mm&&r.of) (ofs[r.of]=ofs[r.of]||{of:r.of,d:r.data,src:[]}).src.push('produção') });
    Q.incList().forEach(function(i){ if(String(i.mm)===mm&&i.of) (ofs[i.of]=ofs[i.of]||{of:i.of,d:Q.incDate(i),src:[]}).src.push(i.tipo) });
    mapaRows().forEach(function(l){ if(String(l.mm)===mm&&l.of) (ofs[l.of]=ofs[l.of]||{of:l.of,d:l.data,src:[]}).src.push('entrega') });
    var L=Object.keys(ofs).map(function(k){var x=ofs[k]; x.id=k; return x}).sort(function(a,b){return (b.d||'')<(a.d||'')?-1:1});
    var inc=Q.incList().filter(function(i){return String(i.mm)===mm});
    return '<section class="shero" style="--c:var(--c-emb)">'+A.ico('embalamento','lg')+'<div><div class="eyebrow" style="font:600 11px var(--f-mono);letter-spacing:.08em;color:var(--muted)">MATERIAL</div><h1 class="mono">'+esc(mm)+'</h1><p>'+esc(s.descricao||'Sem descrição')+'</p></div><div class="acts"><button class="btn" id="mmOutro">Outro</button></div></section>'+
      A.kpis([{v:L.length,l:'OF conhecidas'},{v:inc.filter(function(i){return i.tipo==='FII'}).length,l:'FII'},{v:inc.filter(function(i){return i.tipo==='FIQ'}).length,l:'FIQ',cls:inc.some(function(i){return i.tipo==='FIQ'})?'bad':''},{v:fmt(inc.reduce(function(a,i){return a+(i.custo||0)},0),0)+' €',l:'Custo da não-qualidade'}])+
      '<div class="grid2"><div class="panel"><h2 style="margin-bottom:8px">Specs</h2>'+specBox(mm)+'</div><div class="panel"><h2 style="margin-bottom:8px">Ordens de fabrico</h2>'+
      A.table(L,[{l:'OF',v:function(x){return '<a class="mono" href="#of-'+encodeURIComponent(x.of)+'">'+esc(x.of)+'</a>'}},{l:'Data',v:function(x){return fdate(x.d)}},{l:'Onde aparece',v:function(x){return esc(Array.from(new Set(x.src)).join(', '))}}],{empty:'Sem OF registadas para este MM.'})+'</div></div>';
  },
  bind:function(){ $('mmOutro').onclick=pesquisa }
});

/* ---------- atalho para o caucho (etiqueta QR) ---------- */
A.registerPrefix('caucho-',{
  html:function(){ return '<div class="panel empty">A abrir o caucho…</div>' },
  bind:function(){ var cod=A.routeArg(), c=A.list('cauchos').filter(function(x){return x.codigo===cod})[0];
    setTimeout(function(){ location.hash='cauchos'; if(c) setTimeout(function(){ I.cauchoDetalhe(c.id) },150); else A.toast('Caucho '+cod+' não encontrado.') },50) }
});
window.OF={abrir:abrir, pesquisa:pesquisa, eventos:eventos};
})();
