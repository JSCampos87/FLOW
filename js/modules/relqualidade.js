/* Relatório PDF de indicadores FII / FIQ para um período, com envio automático por email para a mailing list.
   PDF montado no browser (html2canvas + jsPDF, carregados do cdnjs só quando se gera).
   Email pelo mesmo Google Apps Script das requisições (config/email: scriptUrl + token) — o script tem de aceitar anexos
   (scripts/email-apps-script.gs, campo attachments). Mailing list e envio automático em config/relqualidade. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, Q=window.Qualidade, Q2=window.Q2, H=Q2.h;
var LIBS=['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
function load(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=function(){ rej(new Error('Não foi possível carregar '+src)) }; document.head.appendChild(s) }) }
async function loadLibs(){ if(!window.html2canvas) await load(LIBS[0]); if(!(window.jspdf&&window.jspdf.jsPDF)) await load(LIBS[1]) }

/* ---------- configuração: mailing list ---------- */
function rcfg(){ return A.cfg('relqualidade')||{} }
function emails(txt){ return String(txt||'').split(/[\s,;]+/).map(function(s){return s.trim()}).filter(function(s){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) }) }
function gas(){ var g=A.cfg('email')||{}; return g.scriptUrl&&g.token? g : null }
function podeEditar(){ return S.admin || A.can('qualidade') }
function listaForm(depois){
  if(!podeEditar()){ A.toast('Só a Qualidade ou um editor altera a mailing list.'); return }
  var c=rcfg();
  A.openForm({title:'Mailing list do relatório FII / FIQ',
    intro:'Endereços que recebem o PDF. Separe por vírgula, ponto e vírgula ou mudança de linha. Só são aceites os domínios autorizados no Apps Script (graphicsleader.pt, hinojosa.com…).'+(gas()?'':' <b>O envio automático ainda não está configurado</b> (Configuração › Email): sem ele abre-se o programa de correio e o PDF tem de ser anexado à mão.'),
    values:{lista:c.lista||'', cc:c.cc||'', auto:c.auto!==false, assunto:c.assunto||''},
    fields:[{k:'lista',l:'Para',t:'textarea',rows:4,req:1,full:1,ph:'qualidade@graphicsleader.pt, direcao@graphicsleader.pt'},
      {k:'cc',l:'Cc',t:'textarea',rows:2,full:1},
      {k:'assunto',l:'Assunto',ph:'Relatório de qualidade FII / FIQ · {periodo}',help:'{periodo} é trocado pelas datas',full:1},
      {k:'auto',l:'Enviar automaticamente sempre que se gera o PDF',t:'check',full:1}],
    validate:function(x){ var bad=String(x.lista+' '+x.cc).split(/[\s,;]+/).filter(function(s){ return s && !emails(s).length }); if(bad.length) return 'Endereço inválido: '+bad.join(', '); if(!emails(x.lista).length) return 'Indique pelo menos um destinatário.' },
    submit:function(x){ x.lista=emails(x.lista).join(', '); x.cc=emails(x.cc).join(', '); return A.put('config','relqualidade',Object.assign({},A.clean(c),x)).then(function(){ if(depois) setTimeout(depois,60) }) }});
}

