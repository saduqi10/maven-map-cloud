"""Pack Natural Earth 1:10m countries into data/world.json for the engine (run once; the result ships with the skill).

    py -3 make_world.py            (downloads ne_10m_admin_0_countries.geojson from GitHub if data/ne10.geojson is missing)

Natural Earth is public domain. Each country keeps: ISO3 code, English + Arabic name, label point, bbox, and its rings
as flat integer lists (lon/lat * 1e4, rounded), so the browser can draw any country at any zoom.
"""
import json, urllib.request
from pathlib import Path

D = Path(__file__).resolve().parent.parent / 'data'
SRC = D / 'ne10.geojson'
if not SRC.exists():
    urllib.request.urlretrieve('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson', SRC)
g = json.loads(SRC.read_text(encoding='utf-8'))
out = []
for f in g['features']:
    p = f['properties']; geo = f['geometry']
    polys = geo['coordinates'] if geo['type'] == 'MultiPolygon' else [geo['coordinates']]
    rings = []
    for poly in polys:
        for ring in poly:
            flat = []; last = None
            for lon, lat in ring:
                q = (round(lon * 1e4), round(lat * 1e4))
                if q != last: flat += q; last = q
            if len(flat) >= 6: rings.append(flat)
    xs = [r[i] for r in rings for i in range(0, len(r), 2)]; ys = [r[i] for r in rings for i in range(1, len(r), 2)]
    iso = p['ADM0_A3'] if p['ISO_A3'] in ('-99', None) else p['ISO_A3']
    out.append({'iso': iso, 'a3': p['ADM0_A3'], 'en': p['NAME'], 'ar': p.get('NAME_AR') or p['NAME'],
                'lx': p.get('LABEL_X'), 'ly': p.get('LABEL_Y'),
                'bb': [min(xs) / 1e4, min(ys) / 1e4, max(xs) / 1e4, max(ys) / 1e4], 'r': rings})
(D / 'world.json').write_text(json.dumps({'source': 'Natural Earth 1:10m admin-0 countries (public domain)', 'scale': 1e4, 'countries': out},
                                          ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(len(out), 'countries ->', D / 'world.json', round((D / 'world.json').stat().st_size / 1e6, 1), 'MB')
