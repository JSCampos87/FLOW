# Cria (ou substitui) a tarefa do Windows que atualiza o índice de documentos das reclamações a fornecedores
# de 15 em 15 minutos (scripts/indice_rf.mjs). Correr uma vez, no PC que tem a pasta do SharePoint sincronizada:
#   powershell -ExecutionPolicy Bypass -File scripts\agendar_indice_rf.ps1
# Para remover:  Unregister-ScheduledTask -TaskName 'FLOW - indice reclamacoes fornecedores' -Confirm:$false
$node = (Get-Command node).Source
$dir = Split-Path -Parent $PSScriptRoot
$acao = New-ScheduledTaskAction -Execute $node -Argument "`"$dir\scripts\indice_rf.mjs`"" -WorkingDirectory $dir
$quando = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
$opcoes = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'FLOW - indice reclamacoes fornecedores' -Action $acao -Trigger $quando -Settings $opcoes -Force `
  -Description 'Atualiza o índice de documentos das reclamações a fornecedores no FLOW (só nomes de ficheiros).' | Select-Object TaskName, State
