# Prépare une copie locale de l'atlas (Windows / PowerShell).
# Installe three.js 0.160.0 dans _atlas_v2/build_full/vendor (dossier ignoré par git).
# Les modèles 3D (.glb) absents du disque sont chargés automatiquement depuis le serveur en ligne.
#
# Utilisation :  powershell -ExecutionPolicy Bypass -File .\setup-local.ps1
$ErrorActionPreference = 'Stop'
$root   = $PSScriptRoot
$vendor = Join-Path $root '_atlas_v2\build_full\vendor'

if (Test-Path (Join-Path $vendor 'three.module.js')) {
    Write-Host 'three.js est déjà installé dans' $vendor
} else {
    $tmp = Join-Path $env:TEMP 'atlas-three-0.160.0'
    New-Item -ItemType Directory -Force $tmp | Out-Null
    $tgz = Join-Path $tmp 'three.tgz'
    Write-Host 'Téléchargement de three.js 0.160.0…'
    Invoke-WebRequest 'https://registry.npmjs.org/three/-/three-0.160.0.tgz' -OutFile $tgz
    tar -xzf $tgz -C $tmp
    New-Item -ItemType Directory -Force (Join-Path $vendor 'addons') | Out-Null
    Copy-Item (Join-Path $tmp 'package\build\three.module.js') $vendor
    Copy-Item (Join-Path $tmp 'package\examples\jsm\*') (Join-Path $vendor 'addons') -Recurse -Force
    Remove-Item $tmp -Recurse -Force
    Write-Host 'three.js installé dans' $vendor
}
Write-Host ''
Write-Host 'Lancez maintenant :  python -m http.server 9028'
Write-Host 'puis ouvrez        :  http://localhost:9028/atlas.html'
