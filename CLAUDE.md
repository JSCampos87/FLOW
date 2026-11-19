# FLOW · Graphicsleader

Plataforma interna da Graphicsleader (Hinojosa). App web estática (HTML/CSS/JS, sem build), publicada no GitHub Pages: https://jscampos87.github.io/FLOW/

## Regras obrigatórias

- **Design:** seguir sempre `docs/DESIGN.md` (fontes, cores, componentes, telemóvel). Usar as variáveis de `css/flow.css`; nunca cores ou fontes soltas.
- **Arquitetura:** `docs/ARQUITETURA.md` (setores, `App.register`, `SECTORS`/`TOOLS`/`COLS` em `js/core.js`).
- **Dados:** a base partilhada é o Firebase (`js/config.js`, coleções `flow_*`). `data/*.json` tem dados da empresa e **nunca entra no Git** (o site é público).
- **Apps embutidas:** PCV, Auditorias PCM e Contador de Folhas vivem nos seus repositórios e abrem dentro do FLOW (`js/modules/apps.js`, lista `APPS` em `core.js`).
- Texto da interface em português de Portugal.
- Depois de mudar JS, verificar sintaxe com `node --check`.
