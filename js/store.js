/* FLOW — camada de dados.
   Todo o FLOW fala com a base de dados através de UMA interface (estilo Firestore):
     db.collection(nome).onSnapshot(fn, erro)   → fn({docs:[{id, data()}]})
     db.collection(nome).add(obj)               → {id}
     db.doc('colecao/id').set(obj) | .update(campos) | .delete()
     user.id() · user.canEdit() · user.me() · user.profiles([ids]) · user.search(texto)
   Há dois adaptadores:
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

window.FlowStore={
  connect:function(){
    if(window.claude && window.claude.use) return claudeAdapter().catch(function(){ return {mode:'claude', db:null, user:null} });
    return localAdapter();
  }
};
})();
