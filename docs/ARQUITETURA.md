# Arquitetura do FLOW

## Princípios

1. **Uma app, vários setores.** O cabeçalho mostra só setores; cada setor mostra só as suas ferramentas
   (internas, e externas marcadas com ↗). Nada de ferramentas misturadas.
2. **Dados mestre partilhados.** Máquinas, operadores, setores e perfis existem uma vez e servem todos os módulos.
3. **Armazenamento trocável.** Os módulos nunca falam diretamente com um servidor: usam a interface de `js/store.js`.
4. **Sem build.** HTML/CSS/JS simples; qualquer pessoa da equipa consegue abrir, ler e alterar.

## Camadas

```
index.html ─ css/flow.css
   │
js/core.js        estado (App.S), setores (SECTORS), rotas (#setor / #ferramenta), formulários, tabelas, perfis, importador
js/charts.js      gráficos
js/modules/*.js   ferramentas — cada uma regista uma vista: App.register('id', {html(), bind(root)})
   │
js/store.js       FlowStore.connect() → {mode, db, user}
   ├─ claude      artifact claude.ai (window.claude.use('db'|'user'))
   ├─ local       localStorage (GitHub Pages / desenvolvimento)
   └─ (futuro)    servidor próprio
data/*.json       histórico importado dos Excel (só leitura)
```

## Rotas

A navegação usa apenas `#nome` (sem barras), por compatibilidade com o claude.ai:

- `#inicio` — página inicial com todos os setores
- `#<setor>` — visão geral do setor (ex.: `#qualidade`)
- `#<ferramenta>` — ferramenta (ex.: `#cauchos`, `#incidencias`); o setor ativo é deduzido de `SECTORS`
- `#dados`, `#perfis`, `#ferramentas` — configuração (ícone ⚙)

## Setores e ferramentas

| Setor (`id`) | Ferramentas internas | Externas (registo `ferramentas`) |
|---|---|---|
| Impressão (`impressao`) | `verniz`, `cauchos`, `intervencoes`, `aguas` | — |
| Corte e Vinco (`corte-vinco`) | `intervencoes-cv` | PCV Ferramentas |
| Colagem (`colagem`) | — | — |
| Embalamento (`embalamento`) | `cargas`, `specs` | — |
| Logística (`logistica`) | — | Contador de Folhas · Mapa de entregas · Matérias-primas · Agendamento de cargas |
| Qualidade (`qualidade`) | `incidencias`, `fornecedores`, `cartolina` | Auditorias PCM |
| Manutenção (`manutencao`) | — | — |
| Oficina Técnica (`oficina`) | — | 2 por ligar |
| Indicadores (`indicadores`) | `painel`, `ind-qualidade` | — |

## Coleções de dados

| Coleção | Usada por | Notas |
|---|---|---|
| `maquinas` | todos | `{nome, setor, corpos, verniz, ativo}` — só editores |
| `operadores` | todos | `{nome, numero, setor, funcao, ativo}` — só editores |
| `config` | vários | `perfis` (papéis por utilizador), `limites` (águas), `tiposInt` (tipos de intervenção por setor), `embalamento` |
| `ferramentas` | navegação | ferramentas externas por setor |
| `verniz` | Reservas de verniz | movimentos dentro do documento (`movs`) |
| `cauchos` | Cauchos | uma unidade por documento; `estado: stock | montado | retirado` |
| `intervencoes` | Intervenções | campo `setor` separa Impressão e Corte e Vinco |
| `aguas` | Controlo de águas | uma folha de medição por documento (`leituras` por ponto) |
| `incidencias` | FII / FIQ | registos novos + alterações ao histórico (`id` igual ao do histórico) |
| `recfor` | Reclamações a fornecedores | idem |
| `cartolinas`, `cartolinactrl` | Controlo de cartolina | biblioteca em blocos (`p0…pn`) + controlos |
| `emb_mapas` | Plano de cargas | mapas importados (em blocos de 500 linhas) |
| `emb_planos` | Plano de cargas | um plano por mapa+data: pessoas, capacidade, atribuições |
| `emb_mm`, `emb_mmx`, `emb_cort`, `emb_cortx` | Specs / velocidades | importações em bloco + alterações individuais (sobrepõem-se a `data/mm.json` e `data/cort.json`) |

