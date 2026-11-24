/* Offset Print — espelho da app do supervisor de impressão ("Offset Print | Hinojosa"), agora com os dados na base partilhada.
   Mesmos separadores, colunas e ações da app original: Painel, Densidades, MT Garras, Alceamento, Avarias, Películas, Anilox,
   consumíveis (Cauchus, Álcool, Papel calibrado, Diversos, Verniz, Produtos antigos), Rolagem 908E / XL105 / CD102
   (esquema + registo de substituição de rolos) e Observações.
   Coleções: op_folhas {nome, ord, headers} (id = nome da folha; '_meta' guarda os operadores),
             op_linhas {folha, ord, v:{coluna:valor}}, op_rolos {folha, data, unidade, rolo, estado, operador}. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, C='var(--c-imp)';
var Q={q:''};

function podeEditar(){ return S.admin || A.can('tecnico') }
function folhas(){ return A.list('op_folhas').filter(function(f){ return f.id.charAt(0)!=='_' }).sort(function(a,b){ return (a.ord||0)-(b.ord||0) }) }
function linhas(nome){ return A.list('op_linhas').filter(function(l){ return l.folha===nome }).sort(function(a,b){ return (a.ord||0)-(b.ord||0) }) }
function meta(){ return A.get('op_folhas','_meta')||{} }
function operadores(){ var s={}; (meta().operadores||[]).forEach(function(o){ if(o) s[o]=1 }); A.operadores('Impressão').forEach(function(o){ s[o.nome]=1 }); return Object.keys(s).sort(function(a,b){ return a.localeCompare(b,'pt') }) }
function isRolagem(n){ return /^rolagem/i.test(n||'') }
function maqLabel(n){ n=String(n||''); return /908/.test(n)?'R908 E':/xl\s*105/i.test(n)?'XL 105':/cd\s*102|cd\s*2\b/i.test(n)?'CD2':'' }
function imgDe(n){ n=String(n||''); return /cd\s*102/i.test(n)?'img/rolos/cd102.png':/xl\s*105/i.test(n)?'img/rolos/xl105.png':/908/.test(n)?'img/rolos/r908.png':'' }
function corposDe(n){ n=String(n||''); return /cd\s*102/i.test(n)?2:/xl\s*105/i.test(n)?6:8 }
function ehData(h){ return /^data/i.test(String(h||'').trim()) }
/* valores como na app: datas ISO do Excel mostradas em dd/mm/aaaa */
function mostra(v){ if(v==null) return ''; var s=String(v), m=/^(\d{4})-(\d{2})-(\d{2})(T|$)/.exec(s); return m? m[3]+'/'+m[2]+'/'+m[1] : s }
function hash(s){ var h=5381; for(var i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36) }

