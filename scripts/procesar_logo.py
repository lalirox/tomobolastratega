#!/usr/bin/env python3
"""Recorta el logo de Stratega, convierte el fondo negro en transparente
y lo guarda optimizado en public/stratega-logo.png"""
from PIL import Image

SRC = '/home/z/my-project/upload/strategalogo.png'
DST = '/home/z/my-project/public/stratega-logo.png'

im = Image.open(SRC).convert('RGBA')

# 1) Fondo casi-negro -> transparente
data = im.getdata()
new = []
for r, g, b, a in data:
    if max(r, g, b) < 26:
        new.append((r, g, b, 0))
    else:
        new.append((r, g, b, a))
im.putdata(new)

# 2) Bbox del contenido visible
alpha = im.split()[3]
bbox = alpha.getbbox()
print('bbox original:', bbox)

if bbox:
    margin = 40
    left = max(0, bbox[0] - margin)
    top = max(0, bbox[1] - margin)
    right = min(im.width, bbox[2] + margin)
    bottom = min(im.height, bbox[3] + margin)
    im = im.crop((left, top, right, bottom))

# 3) Redimensionar a ancho razonable
target_w = 720
if im.width > target_w:
    ratio = target_w / im.width
    im = im.resize((target_w, int(im.height * ratio)), Image.LANCZOS)

im.save(DST, optimize=True)
print('guardado:', DST, 'size:', im.size)
