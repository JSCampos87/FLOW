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
  {k:'obs',l:'Observações',re:/obs|nota/}
];
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
function specs(){ var k=S.hist.mm.length+'|'+A.list('emb_mm').length+'|'+A.list('emb_mmx').map(function(d){return d.id+(d.alteradoEm||'')}).join(); if(_sp&&_sp.k===k) return _sp.v;
  var m={}; S.hist.mm.forEach(function(r){ m[String(r.mm)]=r }); A.chunked('emb_mm','emb_mmx','mm').forEach(function(r){ m[String(r.mm)]=Object.assign({},m[String(r.mm)]||{},r) }); _sp={k:k,v:m}; return m }
function cortantes(){ var base=(S.hist.cort&&S.hist.cort.cortantes)||[], k=base.length+'|'+A.list('emb_cort').length+'|'+A.list('emb_cortx').map(function(d){return d.id+(d.alteradoEm||'')}).join(); if(_ct&&_ct.k===k) return _ct.v;
  var m={}; base.forEach(function(r){ m[String(r.cortante)]=Object.assign({fonte:'Dados op'},r) }); A.chunked('emb_cort','emb_cortx','cortante').forEach(function(r){ m[String(r.cortante)]=Object.assign({},m[String(r.cortante)]||{},r) }); _ct={k:k,v:m}; return m }
function mediana(){ var v=Object.keys(cortantes()).map(function(k){return cortantes()[k].udsHPs}).filter(function(x){return x>0}).sort(function(a,b){return a-b}); return v.length? v[Math.floor(v.length/2)] : null }
function mapas(){ var g={}; A.list('emb_mapas').forEach(function(d){ var k=d.mapa||d.id; (g[k]=g[k]||{id:k,nome:d.nome,importadoEm:d.importadoEm,linhas:[]}).linhas=g[k].linhas.concat((d.linhas||[]).map(function(l,i){ l._i=(d.parte||0)*500+i; return l })) }); return Object.keys(g).map(function(k){return g[k]}).sort(function(a,b){return (b.importadoEm||'')<(a.importadoEm||'')?-1:1}) }
function unPal(s){ if(!s) return null; if(s.unPalete) return s.unPalete; return (s.unMaco&&s.macosBase&&s.camadas)? s.unMaco*s.macosBase*s.camadas : null }
function capCfg(){ return +A.cfg('embalamento').capacidade || 450 }
function pessoasEmb(){ var o=A.operadores('Embalamento'); return o.length? o : A.operadores() }

/* tarefas de um dia */
function jobs(mapa, data){
  var SP=specs(), CT=cortantes(), MED=mediana();
  return (mapa? mapa.linhas : []).filter(function(r){ return r.data===data }).map(function(r){
    var s=SP[String(r.mm)], cId=(s&&s.cortante)||r.cortante, c=cId? CT[String(cId)] : null, up=unPal(s);
    var pal=r.paletes || (r.qtd&&up? Math.ceil(r.qtd/up) : null);
    var fonte='cortante', ps=c&&c.udsHPs; if(!ps){ ps=MED; fonte='média geral' }
    var h1=c&&c.udsH1 || ps, h2=c&&c.udsH2 || ps*2;
    var t1=r.qtd&&h1? r.qtd/h1*60 : null, t2=r.qtd&&h2? r.qtd/h2*60 : null, est2=!(c&&c.udsH2);
    var warn=[]; if(!s) warn.push('MM sem specs'); if(fonte!=='cortante') warn.push('velocidade estimada (média geral)'); if(!r.qtd) warn.push('sem quantidade');
    return {k:A.idKey((r.of||'')+'_'+r.mm+'_'+r._i), r:r, s:s, cort:cId, pal:pal, t1:t1, t2:t2, est2:est2, est:fonte!=='cortante', warn:warn};
  });
}
function sugerir(js, pessoas, cap){
  var load={}; pessoas.forEach(function(p){ load[p]=0 });
  var at={}, least=function(n, ex){ return pessoas.filter(function(p){return ex.indexOf(p)<0}).sort(function(a,b){return load[a]-load[b]}).slice(0,n) };
  js.filter(function(j){return j.t1!=null}).sort(function(a,b){return b.t1-a.t1}).forEach(function(j){
    var two=pessoas.length>=2 && j.t1>cap*0.5;
    if(two){ var p=least(2,[]); p.forEach(function(x){ load[x]+=j.t2 }); at[j.k]=p }
    else { var q=least(1,[]); load[q[0]]+=j.t1; at[j.k]=q }
  });
  return at;
}
function cargas(js, at, pessoas){
  var L={}; pessoas.forEach(function(p){ L[p]={t:0,seg:[]} });
  js.forEach(function(j){ var ps=(at[j.k]||[]).filter(Boolean); if(!ps.length||j.t1==null) return; var t=ps.length>1? j.t2 : j.t1;
    ps.forEach(function(p){ if(!L[p]) L[p]={t:0,seg:[],fora:true}; L[p].seg.push({j:j,t:t}); L[p].t+=t }) });
  return L;
}
function hm(min){ if(min==null) return '–'; var h=Math.floor(min/60), m=Math.round(min%60); return (h?h+' h ':'')+(m||!h?m+' min':'') }

