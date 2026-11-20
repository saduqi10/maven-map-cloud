"""Start a Maven Map project.

  python new.py <folder> [--lang ar|en] [--from rivers-ar|hormuz-ar|blank]

Copies the engine (map.js, index.html, fonts) into <folder>/web, plus story.js, script.txt, config.json, cues.json.
"""
import json, shutil, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent.parent
args = sys.argv[1:]
if not args: sys.exit(__doc__)
proj = Path(args[0]).resolve(); lang = args[args.index('--lang') + 1] if '--lang' in args else 'ar'
src = args[args.index('--from') + 1] if '--from' in args else 'blank'
if (proj / 'web' / 'map.js').exists(): sys.exit(f'{proj} already has a project; pick a new folder')
proj.mkdir(parents=True, exist_ok=True)
shutil.copytree(HERE / 'engine', proj / 'web', dirs_exist_ok=True)
s = HERE / ('templates' if src == 'blank' else f'examples/{src}')
shutil.copy(s / 'story.js', proj / 'web' / 'story.js')
if (s / 'timing.json').exists(): shutil.copy(s / 'timing.json', proj / 'web' / 'timing.json')   # example word timings, so it renders before you voice it
for f in ('script.txt', 'cues.json'):
    g = s / (f'script.{lang}.txt' if src == 'blank' and f == 'script.txt' else f)
    if g.exists(): shutil.copy(g, proj / f)
cfg = json.loads((s / (f'config.{lang}.json' if src == 'blank' else 'config.json')).read_text(encoding='utf-8'))
cfg['name'] = proj.name
(proj / 'config.json').write_text(json.dumps(cfg, indent=1, ensure_ascii=False), encoding='utf-8')
(proj / 'web' / 'config.json').write_text(json.dumps(cfg, indent=1, ensure_ascii=False), encoding='utf-8')
S = HERE / 'scripts'
print(f'''new Maven Map project: {proj}
  1. script                  {proj / "script.txt"}
  2. voice + word timings    python "{S / "voice.py"}" "{proj}"
  3. camera + graphics       {proj / "web" / "story.js"}
  4. imagery                 python "{S / "build.py"}" "{proj}" prep
  5. check                   python "{S / "build.py"}" "{proj}" stills 0.5,2,4
  6. sound cues              {proj / "cues.json"}
  7. render + mix + master   python "{S / "build.py"}" "{proj}" all''')
