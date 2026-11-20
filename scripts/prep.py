"""Fetch the real satellite imagery a Maven Map project needs.

    python prep.py <project>            (run after the story's camera is written; build.py runs it for you)

1. The globe: cache/globe-8k.jpg, the whole Earth (8192x4096, plate carree), downloaded once per computer.
2. Detail patches: render.mjs writes the camera of every frame (cams.json); wherever the camera is closer than the
   globe texture can show sharply, a patch (up to 4096 px a side) is downloaded around that view at 1.6x the needed
   resolution, so one patch serves until the camera has zoomed in about 2x further. They go to <project>/web/img/.

Imagery: EOxCloudless 2016 (https://cloudless.eox.at) by EOX IT Services GmbH, contains modified Copernicus Sentinel
data 2016, licensed CC BY 4.0. Put the credit in the video description (build.py prints it). Later years of this
layer are non-commercial, so the skill only uses 2016.
"""
import json, math, subprocess, sys, time, urllib.request, io
from pathlib import Path
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
SKILL = Path(__file__).resolve().parent.parent
WMS = 'https://tiles.maps.eox.at/wms?service=WMS&request=GetMap&version=1.1.1&layers=s2cloudless&styles=&srs=EPSG:4326&format=image/jpeg'
CREDIT = 'Satellite imagery: EOxCloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0 - https://cloudless.eox.at'
BASE_D = 8192 / (2 * math.pi)       # globe texture pixels per radian
MAXPX = 4096


def get(bbox, w, h, tries=4):
    url = f'{WMS}&bbox={bbox[0]:.5f},{bbox[1]:.5f},{bbox[2]:.5f},{bbox[3]:.5f}&width={w}&height={h}'
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'maven-map'}), timeout=120) as r:
                data = r.read()
            im = Image.open(io.BytesIO(data))
            if im.size == (w, h): return im.convert('RGB')
        except Exception as e:
            print('  retry', i + 1, e)
        time.sleep(2 + 3 * i)
    sys.exit(f'could not download imagery for {bbox}')


def globe():
    out = SKILL / 'cache' / 'globe-8k.jpg'
    if out.exists(): return
    out.parent.mkdir(exist_ok=True); print('downloading the globe (2 x 4096 px, once per computer)')
    g = Image.new('RGB', (8192, 4096))
    for i, x0 in enumerate((-180, 0)):
        g.paste(get((x0, -90, x0 + 180, 90), 4096, 4096), (i * 4096, 0))
    g.save(out, quality=92); print('  ', out)


def patches(proj):
    cj = proj / 'cams.json'
    if not cj.exists(): sys.exit('no cams.json: run  node render.mjs <project> cams 30  first (build.py prep does both)')
    cams = json.loads(cj.read_text())['cams']
    img = proj / 'web' / 'img'; img.mkdir(parents=True, exist_ok=True)
    old = json.loads((img / 'patches.json').read_text()) if (img / 'patches.json').exists() else []
    P = []
    q = float(json.loads((proj / 'config.json').read_text(encoding='utf-8')).get('quality', 1.0)) if (proj / 'config.json').exists() else 1.0

    def covers(p, bb, need):
        return p['bb'][0] <= bb[0] and p['bb'][2] >= bb[2] and p['bb'][1] <= bb[1] and p['bb'][3] >= bb[3] and p['d'] >= .8 * need

    for t, lon, lat, k, cy in cams:
        need = k * q
        if need <= BASE_D * 1.25: continue
        cl = max(.15, math.cos(math.radians(lat)))
        hx = math.degrees(540 / k) / cl; hy = math.degrees(1920 / k)
        bb = (lon - hx, lat - hy * cy * 1.1, lon + hx, lat + hy * (1 - cy) * 1.1)
        bb = (bb[0], max(-85, bb[1]), bb[2], min(85, bb[3]))
        if any(covers(p, bb, need) for p in P): continue
        d = 1.6 * need                                   # pixels per radian of latitude (and of ground distance)
        ex = math.degrees(MAXPX / (d * cl)); ey = math.degrees(MAXPX / d)
        ex = max(ex, (bb[2] - bb[0]) * 1.05); ey = max(ey, (bb[3] - bb[1]) * 1.05)
        cy0 = (bb[1] + bb[3]) / 2
        pb = [round(lon - ex / 2, 5), round(max(-85, cy0 - ey / 2), 5), round(lon + ex / 2, 5), round(min(85, cy0 + ey / 2), 5)]
        w = min(MAXPX, round(math.radians(pb[2] - pb[0]) * d * cl)); h = min(MAXPX, round(math.radians(pb[3] - pb[1]) * d))
        dd = min(w / (math.radians(pb[2] - pb[0]) * cl), h / math.radians(pb[3] - pb[1]))
        P.append({'bb': pb, 'w': w, 'h': h, 'd': round(dd), 't': round(t, 2)})
    out = []
    for i, p in enumerate(P):
        name = f"p{i}_{p['bb'][0]:.3f}_{p['bb'][1]:.3f}_{p['w']}x{p['h']}.jpg"
        if not (img / name).exists():
            print(f"patch {i}: t={p['t']}s  bbox {p['bb']}  {p['w']}x{p['h']} px  ({p['d']} px/rad)")
            get(p['bb'], p['w'], p['h']).save(img / name, quality=92)
        out.append({'src': name, 'bb': p['bb'], 'd': p['d']})
    keep = {o['src'] for o in out}
    for f in img.glob('p*.jpg'):
        if f.name not in keep: f.unlink()
    (img / 'patches.json').write_text(json.dumps(out, indent=1))
    print(f'{len(out)} detail patches for {len(cams)} frames ->', img)
    print('CREDIT for the description:', CREDIT)


if __name__ == '__main__':
    globe()
    if len(sys.argv) > 1: patches(Path(sys.argv[1]).resolve())
