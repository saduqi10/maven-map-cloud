// Maven Map engine: a real-satellite globe (orthographic, WebGL2) that dives from space to a street, with map graphics
// drawn on top (country highlights, routes, moving ships, rulers, pins, numbers, Arabic word-timed captions).
// Everything is a pure function of time: seek(t) draws frame t. The story file (web/story.js) only declares things.
export const W = 1080, H = 1920;
const D2R = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const EASE = {
  linear: t => t, out: t => 1 - (1 - t) ** 3, in: t => t ** 3, io: t => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  back: t => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; }, sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};
export const COL = { blue: '#4fb3ff', tint: 'rgba(79,179,255,.42)', orange: '#ff9a1f', red: '#ff4d4d', green: '#3fd27a', yellow: '#ffd23f',
  purple: '#b58cff', teal: '#2fd6c8', pink: '#ff7ab6', white: '#ffffff', ink: '#0b1220', fire: '#ff7a1a', sand: '#f6eea0' };
const col = c => COL[c] || c;
const rgba = (hex, a) => { if (!hex.startsWith('#')) return hex; const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };

// ------------------------------------------------------------------ load
const q = new URLSearchParams(location.search);
const getJSON = (u, d) => fetch(u).then(r => r.ok ? r.json() : d).catch(() => d);
const CFG = await getJSON('config.json', {});
const TIMING = await getJSON('timing.json', { words: [], dur: 10 });
const WORLD = await getJSON('/data/world.json', { countries: [] });
const PATCHES = await getJSON('img/patches.json', []);
const RIVERS = await getJSON('/data/rivers.json', { rivers: [] });
const LOOK = CFG.look || 'atlas';   // 'atlas': bright satellite, teal sea (the viral map-Shorts look) | 'night': dark sea, dimmed
const LANG = CFG.lang || TIMING.lang || 'ar', RTL = LANG === 'ar';
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('image ' + src)); i.src = src; });
const FONTS = [['MapSerif', 'fonts/DMSerifDisplay-Italic.ttf'], ['MapLatText', 'fonts/Poppins-SemiBold.ttf'], ['MapRuqaa', 'fonts/ArefRuqaa-Bold.ttf'], ['MapAr', 'fonts/Lalezar-Regular.ttf'], ['MapArText', 'fonts/IBMPlexSansArabic-SemiBold.ttf'], ['MapLat', 'fonts/Poppins-ExtraBold.ttf']];
for (const [f, u] of FONTS) { const ff = new FontFace(f, `url(${u})`); await ff.load(); document.fonts.add(ff); }
const BY = {}; for (const c of WORLD.countries) { BY[c.iso] = c; BY[c.a3] = BY[c.a3] || c; BY[c.en.toLowerCase()] = c; BY[c.ar] = c; }
export const country = k => BY[k] || BY[String(k).toLowerCase()] || null;

