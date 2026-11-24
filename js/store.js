/* FLOW — camada de dados.
   Todo o FLOW fala com a base de dados através de UMA interface (estilo Firestore):
     db.collection(nome).onSnapshot(fn, erro)   → fn({docs:[{id, data()}]})
     db.collection(nome).add(obj)               → {id}
     db.doc('colecao/id').set(obj) | .update(campos) | .delete()
     user.id() · user.canEdit() · user.me() · user.profiles([ids]) · user.search(texto)
   Adaptadores: "firebase" (base partilhada, configurada em js/config.js — o normal no GitHub Pages) e ainda:
     • "claude" — quando a página corre como artifact no claude.ai (base de dados e contas do Claude);
     • "local"  — em qualquer outro sítio (GitHub Pages, servidor local): guarda no localStorage deste browser.
   Para ligar um servidor próprio (Supabase, Firebase, API interna, SharePoint…) basta escrever outro
   adaptador com a mesma interface e escolhê-lo em FlowStore.connect(). Ver docs/ARQUITETURA.md. */
(function(){
var KEY='flow_db_v1';

function claudeAdapter(){
  return Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function(r){ return {mode:'claude', db:r[0], user:r[1]} });
}

function localAdapter(){
  var data; try{ data=JSON.parse(localStorage.getItem(KEY)||'{}') }catch(e){ data={} }
  var subs={};
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(data)) }catch(e){ console.warn('FLOW: localStorage cheio ou indisponível') } }
  function snap(c){ var col=data[c]||{}; return {docs:Object.keys(col).map(function(id){ return {id:id, data:function(){ return JSON.parse(JSON.stringify(col[id])) }} })} }
  function emit(c){ (subs[c]||[]).forEach(function(fn){ try{ fn(snap(c)) }catch(e){ console.error(e) } }) }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8) }
  window.addEventListener('storage',function(e){ if(e.key!==KEY) return; try{ data=JSON.parse(e.newValue||'{}') }catch(x){ data={} } Object.keys(subs).forEach(emit) });
  var db={
    collection:function(c){ return {
      onSnapshot:function(fn){ (subs[c]=subs[c]||[]).push(fn); setTimeout(function(){ fn(snap(c)) },0); return function(){ subs[c]=subs[c].filter(function(f){return f!==fn}) } },
      add:function(o){ var id=uid(); (data[c]=data[c]||{})[id]=JSON.parse(JSON.stringify(o)); save(); emit(c); return Promise.resolve({id:id}) }
    }},
    doc:function(path){ var p=path.split('/'), c=p[0], id=p.slice(1).join('/'); return {
      set:function(o){ (data[c]=data[c]||{})[id]=JSON.parse(JSON.stringify(o)); save(); emit(c); return Promise.resolve() },
      update:function(o){ if(!data[c]||!data[c][id]) return Promise.reject(new Error('não existe')); Object.assign(data[c][id],JSON.parse(JSON.stringify(o))); save(); emit(c); return Promise.resolve() },
      delete:function(){ if(data[c]) delete data[c][id]; save(); emit(c); return Promise.resolve() }
    }}
  };
  var nome=function(){ try{ return localStorage.getItem('flow_nome')||'Utilizador local' }catch(e){ return 'Utilizador local' } };
  var user={
    id:function(){ return Promise.resolve('local') }, canEdit:function(){ return Promise.resolve(true) }, can:function(){ return Promise.resolve(true) },
    me:function(){ return Promise.resolve({id:'local', name:nome()}) },
    profiles:function(ids){ var o={}; ids.forEach(function(i){ o[i]={name:i==='local'?nome():''} }); return Promise.resolve(o) },
    search:function(){ return Promise.resolve([{id:'local', name:nome()}]) }
  };
  return Promise.resolve({mode:'local', db:db, user:user,
    exportar:function(){ return JSON.stringify(data,null,1) },
    importar:function(txt){ data=JSON.parse(txt); save(); Object.keys(subs).forEach(emit) }});
}

