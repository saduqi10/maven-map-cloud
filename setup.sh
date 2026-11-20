#!/usr/bin/env bash
# Maven Map setup (macOS / Linux). By Maven: @maven.iqq on Instagram, maveniqq on YouTube.
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Install Node 18 or newer from https://nodejs.org, then run this again."; exit 1; }
command -v ffmpeg >/dev/null || { echo "Install ffmpeg (brew install ffmpeg / apt install ffmpeg), then run this again."; exit 1; }
npm install --silent
npx playwright install chromium
python3 -m pip install -q -r requirements.txt
python3 scripts/prep.py
python3 scripts/new.py first-test --from nile-en
python3 scripts/build.py first-test prep
python3 scripts/build.py first-test stills 1,6,11
echo "Ready. Look at first-test/check/sheet.jpg. Then ask Claude for a Maven Map video."