/* ---------- painel (cartões com mini gráfico, como renderDashboard da app) ---------- */
function painel(fs){
  var lista=fs.filter(function(f,i){ return i>0 });
  if(!lista.length) return '';
  return '<div class="op-dash">'+lista.map(function(f){
    var rows=linhas(f.nome).map(function(l){ return l.v||{} }), hs=f.headers||[], pts=[], nota='', metrica='Registos';
    var df=hs.filter(function(h){ return /data|date/i.test(h) })[0], dated={};
    if(df) rows.forEach(function(r){ var v=r[df]; if(!v) return; var s=String(v), m=/^(\d{4})-(\d{2})/.exec(s), m2=/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(s), k=m? m[1]+'-'+m[2] : m2? m2[3]+'-'+('0'+m2[2]).slice(-2) : ''; if(k) dated[k]=(dated[k]||0)+1 });
    if(Object.keys(dated).length){ pts=Object.keys(dated).sort().slice(-6).map(function(k){ return {l:k.slice(5)+'/'+k.slice(2,4), v:dated[k]} }); nota='Evolução mensal dos registos com data'; metrica='Registos datados' }
    else {
      var qf=hs.filter(function(h){ return /^(qtd|quantidade|consumo|volume|entrada|sa[ií]da)$/i.test(String(h).trim()) })[0];
      if(qf){ var vals=rows.map(function(r){ return Number(String(r[qf]==null?'':r[qf]).replace(',','.')) }).filter(function(n){ return isFinite(n)&&n>0 }); if(vals.length){ pts=vals.slice(0,6).map(function(v,i){ return {l:'Item '+(i+1), v:v} }); nota='Quantidade numérica disponível'; metrica='Quantidade registada' } }
      if(!pts.length){ var gf=hs.filter(function(h){ return /máquina|maquina|estado|tipo|fornecedor/i.test(h) })[0];
        if(gf){ var g={}; rows.forEach(function(r){ var k=String(r[gf]||'Sem indicação').trim()||'Sem indicação'; g[k]=(g[k]||0)+1 }); pts=Object.keys(g).sort(function(a,b){ return g[b]-g[a] }).slice(0,6).map(function(k){ return {l:k.length>13?k.slice(0,12)+'…':k, v:g[k]} }); nota='Distribuição atual por '+gf.toLowerCase() } }
      if(!pts.length){ pts=[{l:'Registos', v:rows.length}]; nota='Base atual; ainda sem histórico de consumo ou datas'; metrica='Registos cadastrados' }
    }
    var mx=Math.max.apply(null,[1].concat(pts.map(function(p){return p.v})));
    return '<button class="op-card" data-opf="'+esc(f.nome)+'"><div class="op-top"><div><h3>'+esc(f.nome)+'</h3><div class="op-cap">'+esc(metrica)+'</div></div><b class="op-n">'+rows.length+'</b></div>'+
      '<div class="op-chart">'+pts.map(function(p,i){ return '<i class="'+(i===pts.length-1?'on':'')+'" style="height:'+Math.max(5,Math.round(p.v/mx*100))+'%" title="'+esc(p.l+': '+p.v)+'"></i>' }).join('')+'</div>'+
      '<div class="op-lab">'+pts.map(function(p){ return '<span>'+esc(p.l)+'</span>' }).join('')+'</div><div class="op-cap">'+esc(nota)+'</div><div class="op-go">Abrir secção →</div></button>';
  }).join('')+'</div>';
}

/* ---------- formulário de registo: um campo por coluna da folha ---------- */
function linhaForm(f, l){
  if(!podeEditar()){ A.toast('Só o técnico de impressão ou um editor alteram estes registos.'); return }
  var hs=f.headers||[], v=(l&&l.v)||{}, vals={};
  var fields=hs.map(function(h,i){ var x=v[h]; vals['c'+i]= ehData(h)&&x? String(x).slice(0,10) : (x==null?'':x); return {k:'c'+i, l:h, t:ehData(h)?'date':(String(x||'').length>60||/observa/i.test(h)?'textarea':'text'), rows:2} });
  A.openForm({title:(l?'Editar registo':'Adicionar registo')+' · '+f.nome, values:vals, fields:fields,
    del: l? function(){ return A.del('op_linhas',l.id) } : null,
    submit:function(x){ var o={}; hs.forEach(function(h,i){ var y=x['c'+i]; if(y!==''&&y!=null) o[h]=y });
      if(!Object.keys(o).length) throw A.uerr('Preencha pelo menos um campo.');
      if(l) return A.put('op_linhas',l.id,Object.assign({},A.clean(l),{v:o}));
      var ord=linhas(f.nome).reduce(function(m,r){ return Math.max(m,r.ord||0) },0)+1; return A.add('op_linhas',{folha:f.nome, ord:ord, v:o}) }});
}

/* ---------- rolagem: esquema + registo de substituição / alteração de rolos ---------- */
var ESTADOS=['Danificado','Enviado ao fornecedor','Em reparação','A aguardar fornecedor','Disponível','Substituído','Outro'];
function rolosOpts(f){ var hs=f.headers||[], hn=hs[0]||'';
  return linhas(f.nome).map(function(l){ var r=l.v||{}, nome=r[hn]; if(!nome) return null; var n=r['Nº']!=null?r['Nº']:r['COD_COR'];
    return [String(nome).trim(), n!=null&&n!==''?'Nº '+n:'', r.COD_SAP?'SAP '+r.COD_SAP:''].filter(Boolean).join(' · ') }).filter(Boolean) }
