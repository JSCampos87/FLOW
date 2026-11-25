# Índice dos documentos das reclamações a fornecedores (fotografias, PDF, emails) para o FLOW.
# Só PowerShell (vem com o Windows): não precisa de Node nem de uma cópia do FLOW.
# Lê só NOMES, tamanhos e datas na pasta sincronizada do SharePoint (não descarrega ficheiros "só online")
# e grava um documento por ano em flow_rf_docs/<ano>: { v, h, f: { "<n>": [{n, s, t}] } }. Só grava quando algo mudou.
# O FLOW lê esse documento ao passar o rato em "Fotos e emails" e abre cada ficheiro no SharePoint.
# Uso:  powershell -ExecutionPolicy Bypass -File indice_rf.ps1 [-Pasta "<…\Reclamações a Fornecedores>"] [-Todos]
param(
  [string]$Pasta = (Join-Path $env:USERPROFILE 'Hinojosa Packaging Group\Produção - QM - Quality Management\Reclamações a Fornecedores'),
  [switch]$Todos
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Pasta)) { Write-Error "Pasta não encontrada: $Pasta (sincronize a biblioteca 'QM - Quality Management' no OneDrive)" }

# configuração pública do FLOW (chave do Firebase, projeto e prefixo) — lida do site, nada fica guardado aqui
$cfg = (Invoke-WebRequest -UseBasicParsing 'https://jscampos87.github.io/FLOW/js/config.js').Content
$KEY = [regex]::Match($cfg, 'apiKey:\s*"([^"]+)"').Groups[1].Value
$PROJ = [regex]::Match($cfg, 'projectId:\s*"([^"]+)"').Groups[1].Value
$PRE = [regex]::Match($cfg, 'prefixo:\s*"([^"]+)"').Groups[1].Value; if (-not $PRE) { $PRE = 'flow_' }

$IGN = '^(desktop\.ini|thumbs\.db|\.ds_store)$|^~\$|^\.'
function Get-Ficheiros([string]$dir) {
  $base = (Get-Item -LiteralPath $dir).FullName.TrimEnd('\') + '\'
  Get-ChildItem -LiteralPath $dir -File -Recurse -Depth 2 -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch $IGN } |
    ForEach-Object { [ordered]@{ n = $_.FullName.Substring($base.Length).Replace('\', '/'); s = [int64]$_.Length; t = $_.LastWriteTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm') } } |
    Sort-Object { $_.n }
}
function To-Fs($v) {   # valor PowerShell -> formato REST do Firestore
  if ($v -is [System.Collections.IDictionary]) { $f = [ordered]@{}; foreach ($k in $v.Keys) { $f[[string]$k] = To-Fs $v[$k] }; return @{ mapValue = @{ fields = $f } } }
  if ($v -is [array]) { return @{ arrayValue = @{ values = @($v | ForEach-Object { To-Fs $_ }) } } }
  if ($v -is [int64] -or $v -is [int]) { return @{ integerValue = [string]$v } }
  return @{ stringValue = [string]$v }
}

$auth = Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$KEY" -ContentType 'application/json' -Body '{"returnSecureToken":true}'
$HDR = @{ Authorization = "Bearer $($auth.idToken)" }
$URL0 = "https://firestore.googleapis.com/v1/projects/$PROJ/databases/(default)/documents/${PRE}rf_docs/"

$anoAtual = (Get-Date).Year
$anos = Get-ChildItem -LiteralPath $Pasta -Directory | Where-Object { $_.Name -match '^\d{4}$' -and ($Todos -or [int]$_.Name -ge $anoAtual - 1) }
foreach ($a in $anos) {
  $f = [ordered]@{}
  Get-ChildItem -LiteralPath $a.FullName -Directory | ForEach-Object {
    $m = [regex]::Match($_.Name, '^Rec\s*0*(\d+)[_ -]+(\d{4})$', 'IgnoreCase')
    if ($m.Success) { $f[$m.Groups[1].Value] = @(Get-Ficheiros $_.FullName) }
  }
  $json = $f | ConvertTo-Json -Depth 6 -Compress
  $hash = [BitConverter]::ToString([Security.Cryptography.SHA1]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($json))).Replace('-', '').ToLower()
  $antigo = $null
  try { $antigo = (Invoke-RestMethod -Uri ($URL0 + $a.Name + '?mask.fieldPaths=h') -Headers $HDR).fields.h.stringValue } catch { }
  $nf = ($f.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
  if ($antigo -eq $hash) { Write-Output "$($a.Name) sem alterações ($($f.Count) pastas, $nf ficheiros)"; continue }
  $corpo = @{ fields = [ordered]@{ v = @{ stringValue = (Get-Date).ToUniversalTime().ToString('o') }; h = @{ stringValue = $hash }; f = (To-Fs $f) } } | ConvertTo-Json -Depth 20 -Compress
  if ($corpo.Length -gt 950000) { Write-Warning "$($a.Name): índice demasiado grande"; continue }
  Invoke-RestMethod -Method Patch -Uri ($URL0 + $a.Name) -Headers $HDR -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($corpo)) | Out-Null
  Write-Output "$($a.Name) atualizado: $($f.Count) pastas, $nf ficheiros"
}