// ------------------------------------------------------------------ time words
const nw = w => String(w).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]/gu, '');
export const WORDS = TIMING.words || [];
// when(5.2) | when('هرمز') | when('هرمز#2') | when('هرمز+0.2') | when('هرمز.end') (end of the word)
export function when(x) {
  if (typeof x === 'number') return x;
  const m = String(x).match(/^(.+?)(?:#(\d+))?(\.end)?([+-][\d.]+)?$/); if (!m) throw new Error('when(): ' + x);
  const key = nw(m[1]), n = +(m[2] || 1), off = +(m[4] || 0);
  let hits = WORDS.filter(w => nw(w[0]) === key); if (!hits.length) hits = WORDS.filter(w => nw(w[0]).startsWith(key) || key.startsWith(nw(w[0])) && nw(w[0]).length > 2);
  if (hits.length < n) throw new Error(`word not in timing: ${x}`);
  return (m[3] ? hits[n - 1][2] : hits[n - 1][1]) + off;
}
export const T = when;

// ------------------------------------------------------------------ camera
// keys: {t, lon, lat, span (degrees of arc across the frame width), cy (0..1 screen height of the centre), roll, ease, dive}
const CAMS = [];
export function cam(t, o) { CAMS.push({ t: when(t), cy: .42, ease: 'io', ...o }); CAMS.sort((a, b) => a.t - b.t); }
const kOf = span => W / (span * D2R);   // pixels per radian at the centre
export function camAt(t) {
  if (!CAMS.length) return { lon: 0, lat: 20, span: 140, cy: .42, roll: 0 };
  if (t <= CAMS[0].t) return { ...CAMS[0] }; const L = CAMS[CAMS.length - 1]; if (t >= L.t) return { ...L };
  let i = 0; while (CAMS[i + 1].t < t) i++;
  const a = CAMS[i], b = CAMS[i + 1], u = (t - a.t) / (b.t - a.t), e = EASE[b.ease] || EASE.io;
  const z = e(u); let c = z;
  if (b.dive) { c = EASE.out(clamp(u * 1.25)); }      // a dive turns to the target first, then falls in
  let dl = b.lon - a.lon; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
  const ls = Math.log(a.span), le = Math.log(b.span);
  return { lon: a.lon + dl * c, lat: lerp(a.lat, b.lat, c), span: Math.exp(lerp(ls, le, z)), cy: lerp(a.cy, b.cy, z), roll: lerp(a.roll || 0, b.roll || 0, z) };
}
let C = null;   // the camera of the frame being drawn: {l0, p0, k, cx, cy, sp, cp}
function setCam(c) { C = { l0: c.lon * D2R, p0: c.lat * D2R, k: kOf(c.span), cx: W / 2, cy: c.cy * H, span: c.span }; C.sp = Math.sin(C.p0); C.cp = Math.cos(C.p0); }
// lon/lat -> screen [x, y, front]; points on the far side are pushed to the horizon
export function P(lon, lat) {
  const l = lon * D2R - C.l0, p = lat * D2R, cl = Math.cos(l), cp = Math.cos(p), sp = Math.sin(p);
  const cosc = C.sp * sp + C.cp * cp * cl;
  let x = cp * Math.sin(l), y = C.cp * sp - C.sp * cp * cl;
  if (cosc < 0) { const r = Math.hypot(x, y) || 1; x /= r; y /= r; }
  return [C.cx + x * C.k, C.cy - y * C.k, cosc >= 0];
}
export const pxPerKm = () => C.k / 6371;

// ------------------------------------------------------------------ WebGL globe
const gl = document.getElementById('gl').getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
if (!gl) throw new Error('WebGL2 is not available');
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const NP = 4;
const FS = `#version 300 es
precision highp float;
uniform sampler2D base; uniform sampler2D p0; uniform sampler2D p1; uniform sampler2D p2; uniform sampler2D p3;
uniform vec4 bb[${NP}]; uniform int np;
uniform vec2 res; uniform vec2 ctr; uniform float R; uniform float l0; uniform float ph0; uniform float t;
uniform float ocean; uniform float dimv; uniform float sat; uniform float roll; uniform sampler2D mask; uniform float look;
out vec4 o;
const float PI = 3.14159265;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 f = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);
  vec2 d = (f - ctr) / R; d = vec2(d.x*cos(roll) - d.y*sin(roll), d.x*sin(roll) + d.y*cos(roll));
  float x = d.x, y = -d.y, rho = length(vec2(x, y));
  // space + atmosphere
  float edge = rho - 1.;
  vec3 sky = mix(vec3(.012,.02,.05), vec3(.03,.06,.14), clamp(1.2 - rho*.35, 0., 1.));
  float st = step(.9975, h21(floor(f/2.))) * (.4 + .6*h21(floor(f/2.)+3.)); sky += st*.8*clamp(edge*2., 0., 1.);
  float atm = exp(-max(edge, 0.) * 9.) * .85;
  if (rho > 1.) { o = vec4(sky + vec3(.32,.58,1.)*atm*smoothstep(0., .02, edge+.02), 1.); return; }
  float cosc = sqrt(max(0., 1. - rho*rho));
  float sp = sin(ph0), cp = cos(ph0);
  float lat = asin(clamp(cosc*sp + y*cp, -1., 1.));
  float lonr = atan(x, cp*cosc - y*sp);            // longitude relative to the centre: continuous on screen
  float lon = l0 + lonr;
  float lonD = lon * 57.2957795, latD = lat * 57.2957795, lonrD = lonr*57.2957795;
  // base texture with gradients from the continuous coordinate (no seam at the date line)
  vec2 ub = vec2(fract((lonD + 180.)/360.), (90. - latD)/180.);
  vec2 uc = vec2(lonrD/360., (90. - latD)/180.);
  vec3 c = textureGrad(base, ub, dFdx(uc), dFdy(uc)).rgb;
  // detail patches, finest first (screen slopes taken here, outside the branch)
  vec2 gxl = vec2(dFdx(lonrD), dFdx(latD)), gyl = vec2(dFdy(lonrD), dFdy(latD));
  for (int i = 0; i < ${NP}; i++) {
    if (i >= np) break;
    vec4 b = bb[i]; float L = lonD; if (L < b.x - 180.) L += 360.; if (L > b.z + 180.) L -= 360.;
    if (L > b.x && L < b.z && latD > b.y && latD < b.w) {
      vec2 uv = vec2((L - b.x)/(b.z - b.x), (b.w - latD)/(b.w - b.y));
      vec2 sc = vec2(1./(b.z - b.x), -1./(b.w - b.y));
      vec2 gx = gxl*sc, gy = gyl*sc;
      vec3 s = i==0 ? textureGrad(p0, uv, gx, gy).rgb : i==1 ? textureGrad(p1, uv, gx, gy).rgb : i==2 ? textureGrad(p2, uv, gx, gy).rgb : textureGrad(p3, uv, gx, gy).rgb;
      float m = min(min(uv.x, 1.-uv.x), min(uv.y, 1.-uv.y));
      c = mix(c, s, smoothstep(0., .015, m)); break;
    }
  }
  // even out the ocean mosaic: dark bluish water -> one deep sea colour (shallows and land untouched)
  float lu = dot(c, vec3(.299,.587,.114));
  float land = texture(mask, vec2(gl_FragCoord.x/res.x, 1. - gl_FragCoord.y/res.y)).r;   // Natural Earth land, drawn each frame
  float water = (1. - land) * smoothstep(.42, .2, lu);
  vec3 sea = look > .5 ? vec3(.10,.34,.41) * (.55 + 2.9*lu) : vec3(.035,.10,.20) * (.8 + 1.4*lu);
  c = mix(c, sea, water*ocean);
  // grade: a touch more saturation, then dim so graphics pop
  float g = dot(c, vec3(.299,.587,.114)); c = mix(vec3(g), c, sat); c *= dimv;
  if (look > .5) c = pow(c, vec3(1.18)) * .97;   // atlas: calmer desert, a little more contrast
  // sphere shading + limb haze
  vec3 n = vec3(x, y, cosc); float lam = .78 + .32*dot(n, normalize(vec3(-.45,.5,.75)));
  float limb = pow(1. - cosc, 3.);
  c = c*mix(1., lam, clamp(1.4 - R/4000., 0., 1.)) + vec3(.3,.55,1.)*limb*.55;
  o = vec4(c, 1.);
}`;
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
const U = n => gl.getUniformLocation(prog, n);
const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
function tex(img, wrap) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap ? gl.REPEAT : gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  return t;
}
const BASE = tex(await loadImg(CFG.globe || '/cache/globe-8k.jpg'), true);
const PT = []; for (const p of PATCHES) PT.push({ ...p, tex: tex(await loadImg('img/' + p.src), false) });
gl.viewport(0, 0, W, H);
const MK = document.createElement('canvas'); MK.width = W / 4; MK.height = H / 4; const MX = MK.getContext('2d');
const MASK = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, MASK);
for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
function landMask() {   // white land on black, quarter resolution, same projection
  MX.setTransform(1, 0, 0, 1, 0, 0); MX.fillStyle = '#000'; MX.fillRect(0, 0, MK.width, MK.height); MX.setTransform(.25, 0, 0, .25, 0, 0); MX.fillStyle = '#fff';
  const lon = C.l0 / D2R, lat = C.p0 / D2R, hx = Math.min(W / C.k, 3.2) / D2R / Math.max(.15, C.cp), hy = Math.min(H / C.k * 1.2, 3.2) / D2R;
  for (const c of WORLD.countries) {
    if (C.span < 60 && (c.bb[2] < lon - hx || c.bb[0] > lon + hx || c.bb[3] < lat - hy || c.bb[1] > lat + hy)) continue;
    MX.fill(countryPath([c], 4).p, 'nonzero');
  }
  gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, MASK); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, MK); gl.uniform1i(U('mask'), 7);
}
function drawGlobe(t) {
  landMask();
  // patches that matter for this frame: those that intersect the view and are sharper than the base, finest first
  const hx = Math.min(W / 2 / C.k, 1.6) / D2R / Math.max(.2, C.cp), hy = Math.min(H / C.k, 1.6) / D2R;
  const lon = C.l0 / D2R, lat = C.p0 / D2R;
  const use = PT.filter(p => p.bb[0] < lon + hx && p.bb[2] > lon - hx && p.bb[1] < lat + hy && p.bb[3] > lat - hy && p.d > 1304 * 1.1)
    .sort((a, b) => b.d - a.d).slice(0, NP);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, BASE); gl.uniform1i(U('base'), 0);
  const bb = new Float32Array(NP * 4);
  use.forEach((p, i) => { gl.activeTexture(gl.TEXTURE1 + i); gl.bindTexture(gl.TEXTURE_2D, p.tex); bb.set(p.bb, i * 4); });
  for (let i = 0; i < NP; i++) gl.uniform1i(U('p' + i), 1 + i);
  gl.uniform4fv(U('bb'), bb); gl.uniform1i(U('np'), use.length);
  gl.uniform2f(U('res'), W, H); gl.uniform2f(U('ctr'), C.cx, C.cy); gl.uniform1f(U('R'), C.k);
  gl.uniform1f(U('l0'), C.l0); gl.uniform1f(U('ph0'), C.p0); gl.uniform1f(U('t'), t); gl.uniform1f(U('roll'), 0);
  gl.uniform1f(U('look'), LOOK === 'atlas' ? 1 : 0); gl.uniform1f(U('ocean'), CFG.ocean ?? (LOOK === 'atlas' ? .9 : .8)); gl.uniform1f(U('dimv'), dimAt(t)); gl.uniform1f(U('sat'), CFG.sat ?? (LOOK === 'atlas' ? .86 : 1.12));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ------------------------------------------------------------------ 2D layer
