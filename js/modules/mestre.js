/* Dados mestre únicos: nomes canónicos de máquinas, operadores e clientes, aliases para os nomes
   antigos/variantes, página "Qualidade dos dados", etiquetas QR e registo de alterações. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao;
var fv=I.fv, F=I.F, selOpts=I.selOpts, bindFilters=I.bindFilters, C='var(--c-cfg)';

/* ---------- normalização ---------- */
function norm(s){ return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'') }
function words(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z0-9]+/).filter(function(w){return w.length>1}) }
var cache=null;
function canonKey(){ return A.list('aliases').length+'/'+A.list('maquinas').length+'/'+A.list('operadores').length+'/'+(S._aliasStamp||0) }
function maps(){
  var k=canonKey(); if(cache&&cache.k===k) return cache;
  var c={k:k, maquina:{}, operador:{}, cliente:{}, alias:{maquina:{},operador:{},cliente:{}}};
  A.list('maquinas').forEach(function(m){ c.maquina[norm(m.nome)]=m.nome; if(m.modelo) c.maquina[norm(m.modelo)]=c.maquina[norm(m.modelo)]||m.nome; (m.aliases||[]).forEach(function(a){ c.maquina[norm(a)]=m.nome }) });
  A.list('operadores').forEach(function(o){ c.operador[norm(o.nome)]=o.nome; if(o.numero) c.operador[norm(o.numero)]=o.nome });
  c.ign={maquina:{},operador:{},cliente:{}};
  A.list('aliases').forEach(function(a){ if(!c.alias[a.tipo]) return; if(a.ignorar) c.ign[a.tipo][norm(a.de)]=1; else c.alias[a.tipo][norm(a.de)]=a.para });
  cache=c; return c;
}
/* devolve o nome canónico (ou o próprio valor se não houver correspondência) */
function canon(tipo, v){
  if(v==null||v==='') return v; var c=maps(), n=norm(v);
  return c.alias[tipo][n] || (c[tipo]&&c[tipo][n]) || v;
}
function known(tipo, v){ var c=maps(), n=norm(v); return !!(c.alias[tipo][n] || (c[tipo]&&c[tipo][n])) }
function canonInc(r){
  var o=null, set=function(k,t){ if(r[k]==null||r[k]==='') return; var v=canon(t,r[k]); if(v!==r[k]){ o=o||Object.assign({},r); o['_'+k]=r[k]; o[k]=v } };
  set('maqOrigem','maquina'); set('maqDetetou','maquina'); set('cliente','cliente'); set('opDetetou','operador');
  if(r.opOrigem){ var ops=String(r.opOrigem).split(',').map(function(x){ return canon('operador',x.trim()) }).join(', '); if(ops!==r.opOrigem){ o=o||Object.assign({},r); o._opOrigem=r.opOrigem; o.opOrigem=ops } }
  return o||r;
}
A.norm=norm; A.canon=canon; A.canonKey=canonKey; A.canonInc=canonInc; A.known=known;

/* ---------- sugestão de correspondência ---------- */
function lev(a,b){ if(a===b) return 0; var m=a.length,n=b.length; if(!m) return n; if(!n) return m; var p=[],i,j; for(j=0;j<=n;j++) p[j]=j;
  for(i=1;i<=m;i++){ var prev=p[0]; p[0]=i; for(j=1;j<=n;j++){ var t=p[j]; p[j]=Math.min(p[j]+1,p[j-1]+1,prev+(a[i-1]===b[j-1]?0:1)); prev=t } } return p[n] }
function sugerir(tipo, v, cands){
  var n=norm(v), best=null, bs=0;
  cands.forEach(function(c){ var cn=norm(c), s=0;
    if(tipo==='operador'){ var a=words(v), b=words(c), inter=a.filter(function(w){return b.indexOf(w)>=0}).length; s=inter? inter/Math.max(a.length,b.length)+(a[0]===b[0]?0.3:0) : 0 }
    else if(tipo==='maquina' && n.replace(/\D/g,'')!==cn.replace(/\D/g,'')) s=0;   /* B104 ≠ B106: números diferentes são máquinas diferentes */
    else { if(cn.indexOf(n)>=0||n.indexOf(cn)>=0) s=0.8*Math.min(n.length,cn.length)/Math.max(n.length,cn.length)+0.2; else { var d=lev(n,cn); s=1-d/Math.max(n.length,cn.length) } }
    if(s>bs){ bs=s; best=c } });
  return bs>=(tipo==='operador'?0.6:0.6)? best : '';
}