function rolagem(f){
  var img=imgDe(f.nome), logs=A.list('op_rolos').filter(function(x){ return x.folha===f.nome }).sort(function(a,b){ return (b.criadoEm||'')<(a.criadoEm||'')?-1:1 });
  var hoje=new Date().toLocaleDateString('pt-PT'), n=corposDe(f.nome), opt=function(a,ph){ return '<option value="">'+ph+'</option>'+a.map(function(x){ return '<option>'+esc(x)+'</option>' }).join('') };
  var cis=[]; for(var i=1;i<=n;i++) cis.push(i+'CI');
  return '<div class="op-roller">'+(img?'<div class="panel"><img src="'+img+'" alt="Esquema de rolos '+esc(f.nome)+'"><p class="small muted" style="margin:8px 0 0">Consulte a posição de cada rolo no esquema.</p></div>':'')+
    '<div class="panel"><h2 style="margin-bottom:10px">Registo de substituição / alteração de rolos</h2><div class="form">'+
    '<label class="fld">Data<input id="opD" value="'+esc(hoje)+'"></label>'+
    '<label class="fld">Unidade de impressão<select id="opU">'+opt(cis,'Selecionar corpo')+'</select></label>'+
    '<label class="fld full">Rolo substituído / alterado<select id="opR">'+opt(rolosOpts(f),'Selecionar rolo')+'</select></label>'+
    '<label class="fld">Estado do rolo<select id="opE">'+opt(ESTADOS,'Selecionar estado')+'</select></label>'+
    '<label class="fld">Operador<select id="opO">'+opt(operadores(),'Selecionar operador')+'</select></label></div>'+
    '<div style="margin-top:10px"><button class="btn primary" id="opLog">Registar intervenção</button></div>'+
    '<div class="op-logs">'+(logs.length? logs.map(function(x){ return '<p data-oplog="'+esc(x.id)+'"><b>'+esc(x.data)+'</b> · '+esc(x.unidade)+' · '+esc(x.rolo)+' · <b>'+esc(x.estado||'Estado não indicado')+'</b> · '+esc(x.operador)+(podeEditar()?' <button class="lnk" data-opdel="'+esc(x.id)+'" title="Eliminar">×</button>':'')+'</p>' }).join('') : '<p class="small muted">Ainda não existem intervenções registadas nesta máquina.</p>')+'</div></div></div>';
}

