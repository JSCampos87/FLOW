/* Folhas de rosto para imprimir (A4): FIQ (como as folhas "Folha Rosto_PT / _cliente / _EN" do Excel das reclamações
   de clientes), FII, reclamação a fornecedor e relatório de ensaio do controlo de cartolina.
   Imprime por um iframe escondido com estilos próprios (o @media print do flow.css esconde tudo fora de .print-area).
   Q2.rosto(tipo, registo, versao)  — tipo: 'FIQ' | 'FII' | 'RF' | 'ENSAIO' (cartolina) | 'ENS' (ensaios de laboratório);
   versao (FIQ): 'pt' | 'cliente' | 'en'; (RF, ENS): 'pt' | 'es' | 'en' | 'fr' — sem versão abre a escolha da língua.
   Q2.medChart(o): gráfico SVG das medições com linhas de objetivo / nominal / tolerância (também usado no ecrã). */
(function(){
var A=App, $=A.$, esc=A.esc, fmt=A.fmt, fdate=A.fdate, Q2=window.Q2;
var VARS=['--bg','--surface','--surface-2','--line','--fg','--muted','--faint','--brand','--brand-soft','--c-qual','--ok','--ok-soft','--warn','--warn-soft','--bad','--bad-soft','--info','--s1','--s2','--f-display','--f-body','--f-mono'];
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
  '.rs-f{margin-top:8px;font:7pt var(--f-mono);color:var(--faint);display:flex;justify-content:space-between}.rs-note{font-size:8.5pt;color:var(--muted);margin:-2px 0 8px}'+
  /* análise com gráfico (relatório de medição da cartolina e ensaios) */
  '.rs-an{display:grid;grid-template-columns:62mm 1fr;gap:10px;padding:6px 8px;align-items:start}.rs-ac svg{width:100%;height:auto;display:block}'+
  '.rs-kv{width:100%;border-collapse:collapse;font-size:8pt}.rs-kv td{border-bottom:1px solid var(--line);padding:2.5px 3px}.rs-kv td+td{text-align:right;font-family:var(--f-mono);font-weight:600}.rs-kv tr.hl td{background:var(--surface-2)}'+
  '.rs-rd{display:grid;grid-auto-flow:column;column-gap:10px;margin-top:6px;font:7.6pt var(--f-mono)}.rs-rd span{display:flex;justify-content:space-between;border-bottom:1px dotted var(--line);padding:1.2px 2px}.rs-rd i{font-style:normal;color:var(--muted)}'+
  '.rs-cap{font:600 6.8pt var(--f-mono);letter-spacing:.06em;color:var(--muted);text-transform:uppercase;margin:0 0 2px}.nu{text-transform:none}';

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
/* Títulos traduzidos à mão; valores de lista pelo dicionário VAL; texto livre pelo Google Tradutor (Apps Script do FLOW),
   revisto antes de imprimir. Nada é gravado: a reclamação fica em português na base de dados. */
var LRF={
  pt:{ey:'Qualidade · Reclamação a fornecedor',ti:'Folha de rosto — Reclamação a fornecedor',rod:'Reclamação a fornecedor',n:'N.º',dt:'Data',forn:'Fornecedor',cod:'Código',tipo:'Tipo',prod:'Produto',lote:'Lote',nc:'Não conformidade',of:'OF / pedido',td:'Tipo de defeito',loc:'Local de deteção',
    qa:'Qtd afetada',qd:'Qtd devolvida',guia:'Guia de devolução',qr:'Qtd rejeitada',cd:'Custo devolução',cp:'Custo produção / escolha',cr:'Custo rejeição',ct:'Total de custos',desc:'Descrição da não conformidade / comunicação',
    resp:'Respondido a',ac:'Ações corretivas do fornecedor',dc:'Data do crédito',vc:'Valor creditado',nota:'Nota de crédito',est:'Estado',tc:'Tomei conhecimento',pap:['Supervisor Qualidade','Compras / Aprovisionamento'],imp:'Impresso a'},
  es:{ey:'Calidad · Reclamación a proveedor',ti:'Hoja de portada — Reclamación a proveedor',rod:'Reclamación a proveedor',n:'N.º',dt:'Fecha',forn:'Proveedor',cod:'Código',tipo:'Tipo',prod:'Producto',lote:'Lote',nc:'No conformidad',of:'OF / pedido',td:'Tipo de defecto',loc:'Lugar de detección',
    qa:'Cant. afectada',qd:'Cant. devuelta',guia:'Albarán de devolución',qr:'Cant. rechazada',cd:'Coste devolución',cp:'Coste producción / selección',cr:'Coste rechazo',ct:'Total costes',desc:'Descripción de la no conformidad / comunicación',
    resp:'Respondido el',ac:'Acciones correctivas del proveedor',dc:'Fecha del abono',vc:'Importe abonado',nota:'Nota de abono',est:'Estado',tc:'Enterado',pap:['Supervisor de Calidad','Compras / Aprovisionamiento'],imp:'Impreso el'},
  en:{ey:'Quality · Supplier complaint',ti:'Cover sheet — Supplier complaint',rod:'Supplier complaint',n:'No.',dt:'Date',forn:'Supplier',cod:'Code',tipo:'Type',prod:'Product',lote:'Batch',nc:'Non-conformity',of:'PO / order',td:'Defect type',loc:'Detected at',
    qa:'Qty affected',qd:'Qty returned',guia:'Return note',qr:'Qty rejected',cd:'Return cost',cp:'Production / sorting cost',cr:'Rejection cost',ct:'Total costs',desc:'Non-conformity description / communication',
    resp:'Answered on',ac:'Supplier corrective actions',dc:'Credit date',vc:'Credited amount',nota:'Credit note',est:'Status',tc:'Acknowledged',pap:['Quality Supervisor','Purchasing'],imp:'Printed on'},
  fr:{ey:'Qualité · Réclamation fournisseur',ti:'Page de garde — Réclamation fournisseur',rod:'Réclamation fournisseur',n:'N°',dt:'Date',forn:'Fournisseur',cod:'Code',tipo:'Type',prod:'Produit',lote:'Lot',nc:'Non-conformité',of:'OF / commande',td:'Type de défaut',loc:'Lieu de détection',
    qa:'Qté concernée',qd:'Qté retournée',guia:'Bon de retour',qr:'Qté rejetée',cd:'Coût du retour',cp:'Coût production / tri',cr:'Coût du rejet',ct:'Total des coûts',desc:'Description de la non-conformité / communication',
    resp:'Répondu le',ac:'Actions correctives du fournisseur',dc:'Date de l’avoir',vc:'Montant crédité',nota:'N° d’avoir',est:'Statut',tc:'Pris connaissance',pap:['Responsable Qualité','Achats / Approvisionnement'],imp:'Imprimé le'}
};
/* valores das listas: [es, en, fr]; as não conformidades compõem-se por partes ("Produto danificado - afeta a produção") */
var VAL={
  'fornecedor':['Proveedor','Supplier','Fournisseur'],'subcontratado':['Subcontratista','Subcontractor','Sous-traitant'],
  'aberta':['Abierta','Open','Ouverte'],'fechada':['Cerrada','Closed','Fermée'],'sim':['Sí','Yes','Oui'],'nao':['No','No','Non'],
  'atraso na entrega':['Retraso en la entrega','Late delivery','Retard de livraison'],'contaminacao':['Contaminación','Contamination','Contamination'],
  'deficiente acondicionamento':['Embalaje deficiente','Poor packaging','Conditionnement défectueux'],'deficiente acondiconamento':['Embalaje deficiente','Poor packaging','Conditionnement défectueux'],
  'diferenca de quantidade':['Diferencia de cantidad','Quantity difference','Écart de quantité'],'produto trocado':['Producto equivocado','Wrong product','Produit erroné'],
  'difere da especificacao':['Difiere de la especificación','Differs from specification','Non conforme à la spécification'],'produto danificado':['Producto dañado','Damaged product','Produit endommagé'],
  'produto danificado no transporte':['Producto dañado en el transporte','Product damaged in transport','Produit endommagé pendant le transport'],
  'afeta a producao':['afecta a la producción','affects production','affecte la production'],'nao afeta a producao':['no afecta a la producción','does not affect production','n’affecte pas la production'],
  'reclamacao de cliente':['reclamación de cliente','customer complaint','réclamation client'],'reclamacao do cliente':['reclamación del cliente','customer complaint','réclamation client'],
  'rececao':['Recepción','Goods receipt','Réception'],'laboratorio':['Laboratorio','Laboratory','Laboratoire'],'ptg':['PTG','PTG','PTG'],'pasaban':['Pasaban','Pasaban','Pasaban'],
  'impressao':['Impresión','Printing','Impression'],'corte e vinco':['Troquelado','Die-cutting','Découpe'],'colagem':['Pegado','Gluing','Collage'],'contracolagem':['Contracolado','Laminating','Contrecollage'],
  'embalamento':['Embalaje','Packing','Emballage'],'logistica':['Logística','Logistics','Logistique'],'producao':['Producción','Production','Production'],'cliente':['Cliente','Customer','Client'],
  'janelas':['Ventanas','Windowing','Fenêtrage'],'estampagem':['Estampación','Hot-foil stamping','Marquage à chaud'],'guilhotinas':['Guillotinas','Guillotines','Massicots'],'armazem':['Almacén','Warehouse','Entrepôt'],
  'qualidade':['Calidad','Quality','Qualité'],'prepress':['Preimpresión','Prepress','Prépresse'],'corte de cartolina':['Corte de cartoncillo','Board sheeting','Découpe du carton'],'subcontratacao':['Subcontratación','Subcontracting','Sous-traitance'],
  'supply chain':['Supply Chain','Supply Chain','Supply Chain'],'comercial':['Comercial','Sales','Commercial'],
  'identificacao errada':['Identificación errónea','Wrong identification','Identification erronée'],'contra colagem':['Contracolado','Laminating','Contrecollage'],'c.v.':['Troquelado','Die-cutting','Découpe'],
  'pre-cv':['Pre-troquelado','Pre die-cutting','Pré-découpe'],'aprovisionamento':['Aprovisionamiento','Purchasing','Approvisionnement'],'escolhas':['Selección','Sorting','Tri'],'fecho':['Cierre / pegado','Folding & gluing','Pliage-collage'],
  'logistica interna':['Logística interna','Internal logistics','Logistique interne'],'todo os processos':['Todos los procesos','All processes','Tous les processus'],'volteador':['Volteador','Pile turner','Retourneur de piles']
};
var LI={es:0,en:1,fr:2};
function vnorm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/afecta/g,'afeta').replace(/\s*-\s*/g,' - ').replace(/\s+/g,' ').trim() }
/* devolve a tradução do dicionário ou null (então vai para o Google Tradutor) */
function dic(v, lang){ if(v==null||v===''||lang==='pt') return v; var k=vnorm(v); if(VAL[k]) return VAL[k][LI[lang]];
  var p=k.split(' - '); if(p.length>1 && p.every(function(x){return VAL[x]})){ var t=p.map(function(x){return VAL[x][LI[lang]]}); return t[0]+' - '+t.slice(1).join(' - ') } return null }