/* ---------- valores usados no histórico/registos ---------- */
function usados(tipo){
  var cnt={}, addv=function(v){ v=String(v==null?'':v).trim(); if(!v||/^(n\/?a|não aplic[aá]vel|-|–)$/i.test(v)) return; cnt[v]=(cnt[v]||0)+1 };
  var inc=(window.Qualidade? S._incRaw() : []);
  inc.forEach(function(i){
    if(tipo==='maquina'){ addv(i.maqOrigem); addv(i.maqDetetou) }
    if(tipo==='operador'){ String(i.opOrigem||'').split(',').forEach(addv); addv(i.opDetetou) }
    if(tipo==='cliente') addv(i.cliente);
  });
  return Object.keys(cnt).map(function(k){ return {v:k, n:cnt[k]} }).sort(function(a,b){ return b.n-a.n });
}
/* incidências sem normalização (para ver os nomes originais) */
S._incRaw=function(){ var H=S.hist, m={}; H.fii.forEach(function(r){ m[r.id]=r }); H.fiq.forEach(function(r){ m[r.id]=r }); A.list('incidencias').forEach(function(r){ if(!r._del) m[r.id]=r }); return Object.keys(m).map(function(k){return m[k]}) };

function canonList(tipo){
  if(tipo==='maquina') return A.list('maquinas').map(function(m){return m.nome}).sort();
  if(tipo==='operador') return A.list('operadores').map(function(o){return o.nome}).sort();
  /* clientes: não há lista mestre — os nomes "oficiais" são os destinos de alias + a variante mais usada de cada grupo */
  var set={}; A.list('aliases').filter(function(a){return a.tipo==='cliente' && a.para}).forEach(function(a){ set[a.para]=1 });
  usados('cliente').forEach(function(u){ if(!known('cliente',u.v)) set[u.v]=1 });
  return Object.keys(set).sort();
}
/* "Não é máquina / operador / cliente": fica registado e sai da lista do que falta resolver */
async function setIgnorar(tipo, de, sim){
  var id=tipo+'_'+A.idKey(norm(de)||de);
  if(sim) await A.put('aliases', id, {tipo:tipo, de:de, para:'', ignorar:true}); else if(A.get('aliases',id)) await A.del('aliases',id);
  S._aliasStamp=(S._aliasStamp||0)+1; S._incCache=null;
}
var NAO={maquina:'Não é máquina',operador:'Não é operador',cliente:'Ignorar'};
function novaMaq(nome){
  A.openForm({title:'Nova máquina: '+nome, intro:'Fica nos Dados mestre e os '+'registos com “'+esc(nome)+'” passam a contar nela. Desinstalada = <b>Obsoleta</b> (não aparece nas listas de escolha; o histórico mantém-se).',
    values:{nome:nome, estado:'obsoleta'},
    fields:[{k:'nome',l:'Nome oficial',req:1},{k:'setor',l:'Setor',t:'select',o:A.SETORES},{k:'estado',l:'Estado',t:'select',req:1,o:[['obsoleta','Obsoleta (desinstalada)'],['parada','Parada (temporariamente)'],['ativa','Ativa']]},{k:'modelo',l:'Modelo',ph:'ex. Roland 900'}],
    ok:'Criar máquina', done:'Máquina criada.',
    submit:async function(x){ x.ativo=x.estado==='ativa'; if(norm(x.nome)!==norm(nome)) x.aliases=[nome]; await A.add('maquinas',x); S._aliasStamp=(S._aliasStamp||0)+1; S._incCache=null }});
}
async function setAlias(tipo, de, para){
  var id=tipo+'_'+A.idKey(norm(de)||de);
  if(!para){ if(A.get('aliases',id)) await A.del('aliases',id); }
  else await A.put('aliases', id, {tipo:tipo, de:de, para:para});
  S._aliasStamp=(S._aliasStamp||0)+1; S._incCache=null;
}

