"""Mix a Maven 3D project: voice + real SFX cues (+ optional music bed), ducked under the voice.

usage: python mix.py <project>
reads  <project>/cues.json:
  { "duck_db": -16,                      # how far effects drop while the narrator speaks
    "sfx_gain_db": 0,                    # trim the whole effects bus
    "music": {"file": "LIB:../music/x.wav", "lufs": -34, "start": 0, "fade_out": 1.0},   # optional bed
    "cues": [ {"t": 1.01, "file": "LIB:transitions/whoosh_fast.wav", "gain": -7, "align": "peak", "off": 0, "max": 1.0, "fade": .2, "note": "whip"} ] }
  t      where the sound lands (align "attack" = its first transient, "peak" = its loudest point, e.g. a whoosh centre on a cut)
  file   a path, or LIB:<path inside the shared SFX library>; "off" skips into the file; "max" caps the length after the landing point
writes <project>/result/premaster.wav, sfx_track.wav, and prints voice-vs-effects per 100 ms window (aim: worst >= 10 dB, median >= 18 dB)
"""
import json, re, subprocess, sys, os
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, lfilter

LIB = os.environ.get('MAVEN_SFX_LIB', 'D:/reels/assets-shared/sfx/')
SR = 48000
proj = Path(sys.argv[1]).resolve(); res = proj / 'result'; res.mkdir(exist_ok=True)
C = json.loads((proj / 'cues.json').read_text(encoding='utf-8')) if (proj / 'cues.json').exists() else {'cues': []}
rj = json.loads((proj / 'render.json').read_text()) if (proj / 'render.json').exists() else {}
V0, _ = sf.read(str(proj / 'vo' / 'voice.wav'), always_2d=True)
DUR = float(C.get('dur') or rj.get('end') or (json.loads((proj / 'shots.json').read_text())['end'] if (proj / 'shots.json').exists() else len(V0) / SR + 1.2)); N = int(SR * DUR)

def path(f): return f.replace('LIB:', LIB) if f.startswith('LIB:') else str((proj / f).resolve()) if not os.path.isabs(f) else f
def load(p):
    if not p.lower().endswith('.wav'):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-ar', str(SR), '-ac', '2', str(res / '_d.wav')], check=True); p = str(res / '_d.wav')
    a, sr = sf.read(p, always_2d=True)
    if a.shape[1] == 1: a = np.repeat(a, 2, 1)
    a = a[:, :2]
    return resample_poly(a, SR, sr, axis=0) if sr != SR else a
def env(a, w=.01):
    n = int(SR * w); m = np.abs(a).max(1); k = len(m) // n
    return np.array([m[i * n:(i + 1) * n].max() for i in range(k)]), n
def lufs(a):
    sf.write(str(res / '_t.wav'), a, SR, subtype='FLOAT')
    o = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(res / '_t.wav'), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', o)[-1])

TJ = json.loads((proj / 'web' / 'timing.json').read_text(encoding='utf-8')) if (proj / 'web' / 'timing.json').exists() else {'words': []}
SJ = json.loads((proj / 'shots.json').read_text()) if (proj / 'shots.json').exists() else {'shots': []}
def nw(w): w = re.sub(r'[ً-ْـ]', '', w.lower()); w = re.sub('[أإآ]', 'ا', w).replace('ة', 'ه').replace('ى', 'ي'); return re.sub(r'[^\w]', '', w)
def when(t):
    # number | 'word:dragon' | 'word:the#3+0.1' (3rd 'the', 0.1 s later) | 'cut:5' (start of shot 5, 1-based) | 'end-1.5'
    if isinstance(t, (int, float)): return float(t)
    m = re.match(r'^(word|cut|end):?([^+\-]*)([+\-][\d.]+)?$', t.strip()); off = float(m.group(3) or 0); kind, arg = m.group(1), m.group(2)
    if kind == 'end': return DUR + off
    if kind == 'cut': return SJ['shots'][int(arg) - 1][0] + off
    w, _, n = arg.partition('#'); n = int(n or 1); hits = [x for x in TJ['words'] if nw(x[0]) == nw(w)]
    if len(hits) < n: sys.exit(f'cue word not found: {t}')
    return hits[n - 1][1] + off
