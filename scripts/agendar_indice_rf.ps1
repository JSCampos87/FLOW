# Cria (ou substitui) a tarefa do Windows que atualiza o índice de documentos das reclamações a fornecedores
# de 15 em 15 minutos (indice_rf.ps1, que tem de estar na mesma pasta que este ficheiro).
# Correr uma vez, com a conta da pessoa que tem a biblioteca "QM - Quality Management" sincronizada no OneDrive:
#   powershell -ExecutionPolicy Bypass -File agendar_indice_rf.ps1
# Para remover:  Unregister-ScheduledTask -TaskName 'FLOW - indice reclamacoes fornecedores' -Confirm:$false
$script = Join-Path $PSScriptRoot 'indice_rf.ps1'
if (-not (Test-Path $script)) { Write-Error "Falta $script" }
$acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`"" -WorkingDirectory $PSScriptRoot
$quando = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
$opcoes = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'FLOW - indice reclamacoes fornecedores' -Action $acao -Trigger $quando -Settings $opcoes -Force `
  -Description 'Atualiza o índice de documentos das reclamações a fornecedores no FLOW (só nomes de ficheiros).' | Select-Object TaskName, State
& $script