/* campos de texto que precisam de tradução e não estão no dicionário */
var RF_TXT=[['obs','desc'],['naoConformidade','nc'],['tipoDefeito','td'],['localDetecao','loc'],['acoesCorretivas','ac']];
function rfPorTraduzir(r, lang){ return RF_TXT.filter(function(f){ var v=r[f[0]]; return v && (f[0]==='obs' || dic(v,lang)==null) }) }
function rf(r, lang, tr){
  lang=LRF[lang]? lang : 'pt'; tr=tr||{}; var L=LRF[lang];
  var v=function(k){ var x=r[k]; if(x==null||x===''||lang==='pt') return x; return tr[k]!=null? tr[k] : (dic(x,lang)!=null? dic(x,lang) : x) };
  var q=function(x){ return x!=null&&x!==''? fmt(x,0)+' '+(r.unidade||'') : '' }, e=function(x){ return x!=null&&x!==''? fmt(x,2)+' €' : '' };
  return pagina({eyebrow:L.ey, titulo:L.ti, rodape:L.rod, impresso:L.imp, num:[[L.n,r.numero],[L.dt,fdate(r.data)]],
    corpo:grid([cell(L.forn,r.fornecedor,3),cell(L.cod,r.codFornecedor,1,1),cell(L.tipo,v('tipoForn'),2),cell(L.prod,r.produto,3),cell('MM',r.mm,1,1),cell(L.lote,r.lote,1,1),cell('SSCC',r.sscc,1,1),
        cell(L.nc,v('naoConformidade'),4),cell(L.of,r.ofPed,2,1),cell(L.td,v('tipoDefeito'),3),cell(L.loc,v('localDetecao'),3),
        cell('Kg',nb(r.kg),1,1),cell(L.qa,q(r.qtdAfetada),1,1),cell(L.qd,q(r.qtdDevolucao),1,1),cell(L.guia,r.guiaDevolucao,1,1),cell(L.qr,q(r.qtdRejeitada),2,1),
        cell(L.cd,e(r.custoDevolucao),1,1),cell(L.cp,e(r.custoProducao),2,1),cell(L.cr,e(r.custoRejeicao),1,1),cell(L.ct,e(r.custoTotal),2,1)])+
      bloco(L.desc,v('obs'),55)+
      grid([cell(L.resp,r.dataResposta?fdate(r.dataResposta):'',1,1),cell(L.ac,v('acoesCorretivas'),1),cell(L.dc,r.dataCredito?fdate(r.dataCredito):'',1,1),
        cell(L.vc,e(r.valorCreditado),1,1),cell(L.nota,r.notaCredito,1,1),cell(L.est,v('estado'),1)])+
      assin(L.tc,L.pap)});
}
/* escolher a língua → traduzir o texto livre → rever → imprimir */
function rfLingua(r){
  A.showModal('<h2>Folha de rosto · <span class="mono">'+esc(r.numero)+'</span></h2><p class="muted" style="margin:-6px 0 0">Língua da folha. A reclamação fica em português no FLOW; a tradução só serve para esta impressão.</p>'+
    '<div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">'+[['pt','Português'],['es','Español'],['en','English'],['fr','Français']].map(function(l){ return '<button class="btn" data-l="'+l[0]+'"><b>'+l[0].toUpperCase()+'</b> · '+l[1]+'</button>' }).join('')+'</div>'+
    '<div class="foot"><button class="btn" id="roX">Cancelar</button></div>',
    function(){ $('roX').onclick=A.closeModal; document.querySelectorAll('[data-l]').forEach(function(b){ b.onclick=function(){ var l=b.dataset.l; if(l==='pt'){ A.closeModal(); imprimir('Folha de rosto '+r.numero, rf(r,'pt')); return } rfRever(r,l) } }) });
}
async function rfRever(r, lang){
  var campos=rfPorTraduzir(r,lang), L=LRF[lang], tr={}, aviso='';
  if(campos.length){
    $('box').querySelector('.foot').insertAdjacentHTML('beforebegin','<p class="small muted" id="roS">A traduzir…</p>');
    try{ var t=await A.mail.traduzir(campos.map(function(f){return r[f[0]]}), lang); campos.forEach(function(f,i){ tr[f[0]]=t[i] }) }
    catch(e){ aviso='Tradução automática indisponível ('+(e.message||e)+'). Escreva a tradução à mão nos campos abaixo.'; campos.forEach(function(f){ tr[f[0]]=r[f[0]] }) }
  }
  A.showModal('<h2>Rever tradução · '+lang.toUpperCase()+'</h2><p class="muted" style="margin:-6px 0 0">'+(campos.length? 'Tradução automática: confirme e corrija antes de imprimir. Os títulos e os valores das listas já vêm traduzidos.' : 'Todos os campos têm tradução fixa.')+'</p>'+
    (aviso?'<p class="small" style="color:var(--warn);margin:0">'+esc(aviso)+'</p>':'')+
    '<div class="form">'+campos.map(function(f){ return '<label class="fld full">'+esc(L[f[1]])+'<textarea id="tr_'+f[0]+'" rows="'+(f[0]==='obs'?7:2)+'">'+esc(tr[f[0]]||'')+'</textarea><small>PT: '+esc(String(r[f[0]]).slice(0,300))+(String(r[f[0]]).length>300?'…':'')+'</small></label>' }).join('')+'</div>'+
    '<div class="foot"><button class="btn" id="roX">Cancelar</button><button class="btn primary" id="roOk">Imprimir</button></div>',
    function(){ $('roX').onclick=A.closeModal; $('roOk').onclick=function(){ campos.forEach(function(f){ tr[f[0]]=$('tr_'+f[0]).value }); A.closeModal(); imprimir(L.ti+' '+r.numero, rf(r,lang,tr)) } });
}
/* ---------- gráfico de medições (SVG estático: serve no ecrã e na impressão) ----------
   medChart({vals, lo, hi, nom, obj, crit:'min'|'max'|'ref', avg, bars, xl:[rótulos], cur, unit, dec, w, h, L:{med,obj,avg,nom,tol}}) */
