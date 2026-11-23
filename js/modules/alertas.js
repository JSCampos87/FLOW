/* Alertas: o FLOW avisa em vez de alguém ter de ir ver. Calculados no browser a partir dos dados;
   o sino do cabeçalho mostra quantos há. Os limites ajustam-se na própria página (#alertas).
   Envio para o Teams / e-mail: precisa de uma função no servidor (ver docs/ALERTAS.md). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao, Q=window.Qualidade;
var DEF={fiqDias:15, rfDias:30, cauchoDias:90, aguaDias:7, prodHoras:12, paragemMin:60};
function L(){ return Object.assign({}, DEF, A.cfg('alertas')) }
function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v? JSON.parse(v) : d }catch(e){ return d } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){} }

function calcular(){
  var l=L(), out=[], add=function(nivel, grupo, txt, href, id){ out.push({nivel:nivel, grupo:grupo, txt:txt, href:href, id:id||(grupo+'|'+txt)}) };
  /* produção */
  A.list('producao').filter(function(r){return r.estado==='aberta'}).forEach(function(r){
    var h=(Date.now()-Date.parse(r.inicio))/3600e3; if(h>l.prodHoras) add('warn','Produção','OF '+r.of+' na '+A.mName(r.maquina)+' aberta há '+fmt(h,0)+' h — esqueceram-se de terminar?','#posto-'+encodeURIComponent(r.maquina));
    (r.paragens||[]).forEach(function(p){ if(p.ini&&!p.fim){ var m=(Date.now()-Date.parse(p.ini))/60000; if(m>l.paragemMin) add('bad','Produção',A.mName(r.maquina)+' parada há '+fmt(m,0)+' min ('+p.motivo+')','#posto-'+encodeURIComponent(r.maquina)) } }) });
  /* qualidade */
  /* muitos casos do mesmo tipo juntam-se num só alerta (para o sino não ficar inútil) */
  var juntar=function(lista, nivel, grupo, um, muitos, href){ if(lista.length>5) add(nivel,grupo,muitos(lista.length),href,grupo+'|'+href+'|'+lista.length); else lista.forEach(function(x){ add(nivel,grupo,um(x),href) }) };
  if(Q && S.hist.ok){ var fq=Q.incList().filter(function(i){ return i.tipo==='FIQ' && i.estado!=='Fechada' && i.estado!=='Registada' && A.days(i.dataReclamacao||i.dataIncidencia)>l.fiqDias });
    juntar(fq,'bad','Qualidade',function(i){ return i.numero+' ('+(i.cliente||'cliente')+') em aberto há '+A.days(i.dataReclamacao||i.dataIncidencia)+' dias' },function(n){ return n+' FIQ em aberto há mais de '+l.fiqDias+' dias' },'#incidencias') }
  if(window.Fornecedores && S.hist.ok){ var rf=Fornecedores.rfList().filter(function(r){ var d=A.days(r.data); return r.estado!=='Fechada' && d>l.rfDias && d<400 });
    juntar(rf,'warn','Qualidade',function(r){ return 'Reclamação '+r.numero+' a '+r.fornecedor+' em aberto há '+A.days(r.data)+' dias' },function(n){ return n+' reclamações a fornecedores em aberto há mais de '+l.rfDias+' dias' },'#fornecedores') }
  /* intervenções vencidas (última de cada tipo por máquina) */
  var last={}; A.list('intervencoes').slice().sort(A.by('data',-1)).forEach(function(i){ var k=i.maquina+'|'+i.tipo; if(!last[k]) last[k]=i });
  Object.keys(last).forEach(function(k){ var i=last[k]; if(i.proxima && i.proxima<A.today()) add('warn','Manutenção',i.tipo+' na '+A.mName(i.maquina)+' prevista para '+fdate(i.proxima),(i.setor==='Corte e Vinco'?'#intervencoes-cv':'#intervencoes')) });
  /* águas */
  if(I){ var ult={}; I.leituras().forEach(function(r){ if(!ult[r.ponto]||r.data>ult[r.ponto].data) ult[r.ponto]=r });
    I.pontos().forEach(function(p){ var r=ult[p.id]; if(!r){ return }
      var fora=p.pars.filter(function(par){ return r[par]!=null && I.outL(p.id,par,r[par]) }); if(fora.length) add('bad','Impressão','Água da '+p.nome+' fora do limite ('+fora.map(function(x){return I.PAR[x].l}).join(', ')+') na última medição, '+fdate(r.data),'#aguas');
      var d=A.days(r.data); if(d>l.aguaDias) add('warn','Impressão','Sem medição de água da '+p.nome+' há '+d+' dias','#aguas') }) }
  /* cauchos e verniz */
  A.list('cauchos').forEach(function(c){ if(c.estado==='montado'&&c.montagem){ var d=A.days(c.montagem.d); if(d>l.cauchoDias) add('warn','Impressão','Caucho '+c.codigo+' montado há '+d+' dias na '+A.mName(c.maquina)+' ('+c.posicao+')','#cauchos') } });
  A.list('verniz').forEach(function(v){ if(v.estado!=='esgotado'&&v.validade&&v.validade<A.today()) add('warn','Impressão','Reserva de verniz '+v.referencia+' expirada ('+fdate(v.validade)+')','#verniz') });
  /* dados mestre */
  if(window.Mestre && S.hist.ok && A.list('maquinas').length){ var sem=Mestre.usados('maquina').filter(function(u){ return !Mestre.known('maquina',u.v) }).length; if(sem) add('info','Dados',sem+' nomes de máquina nos registos sem correspondência nos dados mestre','#qualidade-dados') }
  var vistos=lsGet('flow_alertas_vistos',{}); out.forEach(function(a){ a.visto=!!vistos[a.id] });
  return out;
}
function badge(){ var n=calcular().filter(function(a){return !a.visto && a.nivel!=='info'}).length, b=$('bellN'); if(!b) return; b.hidden=!n; b.textContent=n>99?'99+':n; $('bell').classList.toggle('on',S.route==='alertas') }
A.onNav=function(){ clearTimeout(badge.t); badge.t=setTimeout(badge,300) };
setInterval(badge,60000);

