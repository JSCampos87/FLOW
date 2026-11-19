/* Módulo Indicadores: painel transversal com os números-chave de todas as ferramentas da app. */
(function(){
var A=App, S=A.S, $=A.$, esc=A.esc, fmt=A.fmt, I=window.Impressao, Q=window.Qualidade, C='var(--c-ind)';
A.register('painel',{
  html:function(){
    var ano=String(new Date().getFullYear()), anoAnt=String(+ano-1), hoje=A.today(), mmdd=hoje.slice(4);
    var inc=Q.incList(), d=function(i){return String(i.dataIncidencia||i.dataReclamacao||'')};
    var ytd=inc.filter(function(i){return d(i).slice(0,4)===ano}), ytdAnt=inc.filter(function(i){return d(i).slice(0,4)===anoAnt && d(i).slice(4)<=mmdd});
    var st=Q.incStats(ytd), stA=Q.incStats(ytdAnt);
    var cmp=function(a,b){ if(!b) return ''; var p=(a-b)/b*100; return (p>0?'▲ ':'▼ ')+fmt(Math.abs(p),0)+'% vs '+anoAnt };
    var abertas=inc.filter(function(i){return i.estado!=='Fechada'}).length;
    var ct=A.list('cartolinactrl').filter(function(c){return A.days(c.data)<=90}), ctOk=ct.filter(function(c){return c.resultado==='ok'}).length;
    var L=I.leituras().filter(function(r){return A.days(r.data)<=30}), n=0, o=0, porPonto={};
    L.forEach(function(r){ ['alcool','cond','ph'].forEach(function(p){ if(r[p]==null) return; n++; var out=I.outL(r.ponto,p,r[p]); if(out) o++; var k=r.ponto; porPonto[k]=porPonto[k]||{n:0,ok:0}; porPonto[k].n++; if(!out) porPonto[k].ok++ }) });
    var cau=A.list('cauchos'), c30=cau.filter(function(c){return c.montagem && A.days(c.montagem.d)<=30}).length;
    var it=A.list('intervencoes'), i30=it.filter(function(i){return A.days(i.data)<=30}).length;
    var vz=A.list('verniz').filter(function(v){return v.estado!=='esgotado'}), kg=vz.reduce(function(s,v){return s+(v.kg||0)},0);
    var mq=I.impMaq();
    var months=[], now=new Date(); for(var k=11;k>=0;k--){ var dt=new Date(now.getFullYear(),now.getMonth()-k,1); months.push(dt.getFullYear()+'-'+('0'+(dt.getMonth()+1)).slice(-2)) }
    var fg={}; A.list('cartolinactrl').filter(function(c){return A.days(c.data)<=365}).forEach(function(c){ var f=fg[c.fornecedor]=fg[c.fornecedor]||{n:0,ok:0}; f.n++; if(c.resultado==='ok') f.ok++ });
    return '<div class="head" style="--c:'+C+'"><div><div class="eyebrow">Indicadores</div><h1>Painel de indicadores</h1><p>Números-chave de Impressão e Qualidade, calculados a partir dos registos desta app.</p></div></div>'+
      '<h2 style="font-size:18px;margin:0 0 8px;color:var(--c-qual)">Qualidade</h2>'+
      A.kpis([{v:st.fii,l:'FII em '+ano,s:cmp(st.fii,stA.fii)},{v:st.fic,l:'FIQ em '+ano,s:cmp(st.fic,stA.fic)},{v:abertas,l:'Melhorias por fechar',cls:abertas?'warn':''},
        {v:st.reproc!=null?fmt(st.reproc,1)+' h':'–',l:'Reprocessamento médio '+ano},{v:ct.length?fmt(ctOk/ct.length*100,0)+'%':'–',l:'Cartolina conforme (90 d)',s:ct.length+' controlos'}])+
      '<h2 style="font-size:18px;margin:6px 0 8px;color:var(--c-imp)">Impressão</h2>'+
      A.kpis([{v:n?fmt((n-o)/n*100,0)+'%':'–',l:'Águas dentro dos limites (30 d)',cls:n&&o/n>0.1?'warn':''},{v:c30,l:'Cauchos montados (30 d)'},{v:cau.filter(function(c){return c.estado==='stock'}).length,l:'Cauchos em stock'},
        {v:i30,l:'Intervenções técnicas (30 d)'},{v:fmt(kg,0)+' kg',l:'Verniz em reserva',s:vz.length+' reservas'}])+
      '<div class="grid2">'+
        '<div class="panel"><h2>FII e FIQ por mês</h2><p class="small muted" style="margin:2px 0 8px">Últimos 12 meses</p>'+Charts.bars({cats:months.map(function(m){return m.slice(5)+'/'+m.slice(2,4)}),series:[{name:'FII · internas',color:'var(--s1)',vals:months.map(function(m){return inc.filter(function(i){return i.tipo==='FII'&&d(i).slice(0,7)===m}).length})},{name:'FIQ · externas',color:'var(--s2)',vals:months.map(function(m){return inc.filter(function(i){return i.tipo==='FIQ'&&d(i).slice(0,7)===m}).length})}],unit:'inc.'})+'</div>'+
        '<div class="panel"><h2>Águas dentro dos limites</h2><p class="small muted" style="margin:2px 0 8px">% de leituras conformes por ponto, últimos 30 dias</p>'+Charts.hbars({rows:I.pontos().map(function(p){var x=porPonto[p.id];return {l:p.nome,v:x?x.ok/x.n*100:0,s:x?'('+x.n+')':'',c:x&&x.ok/x.n<0.9?'var(--st-crit)':'var(--s3)'}}),unit:'%',dec:0,empty:'Sem medições nos últimos 30 dias.'})+'</div>'+
        '<div class="panel"><h2>Cauchos montados por máquina</h2><p class="small muted" style="margin:2px 0 8px">Últimos 90 dias</p>'+Charts.hbars({rows:mq.map(function(m){return {l:m.nome,v:cau.filter(function(c){return c.maquina===m.id&&c.montagem&&A.days(c.montagem.d)<=90}).length}}),unit:'un.',color:'var(--s2)'})+'</div>'+
        '<div class="panel"><h2>Conformidade da cartolina por fornecedor</h2><p class="small muted" style="margin:2px 0 8px">% de controlos conformes, últimos 12 meses (n.º de controlos)</p>'+Charts.hbars({rows:Object.keys(fg).map(function(f){return {l:f,v:fg[f].ok/fg[f].n*100,s:'('+fg[f].n+')',c:fg[f].ok/fg[f].n<0.9?'var(--st-crit)':'var(--s1)'}}).sort(function(a,b){return a.v-b.v}),unit:'%',dec:0,empty:'Sem controlos de cartolina.'})+'</div>'+
        '<div class="panel"><h2>Intervenções técnicas por máquina</h2><p class="small muted" style="margin:2px 0 8px">Últimos 90 dias</p>'+Charts.hbars({rows:mq.map(function(m){return {l:m.nome,v:it.filter(function(i){return i.maquina===m.id&&A.days(i.data)<=90}).length}}),color:'var(--s7)'})+'</div>'+
        '<div class="panel"><h2>Setor de origem das incidências</h2><p class="small muted" style="margin:2px 0 8px">FII + FIQ em '+ano+'</p>'+Charts.hbars({rows:A.SETORES.map(function(s){return {l:s,v:ytd.filter(function(i){return i.setorOrigem===s}).length}}).sort(function(a,b){return b.v-a.v}),color:'var(--s4)'})+'</div>'+
      '</div><p class="small muted" style="margin-top:14px">As Auditorias PCM e o PCV Ferramentas guardam os dados nas suas próprias apps e ainda não entram neste painel.</p>';
  },
  bind:function(r){ Charts.bind(r) }
});
})();
