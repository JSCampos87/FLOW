/* Módulo Impressão: reservas de verniz, cauchos, intervenções técnicas, controlo de águas. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, C='var(--c-imp)', MOD='Impressão';
var F={}; /* filtros por vista */
function fv(k,d){ return F[k]==null? d : F[k] }
function bindFilters(root, view){
  root.querySelectorAll('[data-f]').forEach(function(el){
    var h=function(){ F[el.dataset.f]=el.type==='checkbox'? el.checked : el.value; A.render() };
    el.addEventListener(el.tagName==='SELECT'||el.type==='checkbox'?'change':'input', h);
  });
}
function selOpts(arr, cur, all){ return (all?'<option value="">'+all+'</option>':'')+arr.map(function(o){ o=Array.isArray(o)?o:[o,o]; return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(cur)?' selected':'')+'>'+esc(o[1])+'</option>' }).join('') }
function impMaq(){ var m=A.maquinas('Impressão'); return m.length? m : A.maquinas() }
function opNames(){ return A.operadores('Impressão').map(function(o){ return [o.nome,o.nome] }) }
function inRange(d, dias){ if(!dias) return true; return A.days(d)<=+dias }

/* =============== RESERVAS DE VERNIZ =============== */
var VTIPOS=['Aquoso brilho','Aquoso mate','Aquoso barreira','UV brilho','UV mate','Primário','Outro'];
function vernizForm(v){
  var edit=!!v;
  A.openForm({ title: edit?'Editar reserva':'Nova reserva de verniz', values:v||{data:A.today()},
    fields:[
      {k:'referencia',l:'Referência do verniz',req:1,ph:'ex. Actega 1234'},
      {k:'tipo',l:'Tipo',t:'select',o:VTIPOS,req:1},
      {k:'fornecedor',l:'Fornecedor'},
      {k:'kgInicial',l:edit?'Quantidade inicial (kg)':'Quantidade (kg)',t:'number',req:1},
      {k:'of',l:'OF de origem'},
      {k:'cliente',l:'Cliente / trabalho'},
      {k:'localizacao',l:'Localização',ph:'ex. Estante V – B2',req:1},
      {k:'data',l:'Data de armazenamento',t:'date',req:1},
      {k:'validade',l:'Validade',t:'date',help:'Vazio = sem validade definida'},
      {k:'obs',l:'Observações',t:'textarea',rows:2}
    ],
    validate:function(x){ if(!(x.kgInicial>0)) return 'A quantidade tem de ser maior que zero.' },
    del: edit && A.can('stock')? function(){ return A.del('verniz',v.id) } : null,
    submit:function(x){
      if(edit){ var used=(v.movs||[]).reduce(function(s,m){return s+(m.kg||0)},0); x.kg=Math.max(0,+(x.kgInicial-used).toFixed(2)); x.movs=v.movs||[]; x.estado=x.kg>0?'disponivel':'esgotado'; x.criadoEm=v.criadoEm; x.criadoPor=v.criadoPor; return A.put('verniz',v.id,x) }
      x.kg=x.kgInicial; x.estado='disponivel'; x.movs=[]; return A.add('verniz',x);
    }});
}
function vernizUsar(v){
  A.openForm({ title:'Usar reserva · '+v.referencia, intro:'Disponível: <b>'+fmt(v.kg,1)+' kg</b> · '+esc(v.localizacao||''),
    values:{data:A.today()},
    fields:[
      {k:'kg',l:'Quantidade usada (kg)',t:'number',req:1},
      {k:'of',l:'OF onde foi usado',req:1},
      {k:'maquina',l:'Máquina',t:'select',o:function(){ return impMaq().map(function(m){return [m.id,m.nome]}) }},
      {k:'op',l:'Operador',t:'select',o:opNames},
      {k:'data',l:'Data',t:'date',req:1},
      {k:'tudo',l:'Esgotou a reserva (usar tudo)',t:'check'}
    ],
    validate:function(x){ if(!x.tudo && !(x.kg>0)) return 'Indique a quantidade.'; if(!x.tudo && x.kg>v.kg+0.001) return 'Mais do que o disponível ('+fmt(v.kg,1)+' kg).' },
    submit:function(x){
      var kg=x.tudo? v.kg : x.kg, n=A.clean(v);
      n.movs=(v.movs||[]).concat([{d:x.data, kg:kg, of:x.of, maquina:x.maquina||'', op:x.op||'', por:S.uid||''}]);
      n.kg=Math.max(0,+(v.kg-kg).toFixed(2)); n.estado=n.kg>0.001?'disponivel':'esgotado';
      return A.put('verniz',v.id,n);
    }, ok:'Registar uso'});
}
function vernizDetalhe(id){
  var v=A.get('verniz',id); if(!v) return;
  var exp=v.validade? A.days(A.today(), v.validade) : null;
  A.showModal('<h2>'+esc(v.referencia)+'</h2><dl class="detail">'+
    [['Tipo',v.tipo],['Fornecedor',v.fornecedor],['Disponível',fmt(v.kg,1)+' kg de '+fmt(v.kgInicial,1)],['Localização',v.localizacao],['OF de origem',v.of],['Cliente',v.cliente],['Armazenado',fdate(v.data)],['Validade',v.validade? fdate(v.validade)+(exp!=null?' ('+(exp<0?'expirou há '+(-exp):'faltam '+exp)+' dias)':''):'–']].map(function(r){ return '<div><dt>'+r[0]+'</dt><dd>'+esc(r[1]||'–')+'</dd></div>' }).join('')+
    (v.obs?'<div class="full"><dt>Observações</dt><dd>'+esc(v.obs)+'</dd></div>':'')+'</dl>'+
    '<h3 style="font-size:17px">Utilizações</h3>'+A.table((v.movs||[]).slice().reverse(),[{l:'Data',v:function(m){return fdate(m.d)}},{l:'OF',v:function(m){return esc(m.of)}},{l:'Máquina',v:function(m){return esc(m.maquina?A.mName(m.maquina):'–')}},{l:'Operador',v:function(m){return esc(m.op||'–')}},{l:'kg',n:1,v:function(m){return fmt(m.kg,1)}}],{empty:'Ainda não foi usada.'})+
    '<div class="foot"><button class="btn" id="vEd">Editar</button><button class="btn" id="vX">Fechar</button>'+(v.kg>0?'<button class="btn primary" id="vUse">Usar reserva</button>':'')+'</div>',
    function(){ $('vX').onclick=A.closeModal; $('vEd').onclick=function(){ vernizForm(v) }; if($('vUse')) $('vUse').onclick=function(){ vernizUsar(v) } });
}
A.register('verniz',{
  html:function(){
    var all=A.list('verniz'), disp=all.filter(function(v){return v.estado!=='esgotado'}), t=A.tab('verniz','stock');
    var exp30=disp.filter(function(v){ var d=v.validade? A.days(A.today(),v.validade):null; return d!=null&&d>=0&&d<=30 }).length;
    var expd=disp.filter(function(v){ return v.validade && A.days(A.today(),v.validade)<0 }).length;
    var q=(fv('vq','')).toLowerCase(), ft=fv('vt','');
    var rows=(t==='stock'?disp:all.filter(function(v){return v.estado==='esgotado'})).filter(function(v){
      return (!ft||v.tipo===ft) && (!q || [v.referencia,v.of,v.cliente,v.localizacao,v.fornecedor].join(' ').toLowerCase().indexOf(q)>=0) }).sort(A.by('data',-1));
    return A.head({c:C,mod:MOD,title:'Reservas de verniz',p:'Sobras de verniz guardadas para reutilizar: onde estão, quanto resta e onde foram usadas.',acts:'<button class="btn primary" id="vNew">+ Nova reserva</button>'})+
      A.kpis([{v:disp.length,l:'Reservas disponíveis'},{v:fmt(disp.reduce(function(s,v){return s+(v.kg||0)},0),0)+' kg',l:'Verniz em reserva'},{v:exp30,l:'A expirar (30 dias)',cls:exp30?'warn':''},{v:expd,l:'Expiradas',cls:expd?'bad':''}])+
      A.tabs('verniz',[['stock','Em stock'],['hist','Esgotadas']],t)+
      '<div class="filters"><input type="search" data-f="vq" id="vq" placeholder="Procurar referência, OF, cliente, local…" value="'+esc(fv('vq',''))+'"><select data-f="vt">'+selOpts(VTIPOS,ft,'Todos os tipos')+'</select></div>'+
      A.table(rows,[
        {l:'Referência',v:function(v){return '<b>'+esc(v.referencia)+'</b><div class="small muted">'+esc(v.tipo||'')+'</div>'}},
        {l:'Localização',v:function(v){return esc(v.localizacao||'–')}},
        {l:'kg',n:1,v:function(v){return fmt(v.kg,1)}},
        {l:'OF origem',v:function(v){return esc(v.of||'–')}},
        {l:'Armazenado',v:function(v){return fdate(v.data)+' <span class="small muted">('+A.days(v.data)+' d)</span>'}},
        {l:'Validade',v:function(v){ if(!v.validade) return '–'; var d=A.days(A.today(),v.validade); return fdate(v.validade)+' '+(d<0?'<span class="pill bad">expirada</span>':d<=30?'<span class="pill warn">'+d+' d</span>':'') }}
      ],{click:1,empty:t==='stock'?'Sem reservas em stock. Registe a primeira com “Nova reserva”.':'Sem reservas esgotadas.'});
  },
  bind:function(r){ $('vNew').onclick=function(){vernizForm()}; A.bindRows(r,vernizDetalhe); bindFilters(r) }
});