/* ---------- vista ---------- */
A.register('offset-print',{
  html:function(){
    var fs=folhas(), ed=podeEditar();
    var head=A.head({c:C,mod:'Impressão',title:'Offset Print',p:'Gestão técnica, manutenção e acompanhamento das máquinas de impressão.',
      acts:ed?'<button class="btn" id="opImp">Importar</button>':''});
    if(!fs.length) return head+'<div class="panel empty"><p style="margin:0 0 10px">Ainda sem dados do Offset Print.</p>'+(ed?'<p class="small muted" style="margin:0 0 12px">Importe a app do supervisor: o ficheiro <b>Offset_Print_Hinojosa.html</b> ou a cópia <b>.json</b> feita com “Exportar cópia” (traz também os registos de rolos e as alterações feitas nesse computador). Também aceita o Excel com as mesmas folhas.</p><button class="btn primary" id="opImp2">Importar</button>':'<p class="small muted" style="margin:0">Peça ao técnico de impressão para importar a app Offset Print.</p>')+'</div>';
    var cur=A.tab('op', fs[0].nome); if(!fs.some(function(f){ return f.nome===cur })) cur=fs[0].nome;
    var f=fs.filter(function(x){ return x.nome===cur })[0], i0=fs[0].nome===cur;
    var tabs=A.tabs('op', fs.map(function(x){ return [x.nome, x.nome] }), cur);
    if(i0) return head+tabs+'<div class="panel" style="margin-bottom:12px"><h2>Painel de indicadores</h2><p class="small muted" style="margin:4px 0 0">Selecione um cartão ou um separador acima para consultar, pesquisar e gerir os respetivos registos.</p></div>'+painel(fs);
    var hs=f.headers||[], all=linhas(f.nome), q=Q.q.toLowerCase();
    var rows=all.filter(function(l){ return !q || Object.keys(l.v||{}).map(function(k){ return mostra(l.v[k]) }).join(' ').toLowerCase().indexOf(q)>=0 });
    return head+tabs+
      '<div class="panel" style="margin-bottom:12px"><div class="ph"><div><h2>'+esc(f.nome)+'</h2><div class="small muted">'+all.length+' registos nesta secção</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-tab="op:'+esc(fs[0].nome)+'">← Voltar ao painel</button>'+(ed?'<button class="btn primary" id="opAdd">+ Adicionar registo</button>':'')+'</div></div>'+
      '<div class="filters" style="margin:10px 0 0"><input type="search" id="opQ" value="'+esc(Q.q)+'" placeholder="Pesquisar nesta secção por qualquer campo" style="flex:1;min-width:200px"><button class="btn" id="opClr">Limpar</button><span class="small muted">'+rows.length+' registos apresentados</span></div></div>'+
      A.table(rows,hs.map(function(h){ return {l:h, v:function(l){ var x=(l.v||{})[h]; return esc(mostra(x)) }} }),{click:ed, empty:q?'Nenhum registo para “'+esc(Q.q)+'”.':'Sem registos nesta secção.', max:1000})+
      (isRolagem(f.nome)? rolagem(f) : '');
  },
  bind:function(r){
    var fs=folhas(), cur=A.tab('op', fs[0]?fs[0].nome:''), f=fs.filter(function(x){ return x.nome===cur })[0];
    [$('opImp'),$('opImp2')].forEach(function(b){ if(b) b.onclick=importar });
    r.querySelectorAll('[data-opf]').forEach(function(b){ b.onclick=function(){ S.tabs.op=b.dataset.opf; Q.q=''; A.render(); window.scrollTo(0,0) } });
    if(!f) return;
    if($('opAdd')) $('opAdd').onclick=function(){ linhaForm(f) };
    var qi=$('opQ'); if(qi){ qi.oninput=function(){ var p=qi.selectionStart; Q.q=qi.value; A.render(); var n=$('opQ'); if(n){ n.focus(); try{ n.setSelectionRange(p,p) }catch(e){} } } }
    if($('opClr')) $('opClr').onclick=function(){ Q.q=''; A.render() };
    if(podeEditar()) A.bindRows(r,function(id){ var l=A.get('op_linhas',id); if(l) linhaForm(f,l) });
    if($('opLog')) $('opLog').onclick=async function(){
      var x={folha:f.nome, data:$('opD').value.trim(), unidade:$('opU').value, rolo:$('opR').value, estado:$('opE').value, operador:$('opO').value};
      if(!x.data||!x.unidade||!x.rolo||!x.estado||!x.operador){ A.toast('Preencha todos os campos.'); return }
      this.disabled=true; try{ await A.add('op_rolos',x); A.toast('Intervenção registada.') }catch(e){ A.toast('Não foi possível guardar.'); this.disabled=false } };
    r.querySelectorAll('[data-opdel]').forEach(function(b){ b.onclick=async function(){ if(b.dataset.ok!=='1'){ b.dataset.ok='1'; b.textContent='Eliminar?'; return } try{ await A.del('op_rolos',b.dataset.opdel); A.toast('Eliminado.') }catch(e){ A.toast('Não foi possível eliminar.') } } });
  }
});