/* ---------- datas ---------- */
function p2(n){ return (n<10?'0':'')+n }
function iso(d){ return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()) }
/* semanas de segunda a domingo; número da semana ISO 8601 (a semana 1 tem a primeira quinta-feira do ano) */
function pd(s){ var p=String(s).split('-'); return new Date(+p[0],+p[1]-1,+p[2]) }
function addDias(d,n){ var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); return x }
function segunda(d){ return addDias(d, -((d.getDay()+6)%7)) }
function semNum(d){ var t=addDias(d, 3-((d.getDay()+6)%7)), j=new Date(t.getFullYear(),0,4); return {n:1+Math.round(((t-j)/864e5-3+((j.getDay()+6)%7))/7), ano:t.getFullYear()} }
function semana(seg){ return [iso(seg), iso(addDias(seg,6))] }
/* "Semana 47/2026" quando o período é exatamente uma semana de segunda a domingo */
function semLabel(de, ate){ var a=pd(de); if(a.getDay()!==1 || iso(addDias(a,6))!==ate) return ''; var w=semNum(a); return 'Semana '+w.n+'/'+w.ano }
function presets(){
  var t=new Date(), y=t.getFullYear(), m=t.getMonth(), q=Math.floor(m/3)*3, s0=segunda(t), sa=semana(addDias(s0,-7)), sc=semana(s0);
  return [['sant','Semana anterior',sa[0],sa[1]],['sem','Semana atual',sc[0],sc[1]],['mant','Mês anterior',iso(new Date(y,m-1,1)),iso(new Date(y,m,0))],['mes','Mês atual',iso(new Date(y,m,1)),A.today()],
    ['tri','Trimestre anterior',iso(new Date(y,q-3,1)),iso(new Date(y,q,0))],['ano','Ano até hoje',y+'-01-01',A.today()]];
}
function menos1(d){ return (+d.slice(0,4)-1)+d.slice(4) }
function meses(de, ate){ var r=[], y=+de.slice(0,4), m=+de.slice(5,7); while((y+'-'+p2(m))<=ate.slice(0,7) && r.length<36){ r.push(y+'-'+p2(m)); if(++m>12){ m=1; y++ } } return r }
function periodoTxt(de, ate){ var s=semLabel(de,ate); return (s? s+' (' : '')+fdate(de)+' a '+fdate(ate)+(s? ')' : '') }

