/* Início, dados mestre (máquinas, operadores) e perfis. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, C='var(--c-cfg)';

var TDESC={entregas:'Camiões do dia a partir do SAP, sequência por distância, mapa, pedido SAP e email.',requisicoes:'Correias com foto: pedir ao armazém e seguir a entrega.',verniz:'Armazenamento das reservas de verniz por máquina: cortante, posição/cor e SAP.',cauchos:'Requisição de cauchos e tiragem por máquina e corpo.',intervencoes:'Avarias, estado por corpo, rolos, densidades.','ficha-imp':'Corpos, anilox, rolos com esquema e consumíveis (MM).','offset-print':'App Offset Print: densidades, garras, anilox, consumíveis, rolagem e troca de rolos.',aguas:'Osmose e molhas: álcool, condutividade, pH.',
  'intervencoes-cv':'Mapeamento e limpeza do cofre de corte.',cargas:'Mapa de entregas → equipas por turno, distribuição pelos uptimes.',specs:'Biblioteca de specs por MM (SAP), criar MM em falta e PDFs de paletização.',
  incidencias:'FII internas e FIQ de clientes, com histórico desde 2024.',fornecedores:'Não conformidades de fornecedores, custos e créditos.',cartolina:'Até 20 medições de gramagem e espessura por receção, com relatório.',ensaios:'Deslizamento de verniz e cartolina, características e rebentamento, com objetivo e gráfico.',laboratorio:'Todos os ensaios numa tabela: cartolina, deslizamento, rebentamento, força de vincos, COBB.',
  email:'Envio automático de emails (Apps Script) e destinatários de cada serviço.',painel:'Números-chave de todas as ferramentas.','ind-qualidade':'FII, FIQ e fornecedores: tendências, Pareto, custos.'};
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
    var rec=lsGet('flow_recent',[]).filter(function(x){return A.TOOLS[x] && A.sectorOf(x)});
    var nT=0; A.SECTORS.forEach(function(s){ nT+=items(s).filter(function(i){return !i.off}).length });
    var secs=A.SECTORS.filter(function(s){ return !q || (s.nome+' '+items(s).map(function(i){return i.n}).join(' ')).toLowerCase().indexOf(q)>=0 });
    var semMaq=!A.list('maquinas').length, semOp=!A.list('operadores').length;
    return '<div class="hero-img"><img src="assets/banner.jpg" alt="FLOW · Graphicsleader: do escritório à expedição"></div>'+
      '<section class="band"><div class="band-in"><div><div class="eb">'+esc(new Date().toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long'}))+' · Graphicsleader</div>'+
      '<h1>'+(h<6||h>=20?'Boa noite':h<13?'Bom dia':'Boa tarde')+(nome&&S.mode!=='local'?', '+esc(nome):'')+'.</h1><p>Todas as ferramentas da fábrica num só sítio, organizadas por setor. Escolha o setor no topo ou procure aqui.</p></div>'+
      '<div class="stats"><div class="stat"><b>'+A.SECTORS.length+'</b><span>setores</span></div><div class="stat"><b>'+nT+'</b><span>ferramentas ativas</span></div></div>'+
      '<div class="quick"><input id="hq" type="search" placeholder="Procurar setor ou ferramenta…" value="'+esc(S._hq||'')+'">'+'<a class="qa" href="#posto" style="margin-left:4px"><i style="background:var(--brand)"></i>Modo posto (tablet)</a><button class="qa" type="button" onclick="OF.pesquisa()" style="border:0;cursor:pointer"><i style="background:var(--c-emb)"></i>Abrir OF / MM</button>'+(rec.length?'<span class="lbl" style="margin-left:8px">Recentes</span>'+rec.map(function(x){ var s=A.sectorOf(x); return '<a class="qa" href="#'+x+'"><i style="background:'+s.c+'"></i>'+esc(A.TOOLS[x])+'</a>' }).join(''):'')+'</div></div></section>'+
      (A.inicioExtra? A.inicioExtra() : '')+
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
/* estado: máquinas ativa/parada/obsoleta, operadores ativo/inativo/saiu. "ativo" (true/false) continua a ser o que filtra as listas (A.maquinas, A.operadores). */
var MAQ_EST=[['ativa','Ativa'],['parada','Parada (temporariamente)'],['obsoleta','Obsoleta (já não existe)']], OP_EST=[['ativo','Ativo'],['inativo','Inativo (baixa, férias, ausência)'],['saiu','Já não disponível (saiu da empresa / do setor)']];
function maqEstado(m){ return !m? 'ativa' : m.estado || (m.ativo===false? 'parada' : 'ativa') }
function opEstado(o){ return !o? 'ativo' : o.estado || (o.ativo===false? 'inativo' : 'ativo') }
var EST_PILL={ativa:['ok','Ativa'],parada:['warn','Parada'],obsoleta:['mute','Obsoleta'],ativo:['ok','Ativo'],inativo:['warn','Inativo'],saiu:['mute','Já não disponível']};
function estPill(e){ var p=EST_PILL[e]||['mute',e]; return '<span class="pill '+p[0]+'">'+esc(p[1])+'</span>' }
var ORD={ativa:0,ativo:0,parada:1,inativo:1,obsoleta:2,saiu:2};
function maqForm(m){
  if(!S.admin){ A.toast('Só um editor altera os dados mestre.'); return }
  var edit=!!m;
  A.openForm({title:edit?'Editar máquina':'Nova máquina', values:Object.assign({aliasesTxt:((m&&m.aliases)||[]).join(', ')}, m||{setor:'Impressão',corpos:6,verniz:true}, {estado:maqEstado(m)}),
    fields:[{k:'nome',l:'Nome oficial',req:1,ph:'ex. XL105'},{k:'modelo',l:'Modelo'},{k:'setor',l:'Setor',t:'select',o:A.SETORES,req:1},{k:'velocidade',l:'Velocidade nominal (un./h)',t:'number',help:'Base do cálculo da performance no OEE'},
      {k:'corpos',l:'N.º de corpos de impressão',t:'number',help:'Para as posições dos cauchos'},{k:'verniz',l:'Tem torre de verniz',t:'check'},{k:'torres',l:'N.º de torres de verniz',t:'number',help:'Ex.: 2 na Roland 908 (9 CI e 10 CI). Vazio = 1 se tiver torre'},{k:'estado',l:'Estado',t:'select',req:1,o:MAQ_EST,help:'Parada ou obsoleta: deixa de aparecer nas listas de escolha; o histórico mantém-se.'},
      {k:'aliasesTxt',l:'Outros nomes usados',full:1,help:'Separados por vírgulas, ex.: R908, Roland 908. Os registos com estes nomes passam a contar como esta máquina.'}],
    del: edit? function(){ return A.del('maquinas',m.id) } : null,
    submit:function(x){ x.aliases=String(x.aliasesTxt||'').split(',').map(function(s){return s.trim()}).filter(Boolean); delete x.aliasesTxt; x.ativo=x.estado==='ativa';
      if(edit) return A.put('maquinas',m.id,Object.assign({},A.clean(m),x)); return A.add('maquinas',x) }});
}
function opForm(o){
  if(!S.admin){ A.toast('Só um editor altera os dados mestre.'); return }
  var edit=!!o;
  var tem=String((o&&o.maquina)||'').split(',').map(function(x){ return A.norm(A.canon('maquina',x.trim())) }).filter(Boolean);
  var maqs=A.list('maquinas').filter(function(m){ return maqEstado(m)!=='obsoleta' }).sort(function(a,b){ return String(a.setor).localeCompare(String(b.setor)) || String(a.nome).localeCompare(String(b.nome)) });
  var turnos={}; A.list('operadores').forEach(function(x){ if(x.turno) turnos[x.turno]=1 }); ['06–14h','14–22h','22–06h','Normal (08–17h)'].forEach(function(t){ turnos[t]=1 });
  A.openForm({title:edit?'Editar operador':'Novo operador', values:Object.assign({}, o||{setor:'Impressão'}, {estado:opEstado(o)}),
    fields:[{k:'nome',l:'Nome',req:1},{k:'numero',l:'N.º de colaborador'},{k:'setor',l:'Setor',t:'select',o:A.SETORES},{k:'funcao',l:'Função',ph:'ex. Operador, Ajudante, Supervisor'},
      {k:'turno',l:'Turno',list:'dlTurno',ph:'ex. 06–14h'},
      {k:'estado',l:'Estado',t:'select',req:1,o:OP_EST,help:'Inativo ou já não disponível: deixa de aparecer nas listas de escolha (turnos, registos); o histórico mantém-se.'},
      {k:'obs',l:'Observações',ph:'ex. baixa até 15/12, formação na XL105',full:1},
      {t:'html',html:'<datalist id="dlTurno">'+Object.keys(turnos).map(function(t){ return '<option value="'+esc(t)+'">' }).join('')+'</datalist>'+
        '<div class="sep" style="margin-top:4px">Máquinas a que está alocado</div><div class="chips" id="opMaq">'+(maqs.length? maqs.map(function(m){ var on=tem.indexOf(A.norm(m.nome))>=0;
          return '<label class="chip'+(on?' on':'')+'"><input type="checkbox" value="'+esc(m.nome)+'"'+(on?' checked':'')+'>'+esc(m.nome)+'<small>'+esc(m.setor||'')+'</small></label>' }).join('') : '<span class="small muted">Ainda sem máquinas nos dados mestre.</span>')+'</div>'}],
    after:function(box){ box.querySelectorAll('#opMaq input').forEach(function(i){ i.onchange=function(){ i.parentNode.classList.toggle('on',i.checked) } }) },
    del: edit? function(){ return A.del('operadores',o.id) } : null,
    submit:function(x){ x.maquina=[].slice.call(document.querySelectorAll('#opMaq input:checked')).map(function(i){ return i.value }).join(', '); x.ativo=x.estado==='ativo';
      if(edit) return A.put('operadores',o.id,Object.assign({},A.clean(o),x)); return A.add('operadores',x) }});
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
/* ---------- lista de colaboradores dos RH (N.º · Nome · Centro · Posto · Descrição do posto) ----------
   Junta com os operadores que já existem (pelo n.º, depois pelo nome), deduz setor e máquina a partir do posto
   e manda as dúvidas para o sino do master (flow_sugestoes, tipo "dados"). Nada é apagado. */
var POSTO_SETOR=[[/^PIMP/,'Impressão'],[/^PCVI/,'Corte e Vinco'],[/^PCOL/,'Colagem'],[/^PCCO/,'Contracolagem'],[/^PACEMB/,'Embalamento'],[/^PLOG05/,'Supply Chain'],[/^PLOG/,'Logística'],
  [/^PGUI/,'Guilhotinas'],[/^PCORT/,'Pasaban'],[/^PMAN/,'Manutenção'],[/^PDPL02/,'Supply Chain'],[/^PDPL/,'Produção'],[/^PMFEQ/,'Produção']];
var POSTO_MAQ=[[/CD ?6/i,'CD6'],[/CD ?2/i,'CD2'],[/XL ?105/i,'XL105'],[/Roland ?900/i,'R900'],[/142 ?E/i,'B142E'],[/SP ?142/i,'B142'],[/SP ?104/i,'B104'],[/Spa?n?thera|Spantera/i,'B145'],
  [/Sprintera/i,'B106'],[/Master ?Fold/i,'BMASTER'],[/Vision/i,'BVISION'],[/IOBOX/i,'IOBOX'],[/C ?165/i,'C165']];
function rhLinhas(rows){
  return rows.map(function(c){ c=c.map(function(x){ return String(x==null?'':x).trim() });
    var iP=c.findIndex(function(x){ return /^P[A-Z]{2,}\d{1,3}$/.test(x) }); if(iP<0) return null;
    var iN=c.findIndex(function(x,i){ return i<iP && /^\d{1,6}$/.test(x) }), nome='';
    for(var i=(iN>=0?iN+1:0); i<iP; i++){ if(c[i] && /[a-zà-ú]/i.test(c[i]) && !/^COO/i.test(c[i]) && c[i]!=='TT'){ nome=c[i]; break } }
    if(!nome) return null;
    var centro=c.slice(0,iP).filter(function(x){ return /^COO/i.test(x) })[0]||'';
    return {numero:iN>=0?c[iN]:'', nome:nome.replace(/\s+/g,' '), centro:centro, posto:c[iP], postoDesc:c[iP+1]||''} }).filter(Boolean);
}
function rhPlano(L){
  var ops=A.list('operadores'), duv=[], semMaq={}, usados={}, plano=[];
  var w=function(s){ return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z]+/).filter(function(x){ return x.length>1 && ['de','da','do','dos','das'].indexOf(x)<0 }) };
  L.forEach(function(r){
    var ps=POSTO_SETOR.filter(function(p){ return p[0].test(r.posto) })[0], mq=POSTO_MAQ.filter(function(p){ return p[0].test(r.postoDesc) })[0];
    var setor=ps? ps[1] : '', maq=mq? A.canon('maquina',mq[1]) : '';
    if(!ps) duv.push('Posto '+r.posto+' ('+r.postoDesc+') de '+r.nome+': em que setor fica? Ficou sem setor.');
    if(mq && !A.known('maquina',mq[1])) (semMaq[mq[1]]=semMaq[mq[1]]||[]).push(r.nome);
    var ex=r.numero? ops.filter(function(o){ return String(o.numero||'')===r.numero })[0] : null, como='n.º';
    if(!ex){ ex=ops.filter(function(o){ return A.norm(o.nome)===A.norm(r.nome) })[0]; como='nome' }
    if(!ex){ var a=w(r.nome); var cand=ops.filter(function(o){ var b=w(o.nome); return !usados[o.id] && b.length && a.length && a[0]===b[0] && a[a.length-1]===b[b.length-1] && (!o.numero || !r.numero) });
      if(cand.length===1){ ex=cand[0]; como='parecido'; duv.push('Juntei «'+r.nome+'» (n.º '+(r.numero||'–')+') com o operador que já existia «'+ex.nome+'». Se não for a mesma pessoa, corrija em Dados mestre › Operadores.') }
      else if(cand.length>1) duv.push('«'+r.nome+'» (n.º '+(r.numero||'–')+') pode ser '+cand.map(function(o){ return '«'+o.nome+'»' }).join(' ou ')+'. Carreguei como pessoa nova; se for repetida, elimine a duplicada.') }
    var novo={numero:r.numero, centro:r.centro, posto:r.posto, postoDesc:r.postoDesc};
    if(setor) novo.setor=setor; if(maq) novo.maquina=maq;
    if(ex){ usados[ex.id]=1; var o=Object.assign({},A.clean(ex));
      Object.keys(novo).forEach(function(k){ if(k==='setor' && o.setor) return; /* o setor já definido manda (ex.: equipas do Embalamento) */ if(k==='maquina' && o.maquina && A.norm(o.maquina).indexOf(A.norm(maq))>=0) return; if(k==='maquina' && o.maquina){ o.maquina=o.maquina+', '+maq; return } o[k]=novo[k] });
      if(!o.estado) o.estado=o.ativo===false?'inativo':'ativo';
      if(o.estado==='saiu') duv.push('«'+ex.nome+'» está como "já não disponível" mas aparece na lista dos RH (posto '+r.posto+'). Voltou?');
      if(JSON.stringify(o)!==JSON.stringify(A.clean(ex))) plano.push({op:'put', id:ex.id, o:o, n:r.nome, como:como}) }
    else plano.push({op:'add', o:Object.assign({nome:r.nome, estado:'ativo', ativo:true}, novo), n:r.nome});
  });
  Object.keys(semMaq).forEach(function(m){ duv.push('A máquina «'+m+'» aparece nos postos de '+semMaq[m].length+(semMaq[m].length===1?' colaborador (':' colaboradores (')+semMaq[m].slice(0,4).join(', ')+(semMaq[m].length>4?'…':'')+') mas não está nos dados mestre. Crie-a em Qualidade dos dados › “+ Máquina” (ativa).') });
  var fora=ops.filter(function(o){ return !usados[o.id] && (o.estado||'ativo')==='ativo' && o.ativo!==false });
  if(fora.length && L.length>=30) duv.push(fora.length+' operadores ativos não aparecem na lista dos RH: '+fora.map(function(o){ return o.nome }).join(', ')+'. Saíram? Se sim, marque-os como “já não disponível” em Dados mestre › Operadores.');
  return {plano:plano, duv:duv};
}
function rhImport(){
  if(!A.master()){ A.toast('Só o nível master carrega a lista de colaboradores.'); return }
  A.showModal('<h2>Carregar colaboradores</h2><p class="muted" style="margin:0">Ficheiro Excel dos RH ou cole as linhas copiadas do Excel, com as colunas <b>N.º · Nome · Centro · Posto · Descrição do posto</b>. Junta com os operadores que já existem (pelo n.º e pelo nome), preenche setor e máquina a partir do posto e <b>não apaga ninguém</b>. As dúvidas chegam ao seu sino.</p>'+
    '<label class="fld">Ficheiro Excel<input type="file" id="rhF" accept=".xlsx,.xls,.csv"></label>'+
    '<label class="fld">ou cole aqui<textarea id="rhT" rows="6" placeholder="19&#9;Joaquim Ferreira&#9;COO&#9;PIMP03&#9;IMP CT Heidelb. CD6"></textarea></label><div id="rhS" class="small"></div>'+
    '<div class="foot"><button class="btn" id="rhX">Fechar</button><button class="btn primary" id="rhOk" disabled>Carregar</button></div>',
  function(){
    var P=null; $('rhX').onclick=A.closeModal;
    var ver=function(rows){ var L=rhLinhas(rows); if(!L.length){ $('rhS').textContent='Não encontrei linhas com n.º, nome e posto (ex.: PIMP03).'; $('rhOk').disabled=true; return }
      P=rhPlano(L); var c=function(op){ return P.plano.filter(function(p){ return p.op===op }).length };
      $('rhS').innerHTML='<b>'+L.length+'</b> colaboradores lidos · <b>'+c('add')+'</b> novos · <b>'+c('put')+'</b> a atualizar · <b style="color:var(--warn)">'+P.duv.length+'</b> dúvidas para o sino'+(P.duv.length?'<ul style="margin:6px 0 0;padding-left:18px">'+P.duv.slice(0,6).map(function(d){ return '<li>'+esc(d)+'</li>' }).join('')+(P.duv.length>6?'<li>…</li>':'')+'</ul>':'');
      $('rhOk').disabled=!P.plano.length && !P.duv.length };
    $('rhT').oninput=function(){ ver(this.value.split(/\r?\n/).map(function(l){ return l.split('\t') })) };
    $('rhF').onchange=async function(e){ var f=e.target.files[0]; if(!f) return; $('rhS').textContent='A ler…';
      try{ await A.loadX(); var wb=XLSX.read(await f.arrayBuffer(),{type:'array'}), rows=[]; wb.SheetNames.forEach(function(n){ rows=rows.concat(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})) }); ver(rows) }
      catch(err){ $('rhS').textContent='Não foi possível ler o ficheiro.' } };
    $('rhOk').onclick=async function(){ this.disabled=true; $('rhS').textContent='A gravar…';
      try{ for(var i=0;i<P.plano.length;i++){ var p=P.plano[i]; if(p.op==='add') await A.add('operadores',p.o); else await A.put('operadores',p.id,p.o) }
        for(var j=0;j<P.duv.length;j++) await S.db.collection('sugestoes').add({tipo:'dados', uid:S.uid, nome:'Lista de colaboradores', email:'', texto:P.duv[j], em:A.nowIso(), lida:false, ecra:'dados'});
        A.closeModal(); A.toast(P.plano.length+' operadores gravados'+(P.duv.length?' · '+P.duv.length+' dúvidas no sino':'')+'.') }
      catch(err){ $('rhS').textContent='Parou com erro: '+esc(err&&err.message||err); this.disabled=false } };
  });
}
/* nível master: conta beta ou e-mail listado em FLOW_CONFIG.masters (modo local = tudo) */
A.master=function(){ var M=((window.FLOW_CONFIG||{}).masters||[]).map(function(x){return String(x).toLowerCase()}), u=S.user||{};
  return S.mode==='local' || (!!u.conta && M.indexOf(String(u.conta).toLowerCase())>=0) || (!!S.email && M.indexOf(S.email)>=0) };
