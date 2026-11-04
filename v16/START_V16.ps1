# MagicPerspective V16 — Țesătura vie, on Windows. From your clone:  powershell -NoProfile -ExecutionPolicy Bypass -File .\v16\START_V13.ps1
Set-Location -Path $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Instalează Node.js: winget install OpenJS.NodeJS.LTS"; exit 1 }
Start-Process "http://127.0.0.1:3051/"
node server.mjs
