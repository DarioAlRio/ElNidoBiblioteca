# -*- coding: utf-8 -*-
"""Genera TODOS los recursos del logo a partir de logo-sin-letras.png
   (nido con libros, sin rótulo, sobre fondo blanco).
   - Mantiene el dibujo tal cual (no recolorea, no redibuja).
   - Vuelve transparente solo el blanco EXTERIOR (relleno desde los bordes),
     sin agujerear páginas crema ni huevos (claros pero encerrados por el trazo).
   - Salidas: favicons 16/32/48, apple-touch (fondo blanco para iOS),
     icon-512, logo-cabecera (128, nítido) y logo-marca-agua (translúcido).
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'logo-sin-letras.png')

MARCA = (255, 0, 255)     # magenta testigo, no presente en el logo
THRESH = 72               # tolerancia del "casi blanco" (incluye la sombra suave)


def quitar_fondo(src):
    img = Image.open(src).convert('RGB')
    w, h = img.size
    work = img.copy()

    seeds = []
    for t in range(0, 101, 4):
        x = int((w - 1) * t / 100)
        y = int((h - 1) * t / 100)
        seeds += [(x, 0), (x, h - 1), (0, y), (w - 1, y)]
    for sx, sy in seeds:
        r, g, b = work.getpixel((sx, sy))
        if r > 230 and g > 230 and b > 230:
            ImageDraw.floodfill(work, (sx, sy), MARCA, thresh=THRESH)

    px = work.load()
    base = img.convert('RGBA')
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == MARCA:
                ap[x, y] = 0
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    base.putalpha(alpha)
    return base


def recortar(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def cuadrar(img, margen=0.05):
    w, h = img.size
    lado = int(max(w, h) * (1 + margen * 2))
    lienzo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    lienzo.alpha_composite(img, ((lado - w) // 2, (lado - h) // 2))
    return lienzo


def main():
    limpio = recortar(quitar_fondo(SRC))
    limpio.save(os.path.join(ROOT, 'logo-recortado.png'))
    cuadrado = cuadrar(limpio)

    # favicons + og image
    for nombre, tam in [('favicon-16x16.png', 16), ('favicon-32x32.png', 32),
                        ('favicon-48x48.png', 48), ('apple-touch-icon.png', 180),
                        ('icon-512.png', 512)]:
        ico = cuadrado.resize((tam, tam), Image.LANCZOS)
        if nombre == 'apple-touch-icon.png':
            fondo = Image.new('RGBA', (tam, tam), (255, 255, 255, 255))
            fondo.alpha_composite(ico)
            ico = fondo
        ico.save(os.path.join(ROOT, nombre))

    # logo de cabecera (nítido, ligero)
    cuadrado.resize((160, 160), Image.LANCZOS).save(os.path.join(ROOT, 'logo-cabecera.png'))

    # marca de agua translúcida (14% de alfa)
    agua = cuadrado.copy()
    r, g, b, a = agua.split()
    a = a.point(lambda v: int(v * 0.14))
    agua.putalpha(a)
    agua.save(os.path.join(ROOT, 'logo-marca-agua.png'))

    print('contenido recortado:', limpio.size, '| cuadrado:', cuadrado.size)
    print('generados: favicons, icon-512, logo-cabecera.png, logo-marca-agua.png')


if __name__ == '__main__':
    main()
