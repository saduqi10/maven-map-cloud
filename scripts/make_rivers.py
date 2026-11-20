"""Pack Natural Earth 1:10m rivers into data/rivers.json (run once; the result ships with the skill).

Each river name becomes its pieces joined into chains (end to start where they touch), longest first, as flat int
lists (lon/lat * 1e4). Natural Earth draws most rivers source -> mouth; story.js can flip one with reverse:true.
"""
import json, math, urllib.request
from pathlib import Path
D = Path(__file__).resolve().parent.parent / 'data'
SRC = D / 'ne10_rivers.geojson'
if not SRC.exists():
    urllib.request.urlretrieve('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson', SRC)
g = json.loads(SRC.read_text(encoding='utf-8'))
by = {}
for f in g['features']:
    p = f['properties']; n = p.get('name_en') or p.get('name')
    if not n or (p.get('scalerank') or 99) > 9: continue
    geo = f['geometry']; lines = geo['coordinates'] if geo['type'] == 'MultiLineString' else [geo['coordinates']]
    by.setdefault(n, {'rank': p.get('scalerank'), 'lines': []})['lines'] += [l for l in lines if len(l) > 1]
    by[n]['rank'] = min(by[n]['rank'], p.get('scalerank'))


def chain(lines):
    lines = [list(map(tuple, l)) for l in lines]; out = []
    close = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-3
    while lines:
        c = lines.pop(0); grew = True
        while grew:
            grew = False
            for i, l in enumerate(lines):
                if close(c[-1], l[0]): c += l[1:]
                elif close(c[-1], l[-1]): c += l[::-1][1:]
                elif close(c[0], l[-1]): c = l + c[1:]
                elif close(c[0], l[0]): c = l[::-1] + c[1:]
                else: continue
                lines.pop(i); grew = True; break
        out.append(c)
    return sorted(out, key=len, reverse=True)


R = []
for n, v in by.items():
    parts = []
    for c in chain(v['lines']):
        flat = []
        for x, y in c: flat += [round(x * 1e4), round(y * 1e4)]
        parts.append(flat)
    R.append({'name': n, 'rank': v['rank'], 'parts': parts})
(D / 'rivers.json').write_text(json.dumps({'source': 'Natural Earth 1:10m rivers + lake centerlines (public domain)', 'rivers': R},
                                          separators=(',', ':')), encoding='utf-8')
print(len(R), 'rivers ->', D / 'rivers.json', round((D / 'rivers.json').stat().st_size / 1e6, 1), 'MB')
