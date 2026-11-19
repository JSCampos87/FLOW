/* Início, dados mestre (máquinas, operadores) e perfis. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, C='var(--c-cfg)';

var TDESC={verniz:'Sobras de verniz: localização, quantidade e utilização.',cauchos:'Stock, montagem por máquina e vida útil.',intervencoes:'Inspeções, rolos, fingerprint, molhas.',aguas:'Osmose e molhas: álcool, condutividade, pH.',
  'intervencoes-cv':'Mapeamento e limpeza do cofre de corte.',cargas:'Mapa de entregas → equipas por turno, distribuição pelos uptimes.',specs:'Biblioteca de specs por MM (SAP), criar MM em falta e PDFs de paletização.',
  incidencias:'FII internas e FIQ de clientes, com histórico desde 2024.',fornecedores:'Não conformidades de fornecedores, custos e créditos.',cartolina:'10 medições de gramagem e espessura por receção.',
  painel:'Números-chave de todas as ferramentas.','ind-qualidade':'FII, FIQ e fornecedores: tendências, Pareto, custos.'};
var EST={ativo:'Ativo',piloto:'Piloto',desenvolvimento:'Em desenvolvimento','por-ligar':'Por ligar'};
function lsGet(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
window.addEventListener('hashchange',function(){ var h=location.hash.slice(1); if(A.TOOLS[h] && A.sectorOf(h) && A.sectorOf(h).id!=='config'){ var r=lsGet('flow_recent',[]).filter(function(x){return x!==h}); r.unshift(h); lsSet('flow_recent',r.slice(0,6)) } });
var EXT='<svg class="ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>';
var ARR='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
function items(s){
  return s.tools.map(function(id){ return {n:A.TOOLS[id],href:'#'+id,est:'ativo',d:TDESC[id]||(A.APPS[id]&&A.APPS[id].d)} })
    .concat(A.extTools(s.id).map(function(f){ var off=!f.url||f.estado==='por-ligar'; return {n:f.nome,href:off?'':f.url,ext:1,off:off,est:f.estado||'ativo',d:f.descricao,f:f} }));
}
function modCard(s){
  var it=items(s), act=it.filter(function(i){return !i.off}).length;
  var list=it.length? it.slice(0,6).map(function(i){
      return '<li>'+(i.off?'<div class="tool">':'<a class="tool" href="'+esc(i.href)+'"'+(i.ext?' target="_blank" rel="noopener"':'')+'>')+'<span class="tn">'+esc(i.n)+'</span><span class="pill '+esc(i.est)+'">'+(EST[i.est]||i.est)+'</span>'+(i.ext&&!i.off?EXT:'')+(i.off?'</div>':'</a>')+'</li>' }).join('')+(it.length>6?'<li class="tool none">+ '+(it.length-6)+' outras</li>':'')
    : '<li class="tool none">Setor novo — ainda sem ferramentas</li>';
  return '<article class="mod" style="--c:'+s.c+'"><a class="mod-head" href="#'+s.id+'" aria-label="Abrir '+esc(s.nome)+'">'+A.ico(s.id)+'<span><h3>'+esc(s.nome)+'</h3><div class="desc">'+esc(s.desc)+'</div></span><span class="go">'+ARR+'</span></a>'+
    '<ul class="tools">'+list+'</ul><div class="mod-foot"><span>'+(it.length? act+' ativa'+(act===1?'':'s')+' · '+it.length+' no total' : 'Em preparação')+'</span>'+(it.length?'':'<span class="pill novo">Novo</span>')+'</div></article>';
}
function toolCard(i, s){
  return (i.off?'<div class="hcard" style="--c:'+s.c+';opacity:.75">':'<a class="hcard" href="'+esc(i.href)+'"'+(i.ext?' target="_blank" rel="noopener"':'')+' style="--c:'+s.c+'">')+
    '<span class="eyebrow">'+(i.ext?(i.off?'Por ligar':'App externa ↗'):esc(s.nome))+'</span><h3>'+esc(i.n)+'</h3><p>'+esc(i.d||'')+'</p>'+
    (i.ext&&S.admin&&!i.f.def?'<span><button class="btn sm ghost" data-edext="'+esc(i.f.id)+'" style="padding-left:0">Editar</button></span>':'')+(i.off?'</div>':'</a>');
}
A.register('inicio',{
  html:function(){
    var h=new Date().getHours(), nome=(S.names[S.uid]||'').split(' ')[0], q=(S._hq||'').toLowerCase().trim();
    var rec=lsGet('flow_recent',[]).filter(function(x){return A.TOOLS[x]});
    var nT=0; A.SECTORS.forEach(function(s){ nT+=items(s).filter(function(i){return !i.off}).length });
    var secs=A.SECTORS.filter(function(s){ return !q || (s.nome+' '+items(s).map(function(i){return i.n}).join(' ')).toLowerCase().indexOf(q)>=0 });
    var semMaq=!A.list('maquinas').length, semOp=!A.list('operadores').length;
    return '<div class="hero-img"><img src="assets/banner.jpg" alt="FLOW · Graphicsleader: do escritório à expedição"></div>'+
      '<section class="band"><div class="band-in"><div><div class="eb">'+esc(new Date().toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long'}))+' · Graphicsleader</div>'+
      '<h1>'+(h<6||h>=20?'Boa noite':h<13?'Bom dia':'Boa tarde')+(nome&&S.mode!=='local'?', '+esc(nome):'')+'.</h1><p>Todas as ferramentas da fábrica num só sítio, organizadas por setor. Escolha o setor no topo ou procure aqui.</p></div>'+
      '<div class="stats"><div class="stat"><b>'+A.SECTORS.length+'</b><span>setores</span></div><div class="stat"><b>'+nT+'</b><span>ferramentas ativas</span></div></div>'+
      '<div class="quick"><input id="hq" type="search" placeholder="Procurar setor ou ferramenta…" value="'+esc(S._hq||'')+'">'+(rec.length?'<span class="lbl" style="margin-left:8px">Recentes</span>'+rec.map(function(x){ var s=A.sectorOf(x); return '<a class="qa" href="#'+x+'"><i style="background:'+s.c+'"></i>'+esc(A.TOOLS[x])+'</a>' }).join(''):'')+'</div></div></section>'+
      (S.mode==='local'?'<div class="banner">Modo local — os registos ficam guardados apenas neste browser. Para dados partilhados, abra o FLOW no claude.ai ou ligue um servidor (ver docs/ARQUITETURA.md).</div>':'')+
      (S.live&&S.admin&&(semMaq||semOp)? '<div class="banner">Falta configurar '+(semMaq&&semOp?'máquinas e operadores':semMaq?'as máquinas':'os operadores')+' — <a href="#dados">abrir Dados mestre</a>.</div>' : '')+
      '<div class="ph" style="margin:4px 0 12px"><h2 style="font-size:22px">Setores</h2><span class="small muted">Clique num setor para ver as suas ferramentas.</span></div>'+
      (secs.length?'<div class="mods">'+secs.map(modCard).join('')+'</div>':'<div class="panel empty">Nada encontrado.</div>');
  },
  bind:function(r){ var i=$('hq'); i.addEventListener('input',function(){ S._hq=i.value; A.render() }) }
});
A.register('__setor',{
  html:function(){
    var s=A.sectorOf(S.route), it=items(s);
    return '<section class="shero" style="--c:'+s.c+'">'+A.ico(s.id,'lg')+'<div><h1>'+esc(s.nome)+'</h1><p>'+esc(s.desc)+'</p></div><div class="acts">'+(S.admin?'<button class="btn" id="exAdd">+ Ferramenta externa</button>':'')+'</div></section>'+
      (it.length? '<div class="home">'+it.map(function(i){ return toolCard(i,s) }).join('')+'</div>'
        : '<div class="panel empty"><b style="display:block;font-family:var(--f-display);font-size:20px;color:var(--fg)">Ainda não há ferramentas neste setor</b>As ferramentas de '+esc(s.nome)+' vão aparecer aqui.</div>');
  },
  bind:function(r){ var s=A.sectorOf(S.route); if($('exAdd')) $('exAdd').onclick=function(){ extForm(null,s.id) }; r.querySelectorAll('[data-edext]').forEach(function(b){ b.onclick=function(e){ e.preventDefault(); e.stopPropagation(); extForm(A.get('ferramentas',b.dataset.edext)) } }) }
});
function extForm(f, sid){
  if(!S.admin){ A.toast('Só um editor altera ferramentas.'); return }
  var edit=!!f;
  A.openForm({title:edit?'Editar ferramenta externa':'Nova ferramenta externa', intro:'Ferramentas que vivem fora do FLOW (outra app, SharePoint, Excel online…). Aparecem no setor com ↗.',
    fields:[{k:'nome',l:'Nome',req:1},{k:'url',l:'Endereço (URL)',ph:'https://…',full:1},{k:'descricao',l:'Descrição',t:'textarea',rows:2},
      {k:'setor',l:'Setor',t:'select',req:1,o:A.SECTORS.map(function(s){return [s.id,s.nome]}),def:sid},{k:'estado',l:'Estado',t:'select',o:Object.keys(EST).map(function(k){return [k,EST[k]]}),req:1},{k:'ordem',l:'Ordem',t:'number'}],
    values:Object.assign({setor:(f&&f.modulos&&f.modulos[0])||sid},f||{estado:'ativo',ordem:10}),
    del: edit? function(){ return A.del('ferramentas',f.id) } : null,
    submit:function(x){ var o={nome:x.nome,url:x.url,descricao:x.descricao,modulos:[x.setor],estado:x.estado,ordem:x.ordem||10}; if(edit) return A.put('ferramentas',f.id,o); return A.add('ferramentas',o) }});
}
A.register('ferramentas',{
  html:function(){
    var all=A.list('ferramentas').slice().sort(function(a,b){ return ((a.modulos||[])[0]||'').localeCompare((b.modulos||[])[0]||'')||(a.ordem||99)-(b.ordem||99) });
    return A.head({c:'var(--c-cfg)',mod:'Configuração',title:'Ferramentas externas',p:'Apps que vivem fora do FLOW e aparecem no setor respetivo (PCV Ferramentas, Auditorias PCM, Contador de Folhas…).',acts:S.admin?'<button class="btn primary" id="exNew">+ Ferramenta</button>':''})+
      A.table(all,[{l:'Setor',v:function(f){ var s=A.SECTORS.filter(function(x){return x.id===(f.modulos||[])[0]})[0]; return s?'<span style="display:inline-flex;gap:6px;align-items:center"><i style="width:8px;height:8px;border-radius:2px;background:'+s.c+'"></i>'+esc(s.nome)+'</span>':'–' }},
        {l:'Ferramenta',v:function(f){return '<b>'+esc(f.nome)+'</b><div class="small muted">'+esc(f.descricao||'')+'</div>'}},{l:'Estado',v:function(f){return '<span class="pill '+(f.estado==='ativo'?'ok':f.estado==='por-ligar'?'mute':'info')+'">'+esc(EST[f.estado]||f.estado)+'</span>'}},
        {l:'Endereço',v:function(f){return f.url?'<a href="'+esc(f.url)+'" target="_blank" rel="noopener" class="small">abrir ↗</a>':'<span class="muted small">por indicar</span>'}}],{click:S.admin,empty:'Sem ferramentas externas.'});
  },
  bind:function(r){ if($('exNew')) $('exNew').onclick=function(){extForm(null,'impressao')}; A.bindRows(r,function(id){ extForm(A.get('ferramentas',id)) }) }
});

/* ---------- dados mestre ---------- */
function maqForm(m){
  if(!S.admin){ A.toast('Só um editor altera os dados mestre.'); return }
  var edit=!!m;
  A.openForm({title:edit?'Editar máquina':'Nova máquina', values:m||{setor:'Impressão',corpos:6,verniz:true,ativo:true},
    fields:[{k:'nome',l:'Nome',req:1,ph:'ex. XL105'},{k:'setor',l:'Setor',t:'select',o:A.SETORES,req:1},{k:'corpos',l:'N.º de corpos de impressão',t:'number',help:'Para as posições dos cauchos'},{k:'verniz',l:'Tem torre de verniz',t:'check'},{k:'ativo',l:'Ativa',t:'check'}],
    del: edit? function(){ return A.del('maquinas',m.id) } : null,
    submit:function(x){ if(edit) return A.put('maquinas',m.id,Object.assign({criadoEm:m.criadoEm},x)); return A.add('maquinas',x) }});
}
function opForm(o){
  if(!S.admin){ A.toast('Só um editor altera os dados mestre.'); return }
  var edit=!!o;
  A.openForm({title:edit?'Editar operador':'Novo operador', values:o||{setor:'Impressão',ativo:true},
    fields:[{k:'nome',l:'Nome',req:1},{k:'numero',l:'N.º de colaborador'},{k:'setor',l:'Setor',t:'select',o:A.SETORES},{k:'funcao',l:'Função',ph:'ex. Operador, Ajudante, Supervisor'},{k:'ativo',l:'Ativo',t:'check'}],
    del: edit? function(){ return A.del('operadores',o.id) } : null,
    submit:function(x){ if(edit) return A.put('operadores',o.id,Object.assign({criadoEm:o.criadoEm},x)); return A.add('operadores',x) }});
}
function opImport(){
  if(!S.admin){ A.toast('Só um editor altera os dados mestre.'); return }
  A.openForm({title:'Carregar lista de operadores', intro:'Cole uma linha por pessoa: <b>Nome; Setor; N.º; Função</b> (só o nome é obrigatório). Pode copiar diretamente de uma folha Excel — as colunas separadas por tabulação também funcionam.',
    fields:[{k:'txt',l:'Lista',t:'textarea',rows:10,req:1,ph:'Ana Silva; Impressão; 1234; Operador\nRui Costa; Impressão; 1250; Ajudante'}],
    submit:async function(x){
      var ex={}; A.list('operadores').forEach(function(o){ ex[o.nome.toLowerCase()]=1 });
      var lines=x.txt.split(/\r?\n/).map(function(l){return l.split(/\t|;/).map(function(c){return c.trim()})}).filter(function(c){return c[0]});
      var n=0; for(var i=0;i<lines.length;i++){ var c=lines[i]; if(ex[c[0].toLowerCase()]) continue; var setor=A.SETORES.filter(function(s){return s.toLowerCase()===(c[1]||'').toLowerCase()})[0]||c[1]||'';
        await A.add('operadores',{nome:c[0], setor:setor, numero:c[2]||'', funcao:c[3]||'', ativo:true}); ex[c[0].toLowerCase()]=1; n++ }
      A.toast(n+' operadores adicionados.');
    }, ok:'Carregar', done:'Lista carregada.'});
}
A.register('dados',{
  html:function(){
    var t=A.tab('dm','maq');
    var body = t==='maq'? A.table(A.list('maquinas').slice().sort(A.by('nome')),[{l:'Máquina',v:function(m){return '<b>'+esc(m.nome)+'</b>'}},{l:'Modelo',v:function(m){return '<span class="small">'+esc(m.modelo||'–')+'</span>'}},{l:'Setor',v:function(m){return esc(m.setor||'–')}},{l:'Ano',n:1,v:function(m){return m.ano||'–'}},{l:'Formato máx.',v:function(m){return '<span class="mono small">'+esc(m.formatoMax||'–')+'</span>'}},{l:'Velocidade',n:1,v:function(m){return m.velocidade?fmt(m.velocidade,0)+'/h':'–'}},{l:'Corpos',n:1,v:function(m){return m.corpos||'–'}},{l:'Verniz',v:function(m){return m.verniz===false?'Não':'Sim'}},{l:'Estado',v:function(m){return m.ativo===false?'<span class="pill mute">Inativa</span>':'<span class="pill ok">Ativa</span>'}}],{click:1,empty:'Ainda sem máquinas.'})
      : A.table(A.list('operadores').slice().sort(A.by('nome')),[{l:'Nome',v:function(o){return '<b>'+esc(o.nome)+'</b>'}},{l:'N.º',v:function(o){return esc(o.numero||'–')}},{l:'Setor',v:function(o){return esc(o.setor||'–')}},{l:'Máquina',v:function(o){return esc(o.maquina||'–')}},{l:'Turno',v:function(o){return '<span class="mono small">'+esc(o.turno||'–')+'</span>'}},{l:'Função',v:function(o){return esc(o.funcao||'–')+(o.formacao?' <span class="pill info">formação</span>':'')+(o.obs?' <span class="pill mute">'+esc(o.obs)+'</span>':'')}},{l:'Estado',v:function(o){return o.ativo===false?'<span class="pill mute">Inativo</span>':'<span class="pill ok">Ativo</span>'}}],{click:1,empty:'Ainda sem operadores. Use “Carregar lista”.'});
    return A.head({c:C,mod:'Configuração',title:'Dados mestre',p:'Máquinas e operadores partilhados por todas as ferramentas desta app.'+(S.admin?'':' Só os editores podem alterar.'),
        acts:S.admin?(t==='maq'?'<button class="btn primary" id="dNew">+ Máquina</button>':'<button class="btn" id="dImp">Carregar lista</button><button class="btn primary" id="dNew">+ Operador</button>'):''})+
      (S.mode==='local'?'<div class="banner" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">Modo local: os dados vivem só neste browser. <button class="btn sm" id="bkExp">Exportar cópia</button><label class="btn sm">Repor cópia<input type="file" id="bkImp" accept=".json" hidden></label></div>':'')+
      A.tabs('dm',[['maq','Máquinas ('+A.list('maquinas').length+')'],['op','Operadores ('+A.list('operadores').length+')']],t)+body;
  },
  bind:function(r){
    var t=A.tab('dm','maq');
    if($('dNew')) $('dNew').onclick=function(){ t==='maq'?maqForm():opForm() };
    if($('dImp')) $('dImp').onclick=opImport;
    if($('bkExp')) $('bkExp').onclick=function(){ var b=new Blob([S.store.exportar()],{type:'application/json'}), a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='flow-backup-'+A.today()+'.json'; a.click() };
    if($('bkImp')) $('bkImp').onchange=function(e){ var f=e.target.files[0]; if(!f) return; f.text().then(function(t){ try{ S.store.importar(t); A.toast('Cópia de segurança reposta.') }catch(x){ A.toast('Ficheiro inválido.') } }) };
    A.bindRows(r,function(id){ t==='maq'? maqForm(A.get('maquinas',id)) : opForm(A.get('operadores',id)) });
  }
});