/* ---------- conteúdo do relatório (blocos que vão para o PDF um a um) ---------- */
function bloco(html){ return '<div data-pdf style="margin-bottom:14px">'+html+'</div>' }
function linha(a, b){ return bloco('<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+a+(b||'<div></div>')+'</div>') }
function delta(a, b){ if(!b) return b===0&&a? 'sem registos no período homólogo' : ''; var p=(a-b)/b*100; return '<span style="color:'+(p>0?'var(--bad)':'var(--ok)')+'">'+(p>0?'▲ ':'▼ ')+fmt(Math.abs(p),0)+'%</span> vs período homólogo ('+b+')' }
function seccao(tipo, de, ate){
  var d=Q.incDate, all=Q.incList().filter(function(i){ return i.tipo===tipo });
  var cur=all.filter(function(i){ var x=d(i).slice(0,10); return x>=de && x<=ate }), prev=all.filter(function(i){ var x=d(i).slice(0,10); return x>=menos1(de) && x<=menos1(ate) });
  var custo=cur.reduce(function(s,i){return s+(i.custo||0)},0), horas=cur.reduce(function(s,i){return s+(i.tempoReproc||0)},0);
  var ab=cur.filter(function(i){ return i.estado!=='Fechada'&&i.estado!=='Registada' }).length;
  var ms=meses(de,ate), cats=ms.map(function(m){ return H.MES[+m.slice(5,7)-1]+(ms[0].slice(0,4)!==ms[ms.length-1].slice(0,4)?' '+m.slice(2,4):'') });
  var porMes=function(rows, shift, val){ return ms.map(function(m){ var k=shift? (+m.slice(0,4)-1)+m.slice(4) : m; return rows.filter(function(i){ return d(i).slice(0,7)===k }).reduce(function(s,i){ return s+(val?(val(i)||0):1) },0) }) };
  var kp;
  if(tipo==='FII'){ var resp=cur.filter(function(i){return i.autoDetecao}), auto=resp.filter(function(i){return /^s/.test(i.autoDetecao)}).length;
    kp=A.kpis([{v:fmt(cur.length,0),l:'FII no período',s:delta(cur.length,prev.length)},{v:fmt(custo,0)+' €',l:'Custo de rejeição',s:prev.length?'homólogo: '+fmt(prev.reduce(function(s,i){return s+(i.custo||0)},0),0)+' €':''},
      {v:fmt(cur.reduce(function(s,i){return s+(i.qtdRejeitada||0)},0),0),l:'Unidades rejeitadas'},{v:fmt(horas,0)+' h',l:'Horas de reprocessamento'},
      {v:resp.length?fmt(auto/resp.length*100,0)+'%':'–',l:'Detetadas pelo próprio operador',s:resp.length+' com resposta'},{v:ab,l:'Em aberto',cls:ab?'warn':''}]) }
  else { var tr=cur.map(function(i){return i.tempoResposta}).filter(function(x){return x!=null&&x>=0}), rec=cur.filter(function(i){return i.recusada}).length;
    kp=A.kpis([{v:fmt(cur.length,0),l:'FIQ no período',s:delta(cur.length,prev.length)},{v:ab,l:'Em aberto',cls:ab?'warn':''},{v:fmt(custo,0)+' €',l:'Custo efetivo total'},
      {v:tr.length?fmt(A.mean(tr),1)+' d':'–',l:'Tempo médio de resposta'},{v:cur.length?fmt(rec/cur.length*100,0)+'%':'–',l:'Reclamações recusadas'},{v:cur.filter(function(i){return i.impactoAlimentar==='Sim'}).length,l:'Com impacto alimentar'}]) }
  var titulo=tipo==='FII'? 'FII — Incidências internas' : 'FIQ — Reclamações de clientes';
  var out=bloco('<h2 style="font:700 26px var(--f-display);margin:6px 0 10px;padding-bottom:6px;border-bottom:3px solid var(--c-qual)">'+titulo+'</h2>'+kp);
  if(!cur.length) return out+bloco('<div class="panel cht-empty">Sem '+tipo+' no período.</div>');
  var P=H.panel;
  out+=linha(P(tipo+' por mês','Período vs período homólogo do ano anterior',Charts.bars({cats:cats,series:[{name:'Homólogo',color:'var(--s3)',vals:porMes(all,1)},{name:'Período',color:'var(--s1)',vals:porMes(all,0)}],unit:tipo})),
    P('Custo por mês',tipo==='FII'?'Custo da rejeição (€)':'Custo efetivo total (€)',Charts.bars({cats:cats,series:[{name:'Custo',color:'var(--s7)',vals:porMes(all,0,function(i){return i.custo})}],unit:'€',dec:0})));
  out+=linha(P('Pareto de defeitos','Top 12, com % acumulada',Charts.hbars({rows:H.pareto(cur,'defeito',12),color:'var(--s1)'})),
    P('Setor de origem','Onde o erro foi cometido',Charts.hbars({rows:H.cnt(cur,'setorOrigem',12),color:'var(--s3)'})));
  out+=linha(P('Máquinas de origem','Top 12',Charts.hbars({rows:H.cnt(cur.filter(function(i){return i.maqOrigem}),'maqOrigem',12),color:'var(--s4)'})),
    P('Clientes mais afetados','Top 10',Charts.hbars({rows:H.cnt(cur.filter(function(i){return i.cliente}),function(i){return i.cliente.slice(0,34)},10),color:'var(--s2)'})));
  if(tipo==='FII') out+=linha(P('Ocorrências por operador','Top 10 — operador que cometeu o erro',Charts.hbars({rows:H.cnt(cur.filter(function(i){return i.opOrigem}),function(i){return i.opOrigem.split(',')[0].trim()},10),color:'var(--s5)'})),
    P('Custo por defeito','€ — top 10',Charts.hbars({rows:H.cnt(cur,'defeito',10,function(i){return i.custo}),unit:'€',dec:0,color:'var(--s7)'})));
  else {
    out+=linha(P('Causa (6M)','',Charts.hbars({rows:H.cnt(cur,'m6'),color:'var(--s5)'})), P('Custo por defeito','€ — top 10',Charts.hbars({rows:H.cnt(cur,'defeito',10,function(i){return i.custo}),unit:'€',dec:0,color:'var(--s7)'})));
    /* lista das reclamações do período, em blocos de 18 linhas para caber nas páginas */
    var L=cur.slice().sort(function(a,b){ return d(a)<d(b)?-1:1 });
    for(var k=0;k<L.length;k+=18) out+=bloco('<div class="panel">'+(k?'':'<h2 style="margin-bottom:8px">Reclamações do período</h2>')+A.table(L.slice(k,k+18),[
      {l:'N.º',v:function(i){return '<b class="mono">'+esc(i.numero)+'</b>'}},{l:'Data',v:function(i){return fdate(d(i))}},{l:'Cliente',v:function(i){return esc((i.cliente||'–').slice(0,30))}},
      {l:'OF',v:function(i){return '<span class="mono">'+esc(i.of||'–')+'</span>'}},{l:'Defeito',v:function(i){return esc((i.defeito||'–').slice(0,34))}},{l:'Origem',v:function(i){return esc(i.setorOrigem||'–')}},
      {l:'Custo',n:1,v:function(i){return i.custo?fmt(i.custo,0)+' €':'–'}},{l:'Estado',v:function(i){return Q.estPill(i.estado)}}],{max:18})+'</div>');
  }
  return out;
}
function resumo(tipos, de, ate){
  var d=Q.incDate; return tipos.map(function(t){ var c=Q.incList().filter(function(i){ var x=d(i).slice(0,10); return i.tipo===t && x>=de && x<=ate }); return t+': '+c.length+' registos, '+fmt(c.reduce(function(s,i){return s+(i.custo||0)},0),0)+' €' }).join('\n') }
function relatorioHtml(tipos, de, ate){
  var quem=(S.user&&(S.user.displayName||S.user.email))||'';
  return bloco('<div style="display:flex;align-items:center;gap:18px;padding-bottom:12px;border-bottom:1px solid var(--line)"><img src="assets/logo.png" alt="" style="height:44px">'+
      '<div style="flex:1"><div style="font:600 11px var(--f-mono);letter-spacing:.08em;color:var(--c-qual);text-transform:uppercase">Qualidade · FLOW</div><h1 style="font:700 32px var(--f-display);margin:2px 0">Relatório de qualidade · '+esc(tipos.join(' e '))+'</h1>'+
      '<div style="color:var(--muted)">Período <b style="color:var(--fg)">'+periodoTxt(de,ate)+'</b> · comparação com '+periodoTxt(menos1(de),menos1(ate))+'</div></div>'+
      '<div class="small muted" style="text-align:right">Gerado a '+fdate(A.today())+(quem?'<br>por '+esc(quem):'')+'</div></div>')+
    tipos.map(function(t){ return seccao(t,de,ate) }).join('');
}

/* ---------- PDF ---------- */
/* os SVG dos gráficos usam var(--s1)…; o html2canvas desenha-os fora da página, por isso trocam-se pelas cores reais */
function fixVars(root){
  var cs=getComputedStyle(document.documentElement), rep=function(s){ return s.replace(/var\((--[\w-]+)\)/g,function(_,n){ return cs.getPropertyValue(n).trim()||'#888' }) };
  root.querySelectorAll('svg, svg *').forEach(function(el){ ['fill','stroke','stop-color','color','style'].forEach(function(a){ var v=el.getAttribute(a); if(v&&v.indexOf('var(')>=0) el.setAttribute(a,rep(v)) }) });
}
async function gerarPdf(tipos, de, ate, estado){
  await loadLibs();
  var box=document.createElement('div');
  box.style.cssText='position:fixed;left:-12000px;top:0;width:1040px;padding:8px;background:var(--surface);color:var(--fg);font:15px/1.45 var(--f-body)';
  box.innerHTML='<style>[data-pdf] .kpis{grid-template-columns:repeat(6,1fr)}</style>'+relatorioHtml(tipos,de,ate); document.body.appendChild(box); fixVars(box);
  try{
    var jsPDF=window.jspdf.jsPDF, doc=new jsPDF({orientation:'p',unit:'mm',format:'a4',compress:true}), M=10, W=210-2*M, PH=297-M, y=M, pag=1;
    var blocos=box.querySelectorAll('[data-pdf]');
    for(var i=0;i<blocos.length;i++){
      if(estado) estado('A montar o PDF… '+Math.round(i/blocos.length*100)+'%');
      var cv=await window.html2canvas(blocos[i],{scale:2,backgroundColor:getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||null,logging:false,useCORS:true});
      var w=W, h=cv.height*W/cv.width; if(h>PH-M){ h=PH-M; w=cv.width*h/cv.height }
      if(y+h>PH && y>M){ doc.addPage(); pag++; y=M }
      doc.addImage(cv.toDataURL('image/jpeg',0.88),'JPEG',M+(W-w)/2,y,w,h); y+=h+3;
    }
    var n=doc.getNumberOfPages(); for(var p=1;p<=n;p++){ doc.setPage(p); doc.setFontSize(8); doc.setTextColor(120); doc.text('FLOW · Graphicsleader · Relatório de qualidade '+periodoTxt(de,ate)+' · página '+p+' de '+n,105,292,{align:'center'}) }
    return doc;
  } finally { box.remove() }
}
function nomeFich(tipos, de, ate){ return 'Relatorio_'+tipos.join('_')+'_'+de+'_a_'+ate+'.pdf' }
async function enviar(doc, nome, tipos, de, ate){
  var c=rcfg(), to=emails(c.lista), cc=emails(c.cc), g=gas();
  var assunto=(c.assunto||'Relatório de qualidade '+tipos.join(' / ')+' · {periodo}').replace('{periodo}',periodoTxt(de,ate));
  var msg=['Bom dia,','','Em anexo o relatório de indicadores de qualidade ('+tipos.join(' e ')+') do período '+periodoTxt(de,ate)+'.','',resumo(tipos,de,ate),'','Gerado pelo FLOW · Qualidade.'].join('\n');
  if(!g){ location.href='mailto:'+encodeURIComponent(to.join(','))+'?'+(cc.length?'cc='+encodeURIComponent(cc.join(','))+'&':'')+'subject='+encodeURIComponent(assunto)+'&body='+encodeURIComponent(msg+'\n\n(anexar o ficheiro '+nome+')'); return {ok:false, err:'Apps Script não configurado: abriu o programa de correio — anexe o PDF descarregado.'} }
  var b64=doc.output('datauristring').split(',')[1], j;
  try{ j=await A.mail.send(to,cc,assunto,msg,[{name:nome,mime:'application/pdf',b64:b64}]) }catch(e){ return {ok:false, err:String(e.message||e)} }
  if(!j.anexos) return {ok:false, err:'o email seguiu mas SEM o PDF: o Apps Script ainda não aceita anexos (atualizar com scripts/email-apps-script.gs).'};
  return {ok:true, to:to};
}

/* ---------- diálogo ---------- */
Q2.pdfDialog=function(){
  if(!S.hist.ok){ A.toast('O histórico ainda está a carregar.'); return }
  var c=rcfg(), to=emails(c.lista), pr=presets();
  A.showModal('<h2>Gerar PDF de indicadores FII / FIQ</h2><p class="muted" style="margin:-6px 0 0">Escolha o período. O relatório compara com o mesmo período do ano anterior.</p>'+
    '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><button class="btn sm" id="pdWp" aria-label="Semana anterior">‹</button>'+
      '<span id="pdWl" class="mono" style="min-width:230px;text-align:center;font-weight:600"></span><button class="btn sm" id="pdWn" aria-label="Semana seguinte">›</button>'+
      '<span class="small muted">semana de segunda a domingo</span></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+pr.map(function(p){ return '<button class="btn sm" data-pr="'+p[0]+'">'+esc(p[1])+'</button>' }).join('')+'</div>'+
    '<div class="form"><label class="fld">De<input type="date" id="pdDe" value="'+pr[0][2]+'"></label><label class="fld">Até<input type="date" id="pdAte" value="'+pr[0][3]+'"></label>'+
    '<label class="fld check"><input type="checkbox" id="pdFII" checked>FII — incidências internas</label><label class="fld check"><input type="checkbox" id="pdFIQ" checked>FIQ — reclamações de clientes</label>'+
    '<label class="fld check full"><input type="checkbox" id="pdMail"'+(to.length&&c.auto!==false?' checked':'')+(to.length?'':' disabled')+'>Enviar por email para a mailing list'+(to.length?' ('+to.length+' destinatário'+(to.length>1?'s':'')+')':' — ainda sem destinatários')+'</label>'+
    '<div class="full small muted">'+(to.length?esc(to.join(', ')):'')+(podeEditar()?' <a href="#" id="pdLista">'+(to.length?'Alterar mailing list':'Configurar mailing list')+'</a>':'')+'</div></div>'+
    '<div id="pdS" class="small muted"></div>'+
    '<div class="foot"><button class="btn" id="pdX">Cancelar</button><button class="btn primary" id="pdOk">Gerar PDF</button></div>',
  function(){
    var st=function(h){ $('pdS').innerHTML=h };
    $('pdX').onclick=A.closeModal;
    /* navegador de semanas: ‹ › andam uma semana; escrever uma data em "De" leva o navegador para a semana dessa data */
    var seg=segunda(pd($('pdDe').value));
    var marca=function(){ var de=$('pdDe').value, ate=$('pdAte').value, w=semNum(seg), s=semana(seg);
      $('pdWl').textContent='Semana '+w.n+'/'+w.ano+' · '+fdate(s[0]).slice(0,5)+' – '+fdate(s[1]);
      $('pdWl').style.color=(de===s[0]&&ate===s[1])?'var(--brand)':'var(--muted)';
      document.querySelectorAll('[data-pr]').forEach(function(b){ var p=pr.filter(function(x){return x[0]===b.dataset.pr})[0]; b.classList.toggle('primary', p[2]===de&&p[3]===ate) }) };
    var poe=function(s){ seg=s; var w=semana(s); $('pdDe').value=w[0]; $('pdAte').value=w[1]; marca() };
    $('pdWp').onclick=function(){ poe(addDias(seg,-7)) }; $('pdWn').onclick=function(){ poe(addDias(seg,7)) };
    $('pdDe').onchange=function(){ if(this.value) seg=segunda(pd(this.value)); marca() }; $('pdAte').onchange=marca;
    document.querySelectorAll('[data-pr]').forEach(function(b){ b.onclick=function(){ var p=pr.filter(function(x){return x[0]===b.dataset.pr})[0]; $('pdDe').value=p[2]; $('pdAte').value=p[3]; seg=segunda(pd(p[2])); marca() } });
    marca();
    if($('pdLista')) $('pdLista').onclick=function(e){ e.preventDefault(); listaForm(Q2.pdfDialog) };
    $('pdOk').onclick=async function(){
      var de=$('pdDe').value, ate=$('pdAte').value, tipos=[$('pdFII').checked&&'FII',$('pdFIQ').checked&&'FIQ'].filter(Boolean), mail=$('pdMail').checked, b=this;
      if(!de||!ate||de>ate){ st('<span style="color:var(--bad)">Período inválido.</span>'); return }
      if(!tipos.length){ st('<span style="color:var(--bad)">Escolha FII, FIQ ou ambas.</span>'); return }
      b.disabled=true; st('A carregar o gerador de PDF…');
      try{
        var doc=await gerarPdf(tipos,de,ate,st), nome=nomeFich(tipos,de,ate); doc.save(nome);
        if(!mail){ A.closeModal(); A.toast('PDF gerado: '+nome); return }
        st('PDF descarregado. A enviar por email…');
        var r=await enviar(doc,nome,tipos,de,ate);
        A.put('config','relqualidade',Object.assign({},A.clean(rcfg()),{ultimoEnvio:{em:A.nowIso(), de:de, ate:ate, tipos:tipos, ok:r.ok, para:emails(rcfg().lista).join(', '), erro:r.ok?'':r.err}})).catch(function(){});
        if(r.ok){ A.closeModal(); A.toast('PDF gerado e enviado para '+r.to.length+' destinatário'+(r.to.length>1?'s':'')+'.') }
        else { b.disabled=false; st('<span style="color:var(--warn)">PDF descarregado, mas o email automático não seguiu: '+esc(r.err)+'</span>') }
      }catch(e){ console.error(e); b.disabled=false; st('<span style="color:var(--bad)">Não foi possível gerar o PDF: '+esc(e.message||e)+'</span>') }
    };
  });
};
Q2.listaForm=listaForm; Q2.gerarPdf=gerarPdf;
})();
