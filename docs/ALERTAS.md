# Alertas

## No FLOW (já funciona)
O sino do cabeçalho conta os alertas por ver; a página `#alertas` lista-os e permite ajustar os limites
(guardados em `flow_config/alertas`). São calculados no browser a partir dos dados:

| Grupo | Alerta | Limite por omissão |
|---|---|---|
| Produção | OF aberta há demasiado tempo (esqueceram-se de terminar) | 12 h |
| Produção | Máquina parada há demasiado tempo | 60 min |
| Qualidade | FIQ em aberto | 15 dias |
| Qualidade | Reclamação a fornecedor em aberto | 30 dias |
| Manutenção | Intervenção com data prevista ultrapassada | — |
| Impressão | Água fora do limite na última medição · sem medição há X dias | 7 dias |
| Impressão | Caucho montado há demasiado tempo · reserva de verniz expirada | 90 dias |
| Dados | Nomes de máquina sem correspondência nos dados mestre | — |

Mais de 5 casos do mesmo tipo juntam-se num só alerta.

## Para o Teams / e-mail (precisa de servidor)
Um site estático não pode enviar mensagens para o Teams (o browser bloqueia e o endereço do webhook ficaria público).
Solução: uma **Cloud Function** agendada no mesmo projeto Firebase, que corre a cada hora, calcula os mesmos alertas
e envia os novos para um canal do Teams.

1. No Teams: canal › **Fluxos de trabalho** › "Publicar num canal quando é recebido um pedido de webhook" › copiar o URL.
2. Guardar o URL como segredo: `firebase functions:secrets:set TEAMS_WEBHOOK`
3. Função (esqueleto — `functions/index.js`):

```js
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin'); admin.initializeApp();
const TEAMS = defineSecret('TEAMS_WEBHOOK');

exports.alertasFlow = onSchedule({ schedule: 'every 60 minutes', secrets: [TEAMS], region: 'europe-west1' }, async () => {
  const db = admin.firestore(), agora = Date.now(), msgs = [];
  const prod = await db.collection('flow_producao').where('estado', '==', 'aberta').get();
  prod.forEach(d => { const r = d.data();
    (r.paragens || []).forEach(p => { if (p.ini && !p.fim && agora - Date.parse(p.ini) > 60 * 60e3)
      msgs.push(`⛔ ${r.maquina} parada há ${Math.round((agora - Date.parse(p.ini)) / 60e3)} min (${p.motivo}) — OF ${r.of}`); }); });
  // … repetir para FIQ em aberto, águas fora do limite, intervenções vencidas (ver js/modules/alertas.js)
  if (msgs.length) await fetch(TEAMS.value(), { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: msgs.join('\n\n') }) });
});
```
Exige o plano Blaze do Firebase (pago por uso; para este volume o custo é residual).
