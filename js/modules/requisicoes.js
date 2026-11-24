/* Colagem › Requisições de materiais: catálogo de correias (e outras peças) por máquina, com foto,
   requisição pelo operador, aprovação/entrega pelo responsável e baixa de stock.
   Coleções: mat_cat (artigos), requisicoes (pedidos), mat_fotos (uma foto por artigo, lida só quando é precisa —
   as fotos não vão para o GitHub, que é público). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao, C='var(--c-col)';
var fv=I.fv, F=I.F, selOpts=I.selOpts, bindFilters=I.bindFilters;
var SETOR='Colagem', ESTADOS=['Pedida','Aprovada','Entregue','Cancelada'], MOTIVOS=['Desgaste','Avaria / rotura','Manutenção preventiva','Mudança de formato','Outro'];
function podeGerir(){ return S.admin || A.can('stock') }
function nrm(s){ return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'') }
function maqDe(label){ var n=nrm(label), m=A.list('maquinas').filter(function(m){ return nrm(m.nome)===n || (m.aliases||[]).some(function(a){return nrm(a)===n}) })[0];
  if(!m && A.canon){ var c=A.canon('maquina',label); m=A.list('maquinas').filter(function(x){return x.nome===c})[0] } return m? m.id : String(label||'').trim().toUpperCase() }
function cat(){ return A.list('mat_cat').filter(function(a){ return (a.setor||SETOR)===SETOR && a.ativo!==false }) }
function maqsCat(){ var o={}; A.maquinas(SETOR).forEach(function(m){ o[m.id]=m.nome }); cat().forEach(function(a){ if(a.maquina&&!o[a.maquina]) o[a.maquina]=A.mName(a.maquina) }); return Object.keys(o).map(function(k){return [k,o[k]]}).sort(function(a,b){return a[1]<b[1]?-1:1}) }
function medidas(nome){ var m=/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)/.exec(nome||''); return m? m[1]+' × '+m[2]+' × '+m[3] : '' }
function baixo(a){ return a.stock!=null && a.stock<=(a.min!=null?a.min:1) }

/* ---------- fotos (lidas a pedido, com cache) ---------- */
var FOT={}, pend={};
function fotoKey(a){ return A.idKey(a.pn||a.sap||a.id) }
function foto(a, cb){ var k=fotoKey(a); if(k in FOT){ cb(FOT[k]); return } (pend[k]=pend[k]||[]).push(cb); if(pend[k].length>1) return;
  var fim=function(v){ FOT[k]=v; (pend[k]||[]).forEach(function(f){ f(v) }); delete pend[k] };
  try{ S.db.doc('mat_fotos/'+k).get().then(function(d){ fim(d&&d.img||null) }).catch(function(){ fim(null) }) }catch(e){ fim(null) } }
function carregarFotos(root){
  var els=[].slice.call(root.querySelectorAll('[data-foto]')); if(!els.length) return;
  var vis=function(el){ var a=A.get('mat_cat',el.dataset.foto); if(!a) return; foto(a,function(src){ if(src){ el.style.backgroundImage='url('+src+')'; el.classList.add('tem') } else el.classList.add('sem') }) };
  if('IntersectionObserver' in window){ var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ io.unobserve(e.target); vis(e.target) } }) },{rootMargin:'300px'}); els.forEach(function(el){ io.observe(el) }) }
  else els.forEach(vis);
}
/* reduz a foto no próprio dispositivo antes de guardar (máx. 600 px, JPEG) */
function reduzir(file, max){ return new Promise(function(res,rej){ var fr=new FileReader(); fr.onerror=rej; fr.onload=function(){ var im=new Image(); im.onerror=rej; im.onload=function(){
  var s=Math.min(1,(max||600)/Math.max(im.width,im.height)), cv=document.createElement('canvas'); cv.width=Math.round(im.width*s); cv.height=Math.round(im.height*s);
  var x=cv.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,cv.width,cv.height); x.drawImage(im,0,0,cv.width,cv.height); res(cv.toDataURL('image/jpeg',0.8)) }; im.src=fr.result }; fr.readAsDataURL(file) }) }