/* ---------- formulários ---------- */
function specForm(s){
  if(!S.admin){ A.toast('Só um editor altera as specs.'); return }
  var edit=!!s;
  A.openForm({title:edit?'Specs · MM '+s.mm:'Nova spec de MM', values:s||{},
    fields:MMCOLS.map(function(c){ return {k:c.k,l:c.l,t:c.t==='num'?'number':c.t==='bool'?'check':c.k==='obs'?'textarea':'text',req:c.req} }),
    del: edit? function(){ return S.db.doc('emb_mmx/'+A.idKey(s.mm)).set({_del:true}) } : null,
    submit:function(x){ x.mm=String(x.mm).trim(); return S.db.doc('emb_mmx/'+A.idKey(x.mm)).set(x) }});
}
function cortForm(c){
  if(!S.admin){ A.toast('Só um editor altera as velocidades.'); return }
  var edit=!!c;
  A.openForm({title:edit?'Cortante':'Novo cortante', values:c||{}, intro:'Velocidade de paletização medida (unidades por hora). '+(edit&&c.registos?'Calculada a partir de '+c.registos+' registos de produção ('+fmt(c.horas,0)+' h·pessoa).':''),
    fields:[{k:'cortante',l:'Cortante',req:1,full:1},{k:'udsHPs',l:'Uds/h por pessoa',t:'number',req:1},{k:'udsH1',l:'Uds/h com 1 pessoa',t:'number',help:'Vazio = uds/h por pessoa'},{k:'udsH2',l:'Uds/h com 2 pessoas',t:'number',help:'Vazio = 2 × uds/h por pessoa'}],
    del: edit? function(){ return S.db.doc('emb_cortx/'+A.idKey(c.cortante)).set({_del:true}) } : null,
    submit:function(x){ x.cortante=String(x.cortante).trim(); return S.db.doc('emb_cortx/'+A.idKey(x.cortante)).set(x) }});
}
function specIcons(s){
  if(!s) return '<span class="pill bad">sem specs</span>';
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
    '<dl class="detail"><div><dt>Cortante</dt><dd>'+esc(s.cortante||'–')+'</dd></div><div><dt>Velocidade por pessoa</dt><dd>'+(c&&c.udsHPs?fmt(c.udsHPs,0)+' uds/h':'–')+'</dd></div><div><dt>Com 2 pessoas</dt><dd>'+(c&&c.udsH2?fmt(c.udsH2,0)+' uds/h':'–')+'</dd></div>'+(s.obs?'<div class="full"><dt>Observações</dt><dd>'+esc(s.obs)+'</dd></div>':'')+'</dl>'+
    '<div class="foot"><button class="btn" id="spX">Fechar</button>'+(S.admin?'<button class="btn primary" id="spE">Editar</button>':'')+'</div>',
    function(){ $('spX').onclick=A.closeModal; if($('spE')) $('spE').onclick=function(){ specForm(s) } });
}
function importMapa(){
  A.importDialog({title:'Carregar mapa de entregas', intro:'Exportação do mapa de entregas (Excel ou colado). Cada linha é uma entrega: data, MM e quantidade ou n.º de paletes.', cols:MPCOLS,
    preview:function(rows){ var ds=Array.from(new Set(rows.map(function(r){return r.data}))).sort(); return 'Datas: '+esc(fdate(ds[0]))+(ds.length>1?' a '+esc(fdate(ds[ds.length-1])):'')+' · '+ds.length+' dia(s).' },
    onRows:async function(rows){
      rows=rows.filter(function(r){ return r.qtd||r.paletes }); if(!rows.length) throw A.uerr('Nenhuma linha tem quantidade nem paletes.');
      var id='m'+Date.now(), nome='Mapa '+new Date().toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}), parts=Math.ceil(rows.length/500);
      for(var i=0;i<parts;i++) await S.db.doc('emb_mapas/'+id+'_p'+i).set({mapa:id, nome:nome, importadoEm:A.nowIso(), importadoPor:S.uid||'', parte:i, linhas:rows.slice(i*500,(i+1)*500)});
      F.ebMapa=id; var ds=rows.map(function(r){return r.data}).sort(); F.ebData=ds.filter(function(d){return d>=A.today()})[0]||ds[0];
      return rows.length+' entregas carregadas.';
    }});
}

