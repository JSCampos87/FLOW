/* Gráficos SVG simples: linhas (com faixa de limites), barras agrupadas, barras horizontais. Hover com tooltip. */
(function(){
var REG={}, N=0, esc=App.esc, fmt=App.fmt;
var SER=['var(--s1)','var(--s2)','var(--s3)','var(--s4)','var(--s5)','var(--s6)','var(--s7)','var(--s8)'];
function nice(lo,hi,n){
  if(lo===hi){ lo-=1; hi+=1 }
  var span=hi-lo, step=Math.pow(10,Math.floor(Math.log10(span/n))), err=span/n/step;
  if(err>=7.5) step*=10; else if(err>=3.5) step*=5; else if(err>=1.5) step*=2;
  var a=Math.floor(lo/step)*step, b=Math.ceil(hi/step)*step, t=[];
  for(var v=a; v<=b+step/2; v+=step) t.push(+v.toFixed(10));
  return {lo:a,hi:b,ticks:t,step:step};
}
function dnum(s){ return Date.parse(String(s).slice(0,10))/864e5 }
function dlab(d){ var x=new Date(d*864e5); return ('0'+x.getUTCDate()).slice(-2)+'/'+('0'+(x.getUTCMonth()+1)).slice(-2) }
function dfull(d){ var x=new Date(d*864e5); return ('0'+x.getUTCDate()).slice(-2)+'/'+('0'+(x.getUTCMonth()+1)).slice(-2)+'/'+x.getUTCFullYear() }
function U(u){ return u? (u==='%'?'%':' '+esc(u)) : '' }
function legend(items){ return '<div class="legend">'+items.map(function(i){ return '<span><i class="'+(i.k||'')+'" style="'+(i.c?'background:'+i.c:'')+'"></i>'+esc(i.l)+'</span>' }).join('')+'</div>' }

/* line({series:[{name,color,pts:[{x:'YYYY-MM-DD',y,out}]}], band:{lo,hi}, unit, dec, h, empty}) */
function line(o){
  var all=[]; o.series.forEach(function(s,i){ s.color=s.color||SER[i%8]; s.pts.forEach(function(p){ p.xd=dnum(p.x); all.push(p) }) });
  all=all.filter(function(p){ return p.y!=null && isFinite(p.y) && isFinite(p.xd) });
  if(!all.length) return '<div class="cht-empty">'+(o.empty||'Ainda sem dados para o gráfico.')+'</div>';
  var W=o.w||760, H=o.h||240, ml=48, mr=16, mt=12, mb=28;
  var ys=all.map(function(p){return p.y}); if(o.band){ if(o.band.lo!=null) ys.push(o.band.lo); if(o.band.hi!=null) ys.push(o.band.hi) }
  var yl=Math.min.apply(null,ys), yh=Math.max.apply(null,ys), pad=(yh-yl)*0.08||Math.abs(yh)*0.05||1;
  var ny=nice(yl-pad,yh+pad,5);
  var xs=all.map(function(p){return p.xd}), xl=Math.min.apply(null,xs), xh=Math.max.apply(null,xs); if(xl===xh){ xl-=1; xh+=1 }
  var X=function(d){ return ml+(d-xl)/(xh-xl)*(W-ml-mr) }, Y=function(v){ return mt+(ny.hi-v)/(ny.hi-ny.lo)*(H-mt-mb) };
  var id='c'+(++N), s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.label||'gráfico')+'">';
  ny.ticks.forEach(function(t){ s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="#e7ece9"/><text x="'+(ml-8)+'" y="'+(Y(t)+4)+'" text-anchor="end" font-size="11" fill="#5a6771" font-family="IBM Plex Mono,monospace">'+fmt(t, ny.step<1? (ny.step<0.1?2:1):0)+'</text>' });
  if(o.band && (o.band.lo!=null || o.band.hi!=null)){
    var bl=o.band.lo!=null? o.band.lo: ny.lo, bh=o.band.hi!=null? o.band.hi : ny.hi;
    s+='<rect x="'+ml+'" width="'+(W-ml-mr)+'" y="'+Y(bh)+'" height="'+Math.max(0,Y(bl)-Y(bh))+'" fill="rgba(12,163,12,.08)"/>';
    if(o.band.lo!=null) s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(bl)+'" y2="'+Y(bl)+'" stroke="rgba(12,163,12,.65)" stroke-dasharray="4 4"/>';
    if(o.band.hi!=null) s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(bh)+'" y2="'+Y(bh)+'" stroke="rgba(12,163,12,.65)" stroke-dasharray="4 4"/>';
  }
  var ticks=Math.min(7, Math.max(2, Math.round(xh-xl)+1));
  for(var i=0;i<ticks;i++){ var d=xl+(xh-xl)*i/(ticks-1); s+='<text x="'+X(d)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="#5a6771" font-family="IBM Plex Mono,monospace">'+dlab(Math.round(d))+'</text>' }
  s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+(H-mb)+'" y2="'+(H-mb)+'" stroke="#c9d1cc"/>';
  var pts=[];
  o.series.forEach(function(se){
    var p=se.pts.filter(function(q){ return q.y!=null&&isFinite(q.y)&&isFinite(q.xd) }).sort(function(a,b){return a.xd-b.xd});
    if(p.length>1) s+='<path d="'+p.map(function(q,i){ return (i?'L':'M')+X(q.xd).toFixed(1)+' '+Y(q.y).toFixed(1) }).join('')+'" fill="none" stroke="'+se.color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    p.forEach(function(q){
      var out=q.out || (o.band && ((o.band.lo!=null && q.y<o.band.lo) || (o.band.hi!=null && q.y>o.band.hi)));
      s+='<circle cx="'+X(q.xd)+'" cy="'+Y(q.y)+'" r="'+(out?5:3.5)+'" fill="'+se.color+'" stroke="'+(out?'#d03b3b':'#fff')+'" stroke-width="2"/>';
      pts.push({x:X(q.xd), y:Y(q.y), t:'<i style="background:'+se.color+'"></i>'+esc(se.name)+' · '+dfull(q.xd)+'<br><b>'+fmt(q.y,o.dec)+U(o.unit)+'</b>'+(out?' <span style="color:#d03b3b">· fora do limite</span>':'')+(q.note?'<br>'+esc(q.note):'')});
    });
  });
  s+='<circle data-hl r="7" fill="none" stroke="#14212b" stroke-width="1.5" opacity="0"/></svg>';
  REG[id]={pts:pts, W:W, H:H};
  var leg=o.series.length>1||o.band? legend(o.series.map(function(se){ return {l:se.name,c:se.color} }).concat(o.band?[{l:o.bandLabel||'Limites',k:'band'}]:[])) : '';
  return leg+'<div class="chart" data-chart="'+id+'">'+s+'<div class="tip" hidden></div></div>';
}

/* bars({cats:[...], series:[{name,color,vals:[]}], unit, dec, h, stacked}) */
function bars(o){
  var tot=0; o.series.forEach(function(se,i){ se.color=se.color||SER[i%8]; se.vals.forEach(function(v){ tot+=v||0 }) });
  if(!o.cats.length || !tot) return '<div class="cht-empty">'+(o.empty||'Ainda sem dados para o gráfico.')+'</div>';
  var W=760, H=o.h||230, ml=44, mr=12, mt=12, mb=o.rot?54:28, n=o.cats.length, k=o.stacked?1:o.series.length;
  var mx=0; o.cats.forEach(function(c,i){ if(o.stacked){ var s=0; o.series.forEach(function(se){ s+=se.vals[i]||0 }); mx=Math.max(mx,s) } else o.series.forEach(function(se){ mx=Math.max(mx,se.vals[i]||0) }) });
  var ny=nice(0,mx,4), Y=function(v){ return mt+(ny.hi-v)/(ny.hi-ny.lo)*(H-mt-mb) };
  var bw=(W-ml-mr)/n, gw=Math.min(bw*0.72, 18*k+6*(k-1)+8), w=o.stacked? gw : (gw-2*(k-1))/k;
  var id='c'+(++N), s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.label||'gráfico de barras')+'">', pts=[];
  ny.ticks.forEach(function(t){ s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="#e7ece9"/><text x="'+(ml-8)+'" y="'+(Y(t)+4)+'" text-anchor="end" font-size="11" fill="#5a6771" font-family="IBM Plex Mono,monospace">'+fmt(t,ny.step<1?1:0)+'</text>' });
  var every=Math.ceil(n/14);
  o.cats.forEach(function(c,i){
    var x0=ml+bw*i+(bw-gw)/2, acc=0;
    o.series.forEach(function(se,j){
      var v=se.vals[i]||0; if(!v) return;
      var x=o.stacked? x0 : x0+j*(w+2), y1=Y(acc+v), y0=Y(acc), h=Math.max(0,y0-y1-(o.stacked&&acc?2:0));
      s+='<rect x="'+x.toFixed(1)+'" y="'+y1.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="3" fill="'+se.color+'"/>';
      pts.push({x:x+w/2, y:y1, t:'<i style="background:'+se.color+'"></i>'+esc(se.name)+' · '+esc(c)+'<br><b>'+fmt(v,o.dec)+U(o.unit)+'</b>'});
      if(o.stacked) acc+=v;
    });
    if(i%every===0){
      var lx=ml+bw*i+bw/2;
      s+= o.rot? '<text transform="translate('+lx+','+(H-mb+12)+') rotate(-35)" text-anchor="end" font-size="11" fill="#5a6771">'+esc(c)+'</text>'
               : '<text x="'+lx+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="#5a6771" font-family="IBM Plex Mono,monospace">'+esc(c)+'</text>';
    }
  });
  s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+(H-mb)+'" y2="'+(H-mb)+'" stroke="#c9d1cc"/><circle data-hl r="0" opacity="0"/></svg>';
  REG[id]={pts:pts,W:W,H:H,bar:true};
  var leg=o.series.length>1? legend(o.series.map(function(se){ return {l:se.name,c:se.color,k:'sq'} })) : '';
  return leg+'<div class="chart" data-chart="'+id+'">'+s+'<div class="tip" hidden></div></div>';
}

/* hbars({rows:[{l,v,s}], color, unit, dec}) — ranking simples */
function hbars(o){
  var rows=o.rows.filter(function(r){ return r.v>0 });
  if(!rows.length) return '<div class="cht-empty">'+(o.empty||'Ainda sem dados.')+'</div>';
  var mx=Math.max.apply(null,rows.map(function(r){return r.v})), c=o.color||'var(--s1)';
  return '<div style="display:grid;gap:7px">'+rows.map(function(r){
    return '<div style="display:grid;grid-template-columns:minmax(90px,170px) 1fr auto;gap:10px;align-items:center;font-size:13.5px" title="'+esc(r.l)+': '+fmt(r.v,o.dec)+'">'+
      '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.l)+'</span>'+
      '<span style="height:14px;border-radius:0 4px 4px 0;background:'+(r.c||c)+';width:'+Math.max(2,r.v/mx*100)+'%"></span>'+
      '<span class="mono" style="font-size:12.5px">'+fmt(r.v,o.dec)+U(o.unit)+(r.s?' <span class="muted">'+esc(r.s)+'</span>':'')+'</span></div>';
  }).join('')+'</div>';
}

function bind(root){
  root.querySelectorAll('.chart[data-chart]').forEach(function(el){
    var r=REG[el.dataset.chart]; if(!r||!r.pts.length) return;
    var svg=el.querySelector('svg'), tip=el.querySelector('.tip'), hl=svg.querySelector('[data-hl]');
    function move(ev){
      var b=svg.getBoundingClientRect(), sx=r.W/b.width, mx=(ev.clientX-b.left)*sx, my=(ev.clientY-b.top)*sx, best=null, bd=1e9;
      r.pts.forEach(function(p){ var d=r.bar? Math.abs(p.x-mx)*3+Math.abs(p.y-my)*0.2 : Math.hypot(p.x-mx,(p.y-my)*0.6); if(d<bd){bd=d;best=p} });
      if(!best || bd>60){ tip.hidden=true; hl.setAttribute('opacity',0); return }
      tip.innerHTML=best.t; tip.hidden=false; tip.style.left=(best.x/sx)+'px'; tip.style.top=(best.y/sx)+'px';
      if(!r.bar){ hl.setAttribute('cx',best.x); hl.setAttribute('cy',best.y); hl.setAttribute('opacity',1) }
    }
    svg.addEventListener('pointermove',move);
    svg.addEventListener('pointerleave',function(){ tip.hidden=true; hl.setAttribute('opacity',0) });
  });
}
window.Charts={line:line, bars:bars, hbars:hbars, bind:bind, SER:SER, legend:legend};
})();