/* =============== CAUCHOS =============== */
var MOTIVOS=['Fim de vida','Corte / dano','Afundamento','Contaminação / inchaço','Troca de trabalho','Outro'];
function posicoes(mid){ var m=A.get('maquinas',mid)||{}, n=+m.corpos||6, p=[]; for(var i=1;i<=n;i++) p.push('Corpo '+i); if(m.verniz!==false) p.push('Torre de verniz'); return p }
function montadoEm(mid,pos){ return A.list('cauchos').filter(function(c){ return c.estado==='montado' && c.maquina===mid && c.posicao===pos })[0] }
function nextCod(){ var y=String(new Date().getFullYear()).slice(2), mx=0; A.list('cauchos').forEach(function(c){ var m=/^C(\d\d)-(\d+)$/.exec(c.codigo||''); if(m&&m[1]===y) mx=Math.max(mx,+m[2]) }); return function(){ mx++; return 'C'+y+'-'+('000'+mx).slice(-4) } }
function vida(c){ var d=c.montagem? A.days(c.montagem.d, c.retirada? c.retirada.d : null) : null; var imp=(c.retirada&&c.montagem&&c.retirada.contador!=null&&c.montagem.contador!=null)? c.retirada.contador-c.montagem.contador : null; return {dias:d, imp:imp} }
function cauchoEntrada(){
  if(!A.can('stock')){ A.toast('Só os utilizadores de Stock dão entrada de cauchos.'); return }
  var refs=Array.from(new Set(A.list('cauchos').map(function(c){return c.referencia}).filter(Boolean)));
  A.openForm({ title:'Entrada de cauchos em stock', values:{entrada:A.today(), qtd:1},
    fields:[
      {k:'referencia',l:'Referência / modelo',req:1,list:'dlRef',ph:'ex. Conti-Air Prime'},
      {k:'fornecedor',l:'Fornecedor'},
      {k:'medida',l:'Medida',ph:'ex. 1060 × 860 × 1,95'},
      {k:'maqDestino',l:'Para a máquina',t:'select',o:function(){ return impMaq().map(function(m){return [m.id,m.nome]}) },ph:'— qualquer —'},
      {k:'lote',l:'Lote'},
      {k:'qtd',l:'Quantidade (unidades)',t:'number',req:1},
      {k:'entrada',l:'Data de entrada',t:'date',req:1},
      {k:'obs',l:'Observações',t:'textarea',rows:2},
      {t:'html',html:'<datalist id="dlRef">'+refs.map(function(r){return '<option value="'+esc(r)+'">'}).join('')+'</datalist>'}
    ],
    validate:function(x){ if(!(x.qtd>=1 && x.qtd<=200 && Math.round(x.qtd)===x.qtd)) return 'Quantidade entre 1 e 200 unidades.' },
    submit:async function(x){
      var nc=nextCod(), n=x.qtd; delete x.qtd;
      for(var i=0;i<n;i++){ var o=Object.assign({},x,{codigo:nc(), estado:'stock', entradaPor:S.uid||''}); await A.add('cauchos',o) }
    }, done:'Entrada registada.'});
}
function cauchoMontar(preMaq, prePos, preCod){
  var stock=A.list('cauchos').filter(function(c){return c.estado==='stock'}).sort(A.by('codigo'));
  if(!stock.length){ A.toast('Não há cauchos em stock.'); return }
  var fields=[
    {k:'cauchoId',l:'Caucho (do stock)',t:'select',req:1,o:function(){ return stock.map(function(c){ return [c.id, c.codigo+' · '+c.referencia+(c.medida?' · '+c.medida:'')] }) }},
    {k:'maquina',l:'Máquina',t:'select',req:1,o:function(){ return impMaq().map(function(m){return [m.id,m.nome]}) }},
    {k:'posicao',l:'Posição',t:'select',req:1,o:[]},
    {k:'op',l:'Operador',t:'select',req:1,o:opNames},
    {k:'d',l:'Data',t:'date',req:1},
    {k:'contador',l:'Contador da máquina',t:'number',help:'Folhas/impressões no momento da montagem (para vida em impressões)'},
    {k:'of',l:'OF em produção',help:'Liga o caucho à ordem de fabrico'},
    {t:'html',html:'<div id="occ"></div>'},
    {k:'motivo',l:'Motivo da retirada do anterior',t:'select',o:MOTIVOS}
  ];
  A.openForm({ title:'Montar caucho na máquina', values:{d:A.today(), maquina:preMaq||'', cauchoId:preCod||''}, fields:fields,
    after:function(box){
      var mq=$('f_maquina'), ps=$('f_posicao');
      var upd=function(){
        var p=mq.value? posicoes(mq.value):[]; var cur=ps.value||prePos||'';
        ps.innerHTML='<option value="">— escolher —</option>'+p.map(function(x){ var o=montadoEm(mq.value,x); return '<option value="'+esc(x)+'"'+(x===cur?' selected':'')+'>'+esc(x)+(o?' — ocupado ('+o.codigo+')':'')+'</option>' }).join('');
        occ();
      };
      var occ=function(){ var o=mq.value&&ps.value? montadoEm(mq.value,ps.value):null; $('occ').innerHTML=o? '<div class="banner" style="margin:0">Nesta posição está o <b>'+esc(o.codigo)+'</b> (há '+A.days(o.montagem.d)+' dias). Vai ser retirado — indique o motivo abaixo.</div>':''; $('f_motivo').closest('.fld').hidden=!o };
      mq.onchange=upd; ps.onchange=occ; upd();
    },
    validate:function(x){ var o=montadoEm(x.maquina,x.posicao); if(o && !x.motivo) return 'Indique o motivo da retirada do caucho '+o.codigo+'.' },
    submit:async function(x){
      var o=montadoEm(x.maquina,x.posicao), c=A.get('cauchos',x.cauchoId);
      if(!c || c.estado!=='stock') throw A.uerr('Este caucho já não está em stock.');
      if(o){ var n=A.clean(o); n.estado='retirado'; n.retirada={d:x.d, op:x.op, contador:x.contador, motivo:x.motivo, por:S.uid||''}; await A.put('cauchos',o.id,n) }
      var m=A.clean(c); m.estado='montado'; m.maquina=x.maquina; m.posicao=x.posicao; m.montagem={d:x.d, op:x.op, contador:x.contador, of:x.of||'', por:S.uid||''};
      await A.put('cauchos',c.id,m);
    }, ok:'Montar', done:'Caucho montado.'});
}
function cauchoRetirar(c){
  A.openForm({ title:'Retirar caucho '+c.codigo, intro:esc(A.mName(c.maquina))+' · '+esc(c.posicao)+' · montado a '+fdate(c.montagem&&c.montagem.d),
    values:{d:A.today()},
    fields:[{k:'motivo',l:'Motivo',t:'select',o:MOTIVOS,req:1},{k:'op',l:'Operador',t:'select',o:opNames,req:1},{k:'d',l:'Data',t:'date',req:1},{k:'contador',l:'Contador da máquina',t:'number'},{k:'obs',l:'Observações',t:'textarea',rows:2}],
    submit:function(x){ var n=A.clean(c); n.estado='retirado'; n.retirada={d:x.d,op:x.op,contador:x.contador,motivo:x.motivo,obs:x.obs,por:S.uid||''}; return A.put('cauchos',c.id,n) },
    ok:'Retirar'});
}
function cauchoDetalhe(id){
  var c=A.get('cauchos',id); if(!c) return; var v=vida(c);
  var st={stock:'<span class="pill info">Em stock</span>',montado:'<span class="pill ok">Montado</span>',retirado:'<span class="pill mute">Retirado</span>'}[c.estado];
  A.showModal('<h2>'+esc(c.codigo)+' '+st+'</h2><dl class="detail">'+
    [['Referência',c.referencia],['Fornecedor',c.fornecedor],['Medida',c.medida],['Lote',c.lote],['Entrada',fdate(c.entrada)+(c.entradaPor?' · '+A.uname(c.entradaPor):'')],['Destino',c.maqDestino?A.mName(c.maqDestino):'–'],
     ['Máquina',c.maquina?A.mName(c.maquina)+' · '+c.posicao:'–'],['Montado',c.montagem?fdate(c.montagem.d)+' · '+(c.montagem.op||''):'–'],['Retirado',c.retirada?fdate(c.retirada.d)+' · '+(c.retirada.op||''):'–'],['Motivo',c.retirada?c.retirada.motivo:'–'],
     ['Vida',v.dias!=null?v.dias+' dias':'–'],['Impressões',v.imp!=null?fmt(v.imp,0):'–']].map(function(r){ return '<div><dt>'+r[0]+'</dt><dd>'+esc(r[1]||'–')+'</dd></div>' }).join('')+
    (c.obs?'<div class="full"><dt>Observações</dt><dd>'+esc(c.obs)+'</dd></div>':'')+'</dl>'+
    '<div class="foot">'+(c.estado==='stock'&&A.can('stock')?'<button class="btn danger" id="cDel">Eliminar</button>':'')+'<button class="btn" id="cX">Fechar</button>'+
    (c.estado==='stock'?'<button class="btn primary" id="cM">Montar</button>':'')+(c.estado==='montado'?'<button class="btn primary" id="cR">Retirar</button>':'')+'</div>',
    function(){ $('cX').onclick=A.closeModal; if($('cM')) $('cM').onclick=function(){cauchoMontar(null,null,c.id)}; if($('cR')) $('cR').onclick=function(){cauchoRetirar(c)};
      if($('cDel')) $('cDel').onclick=async function(){ if(this.dataset.ok!=='1'){this.dataset.ok='1';this.textContent='Confirmar';return} try{await A.del('cauchos',c.id);A.closeModal();A.toast('Eliminado.')}catch(e){A.toast('Não foi possível eliminar.')} } });
}
A.register('cauchos',{
  html:function(){
    var all=A.list('cauchos'), t=A.tab('cauchos','maq');
    var stock=all.filter(function(c){return c.estado==='stock'}), mont=all.filter(function(c){return c.estado==='montado'}), ret=all.filter(function(c){return c.estado==='retirado'});
    var ret90=ret.filter(function(c){ return c.retirada && A.days(c.retirada.d)<=90 });
    var vidas=ret.map(function(c){return vida(c).dias}).filter(function(x){return x!=null});
    A.names(all.map(function(c){return c.entradaPor})).then(function(ch){ if(ch && S.route==='cauchos') A.render() });
    var body='';
    if(t==='maq'){
      body='<div class="mach">'+impMaq().map(function(m){
        return '<div class="panel"><div class="ph"><h2>'+esc(m.nome)+'</h2><button class="btn sm" data-mont="'+esc(m.id)+'">Montar</button></div>'+
          '<table class="t"><tbody>'+posicoes(m.id).map(function(p){ var c=montadoEm(m.id,p); var d=c&&c.montagem? A.days(c.montagem.d):null;
            return '<tr'+(c?' class="click" data-row="'+esc(c.id)+'"':'')+'><td style="width:42%">'+esc(p)+'</td><td>'+(c?'<b class="mono">'+esc(c.codigo)+'</b> <span class="small muted">'+esc(c.referencia||'')+'</span>':'<span class="muted">vazio</span>')+'</td><td class="n">'+(d!=null?d+' d':'')+'</td></tr>' }).join('')+'</tbody></table></div>';
      }).join('')+'</div>'+(impMaq().length?'':'<div class="panel empty">Ainda não há máquinas. Adicione-as em Dados mestre.</div>');
    } else if(t==='stock'){
      var g={}; stock.forEach(function(c){ var k=c.referencia+'|'+(c.medida||''); (g[k]=g[k]||[]).push(c) });
      body=A.table(stock.sort(A.by('codigo')),[
        {l:'Código',v:function(c){return '<b class="mono">'+esc(c.codigo)+'</b>'}},{l:'Referência',v:function(c){return esc(c.referencia)}},{l:'Medida',v:function(c){return esc(c.medida||'–')}},
        {l:'Lote',v:function(c){return esc(c.lote||'–')}},{l:'Destino',v:function(c){return esc(c.maqDestino?A.mName(c.maqDestino):'–')}},{l:'Entrada',v:function(c){return fdate(c.entrada)}},{l:'Por',v:function(c){return esc(c.entradaPor?A.uname(c.entradaPor):'–')}}
      ],{click:1,empty:'Sem cauchos em stock.'})+
      (Object.keys(g).length?'<div class="panel" style="margin-top:14px"><h2 style="margin-bottom:8px">Stock por referência</h2>'+Charts.hbars({rows:Object.keys(g).map(function(k){var p=k.split('|');return {l:p[0]+(p[1]?' · '+p[1]:''),v:g[k].length}}).sort(function(a,b){return b.v-a.v}),unit:'un.'})+'</div>':'');
    } else if(t==='hist'){
      var fm=fv('cm','');
      body='<div class="filters"><select data-f="cm">'+selOpts(impMaq().map(function(m){return [m.id,m.nome]}),fm,'Todas as máquinas')+'</select></div>'+
        A.table(ret.filter(function(c){return !fm||c.maquina===fm}).sort(function(a,b){return (b.retirada.d||'')<(a.retirada.d||'')?-1:1}),[
        {l:'Código',v:function(c){return '<b class="mono">'+esc(c.codigo)+'</b>'}},{l:'Máquina',v:function(c){return esc(A.mName(c.maquina))+'<div class="small muted">'+esc(c.posicao||'')+'</div>'}},
        {l:'Montado',v:function(c){return fdate(c.montagem&&c.montagem.d)}},{l:'Retirado',v:function(c){return fdate(c.retirada.d)}},
        {l:'Vida',n:1,v:function(c){var v=vida(c);return v.dias!=null?v.dias+' d':'–'}},{l:'Impressões',n:1,v:function(c){var v=vida(c);return v.imp!=null?fmt(v.imp,0):'–'}},
        {l:'Motivo',v:function(c){return esc(c.retirada.motivo||'–')}},{l:'Operador',v:function(c){return esc(c.retirada.op||'–')}}
      ],{click:1,empty:'Ainda não há cauchos retirados.'});
    } else {
      /* gráficos de consumo e vida */
      var months=[], now=new Date(); for(var i=11;i>=0;i--){ var d=new Date(now.getFullYear(),now.getMonth()-i,1); months.push(d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)) }
      var mq=impMaq();
      var ser=mq.map(function(m,j){ return {name:m.nome, vals:months.map(function(mo){ return all.filter(function(c){ return c.maquina===m.id && c.montagem && String(c.montagem.d).slice(0,7)===mo }).length })} });
      var vidaMaq=mq.map(function(m){ var v=ret.filter(function(c){return c.maquina===m.id}).map(function(c){return vida(c).dias}).filter(function(x){return x!=null}); return {l:m.nome, v:A.mean(v)||0, s:v.length?'('+v.length+')':''} });
      var mot={}; ret.forEach(function(c){ var k=c.retirada.motivo||'Sem motivo'; mot[k]=(mot[k]||0)+1 });
      body='<div class="grid2"><div class="panel"><h2>Cauchos montados por mês</h2><p class="small muted" style="margin:2px 0 8px">Consumo por máquina, últimos 12 meses</p>'+Charts.bars({cats:months.map(function(m){return m.slice(5)+'/'+m.slice(2,4)}),series:ser,stacked:true,unit:'un.'})+'</div>'+
        '<div class="panel"><h2>Vida média por máquina</h2><p class="small muted" style="margin:2px 0 8px">Dias entre montagem e retirada (n.º de cauchos)</p>'+Charts.hbars({rows:vidaMaq,unit:'dias',dec:0,color:'var(--s1)'})+
        '<h2 style="margin:18px 0 8px">Motivos de retirada</h2>'+Charts.hbars({rows:Object.keys(mot).map(function(k){return {l:k,v:mot[k]}}).sort(function(a,b){return b.v-a.v}),unit:'un.',color:'var(--s2)'})+'</div></div>';
    }
    return A.head({c:C,mod:MOD,title:'Cauchos — stock e vida útil',p:'Entrada em stock pelo Marcelo / Inkmaker; montagem e retirada pelos operadores em cada máquina.',
        acts:(A.can('stock')?'<button class="btn" id="cIn">+ Entrada em stock</button>':'')+'<button class="btn primary" id="cMont">Montar caucho</button>'})+
      A.kpis([{v:stock.length,l:'Em stock'},{v:mont.length,l:'Montados nas máquinas'},{v:ret90.length,l:'Consumidos (90 dias)'},{v:vidas.length?fmt(A.mean(vidas),0)+' d':'–',l:'Vida média',s:vidas.length?vidas.length+' cauchos retirados':''}])+
      A.tabs('cauchos',[['maq','Nas máquinas'],['stock','Stock'],['hist','Histórico'],['graf','Consumo e vida']],t)+body;
  },
  bind:function(r){
    if($('cIn')) $('cIn').onclick=cauchoEntrada; $('cMont').onclick=function(){cauchoMontar()};
    r.querySelectorAll('[data-mont]').forEach(function(b){ b.onclick=function(){ cauchoMontar(b.dataset.mont) } });
    A.bindRows(r,cauchoDetalhe); bindFilters(r); Charts.bind(r);
  }
});

