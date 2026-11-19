/* Apps da Graphicsleader dentro do FLOW: PCV Ferramentas, Auditorias PCM, Contador de Folhas.
   Cada uma continua no seu repositório e no seu endereço, mas abre aqui dentro (mesmo site, mesma
   base Firebase), com a navegação do FLOW por cima. A vista tem keep:true para o iframe não
   recarregar quando chegam alterações de dados do FLOW. */
(function(){
var A=App, esc=A.esc;
Object.keys(A.APPS).forEach(function(id){
  var app=A.APPS[id];
  A.register(id,{
    keep:true,
    html:function(){
      var s=A.sectorOf(id);
      return '<div class="app-bar" style="--c:'+s.c+'"><span class="eyebrow">'+esc(s.nome)+'</span><b>'+esc(A.TOOLS[id])+'</b><span class="small muted app-d">'+esc(app.d)+'</span>'+
        '<a class="btn sm" href="'+esc(app.url)+'" target="_blank" rel="noopener" title="Abrir sozinha, em ecrã inteiro">Ecrã inteiro ↗</a></div>'+
        '<iframe class="app-frame" src="'+esc(app.url)+'" title="'+esc(A.TOOLS[id])+'" allow="camera; microphone; clipboard-read; clipboard-write; fullscreen" loading="eager"></iframe>';
    }
  });
});
})();
