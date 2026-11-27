---
description: Tratar as sugestões de melhoria enviadas pelos utilizadores do FLOW (resumo, esforço, implementação e resposta)
argument-hint: cole aqui o texto copiado em Configuração › Utilizadores › Sugestões › "Enviar ao Claude"
---

O texto abaixo são sugestões de melhoria dos utilizadores do FLOW. Foi copiado do botão "Enviar ao Claude" (Configuração › Utilizadores › Sugestões). Cada sugestão começa com `## <id>`.

$ARGUMENTS

Trata-as assim:

1. **Lê cada sugestão e o código** que ela toca (ver `CLAUDE.md`, `docs/ARQUITETURA.md`, e o módulo do ecrã indicado em "Ecrã").
2. **Responde numa tabela curta**, uma linha por sugestão:
   - id;
   - quem;
   - resumo numa frase;
   - viável? (sim / em parte / não, e porquê);
   - esforço (pequeno = minutos, médio = uma tarde, grande = vários dias);
   - o que farias.

   Junta sugestões repetidas. Separa as que são problemas de uso ou formação (não precisam de código) das que pedem alterações.
3. **Pergunta ao João quais aceita** (pergunta com opções, várias escolhas). Não implementes nada antes da resposta.
4. **Implementa as aceites** seguindo o `CLAUDE.md`:
   - design de `docs/DESIGN.md`;
   - escritas só por `App.add/put/del`;
   - `node --check` em cada JS alterado;
   - texto em português de Portugal.
5. **No fim, para cada sugestão**, dá ao João o que ele copia para "Responder" na app:
   - **Estado:** Implementada, Aceite (fica para depois) ou Não avança.
   - **Esforço:** pequeno, médio ou grande.
   - **Resumo:** uma frase.
   - **Mensagem para a pessoa:** trata por tu e usa o primeiro nome. Tom próximo e motivador, como em `docs/DESIGN.md` › "Tom da motivação". Diz o que mudou e onde o encontra, agradece, e incentiva-a a continuar a sugerir. Máximo 3 frases, sem emojis.
