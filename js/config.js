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

  /* Beta: utilizadores do FLOW. Com esta lista preenchida, é obrigatório entrar.
     Cada utilizador só vê os setores indicados ("*" = tudo); ids dos setores: SECTORS em js/core.js.
     A palavra-passe NUNCA fica aqui (o site é público): só o hash SHA-256 de "UTILIZADOR:palavra-passe".
     Novo utilizador/palavra-passe: node -e "console.log(require('crypto').createHash('sha256').update('UTILIZADOR:pass').digest('hex'))"
     Apagar este bloco = volta a entrada livre (anónima). */
  utilizadores: {
    HJGLPKADM: { setores: ["*"],           hash: "d63a1b8e6a73e3851956201b3a7b14d486f23a78469674895d7641e4db8e5060" },
    HJGLPKQUA: { setores: ["qualidade"],   hash: "7624ee1fcccd4cabff4b84ad5812d52a85d6a9ab37833d2cad0451fd0ceefbbd" },
    HJGLPKEMB: { setores: ["embalamento"], hash: "16fb98211a15e3acf09b0c704166eb9c9cad1c50f54287d192e946491f7e1af6" }
  }
};
