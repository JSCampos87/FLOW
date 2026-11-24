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

  /* Segurança (ver docs/SEGURANCA.md):
     login: "anonimo"   — situação atual: qualquer pessoa com o endereço entra (NÃO usar com dados sensíveis);
     login: "microsoft" — só contas Microsoft da empresa, depois de a informática configurar o Firebase. */
  login: "anonimo",
  microsoft: { tenant: "" },                 // ID do tenant Entra ID da Hinojosa (pedido à informática)
  dominios: ["graphicsleader.pt"],           // domínios de e-mail autorizados (acrescentar os do grupo)
  admins: [],                                // e-mails com permissão de editor; vazio = todos editores

  /* Beta: exigirConta:true obriga a entrar com uma conta (sem entrada anónima).
     Contas = e-mail + palavra-passe criadas na consola Firebase › Authentication › Users.
     Cada conta só vê os setores indicados ("*" = tudo). A palavra-passe NUNCA fica aqui (o site é público).
     Ids dos setores: SECTORS em js/core.js. */
  exigirConta: true,
  contas: {
    "flow.admin@graphicsleader.pt": ["*"],
    "qualidade@graphicsleader.pt": ["qualidade"],
    "embalamento@graphicsleader.pt": ["embalamento"]
  }
};
