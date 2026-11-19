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
async function firebaseAdapter(CFG){
  await loadJs('js/vendor/firebase-app-compat.js'); await loadJs('js/vendor/firebase-auth-compat.js'); await loadJs('js/vendor/firebase-firestore-compat.js');
  firebase.initializeApp(CFG.firebase);
  var cred=await firebase.auth().signInAnonymously(), uid=cred.user.uid;
  var fs=firebase.firestore(); try{ fs.settings({ignoreUndefinedProperties:true, merge:true}) }catch(e){}
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
  var registar=function(nome){ try{ localStorage.setItem('flow_nome',nome) }catch(e){} return col.doc(uid).set({nome:nome, visto:new Date().toISOString()},{merge:true}) };
  if(nomeLocal()) registar(nomeLocal()).catch(function(){});
  var user={
    id:function(){ return Promise.resolve(uid) }, canEdit:function(){ return Promise.resolve(true) }, can:function(){ return Promise.resolve(true) },
    me:function(){ return Promise.resolve({id:uid, name:nomeLocal()}) },
    setName:registar,
    profiles:function(ids){ return Promise.all(ids.map(function(i){ return col.doc(i).get().then(function(s){ return [i, {name:s.exists? (s.data().nome||'') : ''}] }).catch(function(){ return [i,{name:''}] }) }))
      .then(function(l){ var o={}; l.forEach(function(x){ o[x[0]]=x[1] }); return o }) },
    search:function(t){ return col.get().then(function(s){ t=(t||'').toLowerCase(); return s.docs.map(function(d){ return {id:d.id, name:d.data().nome||''} }).filter(function(u){ return !t||u.name.toLowerCase().indexOf(t)>=0 }) }) }
  };
  return {mode:'firebase', db:db, user:user};
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
