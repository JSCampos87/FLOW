/* Adesão: pôr toda a fábrica a usar o FLOW todos os dias. Só com login:"email" (S.nivel definido).
   - Atividade: cada pessoa guarda no seu documento (flow_utilizadores/<uid>) os dias em que abriu o FLOW
     (dias: ['2026-11-26', …], últimos 120) e quantos registos fez por mês (reg: {'2026-11': 12}).
   - Pergunta do dia: ao entrar (1× por dia, fora do modo posto) uma pergunta de melhoria contínua; a resposta fica como "foco de hoje".
   - Quem usa pouco: pergunta porquê (de 14 em 14 dias). Quem usa muito: pede sugestões (de 30 em 30 dias).
     As respostas vão para flow_sugestoes e aparecem no sino do master.
   - Botão "Sugestão" no topo, sempre disponível.
   - Início: cartão pessoal (dias seguidos, dias e registos do mês, posição, foco, dica do dia).
   - Configuração › Utilizadores › Atividade e › Sugestões (só master). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate;
var NIVEIS=['operador','supervisor','gestor','diretor','master'];
function hoje(){ return A.today() }
function mes(){ return hoje().slice(0,7) }
function addDias(iso, n){ var d=new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10) }
function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v? JSON.parse(v) : d }catch(e){ return d } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){} }
function eu(){ return A.get('utilizadores', S.uid) || {} }
function primeiro(u){ return String((u&&u.nome)||S.names[S.uid]||'').split(' ')[0] }
function atualizar(o){ if(!S.db||!S.uid) return Promise.resolve(); return S.db.doc('utilizadores/'+S.uid).update(o).catch(function(e){ console.warn('FLOW: atividade', e&&e.code) }) }

/* ---------- métricas ---------- */
function diasEm(u, n){ var lim=addDias(hoje(), 1-n), h=hoje(); return (u.dias||[]).filter(function(d){ return d>=lim && d<=h }).length }
/* dias seguidos até hoje; sábados e domingos sem uso não quebram a sequência */
function seguidos(u){ var set={}; (u.dias||[]).forEach(function(d){ set[d]=1 }); var d=hoje(), n=0, g=0;
  if(!set[d]) d=addDias(d,-1);
  while(g++<400){ var wd=new Date(d+'T12:00:00').getDay(); if(set[d]) n++; else if(wd!==0 && wd!==6) break; d=addDias(d,-1) }
  return n }
function regMes(u, m){ return ((u.reg||{})[m||mes()])||0 }
function pontos(u){ return diasEm(u,30)*3 + Math.min(regMes(u),150) }
function aprovados(){ return A.list('utilizadores').filter(function(u){ return u.email && NIVEIS.indexOf(u.nivel)>=0 }) }
function ranking(){ return aprovados().map(function(u){ return {u:u, p:pontos(u)} }).sort(function(a,b){ return b.p-a.p || String(a.u.nome).localeCompare(String(b.u.nome)) }) }
function classe(u){ var d=diasEm(u,30); return d>=12?['ok','Muito ativo']:d>=4?['info','Regular']:d>=1?['warn','Pouco ativo']:['bad','Sem uso'] }

/* ---------- ícones ---------- */
var ICO={
  luz:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
  chama:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.3 1.6 1.1 2.6 2.3 2.8C11 8.6 11.4 5.6 12 3z"/></svg>',
  alvo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
  escudo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>'
};

