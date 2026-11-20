"""Voice a Maven 3D project and write the word timings the film is cut to.

usage:  python voice.py <project>            (reads <project>/script.txt and config.json)
        python voice.py <project> --timing-only   (re-run alignment on an existing vo/voice.wav)

config.json keys (all optional):
  lang      "en" | "ar"                       default "en"
  engine    "kokoro" | "edge" | "file"        default kokoro for en, edge for ar
            file = you put any recording at vo/raw.wav (ElevenLabs, your own voice, Voicebox...)
  voice     kokoro: am_liam / am_michael / am_adam / af_bella ...   edge: ar-SA-HamedNeural, ar-IQ-BasselNeural, ar-EG-ShakirNeural, en-US-GuyNeural ...
  speed     kokoro speed (default 1.18 = Maven pace, about 3.9 words/s; the refs run 3.75-4.4)
  rate      edge rate, e.g. "+6%" (default "+6%")
  maxGap    longest pause kept between phrases in seconds (default 0.18)
  lead      silence before the first word (default 0.12)
Output: vo/voice.wav (48 kHz), web/timing.json {lang, words: [[script_word, start, end], ...], dur}
Words keep the SCRIPT spelling (numbers, names, Arabic diacritics), timed by whisper.
"""
import json, os, re, subprocess, sys, difflib, shutil
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import resample_poly

TOOLS = {
    'kokoro_py': os.environ.get('MAVEN_KOKORO_PY', 'D:/reels/tools/kokoro/.venv/Scripts/python.exe'),
    'kokoro_say': os.environ.get('MAVEN_KOKORO_SAY', 'D:/reels/tools/kokoro/say.py'),
    'whisper': os.environ.get('MAVEN_WHISPER', 'D:/reels/tools/whisper-cpp/Release/whisper-cli.exe'),
    'whisper_model': os.environ.get('MAVEN_WHISPER_MODEL', 'D:/reels/tools/whisper-cpp/models/ggml-large-v3-turbo.bin'),
    'edge_py': os.environ.get('MAVEN_EDGE_PY') or (f'"{sys.executable}"' if __import__('importlib').util.find_spec('edge_tts') else 'py -3.12'),
}
SR = 48000
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
proj = Path(sys.argv[1]).resolve(); cfg = json.loads((proj / 'config.json').read_text(encoding='utf-8')) if (proj / 'config.json').exists() else {}
lang = cfg.get('lang', 'en'); engine = cfg.get('engine', 'edge' if lang == 'ar' else 'kokoro')
vo = proj / 'vo'; vo.mkdir(exist_ok=True)
script = (proj / 'script.txt').read_text(encoding='utf-8').strip()
text = re.sub(r'\s+', ' ', re.sub(r'^#.*$', '', script, flags=re.M)).strip()   # lines starting with # are notes

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', **kw)
    if r.returncode: print(r.stdout[-2000:], r.stderr[-2000:]); sys.exit(f'failed: {cmd if isinstance(cmd, str) else " ".join(map(str, cmd))}')
    return r

def load(p):
    a, sr = sf.read(str(p), always_2d=True); a = a.mean(1)
    return resample_poly(a, SR, sr) if sr != SR else a

