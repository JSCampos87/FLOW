/* Logística › Mapa de entregas (rota #entregas).
   Adaptação da app "Mapa de Entregas" (planeamento diário de camiões) à arquitetura do FLOW:
   - plano do dia partilhado na base (log_planos, um documento por data) em vez do localStorage de um só browser;
   - base de recebedores SAP (log_rec, em blocos) + alterações e localizações guardadas por recebedor (log_recx);
   - códigos de transporte (log_mat, em blocos) e mapa recebedor → código 15* (config/logC15) importados, nunca no código (o site é público);
   - localização feita uma vez por recebedor e reaproveitada; ordenação por distância com uma só consulta (OSRM table);
   - pedido SAP com o mesmo formato de colagem (V · vazio · Material · Texto breve · 1 · 4 vazios · EUR · 2 vazios · 1000). */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, I=window.Impressao, C='var(--c-log)', MOD='Logística';
var fv=I.fv, F=I.F, selOpts=I.selOpts, bindFilters=I.bindFilters;
var PARTIDA={label:'Graphicsleader · Pedroso, Vila Nova de Gaia', lat:41.082552, lon:-8.579260};
var SEQ={PT:['150000221','150000222','150000223','150000224'], ES:['150000226','150000227','150000228','150000229']};

/* ---------- utilitários ---------- */
function uid(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-3) }
function nrm(s){ return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim() }
/* código SAP: sem espaços, sem ".0", sem zeros à esquerda */
function key(v){ var x=String(v==null?'':v).trim().replace(/[\s'"]/g,'').replace(/[.,]0+$/,''); return /^\d+$/.test(x)? x.replace(/^0+(?=\d)/,'') : x.toUpperCase() }
function dig15(v){ var d=String(v==null?'':v).replace(/\.0+$/,'').replace(/\D/g,''); return /^15\d{7}$/.test(d)? d : '' }
function cpDe(t){ var m=/\b(\d{4}-\d{3}|\d{5})\b/.exec(t||''); return m? m[1] : '' }
function podeEd(){ return !!S.db && A.can('logistica') }
function dia(){ return fv('ld', A.today()) }
function nomeCam(n){ var m=/^C0*(\d+)$/i.exec(String(n||'').trim()); return m? 'Camião '+(+m[1]) : (n||'Camião') }
function ordCam(n){ var m=/C\s*0*(\d+)/i.exec(n||''); return m? +m[1] : 999 }
function dur(min){ var h=Math.floor(min/60), m=Math.round(min%60); return h? h+' h '+m+' min' : m+' min' }
function cfgL(){ return A.cfg('logEntregas') }
function partida(){ var p=cfgL().partida; return p&&p.lat? p : PARTIDA }
var STOP={de:1,da:1,do:1,das:1,dos:1,the:1,sa:1,sl:1,lda:1,unipessoal:1,portugal:1,espanha:1,fse:1,det:1,tvpt:1,tves:1,entrega:1,entregas:1};
function tok(s){ return nrm(s).split(' ').filter(function(x){ return x.length>2 && !STOP[x] }) }
function parecido(a,b){ var ta=tok(a), tb=tok(b); if(!ta.length||!tb.length) return 0; var n=ta.filter(function(x){ return tb.indexOf(x)>=0 }).length; return n/Math.min(ta.length,tb.length) }
var ICO={add:'<path d="M12 5v14M5 12h14"/>', map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>', ord:'<path d="M7 4v16M4 17l3 3 3-3M13 6h8M13 12h6M13 18h4"/>',
  edt:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/>', up:'<path d="m6 15 6-6 6 6"/>', dn:'<path d="m6 9 6 6 6-6"/>'};
function ib(a, t, attrs, off){ return '<button type="button" class="lg-ib" data-la="'+a+'" '+attrs+' title="'+esc(t)+'" aria-label="'+esc(t)+'"'+(off?' disabled':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICO[a]+'</svg></button>' }
function aviso(msg){ ['lgSt','lmS'].forEach(function(id){ var el=$(id); if(el) el.textContent=msg||'' }) }

/* ---------- dados ---------- */
function recBase(){ var o={}; A.list('log_rec').slice().sort(function(a,b){ return (a.parte||0)-(b.parte||0) }).forEach(function(d){ (d.linhas||[]).forEach(function(r){ o[r.code]=r }) }); return o }
var RC=null, RCa=null, RCb=null;   /* cache: refeita só quando chega uma nova versão das coleções */
function recs(){ var a=A.list('log_rec'), b=A.list('log_recx');
  if(RC&&RCa===a&&RCb===b) return RC; RC={}; RCa=a; RCb=b; A.chunked('log_rec','log_recx','code').forEach(function(r){ delete r._k; RC[r.code]=r }); return RC }
function rec(code){ code=key(code); return code? recs()[code] : null }
function materiais(){ var o=[]; A.list('log_mat').slice().sort(function(a,b){ return (a.parte||0)-(b.parte||0) }).forEach(function(d){ o=o.concat(d.linhas||[]) }); return o }
function c15map(){ return (A.cfg('logC15')||{}).m || {} }
function plano(d){ d=d||dia(); var p=A.get('log_planos',d); return p? JSON.parse(JSON.stringify(A.clean(p))) : {data:d, camioes:[]} }
/* escreve sempre por cima da versão mais recente do dia (outro utilizador pode ter mexido entretanto) */
function mudar(d, fn){ var p=plano(d); if(fn(p)===false) return Promise.resolve(); p.camioes.sort(function(a,b){ return ordCam(a.nome)-ordCam(b.nome) || String(a.nome).localeCompare(String(b.nome)) }); return A.put('log_planos', d, p) }
function camDe(p, id){ return p.camioes.filter(function(c){ return c.id===id })[0] }
function proxCam(p){ var u={}; p.camioes.forEach(function(c){ u[ordCam(c.nome)]=1 }); var n=1; while(u[n]) n++; return 'C'+('0'+n).slice(-2) }
function novoCam(p, nome){ var ult=p.camioes[p.camioes.length-1]||{}, d=cfgL();
  return {id:uid(), nome:nome||proxCam(p), estado:ult.estado||d.estado||'Durante a Noite', local:ult.local||d.local||'PTG + GLP', entregas:[]} }
function deRec(r, nome){ return {id:uid(), cod:r.code, nome:nome||r.name||r.code, morada:r.morada||'', rua:r.rua||'', cp:r.cp||cpDe(r.morada), cidade:r.cidade||'', pais:r.pais||'', lat:r.lat==null?null:r.lat, lon:r.lon==null?null:r.lon, aprox:!!r.aprox, hora:'', notas:''} }

/* ---------- material SAP de cada entrega ---------- */
function paisDe(e){ var p=nrm(e.pais); if(p==='es'||/espanh|espana|spain/.test(p)) return 'ES'; if(p==='pt'||/portugal/.test(p)) return 'PT';
  var m=String(e.morada||''); if(/\b(espanha|espana|spain)\b/.test(nrm(m))) return 'ES'; if(/\b\d{5}\b/.test(m) && !/\b\d{4}-\d{3}\b/.test(m)) return 'ES'; return 'PT' }
function c15(e){ var r=rec(e.cod); return dig15(e.code15) || (r&&dig15(r.code15)) || dig15(c15map()[key(e.cod)]) || '' }
function textoDe(code, e){ var l=materiais().filter(function(m){ return String(m.material)===code }); if(!l.length) return '';
  var alvo=(e.nome||'')+' '+(e.morada||''); l.sort(function(a,b){ return parecido(alvo,b.text)-parecido(alvo,a.text) }); return l[0].text }
/* intermédias: código pela posição (1.ª…4.ª entrega, PT ou ES); última ou única: código 15* do recebedor */
function material(c, e, i){
  var n=c.entregas.length, pos=i+1, p=paisDe(e), tv=p==='ES'?'TVES':'TVPT';
  if(n<=1 || pos===n){ var k=c15(e); return {mat:k, txt:(k&&textoDe(k,e))||('FSE-DET-'+tv+'_'+(e.nome||'')), ult:true, crit:'Última / única entrega · código 15* do recebedor'} }
  return {mat:SEQ[p][Math.min(pos,4)-1], txt:'FSE-DET-'+tv+'_'+pos+' ENTREGA_'+(e.nome||''), ult:false, crit:pos+'.ª entrega '+p+' · camião com várias entregas'};
}

/* ---------- localização (Nominatim, com recurso ao Photon) ---------- */
var NQ=Promise.resolve();
function nomi(q){ /* política do Nominatim: no máximo 1 pedido por segundo */
  var run=NQ.then(function(){ return fetch('https://nominatim.openstreetmap.org/search?'+new URLSearchParams(Object.assign({format:'jsonv2',limit:'5',addressdetails:'1','accept-language':'pt'},q)))
    .then(function(r){ return r.ok? r.json() : [] }).catch(function(){ return [] }) });
  NQ=run.then(function(){ return new Promise(function(r){ setTimeout(r,1100) }) }); return run }
function npc(v){ return String(v||'').replace(/[\s-]/g,'') }
async function geocodificar(e){
  var cp=e.cp||cpDe(e.morada), cc=paisDe(e)==='ES'?'es':'pt', rua=String(e.rua||String(e.morada||'').split(',')[0]).replace(/\bapartad\w*.*$/i,'').replace(/\bap\.?\s*\d+\b/ig,'').trim(), q=[];
  if(rua&&cp) q.push({street:rua, postalcode:cp, countrycodes:cc});
  if(rua&&e.cidade) q.push({street:rua, city:e.cidade, countrycodes:cc});
  if(e.morada) q.push({q:e.morada, countrycodes:cc});
  if(cp) q.push({postalcode:cp, countrycodes:cc});
  if(e.cidade) q.push({city:e.cidade, countrycodes:cc});
  for(var i=0;i<q.length;i++){ var r=await nomi(q[i]); if(r&&r.length){
    var b=r.filter(function(x){ return cp && npc(x.address&&x.address.postcode)===npc(cp) })[0]||r[0];
    return {lat:+b.lat, lon:+b.lon, geo:b.display_name||'', aprox: i>=3 || !!(cp && npc(b.address&&b.address.postcode)!==npc(cp))} } }
  try{ var j=await (await fetch('https://photon.komoot.io/api/?limit=1&q='+encodeURIComponent(e.morada||[rua,cp,e.cidade].join(' ')))).json(), f=j.features&&j.features[0];
    if(f) return {lat:f.geometry.coordinates[1], lon:f.geometry.coordinates[0], geo:[f.properties.name,f.properties.postcode,f.properties.city].filter(Boolean).join(', '), aprox:true} }catch(x){}
  return null;
}
/* guarda a localização no recebedor: a próxima entrega ao mesmo recebedor já não pesquisa */
function guardarGeo(code, g){ var r=rec(code); if(!r) return Promise.resolve();
  return A.put('log_recx', A.idKey(r.code), Object.assign({}, r, {lat:g.lat, lon:g.lon, geo:g.geo||'', aprox:!!g.aprox, manual:!!g.manual, geoEm:A.nowIso()})) }
async function localizar(e){
  if(e.lat!=null && e.lon!=null) return null;
  var r=rec(e.cod); if(r && r.lat!=null && (!e.morada || e.morada===r.morada)) return {lat:r.lat, lon:r.lon, aprox:!!r.aprox};
  if(!e.morada && !e.cp) return null;
  var g=await geocodificar(e); if(g && r && (!e.morada || e.morada===r.morada)) await guardarGeo(r.code, g).catch(function(){});
  return g;
}
async function localizarCam(d, cid){
  var c=camDe(plano(d),cid); if(!c) return; var res={}, n=0;
  for(var i=0;i<c.entregas.length;i++){ var e=c.entregas[i]; if(e.lat!=null) continue; aviso('A localizar '+(++n)+': '+e.nome+'…'); var g=await localizar(e); if(g) res[e.id]=g }
  if(Object.keys(res).length) await mudar(d, function(p){ var x=camDe(p,cid); if(!x) return false; x.entregas.forEach(function(e){ var g=res[e.id]; if(g){ e.lat=g.lat; e.lon=g.lon; e.aprox=!!g.aprox } }) });
}

/* ---------- distâncias e ordenação ---------- */
function hav(a,b){ var R=6371, r=Math.PI/180, dl=(b.lat-a.lat)*r, dn=(b.lon-a.lon)*r, h=Math.pow(Math.sin(dl/2),2)+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.pow(Math.sin(dn/2),2); return 2*R*Math.asin(Math.sqrt(h)) }
function ll(p){ return (+p.lon).toFixed(6)+','+(+p.lat).toFixed(6) }
async function matriz(pts){ /* uma só consulta para todas as distâncias por estrada (km) */
  try{ var j=await (await fetch('https://router.project-osrm.org/table/v1/driving/'+pts.map(ll).join(';')+'?annotations=distance')).json();
    if(j.code==='Ok') return j.distances.map(function(l,i){ return l.map(function(m,k){ return m==null? hav(pts[i],pts[k]) : m/1000 }) }) }catch(e){}
  return pts.map(function(a){ return pts.map(function(b){ return hav(a,b) }) });
}
async function rota(pts, geo){
  try{ var j=await (await fetch('https://router.project-osrm.org/route/v1/driving/'+pts.map(ll).join(';')+'?steps=false&overview='+(geo?'full&geometries=geojson':'false'))).json();
    if(j.code==='Ok'&&j.routes.length) return {km:j.routes[0].distance/1000, min:j.routes[0].duration/60, geometry:j.routes[0].geometry} }catch(e){}
  return null;
}
/* começa na fábrica e escolhe sempre a entrega mais próxima da anterior (como na app original) */
async function ordenarCam(d, cid){
  await localizarCam(d, cid);
  var c=camDe(plano(d),cid); if(!c||!c.entregas.length) return;
  var ok=c.entregas.filter(function(e){ return e.lat!=null }), sem=c.entregas.filter(function(e){ return e.lat==null }), P=partida(), ordem=[], leg={};
  if(ok.length>1){ aviso('A calcular distâncias de '+nomeCam(c.nome)+'…');
    var pts=[P].concat(ok), D=await matriz(pts), cur=0, livres=ok.map(function(e,i){ return i+1 });
    while(livres.length){ var b=livres.reduce(function(m,i){ return D[cur][i]<D[cur][m]? i : m }, livres[0]); leg[pts[b].id]=D[cur][b]; ordem.push(pts[b].id); livres.splice(livres.indexOf(b),1); cur=b }
  } else ordem=ok.map(function(e){ return e.id });
  var seq=ordem.map(function(id){ return ok.filter(function(e){ return e.id===id })[0] }), r=seq.length? await rota([P].concat(seq)) : null;
  await mudar(d, function(p){ var x=camDe(p,cid); if(!x) return false; var m={}; x.entregas.forEach(function(e){ m[e.id]=e });
    var ids=ordem.concat(sem.map(function(e){ return e.id })).filter(function(id){ return m[id] }), resto=x.entregas.filter(function(e){ return ids.indexOf(e.id)<0 });
    x.entregas=ids.map(function(id){ var e=m[id]; if(leg[id]!=null) e.km=Math.round(leg[id]*10)/10; return e }).concat(resto);
    if(r){ x.km=Math.round(r.km*10)/10; x.min=Math.round(r.min) } });
}
async function ordenarTodos(d){
  var cs=plano(d).camioes;
  for(var i=0;i<cs.length;i++){ aviso('A ordenar '+nomeCam(cs[i].nome)+' ('+(i+1)+'/'+cs.length+')…'); try{ await ordenarCam(d, cs[i].id) }catch(e){ console.warn(e) } }
  aviso(''); A.toast('Entregas localizadas e ordenadas por distância.');
}

/* ---------- colar plano do SAP ---------- */
function camN(v, num){ var x=String(v||'').trim().toUpperCase().replace(/\s+/g,''), m=/^C0*(\d{1,3})$/.exec(x)||(num&&/^0*(\d{1,3})$/.exec(x)); return m&&+m[1]>=1? 'C'+('0'+(+m[1])).slice(-2) : '' }
function lerSap(txt){
  var L=String(txt||'').replace(/ /g,' ').split(/\r?\n/).filter(function(l){ return l.trim() }), H=null, out=[], vist={}, rep=0, R=recs();
  var isCam=function(x){ return /camiao|truck|viatura|transporte|rota/.test(x) }, isCod=function(x){ return /recebedor|ship ?to|destinat|cod\w* cliente|cliente cod|parceiro/.test(x) }, isNome=function(x){ return /nome|designacao|cliente/.test(x) && !isCod(x) };
  L.forEach(function(l,li){
    var p=l.split('\t'); if(p.length<2&&l.indexOf(';')>=0) p=l.split(';'); if(p.length<2&&l.indexOf('|')>=0) p=l.split('|'); if(p.length<2) p=l.split(/\s{2,}/);
    p=p.map(function(x){ return x.trim().replace(/^"|"$/g,'') }); if(p.length<2) return;
    if(li<5 && !H){ var n=p.map(nrm), hc=n.findIndex(isCam), hk=n.findIndex(isCod), hn=n.findIndex(isNome); if(hc>=0&&(hk>=0||hn>=0)){ H={c:hc,k:hk,n:hn}; return } }
    var ki=-1, cod='', ci=-1, cam='';
    if(H&&H.k>=0&&/^\d+$/.test(key(p[H.k]))){ ki=H.k; cod=key(p[ki]) }
    if(!cod) p.some(function(x,j){ var c=key(x); if(/^\d+$/.test(c)&&R[c]){ ki=j; cod=c; return true } });
    if(!cod) p.some(function(x,j){ var c=key(x); if(/^\d{5,12}$/.test(c)){ ki=j; cod=c; return true } });
    if(H&&H.c>=0){ cam=camN(p[H.c],true); if(cam) ci=H.c }
    if(!cam) p.some(function(x,j){ var m=/\bC\s*0*(\d{1,3})\b/i.exec(x); if(m){ cam=camN('C'+m[1]); ci=j; return !!cam } });
    if(!cam&&cod) p.some(function(x,j){ if(j!==ki&&/^0?\d{1,2}$/.test(x)&&+x>=1&&+x<=50){ cam=camN(x,true); ci=j; return true } });
    if(!cam) return;
    var nome=H&&H.n>=0? p[H.n]||'' : '';
    if(!nome) nome=p.filter(function(x,j){ return j!==ki&&j!==ci&&x&&!/^[-+]?\d+([.,]\d+)?$/.test(x) }).sort(function(a,b){ return b.length-a.length })[0]||'';
    if(!cod&&!nome) return;
    var k=cam+'|'+(cod||nrm(nome)); if(vist[k]){ rep++; return } vist[k]=1;
    out.push({cam:cam, cod:cod, nome:nome});
  });
  return {rows:out, rep:rep};
}
/* sem código: procura o recebedor pelo nome; só aceita quando há um único candidato */
function porNome(nome){ var R=recs(), c=Object.keys(R).map(function(k){ return R[k] }).filter(function(r){ return parecido(nome,r.name)>=0.75 }); return c.length===1? c[0] : null }
function colarSap(){
  var d=dia();
  A.showModal('<h2>Colar plano do SAP · '+fdate(d)+'</h2><p class="muted" style="margin:-6px 0 0">Cole as linhas do SAP com o código do recebedor e o camião (C01, C1, 01 ou 1). Pode trazer outras colunas: o FLOW encontra o código e o camião. Linhas repetidas do mesmo recebedor no mesmo camião contam uma só vez.</p>'+
    '<textarea id="spT" rows="10" class="mono" placeholder="Código cliente&#9;Cliente&#9;Camião&#10;10001234&#9;Cliente A&#9;C01&#10;10005678&#9;Cliente B&#9;C02"></textarea>'+
    '<label class="fld check"><input type="checkbox" id="spR"'+(plano(d).camioes.length?'':' checked')+'> Substituir o plano deste dia</label>'+
    '<label class="fld check"><input type="checkbox" id="spO" checked> Localizar e ordenar por distância a seguir</label><div id="spS" class="small muted"></div>'+
    '<div class="foot"><button class="btn" id="spX">Cancelar</button><button class="btn primary" id="spOk">Criar camiões e entregas</button></div>',
  function(){
    $('spX').onclick=A.closeModal;
    var prev=function(){ var r=lerSap($('spT').value), cams={}; r.rows.forEach(function(x){ cams[x.cam]=1 });
      $('spS').innerHTML=r.rows.length? '<b>'+r.rows.length+'</b> entregas em <b>'+Object.keys(cams).length+'</b> camiões'+(r.rep?' · '+r.rep+' linhas repetidas ignoradas':'')+'.' : ''; return r };
    $('spT').addEventListener('input',prev);
    $('spOk').onclick=async function(){
      var r=prev(); if(!r.rows.length){ $('spS').innerHTML='<span style="color:var(--bad)">Não encontrei linhas com código e camião.</span>'; return }
      if(!Object.keys(recs()).length){ $('spS').innerHTML='<span style="color:var(--bad)">Importe primeiro a base de recebedores (separador Recebedores).</span>'; return }
      this.disabled=true; var subst=$('spR').checked, ord=$('spO').checked, falta=0, dup=0;
      try{
        await mudar(d, function(p){ if(subst) p.camioes=[];
          r.rows.forEach(function(x){ var c=p.camioes.filter(function(c){ return c.nome===x.cam })[0]; if(!c){ c=novoCam(p,x.cam); p.camioes.push(c) }
            var rr=x.cod? rec(x.cod) : porNome(x.nome);
            if(rr && c.entregas.some(function(e){ return e.cod===rr.code })){ dup++; return }
            if(rr) c.entregas.push(deRec(rr, x.nome)); else { falta++; c.entregas.push({id:uid(), cod:x.cod, nome:x.nome||x.cod, morada:'', hora:'', notas:'', lat:null, lon:null}) } }) });
        A.closeModal();
        A.toast(r.rows.length+' entregas lidas'+(dup?' · '+dup+' já existiam':'')+(falta?' · '+falta+' sem recebedor na base (a vermelho)':'')+'.');
        if(ord) ordenarTodos(d);
      }catch(e){ console.error(e); $('spS').textContent='Não foi possível gravar.'; this.disabled=false }
    };
  });
}

/* ---------- formulários ---------- */
function camForm(cid){
  var d=dia(), p=plano(d), c=cid? camDe(p,cid) : null;
  A.openForm({title:c? nomeCam(c.nome) : 'Novo camião', values:c||novoCam(p),
    fields:[{k:'nome',l:'Nome / matrícula',req:1,help:'C01, C02… ficam como "Camião 1", "Camião 2".'},{k:'estado',l:'Estado da carga',ph:'Durante a Noite'},{k:'local',l:'Local da carga',ph:'PTG + GLP'}],
    submit:function(v){ return mudar(d, function(p){ var x=c? camDe(p,cid) : null; if(!x){ x=novoCam(p); p.camioes.push(x) } x.nome=v.nome.trim(); x.estado=v.estado; x.local=v.local }) },
    del:c? function(){ return mudar(d, function(p){ p.camioes=p.camioes.filter(function(x){ return x.id!==cid }) }) } : null});
}
function entForm(cid, eid){
  var d=dia(), p=plano(d); if(!p.camioes.length){ A.toast('Crie primeiro um camião.'); return }
  var c=camDe(p,cid)||p.camioes[0], e=eid? c.entregas.filter(function(x){ return x.id===eid })[0] : null, sel=e? rec(e.cod) : null;
  A.openForm({title:e? 'Entrega · '+e.nome : 'Nova entrega · '+nomeCam(c.nome), values:Object.assign({cam:c.id}, e||{}),
    fields:[{k:'cod',l:'N.º recebedor SAP',list:'lgRecL',help:'Escreva o código ou escolha da lista: preenche cliente e morada.'},{k:'nome',l:'Cliente',req:1},
      {k:'morada',l:'Local de entrega / morada',req:1,full:1},{k:'hora',l:'Hora de entrega',ph:'09H'},{k:'cam',l:'Camião',t:'select',req:1,o:p.camioes.map(function(x){ return [x.id,nomeCam(x.nome)] })},
      {k:'code15',l:'Código 15* (só na última entrega)',ph:'Vazio = o do recebedor',help:sel&&c15({cod:sel.code})?'Recebedor: '+c15({cod:sel.code}):''},{k:'notas',l:'Notas',full:1}],
    after:function(box){
      var R=recs(), dl=document.createElement('datalist'); dl.id='lgRecL';
      dl.innerHTML=Object.keys(R).slice(0,5000).map(function(k){ var r=R[k]; return '<option value="'+esc(r.code)+'">'+esc(r.name+(r.cidade?' · '+r.cidade:''))+'</option>' }).join(''); box.appendChild(dl);
      var f=$('f_cod'), go=function(){ var r=rec(f.value); if(!r) return; sel=r; $('f_nome').value=$('f_nome').value||r.name; $('f_morada').value=r.morada||''; };
      f.addEventListener('change',go); f.addEventListener('input',function(){ if(rec(f.value)) go() });
    },
    submit:function(v){ return mudar(d, function(p){
      var old=null, pos=-1, de=null; p.camioes.forEach(function(x){ var i=x.entregas.findIndex(function(y){ return y.id===eid }); if(i>=0){ old=x.entregas[i]; pos=i; de=x; x.entregas.splice(i,1) } });
      var n=Object.assign({id:uid(), lat:null, lon:null}, old||{}, {cod:key(v.cod), nome:v.nome.trim(), morada:v.morada.trim(), hora:v.hora.trim(), code15:dig15(v.code15), notas:v.notas});
      if(sel && key(v.cod)===sel.code && n.morada===sel.morada) Object.assign(n,{rua:sel.rua||'', cp:sel.cp||'', cidade:sel.cidade||'', pais:sel.pais||''}, sel.lat!=null&&(!old||old.morada!==n.morada)? {lat:sel.lat, lon:sel.lon, aprox:!!sel.aprox} : {});
      if(old && old.morada!==n.morada && !(sel && n.morada===sel.morada && sel.lat!=null)){ n.lat=null; n.lon=null; n.aprox=false; n.cp=cpDe(n.morada); n.rua=''; n.cidade='' }
      if(!old){ n.cp=n.cp||cpDe(n.morada) }
      var x=camDe(p,v.cam); if(de===x && pos>=0) x.entregas.splice(pos,0,n); else x.entregas.push(n); }) },
    del:e? function(){ return mudar(d, function(p){ p.camioes.forEach(function(x){ x.entregas=x.entregas.filter(function(y){ return y.id!==eid }) }) }) } : null});
}

/* ---------- mapa (Leaflet, só carregado quando se abre) ---------- */
var LURL='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
function loadL(){ if(window.L) return Promise.resolve(); return new Promise(function(res,rej){ var l=document.createElement('link'); l.rel='stylesheet'; l.href=LURL+'leaflet.css'; document.head.appendChild(l);
  var s=document.createElement('script'); s.src=LURL+'leaflet.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s) }) }
function mapa(cid){
  var d=dia(), c0=camDe(plano(d),cid); if(!c0) return; var ed=podeEd();
  A.showModal('<h2>'+esc(nomeCam(c0.nome))+' · mapa</h2><p class="small muted" id="lmS" style="margin:-6px 0 0">A preparar o mapa…</p><div id="lmap" class="lgmap"></div>'+
    (ed?'<p class="small muted" style="margin:0">Ponto no sítio errado? Arraste-o para o local certo: fica guardado no recebedor para as próximas entregas.</p>':'')+
    '<div class="foot"><button class="btn" id="lmX">Fechar</button>'+(ed?'<button class="btn" id="lmO">Ordenar por distância</button>':'')+'<a class="btn primary" id="lmG" target="_blank" rel="noopener" hidden>Abrir no Google Maps</a></div>',
  async function(){
    $('lmX').onclick=A.closeModal;
    if($('lmO')) $('lmO').onclick=async function(){ this.disabled=true; try{ await ordenarCam(d,cid); A.closeModal(); mapa(cid) }catch(e){ aviso('Não foi possível ordenar.'); this.disabled=false } };
    try{ await loadL() }catch(e){ aviso('Não foi possível carregar o mapa (sem internet?).'); return }
    if(ed){ try{ await localizarCam(d,cid) }catch(e){} }
    var c=camDe(plano(d),cid), el=$('lmap'); if(!c||!el) return;
    var cs=getComputedStyle(document.documentElement), cor=cs.getPropertyValue('--c-log').trim(), P=partida();
    var m=L.map(el), b=[[P.lat,P.lon]], pts=[P];
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap'}).addTo(m);
    L.marker([P.lat,P.lon],{icon:L.divIcon({className:'', html:'<div class="lgpin lgpin-p">G</div>', iconSize:[28,28], iconAnchor:[14,14]})}).addTo(m).bindPopup('<b>Partida</b><br>'+esc(P.label));
    c.entregas.forEach(function(e,i){ if(e.lat==null) return; pts.push(e); b.push([e.lat,e.lon]);
      var mk=L.marker([e.lat,e.lon],{draggable:ed, icon:L.divIcon({className:'', html:'<div class="lgpin'+(e.aprox?' lgpin-a':'')+'">'+(i+1)+'</div>', iconSize:[28,28], iconAnchor:[14,14]})}).addTo(m)
        .bindPopup('<b>'+(i+1)+'. '+esc(e.nome)+'</b><br>'+esc(e.morada||'')+(e.aprox?'<br><i>Localização aproximada</i>':''));
      if(ed) mk.on('dragend',function(){ var p2=mk.getLatLng(), g={lat:+p2.lat.toFixed(6), lon:+p2.lng.toFixed(6), aprox:false, manual:true, geo:'Corrigido no mapa'};
        mudar(d,function(p){ var x=camDe(p,cid); var y=x&&x.entregas.filter(function(z){ return z.id===e.id })[0]; if(!y) return false; y.lat=g.lat; y.lon=g.lon; y.aprox=false })
          .then(function(){ return e.cod&&rec(e.cod)&&(!e.morada||e.morada===rec(e.cod).morada)? guardarGeo(e.cod,g) : null }).then(function(){ A.toast('Localização corrigida.') }).catch(function(){ A.toast('Não foi possível guardar a localização.') }) });
    });
    m.fitBounds(b,{padding:[30,30], maxZoom:13}); setTimeout(function(){ m.invalidateSize() },150);
    var sem=c.entregas.filter(function(e){ return e.lat==null }).length;
    if(pts.length>1){ var r=await rota(pts,true); if(r&&$('lmap')){ L.geoJSON(r.geometry,{style:{color:cor, weight:5, opacity:.85}}).addTo(m);
      aviso(c.entregas.length+' entregas · '+fmt(r.km,1)+' km · '+dur(r.min)+' de condução'+(sem?' · '+sem+' sem localização':'')+'.');
      if(ed && (Math.round(r.km*10)/10!==c.km)) mudar(d,function(p){ var x=camDe(p,cid); if(!x) return false; x.km=Math.round(r.km*10)/10; x.min=Math.round(r.min) }).catch(function(){}) }
      else aviso('Não foi possível calcular a rota por estrada.') }
    else aviso(sem? 'Nenhuma entrega com localização.' : 'Sem entregas.');
    var ok=pts.slice(1); if(ok.length){ var g=$('lmG'); g.hidden=false; var ult=ok[ok.length-1];
      g.href='https://www.google.com/maps/dir/?api=1&travelmode=driving&origin='+P.lat+','+P.lon+'&destination='+ult.lat+','+ult.lon+(ok.length>1?'&waypoints='+encodeURIComponent(ok.slice(0,-1).slice(0,9).map(function(e){ return e.lat+','+e.lon }).join('|')):'') }
  });
}

/* ---------- pedido SAP ---------- */
function pedidoSap(){
  var d=dia(), p=plano(d), rows=[]; p.camioes.forEach(function(c){ c.entregas.forEach(function(e,i){ var s=material(c,e,i); rows.push({c:c, e:e, i:i, mat:s.mat, txt:s.txt.slice(0,40), ult:s.ult, crit:s.crit}) }) });
  if(!rows.length){ A.toast('Ainda não há entregas neste dia.'); return }
  var falta=rows.filter(function(r){ return !r.mat }).length;
  A.showModal('<h2>Pedido SAP · transporte · '+fdate(d)+'</h2><p class="muted" style="margin:-6px 0 0">Entregas intermédias: código pela posição (1.ª, 2.ª, 3.ª, 4.ª entrega, PT ou ES). Última ou única entrega: código 15* do recebedor. Texto breve com 40 caracteres no máximo (limite do SAP).</p>'+
    (falta?'<div class="banner">'+falta+' linha'+(falta>1?'s':'')+' sem código 15*. Escreva o material: fica guardado no recebedor.</div>':'')+
    '<div class="tw lgsap"><table class="t"><thead><tr><th>Camião</th><th>Cliente</th><th>Material</th><th>Texto breve</th><th class="n">Qtd.</th><th>UM</th></tr></thead><tbody>'+
    rows.map(function(r,k){ return '<tr><td class="small">'+esc(nomeCam(r.c.nome))+' · '+(r.i+1)+'.ª</td><td>'+esc(r.e.nome)+'<small class="muted" style="display:block">'+esc(r.crit)+'</small></td>'+
      '<td><input class="mono" data-sm="'+k+'" value="'+esc(r.mat)+'" size="11" inputmode="numeric" aria-label="Material"></td><td><input data-st="'+k+'" value="'+esc(r.txt)+'" maxlength="40" size="36" aria-label="Texto breve"></td><td class="n">1</td><td>UN</td></tr>' }).join('')+'</tbody></table></div>'+
    '<p class="small muted" style="margin:0">No SAP, selecione a primeira célula da coluna C e faça Ctrl+V. Cada linha leva: V · vazio · Material · Texto breve · 1 · 4 vazios · EUR · 2 vazios · 1000.</p>'+
    '<div class="foot"><span class="err" id="spE"></span><button class="btn" id="spX">Fechar</button><button class="btn primary" id="spC">Copiar para SAP</button></div>',
  function(){
    $('spX').onclick=A.closeModal;
    $('spC').onclick=async function(){
      var bad=[], novos=[];
      rows.forEach(function(r,k){ var m=key(document.querySelector('[data-sm="'+k+'"]').value), t=document.querySelector('[data-st="'+k+'"]').value.replace(/[\t\r\n]+/g,' ').trim();
        if(!/^\d{9,10}$/.test(m)) bad.push(k+1); if(r.ult && m!==r.mat && dig15(m) && r.e.cod) novos.push({r:r, m:m}); r.mat=m; r.txt=t });
      if(bad.length){ $('spE').textContent='Material em falta ou inválido na'+(bad.length>1?'s linhas ':' linha ')+bad.join(', ')+'.'; return }
      var txt=rows.map(function(r){ return ['V','',r.mat,r.txt,'1','','','','','EUR','','','1000'].join('\t') }).join('\r\n');
      try{ await navigator.clipboard.writeText(txt) }catch(e){ var ta=document.createElement('textarea'); ta.value=txt; ta.style.cssText='position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove() }
      this.textContent='Copiado ('+rows.length+' linhas)'; A.toast('Linhas copiadas. Cole no SAP com Ctrl+V.');
      /* código 15* escrito à mão: guarda no recebedor (e na entrega) */
      for(var i=0;i<novos.length;i++){ var n=novos[i], r0=rec(n.r.e.cod); try{ if(r0) await A.put('log_recx',A.idKey(r0.code),Object.assign({},r0,{code15:n.m}));
        await mudar(d,function(p){ var x=camDe(p,n.r.c.id), y=x&&x.entregas.filter(function(z){ return z.id===n.r.e.id })[0]; if(!y) return false; y.code15=n.m }) }catch(e){} }
    };
  });
}

/* ---------- email, impressão e Excel ---------- */
function tabelaHtml(p, d){
  var cs=getComputedStyle(document.documentElement), g=function(v){ return cs.getPropertyValue(v).trim() };
  var bd='1px solid '+g('--line'), td='border:'+bd+';padding:6px 8px;vertical-align:middle;font-size:13px;color:'+g('--fg');
  var h='<table style="border-collapse:collapse;width:100%;font-family:'+g('--f-body')+'"><thead><tr><th colspan="4" style="'+td+';background:'+g('--brand-soft')+';font-size:17px;text-align:center">Entregas dia '+esc(fdate(d))+'</th></tr><tr>'+
    ['Transporte','Cliente / local de entrega','Hora','Estado da carga / local'].map(function(t){ return '<th style="'+td+';background:'+g('--surface-2')+';text-align:left;font-size:12px;text-transform:uppercase">'+t+'</th>' }).join('')+'</tr></thead><tbody>';
  p.camioes.forEach(function(c){ var n=Math.max(c.entregas.length,1), cam='<td rowspan="'+n+'" style="'+td+';font-weight:700;border-left:4px solid '+g('--c-log')+';white-space:nowrap">'+esc(nomeCam(c.nome))+'</td>',
      car='<td rowspan="'+n+'" style="'+td+';text-align:center">'+esc(c.estado||'')+(c.local?'<br>'+esc(c.local):'')+'</td>';
    if(!c.entregas.length){ h+='<tr>'+cam+'<td style="'+td+'" colspan="2">Sem entregas</td>'+car+'</tr>'; return }
    c.entregas.forEach(function(e,i){ h+='<tr>'+(i?'':cam)+'<td style="'+td+'"><b>'+(i+1)+'.ª entrega → '+esc(e.nome)+'</b><br><span style="color:'+g('--muted')+';font-size:12px">'+esc(e.morada||'')+'</span></td>'+
      '<td style="'+td+';text-align:center;font-weight:700;color:'+g('--bad')+'">'+esc(e.hora||'')+'</td>'+(i?'':car)+'</tr>' }) });
  return h+'</tbody></table>';
}
async function copiarEmail(){
  var d=dia(), p=plano(d); if(!p.camioes.length){ A.toast('Ainda não há camiões neste dia.'); return }
  var html=tabelaHtml(p,d), txt=p.camioes.map(function(c){ return nomeCam(c.nome)+'\n'+c.entregas.map(function(e,i){ return '  '+(i+1)+'.ª '+e.nome+' · '+(e.morada||'')+(e.hora?' · '+e.hora:'') }).join('\n') }).join('\n\n');
  try{ await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}), 'text/plain':new Blob([txt],{type:'text/plain'})})]) }
  catch(e){ var w=document.createElement('div'); w.contentEditable='true'; w.style.cssText='position:fixed;left:-99999px'; w.innerHTML=html; document.body.appendChild(w);
    var r=document.createRange(); r.selectNodeContents(w); var s=getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); w.remove() }
  A.toast('Mapa copiado. No email, faça Ctrl+V (fica como tabela editável).');
}
function imprimir(){
  var d=dia(), p=plano(d); if(!p.camioes.length){ A.toast('Ainda não há camiões neste dia.'); return }
  var fontes=Array.prototype.filter.call(document.querySelectorAll('link[rel=stylesheet]'),function(l){ return /fonts\.googleapis/.test(l.href) }).map(function(l){ return '<link rel="stylesheet" href="'+esc(l.href)+'">' }).join('');
  var doc='<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Mapa de entregas '+esc(d)+'</title>'+fontes+'<style>@page{size:A4 landscape;margin:12mm}body{margin:0}tr{page-break-inside:avoid}img{height:34px;margin-bottom:10px}</style></head><body>'+
    '<img src="'+esc(new URL('assets/logo.png',location.href).href)+'" alt="">'+tabelaHtml(p,d)+'</body></html>';
  var fr=document.createElement('iframe'); fr.setAttribute('aria-hidden','true'); fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(fr);
  var x=fr.contentDocument; x.open(); x.write(doc); x.close();
  var feito=false, go=function(){ if(feito) return; feito=true; fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(function(){ fr.remove() },60000) };
  fr.onload=function(){ setTimeout(go,300) }; setTimeout(go,1500);
}
async function excel(){
  var d=dia(), p=plano(d); if(!p.camioes.length){ A.toast('Ainda não há camiões neste dia.'); return }
  try{ await A.loadX() }catch(e){ A.toast('Não foi possível carregar o leitor de Excel.'); return }
  var aoa=[['Entregas dia '+fdate(d)],['Transporte','Entrega','Cliente','Local de entrega','Hora','Estado da carga','Local da carga','Recebedor SAP','Material SAP']];
  p.camioes.forEach(function(c){ c.entregas.forEach(function(e,i){ aoa.push([i?'':nomeCam(c.nome), (i+1)+'.ª', e.nome, e.morada||'', e.hora||'', i?'':c.estado||'', i?'':c.local||'', e.cod||'', material(c,e,i).mat]) }) });
  var ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[{wch:12},{wch:8},{wch:34},{wch:60},{wch:8},{wch:18},{wch:14},{wch:14},{wch:12}]; ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:8}}];
  var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Mapa diário'); XLSX.writeFile(wb, 'Mapa_Entregas_'+d.replace(/-/g,'')+'.xlsx');
}