const cv = document.getElementById('c'), X = cv.getContext('2d');
const ITEMS = [];   // everything the story adds: {kind, t0, t1, draw(ctx, t)}
const add = (o) => { ITEMS.push(o); return o; };
const DIMS = [];
export function dim(t0, v = .72, t1 = null, dur = .5) { DIMS.push({ t0: when(t0), t1: t1 == null ? 1e9 : when(t1), v, dur }); }
function dimAt(t) { let v = CFG.dim ?? (LOOK === 'atlas' ? .95 : .9); for (const d of DIMS) if (t >= d.t0 && t < d.t1 + d.dur) { const a = clamp((t - d.t0) / d.dur) * (1 - clamp((t - d.t1) / d.dur)); v = lerp(v, d.v, EASE.sine(a)); } return v; }
const life = (o, t) => {   // 0..1 entrance, then 1, then exit 1..0 ; returns [in, out]
  const a = clamp((t - o.t0) / (o.dur || .45)), b = o.t1 == null ? 1 : 1 - clamp((t - o.t1) / (o.outDur || .35)); return [a, b];
};
function strokeText(x, y, s, font, fill, stroke = 'rgba(0,0,0,.6)', lw = 10, align = 'center') {
  X.font = font; X.textAlign = align; X.textBaseline = 'middle'; X.direction = RTL ? 'rtl' : 'ltr'; X.lineJoin = 'round';
  if (stroke) { X.strokeStyle = stroke; X.lineWidth = lw; X.strokeText(s, x, y); } X.fillStyle = fill; X.fillText(s, x, y);
}
const fontAr = (px, f = 'MapAr') => `${px}px ${f}, MapLat`;
function rr(x, y, w, h, r) { X.beginPath(); X.moveTo(x + r, y); X.arcTo(x + w, y, x + w, y + h, r); X.arcTo(x + w, y + h, x, y + h, r); X.arcTo(x, y + h, x, y, r); X.arcTo(x, y, x + w, y, r); X.closePath(); }
function pill(x, y, s, bg, fg = '#fff', px = 46, a = 1, sc = 1) {
  X.save(); X.translate(x, y); X.scale(sc, sc); X.globalAlpha *= a; X.font = fontAr(px); const w = X.measureText(s).width + px * .9, h = px * 1.35;
  X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 18; X.shadowOffsetY = 6; rr(-w / 2, -h / 2, w, h, h / 2); X.fillStyle = bg; X.fill(); X.shadowColor = 'transparent';
  strokeText(0, px * .06, s, fontAr(px), fg, null); X.restore();
}