/* ---------- Firebase (Cloud Firestore): base partilhada por toda a fábrica ---------- */
function loadJs(src){ return new Promise(function(ok,ko){ var s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=function(){ ko(new Error('Falhou '+src)) }; document.head.appendChild(s) }) }
function nomeLocal(){ try{ return localStorage.getItem('flow_nome')||'' }catch(e){ return '' } }
/* ---------- login com a conta Microsoft da empresa (Entra ID) ----------
   Ativa-se em js/config.js com login:"microsoft" depois de a informática configurar o fornecedor
   Microsoft no Firebase (ver docs/SEGURANCA.md). Só entram contas dos domínios em CFG.dominios. */
function dominioOk(u, CFG){ var d=CFG.dominios||[], e=String(u&&u.email||'').toLowerCase(); return !d.length || d.some(function(x){ return e.slice(-(x.length+1))==='@'+String(x).toLowerCase() }) }
function ecraLogin(auth, CFG, erro){
  var o=document.getElementById('flowLogin'); if(o) o.remove();
  o=document.createElement('div'); o.id='flowLogin';
  o.style.cssText='position:fixed;inset:0;z-index:100;background:var(--bg,#f3f5f3);display:grid;place-items:center;padding:20px';
  o.innerHTML='<div style="background:#fff;border:1px solid #dde3df;border-radius:14px;padding:32px;max-width:420px;width:100%;text-align:center;box-shadow:0 6px 18px -8px rgba(20,33,43,.15)">'+
    '<img src="assets/logo.png" alt="Hinojosa" style="height:28px"><h1 style="font:700 34px/1.1 var(--f-display,sans-serif);margin:18px 0 6px">FLOW</h1>'+
    '<p style="color:#5a6771;margin:0 0 20px">Entre com a sua conta Microsoft da empresa.</p>'+
    '<button id="flowLoginBtn" style="font:600 15px var(--f-body,sans-serif);background:#176b3a;color:#fff;border:0;border-radius:10px;padding:12px 22px;cursor:pointer">Entrar com a conta Microsoft</button>'+
    (erro?'<p style="color:#c0392b;font-size:14px;margin:14px 0 0">'+String(erro).replace(/</g,'&lt;')+'</p>':'')+'</div>';
  document.body.appendChild(o);
  document.getElementById('flowLoginBtn').onclick=function(){
    var p=new firebase.auth.OAuthProvider('microsoft.com'); p.setCustomParameters({tenant:(CFG.microsoft&&CFG.microsoft.tenant)||'organizations', prompt:'select_account'});
    auth.signInWithRedirect(p);
  };
}
async function loginMicrosoft(auth, CFG){
  var erro='';
  try{ await auth.getRedirectResult() }catch(e){ erro='Não foi possível entrar ('+(e.code||e.message)+').' }
  var u=await new Promise(function(ok){ var off=auth.onAuthStateChanged(function(x){ off(); ok(x) }) });
  if(u && !u.isAnonymous && dominioOk(u,CFG)) return u;
  if(u && !u.isAnonymous){ erro='A conta '+(u.email||'')+' não pertence à empresa.'; try{ await auth.signOut() }catch(e){} }
  ecraLogin(auth, CFG, erro);
  return new Promise(function(){});   /* fica à espera: o login faz redirect e a página volta a abrir já autenticada */
}
/* ---------- utilizadores de setor (beta) ----------
   Utilizador + palavra-passe definidos em CFG.utilizadores (js/config.js), só com o hash SHA-256 de "UTILIZADOR:palavra-passe".
   Cada utilizador só vê os setores indicados ("*" = tudo). A sessão fica guardada neste dispositivo até carregar em Sair.
   Atenção: é um filtro da interface; a proteção dos dados vem com o login Microsoft (docs/SEGURANCA.md). */
