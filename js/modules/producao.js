/* Produção e OEE: registo por máquina e OF (início/fim, quantidades boas e desperdício, paragens com motivo).
   OEE = Disponibilidade × Performance × Qualidade. Os painéis de indicadores ficam para o módulo de Indicadores;
   aqui só os registos e o resumo por máquina. Também usado pelo modo posto (posto.js). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao;
var fv=I.fv, selOpts=I.selOpts, bindFilters=I.bindFilters;
var MOTIVOS_DEF=['Afinação / arranque','Mudança de trabalho','Avaria mecânica','Avaria elétrica','Falta de material','Falta de operador','Limpeza','Manutenção preventiva','Ajustes de qualidade','Pausa / refeição','Outro'];
var TURNOS=['Turno 1 (06–14)','Turno 2 (14–22)','Turno 3 (22–06)'];

function motivos(setor){ var c=(A.cfg('motivosParagem').setores||{})[setor]; return c&&c.length? c : MOTIVOS_DEF }
function turnoDe(d){ var h=(d||new Date()).getHours(); return h>=6&&h<14? TURNOS[0] : h>=14&&h<22? TURNOS[1] : TURNOS[2] }
function mins(a,b){ if(!a) return 0; var t1=Date.parse(a), t2=b? Date.parse(b) : Date.now(); return Math.max(0,(t2-t1)/60000) }
function paragensMin(r){ return (r.paragens||[]).reduce(function(s,p){ return s+(p.min!=null? p.min : mins(p.ini,p.fim)) },0) }
function maq(id){ return A.get('maquinas',id) || A.list('maquinas').filter(function(m){ return m.nome===id })[0] || {} }
/* OEE de um registo. velNominal em unidades por hora. */
function oee(r){
  var plan=mins(r.inicio, r.fim||(r.estado==='aberta'?null:r.inicio)), par=Math.min(plan,paragensMin(r)), op=Math.max(0,plan-par);
  var boa=+r.qtdBoa||0, desp=+r.qtdDesperdicio||0, tot=boa+desp, vel=+r.velNominal||+maq(r.maquina).velocidade||0;
  var D=plan? op/plan : null, P=vel&&op? Math.min(1, tot/(vel*op/60)) : null, Q=tot? boa/tot : null;
  return {plan:plan, par:par, op:op, D:D, P:P, Q:Q, oee:(D!=null&&P!=null&&Q!=null)? D*P*Q : null, vel:vel};
}
function pct(x){ return x==null? '–' : fmt(x*100,0)+'%' }
function oeeSpan(x){ return x==null? '<span class="muted">–</span>' : '<span class="oee '+(x>=0.65?'ok':x>=0.45?'warn':'bad')+'">'+pct(x)+'</span>' }
function hm(m){ m=Math.round(m||0); var h=Math.floor(m/60); return (h?h+' h ':'')+(m%60)+' min' }
function dtLocal(iso){ if(!iso) return ''; var d=new Date(iso); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16) }
function fromLocal(v){ return v? new Date(v).toISOString() : '' }

