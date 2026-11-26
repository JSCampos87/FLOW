/* "Como funciona": guia visual no topo de cada ferramenta, para o FLOW se explicar sozinho.
   Cada guia = passos (ícone + título + frase) ligados por setas, legenda de cores e uma dica.
   Aparece aberto na primeira visita; quem fecha não volta a ver aberto neste browser (flow_guia_<rota>).
   É inserido por core.js render() logo a seguir ao cabeçalho da página (.head / .shero).
   Para acrescentar uma ferramenta: uma entrada em G com {s:'subtítulo', p:[[ícone,título,texto],…], x:[[cor,legenda]], d:'dica'}. */
(function(){
var A=window.App, esc=A.esc;

/* ícones de traço 24×24 (DESIGN.md §5: stroke, currentColor, cantos arredondados) */
var I={
  upload:'<path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  excel:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
  tray:'<path d="M3 13l3-8h12l3 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1 2h6l1-2h5"/>',
  drag:'<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11M12 10V4.5a1.5 1.5 0 0 1 3 0V11M15 10.5V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.8-2.4L3.6 15a1.5 1.5 0 0 1 2.4-1.8L9 15V8.5a1.5 1.5 0 0 1 0 0"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',
  person:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  alert:'<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  truck:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  pallet:'<path d="M5 4h14v11H5z"/><path d="M5 9.5h14M12 4v11"/><path d="M3 15h18v2H3zM5 17v3M12 17v3M19 17v3"/>',
  flask:'<path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  tablet:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  shield:'<path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  printer:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  box:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  roll:'<ellipse cx="7" cy="12" rx="3" ry="7"/><path d="M7 5h10c1.7 0 3 3.1 3 7s-1.3 7-3 7H7"/>',
  doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  split:'<path d="M4 12h6l4-6h6M14 18h6M10 12l4 6"/>',
  play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  stop:'<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  key:'<circle cx="8" cy="14" r="4"/><path d="m11 11 9-9M17 5l2 2M15 7l2 2"/>',
  history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/>'
};
function svg(k){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(I[k]||I.doc)+'</svg>' }
var ARR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

/* cores de estado para as legendas */
var OK='var(--st-good)', WARN='var(--st-warn)', BAD='var(--st-crit)', INFO='var(--info)', MUTE='var(--faint)';

/* ---------- conteúdo: uma entrada por rota ---------- */
var G={
  cargas:{s:'Do mapa de entregas às equipas de cada turno',
    p:[['upload','Carregar o mapa','Botão “Carregar mapa de entregas”: o Excel do mapa (Cliente, OF, MM, Quantidade, Data Entrega).'],
       ['tray','Bandeja','Todas as OF do mapa ficam na bandeja “por atribuir”, até serem finalizadas, mesmo que a data já tenha passado.'],
       ['people','Equipas nos turnos','Arraste “1 pessoa”, “2 pessoas”… para o Turno 1, 2 ou 3. Cada equipa é uma coluna.'],
       ['drag','Distribuir','Arraste cada OF da bandeja para uma equipa, ou carregue em “Sugerir distribuição” (pelos uptimes).'],
       ['check','Finalizar','Quando a OF está embalada, clique no bloco e finalize. Sai da bandeja; se não acabar, divida-a e o resto volta à bandeja.']],
    x:[[OK,'Verde: cabe no turno'],[BAD,'Vermelho: passa do fim do turno (linha tracejada)'],[WARN,'Amarelo: ainda por atribuir'],[MUTE,'Riscado: velocidade estimada (MM sem specs)']],
    d:'<b>MM sem specs?</b> O tempo é estimado. Clique em “preencher agora” e indique paletização e uds/h — o plano passa a ser exato.'},

  /* ---------- Impressão ---------- */
  cauchos:{s:'Pedir cauchos ao armazém e medir quanto duram',
    p:[['plus','Requisitar','“Requisitar caucho”: máquina, corpo, caucho (MM) e motivo. Máquina parada? Marque “Urgente”.'],
       ['clock','Contador','Escreva o contador da máquina agora: o FLOW calcula a tiragem do caucho que sai.'],
       ['box','Armazém entrega','O stock vê o pedido em “Requisições” e carrega em “Marcar entregue”.'],
       ['chart','Tiragem','Separador “Tiragem”: quanto dura cada caucho, por máquina e corpo.']],
    x:[[WARN,'Pedida'],[OK,'Entregue'],[MUTE,'Cancelada'],[BAD,'Por entregar com urgência']],
    d:'<b>Atalho:</b> em “Por máquina”, clique na linha do corpo — o pedido abre já preenchido.'},
  verniz:{s:'Onde está guardada cada reserva de verniz',
    p:[['filter','Escolher a máquina','Um separador por máquina; “Sobras de verniz (kg)” no fim.'],
       ['search','Pesquisar','Escreva o cortante ou o n.º SAP e carregue em “Pesquisar”. Pode filtrar por posição ou cor.'],
       ['plus','Nova reserva','“+ Adicionar cortante”: cortante, SAP e posição (ou cor).'],
       ['drop','Sobras','Registe as sobras em kg com validade; “Usar sobra” desconta o que gastou.']],
    x:[[WARN,'Sobra expira em 30 dias'],[BAD,'Sobra expirada']],
    d:'Só técnico de impressão, stock ou editores alteram. Os outros veem em “Modo de consulta”.'},
  aguas:{s:'Osmose e molhas dentro dos limites',
    p:[['plus','Nova medição','“+ Nova medição”: uma folha com a osmose e todas as máquinas.'],
       ['drop','Medir','Escreva álcool, condutividade e pH. O que sair do limite fica vermelho logo ao escrever.'],
       ['chart','Ver evolução','“Evolução” e “Estabilidade”: tendência e % de medições dentro do limite.']],
    x:[[OK,'Dentro do limite'],[BAD,'Fora do limite']],
    d:'Os limites (botão “Limites”) são definidos pelo técnico de impressão.'},
  intervencoes:{s:'Avarias, trocas e manutenção de cada máquina',
    p:[['wrench','Registar','“+ Nova intervenção” para trabalho feito, “+ Avaria” para um problema em aberto.'],
       ['edit','Preencher','Tipo, máquina, corpo, resultado e quem executou. Os campos mudam com o tipo (rolos, rolamentos…).'],
       ['alert','Avarias em aberto','Ficam em “Avarias” até alguém carregar em “Fechar” → “Marcar resolvida”.'],
       ['cal','Próxima','Indique a data da próxima intervenção: passa a “vencida” se não for feita a tempo.']],
    x:[[BAD,'Avaria em aberto / vencida'],[WARN,'Próxima a vencer'],[OK,'Conforme']]},
  'ficha-imp':{s:'Corpos, anilox, rolos e consumíveis de cada máquina',
    p:[['filter','Escolher a máquina','Seletor no topo; separadores Corpos, Rolos, Consumíveis e Notas técnicas.'],
       ['upload','Importar','“Importar do supervisor”: Offset Print, Gestão de Cauchus ou Excel CD2.'],
       ['roll','Trocar rolo','Em “Rolos”, “Registar troca de rolo” cria a intervenção automaticamente.']],
    x:[[BAD,'Rolo ou consumível sem stock']]},
  'offset-print':{s:'A app do supervisor, dentro do FLOW',
    p:[['eye','Painel','Cada cartão é uma secção: “Abrir secção →”.'],
       ['search','Procurar','Pesquise por qualquer campo; “← Voltar ao painel” para sair.'],
       ['roll','Rolagem','Escolha unidade e rolo no esquema e carregue em “Registar intervenção”.']],
    d:'Importar ou editar: só o técnico de impressão.'},

  /* ---------- Produção e posto ---------- */
  'producao-imp':null, 'producao-cv':null, 'producao-col':null,
  posto:{s:'O tablet junto à máquina',
    p:[['tablet','Escolher a máquina','Toque na máquina — ou leia a etiqueta QR colada nela.'],
       ['person','Identificar-me','N.º de colaborador no teclado. Fica 12 h neste tablet.'],
       ['play','Iniciar OF','N.º da OF; o MM vem sozinho.'],
       ['stop','Paragens e fim','“Paragem” quando pára, “Retomar produção”, “Registar quantidade” e “Terminar OF”.']],
    x:[[OK,'Verde: a produzir'],[BAD,'Vermelho: parada']]},
  'of-':{s:'Tudo o que aconteceu a uma OF, numa página',
    p:[['search','Abrir OF','Lupa no topo (ou Ctrl+K): escreva a OF ou o MM.'],
       ['history','Linha do tempo','Produção, paragens, cauchos, verniz, águas, FII/FIQ e entregas, por ordem.'],
       ['eye','Ao lado','Specs do MM, incidências e entregas.']],
    d:'Página só de leitura: corrige-se na ferramenta de origem.'},
  alertas:{s:'O que precisa de atenção hoje',
    p:[['bell','Ver','Os alertas juntam-se sozinhos a partir de todas as ferramentas.'],
       ['link','Ir resolver','Cada linha abre o ecrã onde se resolve.'],
       ['check','Visto','“Marcar todos como vistos” limpa o contador do sino.']],
    x:[[BAD,'Urgente: paragem > 60 min, avaria > 7 dias, água fora do limite…'],[WARN,'Atenção: OF aberta > 12 h, stock abaixo do mínimo…']]},

  /* ---------- Colagem / Embalamento / Logística ---------- */
  requisicoes:{s:'Pedir materiais como numa loja',
    p:[['search','Catálogo','Procure o artigo e carregue em “Requisitar”. Pode juntar vários.'],
       ['list','Fazer requisição','“Fazer requisição”: máquina, motivo e se é urgente → “Enviar requisição”.'],
       ['mail','Email automático','O comprador recebe o email com as linhas para o SAP.'],
       ['box','Entrega','Quem gere o stock aprova e “Marcar entregue” — o stock desce sozinho.']],
    x:[[WARN,'Pedida'],[OK,'Entregue'],[BAD,'Urgente / abaixo do stock mínimo']]},
  specs:{s:'Como paletizar cada MM',
    p:[['search','Procurar','Escreva MM, descrição, cliente ou cortante.'],
       ['pallet','Ver spec','Clique: maços por base e altura, altura da palete, cantoneiras, tampo, filme…'],
       ['plus','Criar','MM sem spec? “Criar a spec agora” ou “+ MM”. O uptime (uds/h) alimenta o Plano de cargas.']],
    x:[[BAD,'Sem specs: o plano de cargas tem de estimar o tempo']]},
  entregas:{s:'Camiões do dia, por ordem de descarga',
    p:[['upload','Colar plano SAP','“Colar plano SAP”: linhas com recebedor e camião.'],
       ['truck','Camiões','Cada camião com as entregas. “Ordenar todos por distância” ou Subir / Descer à mão.'],
       ['eye','Mapa e rota','Veja o percurso de cada camião.'],
       ['mail','Enviar','“Copiar para email”, “Imprimir” ou “Pedido SAP”.']],
    x:[[BAD,'Recebedor sem morada na base'],[WARN,'Localização aproximada / sem código 15*']]},

  /* ---------- Qualidade ---------- */
  incidencias:{s:'Incidências internas (FII) e de clientes (FIQ)',
    p:[['plus','Registar','“+ Nova FII” ou “+ Nova FIQ”. O número é automático.'],
       ['search','OF','Escreva a OF: MM, cliente, artigo e cortante preenchem-se sozinhos.'],
       ['edit','Tratar','Mude o estado à medida que avança: Aberta → Em análise → Ação definida.'],
       ['check','Fechar','“Fechada” pede a data de fecho e fica só de leitura.']],
    x:[[BAD,'Aberta'],[WARN,'Em análise'],[INFO,'Ação definida / em implementação'],[OK,'Fechada']],
    d:'Para o relatório semanal: “Gerar PDF”.'},
  fornecedores:{s:'Não conformidades de fornecedores e créditos',
    p:[['plus','Registar','“+ Nova reclamação”: fornecedor, material, quantidades e custos.'],
       ['camera','Provas','“Fotos e emails” liga a pasta SharePoint da reclamação.'],
       ['check','Resposta e crédito','Registe a resposta e o crédito recebido; feche quando acabar.']],
    x:[[OK,'Recuperação ≥ 80%'],[WARN,'≥ 40%'],[BAD,'< 40%']]},
  laboratorio:{s:'Todos os ensaios numa tabela',
    p:[['flask','Escolher o ensaio','“+ Novo ensaio” ou o + do cartão: cartolina, deslizamento, rebentamento, vincos, COBB…'],
       ['edit','Medir','OF/MM preenchem o resto. Escreva as medições (mínimo 3 ou 5).'],
       ['check','Resultado','O FLOW compara com o objetivo e diz se é conforme.'],
       ['printer','Folha de rosto','Imprima em PT, ES, EN ou FR.']],
    x:[[OK,'Conforme'],[BAD,'Não conforme'],[WARN,'Leituras fora'],[MUTE,'Sem critério']]},

  /* ---------- Indicadores ---------- */
  painel:{s:'Os números-chave de todas as áreas',
    p:[['chart','Ler','Só leitura: atualiza-se sozinho com o que é registado.'],
       ['alert','Cores','Barras abaixo de 90% aparecem a vermelho.']]},
  'ind-qualidade':{s:'Tendências, Pareto e custos de qualidade',
    p:[['filter','Escolher','Separador FII, FIQ ou Fornecedores e o ano.'],
       ['chart','Analisar','Por mês, Pareto de defeitos, setor e máquina de origem.'],
       ['printer','PDF semanal','“Gerar PDF FII / FIQ”: escolha a semana e, se quiser, envie à mailing list.']]},

  /* ---------- Configuração ---------- */
  dados:{s:'Máquinas e operadores usados em todo o FLOW',
    p:[['list','Máquinas','“+ Máquina”: nome oficial, velocidade (para o OEE), corpos e outros nomes.'],
       ['people','Operadores','“Carregar lista”: cole do Excel Nome; Setor; N.º; Função.'],
       ['edit','Corrigir','Clique numa linha para editar.']],
    d:'<b>Outros nomes usados:</b> “R908, Roland 908” passam a contar como a mesma máquina.'},
  'qualidade-dados':{s:'Juntar nomes escritos de maneiras diferentes',
    p:[['search','Ver diferenças','Nomes nos registos que não batem com os Dados mestre.'],
       ['link','Associar','Escolha o nome oficial e “Associar” — ou “Aceitar N sugestões”.'],
       ['check','Resultado','Os indicadores passam a somar tudo na mesma máquina, operador ou cliente.']],
    x:[[WARN,'Sem correspondência'],[INFO,'Associado'],[OK,'Oficial']]},
  perfis:{s:'Quem pode fazer o quê',
    p:[['key','Perfil','Stock, Técnico de impressão, Qualidade, Logística.'],
       ['person','Adicionar','Procure a pessoa e carregue em “+ Nome”.'],
       ['shield','Regra','Perfil sem pessoas = aberto a todos. Os editores podem tudo.']]},
  email:{s:'Envio automático de emails',
    p:[['gear','Instalar','Siga os 6 passos de “Instalação” (uma vez, ~5 min).'],
       ['link','Ligar','“Configurar ligação”: URL do Apps Script e token.'],
       ['mail','Testar','“Verificar ligação” e “Enviar email de teste”; depois os destinatários de cada serviço.']]},
  etiquetas:{s:'Etiquetas QR para colar nas máquinas',
    p:[['filter','Escolher','Máquinas, cauchos ou OF.'],
       ['printer','Imprimir','Botão “Imprimir”.'],
       ['qr','Ler','Lido com o telemóvel ou tablet, abre logo o modo posto ou a OF.']]},
  auditoria:{s:'Quem mudou o quê, e quando',
    p:[['search','Procurar','Filtre por ferramenta, pessoa ou texto.'],
       ['history','Ler','Cada criação, alteração e eliminação fica registada.']],
    x:[[OK,'Criar'],[INFO,'Alterar'],[BAD,'Eliminar']]},
  ferramentas:{s:'Apps fora do FLOW, no setor certo',
    p:[['plus','Acrescentar','“+ Ferramenta”: nome, endereço, setor e estado.'],
       ['link','Aparece no setor','Com ↗ — abre noutra janela.']]}
};
/* rotas que partilham o mesmo guia */
G['intervencoes-cv']=G.intervencoes;
G['producao-imp']=G['producao-cv']=G['producao-col']={s:'Produção e OEE de cada máquina',
  p:[['tablet','No posto','O operador regista no tablet (“Modo posto”): início, paragens, quantidades e fim.'],
     ['plus','Ou aqui','“+ Registo”: máquina, OF, início, fim, quantidade boa, desperdício e paragens.'],
     ['chart','OEE','Disponibilidade × performance × qualidade, por registo e por máquina.'],
     ['alert','Paragens','“Motivos de paragem” mostra onde se perde mais tempo.']],
  x:[[OK,'OEE ≥ 65%'],[WARN,'≥ 45%'],[BAD,'< 45%'],[INFO,'A decorrer: sem hora de fim']]};
G['posto-']={s:'Registar a produção desta máquina',
  p:[['person','Identificar-me','N.º de colaborador. “Trocar” muda de operador.'],
     ['play','Iniciar OF','Escreva a OF e carregue em “Iniciar”.'],
     ['stop','Paragem','Máquina parada? “Paragem” e escolha o motivo. Depois “Retomar produção”.'],
     ['check','Terminar','“Registar quantidade” ao longo do turno e “Terminar OF” no fim.']],
  x:[[OK,'A produzir'],[BAD,'Parada']]};
A.GUIAS=G;

function aberto(r){ try{ return localStorage.getItem('flow_guia_'+r)!=='0' }catch(e){ return true } }
function guarda(r,v){ try{ localStorage.setItem('flow_guia_'+r, v?'1':'0') }catch(e){} }

A.guia=function(main, r){
  var g=G[r] || (r.indexOf('posto-')===0? G['posto-'] : r.indexOf('of-')===0? G['of-'] : null); if(!g) return;
  if(G['posto-']===g || G['of-']===g) r=r.indexOf('posto-')===0? 'posto-' : 'of-';   /* um só estado aberto/fechado para todas as máquinas / OF */
  var h=main.querySelector('.head, .shero'), sec=A.sectorOf(r), c=(sec&&sec.c)||'var(--brand)';
  var el=document.createElement('details'); el.className='guia'; el.style.setProperty('--c',c); if(aberto(r)) el.open=true;
  el.innerHTML='<summary><span class="q">?</span><span>Como funciona</span><span class="gs">'+esc(g.s||'')+'</span><span class="gt">'+'Guia'+'</span></summary>'+
    '<div class="guia-b"><div class="guia-steps">'+g.p.map(function(p,i){ return (i?'<span class="guia-arr">'+ARR+'</span>':'')+
      '<div class="guia-step"><div class="gi"><b></b>'+svg(p[0])+'</div><h4>'+esc(p[1])+'</h4><p>'+esc(p[2])+'</p></div>' }).join('')+'</div>'+
    (g.x? '<div class="guia-x">'+g.x.map(function(x){ return '<span><i style="background:'+x[0]+'"></i>'+esc(x[1])+'</span>' }).join('')+'</div>' : '')+
    (g.d? '<div class="guia-d">'+g.d+'</div>' : '')+
    '<div class="guia-ok"><button type="button" class="btn sm ghost">Percebi, esconder</button></div></div>';
  el.addEventListener('toggle',function(){ guarda(r, el.open) });
  el.querySelector('.guia-ok button').onclick=function(){ el.open=false };
  if(h) h.after(el); else main.prepend(el);
};
})();