// country rings -> one Path2D in screen space for this frame (points closer than 1.2 px are skipped)
function countryPath(cs, step = 1.2) {
  const p = new Path2D(); let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, len = 0;
  const vis = [C.l0 / D2R, C.p0 / D2R], hx = Math.min(W / C.k, 3.2) / D2R / Math.max(.15, C.cp), hy = Math.min(H / C.k * 1.2, 3.2) / D2R;
  for (const c of cs) for (const r of c.r) {
    let rx0 = 1e9, rx1 = -1e9, ry0 = 1e9, ry1 = -1e9;
    for (let i = 0; i < r.length; i += 2) { const a = r[i] / 1e4, b = r[i + 1] / 1e4; if (a < rx0) rx0 = a; if (a > rx1) rx1 = a; if (b < ry0) ry0 = b; if (b > ry1) ry1 = b; }
    if (C.span < 60 && (rx1 < vis[0] - hx || rx0 > vis[0] + hx || ry1 < vis[1] - hy || ry0 > vis[1] + hy)) continue;
    let lx = null, ly = null, fx, fy;
    for (let i = 0; i < r.length; i += 2) {
      const [x, y] = P(r[i] / 1e4, r[i + 1] / 1e4);
      if (lx === null) { p.moveTo(x, y); fx = x; fy = y; lx = x; ly = y; continue; }
      const dd = Math.abs(x - lx) + Math.abs(y - ly); if (dd < step && i < r.length - 2) continue;
      p.lineTo(x, y); len += dd; lx = x; ly = y; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    p.closePath();
  }
  return { p, box: [x0, y0, x1, y1], len, n };
}

// ------------------------------------------------------------------ elements
const STYLE = {
  // hue: recolours the satellite picture (relief stays visible); fill: a light coat on top
  tint: { hue: 'rgba(40,140,255,.75)', fill: 'rgba(40,140,255,.22)', line: 'rgba(255,255,255,.95)', lw: 3 },
  solid: { hue: 'rgba(255,150,30,.9)', fill: 'rgba(255,150,30,.42)', line: '#fff', lw: 3.5 },
  flat: { fill: 'rgba(255,154,31,.9)', line: '#fff', lw: 3.5 },
  glow: { hue: 'rgba(255,120,26,.9)', fill: 'rgba(255,122,26,.55)', line: '#ffd9a8', lw: 3, glow: '#ff7a1a' },
  outline: { fill: null, line: '#ffd23f', lw: 5 },
  zone: { fill: null, line: '#fff', lw: 3 },
};
// atlas colours (raised, textured): region(..., {style:'red'}) ; neon zones: style:'neon' (green) / 'neonRed' / {style:'neon', color}
export const ATLAS = { red: '#c8352b', blue: '#2f62d0', green: '#3fae3a', orange: '#e3901e', purple: '#8b5cf6', yellow: '#e8c21e', teal: '#14b8a6', pink: '#ec4899' };
for (const [k, h] of Object.entries(ATLAS)) STYLE[k] = { hue: rgba(h, .9), mul: rgba(h, .62), fill: rgba(h, .16), line: 'rgba(255,255,255,.75)', lw: 2.2, raised: true };
const neon = h => ({ fill: rgba(h, .42), hue: rgba(h, .6), line: h, lw: 5, glow: h, neon: true });
STYLE.neon = neon('#39ff6a'); STYLE.neonRed = neon('#ff2d3c'); STYLE.neonBlue = neon('#38bdf8');
// region(['IRN'], {at:'إيران', style:'tint', reveal:'wipe', label:true, labelAt:[lon,lat], spotlight:.5, until:'...'})
export function region(names, o = {}) {
  const cs = [].concat(names).map(n => { const c = country(n); if (!c) throw new Error('unknown country: ' + n); return c; });
  const st = o.style === 'neon' && o.color ? neon(col(o.color)) : { ...(STYLE[o.style || 'tint']), ...(o.fill ? { fill: col(o.fill) } : {}), ...(o.color ? { fill: rgba(col(o.color), o.opacity ?? .85) } : {}) };
  const it = add({ kind: 'region', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? (o.reveal === 'draw' ? .9 : .6), z: o.z ?? 1, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return;
      const { p, box, len } = countryPath(cs); const e = EASE.out(a);
      if (o.spotlight) { X.save(); X.fillStyle = `rgba(2,6,14,${o.spotlight * e * b})`; const sp = new Path2D(); sp.rect(0, 0, W, H); sp.addPath(p); X.fill(sp, 'evenodd'); X.restore(); }
      X.save(); X.globalAlpha = b;
      const rev = o.reveal || (st.raised ? 'soft' : st.neon ? 'grow' : 'wipe');
      if (rev === 'wipe') { const w = box[2] - box[0] + 40; X.beginPath(); if (RTL) X.rect(box[2] + 20 - w * e, 0, w * e + 1, H); else X.rect(box[0] - 20, 0, w * e, H); X.clip(); }
      if (rev === 'fade' || rev === 'flash') X.globalAlpha *= rev === 'flash' ? clamp(a * 5) : e;
      const sa = rev === 'soft' ? EASE.sine(clamp((t - this.t0) / .9)) : 1;   // soft: colour comes up over 0.9 s
      if (rev === 'grow') { const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2, s = EASE.back(a); X.globalAlpha *= clamp(a * 3); X.translate(cx, cy); X.scale(s, s); X.translate(-cx, -cy); }
      const wk = rev === 'flash' ? 1 - EASE.out(clamp((t - this.t0 - .1) / .55)) : 0;   // white-hot, then cools to the colour
      if (rev === 'pop') { const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2, s = lerp(.92, 1, EASE.back(a)); X.globalAlpha *= clamp(a * 3); X.translate(cx, cy); X.scale(s, s); X.translate(-cx, -cy); }
      const fa = rev === 'draw' ? clamp((a - .55) / .45) : sa;
      const fk = o.fade ? lerp(1, o.fade[1], EASE.sine(clamp((t - when(o.fade[0])) / .6))) : 1;   // fade: [time, how much stays]
      if (st.raised) { X.save(); X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 26; X.shadowOffsetY = 9; X.globalAlpha *= fa * fk; X.fillStyle = 'rgba(0,0,0,.14)'; X.fill(p, 'evenodd'); X.restore(); }
      if (st.hue) { X.save(); X.globalCompositeOperation = 'color'; X.globalAlpha *= fa * fk * (1 - wk * .9); X.fillStyle = st.hue; X.fill(p, 'evenodd'); X.restore(); }
      if (st.mul) { X.save(); X.globalCompositeOperation = 'multiply'; X.globalAlpha *= fa * fk * (1 - wk); X.fillStyle = st.mul; X.fill(p, 'evenodd'); X.restore(); }
      if (st.fill) { X.save(); if (st.glow) { X.shadowColor = st.glow; X.shadowBlur = 50 * (o.pulse ? (.8 + .2 * Math.sin(t * 5)) : 1); } X.globalAlpha *= fa * fk * (1 - wk * .7); X.fillStyle = st.fill; X.fill(p, 'evenodd'); X.restore(); }
      if (wk > 0) { X.save(); X.globalAlpha *= wk * .9; X.fillStyle = '#fff8f0'; X.fill(p, 'evenodd'); X.restore(); }
      if (st.raised) { X.save(); X.clip(p, 'evenodd'); X.globalAlpha *= fa * fk; X.lineWidth = 14; X.strokeStyle = 'rgba(0,0,0,.22)'; X.stroke(p); X.lineWidth = 3; X.strokeStyle = 'rgba(255,255,255,.18)'; X.translate(0, 2); X.stroke(p); X.restore(); }
      X.globalAlpha *= Math.max(fk, .55); X.lineJoin = 'round'; X.lineWidth = o.lineWidth || st.lw; X.strokeStyle = st.line;
      if (st.neon) { X.shadowColor = st.glow; X.shadowBlur = 28; X.stroke(p); X.shadowBlur = 10; X.lineWidth = 2; X.strokeStyle = '#ffffff'; }
      if (rev === 'draw' || rev === 'soft') { X.setLineDash([len * clamp(rev === 'soft' ? (t - this.t0) / .7 : a / .7), len + 10]); }
      X.stroke(p); X.restore();
      if (o.label !== false && o.label != null) {
        const c = cs[0], txt = o.label === true ? (RTL ? c.ar : c.en) : o.label;
        const at = o.labelAt || [c.lx, c.ly]; const [x, y, front] = P(at[0], at[1]); if (!front) return;
        const la = clamp((t - this.t0 - (o.labelDelay ?? .25)) / .4); if (la <= 0) return;
        const lb = b * (o.labelUntil != null ? 1 - clamp((t - when(o.labelUntil)) / .3) : 1); if (lb <= 0) return;
        const sc = lerp(.6, 1, EASE.back(la));
        if (o.labelPill) pill(x, y + (o.labelDy || 0), txt, col(o.labelPill), '#fff', o.labelSize || 50, lb, sc);
        else { X.save(); X.globalAlpha = lb * clamp(la * 2); X.translate(x, y + (o.labelDy || 0)); X.scale(sc, sc); strokeText(0, 0, txt, fontAr(o.labelSize || 64), '#fff', 'rgba(0,0,0,.55)', 12); X.restore(); }
      }
    } });
  return it;
}
// smooth a lon/lat polyline (Catmull-Rom) into n points
export function smooth(pts, n = 80) {
  if (pts.length < 3) return pts; const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], m = Math.ceil(n / (pts.length - 1));
    for (let j = 0; j < m; j++) { const s = j / m, s2 = s * s, s3 = s2 * s;
      out.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * s + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * s2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * s3))); }
  }
  out.push(pts[pts.length - 1]); return out;
}
function screenLine(pts) { if (pts.length < 2) pts = [pts[0], pts[0]]; const s = pts.map(p => P(p[0], p[1])); let L = 0; const cum = [0]; for (let i = 1; i < s.length; i++) { L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); cum.push(L); } return { s, cum, L }; }
function along(sl, d) { d = clamp(d, 0, sl.L); let i = 1; while (i < sl.cum.length - 1 && sl.cum[i] < d) i++; const a = sl.s[i - 1], b = sl.s[i], u = (d - sl.cum[i - 1]) / Math.max(1e-6, sl.cum[i] - sl.cum[i - 1]); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), Math.atan2(b[1] - a[1], b[0] - a[0])]; }
// path([[lon,lat],...], {at, dur, color, width, dash, glow, arrow, smooth:true})
export function path(pts, o = {}) {
  const pp = o.smooth === false ? pts : smooth(pts, o.n || 120);
  return add({ kind: 'path', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? 1.0, z: o.z ?? 2, sfx: o.sfx, pts: pp,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const sl = screenLine(pp), e = EASE.io(a), Lp = sl.L * e;
      X.save(); X.globalAlpha = b; X.lineCap = 'round'; X.lineJoin = 'round';
      const trace = () => { X.beginPath(); X.moveTo(sl.s[0][0], sl.s[0][1]); for (let i = 1; i < sl.s.length && sl.cum[i] <= Lp; i++) X.lineTo(sl.s[i][0], sl.s[i][1]); const q = along(sl, Lp); X.lineTo(q[0], q[1]); };
      const w = o.width || 9, c = col(o.color || 'yellow');
      if (o.glow !== false) { X.shadowColor = c; X.shadowBlur = 24; }
      if (o.dash) { X.setLineDash(o.dash); X.lineDashOffset = -t * (o.flow ?? 40); }
      X.strokeStyle = 'rgba(0,0,0,.35)'; X.lineWidth = w + 6; trace(); X.stroke();
      X.strokeStyle = c; X.lineWidth = w; trace(); X.stroke(); X.setLineDash([]); X.shadowBlur = 0;
      if (o.arrow && a > .05) { const [x, y, ang] = along(sl, Lp); X.translate(x, y); X.rotate(ang); X.fillStyle = c; X.beginPath(); X.moveTo(w * 2.4, 0); X.lineTo(-w * 1.2, w * 1.9); X.lineTo(-w * 1.2, -w * 1.9); X.closePath(); X.fill(); }
      X.restore();
    } });
}
// ships moving along a route: ships(pts, {at, count, speed (route lengths per second), size, color, until})
export function ships(pts, o = {}) {
  const pp = o.smooth === false ? pts : smooth(pts, 120), n = o.count || 3, sz = o.size || 1;
  return add({ kind: 'ships', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: .4, z: o.z ?? 3, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const sl = screenLine(pp);
      for (let i = 0; i < n; i++) {
        const u = ((t - this.t0) * (o.speed || .06) + i / n + (o.phase || 0)) % 1, [x, y, ang] = along(sl, u * sl.L), fade = clamp(Math.min(u, 1 - u) * 12) * a * b;
        X.save(); X.globalAlpha = fade; X.translate(x, y); X.rotate(ang); X.scale(sz, sz);
        const g = X.createLinearGradient(-90, 0, -14, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.55)');   // wake
        X.fillStyle = g; X.beginPath(); X.moveTo(-14, -7); X.lineTo(-90, -15); X.lineTo(-90, 15); X.lineTo(-14, 7); X.closePath(); X.fill();
        X.shadowColor = 'rgba(0,0,0,.6)'; X.shadowBlur = 8; X.shadowOffsetY = 3;
        X.fillStyle = col(o.color || '#c8352b'); X.beginPath(); X.moveTo(34, 0); X.quadraticCurveTo(30, -9, 20, -9); X.lineTo(-24, -9); X.quadraticCurveTo(-27, 0, -24, 9); X.lineTo(20, 9); X.quadraticCurveTo(30, 9, 34, 0); X.fill();   // hull
        X.shadowColor = 'transparent'; X.fillStyle = '#2a313b'; X.beginPath(); X.moveTo(27, 0); X.lineTo(19, -6); X.lineTo(-14, -6); X.lineTo(-14, 6); X.lineTo(19, 6); X.closePath(); X.fill();   // deck
        X.strokeStyle = '#8a929c'; X.lineWidth = 1.6; X.beginPath(); X.moveTo(-10, 0); X.lineTo(22, 0); for (let k = -6; k < 20; k += 7) { X.moveTo(k, -4); X.lineTo(k, 4); } X.stroke();   // pipes
        X.fillStyle = '#f2f2f2'; X.fillRect(-23, -7, 9, 14); X.fillStyle = '#1b1f26'; X.fillRect(-21, -5, 2, 10);   // bridge
        X.restore();
      }
    } });
}
// ruler([lon,lat],[lon,lat], {at, dur, text, color})  a measured line with end ticks and a label
export function ruler(a0, b0, o = {}) {
  return add({ kind: 'ruler', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? .8, z: o.z ?? 4, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const A = P(...a0), B = P(...b0), e = EASE.io(a), c = col(o.color || 'white');
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, ang = Math.atan2(B[1] - A[1], B[0] - A[0]), L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      X.save(); X.globalAlpha = b; X.translate(mx, my); X.rotate(ang); X.lineCap = 'round';
      X.shadowColor = 'rgba(0,0,0,.6)'; X.shadowBlur = 10; X.strokeStyle = c; X.lineWidth = 6;
      X.beginPath(); X.moveTo(-L / 2 * e, 0); X.lineTo(L / 2 * e, 0); X.stroke();
      const tk = 26 * clamp(a * 3 - 1.4); X.beginPath(); X.moveTo(-L / 2, -tk); X.lineTo(-L / 2, tk); X.moveTo(L / 2, -tk); X.lineTo(L / 2, tk); X.stroke();
      X.fillStyle = c; const dr = 10 * EASE.back(clamp(a * 3 - 1.5)); if (dr > 0) for (const sx of [-L / 2, L / 2]) { X.beginPath(); X.arc(sx, 0, dr, 0, 7); X.fill(); }
      X.restore();
      if (o.text && a > .5) { const la = clamp((a - .5) / .5); const off = o.textOffset || [0, -70]; pill(mx + off[0], my + off[1], o.text, col(o.textBg || '#111a2b'), col(o.textColor || 'yellow'), o.textSize || 54, b, lerp(.6, 1, EASE.back(la))); }
    } });
}
// pin([lon,lat], {at, label, color})   ping([lon,lat], {at, color, until})
export function pin(pt, o = {}) {
  return add({ kind: 'pin', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: .45, z: o.z ?? 5, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const [x, y] = P(...pt), s = EASE.back(a) * (o.size || 1), c = col(o.color || 'red');
      X.save(); X.globalAlpha = b; X.translate(x, y - (1 - EASE.out(a)) * 60); X.scale(s, s);
      X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 12; X.fillStyle = c; X.beginPath(); X.arc(0, -46, 24, Math.PI * .82, Math.PI * .18); X.lineTo(0, 0); X.closePath(); X.fill();
      X.shadowBlur = 0; X.fillStyle = '#fff'; X.beginPath(); X.arc(0, -46, 9, 0, 7); X.fill(); X.restore();
      if (o.label) pill(x, y - 110 * (o.size || 1), o.label, col(o.labelBg || '#111a2b'), '#fff', o.labelSize || 44, b * clamp(a * 2), lerp(.6, 1, EASE.back(clamp(a * 1.3))));
    } });
}
export function ping(pt, o = {}) {
  return add({ kind: 'ping', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: .3, z: o.z ?? 5, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const [x, y] = P(...pt), c = col(o.color || 'yellow');
      X.save(); X.globalAlpha = b; X.fillStyle = c; X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 6; X.beginPath(); X.arc(x, y, 12 * EASE.back(a), 0, 7); X.fill(); X.shadowBlur = 0;
      for (let k = 0; k < 2; k++) { const u = ((t - this.t0) * .9 + k * .5) % 1; X.globalAlpha = b * (1 - u) * .55; X.strokeStyle = c; X.lineWidth = 5; X.beginPath(); X.arc(x, y, 14 + u * 80, 0, 7); X.stroke(); }
      X.restore();
    } });
}
// label(at, text, {at:time, size, color, pill, dy})  at = [lon,lat] (moves with the map) or {x,y} (screen)
export function label(pos, text, o = {}) {
  return add({ kind: 'label', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: .4, z: o.z ?? 6, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const [x, y] = Array.isArray(pos) ? P(...pos) : [pos.x, pos.y]; const sc = lerp(.6, 1, EASE.back(a));
      if (o.pill) return pill(x, y + (o.dy || 0), text, col(o.pill), col(o.color || 'white'), o.size || 50, b, sc);
      X.save(); X.globalAlpha = b * clamp(a * 2); X.translate(x, y + (o.dy || 0)); X.scale(sc, sc); strokeText(0, 0, text, fontAr(o.size || 60, o.font || 'MapAr'), col(o.color || 'white'), 'rgba(0,0,0,.55)', 12); X.restore();
    } });
}
// number({x,y}, text, {at, until, size, color, count:{from,to,dur,fmt}, sub:'small line under it'})
export function number(pos, text, o = {}) {
  return add({ kind: 'number', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: .45, z: o.z ?? 8, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const [x, y] = Array.isArray(pos) ? P(...pos) : [pos.x ?? W / 2, pos.y];
      let s = text; if (o.count) { const u = EASE.out(clamp((t - this.t0) / (o.count.dur || 1.2))), v = lerp(o.count.from || 0, o.count.to, u); s = text.replace('#', (o.count.fmt || (n => Math.round(n).toLocaleString('en-US')))(v)); }
      const sc = lerp(.5, 1, EASE.back(a)); X.save(); X.globalAlpha = b * clamp(a * 3); X.translate(x, y); X.scale(sc, sc);
      X.shadowColor = 'rgba(0,0,0,.55)'; X.shadowBlur = 30; strokeText(0, 0, s, fontAr(o.size || 170), col(o.color || 'yellow'), 'rgba(0,0,0,.7)', 16);
      if (o.sub) { X.shadowBlur = 16; strokeText(0, (o.size || 170) * .62, o.sub, fontAr(o.subSize || 54), '#fff', 'rgba(0,0,0,.65)', 10); }
      X.restore();
    } });
}
// flash(at): an exposure pop on a cut (not a white frame)
const FLASH = []; export function flash(t, k = .55) { FLASH.push([when(t), k]); }
// captions: the script, a few words at a time, current word in yellow. captions({max:4, y:1480})
let CAP = null; export function captions(o = {}) { CAP = o.style === 'clean' ? { max: 3, y: .74 * H, size: 50, ...o } : { max: 4, y: .79 * H, size: 74, ...o }; }
function capGroups() {
  const G = []; let g = [];
  WORDS.forEach((w, i) => { g.push(w); const end = /[.!?؟،,:]$/.test(w[0]) || g.length >= CAP.max || (WORDS[i + 1] && WORDS[i + 1][1] - w[2] > .35); if (end) { G.push(g); g = []; } });
  if (g.length) G.push(g); return G;
}
let GROUPS = null;
function drawCaptions(t) {
  if (!CAP) return; GROUPS = GROUPS || capGroups();
  const gi = GROUPS.findIndex((g, i) => t >= g[0][1] - .05 && (i === GROUPS.length - 1 ? t < g[g.length - 1][2] + .6 : t < GROUPS[i + 1][0][1] - .05)); if (gi < 0) return;
  const g = GROUPS[gi], a = clamp((t - g[0][1] + .05) / .18), sc = lerp(.86, 1, EASE.back(a));
  if (CAP.style === 'clean') {   // the map-Shorts way: small white words, soft shadow, the map stays the star
    X.save(); X.globalAlpha = clamp(a * 1.6); X.shadowColor = 'rgba(0,0,0,.75)'; X.shadowBlur = 14; X.shadowOffsetY = 3;
    strokeText(W / 2, CAP.y + (1 - EASE.out(a)) * 10, g.map(w => w[0].replace(/[.،,:؟?!]$/, '')).join(' '), fontAr(CAP.size, RTL ? 'MapArText' : 'MapLatText'), '#fff', null); X.restore(); return;
  }
  X.save(); X.font = fontAr(CAP.size); X.textBaseline = 'middle'; X.direction = RTL ? 'rtl' : 'ltr';
  const words = g.map(w => w[0].replace(/[.،,:]$/, '')), sp = CAP.size * .3, ws = words.map(w => X.measureText(w).width), tot = ws.reduce((s, v) => s + v, 0) + sp * (ws.length - 1);
  X.translate(W / 2, CAP.y); X.scale(sc, sc); X.globalAlpha = clamp(a * 2);
  let x = RTL ? tot / 2 : -tot / 2;
  words.forEach((w, i) => {
    const cur = t >= g[i][1] - .03 && (t < g[i][2] || i === words.length - 1 && t < g[i][2] + .6); const done = t >= g[i][1] - .03;
    const wx = RTL ? x - ws[i] : x; X.direction = RTL ? 'rtl' : 'ltr'; X.textAlign = RTL ? 'right' : 'left';
    X.lineJoin = 'round'; X.strokeStyle = 'rgba(0,0,0,.8)'; X.lineWidth = 14; const px = RTL ? x : x;
    X.strokeText(w, px, 0); X.fillStyle = cur ? COL.yellow : done ? '#fff' : 'rgba(255,255,255,.9)'; X.fillText(w, px, 0);
    x = RTL ? x - ws[i] - sp : x + ws[i] + sp;
  });
  X.restore();
}

