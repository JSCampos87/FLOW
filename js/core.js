/* Graphicsleader Operações — núcleo: estado, base de dados, perfis, navegação, formulários e tabelas. */
(function(){
var COLS = ['producao','aliases','ferramentas','recfor','emb_mm','emb_mmx','emb_cort','emb_cortx','emb_mapas','emb_planos','emb_pdfs','maquinas','operadores','verniz','rv_lib','rv_libx','imp_tec','densidades','cauchos','intervencoes','aguas','incidencias','cartolinactrl','cartolinas','config'];
var S = { hist:{fii:[],fiq:[],rf:[],mm:[],cort:null,sap:[],ok:false}, db:null, user:null, uid:null, admin:false, live:false, data:{}, names:{}, route:'inicio', views:{}, tabs:{} };
COLS.forEach(function(c){ S.data[c] = [] });

var $ = function(id){ return document.getElementById(id) };
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}) }
function num(v){ if(v===''||v==null) return null; var n=parseFloat(String(v).replace(',','.')); return isFinite(n)?n:null }
function fmt(n,d){ if(n==null||!isFinite(n)) return '–'; return Number(n).toLocaleString('pt-PT',{minimumFractionDigits:d||0,maximumFractionDigits:d==null?2:d}) }
function today(){ var d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10) }
function nowIso(){ return new Date().toISOString() }
function fdate(s){ if(!s) return '–'; var p=String(s).slice(0,10).split('-'); return p.length===3? p[2]+'/'+p[1]+'/'+p[0] : s }
function days(a,b){ if(!a) return null; var t1=Date.parse(String(a).slice(0,10)), t2=b?Date.parse(String(b).slice(0,10)):Date.parse(today()); return Math.round((t2-t1)/864e5) }
function mean(a){ a=a.filter(function(x){return x!=null&&isFinite(x)}); return a.length? a.reduce(function(s,x){return s+x},0)/a.length : null }
function sd(a){ a=a.filter(function(x){return x!=null&&isFinite(x)}); if(a.length<2) return null; var m=mean(a); return Math.sqrt(a.reduce(function(s,x){return s+(x-m)*(x-m)},0)/(a.length-1)) }
function by(k,dir){ return function(a,b){ var x=a[k]||'', y=b[k]||''; return (x<y?-1:x>y?1:0)*(dir||1) } }
function toast(m){ var t=$('toast'); t.textContent=m; t.hidden=false; clearTimeout(toast.h); toast.h=setTimeout(function(){t.hidden=true},2800) }
function list(c){ return S.data[c] || [] }
function get(c,id){ return list(c).filter(function(x){return x.id===id})[0] }
function cfg(id){ return get('config',id) || {} }

/* ---------- dados mestre ---------- */
var SETORES = ['Produção','Prepress','Corte de Cartolina','Pasaban','Impressão','Contracolagem','Corte e Vinco','Janelas','Estampagem','Colagem','Embalamento','Logística','Guilhotinas','Subcontratação','Supply Chain','Comercial','Qualidade','Manutenção','Cliente'];
function maquinas(setor){ return list('maquinas').filter(function(m){ return m.ativo!==false && (!setor || m.setor===setor) }).sort(by('nome')) }
function operadores(setor){ return list('operadores').filter(function(o){ return o.ativo!==false && (!setor || !o.setor || o.setor===setor) }).sort(by('nome')) }
function mName(id){ var m=get('maquinas',id); return m? m.nome : (id||'–') }

/* ---------- perfis ---------- */
var ROLES = { stock:'Stock (cauchos e verniz)', tecnico:'Técnico de impressão', qualidade:'Qualidade' };
function roleUsers(r){ var p=(cfg('perfis').users)||{}; return Object.keys(p).filter(function(u){ return (p[u]||[]).indexOf(r)>=0 }) }
function can(r){
  if(S.admin) return true;
  if(!S.db) return true;
  var users = roleUsers(r);
  if(!users.length) return true;            /* papel ainda sem pessoas atribuídas: aberto a todos os que podem escrever */
  return users.indexOf(S.uid)>=0;
}
async function names(ids){
  ids = ids.filter(function(i){ return i && !(i in S.names) });
  if(!ids.length || !S.user || !S.user.profiles) return false;
  try{ var p = await S.user.profiles(ids); ids.forEach(function(i){ S.names[i] = (p && p[i] && p[i].name) || '' }) }catch(e){ ids.forEach(function(i){ S.names[i]='' }) }
  return true;
}
function uname(id){ return S.names[id] || (id? 'Utilizador' : '–') }

