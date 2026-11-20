// Maven Map, English demo (calm atlas look), 15 s:
// "Egypt is nearly twice the size of France. But look closer: almost everyone lives on this thin green line. Why? It's the Nile.
//  Step outside it, and it's pure desert. So over a hundred million people squeeze into about five percent of the land, all along one river."
// Shape: paradox hook -> "look closer" -> the question out loud -> the answer -> the number -> payoff.
import { cam, region, ghost, river, riverLine, path, shade, swarm, atlasName, title, number, captions, cut, end, T, start } from './map.js';

const ASWAN = [32.9, 24.09], CAIRO = [31.24, 30.1];
const NILE = riverLine(['Nile'], .2);                       // Natural Earth: Cairo -> Atbara -> Khartoum (stored mouth first)
const cutLine = (a, b) => { const n = p => NILE.reduce((k, q, i) => Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(NILE[k][0] - p[0], NILE[k][1] - p[1]) ? i : k, 0); const i = n(a), j = n(b); return i <= j ? NILE.slice(i, j + 1) : NILE.slice(j, i + 1).reverse(); };
const VALLEY = cutLine(ASWAN, CAIRO);                       // Aswan -> Cairo, south to north

// camera: all of Egypt -> down into the valley -> out again to the whole river
cam(0, { lon: 30.0, lat: 26.6, span: 17.5 });
cam(T('France.end'), { lon: 30.0, lat: 26.7, span: 16.2, ease: 'sine' });
cam(T('everyone'), { lon: 31.7, lat: 26.9, span: 7.2, ease: 'io' });
cam(T('Nile.end'), { lon: 31.75, lat: 26.85, span: 6.6, ease: 'sine' });
cam(T('hundred'), { lon: 31.6, lat: 27.2, span: 8.8, ease: 'io' });
cam(T('river.end'), { lon: 31.5, lat: 26.4, span: 11.5, ease: 'io' });
cam(T('river.end+1.7'), { lon: 31.5, lat: 26.3, span: 12.3, ease: 'sine' });

// hook: Egypt, then France laid on top of it for size
region('EGY', { at: T('Egypt'), style: 'orange', fade: [T('closer'), .2] });
atlasName([28.3, 28.9], 'Egypt', { at: T('Egypt') + .2, size: 110, until: T('closer') });
ghost('FRA', { only: [-5.5, 41.2, 9.8, 51.2], to: [29.4, 26.4], at: T('twice') - .2, dur: 1.1, style: 'blue', label: 'France', until: T('closer') + .2 });

// the thin green line
path(VALLEY, { smooth: false, at: T('thin'), dur: 1.0, color: 'rgba(110,230,120,.38)', width: 34, glow: false, until: T('river.end+1.7') });
river(VALLEY, { at: T('thin') + .1, dur: 1.0, color: '#5cc8ff', width: 6 });
title('Why?', { at: T('Why'), until: T('Nile') + .1, y: 330, size: 150, color: 'white' });
atlasName([30.55, 27.6], 'The Nile', { at: T('Nile'), rotate: -8, size: 96, until: T('hundred') });

// outside it: desert
shade(VALLEY, { at: T('outside'), width: 34, k: .66, until: T('river.end+1.7') });

// the squeeze
swarm(VALLEY, { at: T('hundred'), dur: 1.6, count: 70, spread: 14, size: 1.35, until: T('river.end+1.7') });
number({ x: 540, y: 330 }, '#M+', { at: T('hundred'), until: T('five') - .1, size: 150, color: 'white', count: { from: 0, to: 100, dur: 1.1 }, sub: 'people' });
number({ x: 540, y: 330 }, '5%', { at: T('five'), until: T('river.end+1.2'), size: 170, color: 'yellow', sub: 'of the land' });

// payoff: one river
cut(T('all'));
river(cutLine([32.49, 15.63], ASWAN), { at: T('all'), dur: 1.3, color: '#5cc8ff', width: 6, tol: .2 });

captions({ style: 'clean' });
end(T('river.end+1.7'));
start();