/* =============== INTERVENÇÕES TÉCNICAS (por setor) =============== */
var ITIPOS_DEF={
  'Impressão':['Inspeção geral','Substituição de rolos','Regulação de rolos','Teste de fingerprint','Análise de molhas','Limpeza técnica','Calibração','Lubrificação','Outra'],
  'Corte e Vinco':['Mapeamento do cofre de corte','Limpeza do cofre','Inspeção geral','Calibração','Lubrificação','Outra']
};
var IRES=[['ok','Conforme'],['obs','Com observações'],['nok','Não conforme']];
function itipos(setor){ var c=(A.cfg('tiposInt').setores||{})[setor]; return c&&c.length? c : (ITIPOS_DEF[setor]||ITIPOS_DEF['Impressão']) }
function resPill(r){ return r==='nok'?'<span class="pill bad">Não conforme</span>':r==='obs'?'<span class="pill warn">Com observações</span>':r==='ok'?'<span class="pill ok">Conforme</span>':'–' }
function maqSetor(setor){ return A.maquinas(setor) }
function intForm(v, setor){
  var edit=!!v; setor=(v&&v.setor)||setor;
  A.openForm({ title:edit?'Editar intervenção':'Nova intervenção técnica · '+setor, values:v||{data:A.today(), resultado:'ok'},
    fields:[
      {k:'data',l:'Data',t:'date',req:1},
      {k:'maquina',l:'Máquina',t:'select',req:1,o:function(){ return maqSetor(setor).map(function(m){return [m.id,m.nome]}) }},
      {k:'tipo',l:'Tipo de intervenção',t:'select',req:1,o:itipos(setor)},
      {k:'local',l:setor==='Corte e Vinco'?'Cofre / zona':'Unidade / corpo',ph:setor==='Corte e Vinco'?'ex. cofre, contra-placa':'ex. Corpo 3, molha'},
      {k:'executante',l:'Executado por',t:'select',req:1,o:function(){ return A.operadores().map(function(o){return [o.nome,o.nome]}) },help:'Operador ou supervisor'},
      {k:'duracao',l:'Duração (min)',t:'number'},
      {k:'resultado',l:'Resultado',t:'select',o:IRES,req:1},
      {k:'proxima',l:'Próxima prevista',t:'date'},
      {k:'of',l:'OF / cortante',ph:'se aplicável'},
      {k:'descricao',l:'O que foi feito',t:'textarea',req:1,rows:3},
      {k:'pecas',l:'Peças / consumíveis substituídos',t:'textarea',rows:2},
      {k:'obs',l:'Observações e valores medidos',t:'textarea',rows:2}
    ],
    del: edit && A.can('tecnico')? function(){ return A.del('intervencoes',v.id) } : null,
    submit:function(x){ x.setor=setor; if(edit){ x.criadoEm=v.criadoEm; x.criadoPor=v.criadoPor; return A.put('intervencoes',v.id,x) } return A.add('intervencoes',x) }});
}
function tiposForm(setor){
  if(!S.admin && !A.can('tecnico')){ A.toast('Só o técnico ou um editor altera os tipos.'); return }
  A.openForm({title:'Tipos de intervenção · '+setor, intro:'Um tipo por linha.', values:{t:itipos(setor).join('\n')}, fields:[{k:'t',l:'Tipos',t:'textarea',rows:10,req:1}],
    submit:function(x){ var c=JSON.parse(JSON.stringify(A.cfg('tiposInt').setores||{})); c[setor]=x.t.split(/\r?\n/).map(function(s){return s.trim()}).filter(Boolean); return A.put('config','tiposInt',{setores:c}) }});
}
function intView(setor, key, cor, mod, desc){
  var fk=key+'_';
  return {
  html:function(){
    var mq=maqSetor(setor), ids=mq.map(function(m){return m.id});
    var all=A.list('intervencoes').filter(function(i){ return (i.setor||'Impressão')===setor }).sort(A.by('data',-1)), t=A.tab(key,'reg'), TP=itipos(setor);
    var d30=all.filter(function(i){return A.days(i.data)<=30}).length;
    var lastBy={}; all.forEach(function(i){ var k=i.maquina+'|'+i.tipo; if(!lastBy[k]) lastBy[k]=i });
    var venc=Object.keys(lastBy).map(function(k){return lastBy[k]}).filter(function(i){ return i.proxima && i.proxima<A.today() });
    var nok=all.filter(function(i){return i.resultado==='nok' && A.days(i.data)<=90}).length;
    var body='';
    if(!mq.length) body='<div class="banner">Ainda não há máquinas do setor '+esc(setor)+'. '+(S.admin?'<a href="#dados">Adicione-as em Dados mestre</a>.':'Peça a um editor para as adicionar em Dados mestre.')+'</div>';
    if(t==='reg'){
      var fm=fv(fk+'m',''), ft=fv(fk+'t',''), q=fv(fk+'q','').toLowerCase();
      var rows=all.filter(function(i){ return (!fm||i.maquina===fm)&&(!ft||i.tipo===ft)&&(!q||[i.descricao,i.executante,i.local,i.obs,i.pecas,i.of].join(' ').toLowerCase().indexOf(q)>=0) });
      body+='<div class="filters"><input type="search" id="'+fk+'q" data-f="'+fk+'q" placeholder="Procurar descrição, executante, OF…" value="'+esc(fv(fk+'q',''))+'"><select data-f="'+fk+'m">'+selOpts(mq.map(function(m){return [m.id,m.nome]}),fm,'Todas as máquinas')+'</select><select data-f="'+fk+'t">'+selOpts(TP,ft,'Todos os tipos')+'</select></div>'+
        A.table(rows,[{l:'Data',v:function(i){return fdate(i.data)}},{l:'Máquina',v:function(i){return esc(A.mName(i.maquina))+(i.local?'<div class="small muted">'+esc(i.local)+'</div>':'')}},{l:'Tipo',v:function(i){return esc(i.tipo)}},
          {l:'Descrição',v:function(i){return esc((i.descricao||'').slice(0,90))+((i.descricao||'').length>90?'…':'')}},{l:'Executado por',v:function(i){return esc(i.executante||'–')}},{l:'Resultado',v:function(i){return resPill(i.resultado)}},
          {l:'Próxima',v:function(i){return i.proxima? fdate(i.proxima)+(i.proxima<A.today()&&lastBy[i.maquina+'|'+i.tipo]===i?' <span class="pill bad">vencida</span>':''):'–'}}],{click:1,empty:'Ainda sem intervenções registadas.'});
    } else if(t==='mat'){
      body+='<p class="muted small" style="margin:0 0 10px">Última intervenção de cada tipo, por máquina. A vermelho: a data prevista para a próxima já passou.</p><div class="tw"><table class="t"><thead><tr><th>Tipo</th>'+mq.map(function(m){return '<th>'+esc(m.nome)+'</th>'}).join('')+'</tr></thead><tbody>'+
        TP.map(function(tp){ return '<tr><td><b>'+esc(tp)+'</b></td>'+mq.map(function(m){ var i=lastBy[m.id+'|'+tp]; if(!i) return '<td class="muted">–</td>';
          var late=i.proxima&&i.proxima<A.today(); return '<td data-row="'+esc(i.id)+'" style="cursor:pointer">'+fdate(i.data)+' <span class="small muted">('+A.days(i.data)+' d)</span>'+(i.resultado&&i.resultado!=='ok'?'<br>'+resPill(i.resultado):'')+(i.proxima?'<div class="small" style="color:'+(late?'var(--bad)':'var(--muted)')+'">próx. '+fdate(i.proxima)+'</div>':'')+'</td>' }).join('')+'</tr>' }).join('')+'</tbody></table></div>';
    } else {
      var months=[], now=new Date(); for(var k=11;k>=0;k--){ var d=new Date(now.getFullYear(),now.getMonth()-k,1); months.push(d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)) }
      body+='<div class="grid2"><div class="panel"><h2>Intervenções por mês</h2><p class="small muted" style="margin:2px 0 8px">Por máquina, últimos 12 meses</p>'+Charts.bars({cats:months.map(function(m){return m.slice(5)+'/'+m.slice(2,4)}),series:mq.slice(0,8).map(function(m){return {name:m.nome,vals:months.map(function(mo){return all.filter(function(i){return i.maquina===m.id&&String(i.data).slice(0,7)===mo}).length})}}),stacked:true,unit:'interv.'})+'</div>'+
        '<div class="panel"><h2>Por tipo (12 meses)</h2><div style="margin-top:10px">'+Charts.hbars({rows:TP.map(function(tp){return {l:tp,v:all.filter(function(i){return i.tipo===tp&&A.days(i.data)<=365}).length}}).sort(function(a,b){return b.v-a.v}),color:'var(--s1)'})+'</div></div></div>';
    }
    return A.head({c:cor,mod:mod,title:'Intervenções técnicas',p:desc,acts:'<button class="btn" id="'+fk+'tp">Tipos</button><button class="btn primary" id="'+fk+'new">+ Nova intervenção</button>'})+
      A.kpis([{v:d30,l:'Intervenções (30 dias)'},{v:venc.length,l:'Próximas vencidas',cls:venc.length?'bad':''},{v:nok,l:'Não conformes (90 dias)',cls:nok?'warn':''},{v:all.length,l:'Total registado'}])+
      A.tabs(key,[['reg','Registos'],['mat','Por máquina'],['graf','Gráficos']],t)+body;
  },
  bind:function(r){
    $(fk+'new').onclick=function(){ intForm(null,setor) }; $(fk+'tp').onclick=function(){ tiposForm(setor) };
    A.bindRows(r,function(id){ intForm(A.get('intervencoes',id)) });
    r.querySelectorAll('td[data-row]').forEach(function(td){ td.onclick=function(){ intForm(A.get('intervencoes',td.dataset.row)) } });
    bindFilters(r); Charts.bind(r);
  }};
}
A.register('intervencoes', intView('Impressão','int','var(--c-imp)','Impressão','Inspeções, substituição de rolos, fingerprint, análise de molhas e outras intervenções do operador e do supervisor técnico.'));
A.register('intervencoes-cv', intView('Corte e Vinco','intcv','var(--c-cv)','Corte e Vinco','Mapeamento e limpeza do cofre de corte e outras intervenções técnicas nas máquinas de corte e vinco.'));

