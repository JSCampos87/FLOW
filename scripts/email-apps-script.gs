/* FLOW – envio automático de emails (requisições de materiais e outros avisos) por uma conta Google.
   Instalação (uma vez, ~5 minutos), com a conta Google que vai enviar:
   1. https://script.google.com › Novo projeto › apagar o que lá está › colar este ficheiro todo › Guardar (nome: FLOW Email).
   2. Trocar o TOKEN abaixo por um código secreto seu (ex.: 30 letras e números ao acaso). NÃO o publique no GitHub.
   3. Escolher a função "teste" › Executar › Autorizar (envia um email de teste para a própria conta).
   4. Implementar › Nova implementação › tipo "Aplicação Web": Executar como: Eu · Quem tem acesso: Qualquer pessoa › Implementar.
   5. No FLOW: Configuração (roda dentada) › Email › "Configurar ligação" › colar o URL (termina em /exec) e o mesmo TOKEN › "Enviar email de teste".
   Versão 2: anexos (relatório PDF de qualidade) e tradução (folhas de rosto em ES / EN / FR).
   Atualização: colar esta versão (mantendo o seu TOKEN), Guardar › Implementar › Gerir implementações ›
   editar (lápis) › Versão: Nova versão › Implementar. O URL /exec mantém-se.
   Proteções: só envia para os domínios da lista DOMINIOS, exige o TOKEN e tem um limite diário. */

const TOKEN = 'TROCAR_POR_UM_CODIGO_SECRETO';
const DOMINIOS = ['graphicsleader.pt', 'hinojosa.com', 'hinojosagroup.com'];
const NOME = 'FLOW Graphicsleader';
const MAX_DIA = 90;

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (TOKEN === 'TROCAR_POR_UM_CODIGO_SECRETO') return out({ ok: false, err: 'o script implementado ainda tem o TOKEN por definir (TROCAR_POR_UM_CODIGO_SECRETO): defina-o, guarde e implemente uma nova versão' });
    if (String(d.token || '').trim() !== TOKEN.trim()) return out({ ok: false, err: 'token inválido: o token guardado no FLOW (Configuração › Email) não é igual ao do script implementado' });
    /* tradução (folhas de rosto em ES / EN / FR): {acao:'traduzir', de:'pt', para:'es', textos:[...]} — Google Tradutor, sem chave */
    if (d.acao === 'traduzir') {
      const para = String(d.para || ''), de = String(d.de || 'pt');
      if (['es', 'en', 'fr', 'pt'].indexOf(para) < 0) return out({ ok: false, err: 'língua não suportada' });
      const textos = (Array.isArray(d.textos) ? d.textos : []).slice(0, 30).map(t => String(t || '').slice(0, 5000));
      return out({ ok: true, textos: textos.map(t => t.trim() ? LanguageApp.translate(t, de, para) : '') });
    }
    const to = lista(d.to), cc = lista(d.cc);
    if (!to.length) return out({ ok: false, err: 'sem destinatários' });
    const fora = to.concat(cc).filter(a => !DOMINIOS.some(x => a.toLowerCase().endsWith('@' + x)));
    if (fora.length) return out({ ok: false, err: 'domínio não autorizado: ' + fora.join(', ') });
    const p = PropertiesService.getScriptProperties();
    const dia = Utilities.formatDate(new Date(), 'Europe/Lisbon', 'yyyy-MM-dd');
    const n = p.getProperty('dia') === dia ? +p.getProperty('n') : 0;
    if (n >= MAX_DIA) return out({ ok: false, err: 'limite diário de ' + MAX_DIA + ' emails atingido' });
    if (MailApp.getRemainingDailyQuota() < to.length + cc.length) return out({ ok: false, err: 'quota diária do Google esgotada' });
    const msg = { to: to.join(','), subject: String(d.subject || '').slice(0, 250), body: String(d.message || ''), name: NOME };
    if (cc.length) msg.cc = cc.join(',');
    /* anexos opcionais: [{name, mime, b64}] (ex.: relatório PDF de qualidade). Máx. 20 MB no total. */
    const anexos = (Array.isArray(d.attachments) ? d.attachments : []).filter(a => a && a.b64).slice(0, 5)
      .map(a => Utilities.newBlob(Utilities.base64Decode(a.b64), String(a.mime || 'application/pdf'), String(a.name || 'anexo.pdf').slice(0, 120)));
    if (anexos.reduce((s, b) => s + b.getBytes().length, 0) > 20e6) return out({ ok: false, err: 'anexos demasiado grandes (máx. 20 MB)' });
    if (anexos.length) msg.attachments = anexos;
    MailApp.sendEmail(msg);
    p.setProperties({ dia: dia, n: String(n + 1) });
    return out({ ok: true, anexos: anexos.length, restante: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return out({ ok: false, err: String(err) });
  }
}
function doGet() { return out({ ok: true, servico: 'FLOW Email', versao: 2, tokenDefinido: TOKEN !== 'TROCAR_POR_UM_CODIGO_SECRETO', acoes: ['email', 'anexos', 'traduzir'], restante: MailApp.getRemainingDailyQuota() }); }
function lista(v) { return (Array.isArray(v) ? v : String(v || '').split(/[,;]\s*/)).map(s => String(s).trim()).filter(Boolean); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function teste() { MailApp.sendEmail(Session.getActiveUser().getEmail(), '[FLOW] Teste do Apps Script', 'Se recebeste isto, o envio está a funcionar.'); }
