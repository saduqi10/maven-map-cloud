# Maven Map setup (Windows). By Maven: @maven.iqq on Instagram, maveniqq on YouTube.
# Run: powershell -ExecutionPolicy Bypass -File setup.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Install Node 18 or newer from https://nodejs.org, then run this again."; exit 1 }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { Write-Host "Install ffmpeg (winget install Gyan.FFmpeg), reopen PowerShell, then run this again."; exit 1 }
if (-not (Get-Command py -ErrorAction SilentlyContinue)) { Write-Host "Install Python 3.10 or newer from https://python.org, then run this again."; exit 1 }
npm install --silent
npx playwright install chromium
py -3 -m pip install -q -r requirements.txt
py -3 scripts/prep.py
py -3 scripts/new.py first-test --from nile-en
py -3 scripts/build.py first-test prep
py -3 scripts/build.py first-test stills 1,6,11
Write-Host "Ready. Look at first-test/check/sheet.jpg. Then ask Claude for a Maven Map video."
