/* Módulo Embalamento: specs de paletização por MM, velocidades por cortante, mapa de entregas e planeamento de cargas e pessoas. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, C='var(--c-emb)', MOD='Embalamento', I=window.Impressao;
var fv=I.fv, F=I.F, selOpts=I.selOpts, bindFilters=I.bindFilters;

/* ---------- dados ---------- */
var MMCOLS=[
  {k:'mm',l:'MM',re:/^mm\b|^artigo|^codigo|^cod\.?|^ref|^material/,req:1},
  {k:'descricao',l:'Descrição',re:/descri|designa/},
  {k:'cliente',l:'Cliente',re:/cliente/},
  {k:'cortante',l:'Cortante',re:/cortante|ferramenta|^die/},
  {k:'cantoneiras',l:'Cantoneiras',re:/cantoneira/,t:'bool'},
  {k:'tampo',l:'Tampo de madeira',re:/tampo|madeira/,t:'bool'},
  {k:'camadas',l:'Maços por altura',re:/maco.*altura|por altura|camada|alturas/,t:'num'},
  {k:'macosBase',l:'Maços por base',re:/maco.*base|por base|base/,t:'num'},
  {k:'unMaco',l:'Unidades por maço',re:/(un|unid|caixas|cx).*maco|por maco/,t:'num'},
  {k:'unPalete',l:'Unidades por palete',re:/(un|unid|caixas|cx|total).*palete|por palete/,t:'num'},
  {k:'alturaPalete',l:'Altura da palete (mm)',re:/altura/,t:'num'},
  {k:'palete',l:'Tipo de palete',re:/tipo.*palete|^palete/},
  {k:'protecao',l:'Proteção sup./inf.',re:/protec/},
  {k:'separacao',l:'Separação',re:/separa/},
  {k:'retratil',l:'Retratilizado',re:/retrat/,t:'bool'},
  {k:'filme',l:'Filme estirável',re:/filme|estirav/},
  {k:'cintaL',l:'Cintas longitudinais',re:/cinta.*long/,t:'num'},
  {k:'cintaT',l:'Cintas transversais',re:/cinta.*transv/,t:'num'},
  {k:'udsH',l:'Uptime esperado (uds/h, 1 pessoa)',re:/uptime|uds?\/h/,t:'num'},
  {k:'pdf',l:'PDF de paletização (link)',re:/pdf|sharepoint|link/},
  {k:'obs',l:'Observações',re:/obs|nota/}
];
/* grupos do formulário de specs */
var SPEC_GRUPOS=[
  ['Identificação',['mm','descricao','cliente','cortante']],
  ['Paletização',['macosBase','camadas','unMaco','unPalete','alturaPalete','palete','protecao','separacao','cantoneiras','tampo']],
  ['Embalamento',['retratil','filme','cintaL','cintaT']],
  ['Produção',['udsH','pdf','obs']]
];
var TURNOS=[['t1','Turno 1','06–14h'],['t2','Turno 2','14–22h'],['t3','Turno 3','22–06h']];
var CTCOLS=[
  {k:'cortante',l:'Cortante',re:/cortante|ferramenta|^die|rotulos de linha/,req:1},
  {k:'udsHPs',l:'Uds/h por pessoa',re:/uds?\/h\/ps|h\/p|por pessoa/,t:'num',req:1},
  {k:'udsH1',l:'Uds/h com 1 pessoa',re:/1 ?pessoa|1 ?p\b/,t:'num'},
  {k:'udsH2',l:'Uds/h com 2 pessoas',re:/2 ?pessoas|2 ?p\b/,t:'num'}
];
var MPCOLS=[
  {k:'data',l:'Data de entrega',re:/data|entrega/,t:'date',req:1,fill:1},
  {k:'mm',l:'MM',re:/^mm\b|artigo|material|^codigo|^cod\.?|^ref/,req:1},
  {k:'cliente',l:'Cliente',re:/cliente/,fill:1},
  {k:'prioridade',l:'Prioridade',re:/priorid/},
  {k:'obs',l:'Observações',re:/^obs/},
  {k:'of',l:'OF',re:/^of\b|ordem/},
  {k:'qtd',l:'Quantidade',re:/quant|qtd|unid/,t:'num'},
  {k:'paletes',l:'Paletes',re:/palete/,t:'num'},
  {k:'carga',l:'Carga / camião',re:/carga|camiao|matricula|transport|viagem/},
  {k:'hora',l:'Hora',re:/^hora/},
  {k:'cortante',l:'Cortante',re:/cortante|ferramenta/},
  {k:'descricao',l:'Descrição',re:/descri|designa/}
];
var _sp=null,_ct=null;
/* specs por MM: SAP (Z09) < Dados.xlsx < importações < alterações feitas na app */
function specs(){ var sap=S.hist.sap||[], k=sap.length+'|'+S.hist.mm.length+'|'+A.list('emb_mm').length+'|'+A.list('emb_mmx').map(function(d){return d.id+(d.alteradoEm||'')}).join(); if(_sp&&_sp.k===k) return _sp.v;
  var m={}; sap.forEach(function(r){ m[String(r.mm)]=r }); S.hist.mm.forEach(function(r){ m[String(r.mm)]=Object.assign({},m[String(r.mm)]||{},r) }); A.chunked('emb_mm','emb_mmx','mm').forEach(function(r){ m[String(r.mm)]=Object.assign({},m[String(r.mm)]||{},r) }); _sp={k:k,v:m}; return m }
function cortantes(){ var base=(S.hist.cort&&S.hist.cort.cortantes)||[], k=base.length+'|'+A.list('emb_cort').length+'|'+A.list('emb_cortx').map(function(d){return d.id+(d.alteradoEm||'')}).join(); if(_ct&&_ct.k===k) return _ct.v;
  var m={}; base.forEach(function(r){ m[String(r.cortante)]=Object.assign({fonte:'Dados op'},r) }); A.chunked('emb_cort','emb_cortx','cortante').forEach(function(r){ m[String(r.cortante)]=Object.assign({},m[String(r.cortante)]||{},r) }); _ct={k:k,v:m}; return m }