/* ---------- vista: Qualidade dos dados ---------- */
var TIPOS=[['maquina','Máquinas'],['operador','Operadores'],['cliente','Clientes']];
A.register('qualidade-dados',{
  html:function(){
    var t=A.tab('qd','maquina'), U=usados(t), cands=canonList(t), sem=0, comAlias=0, okN=0, tot=0, ign=0;
    if(!S.hist.ok) return A.head({c:C,mod:'Configuração',title:'Qualidade dos dados'})+'<div class="panel empty">A carregar o histórico…</div>';
    var rows=U.map(function(u){ var c=maps(), n=norm(u.v), al=c.alias[t][n], mst=c[t]&&c[t][n];
      var st=c.ign[t][n]? 'ign' : mst&&mst===u.v? 'ok' : mst? 'equiv' : al? 'alias' : 'sem';
      if(st==='ign') ign+=u.n; else { if(st==='sem') sem+=u.n; else if(st==='alias') comAlias+=u.n; else okN+=u.n; tot+=u.n }
      return {id:u.v, v:u.v, n:u.n, st:st, para:al||mst||'', sug:st==='sem'? sugerir(t,u.v,cands.filter(function(x){return x!==u.v})) : ''} });
    var f=fv('qdf','sem'), q=fv('qdq','').toLowerCase();
    var vis=rows.filter(function(r){ return (!f||(f==='sem'?r.st==='sem':f==='alias'?r.st==='alias':f==='ign'?r.st==='ign':r.st==='ok'||r.st==='equiv')) && (!q||r.v.toLowerCase().indexOf(q)>=0) });
    var comSug=rows.filter(function(r){return r.st==='sem'&&r.sug}).length;
    var semMestre=t!=='cliente' && !cands.length;
    return A.head({c:C,mod:'Configuração',title:'Qualidade dos dados',p:'Liga os nomes usados nos registos (e nos Excel antigos) aos nomes oficiais dos dados mestre. Assim "Iobox", "IOBOX" e "IO BOX" contam como a mesma máquina em todo o FLOW.',
        acts:S.admin&&comSug?'<button class="btn primary" id="qdAll">Aceitar '+comSug+' sugestões</button>':''})+
      A.kpis([{v:tot?fmt(okN/tot*100,0)+'%':'–',l:'Registos com nome oficial'},{v:fmt(comAlias,0),l:'Corrigidos por associação'},{v:fmt(sem,0),l:'Ainda sem correspondência',cls:sem?'warn':''},{v:rows.filter(function(r){return r.st==='sem'}).length,l:'Nomes diferentes por resolver',s:ign?fmt(ign,0)+' registos marcados “'+NAO[t].toLowerCase()+'”':''}])+
      A.tabs('qd',TIPOS,t)+
      (semMestre?'<div class="banner">Ainda não há '+(t==='maquina'?'máquinas':'operadores')+' nos dados mestre. Importe-os primeiro em <a href="#dados">Dados mestre</a>.</div>':'')+
      (t==='cliente'?'<p class="small muted" style="margin:-4px 0 10px">Clientes não têm lista mestre: escolha, para cada variante, o nome que deve ficar (por exemplo, juntar "NESTLÉ PORTUGAL, UNIPESSO" e "Nestlé Portugal").</p>':'')+
      '<div class="filters"><input type="search" id="qdq" data-f="qdq" placeholder="Procurar nome…" value="'+esc(fv('qdq',''))+'"><select data-f="qdf">'+selOpts([['sem','Sem correspondência'],['alias','Associados'],['ok','Já oficiais'],['ign',NAO[t]]],f,'Todos')+'</select></div>'+
      '<datalist id="qdCands">'+cands.map(function(c){return '<option value="'+esc(c)+'">'}).join('')+'</datalist>'+
      A.table(vis,[{l:'Nome usado',v:function(r){return '<b>'+esc(r.v)+'</b>'}},{l:'Registos',n:1,v:function(r){return fmt(r.n,0)}},
        {l:'Estado',v:function(r){return r.st==='ign'?'<span class="pill mute">'+NAO[t]+'</span>':r.st==='sem'?'<span class="pill warn">Sem correspondência</span>':r.st==='alias'?'<span class="pill info">Associado</span>':'<span class="pill ok">Oficial</span>'}},
        {l:'Nome oficial',v:function(r){ if(!S.admin) return esc(r.para||'–'); if(r.st==='ok') return '<span class="muted">—</span>';
          if(r.st==='ign') return '<button class="btn sm ghost" data-ign0="'+esc(r.v)+'">Anular “'+NAO[t].toLowerCase()+'”</button>';
          return '<div style="display:flex;gap:6px;align-items:center"><input list="qdCands" data-al="'+esc(r.v)+'" value="'+esc(r.para||r.sug)+'" placeholder="escolher…" style="border:1px solid var(--line);border-radius:7px;padding:5px 8px;min-width:200px'+(r.sug&&!r.para?';background:var(--warn-soft)':'')+'">'+
            '<button class="btn sm" data-alok="'+esc(r.v)+'">'+(r.para?'Atualizar':'Associar')+'</button>'+(r.st==='alias'?'<button class="btn sm ghost" data-aldel="'+esc(r.v)+'">Remover</button>':'')+
            (r.st==='sem'?(t==='maquina'?'<button class="btn sm ghost" data-novam="'+esc(r.v)+'">+ Máquina</button>':'')+'<button class="btn sm ghost" data-ign="'+esc(r.v)+'">'+NAO[t]+'</button>':'')+'</div>' }}],{max:300,empty:'Nada a mostrar com este filtro.'})+
      (S.admin?'':'<p class="small muted">Só os editores fazem associações.</p>');
  },
  bind:function(r){
    var t=A.tab('qd','maquina');
    r.querySelectorAll('[data-alok]').forEach(function(b){ b.onclick=async function(){ var inp=r.querySelector('[data-al="'+CSS.escape(b.dataset.alok)+'"]'); var v=inp.value.trim(); if(!v){A.toast('Escolha o nome oficial.');return}
      try{ await setAlias(t,b.dataset.alok,v); A.toast('Associado: '+b.dataset.alok+' → '+v) }catch(e){ A.toast('Não foi possível gravar.') } } });
    r.querySelectorAll('[data-aldel]').forEach(function(b){ b.onclick=async function(){ try{ await setAlias(t,b.dataset.aldel,''); A.toast('Associação removida.') }catch(e){ A.toast('Não foi possível gravar.') } } });
    if($('qdAll')) $('qdAll').onclick=async function(){ this.disabled=true; var inputs=[].slice.call(r.querySelectorAll('[data-al]')).filter(function(i){ return i.style.background && i.value }); var n=0;
      for(var i=0;i<inputs.length;i++){ try{ await setAlias(t,inputs[i].dataset.al,inputs[i].value); n++ }catch(e){} } A.toast(n+' associações gravadas.') };
    r.querySelectorAll('[data-novam]').forEach(function(b){ b.onclick=function(){ novaMaq(b.dataset.novam) } });
    r.querySelectorAll('[data-ign],[data-ign0]').forEach(function(b){ b.onclick=async function(){ var sim=!!b.dataset.ign, v=sim? b.dataset.ign : b.dataset.ign0; b.disabled=true;
      try{ await setIgnorar(t,v,sim); A.toast(sim? v+': '+NAO[t].toLowerCase()+'.' : 'Anulado.') }catch(e){ b.disabled=false; A.toast(e&&e.user?e.message:'Não foi possível gravar.') } } });
    bindFilters(r);
  }
});