/* ---------- escrita ---------- */
/* registo de alterações (auditoria): quem mudou o quê e quando. Coleção 'auditoria', um documento por escrita. */
var NO_AUDIT={auditoria:1,emb_planos:1};
function resumo(obj){ var o={}; Object.keys(obj||{}).forEach(function(k){ var v=obj[k]; if(k==='criadoEm'||k==='alteradoEm'||k==='criadoPor') return; if(v==null||v==='') return; if(typeof v==='object') return; o[k]=String(v).slice(0,80) }); return o }
function difs(a,b){ var o={}; a=a||{}; b=b||{}; Object.keys(Object.assign({},a,b)).forEach(function(k){ if(k==='alteradoEm'||k==='id') return; var x=a[k], y=b[k]; if(typeof x==='object'||typeof y==='object'){ if(JSON.stringify(x)!==JSON.stringify(y)) o[k]='(alterado)'; return } if(String(x==null?'':x)!==String(y==null?'':y)) o[k]=String(x==null?'':x).slice(0,60)+' → '+String(y==null?'':y).slice(0,60) }); return o }
function audit(c, id, acao, det){
  if(NO_AUDIT[c] || !S.db) return;
  try{ S.db.collection('auditoria').add({col:c, doc:String(id||''), acao:acao, por:S.uid||'', nome:S.names[S.uid]||'', em:nowIso(), det:det||{}}).catch(function(){}) }catch(e){}
}
async function add(c, obj){
  if(!S.db) throw new Error('offline');
  obj.criadoEm = obj.criadoEm || nowIso(); if(S.uid) obj.criadoPor = obj.criadoPor || S.uid;
  var r = await S.db.collection(c).add(obj); audit(c, r&&r.id, 'criar', resumo(obj)); return r && r.id;
}
async function put(c, id, obj){ if(!S.db) throw new Error('offline'); var antes=get(c,id); obj.alteradoEm=nowIso(); await S.db.doc(c+'/'+id).set(obj); audit(c, id, antes?'alterar':'criar', antes? difs(antes,obj) : resumo(obj)) }
async function del(c, id){ if(!S.db) throw new Error('offline'); var antes=get(c,id); await S.db.doc(c+'/'+id).delete(); audit(c, id, 'eliminar', resumo(antes)) }
function clean(o){ var r={}; Object.keys(o).forEach(function(k){ if(k!=='id') r[k]=o[k] }); return r }

/* ---------- formulário em modal ----------
   fields: [{k,l,t:text|number|date|select|textarea|check|sep|html, o:[[v,l]]|fn, req, full, ph, step, help, html}] */