/* formulário completo (escritório / correções) */
function prodForm(v, setor, pre){
  var edit=!!(v&&v.id), r=Object.assign({data:A.today(), turno:turnoDe(), unidade:'folhas', paragens:[]}, pre||{}, v||{});
  var ops=A.operadores(setor).map(function(o){return o.nome}), mq=A.maquinas(setor);
  var parHtml=function(){ return '<div class="sep">Paragens</div><div id="parL" style="display:grid;gap:6px">'+(r.paragens||[]).map(parRow).join('')+'</div><button type="button" class="btn sm" id="parAdd" style="margin-top:6px">+ Paragem</button>' };
  function parRow(p){ return '<div class="pr" style="display:grid;grid-template-columns:1fr 110px 36px;gap:6px"><select class="prM">'+motivos(setor).map(function(m){return '<option'+(m===p.motivo?' selected':'')+'>'+esc(m)+'</option>'}).join('')+'</select><input class="prN" inputmode="numeric" placeholder="min" value="'+(p.min!=null?p.min:Math.round(mins(p.ini,p.fim))||'')+'"><button type="button" class="btn sm ghost prX">✕</button></div>' }
  A.openForm({title:edit?'Editar registo de produção':'Novo registo de produção · '+setor, values:Object.assign({},r,{inicio:dtLocal(r.inicio), fim:dtLocal(r.fim)}),
    fields:[{k:'maquina',l:'Máquina',t:'select',req:1,o:mq.map(function(m){return [m.id,m.nome]})},{k:'of',l:'OF',req:1},{k:'mm',l:'MM'},{k:'operador',l:'Operador',list:'dlPop'},
      {k:'turno',l:'Turno',t:'select',o:TURNOS},{k:'inicio',l:'Início',t:'datetime-local',req:1},{k:'fim',l:'Fim',t:'datetime-local',help:'Vazio = ainda a decorrer'},
      {k:'qtdBoa',l:'Quantidade boa',t:'number'},{k:'qtdDesperdicio',l:'Desperdício',t:'number'},{k:'unidade',l:'Unidade',t:'select',o:['folhas','caixas','unidades','kg']},
      {k:'velNominal',l:'Velocidade nominal (un./h)',t:'number',help:'Vazio = velocidade da máquina nos dados mestre'},
      {t:'html',html:parHtml()+'<datalist id="dlPop">'+ops.map(function(o){return '<option value="'+esc(o)+'">'}).join('')+'</datalist>'},
      {k:'obs',l:'Observações',t:'textarea',rows:2}],
    after:function(box){
      var L=$('parL'); var wire=function(){ L.querySelectorAll('.prX').forEach(function(b){ b.onclick=function(){ b.closest('.pr').remove() } }) };
      $('parAdd').onclick=function(){ L.insertAdjacentHTML('beforeend',parRow({motivo:motivos(setor)[0]})); wire() }; wire();
    },
    del: edit? function(){ return A.del('producao',v.id) } : null,
    validate:function(x){ if(x.fim && x.inicio && x.fim<x.inicio) return 'O fim é anterior ao início.' },
    submit:function(x){
      var par=[].slice.call(document.querySelectorAll('#parL .pr')).map(function(p){ return {motivo:p.querySelector('.prM').value, min:A.num(p.querySelector('.prN').value)||0} }).filter(function(p){return p.min>0});
      var o=Object.assign({}, edit? A.clean(v) : {}, x, {setor:setor, inicio:fromLocal(x.inicio), fim:fromLocal(x.fim), paragens:par, data:(x.inicio||'').slice(0,10)||A.today()});
      o.estado=o.fim? 'fechada' : 'aberta'; o.of=String(o.of||'').trim();
      return edit? A.put('producao',v.id,o) : A.add('producao',o);
    }});
}
function motivosForm(setor){
  if(!S.admin){ A.toast('Só um editor altera os motivos.'); return }
  A.openForm({title:'Motivos de paragem · '+setor, intro:'Um motivo por linha.', values:{t:motivos(setor).join('\n')}, fields:[{k:'t',l:'Motivos',t:'textarea',rows:12,req:1}],
    submit:function(x){ var c=JSON.parse(JSON.stringify(A.cfg('motivosParagem').setores||{})); c[setor]=x.t.split(/\r?\n/).map(function(s){return s.trim()}).filter(Boolean); return A.put('config','motivosParagem',{setores:c}) }});
}
function prodView(setor, key, cor){
  var fk=key+'_';
  return {
    html:function(){
      var mq=A.maquinas(setor), ids=mq.map(function(m){return m.id}), t=A.tab(key,'reg');
      var all=A.list('producao').filter(function(r){ return r.setor===setor || ids.indexOf(r.maquina)>=0 }).sort(function(a,b){ return (b.inicio||'')<(a.inicio||'')?-1:1 });
      var abertas=all.filter(function(r){return r.estado==='aberta'}), d7=all.filter(function(r){return A.days(r.data)<=7 && r.estado!=='aberta'});
      var o7=d7.map(oee).filter(function(x){return x.oee!=null}), parTot=d7.reduce(function(s,r){return s+paragensMin(r)},0);
      var body='';
      if(t==='reg'){
        var fm=fv(fk+'m',''), q=fv(fk+'q','').toLowerCase();
        var rows=all.filter(function(r){ return (!fm||r.maquina===fm)&&(!q||[r.of,r.mm,r.operador,r.obs].join(' ').toLowerCase().indexOf(q)>=0) });
        body='<div class="filters"><input type="search" id="'+fk+'q" data-f="'+fk+'q" placeholder="Procurar OF, MM, operador…" value="'+esc(fv(fk+'q',''))+'"><select data-f="'+fk+'m">'+selOpts(mq.map(function(m){return [m.id,m.nome]}),fm,'Todas as máquinas')+'</select></div>'+
          A.table(rows,[{l:'Início',v:function(r){return '<span class="mono small">'+esc(String(r.inicio||'').slice(0,16).replace('T',' '))+'</span>'+(r.estado==='aberta'?' <span class="pill info">a decorrer</span>':'')}},
            {l:'Máquina',v:function(r){return esc(A.mName(r.maquina))}},{l:'OF / MM',v:function(r){return '<a href="#of-'+encodeURIComponent(r.of)+'" class="mono">'+esc(r.of||'–')+'</a><div class="small muted mono">'+esc(r.mm||'')+'</div>'}},
            {l:'Operador',v:function(r){return esc(r.operador||'–')}},{l:'Boa',n:1,v:function(r){return fmt(r.qtdBoa||0,0)}},{l:'Desp.',n:1,v:function(r){return r.qtdDesperdicio?fmt(r.qtdDesperdicio,0):'–'}},
            {l:'Paragens',n:1,v:function(r){var p=paragensMin(r);return p?hm(p):'–'}},{l:'Disp.',n:1,v:function(r){return pct(oee(r).D)}},{l:'Perf.',n:1,v:function(r){return pct(oee(r).P)}},{l:'Qual.',n:1,v:function(r){return pct(oee(r).Q)}},{l:'OEE',n:1,v:function(r){return oeeSpan(oee(r).oee)}}],
            {click:1,max:300,empty:'Ainda sem registos. Registe aqui ou no modo posto, junto à máquina.'});
      } else if(t==='maq'){
        body='<p class="small muted" style="margin:0 0 10px">Últimos 7 dias, registos terminados. Os gráficos de tendência ficam no módulo de Indicadores.</p>'+A.table(mq.map(function(m){
            var rs=d7.filter(function(r){return r.maquina===m.id}), os=rs.map(oee), w=function(k){ var a=os.filter(function(o){return o[k]!=null&&o.plan}), tp=a.reduce(function(s,o){return s+o.plan},0); return tp? a.reduce(function(s,o){return s+o[k]*o.plan},0)/tp : null };
            var mot={}; rs.forEach(function(r){ (r.paragens||[]).forEach(function(p){ mot[p.motivo]=(mot[p.motivo]||0)+(p.min!=null?p.min:mins(p.ini,p.fim)) }) }); var top=Object.keys(mot).sort(function(a,b){return mot[b]-mot[a]})[0];
            var ab=abertas.filter(function(r){return r.maquina===m.id})[0];
            return {id:m.id, m:m, n:rs.length, D:w('D'), P:w('P'), Q:w('Q'), O:w('oee'), top:top?top+' ('+hm(mot[top])+')':'', ab:ab} }),[
          {l:'Máquina',v:function(x){return '<b>'+esc(x.m.nome)+'</b>'+(x.ab?'<div class="small"><span class="pill info">a produzir OF '+esc(x.ab.of)+'</span></div>':'')}},{l:'Registos',n:1,v:function(x){return x.n||'–'}},
          {l:'Disp.',n:1,v:function(x){return pct(x.D)}},{l:'Perf.',n:1,v:function(x){return pct(x.P)}},{l:'Qual.',n:1,v:function(x){return pct(x.Q)}},{l:'OEE',n:1,v:function(x){return oeeSpan(x.O)}},
          {l:'Maior paragem',v:function(x){return esc(x.top||'–')}},{l:'',v:function(x){return '<a class="btn sm" href="#posto-'+encodeURIComponent(x.m.id)+'">Modo posto</a>'}}],{empty:'Sem máquinas deste setor nos dados mestre.'});
      } else {
        body='<div class="panel"><div class="ph"><h2>Motivos de paragem</h2>'+(S.admin?'<button class="btn sm" id="'+fk+'mot">Editar</button>':'')+'</div><div style="display:flex;flex-wrap:wrap;gap:6px">'+motivos(setor).map(function(m){return '<span class="pill mute" style="font-size:13px;padding:4px 10px">'+esc(m)+'</span>'}).join('')+'</div></div>';
      }
      return A.head({c:cor,mod:setor,title:'Produção e OEE',p:'Registo por máquina e OF: tempos, quantidades, desperdício e paragens. OEE = disponibilidade × performance × qualidade.',
          acts:'<a class="btn" href="#posto">Modo posto</a><button class="btn primary" id="'+fk+'new">+ Registo</button>'})+
        A.kpis([{v:abertas.length,l:'OF a decorrer agora'},{v:d7.length,l:'Registos (7 dias)'},{v:o7.length?pct(A.mean(o7.map(function(o){return o.oee}))):'–',l:'OEE médio (7 dias)'},{v:hm(parTot),l:'Paragens (7 dias)'}])+
        A.tabs(key,[['reg','Registos'],['maq','Por máquina'],['mot','Motivos de paragem']],t)+body;
    },
    bind:function(r){ $(fk+'new').onclick=function(){ prodForm(null,setor) }; if($(fk+'mot')) $(fk+'mot').onclick=function(){ motivosForm(setor) };
      A.bindRows(r,function(id){ var x=A.get('producao',id); if(x) prodForm(x,setor) }); bindFilters(r) }
  };
}
A.register('producao-imp', prodView('Impressão','pimp','var(--c-imp)'));
A.register('producao-cv', prodView('Corte e Vinco','pcv','var(--c-cv)'));
A.register('producao-col', prodView('Colagem','pcol','var(--c-col)'));
window.Producao={oee:oee, paragensMin:paragensMin, motivos:motivos, turnoDe:turnoDe, mins:mins, hm:hm, pct:pct, oeeSpan:oeeSpan, prodForm:prodForm, TURNOS:TURNOS};
})();
