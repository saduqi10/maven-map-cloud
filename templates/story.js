// Maven Map v2 demo (atlas look), 15 s:
// «هل تعرف إن دجلة والفرات ما يبدون من العراق؟ لعد منين يجون؟ الاثنين يولدون بجبال تركيا. الفرات يعبر سوريا، ودجلة ينزل على بغداد. وبالقرنة يتلاقون، ويصيرون شط العرب، اللي يصب بالخليج.»
// Shape from the GeoGlobeTales breakdown: paradox hook -> question out loud -> steps, one map action per clause -> payoff.
import { cam, region, river, atlasName, title, icon, ping, label, captions, cut, end, T, start } from './map.js';

const EUPHRATES = ['Firat', 'Al Furat', 'Euphrates'], TIGRIS = ['Dicle', 'Tigris'];   // Natural Earth splits each river by local name
const SRC_E = [41.455, 40.18], SRC_T = [39.17, 38.42];          // where each one starts (eastern Turkey)
const IRQ_E = [40.99, 34.43], IRQ_T = [42.38, 37.06];           // where each one enters Iraq
const BAGHDAD = [44.366, 33.315], QURNA = [47.43, 31.0], MOUTH = [48.53, 29.96];

// camera: Iraq -> up to the sources in Turkey -> down the Euphrates through Syria -> Baghdad -> Qurna -> the Gulf
cam(0, { lon: 44.2, lat: 32.6, span: 9.5 });
cam(T('العراق.end'), { lon: 44.0, lat: 32.9, span: 8.6, ease: 'sine' });
cam(T('يجون'), { lon: 41.2, lat: 37.6, span: 9.0, ease: 'io' });
cam(T('تركيا.end'), { lon: 41.0, lat: 37.9, span: 8.4, ease: 'sine' });
cam(T('سوريا'), { lon: 40.6, lat: 35.6, span: 9.2, ease: 'io' });
cam(T('ودجلة'), { lon: 42.6, lat: 35.0, span: 8.8, ease: 'sine' });
cam(T('بغداد'), { lon: 44.3, lat: 33.4, span: 6.0, ease: 'io' });
cam(T('وبالقرنة'), { lon: 45.6, lat: 32.2, span: 5.0, ease: 'sine' });
cam(T('يتلاقون'), { lon: 47.45, lat: 30.95, span: 2.4, ease: 'io' });
cam(T('العرب.end'), { lon: 47.95, lat: 30.45, span: 2.9, ease: 'io' });
cam(T('بالخليج.end+0.6'), { lon: 48.6, lat: 29.9, span: 5.2, ease: 'io' });

// hook: Iraq's outline draws on at once, the two rivers inside Iraq, then the paradox
region('IRQ', { at: 0.05, style: 'zone', reveal: 'draw', dur: 1.2, until: T('العراق') + .3 });
river(TIGRIS, { at: T('دجلة'), from: IRQ_T, dur: 1.1, color: '#4fd2ff', width: 7 });
river(EUPHRATES, { at: T('والفرات'), from: IRQ_E, dur: 1.1, color: '#4fd2ff', width: 7 });
region('IRQ', { at: T('العراق'), style: 'green', fade: [T('منين'), .45], until: T('وبالقرنة') + .4 });
icon([43.2, 33.0], 'x', { at: T('العراق') + .15, until: T('منين'), size: 1.5, anchor: true });

// the question out loud
title('منين؟', { at: T('منين'), until: T('الاثنين') + .2, y: 330, size: 170 });

// the sources
region('TUR', { at: T('تركيا'), style: 'red', fade: [T('سوريا'), .45] });
icon(SRC_E, 'mountain', { at: T('يولدون'), badge: 'hex', color: '#e3901e', size: .9, until: T('سوريا') });
icon(SRC_T, 'mountain', { at: T('يولدون') + .15, badge: 'hex', color: '#e3901e', size: .9, until: T('سوريا') });
ping(SRC_E, { at: T('بجبال'), until: T('ودجلة'), color: '#4fd2ff' });
ping(SRC_T, { at: T('بجبال') + .1, until: T('ودجلة'), color: '#4fd2ff' });
river(EUPHRATES, { at: T('بجبال'), to: IRQ_E, dur: 1.6, color: '#4fd2ff', width: 7 });
river(TIGRIS, { at: T('بجبال') + .1, to: IRQ_T, dur: 1.2, color: '#4fd2ff', width: 7 });

// down the rivers
region('SYR', { at: T('سوريا'), style: 'orange', fade: [T('بغداد'), .45] });
atlasName([39.4, 35.95], 'الفرات', { at: T('يعبر'), rotate: 28, size: 84, until: T('وبالقرنة') });
atlasName([43.95, 35.2], 'دجلة', { at: T('ودجلة'), rotate: -55, size: 84, until: T('يتلاقون') });
icon(BAGHDAD, 'city', { at: T('بغداد'), label: 'بغداد', labelBg: '#c8352b', until: T('يتلاقون'), size: 1.1 });

// the meeting and the payoff
cut(T('يتلاقون'));
ping(QURNA, { at: T('يتلاقون') - .1, color: '#ffd23f', until: T('بالخليج.end+0.6') });
label(QURNA, 'القرنة', { at: T('يتلاقون'), pill: '#111a2b', color: 'yellow', size: 48, dy: -80, until: T('بالخليج') });
river(['Shatt al Arab'], { at: T('ويصيرون'), dur: 1.1, color: '#ffd23f', width: 11 });
atlasName([48.42, 30.72], 'شط العرب', { at: T('شط'), rotate: 38, size: 76 });
atlasName([49.6, 29.15], 'الخليج', { at: T('بالخليج'), size: 96, color: '#d8f6ff' });

captions({ style: 'clean' });
end(T('بالخليج.end+0.6'));
start();
