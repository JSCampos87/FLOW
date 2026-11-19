# Regras de design do FLOW

Regras visuais obrigatórias para toda a app FLOW e para as ferramentas novas que entram nela.
Os valores vivem em `css/flow.css` (`:root`). **Nunca escrever cores, fontes ou raios soltos no código: usar sempre as variáveis.**
Se uma regra tiver de mudar, muda-se aqui **e** em `css/flow.css` no mesmo commit.

## 1. Identidade

- **Marca:** Hinojosa / Graphicsleader. Símbolo "H" verde (`assets/favicon.png`, `assets/icon-192.png`, `assets/icon-512.png`) e logótipo `assets/logo.png`.
- **Nome da app:** `FLOW` (maiúsculas). Subtítulo: `Graphicsleader`.
- **Tom:** português de Portugal, frases curtas, verbos no imperativo nos botões ("Guardar", "Carregar mapa", "Sugerir distribuição").
- **Banner da página inicial:** `assets/banner.jpg` (ilustração isométrica verde, do escritório à expedição).

## 2. Fontes

| Uso | Família | Variável | Pesos |
|---|---|---|---|
| Títulos (h1–h3), números grandes de KPI | **Barlow Condensed** | `--f-display` | 500, 600, 700 |
| Texto corrente, botões, formulários | **Barlow** | `--f-body` | 400, 500, 600, 700 |
| Números em tabelas, códigos (MM, OF), etiquetas pequenas em maiúsculas | **IBM Plex Mono** | `--f-mono` | 400, 500 |

Carregadas do Google Fonts no `index.html`. Alternativas: Arial Narrow / Segoe UI / Menlo.

**Tamanhos de referência**

| Elemento | Tamanho |
|---|---|
| Corpo | 15px / 1.45 |
| h1 de ferramenta | 32px (27px no telemóvel) |
| h1 da faixa inicial | clamp(28px, 4vw, 40px) |
| h2 de painel | 20px · h2 de modal 24px |
| KPI | 30px Barlow Condensed 700, números tabulares |
| Cabeçalho de tabela | 12px, maiúsculas, espaçamento .04em |
| "Eyebrow" (etiqueta por cima do título) | 10.5–11px IBM Plex Mono 600, maiúsculas, espaçamento .08em, na cor do setor |
| Texto pequeno (`.small`) | 13px |

Números em tabelas e medições: sempre `--f-mono` com `font-variant-numeric: tabular-nums`, alinhados à direita (`.n`).

## 3. Cores

### Base
| Variável | Valor | Uso |
|---|---|---|
| `--bg` | `#f3f5f3` | fundo da página |
| `--surface` | `#ffffff` | painéis, cartões, barra de topo |
| `--surface-2` | `#f1f4f2` | fundos secundários, hover, cabeçalhos de tabela, campos |
| `--line` | `#dde3df` | bordas e separadores |
| `--fg` | `#14212b` | texto principal |
| `--muted` | `#5a6771` | texto secundário |
| `--faint` | `#8b979e` | texto terciário, ícones discretos |

### Marca (verde Hinojosa)
| Variável | Valor | Uso |
|---|---|---|
| `--brand` | `#176b3a` | botão principal, foco, separador ativo, `theme-color` |
| `--brand-2` | `#1f7a42` | hover do botão principal |
| `--brand-deep` | `#0f4426` | faixa escura da página inicial |
| `--brand-soft` | `#e2f0e7` | fundo de separador ativo, realces suaves |

### Estados (sempre em par cor + fundo suave)
| Estado | Cor | Fundo | Exemplos |
|---|---|---|---|
| OK | `--ok` `#2c7a4b` | `--ok-soft` `#dcefe2` | conforme, ativo |
| Aviso | `--warn` `#a86a12` | `--warn-soft` `#f6e8cf` | estimado, por atribuir, banners |
| Erro | `--bad` `#c0392b` | `--bad-soft` `#f8dfdb` | não conforme, sem specs, passa do turno |
| Info | `--info` `#2a6fb8` | `--info-soft` `#e3eefa` | piloto, PDF, cantoneiras |
| Neutro | `--muted` | `--mute-soft` `#e8ecea` | inativo, por ligar |

Semáforo de indicadores: `--st-good #0ca30c`, `--st-warn #fab219`, `--st-crit #d03b3b`.

### Cor de cada setor (`--c`)
Cada setor tem uma cor própria, usada na barra fina do topo dos cartões, no ícone, na "eyebrow" e no sublinhado da navegação. **Nunca para texto corrido nem para fundos grandes.**

