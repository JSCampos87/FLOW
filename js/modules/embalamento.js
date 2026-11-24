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
/* nome a mostrar de uma entrega: a OF (o MM só quando o mapa não traz OF) */
function ofDe(j){ return j.r.of? String(j.r.of) : 'MM '+j.r.mm }
/* cores por OF (paleta --s1…--s8, pela ordem em que aparecem no dia) */
function corOFs(js){ var m={}, n=0; js.forEach(function(j){ var o=ofDe(j); if(!m[o]) m[o]='var(--s'+(n++%8+1)+')'; j.cor=m[o] }) }
/* specs de embalamento em frases curtas (para a pilha) */
function specCurta(s){ if(!temSpec(s)) return ['sem specs'];
  var b=[]; if(s.macosBase||s.camadas) b.push((s.macosBase||'?')+'×'+(s.camadas||'?')+' maços'); if(s.alturaPalete) b.push(fmt(s.alturaPalete,0)+' mm');
  if(s.cantoneiras) b.push('Cant.'); if(s.tampo) b.push('Tampo'); if(s.retratil) b.push('Retrátil'); if(s.palete) b.push(s.palete); return b }
/* balão com tudo sobre um bloco da pilha */
function tipHtml(j, n, ini, fim, cap){
  var s=j.s||{}, up=unPal(s), L=function(l,v){ return v==null||v===''? '' : '<div><span>'+esc(l)+'</span><b>'+v+'</b></div>' };
  return '<h4><i style="background:'+j.cor+'"></i>OF '+esc(j.r.of||'–')+'</h4>'+
    '<p>'+esc([j.r.cliente, 'MM '+j.r.mm, j.desc].filter(Boolean).join(' · '))+'</p>'+
    '<div class="g">'+L('Quantidade',j.r.qtd!=null?fmt(j.r.qtd,0)+' uds':'–')+L('Paletes',j.pal!=null?fmt(j.pal,0):'–')+
      L('Tempo ('+n+' '+(n>1?'pessoas':'pessoa')+')',hm(fim-ini))+L('No turno',hm(ini)+' → '+hm(fim)+(fim>cap?' <em>passa do turno</em>':''))+
      L('Velocidade',j.ps?fmt(j.ps,0)+' uds/h/pessoa · '+esc(j.fonte):'–')+'</div>'+
    (temSpec(j.s)? '<div class="g">'+L('Maços base × altura',(s.macosBase||'?')+' × '+(s.camadas||'?'))+L('Unid. por maço',s.unMaco?fmt(s.unMaco,0):null)+L('Unid. por palete',up?fmt(up,0):null)+
      L('Altura da palete',s.alturaPalete?fmt(s.alturaPalete,0)+' mm':null)+L('Tipo de palete',s.palete?esc(s.palete):null)+L('Proteção',s.protecao?esc(s.protecao):null)+L('Separação',s.separacao?esc(s.separacao):null)+
      L('Cantoneiras',s.cantoneiras?'Sim':'Não')+L('Tampo de madeira',s.tampo?'Sim':'Não')+L('Retratilizado',s.retratil==null?null:s.retratil?'Sim':'Não')+L('Filme',s.filme?esc(s.filme):null)+
      L('Cintas long. / transv.',s.cintaL!=null||s.cintaT!=null?(s.cintaL!=null?s.cintaL:'–')+' / '+(s.cintaT!=null?s.cintaT:'–'):null)+'</div>' : '<p class="bad">MM sem specs de embalamento.</p>')+
    (j.warn.length?'<p class="muted">'+esc(j.warn.join(' · '))+'</p>':'')+'<p class="muted">Clique para devolver à lista.</p>';
}
function jobCard(j){
  return '<div class="eb-job'+(temSpec(j.s)?'':' nospec')+'" draggable="true" data-job="'+esc(j.k)+'" style="'+(temSpec(j.s)?'border-left-color:'+j.cor:'')+'" title="Arraste para uma equipa, ou clique e depois clique na equipa">'+
    '<b>'+esc(j.r.of?'OF '+j.r.of:'MM '+j.r.mm)+'</b> <span class="small">'+esc(j.r.cliente||'–')+'</span>'+(j.r.hora?' <span class="small muted">'+esc(j.r.hora)+'</span>':'')+
    '<div class="small"><a href="#" data-spec="'+esc(j.r.mm)+'" class="mono">MM '+esc(j.r.mm)+'</a> · '+esc((j.desc||'').slice(0,48))+'</div>'+
    '<div class="small muted">'+(j.pal!=null?fmt(j.pal,0)+' pal · ':'')+(j.r.qtd!=null?fmt(j.r.qtd,0)+' uds · ':'')+hm(j.t1)+' (1 pessoa)'+(j.est?' · estimado':'')+'</div>'+
    (temSpec(j.s)?'<div class="small muted">'+esc(specCurta(j.s).join(' · '))+'</div>':'<div class="small"><a href="#" data-addspec="'+esc(j.r.mm)+'" style="color:var(--bad)">sem specs · preencher</a></div>')+'</div>';
}
/* pilha de uma equipa em píxeis: altura proporcional ao tempo, com mínimo para se ler */
var PX=320, MINH=30;
function segsDe(c, byK){ var acc=0; return (c.jobs||[]).map(function(k){ var j=byK[k]; if(!j) return null; var t=tN(j,c.n)||0, x={j:j,t:t,ini:acc,fim:acc+t}; acc+=t; return x }).filter(Boolean) }
function crewHtml(tid, c, byK, cap){
  var segs=segsDe(c,byK), ppm=PX/cap, tot=segs.length? segs[segs.length-1].fim : 0, accPx=0, capPx=null;
  var blocks=segs.map(function(x){ var h=Math.max(MINH, x.t*ppm), late=x.fim>cap;
    if(capPx==null && x.fim>=cap) capPx=accPx+(x.t? (cap-x.ini)/x.t*h : 0); accPx+=h;
    var sp=specCurta(x.j.s), inner='<b>'+esc(ofDe(x.j))+'</b>'+(h<46? ' · '+hm(x.t) : '<span>'+hm(x.t)+(x.j.r.cliente&&h>=96?' · '+esc(x.j.r.cliente):'')+'</span>'+
      (h>=62?'<span class="sp">'+esc(sp.slice(0,h>=96?6:3).join(' · '))+'</span>':''));
    return '<div class="eb-blk'+(x.j.est?' est':'')+(late?' late':'')+(temSpec(x.j.s)?'':' nospec')+'" style="height:'+h.toFixed(1)+'px;background-color:'+x.j.cor+'" data-unjob="'+esc(x.j.k)+'" data-ini="'+x.ini+'" data-fim="'+x.fim+'">'+inner+'</div>' }).join('');
  if(capPx==null) capPx=accPx+(cap-tot)*ppm;
  var pct=tot/cap*100;
  return '<div class="eb-crew" data-crew="'+tid+'|'+esc(c.id)+'"><div class="lbl">'+
      '<span class="eb-n"><button data-crewn="'+tid+'|'+esc(c.id)+'|-1" title="Menos uma pessoa">−</button><b>'+c.n+'</b> '+(c.n>1?'pessoas':'pessoa')+'<button data-crewn="'+tid+'|'+esc(c.id)+'|1" title="Mais uma pessoa">+</button></span>'+
      '<button class="eb-x" data-delcrew="'+tid+'|'+esc(c.id)+'" title="Tirar equipa">×</button></div>'+
    '<div class="eb-stack" style="height:'+Math.ceil(Math.max(capPx,accPx)+12)+'px">'+blocks+'<span class="cap" style="bottom:'+capPx.toFixed(1)+'px"></span></div>'+
    '<div class="small mono" style="color:'+(pct>100?'var(--bad)':pct>85?'var(--warn)':'var(--muted)')+'">'+hm(tot)+' · '+fmt(pct,0)+'%</div></div>';
}
/* barra global de cumprimento: entregas que acabam dentro do turno / em atraso / por atribuir */
function cumprimento(js, turnos, byK, cap){
  var ok=0, late=0, usados={};
  TURNOS.forEach(function(x){ turnos[x[0]].forEach(function(c){ segsDe(c,byK).forEach(function(s){ usados[s.j.k]=1; if(s.fim>cap) late++; else ok++ }) }) });
  var tot=js.length, livre=tot-ok-late, pct=tot? ok/tot*100 : 0, cor=pct>=95?'var(--st-good)':pct>=80?'var(--st-warn)':'var(--st-crit)';
  var seg=function(n,c,l){ return n? '<span style="width:'+(n/tot*100)+'%;background:'+c+'" title="'+esc(n+' '+l)+'"></span>' : '' };
  return '<div class="panel eb-cump" style="margin-bottom:14px"><div class="eb-cump-h"><h2>Cumprimento do dia</h2><b style="color:'+cor+'">'+fmt(pct,0)+'%</b>'+
      '<span class="small muted">'+ok+' de '+tot+' entregas planeadas dentro do turno</span></div>'+
    '<div class="eb-bar">'+seg(ok,'var(--st-good)','dentro do turno')+seg(late,'var(--st-crit)','passam do fim do turno')+seg(livre,'var(--st-warn)','por atribuir')+'</div>'+
    '<div class="eb-leg small"><span><i style="background:var(--st-good)"></i>Dentro do turno · '+ok+'</span><span><i style="background:var(--st-crit)"></i>Passam do turno · '+late+'</span><span><i style="background:var(--st-warn)"></i>Por atribuir · '+livre+'</span>'+
      '<span class="muted">Verde ≥ 95% · amarelo ≥ 80% · vermelho abaixo</span></div></div>';
}
/* pessoas disponíveis num turno: as escolhidas para este dia, ou as do turno nos Dados mestre */
function genteMestre(x){ return A.operadores('Embalamento').filter(function(o){ return (o.turno||'').replace('h','')===x[2].replace('–','-').replace('h','') }).map(function(o){ return o.nome }) }
function genteDe(plano, x){ var g=plano.gente&&plano.gente[x[0]]; return Array.isArray(g)? g : genteMestre(x) }
A.register('cargas',{
  html:function(){
    var t=A.tab('emb','plano'), MP=mapas(), SP=specs(), CT=cortantes();
    var mapa=MP.filter(function(m){return m.id===fv('ebMapa','')})[0]||MP[0];
    var datas=mapa? Array.from(new Set(mapa.linhas.map(function(r){return r.data}))).sort() : [];
    var data=fv('ebData',''); if(datas.indexOf(data)<0) data=datas.filter(function(d){return d>=A.today()})[0]||datas[0]||'';
    var body='', acts='<button class="btn" id="ebImp">Carregar mapa de entregas</button>';
    S._eb=null; hideTip();
    if(t==='plano'){
      var pid=A.idKey((mapa?mapa.id:'x')+'_'+data), plano=A.get('emb_planos',pid)||{};
      var cap=plano.cap||capCfg(), js=jobs(mapa,data), turnos=turnosDe(plano), byK={}; js.forEach(function(j){ byK[j.k]=j }); corOFs(js);
      var usados={}; TURNOS.forEach(function(x){ turnos[x[0]].forEach(function(c){ (c.jobs||[]).forEach(function(k){ usados[k]=x[0] }) }) });
      var livres=js.filter(function(j){ return !usados[j.k] });
      var tot1=js.reduce(function(s,j){return s+(j.t1||0)},0), totPal=js.reduce(function(s,j){return s+(j.pal||0)},0);
      var semSp=semSpecs(js.map(function(j){return j.r})), nEst=js.filter(function(j){return j.est}).length;
      var pessoas=0, disp=0; TURNOS.forEach(function(x){ turnos[x[0]].forEach(function(c){ pessoas+=c.n }); disp+=genteDe(plano,x).length });
      S._eb={pid:pid, plano:plano, js:js, cap:cap, mapa:mapa, data:data, turnos:turnos};
      if(!mapa) body='<div class="panel empty">Ainda não há mapa de entregas. Carregue o Excel do mapa de entregas para começar.</div>';
      else body=
        '<div class="filters"><select data-f="ebMapa">'+selOpts(MP.map(function(m){return [m.id,m.nome+' · '+m.linhas.length+' linhas']}),mapa.id)+'</select>'+
        '<select data-f="ebData">'+selOpts(datas.map(function(d){return [d,'Entregas de '+fdate(d)+' ('+mapa.linhas.filter(function(r){return r.data===d}).length+')']}),data)+'</select>'+
        '<label class="small muted" style="display:flex;gap:6px;align-items:center">Minutos úteis por turno <input id="ebCap" inputmode="numeric" value="'+cap+'" style="width:70px"></label></div>'+
        A.kpis([{v:js.length,l:'Entregas do dia'},{v:totPal?fmt(totPal,0):'–',l:'Paletes a preparar'},{v:hm(tot1),l:'Trabalho total (1 pessoa)',s:'≈ '+fmt(tot1/cap,1)+' turnos de 1 pessoa'},
          {v:pessoas,l:'Pessoas nas equipas',cls:pessoas>disp?'warn':'',s:disp+' disponíveis hoje'},{v:livres.length,l:'Por atribuir',cls:livres.length?'warn':''},
          {v:semSp.length,l:'MM sem specs',cls:semSp.length?'warn':'',s:semSp.length?'<a href="#" id="ebMiss">preencher agora</a>':(nEst?nEst+' com velocidade estimada':'')}])+
        cumprimento(js,turnos,byK,cap)+
        '<div class="panel" style="margin-bottom:14px"><div class="ph"><h2>Equipas por turno</h2><div class="acts"><button class="btn sm primary" id="ebSug">Sugerir distribuição</button><button class="btn sm ghost" id="ebClr">Limpar entregas</button><button class="btn sm ghost" id="ebClrAll">Limpar tudo</button></div></div>'+
          '<div class="eb-pal"><span class="small muted">Arraste para um turno (nova equipa) ou para uma equipa (muda o n.º de pessoas):</span>'+[1,2,4].map(function(n){ return '<span class="eb-chip" draggable="true" data-chip="'+n+'">'+n+' '+(n>1?'pessoas':'pessoa')+'</span>' }).join('')+
          '<span class="eb-chip" draggable="true" data-chip="'+(S._ebN||3)+'" id="ebChipN"><input id="ebN" type="number" min="1" max="30" value="'+(S._ebN||3)+'" aria-label="Número de pessoas"> pessoas</span>'+
          '<span class="small muted">No telemóvel: toque na equipa e depois no turno.</span></div>'+
          '<div class="eb-shifts">'+TURNOS.map(function(x){ var cs=turnos[x[0]], n=cs.reduce(function(s,c){return s+c.n},0), w=cs.reduce(function(s,c){return s+carga(c,byK)},0);
            var gente=genteDe(plano,x), mudou=!!(plano.gente&&Array.isArray(plano.gente[x[0]]));
            return '<div class="eb-shift" data-shift="'+x[0]+'"><h3>'+x[1]+' <span class="small mono muted">'+x[2]+'</span></h3>'+
              '<div class="small eb-gente"><b>'+gente.length+' disponíve'+(gente.length===1?'l':'is')+(mudou?'':' (Dados mestre)')+':</b> '+(gente.length?esc(gente.join(', ')):'<span class="muted">ninguém</span>')+
                ' <a href="#" data-gente="'+x[0]+'">editar</a></div>'+
              '<div class="small '+(n>gente.length?'':'muted')+'" style="'+(n>gente.length?'color:var(--bad)':'')+'">'+(cs.length? n+' pessoa'+(n>1?'s':'')+' nas equipas'+(n>gente.length?' — mais do que as disponíveis':'')+' · '+hm(w)+' de trabalho' : 'Largue aqui as equipas deste turno')+'</div>'+
              '<div class="eb-crews">'+cs.map(function(c){ return crewHtml(x[0],c,byK,cap) }).join('')+'</div></div>' }).join('')+'</div>'+
          '<p class="small muted" style="margin:0">Cada coluna é a pilha de trabalho de uma equipa; uma cor por OF; a linha tracejada é o fim do turno ('+hm(cap)+'). Contorno vermelho = passa do turno; riscado = velocidade estimada. Passe o cursor num bloco para ver as specs; clique para o devolver à lista. Use − / + para mudar o n.º de pessoas de uma equipa.</p></div>'+
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
      var save=function(turnos, extra){ var p={data:E.data, mapa:E.mapa?E.mapa.id:'', cap:E.cap, turnos:turnos}; if(E.plano.gente) p.gente=E.plano.gente; Object.assign(p,extra||{}); E.plano=p; savePlan(E.pid,p); localRender(p) };
      /* mudar o n.º de pessoas de uma equipa: a pilha recalcula os tempos (não cria outra equipa) */
      var setN=function(ref,n){ n=Math.round(+n); if(!(n>=1&&n<=30)) return; var T=turnosDe(E.plano), c=findCrewRef(T,ref); if(!c||c.n===n) return; c.n=n; save(T) };
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
      r.querySelectorAll('[data-crew]').forEach(function(el){ drop(el,function(tp,v){ if(tp==='job') toCrew(el.dataset.crew,v); else if(tp==='chip') setN(el.dataset.crew,v) }) });
      r.querySelectorAll('[data-shift]').forEach(function(el){ drop(el,function(tp,v){ if(tp==='chip') addCrew(el.dataset.shift,v); else if(tp==='job') toShift(el.dataset.shift,v) }) });
      r.querySelectorAll('[data-pool]').forEach(function(el){ drop(el,function(tp,v){ if(tp==='job'){ var T=turnosDe(E.plano); tirar(T,v); save(T) } }) });
      /* tocar (telemóvel): escolher e depois tocar no destino */
      var sel=S._ebSel; if(sel){ var se=r.querySelector(sel.t==='chip'?'[data-chip="'+sel.v+'"]':'[data-job="'+sel.v+'"]'); if(se) se.classList.add('sel'); else S._ebSel=null }
      r.querySelectorAll('[data-chip],[data-job]').forEach(function(el){ el.addEventListener('click',function(e){ if(e.target.closest('a,input')) return; var v=el.dataset.chip||el.dataset.job, t=el.dataset.chip?'chip':'job'; S._ebSel=(S._ebSel&&S._ebSel.t===t&&S._ebSel.v===v)? null : {t:t,v:v}; A.render() }) });
      r.querySelectorAll('[data-crew]').forEach(function(el){ el.addEventListener('click',function(e){ var s=S._ebSel; if(!s||e.target.closest('[data-delcrew],[data-unjob],[data-crewn]')) return; e.stopPropagation(); S._ebSel=null; if(s.t==='job') toCrew(el.dataset.crew,s.v); else setN(el.dataset.crew,s.v) }) });
      /* equipa com outro n.º de pessoas (3, 5, 8…) */
      if($('ebN')){ var nIn=$('ebN'); nIn.addEventListener('input',function(){ var v=Math.round(A.num(nIn.value)); if(v>=1&&v<=30){ S._ebN=v; $('ebChipN').dataset.chip=v } }); nIn.addEventListener('mousedown',function(e){ e.stopPropagation() }) }
      r.querySelectorAll('[data-crewn]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); var p=b.dataset.crewn.split('|'), T=turnosDe(E.plano), c=findCrewRef(T,p[0]+'|'+p[1]); if(c) setN(p[0]+'|'+p[1], c.n+(+p[2])) } });
      /* pessoas disponíveis hoje em cada turno (rotatividade: escolhe-se quem está, sem mexer nos Dados mestre) */
      r.querySelectorAll('[data-gente]').forEach(function(a){ a.onclick=function(e){ e.preventDefault(); e.stopPropagation(); genteForm(E, a.dataset.gente, save) } });
      /* balão com as specs ao passar o cursor num bloco */
      var byKt={}; E.js.forEach(function(j){ byKt[j.k]=j });
      r.querySelectorAll('[data-unjob]').forEach(function(b){
        b.addEventListener('mouseenter',function(){ var j=byKt[b.dataset.unjob], cr=b.closest('[data-crew]'), p=cr? cr.dataset.crew.split('|') : null, c=p? findCrewRef(E.turnos,p[0]+'|'+p[1]) : null; if(!j) return;
          showTip(b, tipHtml(j, c?c.n:1, +b.dataset.ini, +b.dataset.fim, E.cap)) });
        b.addEventListener('mouseleave',hideTip) });
      r.querySelectorAll('[data-shift]').forEach(function(el){ el.addEventListener('click',function(){ var s=S._ebSel; if(!s) return; S._ebSel=null; if(s.t==='chip') addCrew(el.dataset.shift,s.v); else toShift(el.dataset.shift,s.v) }) });
      r.querySelectorAll('[data-delcrew]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); var p=b.dataset.delcrew.split('|'), T=turnosDe(E.plano); T[p[0]]=T[p[0]].filter(function(c){return c.id!==p[1]}); save(T) } });
      r.querySelectorAll('[data-unjob]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); hideTip(); var T=turnosDe(E.plano); tirar(T,b.dataset.unjob); save(T) } });
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
function findCrewRef(T, ref){ var p=ref.split('|'); return (T[p[0]]||[]).filter(function(c){return c.id===p[1]})[0] }
/* balão flutuante (um só, no body) */
function showTip(el, html){ var t=document.getElementById('ebTip'); if(!t){ t=document.createElement('div'); t.id='ebTip'; t.className='eb-tip'; document.body.appendChild(t) }
  t.innerHTML=html; t.hidden=false; var b=el.getBoundingClientRect(), w=t.offsetWidth, h=t.offsetHeight, x=b.right+10, y=b.top+b.height/2-h/2;
  if(x+w>innerWidth-8) x=b.left-w-10; if(x<8) x=8; y=Math.max(8,Math.min(y,innerHeight-h-8)); t.style.left=x+'px'; t.style.top=y+'px' }
function hideTip(){ var t=document.getElementById('ebTip'); if(t) t.hidden=true }
/* quem está disponível hoje num turno: escolhe-se da lista de pessoas (não se altera o nome nos Dados mestre) */
function genteForm(E, tid, save){
  var x=TURNOS.filter(function(t){return t[0]===tid})[0], atual=genteDe(E.plano,x), mestre=genteMestre(x), outros={};
  TURNOS.forEach(function(t){ if(t[0]!==tid) genteDe(E.plano,t).forEach(function(n){ outros[n]=t[1] }) });
  var nomes=Array.from(new Set(mestre.concat(atual, pessoasEmb().map(function(o){return o.nome})))).filter(Boolean);
  nomes.sort(function(a,b){ var ma=mestre.indexOf(a)<0, mb=mestre.indexOf(b)<0; return ma!==mb? (ma?1:-1) : a.localeCompare(b,'pt') });
  A.showModal('<h2>'+esc(x[1])+' · quem está hoje</h2><p class="muted" style="margin:0">Marque as pessoas disponíveis neste turno em '+esc(fdate(E.data))+'. Só muda este dia; os Dados mestre ficam como estão. Primeiro aparecem as do turno nos Dados mestre.</p>'+
    '<div class="eb-gform">'+nomes.map(function(n,i){ return '<label><input type="checkbox" value="'+esc(n)+'"'+(atual.indexOf(n)>=0?' checked':'')+'> '+esc(n)+
      (mestre.indexOf(n)>=0?'':' <span class="small muted">'+(outros[n]?'· '+esc(outros[n]):'· outro turno')+'</span>')+(outros[n]&&atual.indexOf(n)<0&&mestre.indexOf(n)>=0?' <span class="small muted">· hoje no '+esc(outros[n])+'</span>':'')+'</label>' }).join('')+'</div>'+
    '<div class="foot"><button class="btn ghost" id="gnR">Repor Dados mestre</button><button class="btn" id="gnX">Cancelar</button><button class="btn primary" id="gnOk">Guardar</button></div>',
    function(box){
      var fim=function(lista){ var g=Object.assign({},E.plano.gente||{}); if(lista) g[tid]=lista; else delete g[tid]; E.plano.gente=g; A.closeModal(); save(turnosDe(E.plano)) };
      $('gnX').onclick=A.closeModal; $('gnR').onclick=function(){ fim(null) };
      $('gnOk').onclick=function(){ fim(Array.from(box.querySelectorAll('.eb-gform input:checked')).map(function(i){return i.value})) };
    });
}
/* mostra já a alteração enquanto a gravação segue */
function localRender(p){ hideTip(); var arr=A.list('emb_planos'), i=arr.findIndex(function(x){return x.id===S._eb.pid}); var o=Object.assign({id:S._eb.pid},p); if(i>=0) arr[i]=o; else arr.push(o); A.render() }


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
