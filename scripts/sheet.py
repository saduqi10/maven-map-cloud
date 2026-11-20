"""Contact sheet of a folder of vertical frames.  python sheet.py <dir> <out.jpg> [cols] [width]"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6; w = int(sys.argv[4]) if len(sys.argv) > 4 else 300
fs = sorted(glob.glob(os.path.join(d, '*.jpg'))); h = int(w * 1920 / 1080); rows = (len(fs) + cols - 1) // cols
S = Image.new('RGB', (cols * w, rows * h)); f = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine', 'fonts', 'Poppins-ExtraBold.ttf'), 18)
for i, p in enumerate(fs):
    x, y = (i % cols) * w, (i // cols) * h; S.paste(Image.open(p).resize((w, h)), (x, y)); dr = ImageDraw.Draw(S)
    lab = os.path.basename(p)[:-4].replace('t_', '').lstrip('f'); dr.rectangle([x, y, x + 90, y + 24], fill='black'); dr.text((x + 3, y + 1), lab, fill='yellow', font=f)
S.save(out, quality=86); print(out, len(fs), 'frames')