/* ---------- perfis ---------- */
async function setRole(uid, role, on){
  var p=JSON.parse(JSON.stringify(A.cfg('perfis').users||{})), r=p[uid]||[];
  if(on && r.indexOf(role)<0) r.push(role); if(!on) r=r.filter(function(x){return x!==role});
  if(r.length) p[uid]=r; else delete p[uid];
  await A.put('config','perfis',{users:p});
}
A.register('perfis',{
  html:function(){
    var users=A.cfg('perfis').users||{}; A.names(Object.keys(users).concat(S.uid?[S.uid]:[])).then(function(ch){ if(ch && S.route==='perfis') A.render() });
    return A.head({c:C,mod:'Configuração',title:'Perfis',p:'Quem faz o quê. Enquanto um perfil não tiver pessoas, a ação fica aberta a todos os que podem escrever. Os editores da app podem fazer tudo.'})+
      (S.admin?'':'<div class="banner">Só os editores da app alteram perfis.</div>')+
      '<div class="grid2">'+Object.keys(A.ROLES).map(function(r){ var u=A.roleUsers(r);
        return '<div class="panel"><div class="ph"><h2>'+esc(A.ROLES[r])+'</h2><span class="small muted">'+(u.length? u.length+' pessoa'+(u.length>1?'s':'') : 'aberto a todos')+'</span></div>'+
          '<p class="small muted" style="margin:0 0 10px">'+{stock:'Dá entrada de cauchos em stock e elimina reservas de verniz.',tecnico:'Edita e elimina intervenções técnicas e altera os limites das águas.',qualidade:'Elimina incidências FII/FIQ e controlos de cartolina.'}[r]+'</p>'+
          (u.length?'<div style="display:grid;gap:6px;margin-bottom:10px">'+u.map(function(id){ return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;background:var(--surface-2);border-radius:8px"><span>'+esc(A.uname(id))+'</span>'+(S.admin?'<button class="btn sm ghost" data-rm="'+esc(id)+'|'+r+'">Remover</button>':'')+'</div>' }).join('')+'</div>':'')+
          (S.admin?'<div style="position:relative"><input class="psearch" data-role="'+r+'" placeholder="Procurar pessoa para adicionar…" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px 10px"><div class="pres" style="display:grid;gap:4px;margin-top:6px"></div></div>':'')+'</div>' }).join('')+'</div>';
  },
  bind:function(r){
    r.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick=async function(){ var p=b.dataset.rm.split('|'); try{ await setRole(p[0],p[1],false); A.toast('Removido.') }catch(e){ A.toast('Não foi possível alterar.') } } });
    r.querySelectorAll('.psearch').forEach(function(inp){
      var box=inp.nextElementSibling, tm;
      var run=async function(){ if(!S.user||!S.user.search){ box.innerHTML='<span class="small muted">Pesquisa de pessoas indisponível.</span>'; return }
        try{ var hits=await S.user.search(inp.value.trim()); box.innerHTML=(hits||[]).slice(0,6).map(function(h){ return '<button class="btn sm" style="justify-content:flex-start" data-add="'+esc(h.id)+'">+ '+esc(h.name||'Sem nome')+'</button>' }).join('')||'<span class="small muted">Ninguém encontrado.</span>';
          box.querySelectorAll('[data-add]').forEach(function(b){ b.onclick=async function(){ S.names[b.dataset.add]=b.textContent.slice(2); try{ await setRole(b.dataset.add, inp.dataset.role, true); A.toast('Adicionado.') }catch(e){ A.toast('Não foi possível alterar.') } } });
        }catch(e){ box.innerHTML='<span class="small muted">Pesquisa indisponível.</span>' } };
      inp.addEventListener('focus',run); inp.addEventListener('input',function(){ clearTimeout(tm); tm=setTimeout(run,250) });
    });
  }
});
})();
