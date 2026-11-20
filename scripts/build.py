"""Build steps for a Maven Map project.

  python build.py <project> prep                   camera per frame -> download the satellite patches it needs (run after every camera change)
  python build.py <project> stills 0.5,1.4,2.9     render chosen moments to <project>/check and tile check/sheet.jpg
  python build.py <project> shots                  one still from the middle of every shot -> check/shots.jpg
  python build.py <project> frames [fps]           render every frame (uses MAVEN_FPS env or config fps, default 60)
  python build.py <project> final                  mix (cues.json) -> master -14 LUFS / -1.8 dBTP -> encode -> <project>/<name>.mp4 + check/final.jpg
  python build.py <project> all                    prep + frames + final
  python build.py <project> resume A B             re-render frames for seconds A..B only (after a small fix), then final
"""
import json, os, re, subprocess, sys, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
PY = sys.executable
proj = Path(sys.argv[1]).resolve()
step = sys.argv[2] if len(sys.argv) > 2 else 'all'
cfg = json.loads((proj / 'config.json').read_text(encoding='utf-8')) if (proj / 'config.json').exists() else {}
name = cfg.get('name', proj.name)
if cfg:
    (proj / 'web' / 'config.json').write_text(json.dumps(cfg, ensure_ascii=False), encoding='utf-8')


def get_env_fps(default=60):
    raw = os.environ.get('MAVEN_FPS', '').strip()
    if raw:
        try:
            return max(1, int(raw))
        except ValueError:
            pass
    return int(cfg.get('fps', default))


def get_env_threads(default=4):
    raw = (os.environ.get('FFMPEG_THREADS') or os.environ.get('FFMPEG_DEFAULT_THREADS') or '').strip()
    if raw:
        try:
            return max(1, int(raw))
        except ValueError:
            pass
    return int(default)


def get_env_encoder(default='libx264'):
    raw = os.environ.get('FFMPEG_ENCODER', '').strip()
    return raw if raw else default


def sh(cmd, **kw):
    print('>', cmd if isinstance(cmd, str) else ' '.join(map(str, cmd)), flush=True)
    r = subprocess.run(cmd, **kw)
    if r.returncode:
        sys.exit(r.returncode)


def run_encode_with_fallback(base_cmd_prefix, out_path, encoder, threads):
    enc = (encoder or 'libx264').strip()
    if enc == 'h264_nvenc':
        nvenc_cmd = [
            *base_cmd_prefix,
            '-threads', str(threads),
            '-c:v', 'h264_nvenc',
            '-preset', 'p4',
            '-rc', 'vbr',
            '-cq', '20',
            '-b:v', '8M',
            '-maxrate', '14M',
            '-bufsize', '16M',
            '-c:a', 'aac',
            '-b:a', '256k',
            '-fflags', '+bitexact',
            str(out_path),
        ]
        print('>', ' '.join(map(str, nvenc_cmd)), flush=True)
        r = subprocess.run(nvenc_cmd)
        if r.returncode == 0:
            return
        print('[WARN] h264_nvenc failed or is unsupported here; falling back to libx264...', flush=True)

    x264_cmd = [
        *base_cmd_prefix,
        '-threads', str(threads),
        '-c:v', 'libx264',
        '-crf', '18',
        '-preset', 'medium',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-fflags', '+bitexact',
        str(out_path),
    ]
    sh(x264_cmd)


def node_render(*args, page=None):
    env = dict(os.environ)
    env['PAGE'] = page or cfg.get('page', 'index.html')
    sh(['node', str(HERE / 'render.mjs'), str(proj), *map(str, args)], env=env)


def shotlist():
    out = subprocess.run(
        ['node', str(HERE / 'render.mjs'), str(proj), 'stills', '0', str(proj / 'check' / '_probe')],
        capture_output=True,
        text=True,
        env={**os.environ, 'PAGE': cfg.get('page', 'index.html')},
    ).stdout
    m = re.search(r'shots (\[.*\])', out)
    return json.loads(m.group(1)) if m else []


if step in ('prep', 'all'):
    sh([PY, str(HERE / 'prep.py')])  # the globe texture, once per computer
    node_render('cams', get_env_fps(30))
    sh([PY, str(HERE / 'prep.py'), str(proj)])

