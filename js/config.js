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
     login: "email"     — e-mail da empresa + palavra-passe, aprovação pelo master em Configuração › Utilizadores (docs/SEGURANCA.md);
     login: "microsoft" — só contas Microsoft da empresa, depois de a informática configurar o Firebase. */
  login: "email",
  microsoft: { tenant: "" },                 // ID do tenant Entra ID da Hinojosa (pedido à informática)
  dominios: ["graphicsleader.pt"],           // domínios de e-mail autorizados (acrescentar os do grupo)
  admins: [],                                // e-mails com permissão de editor; vazio = todos editores
  masters: []                                // só para login "anonimo"; com login "email" o master é quem tem nivel "master" em flow_utilizadores
  /* Os códigos beta (utilizadores: { CODIGO: {setores, hash} }) foram retirados com a passagem ao login por e-mail. */
};
