"""Gera os ficheiros data/*.json do FLOW a partir dos Excel de origem.

Uso:  python scripts/build_data.py <pasta-com-os-excel> [pasta-de-saida]
      (por omissão a saída é a pasta data/ do repositório)

Ficheiros procurados na pasta de origem (pelo nome):
  *INDICADORES_FIIs*.xlsx            folha BD          -> data/fii.json
  *Reclama*Clientes*.xlsx            folha BD          -> data/fiq.json
  *Reclama*Fornecedores*.xlsx        folha Seixezelo   -> data/rf.json
  *Dados*.xlsx                       MMs embalamento + Dados op -> data/mm.json, data/cort.json
  *Mapa*Entregas*.xlsx  (opcional)   Plano EMB         -> data/mapa.json (exemplo para importar na app)
Requer: pip install openpyxl
"""
import openpyxl, json, datetime, re, statistics, collections, warnings, sys, glob, os
warnings.filterwarnings('ignore')
SRC=sys.argv[1] if len(sys.argv)>1 else '.'
OUT=(sys.argv[2] if len(sys.argv)>2 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data')).rstrip('/')+'/'
def find(pat, req=True):
    m=sorted(glob.glob(os.path.join(SRC,pat)))
    if not m and req: sys.exit('Não encontrei '+pat+' em '+SRC)
    return m[0] if m else None
def d(v):
    if isinstance(v,(datetime.datetime,datetime.date)): return v.strftime('%Y-%m-%d')
    if isinstance(v,(int,float)) and 20000<v<80000: return (datetime.date(1899,12,30)+datetime.timedelta(days=int(v))).isoformat()
    if isinstance(v,str):
        m=re.match(r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})',v.strip())
        if m: return f'{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}'
    return None
def n(v):
    if v is None or v=='' : return None
    if isinstance(v,(int,float)): return round(float(v),4) if not float(v).is_integer() else int(v)
    try: return float(str(v).replace(',','.'))
    except: return None
def s(v):
    if v is None: return ''
    if isinstance(v,float) and v.is_integer(): v=int(v)
    return re.sub(r'\s+',' ',str(v)).strip()
def clean(o): return {k:v for k,v in o.items() if v not in (None,'',[])}
SETOR={'fecho/ colagem':'Colagem','colagem':'Colagem','corte e vinco':'Corte e Vinco','cv':'Corte e Vinco','impressão':'Impressão','imp':'Impressão','logistica':'Logística','logística':'Logística','embalamento':'Embalamento','contracolagem':'Contracolagem','prepress':'Prepress','corte de cartolina':'Corte de Cartolina','guilhotinas':'Guilhotinas','janelas':'Janelas','estampagem':'Estampagem','subcontratação':'Subcontratação','supply chain':'Supply Chain','comercial':'Comercial','pasaban':'Pasaban','receção':'Receção','ptg':'PTG','laboratório':'Laboratório','cliente':'Cliente'}
def setor(v):
    k=s(v).lower(); return SETOR.get(k, s(v))
def maq(v):
    v=s(v).upper().replace(' ',''); 
    return {'B142-E':'B142E','LOGISTICA':'LOGÍSTICA','NÃOAPLICAVEL':'','NÃOAPLICÁVEL':''}.get(v,v)
def auto(a,b):
    for v in (a,b):
        x=s(v).lower()
        if x.startswith('sim') or x.startswith('detetado'): return 'sim'
        if x.startswith('não') or x.startswith('nao'): return 'não'
    return ''
# ---------- FII ----------
wb=openpyxl.load_workbook(find('*INDICADORES_FIIs*.xlsx'),read_only=True,data_only=True)
fii=[]
for i,r in enumerate(wb['BD'].iter_rows(max_col=52,values_only=True)):
    if i==0 or not (r[1] or r[2]): continue
    ano=r[37] or (r[5].year if isinstance(r[5],datetime.datetime) else None)
    ops=[s(x) for x in (r[25],r[26],r[27]) if s(x)]
    tr=n(r[15])
    o=clean({'id':f'h-fii-{ano}-{r[1]}','tipo':'FII','numero':f'FII-{ano}-{int(r[1]):04d}' if isinstance(r[1],(int,float)) else f'FII-{ano}-{s(r[1])}',
      'of':s(r[2]),'mm':s(r[31]),'cliente':s(r[30]),'artigo':s(r[29]),'dataIncidencia':d(r[5]),'defeito':s(r[3]),'defeitoDet':s(r[4]),
      'maqOrigem':maq(r[8]),'setorOrigem':setor(r[41]) if r[41] else '','opOrigem':', '.join(ops),'opDetetou':s(r[28]),
      'autoDetecao':auto(r[43],r[19]),'qtdAfetada':n(r[9]),'qtdRejeitada':n(r[10]),'unidade':s(r[11]),'folhasRej':n(r[39]),
      'tempoReproc':round(tr/60,2) if tr else None,'tipoReproc':s(r[16]) if s(r[16]) not in ('N/A','') else '','causa':s(r[13]),'acao':s(r[14]),'observacoes':s(r[20]),
      'cortante':s(r[33]),'custo':round(n(r[49]),2) if isinstance(n(r[49]),(int,float)) else None,'m2Rej':round(n(r[47]),2) if isinstance(n(r[47]),(int,float)) else None,
      'dataFecho':d(r[45]),'estado':'Fechada' if d(r[45]) else 'Registada','historico':1})
    di=o.get('dataIncidencia')
    if ano and (not di or abs(int(di[:4])-int(ano))>1):
        mes=int(r[36]) if isinstance(r[36],(int,float)) and 1<=r[36]<=12 else 1
        o['dataIncidencia']=f'{int(ano)}-{mes:02d}-' + (di[8:10] if di and di[5:7]==f'{mes:02d}' else '01'); o['dataAprox']=1
    if o.get('dataIncidencia'): fii.append(o)