/* =============== CONTROLO DE ÁGUAS =============== */
var PAR={ alcool:{l:'Álcool',u:'%',dec:1}, cond:{l:'Condutividade',u:'µS/cm',dec:0}, ph:{l:'pH',u:'',dec:2} };
var DEF_LIM={ osmose:{cond:[0,20], ph:[6,7.5]}, maq:{alcool:[8,12], cond:[800,1500], ph:[4.8,5.5]} };
function pontos(){ return [{id:'osmose',nome:'Osmose',pars:['cond','ph']}].concat(impMaq().map(function(m){ return {id:m.id,nome:m.nome,pars:['alcool','cond','ph']} })) }
function lim(p,par){ var L=(A.cfg('limites').pontos||{})[p]; if(L&&L[par]) return L[par]; var d=p==='osmose'?DEF_LIM.osmose:DEF_LIM.maq; return d[par]||null }
function outL(p,par,v){ var l=lim(p,par); return l && v!=null && ((l[0]!=null&&v<l[0])||(l[1]!=null&&v>l[1])) }
function leituras(){ var r=[]; A.list('aguas').forEach(function(f){ Object.keys(f.leituras||{}).forEach(function(p){ var x=f.leituras[p]; r.push({data:f.data, ponto:p, alcool:x.alcool, cond:x.cond, ph:x.ph, temp:x.temp, obs:x.obs, folha:f.id}) }) }); return r }
function aguaForm(v){
  var ps=pontos(), edit=!!v, fields=[{k:'data',l:'Data da medição',t:'date',req:1},{k:'hora',l:'Hora',t:'time'},{k:'op',l:'Medido por',t:'select',o:function(){return A.operadores().map(function(o){return [o.nome,o.nome]})}}];
  ps.forEach(function(p){ fields.push({t:'sep',l:p.nome}); p.pars.forEach(function(par){ var l=lim(p.id,par); fields.push({k:p.id+'__'+par,l:PAR[par].l+(PAR[par].u?' ('+PAR[par].u+')':''),t:'number',help:l?'Limites '+fmt(l[0],PAR[par].dec)+' – '+fmt(l[1],PAR[par].dec):''}) }) });
  fields.push({k:'obs',l:'Observações',t:'textarea',rows:2});
  var vals={data:A.today()}; if(v){ vals.data=v.data; vals.hora=v.hora; vals.op=v.op; vals.obs=v.obs; Object.keys(v.leituras||{}).forEach(function(p){ Object.keys(PAR).forEach(function(par){ vals[p+'__'+par]=v.leituras[p][par] }) }) }
  A.openForm({ title:edit?'Editar folha de medição':'Nova folha de medição de águas', values:vals, fields:fields,
    after:function(box){ box.querySelectorAll('input[name*="__"]').forEach(function(inp){ var chk=function(){ var p=inp.name.split('__'); var n=A.num(inp.value); inp.style.borderColor=outL(p[0],p[1],n)?'var(--st-crit)':''; inp.style.background=outL(p[0],p[1],n)?'#fff4f2':'' }; inp.addEventListener('input',chk); chk() }) },
    del: edit? function(){ return A.del('aguas',v.id) } : null,
    validate:function(x){ var any=false; Object.keys(x).forEach(function(k){ if(k.indexOf('__')>0 && x[k]!=null) any=true }); if(!any) return 'Registe pelo menos uma leitura.' },
    submit:function(x){
      var o={data:x.data, hora:x.hora||'', op:x.op||'', obs:x.obs||'', leituras:{}};
      Object.keys(x).forEach(function(k){ if(k.indexOf('__')<0||x[k]==null) return; var p=k.split('__'); (o.leituras[p[0]]=o.leituras[p[0]]||{})[p[1]]=x[k] });
      if(edit){ o.criadoEm=v.criadoEm; o.criadoPor=v.criadoPor; return A.put('aguas',v.id,o) } return A.add('aguas',o);
    }});
}
function limForm(){
  if(!S.admin && !A.can('tecnico')){ A.toast('Só o técnico de impressão ou um editor altera limites.'); return }
  var ps=pontos(), fields=[], vals={};
  ps.forEach(function(p){ fields.push({t:'sep',l:p.nome}); p.pars.forEach(function(par){ var l=lim(p.id,par)||[]; fields.push({k:p.id+'__'+par+'__0',l:PAR[par].l+' mín.',t:'number'}); fields.push({k:p.id+'__'+par+'__1',l:PAR[par].l+' máx.',t:'number'}); vals[p.id+'__'+par+'__0']=l[0]; vals[p.id+'__'+par+'__1']=l[1] }) });
  A.openForm({title:'Limites de controlo das águas', intro:'Os valores iniciais são referências típicas de solução de molha — ajuste-os aos valores da vossa especificação.', fields:fields, values:vals,
    submit:function(x){ var o={pontos:{}}; Object.keys(x).forEach(function(k){ var p=k.split('__'); var t=((o.pontos[p[0]]=o.pontos[p[0]]||{})[p[1]]=o.pontos[p[0]][p[1]]||[null,null]); t[+p[2]]=x[k] }); return A.put('config','limites',o) }});
}
A.register('aguas',{
  html:function(){
    var t=A.tab('ag','graf'), L=leituras(), ps=pontos(), per=fv('ap','90');
    var last=A.list('aguas').slice().sort(A.by('data',-1))[0];
    var r30=L.filter(function(r){return A.days(r.data)<=30}), n30=0, o30=0;
    r30.forEach(function(r){ Object.keys(PAR).forEach(function(par){ if(r[par]!=null){ n30++; if(outL(r.ponto,par,r[par])) o30++ } }) });
    var body='';
    if(t==='graf'){
      var sel=fv('apt', ps[1]? ps[1].id : 'osmose'), cmp=sel==='__all';
      var Lp=L.filter(function(r){ return inRange(r.data, per) });
      var pl=cmp? ps.filter(function(p){return p.id!=='osmose'}) : ps.filter(function(p){return p.id===sel});
      var pars=cmp? ['alcool','cond','ph'] : (pl[0]? pl[0].pars : []);
      body='<div class="filters"><select data-f="apt">'+selOpts(ps.map(function(p){return [p.id,p.nome]}).concat([['__all','Comparar máquinas']]),sel)+'</select><select data-f="ap">'+selOpts([['30','Últimos 30 dias'],['90','Últimos 90 dias'],['365','Último ano'],['','Tudo']],per)+'</select></div>'+
        '<div class="grid2">'+pars.map(function(par){
          var series=pl.map(function(p,i){ return {name:p.nome, color:Charts.SER[cmp?i:(ps.indexOf(p)%8)], pts:Lp.filter(function(r){return r.ponto===p.id && r[par]!=null}).map(function(r){ return {x:r.data,y:r[par],out:outL(p.id,par,r[par])} })} });
          var l=!cmp&&pl[0]? lim(pl[0].id,par) : null;
          var vals=[]; series.forEach(function(s){ s.pts.forEach(function(p){vals.push(p.y)}) });
          var m=A.mean(vals), s=A.sd(vals);
          return '<div class="panel"><div class="ph"><h2>'+PAR[par].l+(PAR[par].u?' <span class="muted" style="font-size:15px">'+PAR[par].u+'</span>':'')+'</h2>'+(vals.length?'<span class="small muted">média <b class="mono">'+fmt(m,PAR[par].dec)+'</b> · desvio <b class="mono">'+fmt(s,PAR[par].dec+1)+'</b></span>':'')+'</div>'+
            Charts.line({series:series, band:l?{lo:l[0],hi:l[1]}:null, unit:PAR[par].u, dec:PAR[par].dec, label:PAR[par].l})+'</div>';
        }).join('')+'</div>';
    } else if(t==='est'){
      var Lp2=L.filter(function(r){ return inRange(r.data, per) }), rows=[];
      ps.forEach(function(p){ p.pars.forEach(function(par){ var v=Lp2.filter(function(r){return r.ponto===p.id&&r[par]!=null}).sort(A.by('data')).map(function(r){return r[par]}); if(!v.length) return;
        var m=A.mean(v), s=A.sd(v), dentro=v.filter(function(x){return !outL(p.id,par,x)}).length, l=lim(p.id,par);
        /* tendência: média da 2.ª metade vs 1.ª metade */
        var h=Math.floor(v.length/2), tr=h? A.mean(v.slice(h))-A.mean(v.slice(0,h)) : null;
        rows.push({id:p.id+par, p:p.nome, par:par, n:v.length, m:m, s:s, cv:s!=null&&m? s/Math.abs(m)*100:null, mn:Math.min.apply(null,v), mx:Math.max.apply(null,v), ok:dentro/v.length*100, l:l, ult:v[v.length-1], tr:tr}) }) });
      body='<div class="filters"><select data-f="ap">'+selOpts([['30','Últimos 30 dias'],['90','Últimos 90 dias'],['365','Último ano'],['','Tudo']],per)+'</select><span class="small muted">Estabilidade = desvio padrão e coeficiente de variação (CV) no período; quanto menor, mais estável.</span></div>'+
        A.table(rows,[{l:'Ponto',v:function(r){return '<b>'+esc(r.p)+'</b>'}},{l:'Parâmetro',v:function(r){return PAR[r.par].l}},{l:'N',n:1,v:function(r){return r.n}},
          {l:'Média',n:1,v:function(r){return fmt(r.m,PAR[r.par].dec)}},{l:'Desvio',n:1,v:function(r){return fmt(r.s,PAR[r.par].dec+1)}},{l:'CV %',n:1,v:function(r){return fmt(r.cv,1)}},
          {l:'Mín – Máx',n:1,v:function(r){return fmt(r.mn,PAR[r.par].dec)+' – '+fmt(r.mx,PAR[r.par].dec)}},{l:'Limites',n:1,v:function(r){return r.l? fmt(r.l[0],PAR[r.par].dec)+' – '+fmt(r.l[1],PAR[r.par].dec):'–'}},
          {l:'Dentro',n:1,v:function(r){ return '<span class="pill '+(r.ok>=95?'ok':r.ok>=80?'warn':'bad')+'">'+fmt(r.ok,0)+'%</span>' }},
          {l:'Tendência',n:1,v:function(r){ return r.tr==null?'–':(r.tr>0?'▲ ':r.tr<0?'▼ ':'')+fmt(Math.abs(r.tr),PAR[r.par].dec+1) }},
          {l:'Última',n:1,v:function(r){return '<b>'+fmt(r.ult,PAR[r.par].dec)+'</b>'}}],{empty:'Sem medições no período.'});
    } else {
      var fl=A.list('aguas').slice().sort(function(a,b){ return (b.data+(b.hora||''))<(a.data+(a.hora||''))?-1:1 });
      body=A.table(fl,[{l:'Data',v:function(f){return fdate(f.data)+(f.hora?' <span class="muted small">'+esc(f.hora)+'</span>':'')}}].concat(ps.map(function(p){ return {l:p.nome, v:function(f){ var x=(f.leituras||{})[p.id]; if(!x) return '<span class="muted">–</span>';
          return p.pars.map(function(par){ return x[par]==null?'':'<span style="'+(outL(p.id,par,x[par])?'color:var(--bad);font-weight:600':'')+'" class="mono small">'+(par==='alcool'?'Alc ':par==='cond'?'C ':'pH ')+fmt(x[par],PAR[par].dec)+'</span>' }).filter(Boolean).join('<br>') }} })).concat([{l:'Por',v:function(f){return esc(f.op||'–')}}]),{click:1,empty:'Ainda sem medições. Registe a primeira folha.'});
    }
    return A.head({c:C,mod:MOD,title:'Controlo de águas',p:'Osmose e solução de molha de cada máquina: álcool, condutividade e pH, com evolução e estabilidade.',acts:'<button class="btn" id="aLim">Limites</button><button class="btn primary" id="aNew">+ Nova medição</button>'})+
      A.kpis([{v:last?fdate(last.data):'–',l:'Última medição',s:last?A.days(last.data)+' dias atrás':''},{v:n30,l:'Leituras (30 dias)'},{v:n30?fmt((n30-o30)/n30*100,0)+'%':'–',l:'Dentro dos limites (30 dias)',cls:n30&&o30/n30>0.1?'warn':''},{v:o30,l:'Fora do limite (30 dias)',cls:o30?'bad':''}])+
      A.tabs('ag',[['graf','Evolução'],['est','Estabilidade'],['reg','Registos']],t)+body;
  },
  bind:function(r){ $('aNew').onclick=function(){aguaForm()}; $('aLim').onclick=limForm; A.bindRows(r,function(id){ aguaForm(A.get('aguas',id)) }); bindFilters(r); Charts.bind(r) }
});

window.Impressao={ cauchoMontar:cauchoMontar, cauchoDetalhe:cauchoDetalhe, intForm:intForm, aguaForm:aguaForm, vida:vida, leituras:leituras, outL:outL, pontos:pontos, PAR:PAR, impMaq:impMaq, bindFilters:bindFilters, selOpts:selOpts, fv:fv, F:F };
})();