/* ---------- importações ---------- */
function importarRec(){
  A.importDialog({title:'Importar recebedores (SAP)', intro:'Listagem dos recebedores de mercadorias do SAP (Excel ou CSV). Junta-se à base: o mesmo código fica com os dados novos.',
    cols:[{k:'cp',l:'Código postal',re:/postal|^cp$|zip/},{k:'code15',l:'Código 15*',re:/15/},{k:'name',l:'Nome',re:/^nome|designa|razao|^name/,req:1},
      {k:'code',l:'Recebedor',re:/recebedor|ship ?to|^cliente$|n\W*\s?cliente|codigo.*(cliente|recebedor)|^cod(igo)?\.?$/,req:1},
      {k:'rua',l:'Rua / morada',re:/^rua|street|logradouro|endereco|morada|address/},{k:'cidade',l:'Localidade',re:/localidade|cidade|city|^local$|poblacion|town/},{k:'pais',l:'País',re:/pais|country/}],
    onRows:async function(rows){
      var m=recBase(), n=0;
      rows.forEach(function(x){ var code=key(x.code); if(!code) return; var o=m[code]||{};
        var r={code:code, name:x.name||o.name||code, rua:x.rua||'', cp:x.cp||'', cidade:x.cidade||'', pais:x.pais||'', code15:dig15(x.code15)||o.code15||''};
        r.morada=[r.rua,r.cp,r.cidade,r.pais].filter(Boolean).join(', '); m[code]=r; n++ });
      var all=Object.keys(m).map(function(k){ return m[k] });
      await A.writeChunks('log_rec', all);
      /* alterações antigas com outra morada deixam de valer (a localização guardada era da morada antiga) */
      var ov=A.list('log_recx'); for(var i=0;i<ov.length;i++){ var b=m[ov[i].code]; if(b && b.morada!==ov[i].morada) await A.del('log_recx',ov[i].id) }
      return n+' recebedores importados. Base: '+all.length+'.';
    }});
}
function importarMat(){
  A.importDialog({title:'Importar códigos de transporte', intro:'Lista de materiais de transporte do SAP (colunas Material e Texto breve). Substitui a lista atual.',
    cols:[{k:'material',l:'Material',re:/^material|codigo/,req:1},{k:'text',l:'Texto breve',re:/texto|descri/,req:1}],
    onRows:async function(rows){ var r=rows.map(function(x){ return {material:key(x.material), text:x.text} }).filter(function(x){ return /^\d+$/.test(x.material) });
      await A.writeChunks('log_mat', r); return r.length+' códigos de transporte importados.' }});
}
/* app original: o .html traz a lista de códigos e o mapa recebedor → 15*; a cópia .json traz recebedores e camiões */
function importarAntiga(){
  A.showModal('<h2>Importar da app antiga</h2><p class="muted" style="margin:-6px 0 0">Escolha o ficheiro <b>mapa_entregas….html</b> (traz os códigos de transporte e os códigos 15* por recebedor) ou a cópia <b>mapa_entregas_hinojosa.json</b> (recebedores e camiões).</p>'+
    '<input type="file" id="iaF" accept=".html,.htm,.json"><div id="iaS" class="small muted"></div><div class="foot"><button class="btn" id="iaX">Fechar</button><button class="btn primary" id="iaOk" disabled>Importar</button></div>',
  function(){
    var dados=null; $('iaX').onclick=A.closeModal;
    $('iaF').onchange=async function(e){ var f=e.target.files[0]; if(!f) return; var t=await f.text(); dados={};
      try{
        if(/^\s*\{/.test(t)){ var j=JSON.parse(t); dados.rec=j.receivers||[]; dados.cams=j.trucks||[]; dados.dia=j.planDate||A.today() }
        else { var m1=/DEFAULT_TRANSPORT_MATERIALS\s*=\s*(\[[\s\S]*?\]);/.exec(t), m2=/RECEIVER_CODE15_MAP\s*=\s*(\{[\s\S]*?\});/.exec(t);
          if(m1) dados.mat=JSON.parse(m1[1]); if(m2) dados.c15=JSON.parse(m2[1]) }
      }catch(err){ dados=null }
      var s=dados&&[dados.mat&&dados.mat.length+' códigos de transporte', dados.c15&&Object.keys(dados.c15).length+' códigos 15* por recebedor', dados.rec&&dados.rec.length+' recebedores', dados.cams&&dados.cams.length+' camiões ('+fdate(dados.dia)+')'].filter(Boolean);
      $('iaS').innerHTML=s&&s.length? 'Encontrado: '+s.join(' · ')+'.' : '<span style="color:var(--bad)">Não reconheci o ficheiro.</span>'; $('iaOk').disabled=!(s&&s.length) };
    $('iaOk').onclick=async function(){ this.disabled=true; $('iaS').textContent='A gravar…'; var feito=[];
      try{
        if(dados.mat){ var mm=dados.mat.map(function(x){ return {material:key(x.material), text:String(x.text||'')} }).filter(function(x){ return /^\d+$/.test(x.material) }); await A.writeChunks('log_mat', mm); feito.push(mm.length+' códigos') }
        if(dados.c15){ var c={}; Object.keys(dados.c15).forEach(function(k){ var v=dig15(dados.c15[k]); if(v) c[key(k)]=v }); await A.put('config','logC15',Object.assign({},A.clean(A.cfg('logC15')||{}),{m:Object.assign({},c15map(),c)})); feito.push(Object.keys(c).length+' códigos 15*') }
        if(dados.rec&&dados.rec.length){ var b=recBase(); dados.rec.forEach(function(r){ var code=key(r.code); if(!code) return; b[code]={code:code, name:r.name||code, rua:r.street||'', cp:r.postalCode||cpDe(r.address), cidade:r.city||'', pais:r.country||'', code15:dig15(r.code15), morada:r.address||''} });
          await A.writeChunks('log_rec', Object.keys(b).map(function(k){ return b[k] })); feito.push(dados.rec.length+' recebedores') }
        if(dados.cams&&dados.cams.length){ if(A.get('log_planos',dados.dia)) feito.push('camiões ignorados: já existe plano para '+fdate(dados.dia));
          else { await mudar(dados.dia,function(p){ p.camioes=dados.cams.map(function(t){ return {id:uid(), nome:t.name||'C01', estado:t.loadStatus||'', local:t.loadLocation||'', entregas:(t.clients||[]).map(function(x){
            return {id:uid(), cod:key(x.receiverCode), nome:x.name||'', morada:x.address||'', rua:x.street||'', cp:x.postalCode||cpDe(x.address), cidade:x.city||'', pais:x.country||'', code15:dig15(x.code15), hora:x.time||'', notas:x.notes||'', lat:x.lat==null?null:+x.lat, lon:x.lon==null?null:+x.lon} }) } }) }); feito.push(dados.cams.length+' camiões') } }
        A.closeModal(); A.toast('Importado: '+feito.join(' · ')+'.');
      }catch(err){ console.error(err); $('iaS').textContent='Não foi possível gravar.'; this.disabled=false }
    };
  });
}
function recForm(code){
  var r=rec(code); if(!r) return;
  A.openForm({title:'Recebedor '+r.code, values:r,
    fields:[{k:'name',l:'Nome',req:1},{k:'code15',l:'Código 15*',ph:'150000…',help:c15map()[r.code]?'Da app antiga: '+c15map()[r.code]:''},{k:'rua',l:'Rua',full:1},{k:'cp',l:'Código postal'},{k:'cidade',l:'Localidade'},{k:'pais',l:'País'}],
    submit:function(v){ var mor=[v.rua,v.cp,v.cidade,v.pais].filter(Boolean).join(', '), n=Object.assign({},r,{name:v.name, code15:dig15(v.code15), rua:v.rua, cp:v.cp, cidade:v.cidade, pais:v.pais, morada:mor||r.morada});
      if(n.morada!==r.morada && !r.manual){ n.lat=null; n.lon=null; n.aprox=false }
      return A.put('log_recx', A.idKey(r.code), n) }});
}

/* ---------- página ---------- */
function avisos(c, e, i){ var o=[];
  if(!e.morada) o.push('<span class="pill bad">Sem recebedor na base · editar</span>');
  else if(e.aprox) o.push('<span class="pill warn">Localização aproximada</span>');
  if(i===c.entregas.length-1 && !c15(e)) o.push('<span class="pill warn">Sem código 15*</span>');
  return o.length? '<div class="lg-pills">'+o.join('')+'</div>' : '' }
function corpoDia(p, ed){
  if(!p.camioes.length) return '<div class="panel empty">Ainda sem camiões para '+fdate(p.data)+'. '+(ed?'Use “Colar plano SAP” ou “+ Camião”.':'')+'</div>';
  var h='';
  p.camioes.forEach(function(c){
    var n=c.entregas.length, rs=Math.max(n,1);
    var camTd='<td rowspan="'+rs+'" class="lg-cam"><b>'+esc(nomeCam(c.nome))+'</b><small>'+n+' entrega'+(n===1?'':'s')+(c.km?' · '+fmt(c.km,0)+' km'+(c.min?' · '+dur(c.min):''):'')+'</small><div class="lg-acts">'+
      (ed? ib('add','Adicionar entrega','data-c="'+c.id+'"')+ib('ord','Ordenar por distância','data-c="'+c.id+'"',n<2)+ib('edt','Editar camião','data-c="'+c.id+'"') : '')+ib('map','Mapa e rota','data-c="'+c.id+'"',!n)+'</div></td>';
    var carTd='<td rowspan="'+rs+'" class="small">'+esc(c.estado||'')+(c.local?'<br><span class="muted">'+esc(c.local)+'</span>':'')+'</td>';
    if(!n){ h+='<tr class="lg-first">'+camTd+'<td colspan="3" class="muted small">Sem entregas.</td>'+carTd+'<td></td></tr>'; return }
    c.entregas.forEach(function(e,i){
      h+='<tr'+(i===0?' class="lg-first"':'')+'>'+(i===0?camTd:'')+'<td class="n mono">'+(i+1)+'.ª</td>'+
        '<td class="lg-ent"><b>'+esc(e.nome)+'</b>'+(e.cod?' <span class="mono small muted">'+esc(e.cod)+'</span>':'')+'<small>'+esc(e.morada||'')+(e.km!=null?' · '+fmt(e.km,1)+' km':'')+'</small>'+(e.notas?'<small>'+esc(e.notas)+'</small>':'')+avisos(c,e,i)+'</td>'+
        '<td><input class="lg-hora" data-hora="'+c.id+'|'+e.id+'" value="'+esc(e.hora||'')+'" placeholder="–" maxlength="8" aria-label="Hora de entrega"'+(ed?'':' disabled')+'></td>'+(i===0?carTd:'')+
        '<td class="lg-mv">'+(ed? ib('up','Subir','data-c="'+c.id+'" data-e="'+e.id+'"',i===0)+ib('dn','Descer','data-c="'+c.id+'" data-e="'+e.id+'"',i===n-1)+ib('edt','Editar entrega','data-c="'+c.id+'" data-e="'+e.id+'"') : '')+'</td></tr>';
    });
  });
  return '<div class="tw"><table class="t lg-t"><thead><tr><th>Transporte</th><th class="n">Entrega</th><th>Cliente / local de entrega</th><th>Hora</th><th>Estado da carga</th><th></th></tr></thead><tbody>'+h+'</tbody></table></div>';
}
A.register('entregas',{
  html:function(){
    var t=A.tab('lg','dia'), ed=podeEd(), d=dia(), p=plano(d), R=recs(), nR=Object.keys(R).length, nM=materiais().length, body='';
    var ents=[]; p.camioes.forEach(function(c){ c.entregas.forEach(function(e,i){ ents.push({c:c,e:e,i:i}) }) });
    var semLoc=ents.filter(function(x){ return x.e.lat==null }).length, sem15=p.camioes.filter(function(c){ var e=c.entregas[c.entregas.length-1]; return e && !c15(e) }).length;
    if(t==='dia'){
      body=(nR?'':'<div class="banner">Ainda sem base de recebedores. Importe a listagem do SAP no separador <b>Recebedores</b> para o “Colar plano SAP” preencher as moradas.</div>')+
        A.kpis([{v:p.camioes.length,l:'Camiões'},{v:ents.length,l:'Entregas'},{v:semLoc,l:'Por localizar',cls:semLoc?'warn':''},{v:sem15,l:'Sem código 15*',cls:sem15?'warn':'',s:'última entrega de cada camião'}])+
        '<div class="filters"><input type="date" data-f="ld" value="'+esc(d)+'" aria-label="Dia">'+(ed?'<button class="btn" id="lgCam">+ Camião</button><button class="btn" id="lgEnt">+ Entrega</button>'+(ents.length>1?'<button class="btn" id="lgOrd">Ordenar todos por distância</button>':''):'')+
        '<span class="small muted" id="lgSt" aria-live="polite"></span></div>'+corpoDia(p,ed);
    } else if(t==='rec'){
      var q=nrm(fv('lrq','')), l=Object.keys(R).map(function(k){ return R[k] }).filter(function(r){ return !q || nrm(r.code+' '+r.name+' '+r.morada).indexOf(q)>=0 }).map(function(r){ return Object.assign({id:r.code},r) }).sort(function(a,b){ return a.name<b.name?-1:1 });
      body='<div class="filters"><input type="search" data-f="lrq" value="'+esc(fv('lrq',''))+'" placeholder="Procurar código, nome, localidade ou morada…">'+(ed?'<button class="btn" id="lgImpR">Importar recebedores (Excel)</button><button class="btn" id="lgImpA">Importar da app antiga</button>':'')+'</div>'+
        A.table(l,[{l:'Código',v:function(r){ return '<span class="mono">'+esc(r.code)+'</span>' }},{l:'Nome',v:function(r){ return esc(r.name) }},{l:'Morada',v:function(r){ return '<span class="small">'+esc(r.morada||'')+'</span>' }},
          {l:'Código 15*',v:function(r){ var k=c15({cod:r.code}); return k? '<span class="mono">'+k+'</span>' : '<span class="pill mute">sem</span>' }},
          {l:'Localização',v:function(r){ return r.lat==null? '<span class="pill mute">por localizar</span>' : r.manual? '<span class="pill ok">corrigida</span>' : r.aprox? '<span class="pill warn">aproximada</span>' : '<span class="pill ok">ok</span>' }}],
          {click:ed, max:200, empty:'Sem recebedores. Importe a listagem do SAP (Excel ou CSV).'});
    } else if(t==='mat'){
      var q2=nrm(fv('lmq','')), ml=materiais().filter(function(m){ return !q2 || nrm(m.material+' '+m.text).indexOf(q2)>=0 });
      body='<p class="small muted" style="margin:0 0 10px">Códigos por posição: PT '+SEQ.PT.join(' · ')+' — ES '+SEQ.ES.join(' · ')+'. Última ou única entrega: código 15* do recebedor ('+Object.keys(c15map()).length+' vindos da app antiga; os restantes editam-se no recebedor).</p>'+
        '<div class="filters"><input type="search" data-f="lmq" value="'+esc(fv('lmq',''))+'" placeholder="Procurar material ou texto…">'+(ed?'<button class="btn" id="lgImpM">Importar códigos (Excel)</button><button class="btn" id="lgImpA">Importar da app antiga</button>':'')+'</div>'+
        A.table(ml,[{l:'Material',v:function(m){ return '<span class="mono">'+esc(m.material)+'</span>' }},{l:'Texto breve',v:function(m){ return esc(m.text) }}],{max:200, empty:'Sem códigos de transporte. Importe a lista do SAP ou o ficheiro da app antiga.'});
    } else {
      var hp=A.list('log_planos').slice().sort(function(a,b){ return a.id<b.id?1:-1 });
      body=A.table(hp,[{l:'Dia',v:function(x){ return fdate(x.data||x.id) }},{l:'Camiões',n:1,v:function(x){ return (x.camioes||[]).length }},{l:'Entregas',n:1,v:function(x){ return (x.camioes||[]).reduce(function(s,c){ return s+(c.entregas||[]).length },0) }},
        {l:'Km',n:1,v:function(x){ var k=(x.camioes||[]).reduce(function(s,c){ return s+(c.km||0) },0); return k? fmt(k,0) : '–' }},{l:'Alterado',v:function(x){ return x.alteradoEm? fdate(x.alteradoEm) : '' }}],{click:1, empty:'Ainda sem planos guardados.'});
    }
    return A.head({c:C, mod:MOD, title:'Mapa de entregas', p:'Planeamento diário dos camiões: colar o plano do SAP, sequência das entregas por distância, mapa com rota, pedido de transporte para o SAP e mapa para enviar por email.',
        acts:'<button class="btn" id="lgMail">Copiar para email</button><button class="btn" id="lgPr">Imprimir</button><button class="btn" id="lgXl">Exportar Excel</button><button class="btn" id="lgSap">Pedido SAP</button>'+(ed?'<button class="btn primary" id="lgCol">Colar plano SAP</button>':'')})+
      A.tabs('lg',[['dia','Plano do dia'],['rec','Recebedores ('+fmt(nR,0)+')'],['mat','Códigos de transporte ('+fmt(nM,0)+')'],['hist','Dias anteriores']],t)+body;
  },
  bind:function(r){
    var on=function(id,fn){ var el=$(id); if(el) el.onclick=fn };
    on('lgCol',colarSap); on('lgSap',pedidoSap); on('lgMail',copiarEmail); on('lgPr',imprimir); on('lgXl',excel);
    on('lgCam',function(){ camForm(null) }); on('lgEnt',function(){ entForm(null,null) }); on('lgOrd',function(){ this.disabled=true; ordenarTodos(dia()) });
    on('lgImpR',importarRec); on('lgImpM',importarMat); on('lgImpA',importarAntiga);
    r.querySelectorAll('[data-la]').forEach(function(b){ b.onclick=function(){ var a=b.dataset.la, c=b.dataset.c, e=b.dataset.e, d=dia();
      if(a==='add') entForm(c,null); else if(a==='map') mapa(c); else if(a==='edt') e? entForm(c,e) : camForm(c);
      else if(a==='ord'){ b.disabled=true; ordenarCam(d,c).then(function(){ aviso(''); A.toast('Sequência ordenada por distância.') }).catch(function(){ aviso('Não foi possível ordenar.') }) }
      else if(a==='up'||a==='dn') mudar(d,function(p){ var x=camDe(p,c); if(!x) return false; var i=x.entregas.findIndex(function(y){ return y.id===e }), j=i+(a==='up'?-1:1);
        if(i<0||j<0||j>=x.entregas.length) return false; var t=x.entregas[i]; x.entregas[i]=x.entregas[j]; x.entregas[j]=t; x.km=null; x.min=null }) } });
    r.querySelectorAll('[data-hora]').forEach(function(inp){ var sv=function(){ var k=inp.dataset.hora.split('|'), v=inp.value.trim().toUpperCase();
        mudar(dia(),function(p){ var x=camDe(p,k[0]), y=x&&x.entregas.filter(function(z){ return z.id===k[1] })[0]; if(!y||y.hora===v) return false; y.hora=v }).catch(function(){ A.toast('Não foi possível guardar a hora.') }) };
      inp.addEventListener('change',sv); inp.addEventListener('keydown',function(e){ if(e.key==='Enter') inp.blur() }) });
    A.bindRows(r,function(id){ if(A.tab('lg','dia')==='hist'){ F.ld=id; S.tabs.lg='dia'; A.render() } else if(A.tab('lg','dia')==='rec') recForm(id) });
    bindFilters(r);
  }
});
window.Entregas={plano:plano, recs:recs, material:material};
})();