## Perfis

Papéis em `config/perfis`: `stock` (Marcelo / Inkmaker), `tecnico` (supervisor técnico), `qualidade`.
Os editores da app podem tudo. Um papel sem pessoas atribuídas fica aberto a todos.
**Hoje a verificação é feita na interface** — com um servidor próprio deve passar para regras no servidor.

## Acrescentar uma ferramenta

1. Criar a vista num ficheiro de `js/modules/` (ou num novo, incluído no `index.html`):
   ```js
   App.register('minha-ferramenta', {
     html: function(){ return App.head({c:'var(--c-col)', mod:'Colagem', title:'…', p:'…'}) + '…' },
     bind: function(root){ /* eventos */ }
   });
   ```
2. Em `js/core.js`: acrescentar o `id` à lista `tools` do setor em `SECTORS` e o nome em `TOOLS`.
3. Se guarda dados, acrescentar a coleção a `COLS` (em `core.js`).
4. Na página inicial (`config.js`), opcionalmente uma descrição em `TDESC`.

## Ligar um servidor próprio (quando chegar a autenticação)

Escrever um adaptador em `js/store.js` com a mesma interface e escolhê-lo em `FlowStore.connect()`:

```js
db.collection(nome).onSnapshot(fn, erro)  // fn({docs:[{id, data()}]}) — chamado no início e a cada alteração
db.collection(nome).add(obj)              // → Promise<{id}>
db.doc('colecao/id').set(obj) / .update(campos) / .delete()
user.id() / user.canEdit() / user.me() / user.profiles(ids) / user.search(texto)
```

Opções naturais: **Supabase** ou **Firebase** (tempo real nativo, autenticação por e-mail/Microsoft),
ou uma **API interna** sobre a infraestrutura Microsoft 365 / SharePoint do grupo (login com a conta Hinojosa).
A migração dos dados atuais faz-se exportando cada coleção (no claude.ai ou com "Exportar cópia" em modo local).

## Pendentes conhecidos

- Specs de MM sem cantoneiras / tampo de madeira / altura da palete (campos editáveis, falta fonte de dados).
- Só 14 dos 49 MM do mapa de entregas de exemplo têm specs; os restantes usam velocidade média (assinalado).
- FII históricas sem estado; reclamações a fornecedores com a coluna "Fechada" incompleta.
- Ferramentas externas de Logística e Oficina por ligar.
- Perfis verificados só na interface.

## MES — peças transversais (nov. 2026)

| Peça | Ficheiro | Rota | Notas |
|---|---|---|---|
| Página da OF | `js/modules/of.js` | `#of-<OF>`, `#mm-<MM>` | Linha do tempo com produção, paragens, cauchos, águas do dia, verniz, intervenções, FII/FIQ, entregas e specs. Botão 🔍 no cabeçalho ou `Ctrl+K`. |
| Produção e OEE | `js/modules/producao.js` | `#producao-imp`, `#producao-cv`, `#producao-col` | Coleção `producao`: `{setor, maquina, of, mm, operador, turno, inicio, fim, qtdBoa, qtdDesperdicio, velNominal, paragens:[{motivo, ini, fim, min}], estado:'aberta'|'fechada'}`. Motivos de paragem por setor em `config/motivosParagem`. |
| Modo posto | `js/modules/posto.js` | `#posto`, `#posto-<id máquina>` | Ecrã de tablet junto à máquina; operador entra com o n.º de colaborador (válido 12 h no dispositivo). Esconde a navegação (`body.kiosk`). |
| Dados mestre únicos | `js/modules/mestre.js` | `#qualidade-dados` | `A.canon(tipo, valor)` devolve o nome oficial (máquinas e operadores dos dados mestre, aliases em `aliases`, e `maquinas.aliases`). As incidências passam por `A.canonInc`. |
| Etiquetas QR | `js/modules/mestre.js` | `#etiquetas` | QR das máquinas (abre o modo posto), cauchos (`#caucho-<código>`) e OF. Biblioteca `js/vendor/qrcode.js` (MIT). |
| Registo de alterações | `js/core.js` (`audit`) + `mestre.js` | `#auditoria` | `add/put/del` escrevem em `auditoria` quem/quando/o quê. Nas regras do Firestore é só de acrescentar. |
| Alertas | `js/modules/alertas.js` | `#alertas` + sino | Limites em `config/alertas`. Envio para Teams: `docs/ALERTAS.md`. |
| Login Microsoft + offline | `js/store.js`, `firestore.rules`, `sw.js` | — | Ver `docs/SEGURANCA.md`. |

