// Render a Maven Map project in headless Chromium on the GPU.
//   node render.mjs <project> frames <fps> [fromFrame] [toFrame]   -> <project>/frames/f00000.jpg ...
//   node render.mjs <project> stills 0.5,1.2,3.0 [outdir]          -> <project>/check/t_0.50.jpg ...
//   node render.mjs <project> cams <fps>                           -> <project>/cams.json (camera per frame, for prep.py)
// The page is <project>/web; /data and /cache are served from the skill folder (world borders, globe texture).
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [, , proj, mode, a, b, c] = process.argv;
if (!proj || !mode) { console.log('usage: node render.mjs <project> frames <fps> [from] [to] | stills t1,t2,... [outdir] | cams <fps>'); process.exit(1); }
const root = path.resolve(proj, 'web');
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const base = u.startsWith('/data/') || u.startsWith('/cache/') ? SKILL : root;
  const p = path.join(base, u);
  if (!p.startsWith(base) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const br = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
pg.on('pageerror', e => console.log('PAGE ERROR', e.message)); pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.text()); });
await pg.goto(`http://localhost:${srv.address().port}/${process.env.PAGE || 'index.html'}`);
await pg.waitForFunction(() => window.READY || window.ERR, null, { timeout: 180000 });
const err = await pg.evaluate(() => window.ERR); if (err) { console.log('story error:', err); await br.close(); srv.close(); process.exit(1); }
const gpu = await pg.evaluate(() => { const g = DBG.gl, e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; });
if (/SwiftShader/i.test(gpu)) console.log('WARNING: rendering on SwiftShader (CPU), it will be slow:', gpu);
const END = await pg.evaluate(() => window.END);
if (mode === 'cams') {
  const cams = await pg.evaluate(f => window.CAMS_AT(f), +(a || 30));
  fs.writeFileSync(path.join(proj, 'cams.json'), JSON.stringify({ end: END, cams })); console.log(`cams.json: ${cams.length} frames, ${END.toFixed(2)} s`);
  await br.close(); srv.close(); process.exit(0);
}
let jobs = [], outdir;
if (mode === 'stills') { outdir = path.resolve(b || path.join(proj, 'check')); jobs = a.split(',').map(Number).map(t => [t, `t_${t.toFixed(2)}.jpg`]); }
else { outdir = path.resolve(proj, 'frames'); const fps = +a; const f0 = +(b || 0), f1 = c != null ? +c : Math.round(END * fps) - 1; for (let f = f0; f <= f1; f++) jobs.push([f / fps, `f${String(f).padStart(5, '0')}.jpg`]); fs.writeFileSync(path.join(proj, 'render.json'), JSON.stringify({ fps, end: END })); }
fs.mkdirSync(outdir, { recursive: true });
const t0 = Date.now();
for (const [t, name] of jobs) { const d = await pg.evaluate(t => { try { window.seek(t); } catch (e) { return "ERR" + e.stack; } return document.getElementById("c").toDataURL("image/jpeg", 0.93); }, t); if (d.startsWith("ERR")) { console.log(`frame ${t.toFixed(2)} s:`, d.slice(3)); process.exit(1); } fs.writeFileSync(path.join(outdir, name), Buffer.from(d.split(',')[1], 'base64')); }
console.log(`done ${jobs.length} frames in ${outdir}, ${((Date.now() - t0) / Math.max(1, jobs.length)).toFixed(0)} ms/frame (${gpu})`);
const shots = await pg.evaluate(() => window.SHOTLIST), events = await pg.evaluate(() => window.EVENTS);
fs.writeFileSync(path.join(proj, 'shots.json'), JSON.stringify({ end: END, shots, events }));
console.log('shots', JSON.stringify(shots));
await br.close(); srv.close();
