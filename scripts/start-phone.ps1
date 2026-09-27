$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDirectory
New-Item -ItemType Directory -Path 'work','data','.tools' -Force | Out-Null
$nodeBinary = (Get-Command node).Source
if (-not (Test-Path 'dist/server.mjs')) { throw 'Primero ejecuta npm ci y npm run build en esta carpeta.' }
$healthy = $false
try { $status = Invoke-RestMethod 'http://127.0.0.1:3000/api/auth/status'; $healthy = $null -ne $status.needsSetup } catch {}
if (-not $healthy) {
  $serverProcess = Start-Process -FilePath $nodeBinary -ArgumentList 'dist/server.mjs' -WorkingDirectory $projectDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput 'work/server.log' -RedirectStandardError 'work/server-error.log'
  $serverProcess.Id | Set-Content 'work/server.pid'
  Start-Sleep -Seconds 2
}
if ((Test-Path 'work/tunnel.pid') -and (Test-Path 'work/tunnel-url.txt')) {
  $existingTunnel = Get-Process -Id ([int](Get-Content 'work/tunnel.pid')) -ErrorAction SilentlyContinue
  if ($existingTunnel -and $existingTunnel.Path -eq (Join-Path $projectDirectory '.tools/cloudflared.exe')) {
    $existingUrl = (Get-Content 'work/tunnel-url.txt' -Raw).Trim()
    try {
      $existingStatus = Invoke-RestMethod ($existingUrl + '/api/auth/status') -TimeoutSec 10
      if ($null -ne $existingStatus.needsSetup) {
        & $nodeBinary scripts/access-card.mjs $existingUrl
        Write-Host ('Aplicacion ya activa: ' + $existingUrl)
        Write-Host 'Acceso y QR: data/primer-acceso.html'
        exit 0
      }
    } catch {}
  }
}
if (-not (Test-Path '.tools/cloudflared.exe')) {
  Write-Host 'Descargando el cliente oficial del tunel de prueba...'
  $release = Invoke-RestMethod 'https://api.github.com/repos/cloudflare/cloudflared/releases/latest'
  $asset = $release.assets | Where-Object { $_.name -eq 'cloudflared-windows-amd64.exe' }
  Invoke-WebRequest $asset.browser_download_url -OutFile '.tools/cloudflared.exe'
  $hash = (Get-FileHash '.tools/cloudflared.exe' -Algorithm SHA256).Hash.ToLower()
  if ($asset.digest -and $asset.digest -ne ('sha256:' + $hash)) { throw 'La descarga no coincide con el SHA256 oficial.' }
}
$tunnelLog = Join-Path $projectDirectory ('work/tunnel-' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + '.log')
$tunnelProcess = Start-Process -FilePath (Join-Path $projectDirectory '.tools/cloudflared.exe') -ArgumentList @('tunnel','--url','http://127.0.0.1:3000','--no-autoupdate','--protocol','http2') -WindowStyle Hidden -PassThru -RedirectStandardError $tunnelLog
$tunnelProcess.Id | Set-Content 'work/tunnel.pid'
$publicAddress = $null
for ($attempt=0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Seconds 1
  $log = Get-Content -LiteralPath $tunnelLog -Raw -ErrorAction SilentlyContinue
  if ($log -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $publicAddress=$Matches[0]; break }
  if ($tunnelProcess.HasExited) { throw ('El tunel no pudo iniciar. Revisa ' + $tunnelLog) }
}
if (-not $publicAddress) { throw ('El tunel aun no entrega URL. Revisa ' + $tunnelLog) }
$publicAddress | Set-Content 'work/tunnel-url.txt'
& $nodeBinary scripts/access-card.mjs $publicAddress
Write-Host ('Aplicacion: ' + $publicAddress)
Write-Host 'Abre data/primer-acceso.html para entrar o escanear el QR con tu celular.'
Write-Host 'Mantén este computador encendido. Los datos quedan en data/.'