function opts(o){ return (typeof o==='function'? o() : o||[]).map(function(x){ return Array.isArray(x)? x : [x,x] }) }
function fieldHtml(f, v){
  if(f.t==='sep') return '<div class="sep">'+esc(f.l)+'</div>';
  if(f.t==='html') return '<div class="fld full">'+f.html+'</div>';
  var id='f_'+f.k, req=f.req?' required':'', lab=esc(f.l)+(f.req?' *':'');
  var help = f.help? '<small>'+esc(f.help)+'</small>' : '';
  if(v==null) v = f.def!=null ? (typeof f.def==='function'? f.def(): f.def) : '';
  if(f.t==='check') return '<label class="fld check'+(f.full?' full':'')+'"><input type="checkbox" id="'+id+'" name="'+f.k+'"'+(v?' checked':'')+'>'+lab+'</label>';
  var inner;
  if(f.t==='select'){
    inner = '<select id="'+id+'" name="'+f.k+'"'+req+'><option value="">'+(f.ph||'— escolher —')+'</option>'+opts(f.o).map(function(o){ return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(v)?' selected':'')+'>'+esc(o[1])+'</option>' }).join('')+'</select>';
  } else if(f.t==='textarea'){
    inner = '<textarea id="'+id+'" name="'+f.k+'" rows="'+(f.rows||3)+'"'+req+' placeholder="'+esc(f.ph||'')+'">'+esc(v)+'</textarea>';
  } else {
    var t = f.t==='number'? 'text" inputmode="decimal' : (f.t||'text');
    inner = '<input id="'+id+'" name="'+f.k+'" type="'+t+'" value="'+esc(v)+'"'+req+' placeholder="'+esc(f.ph||'')+'"'+(f.list?' list="'+f.list+'"':'')+' autocomplete="off">';
  }
  return '<label class="fld'+(f.full||f.t==='textarea'?' full':'')+'">'+lab+inner+help+'</label>';
}
function readForm(fields){
  var o={}, miss=[];
  fields.forEach(function(f){
    if(!f.k || f.t==='sep' || f.t==='html') return;
    var el=$('f_'+f.k); if(!el) return;
    var v = f.t==='check'? el.checked : f.t==='number'? num(el.value) : el.value.trim();
    if(f.req && (v===''||v==null)) miss.push(f.l);
    o[f.k]=v;
  });
  return {v:o, miss:miss};
}
/* openForm({title, fields, values, submit(v)->Promise, del(), extra(html), after(box)}) */
function openForm(o){
  var box=$('box');
  box.innerHTML = '<h2>'+esc(o.title)+'</h2>'+(o.intro?'<p class="muted" style="margin:-6px 0 0">'+o.intro+'</p>':'')+
    '<form id="frm" class="form" novalidate>'+o.fields.map(function(f){ return fieldHtml(f, o.values? o.values[f.k] : null) }).join('')+'</form>'+
    '<div class="foot"><span class="err" id="ferr"></span>'+(o.del?'<button type="button" class="btn danger" id="fdel">Eliminar</button>':'')+
    '<button type="button" class="btn" id="fcancel">Cancelar</button><button type="button" class="btn primary" id="fok">'+(o.ok||'Guardar')+'</button></div>';
  $('modal').hidden=false;
  var first=box.querySelector('input,select,textarea'); if(first && !o.noFocus) first.focus();
  $('fcancel').onclick=closeModal;
  if(o.after) o.after(box);
  if(o.del) $('fdel').onclick=async function(){
    if(this.dataset.ok!=='1'){ this.dataset.ok='1'; this.textContent='Confirmar eliminação'; return }
    try{ await o.del(); closeModal(); toast('Eliminado.') }catch(e){ $('ferr').textContent='Não foi possível eliminar.' }
  };
  var go=async function(){
    var r=readForm(o.fields);
    if(r.miss.length){ $('ferr').textContent='Falta preencher: '+r.miss.join(', '); return }
    if(o.validate){ var e=o.validate(r.v); if(e){ $('ferr').textContent=e; return } }
    $('fok').disabled=true;
    try{ await o.submit(r.v); closeModal(); toast(o.done||'Guardado.') }
    catch(e){ $('ferr').textContent = e && e.message==='offline' ? 'Sem ligação à base de dados.' : (e&&e.user? e.message : 'Não foi possível guardar.'); $('fok').disabled=false }
  };
  $('fok').onclick=go;
  $('frm').addEventListener('submit',function(e){ e.preventDefault(); go() });
}
function showModal(html, after){ $('box').innerHTML=html; $('modal').hidden=false; if(after) after($('box')) }
function closeModal(){ $('modal').hidden=true; $('box').innerHTML=''; render() }
$('modal').addEventListener('click',function(e){ if(e.target===this) closeModal() });
document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !$('modal').hidden) closeModal() });
function uerr(m){ var e=new Error(m); e.user=true; return e }

/* ---------- tabela ---------- */
function table(rows, cols, opt){
  opt=opt||{};
  if(!rows.length) return '<div class="tw"><div class="empty">'+(opt.empty||'Sem registos.')+'</div></div>';
  var max=opt.max||300, extra=rows.length>max? '<div class="empty small">A mostrar '+max+' de '+rows.length+'. Use os filtros para refinar.</div>' : '';
  return '<div class="tw"><table class="t"><thead><tr>'+cols.map(function(c){ return '<th'+(c.n?' class="n"':'')+'>'+esc(c.l)+'</th>' }).join('')+'</tr></thead><tbody>'+
    rows.slice(0,max).map(function(r){ return '<tr'+(opt.click?' class="click" data-row="'+esc(r.id)+'" tabindex="0"':'')+'>'+cols.map(function(c){ return '<td'+(c.n?' class="n"':'')+'>'+c.v(r)+'</td>' }).join('')+'</tr>' }).join('')+
    '</tbody></table>'+extra+'</div>';
}
function bindRows(root, fn){ root.querySelectorAll('tr[data-row]').forEach(function(tr){ tr.onclick=function(){ fn(tr.dataset.row) }; tr.onkeydown=function(e){ if(e.key==='Enter') fn(tr.dataset.row) } }) }
function tabs(key, items, cur){ return '<div class="tabs" role="tablist">'+items.map(function(t){ return '<button role="tab" data-tab="'+key+':'+t[0]+'" class="'+(t[0]===cur?'on':'')+'" aria-selected="'+(t[0]===cur)+'">'+esc(t[1])+'</button>' }).join('')+'</div>' }
function tab(key, def){ return S.tabs[key] || def }
function head(o){
  return '<div class="head" style="--c:'+o.c+'"><div><div class="eyebrow">'+esc(o.mod)+'</div><h1>'+esc(o.title)+'</h1>'+(o.p?'<p>'+o.p+'</p>':'')+'</div><div class="acts">'+(o.acts||'')+'</div></div>'+
    (S.db||!S.booted? '' : '<div class="banner">Sem ligação à base de dados — os registos não podem ser guardados. Abra a página com a sua conta Claude.</div>');
}
function kpis(items){ return '<div class="kpis">'+items.map(function(k){ return '<div class="kpi '+(k.cls||'')+'"><b>'+k.v+'</b><span>'+esc(k.l)+'</span>'+(k.s?'<small>'+k.s+'</small>':'')+'</div>' }).join('')+'</div>' }