# ---------- FIQ ----------
wb=openpyxl.load_workbook(find('*Reclama*Clientes*.xlsx'),read_only=True,data_only=True)
fiq=[]
for i,r in enumerate(wb['BD'].iter_rows(max_col=60,values_only=True)):
    if i==0 or r[2] is None or not r[3]: continue
    ano=r[45]; tr=n(r[30]); est=s(r[34]) or 'Aberta'
    o=clean({'id':f'h-fiq-{ano}-{s(r[2])}','tipo':'FIQ','numero':f'FIQ-{ano}-{int(r[2]):03d}' if isinstance(r[2],(int,float)) else f'FIQ-{ano}-{s(r[2])}',
      'cliente':s(r[3]),'dataReclamacao':d(r[4]),'of':s(r[5]),'mm':s(r[6]),'recDev':s(r[7]),'descricao':s(r[8]),'dataEntrega':d(r[9]),'dataIncidencia':d(r[9]) or d(r[4]),
      'qtdEntregue':n(r[10]),'qtdDevolvida':n(r[11]),'devolucao':1 if (n(r[11]) or 0)>0 or s(r[7])=='Dev' else None,'dataResposta':d(r[14]),
      'tempoResposta':n(r[15]) if isinstance(n(r[15]),(int,float)) and 0<=n(r[15])<400 else None,'classificacao':s(r[16]),'maqOrigem':maq(r[18]),'turno':s(r[19]),'opOrigem':s(r[20]),
      'defeito':s(r[21]),'defeitoDet':s(r[22]),'setorOrigem':setor(r[23]),'setorDetetado':'Cliente','acao':s(r[24]),'qtdRejeitada':n(r[25]),'valorCRC':n(r[28]),
      'tempoReproc':round(tr/60,2) if tr else None,'tipoReproc':s(r[29]),'valorFatura':n(r[31]),'acoesReativas':s(r[33]),'estado':'Fechada' if est.lower().startswith('fech') else 'Aberta',
      'artigo':s(r[35]),'causa':s(r[38]),'cortante':s(r[40]),'custoTransporte':n(r[52]),'custoReproc':n(r[53]),'custo':round(n(r[54]),2) if isinstance(n(r[54]),(int,float)) else None,
      'impactoAlimentar':s(r[56]),'m6':s(r[58]),'recusada':1 if 'recusad' in (s(r[21])+s(r[23])).lower() else None,'historico':1})
    fiq.append(o)
# ---------- Reclamações a fornecedores ----------
wb=openpyxl.load_workbook(find('*Reclama*Fornecedores*.xlsx'),read_only=True,data_only=True)
rf=[]
for i,r in enumerate(wb['Seixezelo'].iter_rows(max_col=41,values_only=True)):
    if i==0: continue
    if i>600: break
    if r[0] is None or not d(r[2]) or not r[7]: continue
    ano=d(r[2])[:4]
    o=clean({'id':f'h-rf-{ano}-{s(r[0])}','numero':f'RF-{ano}-{int(r[0]):03d}' if isinstance(r[0],(int,float)) else f'RF-{ano}-{s(r[0])}','data':d(r[2]),
      'tipoForn':{'F':'Fornecedor','S':'Subcontratado'}.get(s(r[5]),s(r[5])),'codFornecedor':s(r[6]),'fornecedor':s(r[7]),'mm':s(r[9]),'produto':s(r[10]),'sscc':s(r[11]),'lote':s(r[12]),
      'naoConformidade':s(r[13]) or s(r[1]),'tipoDefeito':s(r[16]) if s(r[16])!='N/A' else '','localDetecao':setor(r[17]),'ofPed':s(r[18]),'guiaDevolucao':s(r[19]) if s(r[19])!='0' else '',
      'kg':n(r[20]),'qtdAfetada':n(r[21]),'unidade':s(r[22]).upper(),'qtdDevolucao':n(r[23]),'custoDevolucao':n(r[25]),'custoProducao':n(r[26]),'qtdRejeitada':n(r[27]),
      'custoRejeicao':n(r[29]),'custoTotal':n(r[30]),'obs':s(r[31])[:600],'dataResposta':d(r[32]),'dataCredito':d(r[33]),'valorCreditado':n(r[34]),'notaCredito':s(r[36]),
      'acoesCorretivas':s(r[37]),'estado':'Fechada' if s(r[38]).lower()=='sim' else 'Aberta','historico':1})
    rf.append(o)