function guardarFoto(a, dataUrl){ var k=fotoKey(a); FOT[k]=dataUrl; return S.db.doc('mat_fotos/'+k).set({img:dataUrl, pn:a.pn||'', sap:a.sap||'', em:new Date().toISOString()}) }

/* ---------- carrinho (neste dispositivo) ---------- */
var CK='flow_req_carrinho';
function car(){ try{ return JSON.parse(localStorage.getItem(CK)||'{}') }catch(e){ return {} } }
function carSet(o){ try{ localStorage.setItem(CK,JSON.stringify(o)) }catch(e){} }
function carN(){ var c=car(); return Object.keys(c).reduce(function(s,k){return s+c[k]},0) }

/* ---------- formulários ---------- */
function artForm(a){
  if(!podeGerir()){ A.toast('Só o stock ou um editor alteram o catálogo.'); return }
  var edit=!!a;
  A.openForm({title:edit?'Editar artigo':'Novo artigo', values:Object.assign({maquina:fv('rqM',''), min:1}, a||{}),
    fields:[{k:'maquina',l:'Máquina',t:'select',req:1,o:maqsCat},{k:'nome',l:'Descrição',req:1,ph:'ex. CORR BVISION 25X4X7483 RR20'},{k:'sap',l:'Código SAP'},{k:'pn',l:'Part number (Bobst)',ph:'ex. BSA1104374100'},
      {k:'tipo',l:'Tipo',t:'select',o:['Correia','Correia Poly-V','Correia em V','Outro']},{k:'loc',l:'Localização',ph:'ex. Zona máquina BVision'},{k:'stock',l:'Stock atual',t:'number'},{k:'min',l:'Stock mínimo',t:'number',help:'Abaixo disto o artigo fica assinalado'},{k:'preco',l:'Preço unitário (€)',t:'number'},
      {k:'titulo',l:'Designação Bobst'},{k:'url',l:'Ligação MyBobst'}],
    del: edit? function(){ return A.put('mat_cat',a.id,Object.assign(A.clean(a),{ativo:false})) } : null,
    submit:function(x){ x.setor=SETOR; x.ativo=true; if(edit) return A.put('mat_cat',a.id,Object.assign(A.clean(a),x)); return A.add('mat_cat',x) }});
}
function artDetalhe(id){
  var a=A.get('mat_cat',id); if(!a) return; var reqs=A.list('requisicoes').filter(function(r){ return (r.linhas||[]).some(function(l){ return l.art===id }) }).sort(A.by('data',-1));
  var cons=reqs.filter(function(r){return r.estado==='Entregue'}).reduce(function(s,r){ return s+(r.linhas||[]).filter(function(l){return l.art===id}).reduce(function(t,l){return t+(l.qtd||0)},0) },0);
  A.showModal('<div style="display:grid;grid-template-columns:minmax(200px,320px) 1fr;gap:18px;align-items:start"><div class="mfoto big" data-foto="'+esc(a.id)+'"></div><div><h2 style="margin:0 0 6px">'+esc(a.nome)+'</h2><dl class="detail">'+
    [['Máquina',A.mName(a.maquina)],['Medidas',medidas(a.nome)||'–'],['SAP',a.sap],['Part number',a.pn],['Designação Bobst',a.titulo],['Localização',a.loc],['Stock',a.stock!=null?fmt(a.stock,0)+(baixo(a)?' (abaixo do mínimo '+(a.min!=null?a.min:1)+')':''):'–'],['Preço',a.preco!=null?fmt(a.preco,2)+' €':'–'],['Entregues (total)',fmt(cons,0)]].map(function(r){ return '<div><dt>'+r[0]+'</dt><dd>'+esc(r[1]==null||r[1]===''?'–':r[1])+'</dd></div>' }).join('')+'</dl>'+
    (a.url?'<p class="small" style="margin:8px 0 0"><a href="'+esc(a.url)+'" target="_blank" rel="noopener">Ver no MyBobst ↗</a></p>':'')+'</div></div>'+
    '<div class="foot">'+(podeGerir()?'<label class="btn" style="cursor:pointer">Trocar foto<input type="file" id="afF" accept="image/*" capture="environment" hidden></label><button class="btn" id="afE">Editar</button>':'')+'<button class="btn" id="afX">Fechar</button><button class="btn primary" id="afC">+ Adicionar à requisição</button></div>',
  function(){ $('afX').onclick=A.closeModal; carregarFotos($('box'));
    $('afC').onclick=function(){ var c=car(); c[id]=(c[id]||0)+1; carSet(c); A.closeModal(); A.toast('Adicionado à requisição.'); A.render() };
    if($('afE')) $('afE').onclick=function(){ artForm(a) };
    if($('afF')) $('afF').onchange=async function(e){ var f=e.target.files[0]; if(!f) return; try{ var d=await reduzir(f,600); await guardarFoto(a,d); A.toast('Foto guardada.'); A.closeModal(); artDetalhe(id) }catch(err){ A.toast('Não foi possível guardar a foto.') } };
  });
}
function pedir(preMaq){
  var c=car(), ids=Object.keys(c).filter(function(k){ return A.get('mat_cat',k) });
  if(!ids.length){ A.toast('Escolha primeiro os artigos no catálogo.'); return }
  var linhas=ids.map(function(k){ var a=A.get('mat_cat',k); return '<tr><td><div class="mfoto mini" data-foto="'+esc(k)+'"></div></td><td><b>'+esc(a.nome)+'</b><div class="small muted">SAP '+esc(a.sap||'–')+' · '+esc(a.pn||'')+'</div></td><td class="n"><input type="number" min="0" step="1" value="'+c[k]+'" data-q="'+esc(k)+'" style="width:70px"></td></tr>' }).join('');
  var ops=A.operadores(SETOR).map(function(o){return o.nome});
  A.openForm({title:'Nova requisição de material', intro:'<div class="tw"><table class="t"><tbody>'+linhas+'</tbody></table></div><p class="small muted" style="margin:6px 0 0">Quantidade 0 retira o artigo.</p>',
    values:{data:A.today(), maquina:preMaq||fv('rqM','')||(A.get('mat_cat',ids[0])||{}).maquina||'', motivo:'Desgaste'},
    fields:[{k:'maquina',l:'Máquina',t:'select',req:1,o:maqsCat},{k:'requisitante',l:'Requisitado por',req:1,list:'dlRqOp'},{k:'data',l:'Data',t:'date',req:1},{k:'motivo',l:'Motivo',t:'select',o:MOTIVOS,req:1},{k:'urgente',l:'Urgente (máquina parada)',t:'check'},{k:'of',l:'OF em produção'},{k:'obs',l:'Observações',t:'textarea',rows:2},
      {t:'html',html:'<datalist id="dlRqOp">'+ops.map(function(n){return '<option value="'+esc(n)+'">'}).join('')+'</datalist>'}],
    after:function(box){ carregarFotos(box) },
    validate:function(){ var n=0; document.querySelectorAll('[data-q]').forEach(function(i){ n+=+i.value||0 }); if(!n) return 'Indique pelo menos uma quantidade.' },
    submit:function(x){ var ls=[]; document.querySelectorAll('[data-q]').forEach(function(i){ var q=+i.value||0, a=A.get('mat_cat',i.dataset.q); if(q>0&&a) ls.push({art:a.id, nome:a.nome, sap:a.sap||'', pn:a.pn||'', qtd:q, preco:a.preco||null}) });
      x.linhas=ls; x.setor=SETOR; x.estado='Pedida'; x.numero='RQ'+new Date().toISOString().slice(2,10).replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,5).toUpperCase();
      return A.add('requisicoes',x).then(function(){ carSet({}) }) }, ok:'Enviar requisição', done:'Requisição enviada.'});
}
function mudarEstado(r, est){
  var n=A.clean(r); n.estado=est; n['em'+est]=new Date().toISOString(); n['por'+est]=S.names[S.uid]||S.uid||'';
  var p=A.put('requisicoes',r.id,n);
  if(est==='Entregue') p=p.then(function(){ return Promise.all((r.linhas||[]).map(function(l){ var a=A.get('mat_cat',l.art); if(!a||a.stock==null) return null; return A.put('mat_cat',a.id,Object.assign(A.clean(a),{stock:Math.max(0,(+a.stock||0)-(l.qtd||0))})) })) });
  return p.then(function(){ A.toast('Requisição '+est.toLowerCase()+'.') });
}
function reqDetalhe(id){
  var r=A.get('requisicoes',id); if(!r) return; var tot=(r.linhas||[]).reduce(function(s,l){return s+(l.preco||0)*(l.qtd||0)},0), g=podeGerir();
  A.showModal('<h2>'+esc(r.numero||'Requisição')+' '+estPill(r.estado)+(r.urgente?' <span class="pill bad">urgente</span>':'')+'</h2><dl class="detail">'+
    [['Máquina',A.mName(r.maquina)],['Requisitado por',r.requisitante],['Data',fdate(r.data)],['Motivo',r.motivo],['OF',r.of]].map(function(x){ return '<div><dt>'+x[0]+'</dt><dd>'+esc(x[1]||'–')+'</dd></div>' }).join('')+(r.obs?'<div class="full"><dt>Observações</dt><dd>'+esc(r.obs)+'</dd></div>':'')+'</dl>'+
    A.table(r.linhas||[],[{l:'',v:function(l){ return '<div class="mfoto mini" data-foto="'+esc(l.art)+'"></div>' }},{l:'Artigo',v:function(l){return '<b>'+esc(l.nome)+'</b><div class="small muted">SAP '+esc(l.sap||'–')+'</div>'}},{l:'Qtd.',n:1,v:function(l){return fmt(l.qtd,0)}},{l:'Valor',n:1,v:function(l){return l.preco?fmt(l.preco*l.qtd,2)+' €':'–'}}])+
    (tot?'<p class="small" style="text-align:right;margin:6px 0 0">Total <b>'+fmt(tot,2)+' €</b></p>':'')+
    '<div class="foot"><button class="btn" id="rqX">Fechar</button>'+(g&&r.estado==='Pedida'?'<button class="btn danger" id="rqCan">Cancelar</button><button class="btn" id="rqApr">Aprovar</button>':'')+(g&&(r.estado==='Pedida'||r.estado==='Aprovada')?'<button class="btn primary" id="rqEnt">Marcar entregue</button>':'')+'</div>',
  function(){ $('rqX').onclick=A.closeModal; carregarFotos($('box'));
    var go=function(e){ return function(){ A.closeModal(); mudarEstado(r,e).catch(function(){ A.toast('Não foi possível gravar.') }) } };
    if($('rqApr')) $('rqApr').onclick=go('Aprovada'); if($('rqEnt')) $('rqEnt').onclick=go('Entregue'); if($('rqCan')) $('rqCan').onclick=go('Cancelada') });
}
function estPill(e){ return '<span class="pill '+({Pedida:'warn',Aprovada:'info',Entregue:'ok',Cancelada:'mute'}[e]||'mute')+'">'+esc(e||'–')+'</span>' }