/* ---------- navegação ---------- */
var SECTORS=[
  {id:'impressao',nome:'Impressão',c:'var(--c-imp)',desc:'Preparação, arranque e controlo das máquinas de impressão.',tools:['producao-imp','verniz','cauchos','intervencoes','aguas','ficha-imp']},
  {id:'corte-vinco',nome:'Corte e Vinco',c:'var(--c-cv)',desc:'Ferramentas de pré-corte e vinco, cofres de corte e intervenções.',tools:['producao-cv','intervencoes-cv','pcv']},
  {id:'colagem',nome:'Colagem',c:'var(--c-col)',desc:'Linhas de colagem: arranques, parâmetros e registos.',tools:['producao-col']},
  {id:'embalamento',nome:'Embalamento',c:'var(--c-emb)',desc:'Mapa de cargas, distribuição de pessoas e specs de paletização.',tools:['cargas','specs']},
  {id:'logistica',nome:'Logística',c:'var(--c-log)',desc:'Entregas, matérias-primas, obsoletos, forecasting e cargas.',tools:['contador']},
  {id:'qualidade',nome:'Qualidade',c:'var(--c-qual)',desc:'Incidências internas, reclamações de clientes e de fornecedores, controlo de matérias-primas.',tools:['incidencias','fornecedores','cartolina','auditorias']},
  {id:'manutencao',nome:'Manutenção',c:'var(--c-man)',desc:'Pedidos de intervenção, preventivas e histórico de equipamentos.',tools:[]},
  {id:'oficina',nome:'Oficina Técnica',curto:'Oficina',c:'var(--c-ofi)',desc:'Ferramentas e apoio técnico da oficina.',tools:[]},
  {id:'indicadores',nome:'Indicadores',c:'var(--c-ind)',desc:'Painéis com os números-chave de todas as áreas.',tools:['painel','ind-qualidade']}
];
var ICO={"impressao": "<path d=\"M6 9V3h12v6\"/><rect x=\"3\" y=\"9\" width=\"18\" height=\"8\" rx=\"2\"/><path d=\"M6 14h12v7H6z\"/><circle cx=\"17.5\" cy=\"12\" r=\".6\" fill=\"currentColor\"/>", "corte-vinco": "<circle cx=\"6\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><path d=\"M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12\"/>", "colagem": "<path d=\"M4 7h16M4 7v10l8 4 8-4V7M4 7l8-4 8 4M12 11v10\"/><path d=\"M8 9l8 0\" stroke-dasharray=\"2 2\"/>", "manutencao": "<path d=\"M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z\"/>", "logistica": "<path d=\"M3 7h11v9H3zM14 10h4l3 3v3h-7z\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/>", "qualidade": "<path d=\"M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z\"/><path d=\"m9 12 2 2 4-4\"/>", "embalamento": "<path d=\"M3 8l9-5 9 5v8l-9 5-9-5z\"/><path d=\"M3 8l9 5 9-5M12 13v8M7.5 5.5l9 5\"/>", "oficina": "<path d=\"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z\"/>", "indicadores": "<path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/>"};
function ico(id,cls){ return '<span class="ico '+(cls||'')+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[id]||'')+'</svg></span>' }
var CFG={id:'config',nome:'Configuração',c:'var(--c-cfg)',tools:['dados','qualidade-dados','perfis','etiquetas','auditoria','ferramentas']};
var TOOLS={'producao-imp':'Produção e OEE','producao-cv':'Produção e OEE','producao-col':'Produção e OEE','qualidade-dados':'Qualidade dos dados',etiquetas:'Etiquetas QR',auditoria:'Registo de alterações',alertas:'Alertas',posto:'Modo posto',verniz:'Reservas de verniz','ficha-imp':'Ficha técnica das máquinas',cauchos:'Cauchos',intervencoes:'Intervenções técnicas',aguas:'Controlo de águas','intervencoes-cv':'Intervenções técnicas',
  cargas:'Plano de cargas',specs:'Specs de embalamento',incidencias:'FII / FIQ',fornecedores:'Reclamações a fornecedores',cartolina:'Controlo de cartolina',
  painel:'Painel geral','ind-qualidade':'Indicadores de qualidade',dados:'Dados mestre',perfis:'Perfis',ferramentas:'Ferramentas externas',
  pcv:'PCV Ferramentas',auditorias:'Auditorias PCM',contador:'Contador de Folhas'};
