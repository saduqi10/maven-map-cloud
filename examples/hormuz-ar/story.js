// Maven Map demo: «هذا أخطر ممر بحري بالعالم. مضيق هرمز، بين إيران وعُمان. عرضه بس تسعة وثلاثين كيلومتر. وكل يوم، يعبر منه عشرين مليون برميل نفط.»
// Times are words of the voice (T('هرمز') = when that word starts); places are [lon, lat].
import { cam, region, path, ships, ruler, pin, ping, label, number, flash, captions, cut, end, dim, T, start } from './map.js';

const STRAIT = [56.45, 26.5];
const LARAK = [56.36, 26.835], QUOIN = [56.515, 26.505];          // the narrow gap: Larak Island (Iran) to the Quoin Islands (Oman)
const LANE = [[55.75, 26.42], [56.2, 26.62], [56.55, 26.6], [56.82, 26.25], [57.1, 25.85], [57.45, 25.45]];
const shift = (pts, d) => pts.map(([x, y]) => [x + d * .7, y + d]);

// camera: space -> the Gulf (one dive), hold, push into the gap, pull back for the traffic
cam(0, { lon: 18, lat: 14, span: 190 });
cam(1.1, { lon: 38, lat: 20, span: 120, ease: 'sine' });
cam(T('مضيق'), { lon: 56.6, lat: 26.0, span: 8.5, ease: 'io', dive: true });
cam(T('وعمان.end'), { lon: 56.6, lat: 26.2, span: 7.4, ease: 'sine' });
cam(T('تسعة'), { lon: 56.47, lat: 26.62, span: 1.45, ease: 'io' });
cam(T('كيلومتر.end'), { lon: 56.46, lat: 26.64, span: 1.32, ease: 'sine' });
cam(T('يوم'), { lon: 56.6, lat: 26.25, span: 3.6, ease: 'io' });
cam(T('نفط.end+0.8'), { lon: 56.62, lat: 26.22, span: 3.25, ease: 'sine' });

ping([56.4, 26.5], { at: 0.4, until: T('مضيق'), color: 'yellow' });
label(STRAIT, 'مضيق هرمز', { at: T('هرمز'), until: T('عرضه'), pill: '#111a2b', color: 'yellow', size: 54, dy: -10 });
region('IRN', { at: T('إيران'), style: 'tint', reveal: 'wipe', label: 'إيران', labelAt: [57.9, 28.4], labelSize: 72, fade: [T('عرضه'), .55], until: T('نفط.end+0.5') });
region('OMN', { at: T('وعمان'), style: 'solid', reveal: 'pop', label: 'عُمان', labelAt: [57.4, 24.3], labelSize: 72, labelUntil: T('عرضه'), fade: [T('عرضه'), .4], until: T('نفط.end+0.5') });

cut(T('عرضه'));
flash(T('عرضه'), .35);
ruler(LARAK, QUOIN, { at: T('تسعة') - .25, dur: .7, color: 'white', until: T('وكل') });
number({ x: 540, y: 470 }, '39 كم', { at: T('تسعة'), until: T('وكل'), size: 190 });

cut(T('وكل'));
path(shift(LANE, .028), { at: T('وكل'), dur: 1.1, color: 'sand', width: 7, dash: [26, 18], flow: 60, until: T('نفط.end+0.6') });
path(shift(LANE, -.028), { at: T('وكل') + .2, dur: 1.1, color: 'sand', width: 7, dash: [26, 18], flow: -60, until: T('نفط.end+0.6') });
ships(shift(LANE, .028).reverse(), { at: T('يعبر'), count: 4, speed: .07, size: 1.1 });
ships(shift(LANE, -.028), { at: T('يعبر') + .15, count: 4, speed: .07, size: 1.1, phase: .12 });
number({ x: 540, y: 430 }, '20 مليون', { at: T('عشرين'), size: 170, sub: 'برميل نفط كل يوم' });

captions({ max: 4 });
end(T('نفط.end+0.8'));
start();