function mediana(){ var v=Object.keys(cortantes()).map(function(k){return cortantes()[k].udsHPs}).filter(function(x){return x>0}).sort(function(a,b){return a-b}); return v.length? v[Math.floor(v.length/2)] : null }
function mapas(){ var g={}; A.list('emb_mapas').forEach(function(d){ var k=d.mapa||d.id; (g[k]=g[k]||{id:k,nome:d.nome,importadoEm:d.importadoEm,linhas:[]}).linhas=g[k].linhas.concat((d.linhas||[]).map(function(l,i){ l._i=(d.parte||0)*500+i; return l })) }); return Object.keys(g).map(function(k){return g[k]}).sort(function(a,b){return (b.importadoEm||'')<(a.importadoEm||'')?-1:1}) }
function unPal(s){ if(!s) return null; if(s.unPalete) return s.unPalete; return (s.unMaco&&s.macosBase&&s.camadas)? s.unMaco*s.macosBase*s.camadas : null }
function capCfg(){ return +A.cfg('embalamento').capacidade || 450 }
function pessoasEmb(){ var o=A.operadores('Embalamento'); return o.length? o : A.operadores() }

/* um MM "tem specs" quando há pelo menos um dado de paletização ou de uptime (o SAP traz muitos só com a descrição) */
function temSpec(s){ return !!(s && (s.macosBase||s.camadas||s.unMaco||s.unPalete||s.alturaPalete||s.udsH)) }

/* tarefas de um dia. Velocidade: uptime da spec do MM > medições do cortante > média geral */
function jobs(mapa, data){
  var SP=specs(), CT=cortantes(), MED=mediana();
  return (mapa? mapa.linhas : []).filter(function(r){ return r.data===data }).map(function(r){
    var s=SP[String(r.mm)], cId=(s&&s.cortante)||r.cortante, c=cId? CT[String(cId)] : null, up=unPal(s);
    var pal=r.paletes || (r.qtd&&up? Math.ceil(r.qtd/up) : null);
    var fonte='spec', ps=s&&s.udsH;
    if(!ps){ fonte='cortante'; ps=c&&c.udsHPs }
    if(!ps){ fonte='média geral'; ps=MED }
    var h1=(fonte==='cortante'&&c.udsH1)||ps, h2=(fonte==='cortante'&&c.udsH2)||(ps? ps*2 : null);
    var t1=r.qtd&&h1? r.qtd/h1*60 : null, t2=r.qtd&&h2? r.qtd/h2*60 : null, est2=!(fonte==='cortante'&&c.udsH2);
    var warn=[]; if(!temSpec(s)) warn.push('MM sem specs'); if(fonte==='média geral') warn.push('velocidade estimada (média geral)'); if(!r.qtd) warn.push('sem quantidade');
    return {k:A.idKey((r.of||'')+'_'+r.mm+'_'+r._i), r:r, s:s, desc:r.descricao||(s&&s.descricao)||'', cort:cId, pal:pal, ps:ps, h1:h1, h2:h2, t1:t1, t2:t2, est2:est2, est:fonte==='média geral', fonte:fonte, warn:warn};
  });
}
/* minutos de uma entrega para uma equipa de n pessoas */
function tN(j, n){ if(!j.r.qtd) return null; var rate= n===1? j.h1 : n===2? j.h2 : (j.ps? j.ps*n : null); return rate? j.r.qtd/rate*60 : null }
function carga(crew, byK){ return (crew.jobs||[]).reduce(function(s,k){ var j=byK[k]; return s+(j? tN(j,crew.n)||0 : 0) },0) }
/* distribuição automática: entregas por hora (se houver) e depois as maiores primeiro;
   cada uma vai para a equipa com menos carga do primeiro turno onde ainda cabe; se não couber em lado nenhum, para a menos carregada */
function distribuir(js, turnos, cap){
  var T={}, crews=[], byK={}; js.forEach(function(j){ byK[j.k]=j });
  TURNOS.forEach(function(t){ T[t[0]]=(turnos[t[0]]||[]).map(function(c){ var x={id:c.id,n:c.n,jobs:[],t:t[0]}; crews.push(x); return x }) });
  if(!crews.length) return null;
  var load=function(c){ return carga(c,byK) };
  js.filter(function(j){return j.t1!=null}).sort(function(a,b){ var ha=a.r.hora||'99', hb=b.r.hora||'99'; return ha<hb?-1:ha>hb?1:b.t1-a.t1 }).forEach(function(j){
    var pick=null;
    for(var i=0;i<TURNOS.length && !pick;i++){
      var fit=T[TURNOS[i][0]].filter(function(c){ return load(c)+(tN(j,c.n)||0)<=cap }).sort(function(a,b){ return load(a)-load(b) });
      pick=fit[0]||null;
    }
    if(!pick) pick=crews.slice().sort(function(a,b){ return load(a)/a.n-load(b)/b.n })[0];
    pick.jobs.push(j.k);
  });
  var out={}; TURNOS.forEach(function(t){ out[t[0]]=T[t[0]].map(function(c){ return {id:c.id,n:c.n,jobs:c.jobs} }) }); return out;
}
function hm(min){ if(min==null) return '–'; var h=Math.floor(min/60), m=Math.round(min%60); return (h?h+' h ':'')+(m||!h?m+' min':'') }