/* ---------- pergunta do dia ---------- */
var PERG=[
  {p:'Hoje vais para casa como chegaste. O que vais verificar primeiro?', s:'Nenhuma caixa, nenhum prazo vale um acidente. Tu és o mais importante desta fábrica.', i:'escudo'},
  {p:'Qual é a coisa pequena que vais fazer melhor hoje?', s:'Ninguém muda tudo num dia. Mas quem melhora um bocadinho todos os dias, num ano está noutro nível.', i:'luz'},
  {p:'Onde vais ganhar tempo hoje?', s:'Uma espera a menos, uma volta a menos, um papel a menos. É assim que se faz um dia bom.', i:'alvo'},
  {p:'Que caixa vais impedir de ser rejeitada hoje?', s:'Cada caixa que sai bem à primeira tem a tua assinatura. O cliente sente-a, mesmo sem saber o teu nome.', i:'alvo'},
  {p:'Que desperdício vais caçar hoje?', s:'Cartão, tinta, minutos, movimentos. Tudo o que poupas hoje é fábrica que ganha amanhã.', i:'luz'},
  {p:'Que problema de ontem morre hoje?', s:'Os problemas que se registam resolvem-se. Os que ficam calados voltam sempre.', i:'alvo'},
  {p:'Quem vais ajudar hoje?', s:'Ninguém é bom sozinho. Uma dica tua pode poupar uma hora a um colega.', i:'luz'},
  {p:'O que vais registar hoje que ontem ficou no papel ou na cabeça?', s:'O que fica registado vira conhecimento da equipa. O que fica na cabeça vai-se embora contigo.', i:'luz'},
  {p:'De que te vais orgulhar no fim deste turno?', s:'Escolhe agora. Daqui a 8 horas vais saber se conseguiste.', i:'alvo'},
  {p:'O que fazias diferente se esta máquina fosse tua?', s:'Quem trata a máquina como sua repara antes de partir, limpa antes de sujar, avisa antes de parar.', i:'luz'},
  {p:'Qual é o primeiro sinal de que algo vai correr mal hoje? Vais estar atento?', s:'Os grandes problemas começam sempre pequenos. Quem os apanha cedo poupa o dia a todos.', i:'escudo'},
  {p:'Que ideia tens guardada há demasiado tempo?', s:'As melhores ideias desta fábrica estão na cabeça de quem lá trabalha. Diz-nos a tua: botão “Sugestão”, lá em cima.', i:'luz'},
  {p:'Vais acertar à primeira hoje?', s:'Afinar bem no arranque custa minutos. Corrigir a meio custa horas.', i:'alvo'},
  {p:'Hoje, o que é que depende só de ti?', s:'Não controlas tudo. Mas o que é teu, faz como se fosse o melhor trabalho da tua vida.', i:'luz'}
];
/* segunda-feira é sempre a pergunta da segurança; nos outros dias roda */
function perguntaHoje(){ var d=new Date(hoje()+'T12:00:00'); if(d.getDay()===1) return PERG[0]; var n=Math.floor(d.getTime()/864e5); return PERG[1+(n%(PERG.length-1))] }
function saud(){ var h=new Date().getHours(); return h<6||h>=20?'Boa noite':h<13?'Bom dia':'Boa tarde' }
/* frase curta conforme a sequência de dias: reconhecer o hábito */
function fraseSeq(n){ return n>=20?'Isto já não é um hábito, é uma marca tua.' : n>=10?'Dez dias ou mais seguidos. Estás a fazer a diferença.' : n>=5?'Estás a criar um hábito. Não pares agora.' : n>=3?'Três dias seguidos. Bom ritmo.' : n===2?'Segundo dia seguido. Continua.' : 'Cada dia conta. Hoje também.' }
function escolhe(l){ return l[Math.floor(Math.random()*l.length)] }
var BOM_DIA=['Bom trabalho hoje. O teu compromisso ficou no início.','Está combinado. Logo vês se conseguiste.','Grande. Hoje é dia de fazer acontecer.','Fica registado. Agora é contigo.'];
var SEM_FOCO=['Bom trabalho hoje.','Força nisso. Estamos contigo.','Bom turno. Faz valer a pena.'];
function dataLonga(){ return new Date().toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long'}) }

function caixa(html, after){ A.showModal('<div class="pulso">'+html+'</div>', after) }
function statsLinha(u){ var s=seguidos(u), d=diasEm(u,30), r=regMes(u);
  return '<div class="pu-st"><span>'+ICO.chama+'<b>'+s+'</b> '+(s===1?'dia seguido':'dias seguidos')+'</span><span><b>'+d+'</b> '+(d===1?'dia':'dias')+' no FLOW (30 dias)</span><span><b>'+r+'</b> '+(r===1?'registo':'registos')+' este mês</span></div>' }

function pulso(){
  var u=eu(), q=perguntaHoje(), f=(u.foco&&u.foco.data===hoje())? u.foco.r : '';
  caixa('<div class="eb">'+esc(dataLonga())+' · pergunta do dia</div><h2>'+saud()+(primeiro(u)?', '+esc(primeiro(u)):'')+'.</h2>'+
    '<div class="pu-q"><i>'+ICO[q.i]+'</i><div><b>'+esc(q.p)+'</b><span>'+esc(q.s)+'</span></div></div>'+
    '<label class="fld">O meu compromisso de hoje <small>(uma frase chega; fica no teu início)</small><textarea id="puR" rows="2" placeholder="Ex.: acertar a cor à primeira na XL105">'+esc(f)+'</textarea></label>'+
    statsLinha(u)+'<p class="small muted" style="margin:-4px 0 0">'+esc(fraseSeq(seguidos(u)))+'</p>'+
    '<div class="foot"><button class="btn ghost" id="puX">Agora não</button><button class="btn primary" id="puOk">Vamos a isso</button></div>',
  function(){
    $('puX').onclick=A.closeModal;
    $('puOk').onclick=function(){ var r=$('puR').value.trim(); if(r) atualizar({foco:{data:hoje(), p:q.p, r:r.slice(0,300)}}); A.closeModal(); A.toast(escolhe(r?BOM_DIA:SEM_FOCO)) };
  });
}
var MOTIVOS=['Não sei bem como funciona','Não tenho tempo durante o turno','Falta o que preciso para o meu trabalho','Ainda uso papel ou Excel','Não tenho computador ou tablet perto','É lento ou dá erros','Não vejo para que me serve'];
function chips(lista){ return '<div class="chips" id="suM">'+lista.map(function(m){ return '<label class="chip"><input type="checkbox" value="'+esc(m)+'">'+esc(m)+'</label>' }).join('')+'</div>' }
function bindChips(){ document.querySelectorAll('#suM input').forEach(function(i){ i.onchange=function(){ i.parentNode.classList.toggle('on',i.checked) } }) }
function enviar(tipo, extra){
  var u=eu(), o=Object.assign({tipo:tipo, uid:S.uid, nome:u.nome||S.names[S.uid]||'', email:S.email||u.email||'', nivel:S.nivel, ecra:S.route||'', em:A.nowIso(), lida:false}, extra);
  return S.db.collection('sugestoes').add(o);
}
function formSugestao(tipo, titulo, intro, comMotivos){
  caixa('<div class="eb">'+(tipo==='pouco-uso'?'A tua opinião conta':'A tua ideia conta')+'</div><h2>'+esc(titulo)+'</h2><p class="muted" style="margin:0">'+intro+'</p>'+
    (comMotivos? chips(MOTIVOS) : chips(['Ideia nova','Algo não funciona','Algo é confuso','Falta uma ferramenta']))+
    '<label class="fld">'+(comMotivos?'Diz-nos o que mudava tudo para ti (opcional)':'A tua ideia')+'<textarea id="suT" rows="3" placeholder="'+(comMotivos?'Se o FLOW fizesse uma coisa por ti, qual seria?':'O que te faz perder tempo? O que falta? O que farias diferente?')+'"></textarea></label>'+
    '<p class="small muted" style="margin:0">Chega diretamente ao responsável do FLOW, com o teu nome. Lemos todas, e muitas viram realidade.</p>'+
    '<div class="foot"><span class="err" id="suE"></span><button class="btn ghost" id="suX">Agora não</button><button class="btn primary" id="suOk">Enviar</button></div>',
  function(){ bindChips(); $('suX').onclick=A.closeModal;
    $('suOk').onclick=function(){ var b=this, m=[].slice.call(document.querySelectorAll('#suM input:checked')).map(function(i){ return i.value }), t=$('suT').value.trim();
      if(!m.length && !t){ $('suE').textContent='Escolhe uma opção ou escreve uma frase.'; return }
      b.disabled=true; enviar(tipo,{motivos:m, texto:t.slice(0,1500)}).then(function(){ A.closeModal(); A.toast('Obrigado! Já chegou. É assim que o FLOW fica à tua medida.') })
        .catch(function(){ b.disabled=false; $('suE').textContent='Não foi possível enviar. Tenta de novo.' }) };
  });
}
A.pedirAcesso=function(s){ return enviar('acesso',{setor:s.id, texto:'Pede acesso ao setor '+s.nome+'.'}) };
A.sugestao=function(){ if(!S.nivel){ A.toast('Disponível com o login por e-mail.'); return } formSugestao('sugestao','Tens uma ideia? Conta-nos.','Uma ferramenta que falta, um passo que sobra, um erro, um ecrã confuso. Quem faz o trabalho é quem sabe melhor como ele devia ser.',false) };

/* qual a caixa a mostrar hoje ao entrar */
function aoEntrar(){
  if(lsGet('flow_pulso_'+S.uid,'')===hoje()) return;
  if(/^(posto|of-)/.test(S.route||'') || !$('modal').hidden) return;
  lsSet('flow_pulso_'+S.uid, hoje());
  var u=eu(), pg=u.perguntas||{}, desde=u.aprovadoEm||u.criado||'', d30=diasEm(u,30)-1;   /* -1: hoje não conta */
  var idade=desde? A.days(desde) : 0;
  if(idade>=14 && d30<=3 && (!pg.uso || A.days(pg.uso)>=14)){
    atualizar({perguntas:Object.assign({},pg,{uso:hoje()})});
    formSugestao('pouco-uso','Sentimos a tua falta, '+(primeiro(u)||'colega')+'.','Nos últimos 30 dias abriste o FLOW em <b>'+Math.max(d30,0)+'</b> '+(d30===1?'dia':'dias')+'. Não é um ralhete: queremos mesmo saber o que está a falhar, para o FLOW passar a trabalhar para ti. Escolhe o que se aplica.',true); return }
  if(d30>=12 && (!pg.sug || A.days(pg.sug)>=30)){
    atualizar({perguntas:Object.assign({},pg,{sug:hoje()})});
    formSugestao('sugestao','Obrigado, '+(primeiro(u)||'colega')+'. A sério.','Estás entre quem mais usa o FLOW. Ninguém sabe melhor do que tu o que ainda está a mais ou a menos. Se mandasses no FLOW, o que mudavas amanhã?',false); return }
  pulso();
}

/* ---------- registo da atividade ---------- */
function marcarDia(){ var u=eu(), d=u.dias||[]; if(d.indexOf(hoje())>=0) return; atualizar({dias:d.concat([hoje()]).slice(-120)}) }
var porContar=0, tReg=null;
/* pequenas celebrações: primeiro registo do dia e marcos do mês */
var MARCOS=[10,25,50,100,200,500];
function celebrar(){ var u=eu(), tot=regMes(u)+porContar, k='flow_reg1_'+S.uid, nome=primeiro(u);
  if(lsGet(k,'')!==hoje()){ lsSet(k,hoje()); setTimeout(function(){ A.toast(escolhe(['Primeiro registo do dia'+(nome?', '+nome:'')+'. Bom arranque.','Primeiro do dia. É assim que se começa.','Já está. O dia arrancou bem.'])) },900); return }
  if(MARCOS.indexOf(tot)>=0) setTimeout(function(){ A.toast(tot+' registos este mês'+(nome?', '+nome:'')+'. '+(tot>=100?'És uma das pessoas que faz o FLOW andar.':tot>=50?'Isto é que é consistência.':'Estás a ganhar ritmo.')) },900) }
function contar(){ porContar++; celebrar(); clearTimeout(tReg); tReg=setTimeout(function(){ var u=eu(), r=Object.assign({},u.reg||{}), m=mes(); r[m]=(r[m]||0)+porContar; porContar=0;
  Object.keys(r).sort().slice(0,-12).forEach(function(k){ delete r[k] }); atualizar({reg:r}) }, 2500) }
var NAO_CONTA={utilizadores:1, config:1, sugestoes:1, auditoria:1};
['add','put','del'].forEach(function(k){ var f=A[k]; A[k]=function(c){ var p=f.apply(this, arguments); if(S.nivel && !NAO_CONTA[c]) Promise.resolve(p).then(contar, function(){}); return p } });

/* ---------- sugestões no sino do master ---------- */
var subSug=false;
function subscrever(){ if(subSug || S.nivel!=='master' || !S.db) return; subSug=true;
  S.db.collection('sugestoes').onSnapshot(function(s){ S.data.sugestoes=s.docs.map(function(d){ var x=d.data()||{}; x.id=d.id; return x }); A.render() }, function(){}) }
function porLer(){ return A.list('sugestoes').filter(function(s){ return !s.lida }) }
function resumoSug(s){ return [(s.motivos||[]).join(', '), s.texto].filter(Boolean).join(' · ') }
var extra0=A.alertasExtra;
A.alertasExtra=function(add){ if(extra0) extra0(add); if(S.nivel!=='master') return;
  porLer().forEach(function(s){ if(s.tipo==='acesso'){ add('bad','Acessos',(s.nome||s.email||'Alguém')+' pede acesso a '+String(s.texto||'').replace(/^Pede acesso ao setor |.$/g,''),'#utilizadores','sug|'+s.id); return }
    if(s.tipo==='dados'){ add('warn','Dados mestre','Confirmar: '+String(s.texto||'').slice(0,160),'#utilizadores','sug|'+s.id); return }
    add('warn','Sugestões',(s.nome||s.email||'Alguém')+(s.tipo==='pouco-uso'?' (usa pouco o FLOW)':'')+': '+String(resumoSug(s)).slice(0,110),'#utilizadores','sug|'+s.id) }) };

/* ---------- arranque: quando os dados chegam ---------- */
var tent=0, iv=setInterval(function(){
  if(++tent>120){ clearInterval(iv); return }
  if(!S.live || !S.nivel || !S.uid || !S.db) return;
  clearInterval(iv);
  marcarDia(); subscrever(); botaoTopo();
  setTimeout(aoEntrar, 1200);
  if(S.route==='inicio') A.render();
}, 700);
function botaoTopo(){ var t=document.querySelector('.top-in'); if(!t || $('topSug')) return;
  var b=document.createElement('button'); b.type='button'; b.id='topSug'; b.className='btn sm ghost top-sug'; b.title='Enviar uma sugestão ao responsável do FLOW';
  b.innerHTML=ICO.luz+'<span>Sugestão</span>'; b.onclick=A.sugestao;
  var sair=[].slice.call(t.querySelectorAll('button')).filter(function(x){ return x.textContent==='Sair' })[0]; if(sair) t.insertBefore(b,sair); else t.appendChild(b) }

/* ---------- início: cartão pessoal ---------- */
var DICAS=[
  {t:'Lê o QR colado na máquina com o telemóvel: o FLOW abre logo no modo posto dessa máquina.', r:'etiquetas'},
  {t:'O sino no topo avisa-te do que está atrasado, em vez de teres de ir procurar.', r:'alertas'},
  {t:'Em "Abrir OF / MM" escreves um n.º de OF e vês tudo dessa ordem num só ecrã.'},
  {t:'Cada ecrã tem um guia "Como funciona" com o passo a passo. Abre-o quando tiveres dúvidas.'},
  {t:'O FLOW funciona sem rede: o que registares no tablet sincroniza sozinho quando a ligação voltar.'},
  {t:'No modo posto registas início, paragens e fim da OF com dois toques. O OEE calcula-se sozinho.', r:'posto'},
  {t:'Uma FII registada hoje é um defeito que não chega ao cliente amanhã.', r:'incidencias'},
  {t:'Instala o FLOW no telemóvel: no browser, "Adicionar ao ecrã principal". Abre como uma app.'},
  {t:'Tens uma ideia para o FLOW? Carrega em "Sugestão" no topo. Lemos todas.'},
  {t:'Requisições de material pelo FLOW chegam logo a quem compra, com a máquina e o motivo.', r:'requisicoes'}
];
function dicaHoje(){ var n=Math.floor(Date.parse(hoje())/864e5); return DICAS[n%DICAS.length] }
function ordinal(n){ return n+'.º' }
A.inicioExtra=function(){
  if(!S.nivel || !S.live) return '';
  var u=eu(), rk=ranking().filter(function(x){ return x.p>0 }), pos=rk.map(function(x){ return x.u.id }).indexOf(S.uid), s=seguidos(u), dc=dicaHoje(), fo=(u.foco&&u.foco.data===hoje())? u.foco : null;
  return '<section class="meu">'+
    '<div class="meu-foco"><div class="eb">O teu compromisso de hoje</div>'+(fo? '<b>'+esc(fo.r)+'</b><span class="small muted">'+esc(fo.p)+'</span>' : '<b class="muted">Ainda não escolheste o teu compromisso de hoje.</b><span class="small muted">'+esc(perguntaHoje().p)+'</span>')+
      '<button class="btn sm" type="button" data-meu="foco">'+(fo?'Mudar':'Escolher agora')+'</button></div>'+
    '<div class="meu-st"><div class="'+(s>=3?'quente':'')+'">'+ICO.chama+'<b>'+s+'</b><span>'+(s===1?'dia seguido':'dias seguidos')+'</span></div>'+
      '<div><b>'+diasEm(u,30)+'</b><span>dias no FLOW (30 dias)</span></div><div><b>'+regMes(u)+'</b><span>registos este mês</span></div>'+
      '<div><b>'+(pos>=0?ordinal(pos+1):'–')+'</b><span>'+(pos>=0?'de '+rk.length+' em atividade':'ainda sem posição')+'</span></div>'+
      '<p class="meu-frase">'+esc(fraseSeq(s))+'</p></div>'+
    '<div class="meu-dica"><i>'+ICO.luz+'</i><div><div class="eb">Sabias que…</div>'+esc(dc.t)+(dc.r&&A.TOOLS[dc.r]?' <a href="#'+dc.r+'">Experimentar</a>':'')+'</div>'+
      '<button class="btn sm ghost" type="button" data-meu="sug">Tenho uma ideia</button></div>'+
  '</section>';
};
document.addEventListener('click', function(e){ var b=e.target.closest('[data-meu]'); if(!b) return; if(b.dataset.meu==='foco') pulso(); else A.sugestao() });

/* ---------- Utilizadores › Atividade e › Sugestões (master) ---------- */
function barra(v, max){ return '<span class="mini-bar"><i style="width:'+Math.round(Math.min(1,max? v/max : 0)*100)+'%"></i></span>' }
function atividade(){
  var rk=ranking(), tot=rk.length, h=hoje();
  var n1=rk.filter(function(x){ return (x.u.dias||[]).indexOf(h)>=0 }).length, n7=rk.filter(function(x){ return diasEm(x.u,7)>0 }).length, n30=rk.filter(function(x){ return diasEm(x.u,30)>0 }).length;
  var regs=rk.reduce(function(a,x){ return a+regMes(x.u) },0), maxD=Math.max.apply(null,[1].concat(rk.map(function(x){ return diasEm(x.u,30) })));
  var parados=rk.filter(function(x){ var v=x.u.dias||[]; return !v.length || A.days(v[v.length-1])>14 });
  return A.kpis([{v:n1,l:'Usaram hoje'},{v:n7,l:'Nos últimos 7 dias'},{v:tot?fmt(n30/tot*100,0)+'%':'–',l:'Adesão (30 dias)',s:n30+' de '+tot+' contas'},{v:fmt(regs,0),l:'Registos este mês'},{v:parados.length,l:'Sem uso há +14 dias',cls:parados.length?'warn':''}])+
    (parados.length?'<div class="banner">'+parados.length+(parados.length===1?' pessoa não abre':' pessoas não abrem')+' o FLOW há mais de 14 dias: '+esc(parados.slice(0,8).map(function(x){ return x.u.nome||x.u.email }).join(', '))+(parados.length>8?'…':'')+'. Ao entrarem, o FLOW pergunta-lhes porquê; as respostas chegam ao separador Sugestões.</div>':'')+
    A.table(rk.map(function(x,i){ return Object.assign({_i:i+1,_p:x.p},x.u) }),[
      {l:'#',n:1,v:function(u){ return '<span class="mono">'+u._i+'</span>' }},
      {l:'Nome',v:function(u){ return '<b>'+esc(u.nome||'–')+'</b><div class="small muted">'+esc(u.nivel.charAt(0).toUpperCase()+u.nivel.slice(1))+'</div>' }},
      {l:'Atividade',v:function(u){ var c=classe(u); return '<span class="pill '+c[0]+'">'+c[1]+'</span>' }},
      {l:'Dias (30 d)',v:function(u){ var d=diasEm(u,30); return '<span class="mono">'+d+'</span> '+barra(d,maxD) }},
      {l:'Seguidos',n:1,v:function(u){ return seguidos(u)||'–' }},
      {l:'Registos (mês)',n:1,v:function(u){ return fmt(regMes(u),0) }},
      {l:'Último acesso',v:function(u){ var v=u.dias||[]; return '<span class="small mono">'+(v.length?fdate(v[v.length-1]):fdate(u.visto))+'</span>' }},
      {l:'Foco de hoje',v:function(u){ return u.foco&&u.foco.data===h? '<span class="small">'+esc(u.foco.r)+'</span>' : '<span class="small muted">–</span>' }}],{click:1,empty:'Ainda sem contas aprovadas.'})+
    '<p class="small muted">Atividade = dias em que abriu o FLOW nos últimos 30 dias (×3) + registos feitos este mês. Clique numa pessoa para mudar o nível ou as permissões.</p>';
}
var TIPO={'pouco-uso':['warn','Usa pouco'],sugestao:['info','Sugestão'],dados:['bad','Confirmar dados'],acesso:['warn','Pedido de acesso']};
function sugestoes(){
  var all=A.list('sugestoes').slice().sort(function(a,b){ return (b.em||'')<(a.em||'')?-1:1 }), nl=all.filter(function(s){return !s.lida}).length;
  var mot={}; all.filter(function(s){return s.tipo==='pouco-uso'}).forEach(function(s){ (s.motivos||[]).forEach(function(m){ mot[m]=(mot[m]||0)+1 }) });
  var mk=Object.keys(mot).sort(function(a,b){ return mot[b]-mot[a] }), mx=mk.length? mot[mk[0]] : 1;
  return A.kpis([{v:nl,l:'Por ler',cls:nl?'warn':''},{v:all.length,l:'Recebidas'},{v:all.filter(function(s){return s.tipo==='pouco-uso'}).length,l:'Respostas de quem usa pouco'}])+
    (mk.length?'<div class="panel" style="margin-bottom:14px"><h3 style="font-size:17px;margin-bottom:8px">Porque é que usam pouco</h3>'+mk.map(function(m){ return '<div class="mot"><span>'+esc(m)+'</span>'+barra(mot[m],mx)+'<b class="mono">'+mot[m]+'</b></div>' }).join('')+'</div>':'')+
    A.table(all,[{l:'Quando',v:function(s){ return '<span class="small mono">'+esc(String(s.em||'').slice(0,16).replace('T',' '))+'</span>' }},
      {l:'Quem',v:function(s){ return '<b>'+esc(s.nome||'–')+'</b><div class="small muted">'+esc(s.email||'')+'</div>' }},
      {l:'Tipo',v:function(s){ var t=TIPO[s.tipo]||['mute',s.tipo]; return '<span class="pill '+t[0]+'">'+esc(t[1])+'</span>' }},
      {l:'O que disse',v:function(s){ return (s.motivos&&s.motivos.length?'<div class="small"><b>'+esc(s.motivos.join(' · '))+'</b></div>':'')+(s.texto?'<div style="white-space:pre-wrap">'+esc(s.texto)+'</div>':'')+(s.ecra?'<div class="small muted">no ecrã '+esc(A.TOOLS[s.ecra]||s.ecra)+'</div>':'') }},
      {l:'',v:function(s){ return s.lida? '<span class="pill mute">Lida</span>' : '<button class="btn sm" data-lida="'+esc(s.id)+'">Marcar como lida</button>' }}],{empty:'Ainda sem sugestões. Chegam aqui as respostas às perguntas do FLOW e o botão "Sugestão" do topo.'});
}
function bindPainel(r){ r.querySelectorAll('[data-lida]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); b.disabled=true;
  S.db.doc('sugestoes/'+b.dataset.lida).update({lida:true, lidaEm:A.nowIso()}).catch(function(){ b.disabled=false; A.toast('Não foi possível gravar.') }) } }) }
A.adesao={atividade:atividade, sugestoes:sugestoes, bind:bindPainel, porLer:function(){ return porLer().length }};
})();