/* apps da Graphicsleader que correm dentro do FLOW (mesmo site jscampos87.github.io, cada uma no seu repositório) */
var APPS={pcv:{url:'https://jscampos87.github.io/PCV-GESTAO-DE-FERRAMENTAS/',d:'Pré-corte e vinco: armazém, pedidos, FAMAG, requisições e plano.'},
  auditorias:{url:'https://jscampos87.github.io/auditorias-pcm/',d:'Auditorias PCM por setor, detetor de metais e histórico.'},
  contador:{url:'https://jscampos87.github.io/Contador-de-Folhas/',d:'Contagem de folhas e pedidos de cartolina.'}};
function sectorOf(r){ if(r==='config') return CFG; for(var i=0;i<SECTORS.length;i++){ var s=SECTORS[i]; if(s.id===r||s.tools.indexOf(r)>=0) return s } return CFG.tools.indexOf(r)>=0? CFG : null }
/* Ferramentas externas conhecidas: aparecem sempre, mesmo sem registo na base de dados.
   Um registo em 'ferramentas' com o mesmo url substitui a predefinição. */
var EXT_DEF=[];
function extTools(sid){
  var internas=Object.keys(APPS).map(function(k){ return APPS[k].url }), db=list('ferramentas').filter(function(f){ return internas.indexOf(f.url)<0 }), urls=db.map(function(f){ return f.url });
  return db.concat(EXT_DEF.filter(function(f){ return urls.indexOf(f.url)<0 }))
    .filter(function(f){ return (f.modulos||[]).indexOf(sid)>=0 }).sort(function(a,b){ return (a.ordem||99)-(b.ordem||99) }) }
function register(name, view){ S.views[name]=view }
/* rotas com parâmetro: #of-1216075, #mm-8000041818, #posto-xl105, #caucho-C26-0001 */
var PREFIX=[]; function registerPrefix(p, view){ PREFIX.push({p:p, v:view}) }
function routeArg(){ var r=S.route; for(var i=0;i<PREFIX.length;i++) if(r.indexOf(PREFIX[i].p)===0) return decodeURIComponent(r.slice(PREFIX[i].p.length)); return '' }
function renderNav(){
  var r=S.route, sec=sectorOf(r);
  $('secs').innerHTML=SECTORS.map(function(s){ return '<a href="#'+s.id+'" style="--c:'+s.c+'" class="'+(sec===s?'on':'')+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[s.id]||'')+'</svg>'+esc(s.curto||s.nome)+'</a>' }).join('');
  $('gear').classList.toggle('on', sec===CFG);
  if(!sec){ $('sub').hidden=true; return }
  var ext=sec===CFG?[]:extTools(sec.id).filter(function(f){ return f.url && f.estado!=='por-ligar' });
  $('sub').hidden=false; $('sub').style.setProperty('--c',sec.c);
  $('subIn').innerHTML='<span class="sn">'+(sec===CFG?'':ico(sec.id,'sm'))+esc(sec.nome)+'</span>'+(sec===CFG?'':'<a href="#'+sec.id+'" class="'+(r===sec.id?'on':'')+'">Visão geral</a>')+
    sec.tools.map(function(t){ return '<a href="#'+t+'" class="'+(r===t?'on':'')+'">'+esc(TOOLS[t]||t)+'</a>' }).join('')+
    (ext.length?'<span class="sp"></span>'+ext.map(function(f){ return '<a class="ext" href="'+esc(f.url)+'" target="_blank" rel="noopener">'+esc(f.nome)+' ↗</a>' }).join(''):'');
}
function render(){
  var r=S.route, sec=sectorOf(r), pv=null; PREFIX.forEach(function(x){ if(!pv && r.indexOf(x.p)===0 && r.length>x.p.length) pv=x.v });
  var v=S.views[r] || pv || (sec&&sec!==CFG&&r===sec.id? S.views.__setor : null) || S.views.inicio, main=$('main');
  document.body.classList.toggle('kiosk', r==='posto' || r.indexOf('posto-')===0);
  renderNav();
  if(window.App && App.onNav) try{ App.onNav() }catch(e){}
  var y=window.scrollY, ae=document.activeElement, aeId=ae&&ae.id, selS=ae&&ae.selectionStart;
  if(v.keep && main.dataset.view===r) return;   /* apps embutidas: não recarregar o iframe a cada alteração de dados */
  main.dataset.view=r;
  main.innerHTML = v.html();
  if(v.bind) v.bind(main);
  if(aeId && $(aeId) && $(aeId)!==document.body){ var el=$(aeId); el.focus(); try{ if(selS!=null) el.setSelectionRange(selS,selS) }catch(e){} }
  window.scrollTo(0,y);
}
var rT; function rerender(){ clearTimeout(rT); rT=setTimeout(function(){ if($('modal').hidden || S.forceRender) render() },60) }
function route(){
  var h=(location.hash||'').slice(1) || 'inicio';
  if(h!==S.route){ S.route=h; window.scrollTo(0,0); if(!$('modal').hidden){ $('modal').hidden=true; $('box').innerHTML='' } }
  render();
}
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-tab]'); if(t){ var p=t.dataset.tab.split(':'); S.tabs[p[0]]=p[1]; render(); return }
});
window.addEventListener('hashchange',route);