/* ---------- vista: planeamento ---------- */
var saveT;
function savePlan(id, plano){ clearTimeout(saveT); saveT=setTimeout(function(){ A.put('emb_planos',id,plano).catch(function(){ A.toast('Não foi possível guardar o plano.') }) },300) }
A.register('cargas',{
  html:function(){
    var t=A.tab('emb','plano'), MP=mapas(), SP=specs(), CT=cortantes();
    var mapa=MP.filter(function(m){return m.id===fv('ebMapa','')})[0]||MP[0];
    var datas=mapa? Array.from(new Set(mapa.linhas.map(function(r){return r.data}))).sort() : [];
    var data=fv('ebData',''); if(datas.indexOf(data)<0) data=datas.filter(function(d){return d>=A.today()})[0]||datas[0]||'';
    var body='', acts='<button class="btn" id="ebImp">Carregar mapa de entregas</button>';
    if(t==='plano'){
      var pid=A.idKey((mapa?mapa.id:'x')+'_'+data), plano=A.get('emb_planos',pid)||{};
      var cap=plano.cap||capCfg(), todas=pessoasEmb().map(function(o){return o.nome}), pessoas=(plano.pessoas||[]).filter(Boolean);
      var js=jobs(mapa,data), at=plano.atrib||{}, L=cargas(js,at,pessoas);
      var tot1=js.reduce(function(s,j){return s+(j.t1||0)},0), totPal=js.reduce(function(s,j){return s+(j.pal||0)},0), semDados=js.filter(function(j){return j.est||!j.s}).length;
      var naoAt=js.filter(function(j){return j.t1!=null && !(at[j.k]||[]).filter(Boolean).length}).length;
      var mx=Math.max(cap, Math.max.apply(null,[0].concat(Object.keys(L).map(function(p){return L[p].t}))));
      S._eb={pid:pid, plano:plano, js:js, cap:cap, pessoas:pessoas, mapa:mapa, data:data};
      if(!mapa) body='<div class="panel empty">Ainda não há mapa de entregas. Carregue o Excel do mapa de entregas para começar.</div>';
      else body=
        '<div class="filters"><select data-f="ebMapa">'+selOpts(MP.map(function(m){return [m.id,m.nome+' · '+m.linhas.length+' linhas']}),mapa.id)+'</select>'+
        '<select data-f="ebData">'+selOpts(datas.map(function(d){return [d,'Entregas de '+fdate(d)+' ('+mapa.linhas.filter(function(r){return r.data===d}).length+')']}),data)+'</select>'+
        '<label class="small muted" style="display:flex;gap:6px;align-items:center">Capacidade por pessoa <input id="ebCap" inputmode="numeric" value="'+cap+'" style="width:70px"> min</label></div>'+
        A.kpis([{v:js.length,l:'Entregas do dia'},{v:totPal?fmt(totPal,0):'–',l:'Paletes a preparar'},{v:hm(tot1),l:'Carga total (1 pessoa)',s:pessoas.length?'≈ '+fmt(tot1/cap,1)+' pessoas a tempo inteiro':''},
          {v:naoAt,l:'Por atribuir',cls:naoAt?'warn':''},{v:semDados,l:'Com dados estimados',cls:semDados?'warn':'',s:semDados?'MM sem specs ou cortante sem medições':''}])+
        '<div class="panel" style="margin-bottom:14px"><div class="ph"><h2>Pessoas no turno</h2><div class="acts"><button class="btn sm" id="ebSug"'+(pessoas.length?'':' disabled')+'>Sugerir distribuição</button><button class="btn sm ghost" id="ebClr">Limpar atribuições</button></div></div>'+
          '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">'+todas.map(function(n){ var on=pessoas.indexOf(n)>=0; return '<button class="btn sm'+(on?' primary':'')+'" data-pp="'+esc(n)+'">'+(on?'✓ ':'+ ')+esc(n)+'</button>' }).join('')+(todas.length?'':'<span class="muted small">Sem operadores. Adicione-os em Dados mestre (setor Embalamento).</span>')+'</div>'+
          (pessoas.length? '<div style="display:grid;gap:10px">'+pessoas.map(function(p){ var x=L[p]||{t:0,seg:[]}, pct=x.t/cap*100;
            var segs=x.seg.map(function(s){ return '<span title="'+esc((s.j.r.cliente||'')+' · MM '+s.j.r.mm+' · '+(s.j.pal||'?')+' pal · '+hm(s.t))+'" style="flex:none;width:'+(s.t/mx*100)+'%;background:var(--s1);height:100%;border-right:2px solid #fff"></span>' }).join('');
            return '<div style="display:grid;grid-template-columns:minmax(110px,170px) 1fr 150px;gap:12px;align-items:center"><span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p)+'</span>'+
              '<div style="position:relative;height:26px;background:var(--surface-2);border-radius:6px;overflow:hidden;display:flex">'+segs+'<span style="position:absolute;top:0;bottom:0;left:'+(cap/mx*100)+'%;border-left:2px dashed var(--fg);opacity:.5"></span>'+
              (x.t>cap?'<span style="position:absolute;top:0;bottom:0;left:'+(cap/mx*100)+'%;right:'+(100-x.t/mx*100)+'%;background:repeating-linear-gradient(45deg,rgba(208,59,59,.55) 0 6px,rgba(208,59,59,.25) 6px 12px)"></span>':'')+'</div>'+
              '<span class="mono small" style="white-space:nowrap;color:'+(pct>100?'var(--bad)':pct>85?'var(--warn)':'var(--muted)')+'">'+hm(x.t)+' · '+fmt(pct,0)+'%</span></div>' }).join('')+
            '</div><p class="small muted" style="margin:10px 0 0">Cada bloco é uma entrega; a linha tracejada marca a capacidade do turno ('+hm(cap)+'). Passe o rato por cima para ver o detalhe.</p>' : '<p class="muted small" style="margin:0">Escolha quem está no turno para ver as barras de carga.</p>')+'</div>'+
        A.table(js.map(function(j){ j.id=j.k; return j }),[
          {l:'Cliente / MM',v:function(j){return '<b>'+esc(j.r.cliente||'–')+'</b><div class="small muted"><a href="#" data-spec="'+esc(j.r.mm)+'" class="mono">MM '+esc(j.r.mm)+'</a>'+(j.r.of?' · OF '+esc(j.r.of):'')+(j.r.carga?' · '+esc(j.r.carga):'')+'</div>'}},
          {l:'Specs',v:function(j){return specIcons(j.s)}},
          {l:'Paletes',n:1,v:function(j){return j.pal!=null?fmt(j.pal,0):'–'}},
          {l:'Cortante',v:function(j){return '<span class="small">'+esc((j.cort||'–').slice(0,34))+'</span>'}},
          {l:'1 pessoa',n:1,v:function(j){return hm(j.t1)}},
          {l:'2 pessoas',n:1,v:function(j){return j.t2!=null? hm(j.t2)+(j.est2?' <span class="small muted" title="estimado: metade do tempo de 1 pessoa">*</span>':'') : '–'}},
          {l:'Atribuído a',v:function(j){ if(j.t1==null) return '<span class="small" style="color:var(--bad)">'+esc(j.warn.join(', '))+'</span>'; var a=at[j.k]||[];
            var w=j.warn.length?'<div class="small" style="color:var(--warn)">'+esc(j.warn.join(' · '))+'</div>':'';
            return [0,1].map(function(i){ return '<select data-at="'+esc(j.k)+'|'+i+'" style="border:1px solid var(--line);border-radius:7px;padding:4px 6px;margin:1px;max-width:150px"><option value="">'+(i?'+ 2.ª pessoa':'— ninguém —')+'</option>'+pessoas.map(function(p){return '<option'+(a[i]===p?' selected':'')+'>'+esc(p)+'</option>'}).join('')+'</select>' }).join('')+w }}
        ],{empty:'Sem entregas nesta data.'});
    } else if(t==='mapa'){
      var mp=MP.filter(function(m){return m.id===fv('ebMapa','')})[0]||MP[0];
      body=mp? '<div class="filters"><select data-f="ebMapa">'+selOpts(MP.map(function(m){return [m.id,m.nome+' · '+m.linhas.length+' linhas']}),mp.id)+'</select>'+(S.admin?'<button class="btn sm danger" id="ebDelM">Apagar este mapa</button>':'')+'</div>'+
        A.table(mp.linhas.slice().sort(A.by('data')).map(function(r){ var s=SP[String(r.mm)]; return Object.assign({id:'r'+r._i,_s:s},r) }),[{l:'Data',v:function(r){return fdate(r.data)+(r.hora?' <span class="small muted">'+esc(r.hora)+'</span>':'')}},{l:'Cliente',v:function(r){return esc(r.cliente||'–')}},{l:'MM',v:function(r){return '<a href="#" data-spec="'+esc(r.mm)+'" class="mono">'+esc(r.mm)+'</a>'}},{l:'OF',v:function(r){return esc(r.of||'–')}},{l:'Qtd',n:1,v:function(r){return r.qtd!=null?fmt(r.qtd,0):'–'}},{l:'Paletes',n:1,v:function(r){return r.paletes!=null?fmt(r.paletes,0):'–'}},{l:'Carga',v:function(r){return esc(r.carga||'–')}},{l:'Specs',v:function(r){return specIcons(r._s)}}],{max:500})
        : '<div class="panel empty">Ainda não há mapa de entregas.</div>';
    } else {
      var rows=Object.keys(CT).map(function(k){var c=CT[k]; c.id=k; return c}).filter(function(c){var q=fv('ebq','').toLowerCase(); return !q||[c.cortante,c.descricao].join(' ').toLowerCase().indexOf(q)>=0}).sort(A.by('cortante'));
      acts=S.admin?'<button class="btn" id="ebCtImp">Importar velocidades</button><button class="btn primary" id="ebCtNew">+ Cortante</button>':'';
      body='<div class="filters"><input type="search" id="ebq" data-f="ebq" placeholder="Procurar cortante…" value="'+esc(fv('ebq',''))+'"></div>'+
        '<p class="small muted" style="margin:-4px 0 10px">Calculado a partir do registo de produção do embalamento (Dados.xlsx · Dados op): unidades ÷ (horas × pessoas). Média geral usada quando o cortante não tem medições: <b>'+fmt(mediana(),0)+' uds/h/pessoa</b>.</p>'+
        A.table(rows,[{l:'Cortante',v:function(c){return '<b>'+esc(c.cortante)+'</b>'}},{l:'Uds/h por pessoa',n:1,v:function(c){return fmt(c.udsHPs,0)}},{l:'Uds/h · 1 pessoa',n:1,v:function(c){return c.udsH1?fmt(c.udsH1,0):'–'}},{l:'Uds/h · 2 pessoas',n:1,v:function(c){return c.udsH2?fmt(c.udsH2,0):'–'}},{l:'Registos',n:1,v:function(c){return c.registos||'–'}},{l:'Horas medidas',n:1,v:function(c){return c.horas?fmt(c.horas,0)+' h':'–'}}],{click:1,empty:'Ainda sem velocidades. Importe a base de uptimes por cortante.'});
    }
    return A.head({c:C,mod:MOD,title:'Planeamento de cargas e pessoas',p:'A partir do mapa de entregas, calcula o tempo de paletização de cada entrega pelas velocidades do cortante e distribui o trabalho pelas pessoas do turno.',acts:acts})+
      A.tabs('emb',[['plano','Plano do dia'],['mapa','Mapa de entregas'],['vel','Velocidades por cortante']],t)+body;
  },
  bind:function(r){
    if($('ebImp')) $('ebImp').onclick=importMapa;
    if($('ebCtNew')) $('ebCtNew').onclick=function(){cortForm()};
    if($('ebCtImp')) $('ebCtImp').onclick=function(){ A.importDialog({title:'Importar velocidades por cortante',intro:'Velocidades por cortante em unidades por hora (por pessoa, e opcionalmente com 1 e 2 pessoas). Acrescenta-se às medições do ficheiro Dados; as alterações manuais mantêm-se.',cols:CTCOLS,
      onRows:async function(rows){ rows=rows.filter(function(r){return r.udsHPs}); await A.writeChunks('emb_cort',rows); return rows.length+' cortantes importados.' }}) };
    A.bindRows(r,function(id){ if(A.tab('emb','plano')==='vel'){ var c=cortantes()[id]; if(c) cortForm(c) } });
    r.querySelectorAll('[data-spec]').forEach(function(a){ a.onclick=function(e){ e.preventDefault(); e.stopPropagation(); var s=specs()[a.dataset.spec]; if(s) specCard(s); else A.toast('MM '+a.dataset.spec+' ainda sem specs.') } });
    if($('ebDelM')) $('ebDelM').onclick=async function(){ if(this.dataset.ok!=='1'){this.dataset.ok='1';this.textContent='Confirmar';return} var id=fv('ebMapa','')||(mapas()[0]||{}).id; var ds=A.list('emb_mapas').filter(function(d){return (d.mapa||d.id)===id}); for(var i=0;i<ds.length;i++) await A.del('emb_mapas',ds[i].id); F.ebMapa=''; A.toast('Mapa apagado.') };
    var E=S._eb; if(!E) { bindFilters(r); return }
    var plano=function(){ return {data:E.data, mapa:E.mapa?E.mapa.id:'', cap:E.cap, pessoas:E.pessoas.slice(), atrib:JSON.parse(JSON.stringify(E.plano.atrib||{}))} };
    r.querySelectorAll('[data-pp]').forEach(function(b){ b.onclick=function(){ var p=plano(), n=b.dataset.pp, i=p.pessoas.indexOf(n); if(i>=0) p.pessoas.splice(i,1); else p.pessoas.push(n); E.plano=p; savePlan(E.pid,p); localRender(p) } });
    r.querySelectorAll('[data-at]').forEach(function(sel){ sel.onchange=function(){ var x=sel.dataset.at.split('|'), p=plano(), a=(p.atrib[x[0]]||['','']).slice(); a[+x[1]]=sel.value; if(a[0]===a[1]) a[1]=''; p.atrib[x[0]]=a.filter(function(v,i){return v||i===0}); E.plano=p; savePlan(E.pid,p); localRender(p) } });
    if($('ebSug')) $('ebSug').onclick=function(){ var p=plano(); p.atrib=sugerir(E.js,E.pessoas,E.cap); p.auto=true; E.plano=p; savePlan(E.pid,p); localRender(p); A.toast('Distribuição sugerida — pode ajustar à mão.') };
    if($('ebClr')) $('ebClr').onclick=function(){ var p=plano(); p.atrib={}; E.plano=p; savePlan(E.pid,p); localRender(p) };
    if($('ebCap')) $('ebCap').onchange=function(){ var v=A.num(this.value); if(!(v>0)) return; var p=plano(); p.cap=v; E.plano=p; savePlan(E.pid,p); localRender(p) };
    bindFilters(r);
  }
});
/* mostra já a alteração enquanto a gravação segue */
function localRender(p){ var arr=A.list('emb_planos'), i=arr.findIndex(function(x){return x.id===S._eb.pid}); var o=Object.assign({id:S._eb.pid},p); if(i>=0) arr[i]=o; else arr.push(o); A.render() }