# ---------- Embalamento ----------
wb=openpyxl.load_workbook(find('*Dados*.xlsx'),read_only=True,data_only=True)
mm={}
for i,r in enumerate(wb['MMs embalamento'].iter_rows(max_col=10,values_only=True)):
    if i==0 or not r[0]: continue
    um,b,a,up=n(r[4]),n(r[5]),n(r[6]),n(r[7])
    cort=s(r[3]); 
    if cort.lower()=='em branco': cort=''
    mm[s(r[0])]=clean({'mm':s(r[0]),'descricao':s(r[1]),'cortanteCod':s(r[2]) if s(r[2]).lower()!='em branco' else '','cortante':cort,'unMaco':um,'macosBase':b,'camadas':a,'unPalete':up or (um*b*a if um and b and a else None),'exemplares':n(r[8])})
ops=[]
for i,r in enumerate(wb['Dados op'].iter_rows(max_col=14,values_only=True)):
    if i==0 or not r[2] or not r[6] or not r[11] or not r[8]: continue
    ops.append({'data':d(r[0]),'of':s(r[1]),'mm':s(r[2]),'qtd':float(r[6]),'h':float(r[11]),'p':int(r[8])})
agg=collections.defaultdict(lambda:{'q':0,'hp':0,'n':0,'q1':0,'h1':0,'q2':0,'h2':0,'mms':set()})
for o in ops:
    c=(mm.get(o['mm']) or {}).get('cortante') or ('MM '+o['mm'])
    a=agg[c]; a['q']+=o['qtd']; a['hp']+=o['h']*o['p']; a['n']+=1; a['mms'].add(o['mm'])
    if o['p']==1: a['q1']+=o['qtd']; a['h1']+=o['h']
    if o['p']==2: a['q2']+=o['qtd']; a['h2']+=o['h']
cort=[]
for c,a in agg.items():
    if a['hp']<=0: continue
    cort.append(clean({'cortante':c,'udsHPs':round(a['q']/a['hp']),'udsH1':round(a['q1']/a['h1']) if a['h1']>0 else None,'udsH2':round(a['q2']/a['h2']) if a['h2']>0 else None,'registos':a['n'],'horas':round(a['hp'],1)}))
cort.sort(key=lambda x:x['cortante'])
med=statistics.median([c['udsHPs'] for c in cort])
# mapa (opcional)
mapa=[]; lastD=None; lastC=''
mf=find('*Mapa*Entregas*.xlsx',False)
for i,r in enumerate(openpyxl.load_workbook(mf,read_only=True,data_only=True)['Plano EMB'].iter_rows(max_col=12,values_only=True) if mf else []):
    if i<2: continue
    if d(r[7]): lastD=d(r[7])
    if s(r[0]): lastC=s(r[0])
    if r[2] and s(r[2]).startswith('8') and r[5]:
        mapa.append(clean({'data':lastD,'cliente':s(r[0]) or lastC,'of':s(r[1]),'mm':s(r[2]),'descricao':s(r[3]),'qtd':n(r[5]),'prioridade':s(r[6]),'obs':s(r[11])}))
out=OUT; os.makedirs(out,exist_ok=True)
json.dump(fii,open(out+'fii.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(fiq,open(out+'fiq.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(rf,open(out+'rf.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(list(mm.values()),open(out+'mm.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump({'mediana':med,'cortantes':cort,'fonte':'Dados.xlsx · Dados op','registos':len(ops)},open(out+'cort.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(mapa,open(out+'mapa.json','w'),ensure_ascii=False,separators=(',',':'))
print('FII',len(fii),'| FIQ',len(fiq),'| Fornecedores',len(rf),'| MM',len(mm),'| Cortantes',len(cort),'(mediana',med,'uds/h/pessoa) | Mapa',len(mapa))