/* ---------- arranque ---------- */
async function loadHist(){
  var get=function(f){ return fetch('data/'+f).then(function(r){ if(!r.ok) throw 0; return r.json() }).catch(function(){ return null }) };
  var r=await Promise.all([get('fii.json'),get('fiq.json'),get('rf.json'),get('mm.json'),get('cort.json'),get('sap.json')]);
  S._histFalta=HIST.filter(function(k,i){ return r[i]==null });
  S.hist={fii:r[0]||[],fiq:r[1]||[],rf:r[2]||[],mm:r[3]||[],cort:r[4],sap:r[5]||[],ok:!S._histFalta.length}; S._incCache=null; render();
}
/* No site publicado não há data/*.json (dados da empresa): o histórico vem do Firebase (flow_hist),
   comprimido em gzip+base64 (scripts/upload_hist.mjs). Fica em cache neste browser enquanto a versão não mudar. */
var HIST=['fii','fiq','rf','mm','cort','sap'];
async function gunzipB64(b64){ var bin=atob(b64), u=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).json() }
async function loadHistDb(){
  var falta=S._histFalta||[];
  if(!falta.length || !S.db || !S.db.doc || typeof S.db.doc('hist/meta').get!=='function'){ S.hist.ok=true; render(); return }
  try{
    var meta=await S.db.doc('hist/meta').get();
    if(meta) await Promise.all(falta.filter(function(k){ return meta[k] }).map(async function(k){
      var m=meta[k], ck='flow_hist_'+k, b64=null;
      try{ var c=JSON.parse(localStorage.getItem(ck)||'null'); if(c && c.v===m.v) b64=c.gz }catch(e){}
      if(!b64){ var ps=[]; for(var i=0;i<m.partes;i++) ps.push(S.db.doc('hist/'+k+'_p'+i).get());
        b64=(await Promise.all(ps)).map(function(p){ return p? p.gz : '' }).join('');
        try{ localStorage.setItem(ck, JSON.stringify({v:m.v, gz:b64})) }catch(e){} }
      S.hist[k]=await gunzipB64(b64);
    }));
  }catch(e){ console.error('FLOW: histórico', e); toast('Não foi possível carregar o histórico.') }
  S.hist.ok=true; S._incCache=null; render();
}
/* nome de quem usa este dispositivo (base partilhada): aparece em "registado por" */
function askName(){
  openForm({title:'Quem está a usar o FLOW?', intro:'Escreva o seu nome. Fica associado ao que regista, para os colegas saberem quem fez o quê. Só é pedido uma vez neste dispositivo.',
    values:{nome:S.names[S.uid]||''}, fields:[{k:'nome',l:'Nome',req:1,full:1,ph:'Ex.: João Campos'}], ok:'Continuar', done:'Olá!',
    submit:function(x){ return S.user.setName(x.nome).then(function(){ S.names[S.uid]=x.nome; $('whoTxt').textContent=(S.admin?'Editor':'Ligado')+' · '+x.nome.split(' ')[0] }) }});
}
async function start(){
  route(); var histP=loadHist();
  var timer=setTimeout(function(){ S.booted=true; $('whoTxt').textContent='Sem ligação'; $('dot').className='dot off'; render() },10000);
  var r = await window.FlowStore.connect();
  S.mode=r.mode; S.store=r;
  S.db=r.db; S.user=r.user; S.booted=true;
  if(S.user){
    try{ S.uid = await S.user.id() }catch(e){}
    try{ S.admin = !!(await S.user.canEdit()) }catch(e){}
    try{ var me=await S.user.me(); if(me && S.uid) S.names[S.uid]=me.name||'' }catch(e){}
  }
  if(r.erro) toast(r.erro);
  histP.then(loadHistDb);
  if(!S.db){ clearTimeout(timer); $('whoTxt').textContent='Sem base de dados'; $('dot').className='dot off'; render(); return }
  if(S.user && S.user.setName){
    var who=document.querySelector('.who'); who.style.cursor='pointer'; who.title='Mudar o nome'; who.onclick=askName;
    if(!S.names[S.uid]) setTimeout(askName,400);
  }
  var pending=COLS.length;
  COLS.forEach(function(c){
    S.db.collection(c).onSnapshot(function(snap){
      S.data[c] = snap.docs.map(function(d){ var x=d.data()||{}; x.id=d.id; return x });
      if(pending>0 && !S['got_'+c]){ S['got_'+c]=1; pending--; }
      if(pending===0 && !S.live){ clearTimeout(timer); S.live=true; $('dot').className='dot '+(S.mode==='local'?'off':'on'); $('dot').title=S.mode==='local'?'Modo local: dados guardados só neste browser':'Ligado à base de dados partilhada'; $('whoTxt').textContent=(S.mode==='local'?'Modo local':(S.admin?'Editor':'Ligado'))+(S.names[S.uid]?' · '+S.names[S.uid].split(' ')[0]:'') }
      rerender();
    }, function(){ clearTimeout(timer); $('whoTxt').textContent='Erro de ligação'; $('dot').className='dot off' });
  });
}