if '--timing-only' not in sys.argv:
    raw = vo / 'raw.wav'
    if engine == 'kokoro':
        (vo / '_lines.json').write_text(json.dumps([{'id': 'raw', 'text': text}]), encoding='utf-8')
        run([TOOLS['kokoro_py'], TOOLS['kokoro_say'], str(vo / '_lines.json'), str(vo), cfg.get('voice', 'am_liam'), str(cfg.get('speed', 1.18))])
    elif engine == 'edge':
        voice = cfg.get('voice', 'ar-SA-HamedNeural' if lang == 'ar' else 'en-US-GuyNeural')
        (vo / '_text.txt').write_text(text, encoding='utf-8')
        run(f'{TOOLS["edge_py"]} -m edge_tts --voice {voice} --rate={cfg.get("rate", "+6%")} --file "{vo / "_text.txt"}" --write-media "{vo / "raw.mp3"}"', shell=True)
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(vo / 'raw.mp3'), '-ar', '48000', '-ac', '1', str(raw)])
    elif engine == 'file':
        if not raw.exists(): sys.exit(f'engine "file": put your recording at {raw}')
    else: sys.exit('unknown engine ' + engine)
    # trim, squeeze long pauses, lead-in
    a = load(raw); n = int(SR * .01); e = np.array([np.sqrt(np.mean(a[i * n:(i + 1) * n] ** 2)) for i in range(len(a) // n)])
    thr = e.max() * .025; v = e > thr; on = np.where(v)[0]
    a = a[max(0, on[0] * n - int(.03 * SR)):(on[-1] + 1) * n + int(.12 * SR)]; e = e[max(0, on[0] - 3):on[-1] + 13]; v = e > thr
    MAX = float(cfg.get('maxGap', .18)); out = []; i = 0; k = len(v)
    while i < k:
        j = i
        while j < k and v[j] == v[i]: j += 1
        seg = a[i * n:j * n]
        if not v[i] and 0 < i and j < k and (j - i) * n > MAX * SR: h = int(MAX * SR) // 2; seg = np.concatenate([seg[:h], seg[-h:]])
        out.append(seg); i = j
    out.append(a[k * n:])
    x = np.concatenate([np.zeros(int(float(cfg.get('lead', .12)) * SR))] + out); x *= .5 / np.abs(x).max()
    sf.write(str(vo / 'voice.wav'), x, SR, subtype='PCM_24')

# ---------- word timings: whisper words, then align the script's own words onto them ----------
(proj / 'web').mkdir(exist_ok=True); (proj / 'web' / 'config.json').write_text(json.dumps(cfg, ensure_ascii=False), encoding='utf-8')
x = load(vo / 'voice.wav'); sf.write(str(vo / 'v16.wav'), resample_poly(x, 1, 3), 16000)
H = []   # heard words [text, start, end]
if os.path.exists(TOOLS['whisper']) and os.path.exists(TOOLS['whisper_model']):   # whisper.cpp (fast on this PC)
    run([TOOLS['whisper'], '-m', TOOLS['whisper_model'], '-l', lang, '-f', str(vo / 'v16.wav'), '-ml', '1', '-sow', '-oj', '-of', str(vo / 'words')] + (['--prompt', text[:200]] if text.isascii() else []))
    d = json.loads((vo / 'words.json').read_text(encoding='utf-8'))
    for s in d['transcription']:   # merge sub-word pieces (pieces without a leading space join the previous word)
        t = s['text']; a0, a1 = s['offsets']['from'] / 1000, s['offsets']['to'] / 1000
        if not t.strip(): continue
        if H and not t.startswith(' '): H[-1][0] += t.strip(); H[-1][2] = a1
        else: H.append([t.strip(), a0, a1])
else:                                                                                 # anywhere else: faster-whisper
    try: from faster_whisper import WhisperModel
    except ImportError: sys.exit('word timing needs faster-whisper: pip install -r requirements.txt')
    try: model = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16'); segs, _ = model.transcribe(resample_poly(x, 1, 3).astype(np.float32), language=lang, word_timestamps=True); segs = list(segs)
    except Exception: model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8'); segs, _ = model.transcribe(resample_poly(x, 1, 3).astype(np.float32), language=lang, word_timestamps=True); segs = list(segs)
    H = [[w.word.strip(), w.start, w.end] for sg in segs for w in sg.words if w.word.strip()]
def norm(w):
    w = re.sub(r'[\u064B-\u0652\u0640]', '', w.lower()); w = re.sub('[أإآ]', 'ا', w).replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'[^\w]', '', w)
S = text.split(' '); sn = [norm(w) for w in S]; hn = [norm(h[0]) for h in H]
T = [None] * len(S)
for blk in difflib.SequenceMatcher(None, sn, hn, autojunk=False).get_opcodes():
    tag, i1, i2, j1, j2 = blk
    if tag == 'equal':
        for k in range(i2 - i1): T[i1 + k] = (H[j1 + k][1], H[j1 + k][2])
    elif tag == 'replace' and j2 > j1:   # spread the heard span over the script words
        s0, s1 = H[j1][1], H[j2 - 1][2]
        for k in range(i2 - i1): T[i1 + k] = (s0 + (s1 - s0) * k / (i2 - i1), s0 + (s1 - s0) * (k + 1) / (i2 - i1))
# fill words whisper missed by interpolation
for i in range(len(S)):
    if T[i] is None:
        p = next((T[j][1] for j in range(i - 1, -1, -1) if T[j]), .1); q = next((T[j][0] for j in range(i + 1, len(S)) if T[j]), len(x) / SR - .1)
        T[i] = (p, max(p + .05, q))
W = [[S[i], round(T[i][0], 3), round(T[i][1], 3)] for i in range(len(S))]
for i in range(len(W) - 1): W[i][2] = min(W[i][2], W[i + 1][1])
matched = sum(1 for b in difflib.SequenceMatcher(None, sn, hn, autojunk=False).get_matching_blocks() for _ in range(b.size))
(proj / 'web').mkdir(exist_ok=True)
(proj / 'web' / 'timing.json').write_text(json.dumps({'lang': lang, 'words': W, 'dur': len(x) / SR}, ensure_ascii=False), encoding='utf-8')
dur = len(x) / SR; wps = len(S) / (W[-1][2] - W[0][1])
print(f'voice {dur:.2f} s, {len(S)} words, {wps:.2f} words/s, whisper matched {matched}/{len(S)} script words')
for i, w in enumerate(W): print(f'{i:3d} {w[1]:6.2f} {w[0]}')