/* ficheiro de dados mestre: Excel com uma folha por coleção; a coluna id liga cada linha ao registo.
   Ao carregar: linha com id = atualiza (só se mudou), sem id = novo, "apagar" = sim elimina. Linhas que faltam no ficheiro ficam como estão. */
var DM=[['maquinas','Máquinas',['id','nome','modelo','setor','ano','formatoMax','velocidade','corpos','verniz','torres','estado','ativo','aliases']],
        ['operadores','Operadores',['id','nome','numero','setor','maquina','turno','funcao','formacao','obs','estado','ativo']]];
var DM_BOOL={verniz:1,ativo:1,formacao:1}, DM_NUM={ano:1,velocidade:1,corpos:1,torres:1}, DM_ARR={aliases:1};
function dmCel(k,v){ if(v==null) return ''; if(Array.isArray(v)) return v.join(', '); if(typeof v==='boolean') return v?'Sim':'Não'; return v }
function dmVal(k,v,old){ var s=String(v==null?'':v).trim();
  if(DM_ARR[k]||Array.isArray(old)) return s? s.split(',').map(function(x){return x.trim()}).filter(Boolean) : [];
  if(DM_BOOL[k]||typeof old==='boolean') return /^(s|sim|x|1|true|verdadeiro)$/i.test(s);
  if(s==='') return null;
  if(DM_NUM[k]||typeof old==='number'){ var n=A.num(s); return n==null? s : n }
  return s }