/* ---------- vista: specs por MM ---------- */
A.register('specs',{
  html:function(){
    var SP=specs(), q=fv('spq','').toLowerCase().trim(), all=Object.keys(SP).map(function(k){var s=SP[k]; s.id=k; return s});
    var rows=all.filter(function(s){ return !q || [s.mm,s.descricao,s.cliente,s.cortante].join(' ').toLowerCase().indexOf(q)>=0 }).sort(A.by('mm'));
    return A.head({c:C,mod:MOD,title:'Specs de paletização por MM',p:'Cantoneiras, altura da palete, tampo de madeira, maços por base e por altura de cada MM (8000…).',
        acts:S.admin?'<button class="btn" id="spImp">Importar specs</button><button class="btn primary" id="spNew">+ MM</button>':''})+
      A.kpis([{v:all.length,l:'MM com specs'},{v:all.filter(function(s){return s.cantoneiras}).length,l:'Levam cantoneiras'},{v:all.filter(function(s){return s.tampo}).length,l:'Levam tampo de madeira'},{v:all.filter(function(s){return !s.cortante}).length,l:'Sem cortante associado',cls:all.some(function(s){return !s.cortante})?'warn':''}])+
      '<div class="filters"><input type="search" id="spq" data-f="spq" placeholder="Procurar MM, cliente, descrição, cortante…" value="'+esc(fv('spq',''))+'" style="font-size:16px;padding:10px 12px"></div>'+
      A.table(rows,[{l:'MM',v:function(s){return '<b class="mono">'+esc(s.mm)+'</b>'}},{l:'Descrição',v:function(s){return esc(s.descricao||'–')+'<div class="small muted">'+esc(s.cliente||'')+'</div>'}},{l:'Cortante',v:function(s){return esc(s.cortante||'–')}},
        {l:'Cantoneiras',v:function(s){return s.cantoneiras?'<span class="pill info">Sim</span>':'Não'}},{l:'Tampo',v:function(s){return s.tampo?'<span class="pill warn">Sim</span>':'Não'}},
        {l:'Altura',n:1,v:function(s){return s.alturaPalete?fmt(s.alturaPalete,0)+' mm':'–'}},{l:'Base × altura',n:1,v:function(s){return (s.macosBase||'?')+' × '+(s.camadas||'?')}},{l:'Un./palete',n:1,v:function(s){var u=unPal(s);return u?fmt(u,0):'–'}}],
        {click:1,max:200,empty:all.length?'Nenhum MM encontrado.':'Ainda sem specs. Um editor importa a base de specs (Excel).'});
  },
  bind:function(r){
    if($('spNew')) $('spNew').onclick=function(){specForm()};
    if($('spImp')) $('spImp').onclick=function(){ A.importDialog({title:'Importar specs de paletização',intro:'Uma linha por MM. Substitui a lista importada anteriormente; as alterações feitas à mão nesta app mantêm-se. Para sim/não use “Sim”, “S” ou “X”.',cols:MMCOLS,
      onRows:async function(rows){ var seen={}; rows=rows.filter(function(x){ x.mm=String(x.mm).replace(/\.0$/,''); if(seen[x.mm]) return false; seen[x.mm]=1; return true }); await A.writeChunks('emb_mm',rows); return rows.length+' MM importados.' }}) };
    A.bindRows(r,function(id){ var s=specs()[id]; if(s) specCard(s) }); bindFilters(r);
  }
});
window.Embalamento={specs:specs,cortantes:cortantes,jobs:jobs,sugerir:sugerir};
})();