/* ---------- formulários ---------- */
/* s = spec existente (editar) ou valores iniciais; o = {novo, intro, title, queue} */
function specForm(s, o){
  o=o||{};
  if(!S.db){ A.toast('Sem ligação à base de dados.'); return }
  var edit=!!s && !o.novo;
  if(edit && !S.admin){ A.toast('Só um editor altera specs existentes.'); return }
  var byK={}; MMCOLS.forEach(function(c){ byK[c.k]=c });
  var fields=[]; SPEC_GRUPOS.forEach(function(g){ fields.push({t:'sep',l:g[0]}); g[1].forEach(function(k){ var c=byK[k];
    fields.push({k:k,l:c.l,t:c.t==='num'?'number':c.t==='bool'?'check':k==='obs'?'textarea':k==='pdf'?'url':'text',req:c.req||(o.novo&&k==='udsH'),
      help:k==='udsH'?'Unidades por hora com 1 pessoa. É o que o plano de cargas usa para calcular o tempo.':k==='alturaPalete'?'Em milímetros (ex.: 1500)':k==='pdf'?'Link para o PDF (mais tarde no SharePoint)':null}) }) });
  A.openForm({title:o.title||(edit?'Specs · MM '+s.mm:'Nova spec de MM'), intro:o.intro, values:s||{}, fields:fields, noFocus:!!o.novo,
    del: edit&&S.admin? function(){ return S.db.doc('emb_mmx/'+A.idKey(s.mm)).set({_del:true}) } : null,
    after:function(box){ if(!o.queue) return;
      var skip=document.createElement('button'); skip.type='button'; skip.className='btn'; skip.textContent='Saltar este MM'; skip.onclick=A.closeModal; $('fcancel').before(skip);
      $('fcancel').textContent='Parar'; $('fcancel').onclick=function(){ S._ebMiss=null; A.closeModal() } },
    submit:function(x){ x.mm=String(x.mm).trim(); x.alteradoEm=A.nowIso(); x.alteradoPor=S.uid||''; return S.db.doc('emb_mmx/'+A.idKey(x.mm)).set(x) }});
}
/* fila de MM sem specs: abre um formulário de cada vez (ver bind da vista 'cargas') */
function missForm(){
  var q=S._ebMiss; if(!q||!q.length){ S._ebMiss=null; return }
  var x=q.shift(), SP=specs(), base=Object.assign({},SP[x.mm]||{},{mm:x.mm,descricao:(SP[x.mm]&&SP[x.mm].descricao)||x.descricao||'',cliente:(SP[x.mm]&&SP[x.mm].cliente)||x.cliente||''});
  specForm(base,{novo:1,queue:1,title:'MM '+x.mm+' sem specs',intro:'Este MM está no mapa de entregas mas não tem specs de paletização. Preencha a paletização, o embalamento e o uptime esperado para o plano de cargas o conseguir calcular.'+(q.length?' <b>Faltam mais '+q.length+'.</b>':'')});
}
function cortForm(c){
  if(!S.admin){ A.toast('Só um editor altera as velocidades.'); return }
  var edit=!!c;
  A.openForm({title:edit?'Cortante':'Novo cortante', values:c||{}, intro:'Velocidade de paletização medida (unidades por hora). '+(edit&&c.registos?'Calculada a partir de '+c.registos+' registos de produção ('+fmt(c.horas,0)+' h·pessoa).':''),
    fields:[{k:'cortante',l:'Cortante',req:1,full:1},{k:'udsHPs',l:'Uds/h por pessoa',t:'number',req:1},{k:'udsH1',l:'Uds/h com 1 pessoa',t:'number',help:'Vazio = uds/h por pessoa'},{k:'udsH2',l:'Uds/h com 2 pessoas',t:'number',help:'Vazio = 2 × uds/h por pessoa'}],
    del: edit? function(){ return S.db.doc('emb_cortx/'+A.idKey(c.cortante)).set({_del:true}) } : null,
    submit:function(x){ x.cortante=String(x.cortante).trim(); return S.db.doc('emb_cortx/'+A.idKey(x.cortante)).set(x) }});
}
function pdfsDe(mm){ mm=String(mm); var s=specs()[mm], l=A.list('emb_pdfs').filter(function(p){ return (p.mm||'').split(/[\s,;]+/).indexOf(mm)>=0 }); if(s&&s.pdf) l.unshift({titulo:'PDF da spec',url:s.pdf}); return l }
function specIcons(s, mm){
  if(!temSpec(s)) return '<a href="#" class="pill bad" data-addspec="'+esc(mm||(s&&s.mm)||'')+'">sem specs · preencher</a>';
  var b=[]; b.push(s.cantoneiras?'<span class="pill info">Cantoneiras</span>':''); b.push(s.tampo?'<span class="pill warn">Tampo madeira</span>':'');
  if(s.alturaPalete) b.push('<span class="pill mute">'+fmt(s.alturaPalete,0)+' mm</span>');
  if(s.macosBase||s.camadas) b.push('<span class="pill mute">'+(s.macosBase||'?')+' × '+(s.camadas||'?')+' maços</span>');
  return b.filter(Boolean).join(' ');
}
function specCard(s){
  var up=unPal(s), CT=cortantes(), c=s.cortante? CT[String(s.cortante)] : null;
  var big=function(l,v,cls){ return '<div class="kpi '+(cls||'')+'"><b>'+v+'</b><span>'+esc(l)+'</span></div>' };
  A.showModal('<h2>MM <span class="mono">'+esc(s.mm)+'</span></h2><p class="muted" style="margin:-6px 0 0">'+esc([s.descricao,s.cliente].filter(Boolean).join(' · ')||'')+'</p>'+
    '<div class="kpis" style="margin:0">'+big('Cantoneiras',s.cantoneiras?'Sim':'Não',s.cantoneiras?'warn':'')+big('Tampo de madeira',s.tampo?'Sim':'Não',s.tampo?'warn':'')+big('Altura da palete',s.alturaPalete?fmt(s.alturaPalete,0)+' mm':'–')+
      big('Maços por base',s.macosBase||'–')+big('Maços por altura',s.camadas||'–')+big('Unidades por maço',s.unMaco?fmt(s.unMaco,0):'–')+big('Unidades por palete',up?fmt(up,0):'–')+big('Tipo de palete',esc(s.palete||'–'))+'</div>'+
    '<dl class="detail"><div><dt>Uptime esperado</dt><dd>'+(s.udsH?fmt(s.udsH,0)+' uds/h · 1 pessoa':'–')+'</dd></div><div><dt>Cortante</dt><dd>'+esc(s.cortante||'–')+'</dd></div><div><dt>Velocidade do cortante</dt><dd>'+(c&&c.udsHPs?fmt(c.udsHPs,0)+' uds/h/pessoa':'–')+'</dd></div>'+
      '<div><dt>Proteção sup./inf.</dt><dd>'+esc(s.protecao||'–')+'</dd></div><div><dt>Separação</dt><dd>'+esc(s.separacao||'–')+'</dd></div><div><dt>Retratilizado</dt><dd>'+(s.retratil==null?'–':s.retratil?'Sim':'Não')+'</dd></div>'+
      '<div><dt>Filme estirável</dt><dd>'+esc(s.filme||'–')+'</dd></div><div><dt>Cintas long. / transv.</dt><dd>'+(s.cintaL!=null||s.cintaT!=null?(s.cintaL!=null?s.cintaL:'–')+' / '+(s.cintaT!=null?s.cintaT:'–'):'–')+'</dd></div><div><dt>Fonte</dt><dd>'+esc(s.alteradoEm?'Alterado na app':s.fonte||'Importação')+'</dd></div>'+
      (pdfsDe(s.mm).length?'<div class="full"><dt>PDFs de paletização</dt><dd>'+pdfsDe(s.mm).map(function(p){ return '<a href="'+esc(p.url)+'" target="_blank" rel="noopener">'+esc(p.titulo||'PDF')+' ↗</a>' }).join(' · ')+'</dd></div>':'')+
      (s.obs?'<div class="full"><dt>Observações</dt><dd>'+esc(s.obs)+'</dd></div>':'')+'</dl>'+
    '<div class="foot"><button class="btn" id="spX">Fechar</button>'+(S.admin?'<button class="btn primary" id="spE">Editar</button>':'')+'</div>',
    function(){ $('spX').onclick=A.closeModal; if($('spE')) $('spE').onclick=function(){ specForm(s) } });
}
function semSpecs(rows){ var SP=specs(), seen={}; return rows.filter(function(r){ var mm=String(r.mm||''); if(!mm||seen[mm]||temSpec(SP[mm])) return false; seen[mm]=1; return true }).map(function(r){ return {mm:String(r.mm),descricao:r.descricao||'',cliente:r.cliente||''} }) }
function importMapa(){
  A.importDialog({title:'Carregar mapa de entregas', intro:'Exportação do mapa de entregas (Excel ou colado). Cada linha é uma entrega: data, MM e quantidade ou n.º de paletes.', cols:MPCOLS,
    preview:function(rows){ var ds=Array.from(new Set(rows.map(function(r){return r.data}))).sort(); return 'Datas: '+esc(fdate(ds[0]))+(ds.length>1?' a '+esc(fdate(ds[ds.length-1])):'')+' · '+ds.length+' dia(s).' },
    onRows:async function(rows){
      rows=rows.filter(function(r){ return r.qtd||r.paletes }); if(!rows.length) throw A.uerr('Nenhuma linha tem quantidade nem paletes.');
      var id='m'+Date.now(), nome='Mapa '+new Date().toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}), parts=Math.ceil(rows.length/500);
      for(var i=0;i<parts;i++) await S.db.doc('emb_mapas/'+id+'_p'+i).set({mapa:id, nome:nome, importadoEm:A.nowIso(), importadoPor:S.uid||'', parte:i, linhas:rows.slice(i*500,(i+1)*500)});
      F.ebMapa=id; var ds=rows.map(function(r){return r.data}).sort(); F.ebData=ds.filter(function(d){return d>=A.today()})[0]||ds[0];
      var miss=semSpecs(rows); S._ebMiss=miss.length? miss : null; S.tabs.emb='plano';
      return rows.length+' entregas carregadas.'+(miss.length?' '+miss.length+' MM sem specs: vamos preenchê-los.':'');
    }});
}