| Setor | Variável | Valor |
|---|---|---|
| Impressão | `--c-imp` | `#e0612d` |
| Corte e Vinco | `--c-cv` | `#b07800` |
| Colagem | `--c-col` | `#d4608e` |
| Embalamento | `--c-emb` | `#4f7a0f` |
| Logística | `--c-log` | `#0e8a9a` |
| Qualidade | `--c-qual` | `#176b3a` |
| Manutenção | `--c-man` | `#2a6fb8` |
| Oficina Técnica | `--c-ofi` | `#6a4fa0` |
| Indicadores | `--c-ind` | `#1d4f8f` |
| Configuração | `--c-cfg` | `#5a6771` |

Setor novo: escolher uma cor que não colida com as existentes nem com os estados, acrescentar `--c-<id>` em `:root` e nesta tabela.

### Séries de gráficos
`--s1 #2a78d6` · `--s2 #eb6834` · `--s3 #1baf7a` · `--s4 #eda100` · `--s5 #e87ba4` · `--s6 #008300` · `--s7 #6250d6` · `--s8 #e34948`, por esta ordem.

## 4. Forma e espaço

- Raio: `--r` = **12px** (painéis, cartões, KPIs, tabelas 10px, botões 9px, campos 8px, pills 10px, modal 14px).
- Sombra: `--shadow` só em cartões de setor e em hover; painéis normais ficam só com borda.
- Largura máxima do conteúdo: **1320px**, margens laterais mínimas **16px** (`--pl`/`--pr`, respeitam a área segura do iPhone).
- Espaços entre blocos: 12–16px. Dentro de painéis: 14–16px.
- Barra colorida de setor: 4px no topo (cartões) ou 4–5px à esquerda (cabeçalhos de setor, barra de app embutida).

## 5. Componentes (usar os existentes, não inventar novos)

| Necessidade | Classe / função |
|---|---|
| Cabeçalho de ferramenta | `App.head({c, mod, title, p, acts})` → `.head` com eyebrow na cor do setor |
| Números-chave | `App.kpis([...])` → `.kpis .kpi` (`.warn`, `.bad`) |
| Separadores | `App.tabs(key, items, cur)` → `.tabs` |
| Lista | `App.table(rows, cols, opt)` → `.tw table.t` |
| Formulário | `App.openForm({...})` → modal `.box` com `.form .fld`, grupos com `{t:'sep'}` |
| Botões | `.btn`, `.btn.primary` (1 por ecrã), `.btn.ghost`, `.btn.sm`, `.btn.danger` |
| Etiquetas de estado | `.pill.ok/.warn/.bad/.info/.mute` |
| Avisos | `.banner` (amarelo) · `App.toast(msg)` para confirmações |
| Cartões | `.panel`, `.card`, `.hcard`, `.mod` |
| Filtros | `.filters` com `input[type=search]` e `select` |

Regras:
- **Um só botão principal** (`.primary`) por ecrã ou modal.
- Ações destrutivas pedem confirmação no próprio botão ("Eliminar" → "Confirmar eliminação").
- Ícones: SVG de traço, `stroke-width` 1.8–2, `currentColor`, cantos arredondados. Sem emojis na interface.
- Estados vazios explicam o que fazer a seguir ("Ainda sem specs. Importe…").

## 6. Telemóvel e tablet

- Tudo tem de funcionar a 360px de largura, sem scroll horizontal da página (tabelas largas fazem scroll dentro de `.tw`).
- Alvos de toque ≥ 40px (`.btn` tem `min-height:40px`; `.btn.sm` 32px só em barras densas).
- Campos de pesquisa com `font-size:16px` (o iPhone não faz zoom).
- Arrastar e largar tem sempre alternativa por toque (tocar no item, depois no destino).
- A app instala-se como **FLOW** com o "H" verde (`manifest.webmanifest`, `theme-color #176b3a`).

## 7. Acessibilidade

- Contraste mínimo AA: texto em `--fg` ou `--muted` sobre `--surface`/`--bg`; nunca texto em `--faint` para informação importante.
- Estados nunca só pela cor: juntar sempre palavra ou ícone ("Não conforme", "sem specs").
- Foco visível: `outline 2px var(--brand)`.
- `prefers-reduced-motion` desliga animações.

## 8. Apps embutidas

PCV Ferramentas, Auditorias PCM e Contador de Folhas abrem dentro do FLOW (`js/modules/apps.js`). Quando forem alteradas, devem convergir para estas regras (fontes Barlow/IBM Plex Mono, verde `#176b3a`, raios e estados iguais), para o utilizador não sentir que mudou de app.