// ------------------------------------------------------------------ v2: rivers, atlas names, titles, icons, measures
const pts = flat => { const o = []; for (let i = 0; i < flat.length; i += 2) o.push([flat[i] / 1e4, flat[i + 1] / 1e4]); return o; };
// join river pieces across names (Natural Earth splits rivers by local name: 'Firat', 'Al Furat', 'Euphrates')
export function riverLine(names, tol = .03) {
  const parts = []; let mouth = null;
  for (const n of [].concat(names)) { const r = RIVERS.rivers.find(r => r.name.toLowerCase() === n.toLowerCase()); if (!r) throw new Error('unknown river: ' + n); r.parts.forEach(p => parts.push(pts(p))); const m = pts(r.parts[0]); mouth = m[m.length - 1]; }
  let line = parts.shift(); const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < tol;
  for (let grew = true; grew;) { grew = false;
    for (let i = 0; i < parts.length; i++) { const q = parts[i], qr = [...q].reverse(), e = line[line.length - 1], s0 = line[0];
      if (near(e, q[0])) line = line.concat(q.slice(1)); else if (near(e, qr[0])) line = line.concat(qr.slice(1));
      else if (near(q[q.length - 1], s0)) line = q.concat(line.slice(1)); else if (near(qr[qr.length - 1], s0)) line = qr.concat(line.slice(1)); else continue;
      parts.splice(i, 1); grew = true; break; } }
  const d = p => Math.hypot(p[0] - mouth[0], p[1] - mouth[1]);
  return d(line[0]) < d(line[line.length - 1]) ? line.reverse() : line;   // source first, mouth last
}
const nearest = (line, p) => line.reduce((b, q, k) => Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(line[b][0] - p[0], line[b][1] - p[1]) ? k : b, 0);
// river(['Firat','Al Furat','Euphrates'], {at, dur, color, width, flow, reverse, from:[lon,lat], to:[lon,lat], until})  draws on from the source, then flows
export function river(names, o = {}) {
  let line = Array.isArray(names) && Array.isArray(names[0]) ? names : riverLine(names, o.tol); if (o.reverse) line = [...line].reverse();
  if (o.from || o.to) { const i = o.from ? nearest(line, o.from) : 0, j = o.to ? nearest(line, o.to) : line.length - 1; line = i <= j ? line.slice(i, j + 1) : line.slice(j, i + 1).reverse(); }
  return add({ kind: 'river', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? 1.4, z: o.z ?? 2, sfx: o.sfx, line,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const sl = screenLine(line), Lp = sl.L * EASE.io(a), c = col(o.color || '#4fd2ff'), w = o.width || 7;
      const trace = () => { X.beginPath(); X.moveTo(sl.s[0][0], sl.s[0][1]); for (let i = 1; i < sl.s.length && sl.cum[i] <= Lp; i++) X.lineTo(sl.s[i][0], sl.s[i][1]); const q = along(sl, Lp); X.lineTo(q[0], q[1]); };
      X.save(); X.globalAlpha = b; X.lineCap = 'round'; X.lineJoin = 'round';
      X.strokeStyle = 'rgba(0,30,60,.45)'; X.lineWidth = w + 6; trace(); X.stroke();
      X.shadowColor = c; X.shadowBlur = o.glow ?? 6; X.strokeStyle = c; X.lineWidth = w; trace(); X.stroke(); X.shadowBlur = 0;
      if (o.flow !== false && Lp > 20) {   // light pulses running downstream
        X.setLineDash([16, 90]); X.lineDashOffset = -(t - this.t0) * (o.flowSpeed ?? 90); X.strokeStyle = 'rgba(255,255,255,.38)'; X.lineWidth = w * .45; trace(); X.stroke(); X.setLineDash([]);
      }
      if (a < 1) { const [x, y] = along(sl, Lp); X.fillStyle = '#fff'; X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 4; X.beginPath(); X.arc(x, y, w * .9, 0, 7); X.fill(); }
      X.restore();
    } });
}
// atlasName([lon,lat], 'دجلة', {at, size, rotate (deg), color, until})  calligraphic name written onto the land (wipes in right to left)
export function atlasName(pt, text, o = {}) {
  return add({ kind: 'name', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? .6, z: o.z ?? 6, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const [x, y, f] = P(...pt); if (!f) return; const sz = o.size || 92, fnt = fontAr(sz, o.font || (RTL ? 'MapRuqaa' : 'MapSerif'));
      X.save(); X.globalAlpha = b; X.translate(x, y); X.rotate((o.rotate || 0) * D2R); X.font = fnt; const w = X.measureText(text).width + 40, e = EASE.out(a);
      X.beginPath(); if (RTL) X.rect(w / 2 - w * e, -sz * 1.2, w * e, sz * 2.4); else X.rect(-w / 2, -sz * 1.2, w * e, sz * 2.4); X.clip();
      X.shadowColor = 'rgba(0,0,0,.75)'; X.shadowBlur = 18; X.shadowOffsetY = 4; strokeText(0, 0, text, fnt, col(o.color || 'white'), null);
      X.restore();
    } });
}
// title('منين؟', {at, until, x, y, size, color, glow, pt})  slams in from huge to its size (map-Shorts neon title)
export function title(text, o = {}) {
  return add({ kind: 'title', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? .5, z: o.z ?? 9, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const [x, y] = o.pt ? P(...o.pt) : [o.x ?? W / 2, o.y ?? H * .3]; const c = col(o.color || 'yellow');
      const s = lerp(o.from ?? 1.25, 1, EASE.out(a)), fnt = fontAr(o.size || 150, o.font || (RTL ? 'MapAr' : 'MapLat'));
      X.save(); X.globalAlpha = b * clamp(a * 2.5); X.translate(x, y); X.rotate((o.rotate || 0) * D2R); X.scale(s, s);
      if (o.glow) { X.shadowColor = c; X.shadowBlur = 24; } else { X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 18; X.shadowOffsetY = 5; }
      strokeText(0, 0, text, fnt, c, 'rgba(0,0,0,.55)', 14); X.shadowBlur = 0; strokeText(0, 0, text, fnt, c, null);
      X.restore();
    } });
}
// icons drawn in code (100 px box, centred)
const ICON = {
  x: (c) => { X.lineCap = 'round'; X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 10; X.strokeStyle = c; X.lineWidth = 22; X.beginPath(); X.moveTo(-34, -34); X.lineTo(34, 34); X.moveTo(34, -34); X.lineTo(-34, 34); X.stroke(); X.shadowBlur = 0; X.strokeStyle = '#fff'; X.lineWidth = 8; X.stroke(); },
  mountain: (c) => { const mono = c === '#fff'; X.fillStyle = mono ? '#fff' : '#6b5a4a'; X.beginPath(); X.moveTo(-46, 32); X.lineTo(-10, -30); X.lineTo(26, 32); X.fill(); X.fillStyle = mono ? 'rgba(255,255,255,.7)' : '#8a7560'; X.beginPath(); X.moveTo(-6, 32); X.lineTo(20, -12); X.lineTo(48, 32); X.fill();
    if (!mono) { X.fillStyle = '#fff'; X.beginPath(); X.moveTo(-10, -30); X.lineTo(-20, -13); X.lineTo(-12, -9); X.lineTo(-5, -16); X.lineTo(2, -10); X.closePath(); X.fill(); } },
  drop: (c) => { X.fillStyle = c; X.beginPath(); X.moveTo(0, -42); X.bezierCurveTo(22, -12, 32, 6, 32, 16); X.arc(0, 16, 32, 0, Math.PI); X.bezierCurveTo(-32, 6, -22, -12, 0, -42); X.fill(); X.fillStyle = 'rgba(255,255,255,.55)'; X.beginPath(); X.ellipse(-12, 14, 6, 12, .3, 0, 7); X.fill(); },
  city: (c) => { X.fillStyle = '#fff'; X.shadowColor = 'rgba(0,0,0,.6)'; X.shadowBlur = 8; X.beginPath(); X.arc(0, 0, 13, 0, 7); X.fill(); X.shadowBlur = 0; X.fillStyle = c; X.beginPath(); X.arc(0, 0, 7, 0, 7); X.fill(); },
  question: (c) => { strokeText(0, 6, '؟', fontAr(110), c, null); },
  check: (c) => { X.lineCap = 'round'; X.lineJoin = 'round'; X.strokeStyle = c; X.lineWidth = 16; X.beginPath(); X.moveTo(-32, 2); X.lineTo(-8, 26); X.lineTo(34, -24); X.stroke(); },
  star: (c) => { X.fillStyle = c; X.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 42, a = -Math.PI / 2 + i * Math.PI / 5; X.lineTo(Math.cos(a) * r, Math.sin(a) * r); } X.fill(); },
};
function hexPath(r) { X.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; X.lineTo(Math.cos(a) * r, Math.sin(a) * r); } X.closePath(); }
// icon(pt or {x,y}, 'x' | 'mountain' | 'drop' | 'city' | 'question' | 'check' | 'star', {at, until, size, badge:'hex'|'circle', color, anchor, label})
// pops in with overshoot, leaves by shrinking to a point; anchor:true grows with the map (a fast zoom blows it past the lens)
export function icon(pos, kind, o = {}) {
  let k0 = null;
  return add({ kind: 'icon', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: .4, z: o.z ?? 7, sfx: o.sfx,
    draw(t) {
      const a = clamp((t - this.t0) / .4), out = this.t1 == null ? 0 : clamp((t - this.t1) / .3); if (a <= 0 || out >= 1) return;
      const [x, y] = Array.isArray(pos) ? P(...pos) : [pos.x, pos.y]; if (k0 === null) k0 = kOf(camAt(this.t0).span);
      const zoom = o.anchor ? Math.pow(C.k / k0, .8) : 1;
      const s = (o.size || 1) * EASE.back(a) * (1 - EASE.in(out)) * zoom; if (s <= .001) return;
      X.save(); X.translate(x, y); X.scale(s, s); X.rotate((o.rotate || 0) * D2R);
      const c = col(o.color || (kind === 'x' ? '#ff3046' : kind === 'drop' ? '#38bdf8' : '#ffd23f'));
      if (o.badge) { X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 14; X.shadowOffsetY = 4; X.fillStyle = c; if (o.badge === 'hex') hexPath(64); else { X.beginPath(); X.arc(0, 0, 60, 0, 7); } X.fill(); X.shadowBlur = 0; X.lineWidth = 6; X.strokeStyle = 'rgba(255,255,255,.9)'; X.stroke();
        X.fillStyle = 'rgba(255,255,255,.18)'; if (o.badge === 'hex') hexPath(52); else { X.beginPath(); X.arc(0, 0, 50, 0, 7); } X.fill(); X.scale(.62, .62); ICON[kind]('#fff'); }
      else ICON[kind](c);
      X.restore();
      if (o.label) pill(x, y - 100 * (o.size || 1), o.label, col(o.labelBg || '#111a2b'), '#fff', o.labelSize || 44, 1 - out, lerp(.6, 1, EASE.back(a)));
    } });
}
// measure(a, b, {at, dur, to: 160, unit: 'كم', color})  double arrow that grows from the middle while its label counts up, laid along the line
export function measure(a0, b0, o = {}) {
  return add({ kind: 'measure', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? .9, z: o.z ?? 5, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const A = P(...a0), B = P(...b0), e = EASE.out(a), c = col(o.color || 'white');
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, ang = Math.atan2(B[1] - A[1], B[0] - A[0]), L = Math.hypot(B[0] - A[0], B[1] - A[1]) * e;
      X.save(); X.globalAlpha = b; X.translate(mx, my); X.rotate(ang); X.shadowColor = 'rgba(0,0,0,.6)'; X.shadowBlur = 10; X.strokeStyle = X.fillStyle = c; X.lineWidth = 5; X.lineCap = 'round';
      X.beginPath(); X.moveTo(-L / 2 + 14, 0); X.lineTo(L / 2 - 14, 0); X.stroke();
      for (const d of [-1, 1]) { X.beginPath(); X.moveTo(d * L / 2, 0); X.lineTo(d * (L / 2 - 26), -14); X.lineTo(d * (L / 2 - 26), 14); X.closePath(); X.fill(); }
      if (ang > Math.PI / 2 || ang < -Math.PI / 2) X.rotate(Math.PI);   // keep the label upright
      const v = Math.round(lerp(o.from ?? 0, o.to ?? 0, EASE.out(clamp((t - this.t0) / (this.dur * 1.1))))), txt = o.text || `${v} ${o.unit || 'كم'}`;
      strokeText(0, -(o.size || 64) * .62, txt, fontAr(o.size || 64), c, 'rgba(0,0,0,.6)', 10);
      X.restore();
    } });
}