window.App = { S:S, $:$, esc:esc, num:num, fmt:fmt, today:today, nowIso:nowIso, fdate:fdate, days:days, mean:mean, sd:sd, by:by, toast:toast,
  list:list, get:get, cfg:cfg, SETORES:SETORES, maquinas:maquinas, operadores:operadores, mName:mName, ROLES:ROLES, roleUsers:roleUsers, can:can,
  names:names, uname:uname, add:add, put:put, del:del, clean:clean, openForm:openForm, showModal:showModal, closeModal:closeModal, uerr:uerr,
  table:table, bindRows:bindRows, ico:ico, registerPrefix:registerPrefix, routeArg:routeArg, audit:audit, PREFIX:PREFIX, ICO:ICO, APPS:APPS, SECTORS:SECTORS, TOOLS:TOOLS, sectorOf:sectorOf, extTools:extTools, tabs:tabs, tab:tab, head:head, kpis:kpis, register:register, render:render, start:start, opts:opts };
})();

/* ---------- importador genérico (Excel/CSV ou colar) ----------
   cols: [{k, l, re:/regex sobre cabeçalho normalizado/, t:'text'|'num'|'bool'|'date', req}] */
(function(){
var A=window.App, $=A.$, esc=A.esc;
var XURL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function loadX(){ return window.XLSX? Promise.resolve() : new Promise(function(res,rej){ var s=document.createElement('script'); s.src=XURL; s.onload=res; s.onerror=rej; document.head.appendChild(s) }) }
function norm(s){ return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim() }
function conv(v,t){
  if(t==='num'){ if(typeof v==='number') return v; return A.num(String(v).replace(/\s/g,'').replace(/\.(?=\d{3}(\D|$))/g,'')) }
  if(t==='bool'){ var s=norm(v); return /^(s|sim|y|yes|x|1|true|verdadeiro|leva)$/.test(s) }
  if(t==='date'){
    if(typeof v==='number' && v>20000 && v<80000){ var d=new Date(Math.round((v-25569)*864e5)); return d.toISOString().slice(0,10) }
    var s=String(v||'').trim(), m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s); if(m){ var y=m[3].length===2?'20'+m[3]:m[3]; return y+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2) }
    m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m? m[0] : (s||'');
  }
  return String(v==null?'':v).trim();
}
function parse(aoa, cols){
  for(var r=0;r<Math.min(aoa.length,30);r++){
    var h=(aoa[r]||[]).map(norm), map={}, used={};
    cols.forEach(function(c){ var i=h.findIndex(function(x,j){ return !used[j] && x && c.re.test(x) }); if(i>=0){ map[c.k]=i; used[i]=1 } });
    if(cols.filter(function(c){return c.req}).every(function(c){return map[c.k]!=null})){
      var out=[], last={};
      for(var k=r+1;k<aoa.length;k++){ var a=aoa[k]||[], o={}, ok=true;
        cols.forEach(function(c){ if(map[c.k]==null) return; o[c.k]=conv(a[map[c.k]],c.t); if(c.fill){ if(o[c.k]===''||o[c.k]==null) o[c.k]=last[c.k]; else last[c.k]=o[c.k] } });
        cols.forEach(function(c){ if(c.req && (o[c.k]===''||o[c.k]==null)) ok=false });
        if(ok) out.push(o) }
      return {rows:out, found:Object.keys(map)};
    }
  }
  return null;
}
A.importDialog=function(o){
  A.showModal('<h2>'+esc(o.title)+'</h2><p class="muted" style="margin:0">'+o.intro+'</p>'+
    '<p class="small" style="margin:0"><b>Colunas reconhecidas:</b> '+o.cols.map(function(c){return esc(c.l)+(c.req?' *':'')}).join(' · ')+'</p>'+
    '<label class="fld">Ficheiro Excel ou CSV<input type="file" id="imF" accept=".xlsx,.xls,.csv"></label>'+
    '<label class="fld">… ou colar da folha de cálculo (com a linha de cabeçalhos)<textarea id="imT" rows="5" placeholder="Copie as células no Excel e cole aqui"></textarea></label>'+
    '<div id="imS" class="small"></div><div class="foot"><button class="btn" id="imX">Fechar</button><button class="btn primary" id="imOk" disabled>Importar</button></div>',
  function(){
    var rows=null; $('imX').onclick=A.closeModal;
    var show=function(p){ if(!p||!p.rows.length){ rows=null; $('imOk').disabled=true; $('imS').innerHTML='<span style="color:var(--bad)">Não encontrei as colunas obrigatórias (*).</span>'; return }
      rows=p.rows; $('imOk').disabled=false; $('imS').innerHTML='<b>'+rows.length+'</b> linhas prontas a importar. Colunas encontradas: '+p.found.map(function(k){return esc(o.cols.filter(function(c){return c.k===k})[0].l)}).join(', ')+'.'+(o.preview?'<br>'+o.preview(rows):'') };
    $('imT').addEventListener('input',function(){ var t=this.value; if(!t.trim()) return; show(parse(t.split(/\r?\n/).map(function(l){return l.split(/\t|;/)}), o.cols)) });
    $('imF').onchange=async function(e){ var f=e.target.files[0]; if(!f) return; $('imS').textContent='A ler…';
      try{ await loadX() }catch(err){ $('imS').textContent='Não foi possível carregar o leitor de Excel.'; return }
      try{ var wb=XLSX.read(await f.arrayBuffer(),{type:'array'}), best=null; wb.SheetNames.forEach(function(n){ var p=parse(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}),o.cols); if(p&&(!best||p.rows.length>best.rows.length)) best=p }); show(best) }
      catch(err){ $('imS').textContent='Não foi possível ler o ficheiro.' } };
    $('imOk').onclick=async function(){ this.disabled=true; $('imS').textContent='A gravar…';
      try{ var msg=await o.onRows(rows); A.closeModal(); A.toast(msg||'Importado.') }catch(err){ $('imS').textContent=(err&&err.user)?err.message:'Não foi possível gravar.'; this.disabled=false } };
  });
};
/* tabela em blocos (para listas grandes): coleção com docs p0..pn {linhas:[obj]} + coleção de alterações individuais */
A.chunked=function(col, ov, key){
  var base={}; A.list(col).slice().sort(function(a,b){return (a.parte||0)-(b.parte||0)}).forEach(function(d){ (d.linhas||[]).forEach(function(r){ base[String(r[key])]=r }) });
  A.list(ov).forEach(function(d){ if(d._del) delete base[d.id]; else base[d.id]=Object.assign({},A.clean(d)) });
  return Object.keys(base).map(function(k){ var r=base[k]; r._k=k; return r });
};
A.writeChunks=async function(col, rows){
  var S=A.S, parts=Math.ceil(rows.length/300);
  for(var i=0;i<parts;i++) await S.db.doc(col+'/p'+i).set({parte:i, linhas:rows.slice(i*300,(i+1)*300)});
  var old=A.list(col).filter(function(d){ var m=/^p(\d+)$/.exec(d.id); return !m || +m[1]>=parts });
  for(var j=0;j<old.length;j++) await S.db.doc(col+'/'+old[j].id).delete();
};
A.idKey=function(s){ return String(s).trim().replace(/[\/\s.#$\[\]]+/g,'_').slice(0,120) || 'x' };
})();
