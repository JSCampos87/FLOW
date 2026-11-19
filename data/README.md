# data/

Ficheiros gerados por `scripts/build_data.py` — **não versionados** (contêm dados da empresa).

| Ficheiro | Origem (Excel · folha) | Conteúdo |
|---|---|---|
| `fii.json` | INDICADORES_FIIs · BD | Fichas de Incidência Interna desde 2024 |
| `fiq.json` | Reclamações Clientes · BD | Fichas de Incidência de Qualidade (reclamações de clientes) |
| `rf.json` | Reclamações a Fornecedores · Seixezelo | Reclamações a fornecedores |
| `mm.json` | Dados · MMs embalamento | Specs de paletização por MM (maços por base/altura, unidades por maço/palete, cortante) |
| `cort.json` | Dados · Dados op | Velocidade de paletização por cortante (uds/h/pessoa, com 1 e 2 pessoas) |
| `mapa.json` | Mapa Entregas Embalamento · Plano EMB | Exemplo de mapa de entregas (importa-se na app) |

Regras de conversão principais:
- Tempos de reprocessamento em minutos no Excel → horas no FLOW.
- FII sem estado no Excel: "Fechada" se tem data de fecho, senão "Registada" (não conta como em aberto).
- FII com data fora do ano indicado na coluna `Ano` → data corrigida para esse ano (`dataAprox: 1`).
- Setores normalizados (ex.: "Fecho/ Colagem" → Colagem, "CV" → Corte e Vinco).
- Velocidade por cortante = Σ unidades ÷ Σ (horas × pessoas); sem medições usa-se a mediana geral.

Os registos históricos são só de leitura: alterações e novos registos ficam na base de dados da app
(um registo com o mesmo `id` substitui o histórico; `_del: true` esconde-o).