Rotas com parâmetro: `App.registerPrefix('of-', vista)` e `App.routeArg()` dentro da vista.
Indicadores (gráficos de tendência, OEE por período, etc.) ficam a cargo do módulo de Indicadores.

## Impressão — apps do supervisor integradas (nov. 2026)

As apps que o supervisor de impressão fez à parte passaram para dentro do FLOW, com os dados na base partilhada (deixam de ficar presos a um browser com PIN):

| App do supervisor | No FLOW | Coleções |
|---|---|---|
| Gestão de Cauchus Roland 908 E / XL 105, folha CD2 do Excel de consulta | Impressão › **Reservas de verniz** (procura por cortante ou SAP, posição/cor, por posição) | `rv_lib` (blocos) + `rv_libx` (alterações) |
| Offset Print — avarias e alterações, MT garras/rolamentos, registo de troca de rolos, densidades | Impressão › **Intervenções técnicas** (separadores Por corpo, Avarias, Densidades) | `intervencoes`, `densidades` |
| Offset Print — películas, anilox, alceamento, rolagem com esquema, consumíveis, observações | Impressão › **Ficha técnica das máquinas** | `imp_tec` (campo `tipo`) |

- Importação: botão **Importar** (Reservas) / **Importar do supervisor** (Ficha técnica). Aceita os .html das apps, as cópias .json ("Exportar cópia") e os dois Excel. Os ids são determinísticos: voltar a importar não duplica intervenções; a biblioteca de uma máquina é substituída.
- Os nomes de máquina do supervisor (R908 E, XL 105, CD2/CD102) são ligados às máquinas dos Dados mestre (`Reservas.maqDe`).
- As sobras de verniz em kg (versão anterior de "Reservas de verniz") continuam no separador **Sobras de verniz (kg)**.
- Ligações: página do MM mostra as reservas do cortante; modo posto tem "Reserva de verniz" e "Avaria"; alertas para avarias em aberto e rolos sem stock.
- Esquemas dos rolos em `img/rolos/` (r908, xl105, cd102).

### Revisão (24 nov. 2026): apps do supervisor espelhadas
- **Gestão de Cauchus** (rota `verniz`): um separador por máquina, com o mesmo ecrã das apps Roland 908 E / XL 105: 3 contadores, pesquisa por cortante ou SAP, filtro por posição (908 E, CD2) ou por cor (XL 105), ordenação SAP e as mesmas colunas. Os dados continuam em `rv_lib` + `rv_libx`.
- **Offset Print** (rota `offset-print`, `js/modules/offset.js`): espelho da app, com os mesmos separadores, colunas, pesquisa, adicionar/editar/eliminar e o painel de cartões. A Rolagem tem esquema + "Registo de substituição / alteração de rolos". Coleções `op_folhas`, `op_linhas`, `op_rolos`; importa o .html, a cópia .json ou o Excel.
- A **Ficha técnica** (`ficha-imp`) saiu do menu (a rota continua a funcionar). Os rolos do registo de intervenções e o alerta "rolo sem stock" passam a vir das folhas Rolagem do Offset Print (`Offset.rolos`), com recurso a `imp_tec` se ainda não houver importação.
- Sem PIN de edição: no FLOW quem edita é o perfil técnico de impressão / stock / editor.

