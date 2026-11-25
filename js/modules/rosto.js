/* Folhas de rosto para imprimir (A4): FIQ (como as folhas "Folha Rosto_PT / _cliente / _EN" do Excel das reclamações
   de clientes), FII, reclamação a fornecedor e relatório de ensaio do controlo de cartolina.
   Imprime por um iframe escondido com estilos próprios (o @media print do flow.css esconde tudo fora de .print-area).
   Q2.rosto(tipo, registo, versao)  — tipo: 'FIQ' | 'FII' | 'RF' | 'ENSAIO'; versao (FIQ): 'pt' | 'cliente' | 'en'. */
(function(){
var A=App, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, Q2=window.Q2;
var VARS=['--bg','--surface','--surface-2','--line','--fg','--muted','--faint','--brand','--brand-soft','--c-qual','--ok','--ok-soft','--warn','--warn-soft','--bad','--bad-soft','--f-display','--f-body','--f-mono'];
var CSS='@page{size:A4;margin:12mm}*{box-sizing:border-box}html,body{margin:0;background:var(--surface);color:var(--fg);font:10.5pt/1.35 var(--f-body);-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
  '.rs{width:186mm;margin:0 auto}.rs-h{display:flex;align-items:center;gap:14px;padding-bottom:8px;border-bottom:2.5px solid var(--c-qual);margin-bottom:10px}.rs-h img{height:13mm}'+
  '.rs-t{flex:1}.rs-t small{display:block;font:600 7.5pt var(--f-mono);letter-spacing:.08em;color:var(--c-qual);text-transform:uppercase}.rs-t h1{font:700 17pt/1.05 var(--f-display);margin:2px 0 0}'+
  '.rs-n{border:1px solid var(--line);border-radius:6px;min-width:46mm}.rs-n div{display:flex;justify-content:space-between;gap:10px;padding:3px 8px;border-top:1px solid var(--line)}.rs-n div:first-child{border-top:0}'+
  '.rs-n span{font:600 7pt var(--f-mono);letter-spacing:.06em;color:var(--muted);text-transform:uppercase;align-self:center}.rs-n b{font:700 12pt var(--f-mono)}'+
  '.rs-g{display:grid;grid-template-columns:repeat(6,1fr);border:1px solid var(--line);border-radius:6px;overflow:hidden;margin-bottom:8px}'+
  '.rs-c{border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:4px 7px;min-height:12mm}.rs-l{font:600 6.8pt var(--f-mono);letter-spacing:.06em;color:var(--muted);text-transform:uppercase}'+
  '.rs-v{font-weight:600;font-size:10.5pt;margin-top:1px;word-break:break-word}.rs-v.m{font-family:var(--f-mono)}'+
  '.rs-b{border:1px solid var(--line);border-radius:6px;margin-bottom:8px;break-inside:avoid}.rs-bh{background:var(--surface-2);padding:3px 8px;font:700 8pt var(--f-mono);letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid var(--line)}'+
  '.rs-bv{padding:6px 8px;white-space:pre-wrap;word-break:break-word}'+
  '.rs-s{border:1px solid var(--line);border-radius:6px;break-inside:avoid;margin-top:10px}.rs-sg{display:grid;gap:14px;padding:10px 12px 8px}.rs-sg div{text-align:center;font-size:9pt;color:var(--muted)}'+
  '.rs-sg i{display:block;height:15mm;border-bottom:1px solid var(--fg);margin-bottom:4px}.rs-sg em{display:block;font-style:normal;font-family:var(--f-mono);color:var(--fg);margin-bottom:6px}'+
  '.rs-tb{width:100%;border-collapse:collapse;font-size:8pt;table-layout:fixed}.rs-tb th,.rs-tb td{border:1px solid var(--line);padding:4px 3px;text-align:right;font-family:var(--f-mono)}.rs-tb th{background:var(--surface-2);font-size:6.8pt}.rs-tb col.w{width:19mm}.rs-tb col.t{width:17mm}'+
  '.rs-tb td:first-child,.rs-tb th:first-child{text-align:left;font-family:var(--f-body);font-weight:600}.out{color:var(--bad);font-weight:700}'+
  '.rs-p{display:inline-block;padding:2px 10px;border-radius:999px;font-weight:700}.rs-p.ok{background:var(--ok-soft);color:var(--ok)}.rs-p.at{background:var(--warn-soft);color:var(--warn)}.rs-p.nc{background:var(--bad-soft);color:var(--bad)}'+
  '.rs-f{margin-top:8px;font:7pt var(--f-mono);color:var(--faint);display:flex;justify-content:space-between}.rs-note{font-size:8.5pt;color:var(--muted);margin:-2px 0 8px}';

/* texto vindo do Excel traz _x000D_ / _x000B_ no lugar das mudanças de linha */
function tx(v){ return v==null? '' : String(v).replace(/_x000[BDA]_/g,'\n').replace(/\n{3,}/g,'\n\n').trim() }
function nb(v,d){ return v==null||v===''? '' : fmt(v,d==null?0:d) }
function cell(l,v,w,mono){ return '<div class="rs-c" style="grid-column:span '+(w||2)+'"><div class="rs-l">'+esc(l)+'</div><div class="rs-v'+(mono?' m':'')+'">'+(v==null||v===''?'&nbsp;':esc(v))+'</div></div>' }
function grid(cells){ return '<div class="rs-g">'+cells.join('')+'</div>' }
function bloco(l,v,mm){ return '<div class="rs-b"><div class="rs-bh">'+esc(l)+'</div><div class="rs-bv" style="min-height:'+(mm||20)+'mm">'+esc(tx(v))+'</div></div>' }
function assin(titulo, papeis, data){ return '<div class="rs-s"><div class="rs-bh">'+esc(titulo)+'</div><div class="rs-sg" style="grid-template-columns:repeat('+papeis.length+',1fr)">'+
  papeis.map(function(p){ return '<div><em>'+(data? esc(fdate(data)) : '____/____/______')+'</em><i></i>'+esc(p)+'</div>' }).join('')+'</div></div>' }
function pagina(o){
  var logo=new URL('assets/logo.png',location.href).href;
  return '<div class="rs"><div class="rs-h"><img src="'+logo+'" alt=""><div class="rs-t"><small>'+esc(o.eyebrow)+'</small><h1>'+esc(o.titulo)+'</h1></div>'+
    '<div class="rs-n">'+o.num.map(function(n){ return '<div><span>'+esc(n[0])+'</span><b>'+esc(n[1]||'–')+'</b></div>' }).join('')+'</div></div>'+o.corpo+
    '<div class="rs-f"><span>Graphicsleader · '+esc(o.rodape||'')+'</span><span>'+esc(o.impresso||'Impresso a')+' '+fdate(A.today())+' · FLOW</span></div></div>';
}

/* ---------- FIQ: igual às folhas de rosto do Excel (PT, cliente, EN) ---------- */
var LFIQ={
  pt:{ey:'Qualidade · Reclamação de cliente',ti:'Folha de rosto — FIQ',num:'FIQ N.º',ano:'Ano',cli:'Cliente',prod:'Produto',of:'Ordem de fabrico',ft:'Ficha técnica',qe:'Qtd. entregue',qd:'Qtd. devolvida',de:'Data de entrega',st:'Stock',dr:'Data recl./dev.',
    desc:'Descrição do incidente',causa:'Causa da anomalia',reat:'Ações reativas',prev:'Ações preventivas',tc:'Tomei conhecimento',def:'Defeito',defd:'Defeito pormenorizado',orig:'Setor de origem',
    pap:['Supervisor Qualidade','Supervisor Técnico','Operador'],papC:['Supervisor Qualidade'],rod:'Ficha de Incidência de Qualidade'},
  en:{ey:'Quality · Customer complaint',ti:'Cover sheet — FIQ',num:'FIQ No.',ano:'Year',cli:'Client',prod:'Product',of:'Production order',ft:'Technical sheet',qe:'Qty. delivered',qd:'Qty. returned',de:'Delivery date',st:'Stock',dr:'Claim/returned date',
    desc:'Incident description',causa:'Root causes',reat:'Corrective actions',prev:'Preventive actions',tc:'Acknowledge',def:'Defect',defd:'Defect detail',orig:'Origin',
    pap:['Quality Supervisor'],papC:['Quality Supervisor'],rod:'Quality Incident Report',imp:'Printed on'}
};
function fiq(i, v){
  var L=LFIQ[v==='en'?'en':'pt'], cliente=v==='cliente'||v==='en', ano=String(i.numero||'').split('-')[1]||String(i.dataReclamacao||'').slice(0,4);
  var qe=i.qtdEntregue!=null? i.qtdEntregue : i.qtdAfetada;
  return pagina({eyebrow:L.ey, titulo:L.ti, rodape:L.rod, impresso:L.imp, num:[[L.num,i.numero],[L.ano,ano]],
    corpo:grid([cell(L.cli,i.cliente,4),cell(L.dr,fdate(i.dataReclamacao),2,1),cell(L.prod,i.artigo,4),cell(L.of,i.of,1,1),cell(L.ft,i.mm,1,1),
        cell(L.qe,nb(qe),1,1),cell(L.qd,nb(i.qtdDevolvida),1,1),cell(L.st,nb(i.stock),1,1),cell(L.de,i.dataEntrega?fdate(i.dataEntrega):'',1,1),cell(L.def,i.defeito,2)].concat(
        cliente? [] : [cell(L.defd,i.defeitoDet,4),cell(L.orig,[i.setorOrigem,i.maqOrigem].filter(Boolean).join(' · '),2)]))+
      bloco(L.desc,i.descricao,30)+bloco(L.causa,i.causa,26)+bloco(L.reat,i.acoesReativas,20)+bloco(L.prev,i.acao,20)+
      assin(L.tc, cliente? L.papC : L.pap, cliente? A.today() : null)});
}
/* ---------- FII ---------- */
function fii(i){
  return pagina({eyebrow:'Qualidade · Incidência interna', titulo:'Folha de rosto — FII', rodape:'Ficha de Incidência Interna', num:[['FII N.º',i.numero],['Data',fdate(i.dataIncidencia)]],
    corpo:grid([cell('Cliente',i.cliente,3),cell('Ordem de fabrico',i.of,1,1),cell('Ficha técnica (MM)',i.mm,2,1),cell('Artigo',i.artigo,3),cell('Cortante',i.cortante,3),
        cell('Motivo / defeito',i.defeito,3),cell('Defeito pormenorizado',i.defeitoDet,3),
        cell('Detetado em',[i.setorDetetado,i.maqDetetou].filter(Boolean).join(' · '),2),cell('Detetado por',i.opDetetou,2),cell('Turno',i.turno,1),cell('Pelo próprio operador',i.autoDetecao==='sim'?'Sim':i.autoDetecao==='não'?'Não':'',1),
        cell('Setor de origem',i.setorOrigem,2),cell('Máquina de origem',i.maqOrigem,1),cell('Operador(es)',i.opOrigem,3),
        cell('Qtd afetada',nb(i.qtdAfetada)+(i.qtdAfetada!=null?' '+(i.unidade||''):''),1,1),cell('Qtd rejeitada',nb(i.qtdRejeitada)+(i.qtdRejeitada!=null?' '+(i.unidade||''):''),1,1),
        cell('Reprocessamento',i.tempoReproc!=null?fmt(i.tempoReproc,1)+' h':'',1,1),cell('Custo',i.custo!=null?fmt(i.custo,2)+' €':'',1,1),cell('Estado',i.estado,2)])+
      bloco('Descrição',i.descricao||i.observacoes,24)+bloco('Causa',i.causa,20)+bloco('Ação corretiva / melhoria',i.acao,20)+
      grid([cell('Responsável pela ação',i.responsavel,2),cell('Prazo',i.prazo?fdate(i.prazo):'',2,1),cell('Eficácia',i.eficacia,2)])+
      assin('Tomei conhecimento',['Supervisor Qualidade','Supervisor Técnico','Operador'])});
}
/* ---------- reclamação a fornecedor ---------- */
function rf(r){
  var q=function(v){ return v!=null&&v!==''? fmt(v,0)+' '+(r.unidade||'') : '' }, e=function(v){ return v!=null&&v!==''? fmt(v,2)+' €' : '' };
  return pagina({eyebrow:'Qualidade · Reclamação a fornecedor', titulo:'Folha de rosto — Reclamação a fornecedor', rodape:'Reclamação a fornecedor', num:[['N.º',r.numero],['Data',fdate(r.data)]],
    corpo:grid([cell('Fornecedor',r.fornecedor,3),cell('Código',r.codFornecedor,1,1),cell('Tipo',r.tipoForn,2),cell('Produto',r.produto,3),cell('MM',r.mm,1,1),cell('Lote',r.lote,1,1),cell('SSCC',r.sscc,1,1),
        cell('Não conformidade',r.naoConformidade,4),cell('OF / pedido',r.ofPed,2,1),cell('Tipo de defeito',r.tipoDefeito,3),cell('Local de deteção',r.localDetecao,3),
        cell('Kg',nb(r.kg),1,1),cell('Qtd afetada',q(r.qtdAfetada),1,1),cell('Qtd devolvida',q(r.qtdDevolucao),1,1),cell('Guia de devolução',r.guiaDevolucao,1,1),cell('Qtd rejeitada',q(r.qtdRejeitada),2,1),
        cell('Custo devolução',e(r.custoDevolucao),1,1),cell('Custo produção / escolha',e(r.custoProducao),2,1),cell('Custo rejeição',e(r.custoRejeicao),1,1),cell('Total de custos',e(r.custoTotal),2,1)])+
      bloco('Descrição da não conformidade / comunicação',r.obs,55)+
      grid([cell('Respondido a',r.dataResposta?fdate(r.dataResposta):'',1,1),cell('Ações corretivas do fornecedor',r.acoesCorretivas,1),cell('Data do crédito',r.dataCredito?fdate(r.dataCredito):'',1,1),
        cell('Valor creditado',e(r.valorCreditado),1,1),cell('Nota de crédito',r.notaCredito,1,1),cell('Estado',r.estado,1)])+
      assin('Tomei conhecimento',['Supervisor Qualidade','Compras / Aprovisionamento'])});
}
/* ---------- relatório de ensaio: controlo de cartolina (10 leituras de gramagem e de espessura) ---------- */
function ensaio(c){
  var st=function(a,lo,hi){ var v=(a||[]).filter(function(x){return x!=null}); return {m:A.mean(v), s:A.sd? A.sd(v) : null, n:v.length, mn:v.length?Math.min.apply(null,v):null, mx:v.length?Math.max.apply(null,v):null} };
  var linha=function(nome,arr,lo,hi,d,nom){ var s=st(arr); return '<tr><td>'+nome+'</td>'+[0,1,2,3,4,5,6,7,8,9].map(function(k){ var x=(arr||[])[k], o=x!=null&&((lo!=null&&x<lo)||(hi!=null&&x>hi)); return '<td'+(o?' class="out"':'')+'>'+(x==null?'':fmt(x,d))+'</td>' }).join('')+
    '<td><b>'+fmt(s.m,1)+'</b></td><td>'+fmt(s.s,2)+'</td><td>'+(nom!=null?fmt(nom,0):'–')+'</td><td>'+(lo!=null||hi!=null? fmt(lo,d)+'–'+fmt(hi,d) : '–')+'</td></tr>' };
  var res={ok:'Conforme',at:'Leituras fora da tolerância',nc:'Não conforme'}[c.resultado]||'–';
  return pagina({eyebrow:'Qualidade · Controlo de matérias-primas', titulo:'Relatório de ensaio — Cartolina', rodape:'Controlo de cartolina', num:[['Data',fdate(c.data)],['Lote',c.lote||'–']],
    corpo:grid([cell('Fornecedor',c.fornecedor,2),cell('Cartolina',c.nome,3),cell('Classe',c.classe,1),cell('Palete / guia de receção',c.palete,2),cell('Analista',c.analista,2),cell('Resultado','',2).replace('&nbsp;','<span class="rs-p '+(c.resultado||'')+'">'+esc(res)+'</span>')])+
      '<div class="rs-b"><div class="rs-bh">Medições — 10 leituras</div><div style="padding:6px"><table class="rs-tb"><colgroup><col class="w"><col span="10"><col><col><col><col class="t"></colgroup><thead><tr><th>Ensaio</th>'+[1,2,3,4,5,6,7,8,9,10].map(function(k){return '<th>'+k+'</th>'}).join('')+'<th>Média</th><th>Desvio</th><th>Nominal</th><th>Tolerância</th></tr></thead><tbody>'+
        linha('Gramagem (g/m²)',c.gram,c.gMin,c.gMax,1,c.g)+linha('Espessura (µm)',c.esp,c.eMin,c.eMax,0,c.e)+'</tbody></table>'+
        '<p class="rs-note" style="margin:6px 2px 0">Leituras a vermelho fora da tolerância da biblioteca de cartolinas. Resultado não conforme quando a média sai da tolerância.</p></div></div>'+
      bloco('Observações',c.obs,30)+
      assin('Validação',['Analista','Supervisor Qualidade'])});
}

/* ---------- imprimir ---------- */
function documento(titulo, corpo){
  var cs=getComputedStyle(document.documentElement), vars=':root{'+VARS.map(function(v){ return v+':'+cs.getPropertyValue(v).trim() }).join(';')+'}';
  var fontes=Array.prototype.filter.call(document.querySelectorAll('link[rel=stylesheet]'),function(l){ return /fonts\.googleapis/.test(l.href) }).map(function(l){ return '<link rel="stylesheet" href="'+esc(l.href)+'">' }).join('');
  return '<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>'+esc(titulo)+'</title>'+fontes+'<style>'+vars+CSS+'</style></head><body>'+corpo+'</body></html>';
}
function imprimir(titulo, corpo){
  var fr=document.createElement('iframe'); fr.setAttribute('aria-hidden','true'); fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(fr);
  var d=fr.contentDocument; d.open(); d.write(documento(titulo,corpo)); d.close();
  /* espera pelas fontes e pelo logótipo antes de abrir a janela de impressão */
  var feito=false, go=function(){ if(feito) return; feito=true; var w=fr.contentWindow, doc=fr.contentDocument, f=doc.fonts;
    var imgs=Array.prototype.map.call(doc.images,function(im){ return im.complete? null : new Promise(function(r){ im.onload=im.onerror=r }) }).filter(Boolean);
    Promise.all([f&&f.ready? f.ready : null].concat(imgs)).then(function(){ w.focus(); w.print(); setTimeout(function(){ fr.remove() },60000) }) };
  fr.onload=go; setTimeout(go,1500);
}
var GER={FIQ:fiq, FII:fii, RF:rf, ENSAIO:ensaio};
function html(tipo, rec, versao){ return GER[tipo](rec, versao) }
Q2.rostoDoc=function(tipo, rec, versao){ return documento(tipo, html(tipo,rec,versao)) };
Q2.rosto=function(tipo, rec, versao){
  if(tipo==='FIQ' && !versao){
    A.showModal('<h2>Imprimir folha de rosto · <span class="mono">'+esc(rec.numero)+'</span></h2><p class="muted" style="margin:-6px 0 0">Escolha a versão.</p>'+
      '<div style="display:grid;gap:8px"><button class="btn" data-v="pt"><b>Interna (PT)</b> — assinaturas Qualidade, Técnico e Operador</button><button class="btn" data-v="cliente"><b>Para o cliente (PT)</b> — sem dados internos, assinada pela Qualidade</button><button class="btn" data-v="en"><b>For the client (EN)</b> — English version</button></div>'+
      '<div class="foot"><button class="btn" id="roX">Cancelar</button></div>',
      function(){ $('roX').onclick=A.closeModal; document.querySelectorAll('[data-v]').forEach(function(b){ b.onclick=function(){ var v=b.dataset.v; A.closeModal(); imprimir('Folha de rosto '+rec.numero, html('FIQ',rec,v)) } }) });
    return;
  }
  imprimir('Folha de rosto '+(rec.numero||rec.nome||''), html(tipo,rec,versao));
};
})();