/* ---------- importação da app (html, cópia .json ou Excel) ---------- */
async function lerApp(file){
  var nome=file.name;
  if(/\.xlsx?$/i.test(nome)){ var o=await window.FichaTec.lerFicheiro(file); return o.offset? {sheets:o.offset.sheets, logs:{}, operators:[]} : null }
  var txt=await file.text();
  if(/\.html?$/i.test(nome)){ var app=window.FichaTec.jsonApos(txt,'const APP='); return app&&app.sheets? {sheets:app.sheets, logs:{}, operators:app.operators||[]} : null }
  var j=JSON.parse(txt); return j&&j.sheets? {sheets:j.sheets, logs:j.logs||{}, operators:j.operators||[]} : null;
}
async function lote(items, fn){ for(var i=0;i<items.length;i+=20) await Promise.all(items.slice(i,i+20).map(fn)) }
function importar(){
  if(!podeEditar()){ A.toast('Só o técnico de impressão ou um editor importam.'); return }
  if(!S.db){ A.toast('Sem ligação à base de dados.'); return }
  A.showModal('<h2>Importar Offset Print</h2><p class="muted" style="margin:0">Escolha o ficheiro da app <b>Offset Print</b> (.html), a cópia <b>.json</b> feita com “Exportar cópia” ou o Excel com as mesmas folhas. As folhas importadas substituem as atuais; os registos de rolos da cópia .json juntam-se aos que já existem.</p>'+
    '<label class="fld">Ficheiro<input type="file" id="oiF" accept=".html,.htm,.json,.xlsx,.xls"></label><div id="oiS" class="small"></div>'+
    '<div class="foot"><button class="btn" id="oiX">Fechar</button><button class="btn primary" id="oiOk" disabled>Importar</button></div>',
  function(){
    var app=null; $('oiX').onclick=A.closeModal;
    $('oiF').onchange=async function(e){ var file=(e.target.files||[])[0]; if(!file) return; $('oiS').textContent='A ler…'; $('oiOk').disabled=true;
      try{ app=await lerApp(file) }catch(err){ console.error(err); app=null }
      if(!app||!app.sheets.length){ $('oiS').innerHTML='<span style="color:var(--bad)">Não reconheço este ficheiro como a app Offset Print.</span>'; return }
      var nl=0; Object.keys(app.logs).forEach(function(k){ nl+=(app.logs[k]||[]).length });
      $('oiS').innerHTML='<div style="margin-top:8px">'+app.sheets.length+' separadores: '+app.sheets.map(function(s){ return esc(s.name)+' ('+(s.rows||[]).length+')' }).join(', ')+'</div>'+(nl?'<div>'+nl+' registos de substituição de rolos.</div>':'')+(app.operators.length?'<div>'+app.operators.length+' operadores.</div>':'');
      $('oiOk').disabled=false };
    $('oiOk').onclick=async function(){ var b=this; b.disabled=true;
      try{
        var nomes=app.sheets.map(function(s){ return String(s.name).trim() });
        $('oiS').innerHTML+='<div>A gravar…</div>';
        await lote(app.sheets.map(function(s,i){ return {s:s,i:i} }),function(x){ var n=String(x.s.name).trim(); return A.put('op_folhas',A.idKey(n),{nome:n, ord:x.i, headers:x.s.headers||[]}) });
        var novas=[]; app.sheets.forEach(function(s){ var n=String(s.name).trim(); (s.rows||[]).forEach(function(r,j){ var v={}; Object.keys(r).forEach(function(k){ var y=r[k]; if(y!==''&&y!=null) v[k]=(y instanceof Date)? y.toISOString().slice(0,10) : y }); if(Object.keys(v).length) novas.push({id:A.idKey(n)+'-'+('000'+j).slice(-4), o:{folha:n, ord:j, v:v}}) }) });
        var ids={}; novas.forEach(function(x){ ids[x.id]=1 });
        await lote(A.list('op_linhas').filter(function(l){ return nomes.indexOf(l.folha)>=0 && !ids[l.id] }),function(l){ return A.del('op_linhas',l.id) });
        await lote(novas,function(x){ return A.put('op_linhas',x.id,x.o) });
        var logs=[]; Object.keys(app.logs).forEach(function(k){ (app.logs[k]||[]).forEach(function(x){ var o={folha:k, data:x.date||'', unidade:x.unit||'', rolo:x.roll||'', estado:x.status||'', operador:x.operator||''}; logs.push({id:'imp-'+hash(JSON.stringify(o)), o:o}) }) });
        await lote(logs.filter(function(x){ return !A.get('op_rolos',x.id) }),function(x){ return A.put('op_rolos',x.id,x.o) });
        if(app.operators.length) await A.put('op_folhas','_meta',Object.assign({},A.clean(meta()),{operadores:app.operators}));
        A.closeModal(); A.toast('Offset Print importado: '+novas.length+' registos.');
      }catch(err){ console.error(err); $('oiS').innerHTML+='<div style="color:var(--bad)">Não foi possível gravar tudo. Tente de novo.</div>'; b.disabled=false }
    };
  });
}

/* rolos de uma máquina (para o registo de intervenções e alertas de stock), a partir das folhas Rolagem */
function rolos(mid){
  var R=window.Reservas, out=[];
  folhas().filter(function(f){ return isRolagem(f.nome) }).forEach(function(f){
    var lab=maqLabel(f.nome), id=lab&&R? R.maqDe(lab) : ''; if(id!==mid) return;
    var hn=(f.headers||[])[0]||'';
    linhas(f.nome).forEach(function(l,i){ var r=l.v||{}; if(!r[hn]) return;
      out.push({id:l.id, nome:String(r[hn]).trim(), n:r['Nº']!=null?String(r['Nº']):'', codCor:r['COD_COR']!=null?String(r['COD_COR']):'', sap:r.COD_SAP!=null?String(r.COD_SAP):'', qtd:r.QTD, de:r['øe'], di:r['øi'], L:r.L, ordem:i}) }) });
  return out;
}
window.Offset={rolos:rolos, importar:importar};
})();