// ghost(code, {to:[lon,lat], at, until, style, only:[w,s,e,n], dur})  a country's real shape picked up and laid somewhere else for a
// size comparison (France on Egypt). East-west is rescaled by latitude, so the shape keeps its true size in km.
export function ghost(code, o = {}) {
  const c = country(code); if (!c) throw new Error('unknown country: ' + code);
  const box = o.only || c.bb, rings = c.r.filter(r => { const x = r[0] / 1e4, y = r[1] / 1e4; return x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3]; });
  let sx = 0, sy = 0, n = 0; for (const r of rings) for (let i = 0; i < r.length; i += 2) { sx += r[i]; sy += r[i + 1]; n++; }
  const cx = sx / n / 1e4, cy = sy / n / 1e4, k = Math.cos(cy * D2R);
  const st = { ...(STYLE[o.style || 'blue']) };
  return add({ kind: 'ghost', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? 1.0, z: o.z ?? 3, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const e = EASE.io(a);
      const to = o.to || [cx, cy], lat = lerp(cy, to[1], e), lon = lerp(cx, to[0], e), kk = k / Math.cos(lat * D2R);
      const p = new Path2D();
      for (const r of rings) { for (let i = 0; i < r.length; i += 2) { const [x, y] = P(lon + (r[i] / 1e4 - cx) * kk, lat + (r[i + 1] / 1e4 - cy)); i ? p.lineTo(x, y) : p.moveTo(x, y); } p.closePath(); }
      X.save(); X.globalAlpha = b; X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 20; X.shadowOffsetY = 8 + 10 * Math.sin(Math.PI * e);
      X.fillStyle = rgba(ATLAS[o.style || 'blue'] || '#2f62d0', .62); X.fill(p, 'evenodd'); X.shadowColor = 'transparent';
      X.lineJoin = 'round'; X.lineWidth = 3; X.strokeStyle = 'rgba(255,255,255,.9)'; X.stroke(p); X.restore();
      if (o.label) { const [x, y] = P(lon, lat); X.save(); X.globalAlpha = b * clamp((a - .6) / .4); strokeText(x, y, o.label, fontAr(o.labelSize || 54, RTL ? 'MapAr' : 'MapLat'), '#fff', 'rgba(0,0,0,.5)', 10); X.restore(); }
    } });
}
// swarm(line or pts, {count, spread (km), at, dur, size, color, seed})  little people popping up along a line, one after another
export function swarm(line, o = {}) {
  const n = o.count || 60; let seed = o.seed || 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const L = line.length, P0 = [];
  for (let i = 0; i < n; i++) { const u = rnd(), j = Math.min(L - 2, Math.floor(u * (L - 1))), f = u * (L - 1) - j, a = line[j], b = line[j + 1];
    const g = (rnd() + rnd() + rnd() - 1.5) * (o.spread || 8) / 111; P0.push([lerp(a[0], b[0], f) + g * 1.2, lerp(a[1], b[1], f) + (rnd() - .5) * (o.spread || 8) / 111, rnd()]); }
  const order = P0.map((p, i) => [p[1], i]).sort((x, y) => (o.downward ? y[0] - x[0] : x[0] - y[0])).map(x => x[1]);
  return add({ kind: 'swarm', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? 1.6, z: o.z ?? 4, sfx: o.sfx,
    draw(t) {
      const out = this.t1 == null ? 0 : clamp((t - this.t1) / .4); if (t < this.t0 || out >= 1) return; const sz = (o.size || 1) * 11, c = col(o.color || '#ffffff');
      X.save(); X.globalAlpha = 1 - out;
      order.forEach((i, r) => { const ta = this.t0 + this.dur * r / n, a = clamp((t - ta) / .25); if (a <= 0) return; const [x, y] = P(P0[i][0], P0[i][1]), s = sz * EASE.back(a);
        X.fillStyle = 'rgba(0,0,0,.35)'; X.beginPath(); X.ellipse(x, y + s * .95, s * .7, s * .22, 0, 0, 7); X.fill();
        X.fillStyle = P0[i][2] > .5 ? c : rgba(c.startsWith('#') ? c : '#ffffff', .82); X.beginPath(); X.arc(x, y - s * .55, s * .42, 0, 7); X.fill();
        X.beginPath(); X.moveTo(x - s * .55, y + s * .85); X.quadraticCurveTo(x - s * .5, y - s * .1, x, y - s * .05); X.quadraticCurveTo(x + s * .5, y - s * .1, x + s * .55, y + s * .85); X.closePath(); X.fill(); });
      X.restore();
    } });
}


