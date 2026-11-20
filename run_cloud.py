# -*- coding: utf-8 -*-
import os
import subprocess
import sys
from pathlib import Path

# الإعدادات للسحابة
PROJECT_NAME = "bab-al-mandab"
PROJECT_DIR  = Path.cwd() / PROJECT_NAME  # سيتم إنشاء المجلد داخل المستودع
SKILL_DIR    = Path.cwd()                 # مسار المشروع الحالي
NEW_PY       = SKILL_DIR / "scripts" / "new.py"
VOICE_PY     = SKILL_DIR / "scripts" / "voice.py"
BUILD_PY     = SKILL_DIR / "scripts" / "build.py"
WEB_DIR      = PROJECT_DIR / "web"

os.environ["MAVEN_FPS"]               = "30"
os.environ["FFMPEG_THREADS"]          = "4"
os.environ["FFMPEG_DEFAULT_THREADS"]  = "4"
os.environ["FFMPEG_ENCODER"]          = "libx264"

# النص
SCRIPT_MANDAB = (
    "يقع مضيق باب المندب في نقطة التقاء استراتيجية بين البحر الأحمر وخليج عدن، "
    "فاصلاً بين قارتي آسيا وأفريقيا. يبلغ عرضه حوالي 26 كيلومتراً، وتتحكم فيه "
    "دولتان: اليمن في الشرق، وجيبوتي في الغرب. في منتصفه تقع جزيرة ميون (بريم) "
    "التي تقسم الممر إلى قناتين، أعمقهما قناة الشرق. يعتبر باب المندب شرياناً "
    "حيوياً للتجارة العالمية ونقل النفط، حيث تعبره آلاف السفن سنوياً متجهة "
    "إلى قناة السويس أو الخليج. ورغم التحديات الأمنية، يظل هذا المضيق بوابة "
    "عبور لا غنى عنها للاقتصاد العالمي، ونقطة وصل حاسمة بين الشرق والغرب."
)

# كود story.js (نسخة نظيفة بدون مشاكل الأيقونات)
STORY_MANDAB = r"""import * as M from './map.js';
const { cam, region, label, ping, captions, end, start } = M;
const _T   = M.T    || (() => null);
const safeT = (w, fb) => { try { const v = _T(w); return (v!=null) ? v : fb; } catch(_) { return fb; } };
const dur = (window.END && window.END > 30) ? window.END : 40.0;
const tFinal = dur;

const tRedSea   = safeT('الأحمر', 4.5);
const tAden     = safeT('عدن', 6.5);
const tAsia     = safeT('آسيا', 8.5);
const tAfrica   = safeT('أفريقيا', 10.0);
const t26Km     = safeT('26', 11.5);
const tYemen    = safeT('اليمن', 14.0);
const tDjibouti = safeT('جيبوتي', 16.0);
const tPerim    = safeT('ميون', 18.0);
const tEastCh   = safeT('الشرق', 21.0);
const tOil      = safeT('النفط', 24.0);
const tShips    = safeT('السفن', 26.5);
const tSuez     = safeT('السويس', 29.0);
const tEndText  = safeT('الاقتصاد', 33.0);

// حركة كاميرا بطيئة وسينمائية
cam(0, { lon: 43.3, lat: 13.5, span: 30.0, pitch: 0 });
cam(tRedSea + 2.0, { lon: 42.0, lat: 15.0, span: 18.0, pitch: 20, ease: 'sine' });
region('YEM', { at: tAsia, style: 'zone', reveal: 'draw', dur: 2.0, until: tFinal });
region('DJI', { at: tAfrica, style: 'zone', reveal: 'draw', dur: 2.0, until: tFinal });
cam(t26Km + 1.0, { lon: 43.33, lat: 12.58, span: 6.0, pitch: 45, bearing: -15, ease: 'io' });
cam(tEastCh, { lon: 43.40, lat: 12.60, span: 5.0, pitch: 55, bearing: 20, ease: 'sine' });
cam(tSuez - 1.0, { lon: 43.33, lat: 12.58, span: 4.5, pitch: 50, bearing: 0, ease: 'sine' });
cam(tEndText, { lon: 43.3, lat: 13.0, span: 12.0, pitch: 30, bearing: -10, ease: 'io' });

// نصوص وملصقات (بدون أيقونات معقدة)
label([43.33, 12.58], 'باب المندب', { at: t26Km, color: '#FFD700', size: 80, dy: -180, until: tFinal });
label([43.33, 12.58], 'أهم ممر مائي', { at: tAsia, color: '#FFFFFF', size: 52, dy: -110, until: tShips });
label([44.2, 15.3], 'اليمن', { at: tYemen, pill: '#111a2b', color: '#ffffff', size: 48, dy: -60, until: tFinal });
label([43.1, 11.5], 'جيبوتي', { at: tDjibouti, pill: '#111a2b', color: '#ffffff', size: 48, dy: -60, until: tFinal });
label([43.4, 12.6], 'جزيرة ميون', { at: tPerim, color: '#ffd400', size: 40, dy: -50, until: tFinal });
ping([43.4, 12.6], { at: tPerim, color: '#ffd400', until: tFinal });
label([43.45, 12.65], 'القناة الشرقية', { at: tEastCh, color: '#4fd2ff', size: 38, dy: -70, until: tFinal });
label([43.33, 12.58], '🛢️ نفط', { at: tOil, color: '#ff4444', size: 44, dy: -150, until: tFinal });
label([43.35, 14.0], '🚢 سفينة', { at: tShips, color: '#ffffff', size: 44, until: tFinal });
label([43.30, 13.2], '🚢 سفينة', { at: tShips + 0.8, color: '#ffffff', size: 44, until: tFinal });
label([43.25, 12.2], '🚢 سفينة', { at: tShips + 1.6, color: '#ffffff', size: 44, until: tFinal });
label([32.5, 30.0], 'نحو قناة السويس', { at: tSuez, color: '#FFD700', size: 52, dy: -60, until: tFinal });
label([43.33, 12.58], 'شريان الاقتصاد العالمي', { at: tEndText, color: '#FFD700', size: 60, dy: -120, until: tFinal });

captions({ style: 'clean' });
end(tFinal);
start();
"""

def run(cmd):
    result = subprocess.run(cmd)
    if result.returncode != 0:
        sys.exit(result.returncode)

def main():
    PROJECT_DIR.mkdir(parents=True, exist_ok=True)
    WEB_DIR.mkdir(parents=True, exist_ok=True)

    if not (WEB_DIR / "map.js").exists():
        run([sys.executable, str(NEW_PY), str(PROJECT_DIR), "--lang", "ar"])

    (PROJECT_DIR / "script.txt").write_text(SCRIPT_MANDAB, encoding="utf-8")
    (WEB_DIR / "story.js").write_text(STORY_MANDAB, encoding="utf-8")

    run([sys.executable, str(VOICE_PY), str(PROJECT_DIR)])
    run([sys.executable, str(BUILD_PY), str(PROJECT_DIR), "prep"])
    run([sys.executable, str(BUILD_PY), str(PROJECT_DIR), "all"])

if __name__ == "__main__":
    main()