function nice(lo,hi,n){ if(lo===hi){ lo-=1; hi+=1 } var span=hi-lo, step=Math.pow(10,Math.floor(Math.log10(span/n))), e=span/n/step;
  if(e>=7.5) step*=10; else if(e>=3.5) step*=5; else if(e>=1.5) step*=2;
  var a=Math.floor(lo/step)*step, b=Math.ceil(hi/step)*step, t=[]; for(var v=a; v<=b+step/2; v+=step) t.push(+v.toFixed(10)); return {lo:a,hi:b,ticks:t,step:step} }
function okN(x){ return x!=null && x!=='' && isFinite(x) }
function medChart(o){
  var L=Object.assign({med:'Medição',obj:'Objetivo',avg:'Média',nom:'Nominal',tol:'Tol.'},o.L||{}), d=o.dec==null?2:o.dec;
  var v=(o.vals||[]).map(function(x){ return okN(x)? +x : null }), pts=[]; v.forEach(function(y,i){ if(y!=null) pts.push({i:i,y:y}) });
  if(!pts.length) return '<div class="cht-empty">'+esc(o.empty||'Sem medições.')+'</div>';
  var n=Math.max(v.length,1), W=o.w||560, H=o.h||220, ml=50, mr=12, mt=o.unit?22:12, mb=30;
  var m=A.mean(pts.map(function(p){return p.y})), ys=pts.map(function(p){return p.y});
  [o.lo,o.hi,o.nom,o.obj].forEach(function(x){ if(okN(x)) ys.push(+x) });
  var yl=Math.min.apply(null,ys), yh=Math.max.apply(null,ys); if(o.bars) yl=Math.min(0,yl);
  var pad=(yh-yl)*0.12||Math.abs(yh)*0.05||1, ny=nice(o.bars&&yl>=0? 0 : yl-pad, yh+pad, 5), td=ny.step<1? (ny.step<0.1? (ny.step<0.01?3:2):1) : 0;
  var cw=function(){ return (W-ml-mr)/n }, X=function(i){ return ml+(i+0.5)*cw() }, Y=function(y){ return mt+(ny.hi-y)/(ny.hi-ny.lo)*(H-mt-mb) };
  var T=function(x,y,t,a,c,wt){ return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" text-anchor="'+(a||'middle')+'" style="font:'+(wt||400)+' 10.5px var(--f-mono);fill:'+(c||'var(--muted)')+'">'+esc(t)+'</text>' };
  /* linhas de referência com rótulo à direita (afastadas se ficarem sobrepostas); a margem direita cabe o rótulo mais comprido */
  var refs=[]; if(okN(o.lo)) refs.push({y:+o.lo,l:L.tol+' mín.',c:'var(--ok)',da:'4 4'}); if(okN(o.hi)) refs.push({y:+o.hi,l:L.tol+' máx.',c:'var(--ok)',da:'4 4'});
  if(okN(o.nom)) refs.push({y:+o.nom,l:L.nom,c:'var(--ok)',da:'',w:1.5}); if(o.avg!==false && !o.bars) refs.push({y:m,l:L.avg,c:'var(--muted)',da:'2 3',w:1.5});
  if(okN(o.obj)) refs.push({y:+o.obj,l:L.obj,c:'var(--bad)',da:'7 4',w:2});
  refs.forEach(function(r){ mr=Math.max(mr, 12+6.6*(r.l.length+1+fmt(r.y,d).length)) });
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.label||L.med)+'">';
  ny.ticks.forEach(function(t){ s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(t).toFixed(1)+'" y2="'+Y(t).toFixed(1)+'" style="stroke:var(--line)"/>'+T(ml-6,Y(t)+3.5,fmt(t,td),'end') });
  if(okN(o.lo)||okN(o.hi)){ var bl=okN(o.lo)?+o.lo:ny.lo, bh=okN(o.hi)?+o.hi:ny.hi;
    s+='<rect x="'+ml+'" width="'+(W-ml-mr)+'" y="'+Y(bh).toFixed(1)+'" height="'+Math.max(0,Y(bl)-Y(bh)).toFixed(1)+'" style="fill:var(--ok-soft)" opacity=".7"/>' }
  var ly=refs.map(function(r){ return {r:r, y:Y(r.y)} }).sort(function(a,b){return a.y-b.y});
  for(var k=1;k<ly.length;k++) if(ly[k].y-ly[k-1].y<11) ly[k].y=ly[k-1].y+11;
  ly.forEach(function(z){ var r=z.r, yy=Y(r.y).toFixed(1);
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+yy+'" y2="'+yy+'" style="stroke:'+r.c+';stroke-width:'+(r.w||1)+'"'+(r.da?' stroke-dasharray="'+r.da+'"':'')+'/>'+
      T(W-mr+5,z.y+3.5,r.l+' '+fmt(r.y,d),'start',r.c,600) });
  var mau=function(y){ return (okN(o.lo)&&y<o.lo)||(okN(o.hi)&&y>o.hi)||(okN(o.obj)&&o.crit==='min'&&y<o.obj)||(okN(o.obj)&&o.crit==='max'&&y>o.obj) };
  if(o.bars){
    var bw=Math.min(cw()*0.62,42);
    pts.forEach(function(p){ var y0=Y(Math.max(ny.lo,0)), y1=Y(p.y), cor=mau(p.y)? 'var(--bad)' : (p.i===o.cur? 'var(--c-qual)' : 'var(--s1)');
      s+='<rect x="'+(X(p.i)-bw/2).toFixed(1)+'" y="'+Math.min(y0,y1).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.abs(y0-y1).toFixed(1)+'" rx="2" style="fill:'+cor+'"'+(p.i===o.cur||o.cur==null?'':' opacity=".55"')+'/>'+
        T(X(p.i),y1-4,fmt(p.y,d),'middle','var(--fg)',p.i===o.cur?700:400) });
  } else {
    if(pts.length>1) s+='<path d="'+pts.map(function(p,j){ return (j?'L':'M')+X(p.i).toFixed(1)+' '+Y(p.y).toFixed(1) }).join('')+'" fill="none" style="stroke:var(--s1);stroke-width:2" stroke-linejoin="round"/>';
    pts.forEach(function(p){ var b=mau(p.y); s+='<circle cx="'+X(p.i).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="'+(b?4.5:3.2)+'" style="fill:'+(b?'var(--bad)':'var(--s1)')+';stroke:var(--surface);stroke-width:1.5"/>' });
  }
  var every=n>24?4:n>12?2:1;
  for(var i=0;i<n;i++) if(i%every===0||i===n-1) s+=T(X(i),H-mb+14,o.xl? o.xl[i] : String(i+1));
  s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+(H-mb)+'" y2="'+(H-mb)+'" style="stroke:var(--faint)"/>'+T(ml+(W-ml-mr)/2,H-3,o.xt||L.med,'middle','var(--muted)');
  if(o.unit) s+=T(4,9,o.unit,'start');
  return s+'</svg>';
}

/* ---------- relatório de medição: controlo de cartolina (como a folha "Relatório" do Excel de controlo de matéria-prima) ---------- */
function seccao(tit, arr, nom, lo, hi, d, un){
  arr=arr||[]; var ult=-1; arr.forEach(function(x,i){ if(okN(x)) ult=i });
  var n=Math.max(10, ult+1), v=arr.slice(0,n).filter(okN).map(Number), m=A.mean(v), sd=A.sd(v), dif=m!=null&&okN(nom)? m-nom : null;
  var fora=function(x){ return okN(x)&&((okN(lo)&&x<lo)||(okN(hi)&&x>hi)) }, mo=fora(m);
  var kv=[['Nominal',okN(nom)?fmt(nom,0):'–'],['Tol. máx.',okN(hi)?fmt(hi,d):'–'],['Tol. mín.',okN(lo)?fmt(lo,d):'–'],['Média medida',fmt(m,d+1),1],['Diferença',dif!=null? (dif>0?'+':'')+fmt(dif,d+1)+' ('+(dif>0?'+':'')+fmt(dif/nom*100,1)+'%)' : '–'],['Desvio padrão',fmt(sd,2)],['Mín. / máx.',v.length? fmt(Math.min.apply(null,v),d)+' / '+fmt(Math.max.apply(null,v),d) : '–']];
  var rd=''; for(var i=0;i<n;i++){ var x=arr[i]; rd+='<span><i>'+(i+1)+'</i><b'+(fora(x)?' class="out"':'')+'>'+(okN(x)?fmt(x,d):'')+'</b></span>' }
  return '<div class="rs-b"><div class="rs-bh">'+esc(tit)+' <span class="nu">('+esc(un)+')</span></div><div class="rs-an"><div><table class="rs-kv">'+kv.map(function(r){ return '<tr'+(r[2]?' class="hl"':'')+'><td>'+r[0]+'</td><td'+(r[2]&&mo?' class="out"':'')+'>'+r[1]+'</td></tr>' }).join('')+'</table>'+
    '<div class="rs-rd" style="grid-template-rows:repeat('+Math.ceil(n/(n>10?4:2))+',auto)">'+rd+'</div></div>'+
    '<div class="rs-ac"><p class="rs-cap">Medições ('+v.length+') · <span class="nu">'+esc(un)+'</span></p>'+medChart({vals:arr.slice(0,n), lo:lo, hi:hi, nom:nom, dec:d, w:520, h:230, avg:true})+'</div></div></div>';
}
function ensaio(c){
  var res={ok:'Conforme',at:'Leituras fora da tolerância',nc:'Não conforme'}[c.resultado]||'–', ano=String(c.data||'').slice(0,4);
  return pagina({eyebrow:'Qualidade · Controlo de matérias-primas', titulo:'Relatório de medição — Cartolina', rodape:'Controlo de matéria-prima (cartolina)', num:[['N.º',c.numero||'–'],['Ano',ano]],
    corpo:grid([cell('Fornecedor',c.fornecedor,3),cell('MM',c.mm,1,1),cell('Lote',c.lote,2,1),cell('Descrição',c.nome,4),cell('Palete / guia',c.palete,2,1),
        cell('Data de medição',fdate(c.data),2,1),cell('Autor',c.analista,2),cell('Validação','',2).replace('&nbsp;','<span class="rs-p '+(c.resultado||'')+'">'+esc(c.resultado==='nc'?'NOK':c.resultado?'OK':'–')+'</span> <span style="font-size:8pt;color:var(--muted)">'+esc(res)+'</span>')])+
      seccao('Análise — Gramagem', c.gram, c.g, c.gMin, c.gMax, 0, 'g/m²')+
      seccao('Análise — Espessura', c.esp, c.e, c.eMin, c.eMax, 0, 'µm')+
      bloco('Observações',c.obs,14)+
      assin('Validação',['Autor'+(c.analista?' — '+c.analista:''),'Responsável de Auditoria'])});
}

/* ---------- ensaios de laboratório (deslizamento de verniz / cartolina, características de cartolina, rebentamento) ----------
   Títulos traduzidos à mão; grandezas pelo dicionário GR; observações (e grandezas desconhecidas) pelo Google Tradutor, revistas antes de imprimir. */
var LENS={
  pt:{ey:'Qualidade · Ensaio de laboratório',ti:'Relatório de ensaio',rod:'Ensaios de laboratório',n:'N.º',dt:'Data',cli:'Cliente',of:'OF',mm:'MM',art:'Artigo',cart:'Cartolina',vz:'Verniz',gr:'Ensaio',cond:'Condições',op:'Operador do ensaio',
    obj:'Objetivo',crit:{min:'mínimo',max:'máximo',ref:'referência'},res:'Resultado',ok:'Conforme',nc:'Não conforme',sr:'Sem critério',med:'Medição',meds:'Medições',media:'Média',sd:'Desvio padrão',mn:'Mínimo',mx:'Máximo',dif:'Diferença ao objetivo',
    graf:'Medições vs objetivo',cmp:'Comparação com ensaios anteriores',obs:'Observações',val:'Validação',pap:['Operador do ensaio','Supervisor Qualidade'],imp:'Impresso a',
    tipos:{verniz:'Deslizamento de verniz',cartolina:'Deslizamento de cartolina',caract:'Características de cartolina',rebent:'Rebentamento de cartão',forca:'Força de vincos',cobb:'Absorção de água (COBB)'}},
  es:{ey:'Calidad · Ensayo de laboratorio',ti:'Informe de ensayo',rod:'Ensayos de laboratorio',n:'N.º',dt:'Fecha',cli:'Cliente',of:'OF',mm:'MM',art:'Artículo',cart:'Cartoncillo',vz:'Barniz',gr:'Ensayo',cond:'Condiciones',op:'Operador del ensayo',
    obj:'Objetivo',crit:{min:'mínimo',max:'máximo',ref:'referencia'},res:'Resultado',ok:'Conforme',nc:'No conforme',sr:'Sin criterio',med:'Medición',meds:'Mediciones',media:'Media',sd:'Desviación estándar',mn:'Mínimo',mx:'Máximo',dif:'Diferencia con el objetivo',
    graf:'Mediciones vs objetivo',cmp:'Comparación con ensayos anteriores',obs:'Observaciones',val:'Validación',pap:['Operador del ensayo','Supervisor de Calidad'],imp:'Impreso el',
    tipos:{verniz:'Deslizamiento del barniz',cartolina:'Deslizamiento del cartoncillo',caract:'Características del cartoncillo',rebent:'Estallido del cartón',forca:'Fuerza de hendido',cobb:'Absorción de agua (COBB)'}},
  en:{ey:'Quality · Laboratory test',ti:'Test report',rod:'Laboratory tests',n:'No.',dt:'Date',cli:'Customer',of:'PO',mm:'MM',art:'Item',cart:'Board',vz:'Varnish',gr:'Test',cond:'Conditions',op:'Tested by',
    obj:'Target',crit:{min:'minimum',max:'maximum',ref:'reference'},res:'Result',ok:'Conforming',nc:'Non-conforming',sr:'No criterion',med:'Measurement',meds:'Measurements',media:'Average',sd:'Standard deviation',mn:'Minimum',mx:'Maximum',dif:'Difference to target',
    graf:'Measurements vs target',cmp:'Comparison with previous tests',obs:'Remarks',val:'Approval',pap:['Tested by','Quality Supervisor'],imp:'Printed on',
    tipos:{verniz:'Varnish slip test',cartolina:'Board slip test',caract:'Board properties',rebent:'Board bursting strength',forca:'Crease force',cobb:'Water absorption (COBB)'}},
  fr:{ey:'Qualité · Essai de laboratoire',ti:'Rapport d’essai',rod:'Essais de laboratoire',n:'N°',dt:'Date',cli:'Client',of:'OF',mm:'MM',art:'Article',cart:'Carton',vz:'Vernis',gr:'Essai',cond:'Conditions',op:'Opérateur de l’essai',
    obj:'Objectif',crit:{min:'minimum',max:'maximum',ref:'référence'},res:'Résultat',ok:'Conforme',nc:'Non conforme',sr:'Sans critère',med:'Mesure',meds:'Mesures',media:'Moyenne',sd:'Écart-type',mn:'Minimum',mx:'Maximum',dif:'Écart à l’objectif',
    graf:'Mesures vs objectif',cmp:'Comparaison avec les essais précédents',obs:'Observations',val:'Validation',pap:['Opérateur de l’essai','Responsable Qualité'],imp:'Imprimé le',
    tipos:{verniz:'Glissement du vernis',cartolina:'Glissement du carton',caract:'Caractéristiques du carton',rebent:'Éclatement du carton',forca:'Force de rainage',cobb:'Absorption d’eau (COBB)'}}
};
var GR={'coeficiente de friccao cinetica':['Coeficiente de fricción cinético','Kinetic coefficient of friction','Coefficient de frottement cinétique'],
  'coeficiente de friccao estatica':['Coeficiente de fricción estático','Static coefficient of friction','Coefficient de frottement statique'],
  'rigidez':['Rigidez','Stiffness','Rigidité'],'cobb':['Cobb','Cobb','Cobb'],'cobb 60':['Cobb 60','Cobb 60','Cobb 60'],'cobb 1800':['Cobb 1800','Cobb 1800','Cobb 1800'],'humidade':['Humedad','Moisture','Humidité'],'brancura':['Blancura','Whiteness','Blancheur'],
  'gramagem':['Gramaje','Grammage','Grammage'],'espessura':['Espesor','Thickness','Épaisseur'],'rebentamento':['Estallido','Bursting strength','Éclatement'],'ect':['ECT','ECT','ECT'],'bct':['BCT','BCT','BCT'],
  'resistencia a dobragem':['Resistencia al plegado','Folding endurance','Résistance au pliage'],'interior':['Interior','Inside','Intérieur'],'exterior':['Exterior','Outside','Extérieur'],'ambos':['Ambos','Both','Les deux'],'frente':['Cara','Front','Recto'],'verso':['Dorso','Back','Verso'],'longitudinal':['Longitudinal','Machine direction','Sens machine'],'transversal':['Transversal','Cross direction','Sens travers'],'forca de vinco':['Fuerza de hendido','Crease force','Force de rainage']};
function grDic(g, lang){ if(!g||lang==='pt') return g; var k=vnorm(g), r=GR[k]; return r? r[LI[lang]] : null }
var ENS_TXT=[['obs','obs',5],['grandeza','gr',1],['condicoes','cond',1]];
function ensPorTraduzir(r, lang){ return ENS_TXT.filter(function(f){ var v=r[f[0]]; if(!v||lang==='pt') return false; if(f[0]==='grandeza') return grDic(v,lang)==null; if(f[0]==='condicoes') return /[a-zà-ú]{4,}/i.test(String(v).replace(/mm\/min/gi,'')); return true }) }
function ensHist(e){
  var chave=function(x){ return x.tipo+'|'+(x.mm||x.cartolina||'')+'|'+vnorm(x.grandeza) };
  if(!(e.mm||e.cartolina)) return [];
  return A.list('ensaios').filter(function(x){ return chave(x)===chave(e) && x.media!=null && (x.data<e.data || (x.data===e.data && (x.numero||'')<=(e.numero||'')) || x.id===e.id) })
    .sort(function(a,b){ return (a.data+(a.numero||''))<(b.data+(b.numero||''))?-1:1 }).slice(-8);
}
function ensRosto(e, lang, tr){
  lang=LENS[lang]? lang : 'pt'; tr=tr||{}; var L=LENS[lang], d=e.dec!=null? e.dec : 3, u=e.unidade? ' '+e.unidade : '';
  var cond=[tr.condicoes!=null?tr.condicoes:e.condicoes].concat(['lado','sentido','face','tempo'].map(function(k){ return grDic(e[k],lang)||e[k] }),[e.cortante?'Cortante '+e.cortante:'']).filter(Boolean).join(' · ');
  var g=tr.grandeza!=null? tr.grandeza : (grDic(e.grandeza,lang)||e.grandeza), meds=(e.medicoes||[]).filter(okN).map(Number);
  var res=e.resultado==='ok'? '<span class="rs-p ok">'+L.ok+'</span>' : e.resultado==='nc'? '<span class="rs-p nc">'+L.nc+'</span>' : '<span class="rs-p">'+L.sr+'</span>';
  var objTxt=okN(e.objetivo)? fmt(e.objetivo,d)+u+' ('+L.crit[e.criterio||'ref']+')' : '–';
  var CL={med:L.med,obj:L.obj,avg:L.media,nom:'Nominal',tol:'Tol.'};
  var kv=[[L.media,fmt(e.media,d)+u,1],[L.obj,objTxt],[L.dif,okN(e.objetivo)&&e.media!=null? ((e.media-e.objetivo)>0?'+':'')+fmt(e.media-e.objetivo,d)+(e.objetivo? ' ('+((e.media-e.objetivo)>0?'+':'')+fmt((e.media-e.objetivo)/e.objetivo*100,1)+'%)':'') : '–'],
    [L.sd,fmt(A.sd(meds),d)],[L.mn,meds.length?fmt(Math.min.apply(null,meds),d):'–'],[L.mx,meds.length?fmt(Math.max.apply(null,meds),d):'–']];
  var mau=function(x){ return okN(e.objetivo)&&((e.criterio==='min'&&x<e.objetivo)||(e.criterio==='max'&&x>e.objetivo)) };
  var rd=(e.medicoes||[]).map(function(x,i){ return '<span><i>'+(i+1)+'</i><b'+(mau(x)?' class="out"':'')+'>'+(okN(x)?fmt(x,d):'')+'</b></span>' }).join('');
  var h=ensHist(e), cmp=h.length>1? '<div class="rs-b"><div class="rs-bh">'+esc(L.cmp)+' — '+esc(e.mm||e.cartolina)+'</div><div style="padding:6px 8px">'+
    medChart({vals:h.map(function(x){return x.media}), xl:h.map(function(x){ return fdate(x.data).slice(0,5)+'/'+String(x.data).slice(2,4) }), cur:h.map(function(x){return x.id}).indexOf(e.id), bars:true, obj:e.objetivo, crit:e.criterio, dec:d, w:720, h:180, xt:L.media+' · '+L.dt, L:CL})+'</div></div>' : '';
  return pagina({eyebrow:L.ey, titulo:L.ti+' — '+L.tipos[e.tipo], rodape:L.rod, impresso:L.imp, num:[[L.n,e.numero],[L.dt,fdate(e.data)]],
    corpo:grid([cell(L.cli,e.cliente,3),cell(L.of,e.of,1,1),cell(L.mm,e.mm,2,1),cell(L.art,e.artigo,4),cell(L.cart,e.cartolina,2)].concat(
        e.tipo==='verniz'? [cell(L.vz,e.verniz,4),cell(L.cond,cond,2)] : [cell(L.cond,cond,6)],
        [cell(L.gr,g+(e.unidade?' ('+e.unidade+')':''),2),cell(L.op,e.operador,2),cell(L.res,'',2).replace('&nbsp;',res)]))+
      '<div class="rs-b"><div class="rs-bh">'+esc(L.graf)+'</div><div class="rs-an"><div><table class="rs-kv">'+kv.map(function(r,i){ return '<tr'+(r[2]?' class="hl"':'')+'><td>'+esc(r[0])+'</td><td'+(i===0&&e.resultado==='nc'?' class="out"':'')+'>'+esc(r[1])+'</td></tr>' }).join('')+'</table>'+
        '<p class="rs-cap" style="margin-top:8px">'+esc(L.meds)+' ('+meds.length+')</p><div class="rs-rd" style="grid-template-rows:repeat('+Math.ceil((e.medicoes||[]).length/2)+',auto)">'+rd+'</div></div>'+
        '<div class="rs-ac">'+medChart({vals:e.medicoes, obj:e.objetivo, crit:e.criterio, dec:d, w:520, h:250, unit:e.unidade, L:CL})+'</div></div></div>'+
      cmp+bloco(L.obs,tr.obs!=null?tr.obs:e.obs,cmp?14:30)+
      assin(L.val,[L.pap[0]+(e.operador?' — '+e.operador:''),L.pap[1]])});
}
/* escolher a língua → (traduzir e rever) → imprimir */
function lingua(titulo, fn){
  A.showModal('<h2>'+titulo+'</h2><p class="muted" style="margin:-6px 0 0">Língua da folha. O registo fica em português no FLOW; a tradução só serve para esta impressão.</p>'+
    '<div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">'+[['pt','Português'],['es','Español'],['en','English'],['fr','Français']].map(function(l){ return '<button class="btn" data-l="'+l[0]+'"><b>'+l[0].toUpperCase()+'</b> · '+l[1]+'</button>' }).join('')+'</div>'+
    '<div class="foot"><button class="btn" id="roX">Cancelar</button></div>',
    function(){ $('roX').onclick=A.closeModal; document.querySelectorAll('[data-l]').forEach(function(b){ b.onclick=function(){ fn(b.dataset.l) } }) });
}
async function ensRever(e, lang){
  var L=LENS[lang], campos=ensPorTraduzir(e,lang), tr={}, aviso='';
  var fim=function(){ A.closeModal(); imprimir(L.ti+' '+(e.numero||''), ensRosto(e,lang,tr)) };
  if(lang==='pt'||!campos.length){ fim(); return }
  $('box').querySelector('.foot').insertAdjacentHTML('beforebegin','<p class="small muted" id="roS">A traduzir…</p>');
  try{ var t=await A.mail.traduzir(campos.map(function(f){return e[f[0]]}), lang); campos.forEach(function(f,i){ tr[f[0]]=t[i] }) }
  catch(err){ aviso='Tradução automática indisponível ('+(err.message||err)+'). Escreva a tradução à mão nos campos abaixo.'; campos.forEach(function(f){ tr[f[0]]=e[f[0]] }) }
  A.showModal('<h2>Rever tradução · '+lang.toUpperCase()+'</h2><p class="muted" style="margin:-6px 0 0">Tradução automática: confirme e corrija antes de imprimir. Os títulos já vêm traduzidos.</p>'+
    (aviso?'<p class="small" style="color:var(--warn);margin:0">'+esc(aviso)+'</p>':'')+
    '<div class="form">'+campos.map(function(f){ return '<label class="fld full">'+esc(L[f[1]])+'<textarea id="tr_'+f[0]+'" rows="'+f[2]+'">'+esc(tr[f[0]]||'')+'</textarea><small>PT: '+esc(String(e[f[0]]).slice(0,300))+'</small></label>' }).join('')+'</div>'+
    '<div class="foot"><button class="btn" id="roX">Cancelar</button><button class="btn primary" id="roOk">Imprimir</button></div>',
    function(){ $('roX').onclick=A.closeModal; $('roOk').onclick=function(){ campos.forEach(function(f){ tr[f[0]]=$('tr_'+f[0]).value }); fim() } });
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
var GER={FIQ:fiq, FII:fii, RF:rf, ENSAIO:ensaio, ENS:ensRosto};
function html(tipo, rec, versao){ return GER[tipo](rec, versao) }
Q2.rostoDoc=function(tipo, rec, versao){ return documento(tipo, html(tipo,rec,versao)) };
Q2.rfDic=dic; Q2.medChart=medChart; Q2.ensTipos=LENS.pt.tipos;
Q2.rosto=function(tipo, rec, versao){
  if(tipo==='RF' && !versao){ rfLingua(rec); return }
  if(tipo==='ENS' && !versao){ lingua('Folha de rosto · <span class="mono">'+esc(rec.numero||'')+'</span>', function(l){ ensRever(rec,l) }); return }
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