/* ---------- vista: etiquetas QR ---------- */
function qrSvg(txt){ try{ var q=qrcode(0,'M'); q.addData(txt); q.make(); return q.createSvgTag({cellSize:4,margin:2,scalable:true}) }catch(e){ return '<div class="small muted">QR indisponível</div>' } }
function base(){ return location.origin+location.pathname }
A.register('etiquetas',{
  html:function(){
    var t=A.tab('qr','maq'), items=[];
    if(t==='maq'){ var fs=fv('qrs',''); A.maquinas().filter(function(m){return !fs||m.setor===fs}).forEach(function(m){ items.push({t:m.nome, s:m.setor||'', url:base()+'#posto-'+encodeURIComponent(m.id)}) }) }
    else if(t==='cau'){ A.list('cauchos').filter(function(c){return c.estado!=='retirado'}).sort(A.by('codigo')).forEach(function(c){ items.push({t:c.codigo, s:(c.referencia||'')+(c.medida?' · '+c.medida:''), url:base()+'#caucho-'+encodeURIComponent(c.codigo)}) }) }
    else { String(fv('qrof','')).split(/[\s,;]+/).filter(Boolean).forEach(function(of){ items.push({t:'OF '+of, s:'Ficha da ordem de fabrico', url:base()+'#of-'+encodeURIComponent(of)}) }) }
    var setores=Array.from(new Set(A.maquinas().map(function(m){return m.setor}).filter(Boolean))).sort();
    return A.head({c:C,mod:'Configuração',title:'Etiquetas QR',p:'Imprima e cole junto às máquinas, nos cauchos ou nas fichas de OF. Ao ler o código com a câmara do telemóvel ou tablet, o FLOW abre diretamente no sítio certo.',
        acts:'<button class="btn primary" id="qrPrint">Imprimir</button>'})+
      A.tabs('qr',[['maq','Máquinas → modo posto'],['cau','Cauchos'],['of','OF']],t)+
      '<div class="filters">'+(t==='maq'?'<select data-f="qrs">'+selOpts(setores,fv('qrs',''),'Todos os setores')+'</select>':'')+(t==='of'?'<input id="qrof" data-f="qrof" placeholder="N.º de OF (vários separados por espaço)" value="'+esc(fv('qrof',''))+'" style="flex:1">':'')+'<span class="small muted">'+items.length+' etiquetas</span></div>'+
      (items.length?'<div class="labels print-area">'+items.map(function(i){ return '<div class="label">'+qrSvg(i.url)+'<b>'+esc(i.t)+'</b><small>'+esc(i.s)+'</small></div>' }).join('')+'</div>'
        : '<div class="panel empty">'+(t==='maq'?'Sem máquinas nos dados mestre.':t==='cau'?'Sem cauchos em stock ou montados.':'Escreva um ou mais números de OF.')+'</div>');
  },
  bind:function(r){ $('qrPrint').onclick=function(){ try{ window.print() }catch(e){ A.toast('Use Ctrl+P para imprimir.') } }; bindFilters(r) }
});