var KCONTA='flow_conta';
async function sha256(t){ var b=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(b)).map(function(x){ return x.toString(16).padStart(2,'0') }).join('') }
function sessao(CFG){ try{ var c=JSON.parse(localStorage.getItem(KCONTA)||'null'), U=CFG.utilizadores||{}; return c && U[c.u] && U[c.u].hash===c.h ? c.u : null }catch(e){ return null } }
function ecraUtilizador(CFG){
  var o=document.getElementById('flowLogin'); if(o) o.remove();
  o=document.createElement('div'); o.id='flowLogin';
  o.style.cssText='position:fixed;inset:0;z-index:100;background:var(--bg,#f3f5f3);display:grid;place-items:center;padding:20px';
  var inp='width:100%;box-sizing:border-box;font:16px var(--f-body,sans-serif);padding:11px 12px;border:1px solid #dde3df;border-radius:10px;margin:0 0 10px';
  o.innerHTML='<form id="flowContaF" style="background:#fff;border:1px solid #dde3df;border-radius:14px;padding:32px;max-width:420px;width:100%;text-align:center;box-shadow:0 6px 18px -8px rgba(20,33,43,.15)">'+
    '<img src="assets/logo.png" alt="Hinojosa" style="height:28px"><h1 style="font:700 34px/1.1 var(--f-display,sans-serif);margin:18px 0 6px">FLOW</h1>'+
    '<p style="color:#5a6771;margin:0 0 18px">Versão beta · entre com o seu utilizador.</p>'+
    '<input id="flowUs" autocomplete="username" autocapitalize="characters" placeholder="Utilizador" required style="'+inp+';text-transform:uppercase">'+
    '<input id="flowPw" type="password" autocomplete="current-password" placeholder="Palavra-passe" required style="'+inp+'">'+
    '<button style="font:600 15px var(--f-body,sans-serif);background:#176b3a;color:#fff;border:0;border-radius:10px;padding:12px 22px;cursor:pointer;width:100%">Entrar</button>'+
    '<p id="flowErr" style="color:#c0392b;font-size:14px;margin:14px 0 0"></p></form>';
  document.body.appendChild(o);
  document.getElementById('flowContaF').onsubmit=async function(e){ e.preventDefault();
    var u=document.getElementById('flowUs').value.trim().toUpperCase(), h=await sha256(u+':'+document.getElementById('flowPw').value), U=CFG.utilizadores||{};
    if(U[u] && U[u].hash===h){ try{ localStorage.setItem(KCONTA, JSON.stringify({u:u,h:h})) }catch(x){} location.replace(location.pathname+'#'+((U[u].setores||[])[0]==='*'?'inicio':(U[u].setores||[])[0]||'inicio')) ; location.reload() }
    else document.getElementById('flowErr').textContent='Utilizador ou palavra-passe errados.';
  };
}
async function firebaseAdapter(CFG){
  await loadJs('js/vendor/firebase-app-compat.js'); await loadJs('js/vendor/firebase-auth-compat.js'); await loadJs('js/vendor/firebase-firestore-compat.js');
  firebase.initializeApp(CFG.firebase);
  var auth=firebase.auth(), MS=CFG.login==='microsoft';
  var fbUser= MS? await loginMicrosoft(auth, CFG) : (await auth.signInAnonymously()).user, uid=fbUser.uid;
  var conta=MS? '' : sessao(CFG), setores=null;
  if(!MS && CFG.utilizadores && !conta){ ecraUtilizador(CFG); return new Promise(function(){}) }
  if(conta){ setores=(CFG.utilizadores[conta].setores||[]).slice(); if(setores.indexOf('*')>=0) setores=null }   /* "*" = acesso a tudo */
  var fs=firebase.firestore(); try{ fs.settings({ignoreUndefinedProperties:true, merge:true}) }catch(e){}
  /* funciona sem rede: guarda localmente e sincroniza quando a ligação voltar (tablets no chão de fábrica) */
  try{ await fs.enablePersistence({synchronizeTabs:true}) }catch(e){ console.warn('FLOW: modo offline indisponível neste browser', e && e.code) }
  var P=CFG.prefixo||'flow_';
  /* o Firestore não aceita listas dentro de listas: guarda-se cada lista interior como {__a:[...]} e desfaz-se ao ler */
  var enc=function(v,inArr){ if(Array.isArray(v)){ var a=v.map(function(x){ return enc(x,true) }); return inArr? {__a:a} : a }
    if(v && typeof v==='object'){ var o={}; Object.keys(v).forEach(function(k){ if(v[k]!==undefined) o[k]=enc(v[k],false) }); return o } return v };
  var dec=function(v){ if(Array.isArray(v)) return v.map(dec);
    if(v && typeof v==='object'){ if(Array.isArray(v.__a) && Object.keys(v).length===1) return v.__a.map(dec); var o={}; Object.keys(v).forEach(function(k){ o[k]=dec(v[k]) }); return o } return v };
  var docs=function(s){ return {docs:s.docs.map(function(d){ return {id:d.id, data:function(){ return dec(d.data()) }} })} };
  var ref=function(path){ var p=path.split('/'); return fs.collection(P+p[0]).doc(p.slice(1).join('_')) };
  var db={
    collection:function(c){ return {
      onSnapshot:function(fn, err){ return fs.collection(P+c).onSnapshot(function(s){ fn(docs(s)) }, function(e){ console.error('FLOW',c,e); if(err) err(e) }) },
      add:function(o){ return fs.collection(P+c).add(enc(o)).then(function(r){ return {id:r.id} }) }
    }},
    doc:function(path){ var r=ref(path); return {
      set:function(o){ return r.set(enc(o)) }, update:function(o){ return r.update(enc(o)) }, delete:function(){ return r.delete() },
      get:function(){ return r.get().then(function(s){ return s.exists? dec(s.data()) : null }) }
    }}
  };
  /* utilizadores: login anónimo por dispositivo + o nome que a pessoa escreve (flow_utilizadores/<uid>) */
  var col=fs.collection(P+'utilizadores');
  var registar=function(nome){ try{ localStorage.setItem('flow_nome',nome) }catch(e){} return col.doc(uid).set({nome:nome, email:fbUser.email||'', visto:new Date().toISOString()},{merge:true}) };
  if(MS){ try{ localStorage.setItem('flow_nome', fbUser.displayName||fbUser.email||'') }catch(e){} registar(fbUser.displayName||fbUser.email||'').catch(function(){}) }
  else if(nomeLocal()) registar(nomeLocal()).catch(function(){});
  var email=String(fbUser.email||'').toLowerCase(), admins=(CFG.admins||[]).map(function(x){return String(x).toLowerCase()});
  var editor=!admins.length || admins.indexOf(email)>=0;
  var user={
    id:function(){ return Promise.resolve(uid) }, canEdit:function(){ return Promise.resolve(editor) }, can:function(){ return Promise.resolve(true) },
    setores:function(){ return Promise.resolve(setores) }, conta:conta||'',
    me:function(){ return Promise.resolve({id:uid, name:MS? (fbUser.displayName||fbUser.email||'') : nomeLocal(), email:fbUser.email||''}) },
    setName: MS? undefined : registar,
    sair: function(){ try{ localStorage.removeItem(KCONTA) }catch(e){} location.replace(location.pathname); location.reload() },
    profiles:function(ids){ return Promise.all(ids.map(function(i){ return col.doc(i).get().then(function(s){ return [i, {name:s.exists? (s.data().nome||'') : ''}] }).catch(function(){ return [i,{name:''}] }) }))
      .then(function(l){ var o={}; l.forEach(function(x){ o[x[0]]=x[1] }); return o }) },
    search:function(t){ return col.get().then(function(s){ t=(t||'').toLowerCase(); return s.docs.map(function(d){ return {id:d.id, name:d.data().nome||''} }).filter(function(u){ return !t||u.name.toLowerCase().indexOf(t)>=0 }) }) }
  };
  return {mode:'firebase', login:MS?'microsoft':'anonimo', db:db, user:user};
}

window.FlowStore={
  connect:function(){
    if(window.claude && window.claude.use) return claudeAdapter().catch(function(){ return {mode:'claude', db:null, user:null} });
    var CFG=window.FLOW_CONFIG||{};
    if(CFG.firebase && CFG.firebase.apiKey) return firebaseAdapter(CFG).catch(function(e){
      console.error('FLOW: sem ligação ao Firebase', e);
      return localAdapter().then(function(r){ r.erro='Sem ligação à base de dados partilhada: os registos ficam só neste browser.'; return r }) });
    return localAdapter();
  }
};
})();