### Impressão reorganizada (24 nov. 2026)
Menu da Impressão, por esta ordem: **Cauchos** · **Reservas de verniz** · **Controlo de águas** · **Intervenções técnicas**.
- **Cauchos** (`js/modules/cauchos.js`, coleção `cauchos_req`): o operador requisita o caucho (máquina, corpo, MM, motivo, contador); a tiragem do caucho que sai = contador agora − contador da troca anterior no mesmo corpo (editável). O stock marca entregue/cancelada. Separadores: Requisições, Por máquina, Tiragem (médias por máquina/corpo, pedidos por mês) e Registo anterior (coleção `cauchos`, só leitura).
- **Reservas de verniz** (rota `verniz`): as posições das reservas da XL 105 e da Roland 908 E (apps do supervisor), um separador por máquina.
- Produção/OEE (`producao-imp`), Offset Print (`offset-print`) e Ficha técnica (`ficha-imp`) saíram do menu; as rotas e os dados continuam.

## Qualidade — preenchimento automático, relatório PDF e exportação (25 nov. 2026)

- **FII / FIQ, preenchimento automático** (`js/modules/qualidade.js`, `ofInfo`): ao escrever a OF ou o MM, o formulário preenche MM, cliente, artigo e cortante (como o PROCV do Excel das reclamações). OF → MM pelas incidências anteriores, produção e mapa de entregas; MM → artigo e cortante pelas specs (`Embalamento.specs()`: SAP + Dados + alterações), cliente pelas incidências anteriores e specs. Só escreve em campos vazios ou já preenchidos automaticamente. Na FIQ a secção "Onde foi detetado" não aparece (`setorDetetado='Cliente'`).
- **Relatório PDF** (`js/modules/relqualidade.js`): botão "Gerar PDF" em Incidências FII/FIQ e em Indicadores de qualidade. Período livre, comparação com o período homólogo, montado no browser (html2canvas + jsPDF do cdnjs). Mailing list e envio automático em `config/relqualidade` (`lista`, `cc`, `assunto`, `auto`, `ultimoEnvio`). Envio por `A.mail.send` (Configuração › Email, `config/email`) com o PDF em anexo — exige a versão de `scripts/email-apps-script.gs` com `attachments` (nova implementação no Apps Script).
- **Exportar Excel** (cópia de segurança semanal): FII e FIQ (folha `BD`) e fornecedores (folha `Seixezelo`), cada valor na mesma coluna que a importação lê, por isso o ficheiro volta a ser importável. Títulos das colunas: os do último Excel importado (`config/qualidadeCab`, gravado em cada importação). Campos só do FLOW em colunas "FLOW · …" no fim. Última exportação em `config/qualidadeExport`; aviso na página quando passa de 7 dias. `incList`/`rfList` deduplicam por n.º (o registo do FLOW prevalece) para a reimportação não criar duplicados.
- **Folhas de rosto** (`js/modules/rosto.js`, `Q2.rosto(tipo, registo)`): botão "Imprimir folha de rosto" no detalhe da FII, da FIQ e da reclamação a fornecedor, e "Imprimir relatório de ensaio" no controlo de cartolina. A FIQ segue as folhas "Folha Rosto_PT / _cliente / _EN" do Excel das reclamações de clientes (escolhe-se a versão). Imprime por um iframe com estilos próprios (A4).
- **Email transversal** (`#email`, em Configuração; código em `js/modules/config.js`): uma só ligação ao Google Apps Script do FLOW (`scripts/email-apps-script.gs`, projeto próprio "FLOW Email", não o do PCV) para todos os serviços. `config/email` guarda `scriptUrl`, `token`, `requisicoes` (destinatário) e `ultimoTeste`. `A.mail.send(to, cc, assunto, texto, anexos)` envia; a página tem verificação da ligação, email de teste com anexo e os destinatários de cada serviço.