async function dmExport(){
  if(!A.master()){ A.toast('Só o nível master exporta os dados mestre.'); return }
  await A.loadX(); var wb=XLSX.utils.book_new();
  DM.forEach(function(d){ var docs=A.list(d[0]).slice().sort(A.by('nome')), cols=d[2].slice();
    docs.forEach(function(o){ Object.keys(o).forEach(function(k){ if(cols.indexOf(k)<0 && k.charAt(0)!=='_') cols.push(k) }) });
    var aoa=[cols.concat(['apagar'])].concat(docs.map(function(o){ return cols.map(function(k){ return dmCel(k,o[k]) }).concat(['']) }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), d[1]) });
  XLSX.writeFile(wb, 'FLOW_Dados_mestre_'+A.today()+'.xlsx'); A.toast('Ficheiro de dados mestre descarregado.');
}
function dmImport(){
  if(!A.master()){ A.toast('Só o nível master carrega os dados mestre.'); return }
  A.showModal('<h2>Carregar dados mestre</h2><p class="muted" style="margin:0">Use o ficheiro descarregado em “Exportar dados mestre”, corrigido. Linhas com <b>id</b> atualizam o registo; linhas sem id são novas; escreva <b>sim</b> na coluna <b>apagar</b> para eliminar. O que não estiver no ficheiro não é alterado.</p>'+
    '<label class="fld">Ficheiro Excel<input type="file" id="dmF" accept=".xlsx,.xls"></label><div id="dmS" class="small"></div>'+
    '<div class="foot"><button class="btn" id="dmX">Fechar</button><button class="btn primary" id="dmOk" disabled>Carregar</button></div>',
  function(){
    var plano=null; $('dmX').onclick=A.closeModal;
    $('dmF').onchange=async function(e){ var f=e.target.files[0]; if(!f) return; $('dmS').textContent='A ler…';
      try{ await A.loadX(); var wb=XLSX.read(await f.arrayBuffer(),{type:'array'}); plano=[];
        DM.forEach(function(d){ var ws=wb.Sheets[d[1]]; if(!ws) return; var rows=XLSX.utils.sheet_to_json(ws,{defval:''});
          rows.forEach(function(r){ var id=String(r.id||'').trim(), old=id? A.get(d[0],id) : null, del=/^(s|sim|x|1)$/i.test(String(r.apagar||'').trim());
            if(!String(r.nome||'').trim() && !del) return;
            if(del){ if(old) plano.push({op:'del',col:d[0],id:id,n:old.nome}); return }
            var o={}; Object.keys(r).forEach(function(k){ if(k==='id'||k==='apagar'||k.charAt(0)==='_') return; var v=dmVal(k,r[k],old&&old[k]); if(v!==null) o[k]=v });
            if(!old){ plano.push({op:'add',col:d[0],o:o,n:o.nome}); return }
            var novo=Object.assign({},A.clean(old),o); Object.keys(old).forEach(function(k){ if(k in r && old[k]!=='' && old[k]!=null && dmVal(k,r[k],old[k])===null) delete novo[k] });
            if(JSON.stringify(novo)!==JSON.stringify(A.clean(old))) plano.push({op:'put',col:d[0],id:id,o:novo,n:o.nome}) }) });
        var c=function(op){ return plano.filter(function(p){return p.op===op}).length };
        $('dmS').innerHTML=plano.length? '<b>'+c('put')+'</b> a atualizar · <b>'+c('add')+'</b> novos · <b style="color:var(--bad)">'+c('del')+'</b> a eliminar'+(c('del')?': '+esc(plano.filter(function(p){return p.op==='del'}).map(function(p){return p.n}).join(', ')):'') : 'Nada mudou em relação ao que está guardado.';
        $('dmOk').disabled=!plano.length }
      catch(err){ $('dmS').textContent='Não foi possível ler o ficheiro.'; plano=null } };
    $('dmOk').onclick=async function(){ this.disabled=true; $('dmS').textContent='A gravar…';
      try{ for(var i=0;i<plano.length;i++){ var p=plano[i]; if(p.op==='add') await A.add(p.col,p.o); else if(p.op==='put') await A.put(p.col,p.id,p.o); else await A.del(p.col,p.id) }
        A.closeModal(); A.toast(plano.length+' alterações gravadas.') }
      catch(err){ $('dmS').textContent='Parou com erro: '+esc(err&&err.message||err); this.disabled=false } };
  });
}
A.register('dados',{
  html:function(){
    var t=A.tab('dm','maq');
    var body = t==='maq'? A.table(A.list('maquinas').slice().sort(function(a,b){ return ORD[maqEstado(a)]-ORD[maqEstado(b)] || String(a.nome).localeCompare(String(b.nome)) }),[{l:'Máquina',v:function(m){return '<b>'+esc(m.nome)+'</b>'}},{l:'Modelo',v:function(m){return '<span class="small">'+esc(m.modelo||'–')+'</span>'}},{l:'Setor',v:function(m){return esc(m.setor||'–')}},{l:'Ano',n:1,v:function(m){return m.ano||'–'}},{l:'Formato máx.',v:function(m){return '<span class="mono small">'+esc(m.formatoMax||'–')+'</span>'}},{l:'Velocidade',n:1,v:function(m){return m.velocidade?fmt(m.velocidade,0)+'/h':'–'}},{l:'Corpos',n:1,v:function(m){return m.corpos||'–'}},{l:'Verniz',v:function(m){return m.verniz===false?'Não':'Sim'}},{l:'Estado',v:function(m){return estPill(maqEstado(m))}}],{click:1,empty:'Ainda sem máquinas.'})
      : A.table(A.list('operadores').slice().sort(function(a,b){ return ORD[opEstado(a)]-ORD[opEstado(b)] || String(a.nome).localeCompare(String(b.nome)) }),[{l:'Nome',v:function(o){return '<b>'+esc(o.nome)+'</b>'}},{l:'N.º',v:function(o){return esc(o.numero||'–')}},{l:'Setor',v:function(o){return esc(o.setor||'–')}},{l:'Máquina',v:function(o){return esc(o.maquina||'–')}},{l:'Turno',v:function(o){return '<span class="mono small">'+esc(o.turno||'–')+'</span>'}},{l:'Função',v:function(o){return esc(o.funcao||'–')+(o.formacao?' <span class="pill info">formação</span>':'')+(o.obs?' <span class="pill mute">'+esc(o.obs)+'</span>':'')}},{l:'Estado',v:function(o){return estPill(opEstado(o))}}],{click:1,empty:'Ainda sem operadores. Use “Carregar lista”.'});
    return A.head({c:C,mod:'Configuração',title:'Dados mestre',p:'Máquinas e operadores partilhados por todas as ferramentas desta app.'+(S.admin?'':' Só os editores podem alterar.'),
        acts:(A.master()?'<button class="btn" id="dmExp">Exportar dados mestre</button><button class="btn" id="dmImp">Carregar dados mestre</button>':'')+(A.master()&&t==='op'?'<button class="btn" id="dRh">Carregar colaboradores</button>':'')+(S.admin?(t==='maq'?'<button class="btn primary" id="dNew">+ Máquina</button>':'<button class="btn" id="dImp">Carregar lista</button><button class="btn primary" id="dNew">+ Operador</button>'):'')})+
      (S.mode==='local'?'<div class="banner" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">Modo local: os dados vivem só neste browser. <button class="btn sm" id="bkExp">Exportar cópia</button><label class="btn sm">Repor cópia<input type="file" id="bkImp" accept=".json" hidden></label></div>':'')+
      A.tabs('dm',[['maq','Máquinas ('+A.list('maquinas').length+')'],['op','Operadores ('+A.list('operadores').length+')']],t)+body;
  },
  bind:function(r){
    var t=A.tab('dm','maq');
    if($('dNew')) $('dNew').onclick=function(){ t==='maq'?maqForm():opForm() };
    if($('dImp')) $('dImp').onclick=opImport;
    if($('dRh')) $('dRh').onclick=rhImport;
    if($('dmExp')) $('dmExp').onclick=function(){ dmExport().catch(function(){ A.toast('Não foi possível exportar.') }) };
    if($('dmImp')) $('dmImp').onclick=dmImport;
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
      (S.nivel?'<div class="banner">Com o login por e-mail, as permissões dão-se em <a href="#utilizadores">Configuração › Utilizadores</a>. Esta página deixa de contar.</div>':'')+(S.admin?'':'<div class="banner">Só os editores da app alteram perfis.</div>')+
      '<div class="grid2">'+Object.keys(A.ROLES).map(function(r){ var u=A.roleUsers(r);
        return '<div class="panel"><div class="ph"><h2>'+esc(A.ROLES[r])+'</h2><span class="small muted">'+(u.length? u.length+' pessoa'+(u.length>1?'s':'') : 'aberto a todos')+'</span></div>'+
          '<p class="small muted" style="margin:0 0 10px">'+{stock:'Dá entrada de cauchos em stock e elimina reservas de verniz.',tecnico:'Edita e elimina intervenções técnicas e altera os limites das águas.',qualidade:'Elimina incidências FII/FIQ, controlos de cartolina e ensaios.',logistica:'Edita o mapa de entregas: camiões, recebedores e códigos de transporte.'}[r]||''+'</p>'+
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

/* =============== EMAIL (transversal a todo o FLOW) ===============
   Um Google Apps Script próprio do FLOW (scripts/email-apps-script.gs) envia os emails de todos os serviços.
   URL e token ficam em config/email (base de dados), nunca no código: o site é público.
   A.mail.send(to, cc, assunto, texto, anexos) — usado pelo relatório PDF de qualidade; as requisições leem o mesmo config/email. */
var SCRIPT_GH='https://github.com/jscampos87/FLOW/blob/main/scripts/email-apps-script.gs';
function mcfg(){ return A.cfg('email')||{} }
function lista(v){ return (Array.isArray(v)? v : String(v||'').split(/[\s,;]+/)).map(function(x){return String(x).trim()}).filter(Boolean) }
A.mail={
  cfg:mcfg,
  ok:function(){ var c=mcfg(); return !!(c.scriptUrl&&c.token) },
  send:async function(to, cc, subject, message, attachments){
    var c=mcfg(); if(!c.scriptUrl||!c.token) throw new Error('Envio de emails não configurado (Configuração › Email).');
    var r=await fetch(c.scriptUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:c.token,to:lista(to),cc:lista(cc),subject:subject,message:message,attachments:attachments||[]})});
    var j=null; try{ j=await r.json() }catch(e){}
    if(!r.ok||!j||!j.ok) throw new Error((j&&j.err)||('HTTP '+r.status));
    return j;
  },
  /* tradução pelo mesmo Apps Script (versão 2): devolve a lista de textos traduzidos de português para lang */
  traduzir:async function(textos, lang){
    var c=mcfg(); if(!c.scriptUrl||!c.token) throw new Error('Apps Script não configurado (Configuração › Email)');
    var r=await fetch(c.scriptUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:c.token,acao:'traduzir',de:'pt',para:lang,textos:textos})});
    var j=null; try{ j=await r.json() }catch(e){}
    if(j&&j.ok&&Array.isArray(j.textos)) return j.textos;
    if(j&&j.err==='sem destinatários') throw new Error('o Apps Script ainda é a versão antiga — atualize-o para a versão 2');
    throw new Error((j&&j.err)||('HTTP '+r.status));
  }
};
function mailForm(){
  if(!S.admin){ A.toast('Só um editor configura o envio de emails.'); return }
  var c=mcfg();
  A.openForm({title:'Ligação ao Apps Script', intro:'Cole o URL da implementação (termina em <b>/exec</b>) e o mesmo TOKEN que escreveu no script. Fica guardado na base de dados, não no código público.',
    values:{scriptUrl:c.scriptUrl||'', token:c.token||''},
    fields:[{k:'scriptUrl',l:'URL do Apps Script',req:1,full:1,ph:'https://script.google.com/macros/s/…/exec'},{k:'token',l:'Token',req:1,full:1}],
    validate:function(x){ if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(x.scriptUrl)) return 'O URL tem de ser do tipo https://script.google.com/macros/s/…/exec'; if(x.token.length<16) return 'Use um token com pelo menos 16 caracteres.' },
    submit:function(x){ return A.put('config','email',Object.assign({},A.clean(c),x)) }});
}
function reqForm(){
  if(!S.admin){ A.toast('Só um editor altera os destinatários.'); return }
  var c=mcfg();
  A.openForm({title:'Requisições de materiais', values:{requisicoes:c.requisicoes||((window.FLOW_CONFIG||{}).requisicoes||{}).email||''},
    fields:[{k:'requisicoes',l:'Destinatário das requisições (comprador)',req:1,full:1,ph:'nome@graphicsleader.pt'}],
    submit:function(x){ return A.put('config','email',Object.assign({},A.clean(c),x)) }});
}
async function verificar(){
  var c=mcfg(), el=$('emV'); if(!c.scriptUrl){ el.textContent='Sem URL configurado.'; return }
  el.textContent='A verificar…';
  try{ var j=await (await fetch(c.scriptUrl)).json(); el.innerHTML=j&&j.ok? '<span style="color:var(--ok)">Ligação OK</span> · '+esc(j.servico||'')+(j.versao>=2?' · versão '+esc(j.versao)+' (anexos e tradução)':' · <span style="color:var(--warn)">versão antiga: atualize o script (anexos e tradução)</span>')+' · quota restante hoje: '+esc(j.restante)+(/PCV/i.test(j.servico||'')?' · <span style="color:var(--warn)">este é o script do PCV, não o do FLOW</span>':'') : '<span style="color:var(--bad)">Resposta inesperada.</span>' }
  catch(e){ el.innerHTML='<span style="color:var(--bad)">Não foi possível contactar o script: '+esc(e.message||e)+'</span>'; return }
  /* token: pedido sem destinatários — com o token certo o script responde "sem destinatários" e não envia nada */
  try{ var k=await (await fetch(c.scriptUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:c.token,to:[],subject:'',message:''})})).json(), er=String((k&&k.err)||'');
    el.innerHTML+='<br>'+(/sem destinat/.test(er)? '<span style="color:var(--ok)">Token correto.</span>' :
      /TROCAR|por definir/.test(er)? '<span style="color:var(--bad)">O script implementado ainda tem o TOKEN por definir.</span> No Apps Script: escreva o token na linha const TOKEN › Guardar › Implementar › Gerir implementações › lápis › Versão: Nova versão › Implementar.' :
      /token/.test(er)? '<span style="color:var(--bad)">Token diferente do script.</span> Copie o valor da linha <span class="mono">const TOKEN = \'…\'</span> (sem as aspas) e cole-o em “Alterar ligação”. Se mudou o token no script, implemente uma Nova versão.' :
      '<span style="color:var(--warn)">Resposta do token: '+esc(er||'desconhecida')+'</span>') }
  catch(e){ el.innerHTML+='<br><span style="color:var(--warn)">Não foi possível testar o token.</span>' }
}
function teste(){
  A.openForm({title:'Enviar email de teste', intro:'Envia um email com um pequeno anexo, para confirmar também que o script aceita anexos (necessário para o relatório PDF de qualidade).',
    values:{para:''}, fields:[{k:'para',l:'Para',req:1,full:1,ph:'nome@graphicsleader.pt'}], ok:'Enviar teste', done:'Email de teste enviado.',
    submit:async function(x){
      var b64=btoa(unescape(encodeURIComponent('Teste de anexo do FLOW · '+new Date().toLocaleString('pt-PT'))));
      var j; try{ j=await A.mail.send(x.para,'','[FLOW] Teste de envio de email','Se recebeu este email, o envio automático do FLOW está a funcionar.\n\nEnviado de Configuração › Email.',[{name:'teste-flow.txt',mime:'text/plain',b64:b64}]) }
      catch(e){ throw A.uerr('Falhou: '+(e.message||e)) }
      A.put('config','email',Object.assign({},A.clean(mcfg()),{ultimoTeste:{em:A.nowIso(),para:x.para,anexos:!!j.anexos}})).catch(function(){});
      if(!j.anexos) setTimeout(function(){ A.toast('Email enviado, mas SEM anexo: o script ainda é a versão antiga. Atualize-o.') },300);
    }});
}
A.register('email',{
  html:function(){
    var c=mcfg(), ok=A.mail.ok(), rq=A.cfg('relqualidade')||{}, t=c.ultimoTeste;
    var pill=function(b,s,n){ return '<span class="pill '+(b?'ok':'warn')+'">'+(b?s:n)+'</span>' };
    var svc=[
      {id:'rq',n:'Requisições de materiais',d:'Email ao comprador com as linhas para o SAP.',to:c.requisicoes||'',ed:S.admin},
      {id:'rel',n:'Relatório de qualidade FII / FIQ (PDF)',d:'Mailing list do PDF de indicadores.'+(rq.lista&&rq.auto!==false?' Envio automático ao gerar.':''),to:[rq.lista,rq.cc&&'cc: '+rq.cc].filter(Boolean).join(' · '),ed:S.admin||A.can('qualidade')}
    ];
    return A.head({c:C,mod:'Configuração',title:'Email',p:'Envio automático de emails de todo o FLOW, por um Google Apps Script. Uma única ligação serve todos os serviços; cada serviço tem os seus destinatários.'})+
      (S.admin?'':'<div class="banner">Só os editores da app alteram a ligação.</div>')+
      '<div class="grid2"><div class="panel"><div class="ph"><h2>Ligação</h2>'+pill(ok,'Configurado','Por configurar')+'</div>'+
        '<dl class="detail"><div><dt>URL do Apps Script</dt><dd class="mono small" style="word-break:break-all">'+esc(c.scriptUrl||'–')+'</dd></div><div><dt>Token</dt><dd>'+(c.token?'definido (oculto)':'–')+'</dd></div>'+
        '<div><dt>Último teste</dt><dd>'+(t? esc(new Date(t.em).toLocaleString('pt-PT'))+' → '+esc(t.para)+(t.anexos?' · com anexo':' · <span style="color:var(--warn)">sem anexo (script antigo)</span>') : '–')+'</dd></div></dl>'+
        '<p id="emV" class="small muted" style="margin:8px 0"></p>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap">'+(S.admin?'<button class="btn primary" id="emCfg">'+(ok?'Alterar ligação':'Configurar ligação')+'</button>':'')+(ok?'<button class="btn" id="emVer">Verificar ligação</button><button class="btn" id="emTst">Enviar email de teste</button>':'')+'</div></div>'+
      '<div class="panel"><h2 style="margin-bottom:8px">Instalação (uma vez, ~5 min)</h2><ol style="margin:0;padding-left:20px;display:grid;gap:6px">'+
        '<li>Com a conta Google que vai enviar, abra <a href="https://script.google.com" target="_blank" rel="noopener">script.google.com</a> › <b>Novo projeto</b>, com o nome <b>FLOW Email</b>. Não altere o projeto do PCV.</li>'+
        '<li>Apague o que lá está e cole o ficheiro <a href="'+SCRIPT_GH+'" target="_blank" rel="noopener">scripts/email-apps-script.gs</a> (botão “Copy raw file”).</li>'+
        '<li>Na linha <span class="mono">const TOKEN</span>, troque <span class="mono">TROCAR_POR_UM_CODIGO_SECRETO</span> por um código seu (30 letras e números ao acaso). Guarde.</li>'+
        '<li>Escolha a função <b>teste</b> › <b>Executar</b> › autorize com a conta Google.</li>'+
        '<li><b>Implementar › Nova implementação</b> › tipo <b>Aplicação Web</b> · Executar como: <b>Eu</b> · Quem tem acesso: <b>Qualquer pessoa</b> › Implementar. Copie o URL (termina em /exec).</li>'+
        '<li>Aqui: <b>Configurar ligação</b> › cole o URL e o mesmo token › <b>Enviar email de teste</b>.</li></ol>'+
        '<p class="small muted" style="margin:10px 0 0">Para atualizar o script mais tarde: colar a versão nova › Guardar › Implementar › Gerir implementações › lápis › Versão: <b>Nova versão</b>. O URL mantém-se. Só envia para @graphicsleader.pt, @hinojosa.com e @hinojosagroup.com.</p></div></div>'+
      '<div class="panel" style="margin-top:14px"><h2 style="margin-bottom:8px">Destinatários por serviço</h2>'+
        A.table(svc,[{l:'Serviço',v:function(x){return '<b>'+esc(x.n)+'</b><div class="small muted">'+esc(x.d)+'</div>'}},{l:'Destinatários',v:function(x){return x.to?esc(x.to):'<span class="muted">por definir</span>'}},
          {l:'',v:function(x){return x.ed?'<button class="btn sm" data-svc="'+x.id+'">Alterar</button>':''}}])+'</div>';
  },
  bind:function(r){
    if($('emCfg')) $('emCfg').onclick=mailForm; if($('emVer')) $('emVer').onclick=verificar; if($('emTst')) $('emTst').onclick=teste;
    r.querySelectorAll('[data-svc]').forEach(function(b){ b.onclick=function(){ if(b.dataset.svc==='rq') reqForm(); else if(window.Q2&&Q2.listaForm) Q2.listaForm() } });
  }
});
})();