/* ---------- vista: planeamento ---------- */
var saveT;
function savePlan(id, plano){ clearTimeout(saveT); saveT=setTimeout(function(){ A.put('emb_planos',id,plano).catch(function(){ A.toast('Não foi possível guardar o plano.') }) },300) }
function uid(){ return 'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,5) }
function turnosDe(plano){ var t=JSON.parse(JSON.stringify(plano.turnos||{})); TURNOS.forEach(function(x){ t[x[0]]=t[x[0]]||[] }); return t }
function jobCard(j){
  return '<div class="eb-job'+(temSpec(j.s)?'':' nospec')+'" draggable="true" data-job="'+esc(j.k)+'" title="Arraste para uma equipa, ou clique e depois clique na equipa">'+
    '<b>'+esc(j.r.cliente||'–')+'</b>'+(j.r.hora?' <span class="small muted">'+esc(j.r.hora)+'</span>':'')+
    '<div class="small"><a href="#" data-spec="'+esc(j.r.mm)+'" class="mono">MM '+esc(j.r.mm)+'</a> · '+esc((j.desc||'').slice(0,48))+'</div>'+
    '<div class="small muted">'+(j.pal!=null?fmt(j.pal,0)+' pal · ':'')+(j.r.qtd!=null?fmt(j.r.qtd,0)+' uds · ':'')+hm(j.t1)+' (1 pessoa)'+(j.est?' · estimado':'')+'</div>'+
    (temSpec(j.s)?'':'<div class="small"><a href="#" data-addspec="'+esc(j.r.mm)+'" style="color:var(--bad)">sem specs · preencher</a></div>')+'</div>';
}
function crewHtml(tid, c, byK, cap){
  var segs=(c.jobs||[]).map(function(k){ var j=byK[k]; return j? {j:j,t:tN(j,c.n)||0} : null }).filter(Boolean);
  var tot=segs.reduce(function(s,x){return s+x.t},0), mx=Math.max(cap,tot), acc=0;
  var blocks=segs.map(function(x){ acc+=x.t; var late=acc>cap;
    return '<div class="eb-blk'+(x.j.est?' est':'')+(late?' late':'')+'" style="height:'+(x.t/mx*100)+'%" data-unjob="'+esc(x.j.k)+'" title="'+esc((x.j.r.cliente||'')+' · MM '+x.j.r.mm+' · '+(x.j.desc||'')+' · '+(x.j.pal!=null?x.j.pal+' pal · ':'')+hm(x.t)+(late?' · passa do fim do turno':'')+' — clique para tirar')+'">'+esc(x.j.r.mm)+'<br>'+hm(x.t)+'</div>' }).join('');
  return '<div class="eb-crew" data-crew="'+tid+'|'+esc(c.id)+'"><div class="lbl"><span>'+c.n+' '+(c.n>1?'pessoas':'pessoa')+'</span><button class="eb-x" data-delcrew="'+tid+'|'+esc(c.id)+'" title="Tirar equipa">×</button></div>'+
    '<div class="eb-stack">'+blocks+'<span class="cap" style="bottom:'+(cap/mx*100)+'%"></span></div>'+
    '<div class="small mono" style="color:'+(tot>cap?'var(--bad)':tot>cap*.85?'var(--warn)':'var(--muted)')+'">'+hm(tot)+' · '+fmt(tot/cap*100,0)+'%</div></div>';
}
A.register('cargas',{
  html:function(){
    var t=A.tab('emb','plano'), MP=mapas(), SP=specs(), CT=cortantes();
    var mapa=MP.filter(function(m){return m.id===fv('ebMapa','')})[0]||MP[0];
    var datas=mapa? Array.from(new Set(mapa.linhas.map(function(r){return r.data}))).sort() : [];
    var data=fv('ebData',''); if(datas.indexOf(data)<0) data=datas.filter(function(d){return d>=A.today()})[0]||datas[0]||'';
    var body='', acts='<button class="btn" id="ebImp">Carregar mapa de entregas</button>';
    S._eb=null;
    if(t==='plano'){
      var pid=A.idKey((mapa?mapa.id:'x')+'_'+data), plano=A.get('emb_planos',pid)||{};
      var cap=plano.cap||capCfg(), js=jobs(mapa,data), turnos=turnosDe(plano), byK={}; js.forEach(function(j){ byK[j.k]=j });
      var usados={}; TURNOS.forEach(function(x){ turnos[x[0]].forEach(function(c){ (c.jobs||[]).forEach(function(k){ usados[k]=x[0] }) }) });
      var livres=js.filter(function(j){ return !usados[j.k] });
      var tot1=js.reduce(function(s,j){return s+(j.t1||0)},0), totPal=js.reduce(function(s,j){return s+(j.pal||0)},0);
      var semSp=semSpecs(js.map(function(j){return j.r})), nEst=js.filter(function(j){return j.est}).length;
      var pessoas=0; TURNOS.forEach(function(x){ turnos[x[0]].forEach(function(c){ pessoas+=c.n }) });
      S._eb={pid:pid, plano:plano, js:js, cap:cap, mapa:mapa, data:data, turnos:turnos};
      if(!mapa) body='<div class="panel empty">Ainda não há mapa de entregas. Carregue o Excel do mapa de entregas para começar.</div>';
      else body=
        '<div class="filters"><select data-f="ebMapa">'+selOpts(MP.map(function(m){return [m.id,m.nome+' · '+m.linhas.length+' linhas']}),mapa.id)+'</select>'+
        '<select data-f="ebData">'+selOpts(datas.map(function(d){return [d,'Entregas de '+fdate(d)+' ('+mapa.linhas.filter(function(r){return r.data===d}).length+')']}),data)+'</select>'+
        '<label class="small muted" style="display:flex;gap:6px;align-items:center">Minutos úteis por turno <input id="ebCap" inputmode="numeric" value="'+cap+'" style="width:70px"></label></div>'+
        A.kpis([{v:js.length,l:'Entregas do dia'},{v:totPal?fmt(totPal,0):'–',l:'Paletes a preparar'},{v:hm(tot1),l:'Trabalho total (1 pessoa)',s:'≈ '+fmt(tot1/cap,1)+' turnos de 1 pessoa'},
          {v:pessoas,l:'Pessoas nos turnos'},{v:livres.length,l:'Por atribuir',cls:livres.length?'warn':''},
          {v:semSp.length,l:'MM sem specs',cls:semSp.length?'warn':'',s:semSp.length?'<a href="#" id="ebMiss">preencher agora</a>':(nEst?nEst+' com velocidade estimada':'')}])+
        '<div class="panel" style="margin-bottom:14px"><div class="ph"><h2>Equipas por turno</h2><div class="acts"><button class="btn sm primary" id="ebSug">Sugerir distribuição</button><button class="btn sm ghost" id="ebClr">Limpar entregas</button><button class="btn sm ghost" id="ebClrAll">Limpar tudo</button></div></div>'+
          '<div class="eb-pal"><span class="small muted">Arraste para um turno:</span>'+[1,2,4].map(function(n){ return '<span class="eb-chip" draggable="true" data-chip="'+n+'">'+n+' '+(n>1?'pessoas':'pessoa')+'</span>' }).join('')+
          '<span class="small muted">No telemóvel: toque na equipa e depois no turno.</span></div>'+
          '<div class="eb-shifts">'+TURNOS.map(function(x){ var cs=turnos[x[0]], n=cs.reduce(function(s,c){return s+c.n},0), w=cs.reduce(function(s,c){return s+carga(c,byK)},0);
            var gente=A.operadores('Embalamento').filter(function(o){ return (o.turno||'').replace('h','')===x[2].replace('–','-').replace('h','') }).map(function(o){ return o.nome });
            return '<div class="eb-shift" data-shift="'+x[0]+'"><h3>'+x[1]+' <span class="small mono muted">'+x[2]+'</span></h3>'+(gente.length?'<div class="small" title="Pessoas do Embalamento neste turno (Dados mestre)"><b>'+gente.length+' no turno:</b> '+esc(gente.join(', '))+'</div>':'')+'<div class="small muted">'+(cs.length? n+' pessoa'+(n>1?'s':'')+' · '+hm(w)+' de trabalho' : 'Largue aqui as equipas deste turno')+'</div>'+
              '<div class="eb-crews">'+cs.map(function(c){ return crewHtml(x[0],c,byK,cap) }).join('')+'</div></div>' }).join('')+'</div>'+
          '<p class="small muted" style="margin:0">Cada coluna é a pilha de trabalho de uma equipa; a linha tracejada é o fim do turno ('+hm(cap)+'). Vermelho = passa do turno; riscado = velocidade estimada. Clique num bloco para o devolver à lista.</p></div>'+
        '<div class="panel" data-pool="1"><div class="ph"><h2>Entregas por atribuir <span class="small muted">('+livres.length+')</span></h2></div>'+
          (livres.length? '<div class="eb-jobs">'+livres.map(jobCard).join('')+'</div>' : '<p class="muted small" style="margin:0">Todas as entregas do dia estão atribuídas.</p>')+'</div>';
    } else if(t==='mapa'){
      var mp=MP.filter(function(m){return m.id===fv('ebMapa','')})[0]||MP[0];
      body=mp? '<div class="filters"><select data-f="ebMapa">'+selOpts(MP.map(function(m){return [m.id,m.nome+' · '+m.linhas.length+' linhas']}),mp.id)+'</select>'+(S.admin?'<button class="btn sm danger" id="ebDelM">Apagar este mapa</button>':'')+'</div>'+
        A.table(mp.linhas.slice().sort(A.by('data')).map(function(r){ var s=SP[String(r.mm)]; return Object.assign({id:'r'+r._i,_s:s},r) }),[{l:'Data',v:function(r){return fdate(r.data)+(r.hora?' <span class="small muted">'+esc(r.hora)+'</span>':'')}},{l:'Cliente',v:function(r){return esc(r.cliente||'–')}},
          {l:'MM',v:function(r){return '<a href="#" data-spec="'+esc(r.mm)+'" class="mono">'+esc(r.mm)+'</a>'}},{l:'Descrição',v:function(r){return '<span class="small">'+esc(r.descricao||(r._s&&r._s.descricao)||'–')+'</span>'}},{l:'OF',v:function(r){return esc(r.of||'–')}},{l:'Qtd',n:1,v:function(r){return r.qtd!=null?fmt(r.qtd,0):'–'}},{l:'Paletes',n:1,v:function(r){return r.paletes!=null?fmt(r.paletes,0):'–'}},{l:'Carga',v:function(r){return esc(r.carga||'–')}},{l:'Specs',v:function(r){return specIcons(r._s,r.mm)}}],{max:500})
        : '<div class="panel empty">Ainda não há mapa de entregas.</div>';
    } else {
      var rows=Object.keys(CT).map(function(k){var c=CT[k]; c.id=k; return c}).filter(function(c){var q=fv('ebq','').toLowerCase(); return !q||[c.cortante,c.descricao].join(' ').toLowerCase().indexOf(q)>=0}).sort(A.by('cortante'));
      acts=S.admin?'<button class="btn" id="ebCtImp">Importar velocidades</button><button class="btn primary" id="ebCtNew">+ Cortante</button>':'';
      body='<div class="filters"><input type="search" id="ebq" data-f="ebq" placeholder="Procurar cortante…" value="'+esc(fv('ebq',''))+'"></div>'+
        '<p class="small muted" style="margin:-4px 0 10px">Calculado a partir do registo de produção do embalamento (Dados.xlsx · Dados op): unidades ÷ (horas × pessoas). Usado quando o MM não tem uptime esperado. Média geral quando o cortante não tem medições: <b>'+fmt(mediana(),0)+' uds/h/pessoa</b>.</p>'+
        A.table(rows,[{l:'Cortante',v:function(c){return '<b>'+esc(c.cortante)+'</b>'}},{l:'Uds/h por pessoa',n:1,v:function(c){return fmt(c.udsHPs,0)}},{l:'Uds/h · 1 pessoa',n:1,v:function(c){return c.udsH1?fmt(c.udsH1,0):'–'}},{l:'Uds/h · 2 pessoas',n:1,v:function(c){return c.udsH2?fmt(c.udsH2,0):'–'}},{l:'Registos',n:1,v:function(c){return c.registos||'–'}},{l:'Horas medidas',n:1,v:function(c){return c.horas?fmt(c.horas,0)+' h':'–'}}],{click:1,empty:'Ainda sem velocidades. Importe a base de uptimes por cortante.'});
    }
    return A.head({c:C,mod:MOD,title:'Planeamento de cargas e pessoas',p:'Carregue o mapa de entregas, ponha as equipas em cada turno (06–14h, 14–22h, 22–06h) e distribua as entregas — à mão, a arrastar, ou com a sugestão automática pelos uptimes.',acts:acts})+
      A.tabs('emb',[['plano','Plano do dia'],['mapa','Mapa de entregas'],['vel','Velocidades por cortante']],t)+body;
  },
  bind:function(r){
    if($('ebImp')) $('ebImp').onclick=importMapa;
    if($('ebCtNew')) $('ebCtNew').onclick=function(){cortForm()};
    if($('ebCtImp')) $('ebCtImp').onclick=function(){ A.importDialog({title:'Importar velocidades por cortante',intro:'Velocidades por cortante em unidades por hora (por pessoa, e opcionalmente com 1 e 2 pessoas). Acrescenta-se às medições do ficheiro Dados; as alterações manuais mantêm-se.',cols:CTCOLS,
      onRows:async function(rows){ rows=rows.filter(function(r){return r.udsHPs}); await A.writeChunks('emb_cort',rows); return rows.length+' cortantes importados.' }}) };
    A.bindRows(r,function(id){ if(A.tab('emb','plano')==='vel'){ var c=cortantes()[id]; if(c) cortForm(c) } });
    bindSpecLinks(r);
    if($('ebDelM')) $('ebDelM').onclick=async function(){ if(this.dataset.ok!=='1'){this.dataset.ok='1';this.textContent='Confirmar';return} var id=fv('ebMapa','')||(mapas()[0]||{}).id; var ds=A.list('emb_mapas').filter(function(d){return (d.mapa||d.id)===id}); for(var i=0;i<ds.length;i++) await A.del('emb_mapas',ds[i].id); F.ebMapa=''; A.toast('Mapa apagado.') };
    bindFilters(r);
    var E=S._eb;
    if(E){
      if($('ebMiss')) $('ebMiss').onclick=function(e){ e.preventDefault(); S._ebMiss=semSpecs(E.js.map(function(j){return j.r})); missForm() };
      var save=function(turnos, extra){ var p={data:E.data, mapa:E.mapa?E.mapa.id:'', cap:E.cap, turnos:turnos}; Object.assign(p,extra||{}); E.plano=p; savePlan(E.pid,p); localRender(p) };
      var tirar=function(T,k){ TURNOS.forEach(function(x){ T[x[0]].forEach(function(c){ c.jobs=(c.jobs||[]).filter(function(y){return y!==k}) }) }) };
      var findCrew=function(T,ref){ var p=ref.split('|'); return (T[p[0]]||[]).filter(function(c){return c.id===p[1]})[0] };
      var addCrew=function(tid,n){ var T=turnosDe(E.plano); T[tid].push({id:uid(),n:+n,jobs:[]}); save(T) };
      var toCrew=function(ref,k){ var T=turnosDe(E.plano), c=findCrew(T,ref); if(!c) return; tirar(T,k); c.jobs.push(k); save(T) };
      var toShift=function(tid,k){ var T=turnosDe(E.plano), byK={}; E.js.forEach(function(j){byK[j.k]=j}); var cs=T[tid]; if(!cs.length){ A.toast('Ponha primeiro uma equipa neste turno.'); return }
        var c=cs.slice().sort(function(a,b){return carga(a,byK)/a.n-carga(b,byK)/b.n})[0]; tirar(T,k); c.jobs.push(k); save(T) };
      /* arrastar (rato) */
      r.querySelectorAll('[data-chip],[data-job]').forEach(function(el){ el.addEventListener('dragstart',function(e){ e.dataTransfer.setData('text/plain', el.dataset.chip? 'chip:'+el.dataset.chip : 'job:'+el.dataset.job); e.dataTransfer.effectAllowed='move' }) });
      var drop=function(el, fn){ el.addEventListener('dragover',function(e){ e.preventDefault(); e.stopPropagation(); el.classList.add('over') }); el.addEventListener('dragleave',function(){ el.classList.remove('over') });
        el.addEventListener('drop',function(e){ e.preventDefault(); e.stopPropagation(); el.classList.remove('over'); var d=(e.dataTransfer.getData('text/plain')||'').split(':'); fn(d[0], d.slice(1).join(':')) }) };
      r.querySelectorAll('[data-crew]').forEach(function(el){ drop(el,function(tp,v){ if(tp==='job') toCrew(el.dataset.crew,v); else if(tp==='chip') addCrew(el.dataset.crew.split('|')[0],v) }) });
      r.querySelectorAll('[data-shift]').forEach(function(el){ drop(el,function(tp,v){ if(tp==='chip') addCrew(el.dataset.shift,v); else if(tp==='job') toShift(el.dataset.shift,v) }) });
      r.querySelectorAll('[data-pool]').forEach(function(el){ drop(el,function(tp,v){ if(tp==='job'){ var T=turnosDe(E.plano); tirar(T,v); save(T) } }) });
      /* tocar (telemóvel): escolher e depois tocar no destino */
      var sel=S._ebSel; if(sel){ var se=r.querySelector(sel.t==='chip'?'[data-chip="'+sel.v+'"]':'[data-job="'+sel.v+'"]'); if(se) se.classList.add('sel'); else S._ebSel=null }
      r.querySelectorAll('[data-chip],[data-job]').forEach(function(el){ el.addEventListener('click',function(e){ if(e.target.closest('a')) return; var v=el.dataset.chip||el.dataset.job, t=el.dataset.chip?'chip':'job'; S._ebSel=(S._ebSel&&S._ebSel.v===v)? null : {t:t,v:v}; A.render() }) });
      r.querySelectorAll('[data-crew]').forEach(function(el){ el.addEventListener('click',function(e){ var s=S._ebSel; if(!s||e.target.closest('[data-delcrew],[data-unjob]')) return; e.stopPropagation(); S._ebSel=null; if(s.t==='job') toCrew(el.dataset.crew,s.v); else addCrew(el.dataset.crew.split('|')[0],s.v) }) });
      r.querySelectorAll('[data-shift]').forEach(function(el){ el.addEventListener('click',function(){ var s=S._ebSel; if(!s) return; S._ebSel=null; if(s.t==='chip') addCrew(el.dataset.shift,s.v); else toShift(el.dataset.shift,s.v) }) });
      r.querySelectorAll('[data-delcrew]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); var p=b.dataset.delcrew.split('|'), T=turnosDe(E.plano); T[p[0]]=T[p[0]].filter(function(c){return c.id!==p[1]}); save(T) } });
      r.querySelectorAll('[data-unjob]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); var T=turnosDe(E.plano); tirar(T,b.dataset.unjob); save(T) } });
      if($('ebSug')) $('ebSug').onclick=function(){ var T=distribuir(E.js,turnosDe(E.plano),E.cap); if(!T){ A.toast('Arraste primeiro as equipas (1, 2 ou 4 pessoas) para os turnos.'); return } save(T,{auto:true}); A.toast('Distribuição sugerida — ajuste à mão se precisar.') };
      if($('ebClr')) $('ebClr').onclick=function(){ var T=turnosDe(E.plano); TURNOS.forEach(function(x){ T[x[0]].forEach(function(c){ c.jobs=[] }) }); save(T) };
      if($('ebClrAll')) $('ebClrAll').onclick=function(){ if(this.dataset.ok!=='1'){this.dataset.ok='1';this.textContent='Confirmar';return} save({t1:[],t2:[],t3:[]}) };
      if($('ebCap')) $('ebCap').onchange=function(){ var v=A.num(this.value); if(!(v>0)) return; E.cap=v; save(turnosDe(E.plano)) };
    }
    /* fila de MM sem specs depois de carregar o mapa */
    if(S._ebMiss && $('modal').hidden) setTimeout(function(){ if($('modal').hidden) missForm() },0);
  }
});
function bindSpecLinks(r){
  r.querySelectorAll('[data-spec]').forEach(function(a){ a.onclick=function(e){ e.preventDefault(); e.stopPropagation(); var s=specs()[a.dataset.spec]; if(temSpec(s)) specCard(s); else specForm(Object.assign({mm:a.dataset.spec},s||{}),{novo:1,title:'MM '+a.dataset.spec+' sem specs'}) } });
  r.querySelectorAll('[data-addspec]').forEach(function(a){ a.onclick=function(e){ e.preventDefault(); e.stopPropagation(); S._ebMiss=[{mm:a.dataset.addspec}]; missForm() } });
}
/* mostra já a alteração enquanto a gravação segue */
function localRender(p){ var arr=A.list('emb_planos'), i=arr.findIndex(function(x){return x.id===S._eb.pid}); var o=Object.assign({id:S._eb.pid},p); if(i>=0) arr[i]=o; else arr.push(o); A.render() }


/* ---------- vista: biblioteca de specs e PDFs ---------- */
function pdfForm(p){
  if(!S.db){ A.toast('Sem ligação à base de dados.'); return }
  var edit=!!p;
  A.openForm({title:edit?'PDF de paletização':'Novo PDF de paletização', values:p||{}, intro:'Especificação detalhada em PDF. Por agora um link (OneDrive, SharePoint…); mais tarde liga-se à biblioteca do SharePoint.',
    fields:[{k:'titulo',l:'Título',req:1,full:1},{k:'url',l:'Link do PDF',t:'url',req:1,full:1},{k:'mm',l:'MM',help:'Um ou vários, separados por vírgula'},{k:'cliente',l:'Cliente'},{k:'obs',l:'Observações',t:'textarea',rows:2}],
    del: edit&&S.admin? function(){ return A.del('emb_pdfs',p.id) } : null,
    submit:function(x){ return edit? A.put('emb_pdfs',p.id,x) : A.add('emb_pdfs',x) }});
}
A.register('specs',{
  html:function(){
    var t=A.tab('spec','lib'), body='', acts='';
    if(t==='lib'){
      var SP=specs(), q=fv('spq','').toLowerCase().trim(), all=Object.keys(SP).map(function(k){var s=SP[k]; s.id=k; return s}), com=all.filter(temSpec);
      var rows=q? all.filter(function(s){ return [s.mm,s.descricao,s.cliente,s.cortante].join(' ').toLowerCase().indexOf(q)>=0 }).sort(A.by('mm')) : com.filter(function(s){return s.alteradoEm}).sort(A.by('alteradoEm',-1));
      acts=(S.admin?'<button class="btn" id="spImp">Importar specs</button>':'')+'<button class="btn primary" id="spNew">+ MM</button>';
      var novo=q && /^\d{6,}$/.test(q) && !SP[q];
      body=A.kpis([{v:fmt(all.length,0),l:'MM na base',s:'SAP (Z09) + importações + app'},{v:fmt(com.length,0),l:'Com specs de paletização'},{v:fmt(all.filter(function(s){return s.udsH}).length,0),l:'Com uptime esperado'},{v:fmt(all.filter(function(s){return s.alteradoEm}).length,0),l:'Criados/alterados na app'}])+
        '<div class="filters"><input type="search" id="spq" data-f="spq" placeholder="Procurar MM, descrição, cliente, cortante…" value="'+esc(fv('spq',''))+'" style="font-size:16px;padding:10px 12px;min-width:min(100%,420px)"></div>'+
        (novo?'<div class="banner">O MM <b class="mono">'+esc(q)+'</b> não existe na base. <a href="#" data-addspec="'+esc(q)+'">Criar a spec agora</a></div>':'')+
        (q?'':'<p class="small muted" style="margin:-4px 0 10px">Escreva para procurar nos '+fmt(all.length,0)+' MM. Em baixo: os últimos criados ou alterados na app.</p>')+
        A.table(rows,[{l:'MM',v:function(s){return '<b class="mono">'+esc(s.mm)+'</b>'}},{l:'Descrição',v:function(s){return esc(s.descricao||'–')+'<div class="small muted">'+esc(s.cliente||'')+'</div>'}},
          {l:'Base × altura',n:1,v:function(s){return s.macosBase||s.camadas? (s.macosBase||'?')+' × '+(s.camadas||'?') : '–'}},{l:'Altura',n:1,v:function(s){return s.alturaPalete?fmt(s.alturaPalete,0)+' mm':'–'}},
          {l:'Cantoneiras',v:function(s){return s.cantoneiras?'<span class="pill info">Sim</span>':s.cantoneiras===false?'Não':'–'}},{l:'Proteção',v:function(s){return esc(s.protecao||'–')}},
          {l:'Uptime',n:1,v:function(s){return s.udsH?fmt(s.udsH,0)+' uds/h':'–'}},{l:'',v:function(s){return temSpec(s)?(pdfsDe(s.mm).length?'<span class="pill info">PDF</span>':''):'<span class="pill bad">sem specs</span>'}}],
          {click:1,max:200,empty:q?'Nenhum MM encontrado.':'Ainda não foram criadas specs na app.'});
    } else {
      var pq=fv('pdq','').toLowerCase().trim(), L=A.list('emb_pdfs').filter(function(p){ return !pq||[p.titulo,p.mm,p.cliente,p.obs].join(' ').toLowerCase().indexOf(pq)>=0 }).sort(A.by('titulo'));
      acts='<button class="btn primary" id="pdNew">+ PDF</button>';
      body='<div class="filters"><input type="search" id="pdq" data-f="pdq" placeholder="Procurar título, MM, cliente…" value="'+esc(fv('pdq',''))+'" style="font-size:16px;padding:10px 12px"></div>'+
        '<p class="small muted" style="margin:-4px 0 10px">Especificações de paletização detalhadas. Para já são links; a ligação direta à biblioteca do SharePoint vem depois.</p>'+
        A.table(L,[{l:'Título',v:function(p){return '<b>'+esc(p.titulo)+'</b>'+(p.obs?'<div class="small muted">'+esc(p.obs)+'</div>':'')}},{l:'MM',v:function(p){return '<span class="mono small">'+esc(p.mm||'–')+'</span>'}},{l:'Cliente',v:function(p){return esc(p.cliente||'–')}},
          {l:'',v:function(p){return '<a href="'+esc(p.url)+'" target="_blank" rel="noopener" data-open="1">abrir ↗</a>'}}],{click:1,empty:'Ainda sem PDFs. Acrescente o primeiro com “+ PDF”.'});
    }
    return A.head({c:C,mod:MOD,title:'Specs de embalamento',p:'Biblioteca de specs de paletização e embalamento por MM (base SAP Z09) e PDFs com as especificações detalhadas. Se um MM não existir, crie-o aqui.',acts:acts})+
      A.tabs('spec',[['lib','Biblioteca de specs'],['pdf','PDFs de paletização']],t)+body;
  },
  bind:function(r){
    var t=A.tab('spec','lib');
    if($('spNew')) $('spNew').onclick=function(){ var q=fv('spq','').trim(); specForm(/^\d{6,}$/.test(q)?{mm:q}:{},{novo:1}) };
    if($('pdNew')) $('pdNew').onclick=function(){ pdfForm() };
    if($('spImp')) $('spImp').onclick=function(){ A.importDialog({title:'Importar specs de paletização',intro:'Uma linha por MM. Substitui a lista importada anteriormente; as alterações feitas à mão nesta app mantêm-se. Para sim/não use “Sim”, “S” ou “X”.',cols:MMCOLS,
      onRows:async function(rows){ var seen={}; rows=rows.filter(function(x){ x.mm=String(x.mm).replace(/\.0$/,''); if(seen[x.mm]) return false; seen[x.mm]=1; return true }); await A.writeChunks('emb_mm',rows); return rows.length+' MM importados.' }}) };
    r.querySelectorAll('[data-open]').forEach(function(a){ a.addEventListener('click',function(e){ e.stopPropagation() }) });
    A.bindRows(r,function(id){ if(t==='lib'){ var s=specs()[id]; if(temSpec(s)) specCard(s); else specForm(Object.assign({mm:id},s||{}),{novo:1,title:'MM '+id+' sem specs'}) } else { var p=A.get('emb_pdfs',id); if(p) pdfForm(p) } });
    bindSpecLinks(r); bindFilters(r);
  }
});
window.Embalamento={mapas:mapas, specs:specs,cortantes:cortantes,jobs:jobs,distribuir:distribuir,temSpec:temSpec};
})();