X = np.zeros((N, 2)); used = {}
for c in C.get('cues', []):
    f = path(c['file'])
    if not os.path.exists(f): print(f'skipped (not in your sound library): {c["file"]}  -> set MAVEN_SFX_LIB or point the cue at your own file'); continue
    used[f] = used.get(f, 0) + 1
    a = load(f)[int(c.get('off', 0) * SR):]
    e, n = env(a); att = int(np.argmax(e > e.max() * .1)) * n; pk = int(np.argmax(e)) * n
    s0 = att if c.get('align', 'attack') == 'attack' else pk
    cut = max(0, att - int(.01 * SR)); a = a[cut:]; s0 -= cut
    a = a[:int(c.get('max', 2.0) * SR) + s0].copy(); k = int(c.get('fade', .2) * SR)
    if k: a[-k:] *= np.linspace(1, 0, min(k, len(a)))[:, None]
    act = a[np.abs(a).max(1) > np.abs(a).max() * .05]; r = np.sqrt(np.mean(act ** 2)) + 1e-9
    a = a * (10 ** (-20 / 20) / r) * 10 ** (c.get('gain', -6) / 20)
    st = int(when(c['t']) * SR) - s0
    if st < 0: a = a[-st:]; st = 0
    L = min(len(a), N - st)
    if L > 0: X[st:st + L] += a[:L]
for f, n in used.items():
    if n > 2: print(f'NOTE: {os.path.basename(f)} is used {n} times (house rule: no sample more than twice)')
X *= 10 ** (C.get('sfx_gain_db', 0) / 20)
sf.write(str(res / 'sfx_track.wav'), X, SR, subtype='FLOAT')

V = np.repeat(V0.mean(1, keepdims=True), 2, 1); V = np.vstack([V, np.zeros((max(0, N - len(V)), 2))])[:N]; V *= 10 ** ((-16 - lufs(V)) / 20)
ve, n = env(V, .02); on = (ve > ve.max() * .06).astype(float); k = 4
on = np.convolve(np.pad(on, (k, k), mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='same')[k:-k]
d = 10 ** (C.get('duck_db', -16) * on / 20); d = np.repeat(d, n)[:N]; d = np.concatenate([d, np.full(N - len(d), d[-1])])
Xd = X * d[:, None]; mix = V + Xd
if C.get('music'):
    m = C['music']; M = load(path(m['file']))[int(m.get('off', 0) * SR):]; st = int(m.get('start', 0) * SR)
    M = np.vstack([np.zeros((st, 2)), M])[:N]; M = np.vstack([M, np.zeros((N - len(M), 2))]); M *= 10 ** ((m.get('lufs', -34) - lufs(M)) / 20)
    fo = int(m.get('fade_out', 1.0) * SR); M[-fo:] *= np.linspace(1, 0, fo)[:, None]
    dm = 10 ** (m.get('duck_db', -4) * on / 20); dm = np.repeat(dm, n)[:N]; dm = np.concatenate([dm, np.full(N - len(dm), dm[-1])]); M *= dm[:, None]
    mix += M
def kw(x):
    b, a = butter(2, 100 / (SR / 2), 'high'); y = lfilter(b, a, x); b, a = butter(1, 1500 / (SR / 2), 'high'); return y + .6 * lfilter(b, a, y)
v = kw(V.mean(1)); r = kw((mix - V).mean(1)); out = []; ve2 = np.mean(v ** 2)
for i in range(0, N - 4800, 1200):
    pv = np.mean(v[i:i + 4800] ** 2)
    if pv > ve2 * .25: out.append((10 * np.log10(pv / (np.mean(r[i:i + 4800] ** 2) + 1e-12)), i / SR))
out.sort()
if out: print('voice vs everything else: median %.1f dB, worst %.1f dB at %.2f s; next worst %s' % (np.median([a for a, _ in out]), out[0][0], out[0][1], [(round(a, 1), round(b, 2)) for a, b in out[1:5]]))
sf.write(str(res / 'premaster.wav'), mix, SR, subtype='FLOAT'); print('wrote', res / 'premaster.wav', f'({DUR:.2f} s)')