/* ---------- importação: lista Excel (BMASTER / BVISION) e fotos ---------- */
var XURL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function loadX(){ return window.XLSX? Promise.resolve() : new Promise(function(res,rej){ var s=document.createElement('script'); s.src=XURL; s.onload=res; s.onerror=rej; document.head.appendChild(s) }) }
function importar(){
  if(!podeGerir()){ A.toast('Só o stock ou um editor importam.'); return }
  A.showModal('<h2>Importar catálogo e fotos</h2><p class="muted" style="margin:0">1) A lista em Excel (uma folha por máquina, com “Cód. SAP”, “Nombre articulo”, “Ubicación”, “Stock”, “Precio”). 2) As fotos: selecione os ficheiros <b>.jpg</b> da pasta das correias (o nome de cada foto é o part number, ex. BSA1104374100.jpg) e o <b>correias.json</b> com as designações da Bobst.</p>'+
    '<label class="fld">Lista Excel<input type="file" id="imX" accept=".xlsx,.xls"></label><label class="fld">Fotos e correias.json<input type="file" id="imP" multiple accept="image/*,.json"></label><div id="imS" class="small"></div>'+
    '<div class="foot"><button class="btn" id="imC">Fechar</button><button class="btn primary" id="imOk" disabled>Importar</button></div>',
  function(){
    var arts=null, fotos=[], bob={}; $('imC').onclick=A.closeModal;
    var resumo=function(){ $('imS').innerHTML=(arts?'<div>• '+arts.length+' artigos: '+Object.entries(arts.reduce(function(o,a){ o[a.maqLab]=(o[a.maqLab]||0)+1; return o },{})).map(function(e){ var id=maqDe(e[0]); return esc(e[0])+' ('+e[1]+') → '+(A.get('maquinas',id)?'<span class="pill ok">'+esc(A.mName(id))+'</span>':'<span class="pill warn">'+esc(id)+' — não existe nos Dados mestre</span>') }).join(', ')+'</div>':'')+(fotos.length?'<div>• '+fotos.length+' fotos</div>':'')+(Object.keys(bob).length?'<div>• designações Bobst de '+Object.keys(bob).length+' part numbers</div>':''); $('imOk').disabled=!(arts||fotos.length) };
    $('imX').onchange=async function(e){ var f=e.target.files[0]; if(!f) return; $('imS').textContent='A ler…';
      try{ await loadX(); var wb=XLSX.read(await f.arrayBuffer(),{type:'array'}); arts=[];
        wb.SheetNames.forEach(function(n){ var a=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}), hi=a.findIndex(function(r){ return r.some(function(x){ return /^c[oó]d/i.test(String(x).trim()) }) }); if(hi<0) return;
          var h=a[hi].map(function(x){ return String(x).trim().toLowerCase() }), ix=function(re){ return h.findIndex(function(x){return re.test(x)}) }, iS=ix(/^c[oó]d/), iN=ix(/nombre|descri|artigo|articulo/), iL=ix(/ubica|locali/), iQ=ix(/^stock/), iP=ix(/precio|pre[cç]o/);
          a.slice(hi+1).forEach(function(r){ var nome=String(r[iN]||'').replace(/\s+/g,' ').trim(); if(!nome) return; var pn=(/BSA\s*(\d+)/i.exec(nome)||[])[1];
            arts.push({maqLab:String(n).trim(), sap:String(r[iS]||'').trim(), nome:nome, pn:pn?'BSA'+pn:'', loc:String(r[iL]||'').trim(), stock:typeof r[iQ]==='number'?r[iQ]:A.num(r[iQ]), preco:typeof r[iP]==='number'?r[iP]:A.num(r[iP]),
              tipo:/poly/i.test(nome)?'Correia Poly-V':/correia v\b| V$/i.test(nome)?'Correia em V':'Correia'}) }) });
      }catch(err){ console.error(err); arts=null; $('imS').textContent='Não foi possível ler o Excel.'; return } resumo() };
    $('imP').onchange=async function(e){ fotos=[]; var fs=Array.from(e.target.files||[]);
      for(var i=0;i<fs.length;i++){ var f=fs[i]; if(/\.json$/i.test(f.name)){ try{ JSON.parse(await f.text()).forEach(function(m){ if(m.pn) bob[m.pn]=m }) }catch(x){} } else fotos.push(f) } resumo() };
    $('imOk').onclick=async function(){ var b=this; b.disabled=true;
      try{
        if(arts){ $('imS').innerHTML+='<div>A gravar catálogo…</div>'; var ex=A.list('mat_cat');
          for(var i=0;i<arts.length;i+=15) await Promise.all(arts.slice(i,i+15).map(function(x){ var maq=maqDe(x.maqLab), id=A.idKey('col_'+(x.sap||x.pn||x.nome)), old=A.get('mat_cat',id)||{};
            var o=Object.assign({}, A.clean(old), {setor:SETOR, ativo:true, maquina:maq, sap:x.sap, nome:x.nome, pn:x.pn, loc:x.loc, tipo:x.tipo}); if(x.stock!=null) o.stock=x.stock; if(x.preco!=null) o.preco=x.preco; if(o.min==null) o.min=1;
            var bb=bob[x.pn]; if(bb){ o.titulo=bb.titulo; o.url=bb.url } Object.keys(o).forEach(function(k){ if(o[k]===''||o[k]==null) delete o[k] }); return A.put('mat_cat',id,o) })) }
        else if(Object.keys(bob).length){ await Promise.all(cat().filter(function(a){ return bob[a.pn] }).map(function(a){ return A.put('mat_cat',a.id,Object.assign(A.clean(a),{titulo:bob[a.pn].titulo, url:bob[a.pn].url})) })) }
        if(fotos.length){ var ok=0; for(var j=0;j<fotos.length;j++){ var f=fotos[j], pn=f.name.replace(/\.[^.]+$/,'').trim(); $('imS').lastChild.textContent='Fotos '+(j+1)+'/'+fotos.length+'…';
            var d=await reduzir(f,600); await S.db.doc('mat_fotos/'+A.idKey(pn)).set({img:d, pn:pn, em:new Date().toISOString()}); FOT[A.idKey(pn)]=d; ok++ }
          A.audit('mat_fotos','lote','importar',{fotos:ok}) }
        A.closeModal(); A.toast('Importação concluída.');
      }catch(err){ console.error(err); $('imS').innerHTML+='<div style="color:var(--bad)">Não foi possível gravar tudo.</div>'; b.disabled=false }
    };
  });
}