// shade(line, {width (km), at, until, k})  darkens everything except a band along a line (a river valley, a road, a coast)
export function shade(line, o = {}) {
  return add({ kind: 'shade', t0: when(o.at ?? 0), t1: o.until != null ? when(o.until) : null, dur: o.dur ?? .8, z: o.z ?? 1.5, sfx: o.sfx,
    draw(t) {
      const [a, b] = life(this, t); if (a <= 0 || b <= 0) return; const s = line.map(p => P(p[0], p[1])), hw = (o.width || 20) / 2 * pxPerKm(), L = [], Rr = [];
      for (let i = 0; i < s.length; i++) { const p = s[Math.max(0, i - 1)], q = s[Math.min(s.length - 1, i + 1)]; let nx = -(q[1] - p[1]), ny = q[0] - p[0]; const d = Math.hypot(nx, ny) || 1; nx /= d; ny /= d;
        L.push([s[i][0] + nx * hw, s[i][1] + ny * hw]); Rr.push([s[i][0] - nx * hw, s[i][1] - ny * hw]); }
      const band = new Path2D(); [...L, ...Rr.reverse()].forEach(([x, y], i) => i ? band.lineTo(x, y) : band.moveTo(x, y)); band.closePath();
      const all = new Path2D(); all.rect(0, 0, W, H); all.addPath(band);
      X.save(); X.globalAlpha = b * EASE.sine(a); X.filter = 'blur(6px)'; X.fillStyle = `rgba(8,6,4,${o.k ?? .55})`; X.fill(all, 'evenodd'); X.restore();
    } });
}

