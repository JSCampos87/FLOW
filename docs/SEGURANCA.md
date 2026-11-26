# Segurança do FLOW

## Login por e-mail da empresa (login:"email") — caminho atual

Leve: só usa o Firebase Auth que o FLOW já carrega. As palavras-passe ficam no Firebase (cifradas); ninguém as vê.

**Como funciona**
1. A pessoa abre o FLOW › **Criar conta** com o e-mail da empresa (domínios em `dominios` de `js/config.js`).
2. Recebe um link de confirmação no e-mail (prova que o e-mail é dela). Até confirmar, não entra.
3. Fica **pendente**: o master recebe um alerta no sino e um e-mail (endereço em Configuração › Utilizadores).
4. O master abre **Configuração › Utilizadores**, escolhe **nível**, **setores** e **permissões por módulo**.
5. Esqueceu-se da palavra-passe: “Esqueci-me da palavra-passe” no ecrã de entrada, ou o master carrega em “Enviar link de nova palavra-passe”.

**Níveis:** operador (regista; não elimina) · supervisor · gestor (todos os setores; elimina) · diretor (só consulta) · master (tudo).
**Permissões** (`ROLES` em `js/core.js`) são fechadas: só quem as tem altera esse módulo; os outros veem e exportam ("modo consulta").
A guarda está no browser (`guarda` em core.js, `js/acessos.js`) **e** no servidor (`firestore.rules`).
Limite conhecido: o filtro por setor é só da interface (as coleções são partilhadas entre setores); níveis e permissões de módulo são verificados no servidor.

**Ligar (uma vez, por esta ordem)**
1. Consola Firebase › **Authentication › Sign-in method › Email/Password › Ativar**. (Opcional: Templates › idioma Português.)
2. Em `js/config.js`: `login: "email"`. Publicar.
3. O master cria conta e confirma o e-mail. Fica pendente.
4. Consola Firebase › **Firestore › flow_utilizadores › (o documento com o seu e-mail)** › mudar `nivel` para `master`. Recarregar o FLOW.
5. Configuração › Utilizadores › escrever o e-mail para avisos › Guardar.
6. Consola Firebase › **Firestore › Regras** › colar `firestore.rules` › **Publicar**. Antes deste passo, os dados ainda estão abertos.
7. Apagar o bloco `utilizadores` (códigos beta) de `js/config.js`.

Tablets no chão de fábrica: uma conta por posto (ex.: posto.xl105@…) com nível operador; o operador identifica-se no modo posto com o n.º de colaborador.

---

# Alternativa: login Microsoft

## Situação atual (a corrigir)

- O site está publicado no GitHub Pages (`https://jscampos87.github.io/FLOW/`), que é **público**.
- A app entra no Firebase com **login anónimo automático**. Quem souber o endereço consegue ler e gravar
  tudo o que está nas coleções `flow_*` — incluindo o histórico de FII/FIQ/fornecedores enviado por
  `scripts/upload_hist.mjs` (clientes, operadores, custos).
- A chave do Firebase em `js/config.js` é pública por natureza; a proteção tem de estar nas **regras** e no **login**.

## Objetivo

Só entram pessoas com **conta Microsoft da empresa** (Entra ID / Azure AD), e o Firestore recusa tudo o resto.
O código já está preparado (`js/store.js`, `firestore.rules`); falta a configuração, que precisa da informática.

## Passos

### 1. Informática — registar a app no Entra ID
1. Portal Azure › **Microsoft Entra ID › Registos de aplicações › Novo registo**.
2. Nome: `FLOW Graphicsleader`. Tipos de conta: **só contas deste diretório organizacional**.
3. URI de redirecionamento (Web): `https://pcv-ferramentas.firebaseapp.com/__/auth/handler`
4. Em **Certificados e segredos**, criar um segredo de cliente.
5. Anotar: **ID da aplicação (cliente)**, **ID do diretório (tenant)** e o **segredo**.

### 2. Firebase — ativar o fornecedor Microsoft
1. Consola Firebase › projeto `pcv-ferramentas` › **Authentication › Sign-in method › Adicionar › Microsoft**.
2. Colar o ID da aplicação e o segredo do passo 1. Guardar.
3. Em **Authentication › Settings › Authorized domains**, confirmar que existe `jscampos87.github.io`.

### 3. FLOW — ligar o login
Em `js/config.js`:
```js
login: "microsoft",
microsoft: { tenant: "<ID do diretório>" },
dominios: ["graphicsleader.pt", "hinojosa.es"],   // domínios de e-mail autorizados
admins: ["joao.campos@graphicsleader.pt"]         // quem pode editar dados mestre, perfis, etc.
```
Publicar (commit + push). Ao abrir o FLOW aparece "Entrar com a conta Microsoft".

### 4. Firestore — publicar as regras
Consola Firebase › **Firestore › Regras** › colar o conteúdo de `firestore.rules` › **Publicar**.
A partir daqui as coleções `flow_*` só respondem a contas Microsoft dos domínios autorizados.
As outras apps (PCV, Auditorias PCM, Contador) continuam a funcionar como hoje até migrarem.

> Fazer o passo 4 **depois** do 3, senão o FLOW fica sem acesso até o login estar ligado.

### 5. Depois de ligado
- O nome de cada pessoa vem da conta Microsoft (deixa de ser escrito à mão).
- O **Registo de alterações** (Configuração) passa a mostrar quem fez cada alteração com nome real.
- Tablets partilhados no chão de fábrica: usar uma conta de serviço por posto (ex.: `posto.xl105@…`)
  e o operador identifica-se no **modo posto** com o n.º de colaborador.
- Migrar as outras apps para o mesmo login e mudar a última regra de `firestore.rules` para `empresa()`.

## Modo offline
O Firestore guarda uma cópia local e as escritas em fila quando não há rede (`enablePersistence` em `js/store.js`),
e o `sw.js` guarda a app para abrir sem Wi-Fi. Ao voltar a rede, sincroniza sozinho.