/* ---------- vista ---------- */
A.register('requisicoes',{
  html:function(){
    var t=A.tab('rq','cat'), all=cat(), ms=maqsCat(), fm=fv('rqM',''), q=fv('rqQ','').toLowerCase(), g=podeGerir(), n=carN();
    var reqs=A.list('requisicoes').filter(function(r){ return (r.setor||SETOR)===SETOR }).sort(function(a,b){ return (b.criadoEm||b.data||'')<(a.criadoEm||a.data||'')?-1:1 });
    var abertas=reqs.filter(function(r){ return r.estado==='Pedida'||r.estado==='Aprovada' });
    var bx=all.filter(baixo);
    var body='';
    if(t==='cat'){
      var L=all.filter(function(a){ return (!fm||a.maquina===fm) && (!q||[a.nome,a.sap,a.pn,a.titulo,medidas(a.nome)].join(' ').toLowerCase().indexOf(q)>=0) }).sort(function(a,b){ return String(a.nome).localeCompare(String(b.nome),'pt',{numeric:true}) });
      var c=car();
      body='<div class="filters"><input type="search" id="rqQ" data-f="rqQ" placeholder="Procurar medida (ex. 25X4), SAP, part number…" value="'+esc(fv('rqQ',''))+'"><select data-f="rqM">'+selOpts(ms,fm,'Todas as máquinas')+'</select><span class="small muted">'+L.length+' artigos</span></div>'+
        (L.length? '<div class="mgrid">'+L.map(function(a){ return '<div class="mcard" data-art="'+esc(a.id)+'"><div class="mfoto" data-foto="'+esc(a.id)+'"></div><div class="mtx"><b>'+esc(medidas(a.nome)||a.nome)+'</b><div class="small muted">'+esc(A.mName(a.maquina))+' · SAP '+esc(a.sap||'–')+'</div><div class="small muted mono">'+esc(a.pn||'')+'</div>'+
          '<div class="mrow"><span class="pill '+(baixo(a)?'bad':'mute')+'">stock '+(a.stock!=null?fmt(a.stock,0):'–')+'</span>'+(c[a.id]?'<span class="pill ok">'+c[a.id]+' na requisição</span>':'')+'<button class="btn sm" data-add="'+esc(a.id)+'">+ Requisitar</button></div></div></div>' }).join('')+'</div>'
          : '<div class="panel empty">'+(all.length?'Nenhum artigo para esta procura.':'O catálogo está vazio.'+(g?' Use “Importar” com a lista Excel das máquinas e as fotos.':''))+'</div>');
    } else if(t==='req'){
      var fe=fv('rqE','abertas');
      var R=reqs.filter(function(r){ return (!fm||r.maquina===fm) && (fe==='todas'||(fe==='abertas'?(r.estado==='Pedida'||r.estado==='Aprovada'):r.estado===fe)) });
      body='<div class="filters"><select data-f="rqE">'+selOpts([['abertas','Por entregar'],['todas','Todas']].concat(ESTADOS.map(function(e){return [e,e]})),fe)+'</select><select data-f="rqM">'+selOpts(ms,fm,'Todas as máquinas')+'</select></div>'+
        A.table(R,[{l:'N.º',v:function(r){return '<b class="mono">'+esc(r.numero||'')+'</b>'+(r.urgente?' <span class="pill bad">urgente</span>':'')}},{l:'Data',v:function(r){return fdate(r.data)}},{l:'Máquina',v:function(r){return esc(A.mName(r.maquina))}},
          {l:'Artigos',v:function(r){ return (r.linhas||[]).map(function(l){ return esc(l.qtd+' × '+(medidas(l.nome)||l.nome)) }).join('<br>') }},{l:'Por',v:function(r){return esc(r.requisitante||'–')}},{l:'Motivo',v:function(r){return esc(r.motivo||'–')}},{l:'Estado',v:function(r){return estPill(r.estado)}}],{click:1,empty:'Sem requisições.'});
    } else if(t==='stock'){
      var L2=all.filter(function(a){ return !fm||a.maquina===fm }).sort(function(a,b){ return (baixo(b)-baixo(a)) || String(a.nome).localeCompare(String(b.nome),'pt',{numeric:true}) });
      var val=L2.reduce(function(s,a){ return s+(a.stock||0)*(a.preco||0) },0);
      body='<div class="filters"><select data-f="rqM">'+selOpts(ms,fm,'Todas as máquinas')+'</select><span class="small muted">Valor em stock: <b>'+fmt(val,2)+' €</b></span>'+(g?'<span style="flex:1"></span><button class="btn" id="rqNovo">+ Artigo</button>':'')+'</div>'+
        A.table(L2,[{l:'',v:function(a){ return '<div class="mfoto mini" data-foto="'+esc(a.id)+'"></div>' }},{l:'Artigo',v:function(a){return '<b>'+esc(a.nome)+'</b><div class="small muted">'+esc(a.loc||'')+'</div>'}},{l:'Máquina',v:function(a){return esc(A.mName(a.maquina))}},{l:'SAP',v:function(a){return '<span class="mono small">'+esc(a.sap||'–')+'</span>'}},
          {l:'Stock',n:1,v:function(a){ return a.stock==null?'–':'<span class="pill '+(baixo(a)?'bad':'ok')+'">'+fmt(a.stock,0)+'</span>' }},{l:'Mín.',n:1,v:function(a){return a.min!=null?fmt(a.min,0):'1'}},{l:'Preço',n:1,v:function(a){return a.preco!=null?fmt(a.preco,2)+' €':'–'}}],{click:1,empty:'Sem artigos.'});
    } else {
      var since=new Date(); since.setFullYear(since.getFullYear()-1); var s0=since.toISOString().slice(0,10), cons={};
      reqs.filter(function(r){ return r.estado==='Entregue' && (r.data||'')>=s0 && (!fm||r.maquina===fm) }).forEach(function(r){ (r.linhas||[]).forEach(function(l){ var k=l.art; (cons[k]=cons[k]||{l:medidas(l.nome)||l.nome, v:0, e:0}); cons[k].v+=l.qtd||0; cons[k].e+=(l.qtd||0)*(l.preco||0) }) });
      var rows=Object.keys(cons).map(function(k){return cons[k]}).sort(function(a,b){return b.v-a.v});
      body='<div class="filters"><select data-f="rqM">'+selOpts(ms,fm,'Todas as máquinas')+'</select></div><div class="grid2"><div class="panel"><h2>Correias mais consumidas (12 meses)</h2><div style="margin-top:10px">'+(rows.length?Charts.hbars({rows:rows.slice(0,15).map(function(r){return {l:r.l,v:r.v}}),unit:'un.',color:'var(--c-col)'}):'<p class="muted">Ainda sem entregas registadas.</p>')+'</div></div>'+
        '<div class="panel"><h2>Custo (12 meses)</h2><div style="margin-top:10px">'+(rows.length?Charts.hbars({rows:rows.slice().sort(function(a,b){return b.e-a.e}).slice(0,15).map(function(r){return {l:r.l,v:Math.round(r.e)}}),unit:'€',color:'var(--s2)'}):'<p class="muted">–</p>')+'</div></div></div>';
    }
    return A.head({c:C,mod:'Colagem',title:'Requisições de materiais',p:'Correias e peças das máquinas de colagem: escolha pela foto, peça ao armazém e acompanhe a entrega. O stock baixa quando a requisição é entregue.',
        acts:(g?'<button class="btn" id="rqImp">Importar</button>':'')+'<button class="btn primary" id="rqPed">Fazer requisição'+(n?' ('+n+')':'')+'</button>'})+
      A.kpis([{v:all.length,l:'Artigos no catálogo'},{v:abertas.length,l:'Requisições por entregar',cls:abertas.some(function(r){return r.urgente})?'bad':abertas.length?'warn':''},{v:bx.length,l:'Abaixo do stock mínimo',cls:bx.length?'bad':''},{v:n,l:'Na sua requisição'}])+
      A.tabs('rq',[['cat','Catálogo'],['req','Requisições'+(abertas.length?' ('+abertas.length+')':'')],['stock','Stock'],['cons','Consumo']],t)+body;
  },
  bind:function(r){
    $('rqPed').onclick=function(){ pedir() }; if($('rqImp')) $('rqImp').onclick=importar; if($('rqNovo')) $('rqNovo').onclick=function(){ artForm() };
    r.querySelectorAll('[data-add]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); var c=car(); c[b.dataset.add]=(c[b.dataset.add]||0)+1; carSet(c); A.toast('Adicionado à requisição.'); A.render() } });
    r.querySelectorAll('[data-art]').forEach(function(d){ d.onclick=function(){ artDetalhe(d.dataset.art) } });
    var t=A.tab('rq','cat'); A.bindRows(r, t==='req'? reqDetalhe : artDetalhe);
    bindFilters(r); carregarFotos(r); if(window.Charts) Charts.bind(r);
  }
});
window.Requisicoes={pedir:pedir, importar:importar, abrir:function(mid){ F.rqM=mid||''; S.tabs.rq='cat'; location.hash='requisicoes' }};
})();