// cut points for the sound mix ('cut:N') and the contact sheets
const CUTS = []; export function cut(t) { CUTS.push(when(t)); }
export let END = CFG.end || (TIMING.dur ? TIMING.dur + .6 : 10);
export function end(t) { END = when(t); }

// ------------------------------------------------------------------ frame
function frame(t) {
  setCam(camAt(t)); drawGlobe(t);
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.clearRect(0, 0, W, H); X.drawImage(gl.canvas, 0, 0);
  for (const it of [...ITEMS].sort((a, b) => (a.z - b.z) || (a.t0 - b.t0))) it.draw(t);
  const v = X.createRadialGradient(W / 2, H * .45, H * .32, W / 2, H * .45, H * .78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${LOOK === 'atlas' ? .32 : .42})`); X.fillStyle = v; X.fillRect(0, 0, W, H);
  drawCaptions(t);
  for (const [ft, k] of FLASH) { const u = (t - ft) / .32; if (u >= 0 && u < 1) { X.save(); X.globalCompositeOperation = 'lighter'; X.fillStyle = `rgba(255,236,210,${k * (1 - u) ** 2})`; X.fillRect(0, 0, W, H); X.restore(); } }
}
export function start() {
  window.seek = t => { frame(t); return true; };
  window.END = END; const cs = [...new Set([0, ...CUTS])].sort((a, b) => a - b); window.SHOTLIST = cs.map((c, i) => [c, cs[i + 1] ?? END]);
  window.CAMS_AT = fps => { const o = []; for (let f = 0; f <= Math.round(END * fps); f++) { const c = camAt(f / fps); o.push([f / fps, c.lon, c.lat, kOf(c.span), c.cy]); } return o; };
  window.EVENTS = ITEMS.map(i => ({ kind: i.kind, t: i.t0, sfx: i.sfx })).concat(FLASH.map(f => ({ kind: 'flash', t: f[0] })));
  window.READY = true;
}
window.DBG = { gl, camAt, ITEMS, WORDS };
