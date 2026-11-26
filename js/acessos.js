/* Acessos: níveis, permissões por módulo e gestão de utilizadores (só com login:"email", ver docs/SEGURANCA.md).
   - Níveis (flow_utilizadores/<uid>.nivel): pendente → operador / supervisor / gestor / diretor / master; bloqueado.
   - Permissões (caps): ver App.ROLES em core.js. Fechadas por omissão: só quem as tem (e o master) altera.
   - Ecrãs com permissão própria (ROUTECAP) abrem em "modo consulta" para os outros: ver e exportar, sem alterar.
   - A guarda das escritas está em core.js (guarda/guardarDb); as regras do Firestore repetem o essencial no servidor. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fdate=A.fdate;
var NIV=[['pendente','Pendente'],['operador','Operador'],['supervisor','Supervisor'],['gestor','Gestor'],['diretor','Diretor'],['master','Master'],['bloqueado','Suspenso']];
var NIVD={operador:'Regista e altera nos seus setores; não elimina.',supervisor:'Como o operador; eliminar só onde tiver permissão do módulo.',gestor:'Todos os setores; elimina registos.',diretor:'Vê tudo, não altera nada.',master:'Tudo, incluindo utilizadores e permissões.'};
var NIVP={pendente:'warn',operador:'mute',supervisor:'info',gestor:'info',diretor:'info',master:'ok',bloqueado:'bad'};
/* ecrã → permissão que dá direito a alterar */
var ROUTECAP={incidencias:'qualidade',fornecedores:'qualidade',laboratorio:'qualidade',cargas:'embalamento',specs:'embalamento'};
/* botões que continuam visíveis em modo consulta */
var LEITURA=/exportar|imprimir|fechar|voltar|pesquisar|limpar$|ecr[ãa] inteiro|mapa e rota|ver /i;

A.master=(function(old){ return function(){ return S.nivel? S.nivel==='master' : old() } })(A.master||function(){ return false });
function lerSo(r){ if(!S.nivel || S.nivel==='master') return false; if(S.nivel==='diretor') return true; var c=ROUTECAP[r]; return !!c && !A.can(c) }

/* formulários: em modo consulta não abrem */
var openForm0=A.openForm;
A.openForm=function(o){ if(lerSo(S.route) && !(o&&o.leitura)){ A.toast(S.nivel==='diretor'?'Perfil de consulta: não altera registos.':'Modo consulta: sem permissão para alterar ('+A.ROLES[ROUTECAP[S.route]]+').'); return } return openForm0(o) };

A.permUI=function(main, r){
  if(!S.nivel) return;
  /* PDF de indicadores de qualidade: só com a permissão própria */
  if(!A.can('qualidade_pdf')) main.querySelectorAll('#qPdf').forEach(function(b){ b.hidden=true });
  if(!lerSo(r)) return;
  main.querySelectorAll('.head .acts .btn, .ph .acts .btn, .eb-pal, [data-crewn], [data-delcrew], #ebMiss').forEach(function(b){ if(!LEITURA.test(b.textContent||'') && b.id!=='qPdf') b.hidden=true });
  main.querySelectorAll('[draggable="true"]').forEach(function(x){ x.draggable=false });
  var h=main.querySelector('.head'), cap=ROUTECAP[r];
  if(h && !main.querySelector('.ro-banner')){ var b=document.createElement('div'); b.className='banner ro-banner';
    b.innerHTML='<b>Modo consulta.</b> Pode ver e exportar. '+(S.nivel==='diretor'?'O perfil de diretor não altera registos.':'Para alterar é preciso a permissão «'+esc(A.ROLES[cap])+'» — peça ao responsável do FLOW.');
    h.after(b) }
};