/* ---------- vista: registo de alterações ---------- */
var COLN={incidencias:'FII / FIQ',recfor:'Reclamações a fornecedores',producao:'Produção',cauchos:'Cauchos',verniz:'Verniz',intervencoes:'Intervenções',aguas:'Águas',cartolinactrl:'Controlo de cartolina',ensaios:'Ensaios de laboratório',
  maquinas:'Máquinas',operadores:'Operadores',config:'Configuração',aliases:'Qualidade dos dados',ferramentas:'Ferramentas externas',emb_mapas:'Mapas de entregas',emb_mmx:'Specs MM',emb_cortx:'Velocidades'};
var audSub=false;
A.register('auditoria',{
  html:function(){
    if(!audSub && S.db){ audSub=true; S.db.collection('auditoria').onSnapshot(function(s){ S.data.auditoria=s.docs.map(function(d){ var x=d.data()||{}; x.id=d.id; return x }); if(S.route==='auditoria') A.render() }, function(){}) }
    var all=(S.data.auditoria||[]).slice().sort(function(a,b){ return (b.em||'')<(a.em||'')?-1:1 });
    var fc=fv('auc',''), fp=fv('aup',''), q=fv('auq','').toLowerCase();
    var rows=all.filter(function(a){ return (!fc||a.col===fc)&&(!fp||(a.nome||a.por)===fp)&&(!q||JSON.stringify(a.det||{}).toLowerCase().indexOf(q)>=0||String(a.doc).toLowerCase().indexOf(q)>=0) });
    return A.head({c:C,mod:'Configuração',title:'Registo de alterações',p:'Quem criou, alterou ou eliminou cada registo, e quando. Útil em auditorias de qualidade.'})+
      '<div class="filters"><input type="search" id="auq" data-f="auq" placeholder="Procurar no conteúdo…" value="'+esc(fv('auq',''))+'"><select data-f="auc">'+selOpts(Array.from(new Set(all.map(function(a){return a.col}))).sort().map(function(c){return [c,COLN[c]||c]}),fc,'Todas as ferramentas')+'</select>'+
      '<select data-f="aup">'+selOpts(Array.from(new Set(all.map(function(a){return a.nome||a.por}).filter(Boolean))).sort(),fp,'Todas as pessoas')+'</select></div>'+
      A.table(rows,[{l:'Quando',v:function(a){return '<span class="mono small">'+esc(String(a.em||'').slice(0,16).replace('T',' '))+'</span>'}},{l:'Quem',v:function(a){return esc(a.nome||A.uname(a.por))}},
        {l:'Ação',v:function(a){return '<span class="pill '+(a.acao==='eliminar'?'bad':a.acao==='criar'?'ok':'info')+'">'+esc(a.acao)+'</span>'}},{l:'Ferramenta',v:function(a){return esc(COLN[a.col]||a.col)}},
        {l:'Detalhe',v:function(a){ var d=a.det||{}; return '<span class="small">'+Object.keys(d).slice(0,5).map(function(k){return '<b>'+esc(k)+'</b>: '+esc(d[k])}).join(' · ')+'</span>' }}],{max:400,empty:S.db?'Ainda sem alterações registadas.':'Sem base de dados.'});
  },
  bind:function(r){ bindFilters(r) }
});
window.Mestre={norm:norm, canon:canon, known:known, usados:usados, setAlias:setAlias, qrSvg:qrSvg};
})();
