# FLOW · Graphicsleader

Plataforma única de ferramentas da Graphicsleader (Hinojosa Packaging), organizada por setor:
Impressão, Corte e Vinco, Colagem, Embalamento, Logística, Qualidade, Manutenção, Oficina Técnica e Indicadores.

É uma aplicação web **estática** (HTML + CSS + JavaScript, sem build nem dependências de instalação).
Os dados são guardados através de um **adaptador de armazenamento** (`js/store.js`), o que permite correr o mesmo código:

| Onde corre | Adaptador | Dados |
|---|---|---|
| Artifact no claude.ai | `claude` | Base de dados partilhada e contas Claude (situação atual) |
| GitHub Pages / servidor local | `local` | Apenas no browser de quem usa (para desenvolvimento e demonstração) |
| Servidor próprio (futuro) | a criar | Base de dados central + autenticação da empresa |

## Correr localmente

```bash
# na raiz do repositório
python -m http.server 8000
# abrir http://localhost:8000
```

Tem de ser servido por HTTP (não abrir o `index.html` com duplo clique), porque a app lê os ficheiros `data/*.json`.

## Dados históricos (`data/`)

Os ficheiros `data/*.json` são gerados a partir dos Excel da empresa e **não entram no Git** (ver `.gitignore`):
contêm nomes de clientes, operadores e custos.

```bash
pip install openpyxl
python scripts/build_data.py "C:\caminho\para\os\excel"
```

Detalhes em [`data/README.md`](data/README.md). Sem estes ficheiros a app funciona, mas sem o histórico de FII/FIQ/fornecedores,
specs de MM e velocidades por cortante.

## Publicar no GitHub

1. Criar um repositório **privado** (ex.: `graphicsleader/flow`) e fazer push deste conteúdo.
2. GitHub Pages: *Settings → Pages → Source: GitHub Actions* (o workflow `.github/workflows/pages.yml` já está incluído).

> **Atenção:** um site GitHub Pages é **público na internet**, mesmo que o repositório seja privado —
> só o GitHub Enterprise Cloud permite restringir o acesso ao site. Por isso o workflow publica a app **sem** a pasta `data/`.
> Não publicar dados da empresa no Pages até existir um servidor com autenticação (ver `docs/ARQUITETURA.md`).

## Estrutura

```
index.html              casca da app (cabeçalho com setores, barra de ferramentas do setor)
css/flow.css            identidade visual (verde Hinojosa, Barlow / Barlow Condensed / IBM Plex Mono)
assets/logo.png         logótipo Hinojosa
js/store.js             adaptadores de dados (claude | local) — ponto único para ligar um servidor
js/core.js              setores, navegação, formulários, tabelas, perfis, importador Excel
js/charts.js            gráficos SVG (linhas, barras, barras horizontais) com tooltip
js/modules/
  impressao.js          Reservas de verniz · Cauchos · Intervenções técnicas (Impressão e Corte e Vinco) · Controlo de águas
  qualidade.js          FII / FIQ · Controlo de cartolina
  fornecedores.js       Reclamações a fornecedores · painéis de indicadores de qualidade
  embalamento.js        Plano de cargas e pessoas · Specs por MM · Velocidades por cortante
  indicadores.js        Painel geral
  config.js             Início · Visão geral de cada setor · Dados mestre · Perfis · Ferramentas externas
scripts/build_data.py   Excel → data/*.json
docs/ARQUITETURA.md     arquitetura, modelo de dados, como acrescentar módulos e ligar um servidor
```

## Fluxo de trabalho sugerido

- Um ramo por módulo (`impressao/cauchos`, `qualidade/fiq`, …) e *pull request* para `main`.
- Testar localmente em modo `local`; publicar no claude.ai (adaptador `claude`) enquanto não houver servidor próprio.
- Registar pontos em aberto como *issues* com a etiqueta do setor.