/* ---------- página Utilizadores (só master) ---------- */
function lista(){ return A.list('utilizadores').filter(function(u){ return u.email && u.nivel }) }
function setoresTxt(u){ if(['gestor','diretor','master'].indexOf(u.nivel)>=0) return 'Todos'; var s=u.setores||[]; return !s.length||s.indexOf('*')>=0? 'Todos' : s.map(function(id){ var x=A.SECTORS.filter(function(y){return y.id===id})[0]; return x?x.nome:id }).join(', ') }
function capsTxt(u){ if(u.nivel==='master') return 'Todas'; var c=u.caps||[]; return c.length? c.map(function(k){ return '<span class="pill info">'+esc((A.ROLES[k]||k).split(' · ')[0]+(A.ROLES[k]&&A.ROLES[k].indexOf(' · ')>0?' · '+A.ROLES[k].split(' · ')[1].split(',')[0]:''))+'</span>' }).join(' ') : '<span class="muted small">nenhuma</span>' }
function userForm(u){
  if(!A.master()){ A.toast('Só o master gere utilizadores.'); return }
  var v={nivel:u.nivel==='pendente'?'operador':u.nivel, nome:u.nome};
  A.SECTORS.forEach(function(s){ v['s_'+s.id]=(u.setores||[]).indexOf(s.id)>=0 || (u.setores||[]).indexOf('*')>=0 });
  Object.keys(A.ROLES).forEach(function(k){ v['c_'+k]=(u.caps||[]).indexOf(k)>=0 });
  A.openForm({title:(u.nivel==='pendente'?'Aprovar ':'')+(u.nome||u.email), leitura:1,
    intro:'<span class="mono small">'+esc(u.email)+'</span> · conta criada a '+fdate(u.criado)+'. '+Object.keys(NIVD).map(function(k){ return '<br><b>'+esc(k.charAt(0).toUpperCase()+k.slice(1))+':</b> '+esc(NIVD[k]) }).join(''),
    values:v,
    fields:[{k:'nome',l:'Nome',req:1},{k:'nivel',l:'Nível',t:'select',req:1,o:NIV.filter(function(n){return n[0]!=='pendente'})},
      {t:'sep',l:'Setores que vê (operador e supervisor; nenhum marcado = todos)'}].concat(A.SECTORS.map(function(s){ return {k:'s_'+s.id,l:s.nome,t:'check'} }))
      .concat([{t:'sep',l:'Permissões por módulo (o master tem todas)'}]).concat(Object.keys(A.ROLES).map(function(k){ return {k:'c_'+k,l:A.ROLES[k],t:'check',full:1} })),
    after:function(){ var b=document.createElement('button'); b.type='button'; b.className='btn'; b.textContent='Enviar link de nova palavra-passe';
      b.onclick=function(){ if(!S.user||!S.user.resetPass){ A.toast('Indisponível.'); return } S.user.resetPass(u.email).then(function(){ A.toast('Link enviado para '+u.email+'.') }).catch(function(){ A.toast('Não foi possível enviar.') }) };
      $('fcancel').before(b) },
    ok:'Guardar', done:'Permissões guardadas.',
    submit:function(x){
      var o={nome:x.nome, nivel:x.nivel, setores:A.SECTORS.filter(function(s){return x['s_'+s.id]}).map(function(s){return s.id}), caps:Object.keys(A.ROLES).filter(function(k){return x['c_'+k]}),
        alteradoPor:S.email||S.uid, alteradoEm:A.nowIso()};
      if(u.nivel==='pendente'){ o.aprovadoPor=S.email||S.uid; o.aprovadoEm=A.nowIso() }
      return A.put('utilizadores', u.id, Object.assign({}, A.clean(u), o));
    }});
}
A.register('utilizadores',{
  html:function(){
    if(!A.master()) return A.head({c:'var(--c-cfg)',mod:'Configuração',title:'Utilizadores'})+'<div class="panel empty">Só o master gere utilizadores e permissões.</div>';
    if(!S.nivel) return A.head({c:'var(--c-cfg)',mod:'Configuração',title:'Utilizadores'})+'<div class="banner">O login por e-mail ainda não está ligado (<span class="mono">login:"email"</span> em js/config.js). Ver docs/SEGURANCA.md.</div>';
    var us=lista().sort(function(a,b){ return (a.nivel==='pendente'?0:1)-(b.nivel==='pendente'?0:1) || String(a.nome).localeCompare(String(b.nome)) });
    var pend=us.filter(function(u){return u.nivel==='pendente'}).length, nt=(A.cfg('acessos').notificar)||'';
    return A.head({c:'var(--c-cfg)',mod:'Configuração',title:'Utilizadores',p:'Quem entra no FLOW, com que nível e com que permissões. As contas novas ficam pendentes até as aprovar aqui.'})+
      A.kpis([{v:pend,l:'À espera de aprovação',cls:pend?'warn':''},{v:us.filter(function(u){return ['pendente','bloqueado'].indexOf(u.nivel)<0}).length,l:'Com acesso'},{v:us.filter(function(u){return u.nivel==='bloqueado'}).length,l:'Suspensos'}])+
      '<div class="filters"><label class="small muted" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">Avisar contas novas por e-mail para <input id="acN" type="email" value="'+esc(nt)+'" placeholder="o seu e-mail" style="min-width:240px"></label><button class="btn sm" id="acNs">Guardar</button></div>'+
      A.table(us,[{l:'Nome',v:function(u){return '<b>'+esc(u.nome||'–')+'</b><div class="small muted mono">'+esc(u.email)+'</div>'}},
        {l:'Nível',v:function(u){ var n=NIV.filter(function(x){return x[0]===u.nivel})[0]; return '<span class="pill '+(NIVP[u.nivel]||'mute')+'">'+esc(n?n[1]:u.nivel)+'</span>' }},
        {l:'Setores',v:function(u){return '<span class="small">'+esc(setoresTxt(u))+'</span>'}},{l:'Permissões',v:capsTxt},
        {l:'Último acesso',v:function(u){return '<span class="small mono">'+fdate(u.visto)+'</span>'}}],{click:1,empty:'Ainda ninguém criou conta.'});
  },
  bind:function(r){
    if($('acNs')) $('acNs').onclick=function(){ var v=$('acN').value.trim(); A.put('config','acessos',Object.assign({},A.clean(A.cfg('acessos')),{notificar:v})).then(function(){ A.toast('Guardado.') }).catch(function(e){ A.toast(e&&e.user?e.message:'Não foi possível guardar.') }) };
    A.bindRows(r,function(id){ var u=A.get('utilizadores',id); if(u) userForm(u) });
  }
});
A.TOOLS.utilizadores='Utilizadores';
/* sino: contas novas à espera (só o master vê) */
A.alertasExtra=function(add){ if(S.nivel!=='master') return; lista().filter(function(u){return u.nivel==='pendente'}).forEach(function(u){ add('bad','Acessos',(u.nome||u.email)+' criou conta e espera que lhe atribua o nível e as permissões','#utilizadores','acesso|'+u.id) }) };
})();