if step == 'stills':
    shutil.rmtree(proj / 'check' / 'stills', ignore_errors=True)
    node_render('stills', sys.argv[3], proj / 'check' / 'stills')
    sh([PY, str(HERE / 'sheet.py'), str(proj / 'check' / 'stills'), str(proj / 'check' / 'sheet.jpg'), '6', '300'])
elif step == 'shots':
    S = shotlist()
    ts = ','.join(f'{(a + b) / 2:.2f}' for a, b in S)
    shutil.rmtree(proj / 'check' / 'shots', ignore_errors=True)
    node_render('stills', ts, proj / 'check' / 'shots')
    sh([PY, str(HERE / 'sheet.py'), str(proj / 'check' / 'shots'), str(proj / 'check' / 'shots.jpg'), '6', '300'])
    for i, (a, b) in enumerate(S):
        print(f'shot {i + 1:2d}  {a:5.2f} - {b:5.2f}  ({b - a:.2f} s)')

if step in ('frames', 'all'):
    fps = int(sys.argv[3]) if step == 'frames' and len(sys.argv) > 3 else get_env_fps(60)
    shutil.rmtree(proj / 'frames', ignore_errors=True)
    node_render('frames', fps)

if step == 'resume':
    fps = json.loads((proj / 'render.json').read_text())['fps']
    a, b = float(sys.argv[3]), float(sys.argv[4])
    node_render('frames', fps, int(a * fps), int(b * fps))
    step = 'final'

if step in ('final', 'all'):
    res = proj / 'result'
    res.mkdir(exist_ok=True)
    rj = json.loads((proj / 'render.json').read_text())
    fps = rj['fps']
    end = rj['end']
    blend = max(1, fps // 60)
    threads = get_env_threads(4)
    encoder = get_env_encoder('libx264')

    sh([PY, str(HERE / 'mix.py'), str(proj)])
    tp = cfg.get('true_peak', -1.8)
    target = cfg.get('lufs', -14)
    o = subprocess.run(
        ['ffmpeg', '-hide_banner', '-i', str(res / 'premaster.wav'), '-af', f'loudnorm=I={target}:TP={tp}:LRA=11:print_format=json', '-f', 'null', '-'],
        capture_output=True,
        text=True,
    ).stderr
    J = json.loads(o[o.rindex('{'):o.rindex('}') + 1])
    sh([
        'ffmpeg', '-v', 'error', '-y',
        '-threads', str(threads),
        '-i', str(res / 'premaster.wav'),
        '-af', f"loudnorm=I={target}:TP={tp}:LRA=11:measured_I={J['input_i']}:measured_TP={J['input_tp']}:measured_LRA={J['input_lra']}:measured_thresh={J['input_thresh']}:offset={J['target_offset']}:linear=true,aresample=48000",
        '-c:a', 'pcm_s24le',
        str(res / 'master.wav'),
    ])

    out = proj / f'{name}.mp4'
    vf = (f"tmix=frames={blend}:weights={' '.join(['1'] * blend)}," if blend > 1 else '') + 'fps=60,format=yuv420p'
    encode_prefix = [
        'ffmpeg', '-v', 'error', '-y',
        '-framerate', str(fps),
        '-i', str(proj / 'frames' / 'f%05d.jpg'),
        '-i', str(res / 'master.wav'),
        '-vf', vf,
        '-t', str(end),
    ]
    run_encode_with_fallback(encode_prefix, out, encoder, threads)

    m = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(out), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1]
    P = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', m)[-1]
    fin = proj / 'check' / 'final'
    shutil.rmtree(fin, ignore_errors=True)
    fin.mkdir(parents=True)
    sh(['ffmpeg', '-v', 'error', '-threads', str(threads), '-i', str(out), '-vf', 'fps=3', '-q:v', '3', str(fin / 'f%03d.jpg')])
    sh([PY, str(HERE / 'sheet.py'), str(fin), str(proj / 'check' / 'final.jpg'), '10', '200'])
    print('CREDIT for the description: Satellite imagery: EOxCloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0 - https://cloudless.eox.at  |  Borders: Natural Earth (public domain)')
    print(f'\nDONE {out}\n  loudness {I} LUFS, true peak {P} dBTP, {end:.2f} s, 1080x1920 @ 60 fps (from {fps} fps, {blend}-frame blend, encoder={encoder}, threads={threads})')