A.register('alertas',{
  html:function(){
    var al=calcular(), l=L(), grupos={}; al.forEach(function(a){ (grupos[a.grupo]=grupos[a.grupo]||[]).push(a) });
    var ic={bad:'<span class="pill bad">Urgente</span>',warn:'<span class="pill warn">Atenção</span>',info:'<span class="pill info">Info</span>'};
    return A.head({c:'var(--bad)',mod:'FLOW',title:'Alertas',p:'Situações que precisam de alguém: OF esquecidas, máquinas paradas, reclamações em atraso, águas fora do limite, intervenções vencidas.',
        acts:'<button class="btn" id="alLim">Limites</button>'+(al.some(function(a){return !a.visto})?'<button class="btn primary" id="alVer">Marcar todos como vistos</button>':'')})+
      A.kpis([{v:al.filter(function(a){return a.nivel==='bad'}).length,l:'Urgentes',cls:al.some(function(a){return a.nivel==='bad'})?'bad':''},{v:al.filter(function(a){return a.nivel==='warn'}).length,l:'Atenção',cls:al.some(function(a){return a.nivel==='warn'})?'warn':''},{v:al.filter(function(a){return !a.visto}).length,l:'Por ver'}])+
      (al.length? Object.keys(grupos).map(function(g){ return '<div class="panel" style="margin-bottom:12px"><h2 style="margin-bottom:8px">'+esc(g)+'</h2>'+grupos[g].sort(function(a,b){return (a.nivel==='bad'?0:1)-(b.nivel==='bad'?0:1)}).map(function(a){
          return '<a href="'+a.href+'" style="display:flex;gap:10px;align-items:center;padding:9px 6px;border-top:1px solid var(--line);color:inherit;text-decoration:none;'+(a.visto?'opacity:.55':'')+'">'+ic[a.nivel]+'<span style="flex:1">'+esc(a.txt)+'</span><span class="muted">→</span></a>' }).join('')+'</div>' }).join('')
        : '<div class="panel empty"><b style="display:block;font-family:var(--f-display);font-size:20px;color:var(--fg)">Tudo em ordem</b>Não há alertas neste momento.</div>')+
      '<p class="small muted">Limites atuais: FIQ em aberto > '+l.fiqDias+' dias · reclamação a fornecedor > '+l.rfDias+' dias · caucho montado > '+l.cauchoDias+' dias · sem medição de água > '+l.aguaDias+' dias · OF aberta > '+l.prodHoras+' h · paragem > '+l.paragemMin+' min.</p>';
  },
  bind:function(){
    if($('alVer')) $('alVer').onclick=function(){ var v={}; calcular().forEach(function(a){ v[a.id]=1 }); lsSet('flow_alertas_vistos',v); A.render(); badge() };
    $('alLim').onclick=function(){ var l=L();
      A.openForm({title:'Limites dos alertas', values:l, fields:[{k:'fiqDias',l:'FIQ em aberto há mais de (dias)',t:'number'},{k:'rfDias',l:'Reclamação a fornecedor em aberto (dias)',t:'number'},{k:'cauchoDias',l:'Caucho montado há mais de (dias)',t:'number'},
        {k:'aguaDias',l:'Sem medição de água há mais de (dias)',t:'number'},{k:'prodHoras',l:'OF aberta há mais de (horas)',t:'number'},{k:'paragemMin',l:'Paragem em curso há mais de (min)',t:'number'}],
        submit:function(x){ var o={}; Object.keys(DEF).forEach(function(k){ o[k]=x[k]||DEF[k] }); return A.put('config','alertas',o) }}) };
    badge();
  }
});
window.Alertas={calcular:calcular, badge:badge};
})();
