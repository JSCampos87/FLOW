/* FLOW — configuração da base de dados partilhada.
   Usa o mesmo projeto Firebase da app PCV (pcv-ferramentas). Todas as coleções do FLOW
   ficam com o prefixo "flow_" para não se misturarem com as do PCV.
   A chave do Firebase é pública por natureza; a proteção está nas regras do Firestore
   (só utilizadores autenticados — login anónimo da app — podem ler e gravar).
   Para trabalhar só neste browser (sem base partilhada), apague o bloco "firebase". */
window.FLOW_CONFIG = {
  firebase: {
    apiKey: "AIzaSyDXbQYTg5b3oEY9LD1l0uX-yWzha5h7uQ0",
    authDomain: "pcv-ferramentas.firebaseapp.com",
    projectId: "pcv-ferramentas",
    storageBucket: "pcv-ferramentas.firebasestorage.app",
    messagingSenderId: "894420989495",
    appId: "1:894420989495:web:3f3953ef08d870b3b1f1b2"
  },
  prefixo: "flow_",

  /* Requisições de materiais (Colagem): para quem segue o email com a requisição (pode mudar-se em Configuração › requisicoes.email). */
  requisicoes: { email: "ebenezer.souza@graphicsleader.pt" },

  /* Segurança (ver docs/SEGURANCA.md):
     login: "anonimo"   — situação atual: qualquer pessoa com o endereço entra (NÃO usar com dados sensíveis);
     login: "microsoft" — só contas Microsoft da empresa, depois de a informática configurar o Firebase. */
  login: "anonimo",
  microsoft: { tenant: "" },                 // ID do tenant Entra ID da Hinojosa (pedido à informática)
  dominios: ["graphicsleader.pt"],           // domínios de e-mail autorizados (acrescentar os do grupo)
  admins: [],                                // e-mails com permissão de editor; vazio = todos editores
  masters: ["HJGLPKMASTER"],                 // nível master: contas (código beta) ou e-mails com acesso total (exportar/importar dados mestre…)

  /* Beta: utilizadores do FLOW (como no PCV: o utilizador é também a palavra-passe). Com esta lista preenchida, é obrigatório entrar.
     Cada utilizador só vê os setores indicados ("*" = tudo); ids dos setores: SECTORS em js/core.js.
     Guarda-se só o hash SHA-256 do código (em maiúsculas). Novo utilizador:
       node -e "console.log(require('crypto').createHash('sha256').update('CODIGO').digest('hex'))"
     Apagar este bloco = volta a entrada livre (anónima). */
  utilizadores: {
    HJGLPKMASTER: { setores: ["*"],           hash: "ed8b04f489f85e2d3906151eb8d1391c5e8b4e6c1ac107dc935bf5a189301e5c" },
    HJGLPKQUA:    { setores: ["qualidade"],   hash: "1f8551cb979c19a3739386c4b65ef568607b3e0c0e5bc098a964dcfa89f23060" },
    HJGLPKEMB:    { setores: ["embalamento"], hash: "b1c9f02f2c396c6b49b7fabe25d3eab574e7c610d95bf409afcab71cc727a373" }
  }
};
