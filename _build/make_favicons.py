# -*- coding: utf-8 -*-
"""Genera los favicons PNG con transparencia real (canal alfa).
   Marca: un libro abierto que hace de nido, con un huevo encima."""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

S = 1024                      # lienzo de trabajo (se reduce al final)
# Paleta: morado (nido) · plata (páginas del libro) · verde oliva (hoja).
# Se conservan los nombres antiguos como roles para no reescribir el dibujo.
TERRACOTA = (106, 69, 160, 255)      # morado — nido
TERRACOTA_OSC = (77, 47, 120, 255)   # morado profundo — trazos y lomo
CREMA = (238, 236, 243, 255)         # plata clara — páginas
MUSGO = (139, 148, 85, 255)          # verde oliva claro — hoja


def dibujar():
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = S / 100.0            # unidad = 1% del lienzo

    def p(*pares):
        return [(x * u, y * u) for x, y in pares]

    # --- hojita: unico detalle en verde, asoma por el lomo
    d.polygon(p((50, 2), (58, 11), (50, 20), (42, 11)), fill=MUSGO)

    # --- libro abierto en V; el lomo se hunde en el nido
    d.polygon(p((50, 18), (17, 27), (31, 60), (50, 76)), fill=CREMA,
              outline=TERRACOTA_OSC, width=int(3.4 * u))
    d.polygon(p((50, 18), (83, 27), (69, 60), (50, 76)), fill=CREMA,
              outline=TERRACOTA_OSC, width=int(3.4 * u))
    d.line(p((50, 16), (50, 76)), fill=TERRACOTA_OSC, width=int(3.6 * u))

    # --- nido: cuenco de ramas, dibujado encima para que arrope el libro
    d.arc([5 * u, 24 * u, 95 * u, 78 * u], start=0, end=180,
          fill=TERRACOTA_OSC, width=int(13 * u))
    d.arc([16 * u, 30 * u, 84 * u, 72 * u], start=0, end=180,
          fill=TERRACOTA, width=int(8 * u))
    return img


def main():
    base = dibujar()
    destinos = [('favicon-16x16.png', 16), ('favicon-32x32.png', 32),
                ('favicon-48x48.png', 48), ('apple-touch-icon.png', 180),
                ('icon-512.png', 512)]
    for nombre, tam in destinos:
        img = base.resize((tam, tam), Image.LANCZOS)
        if nombre == 'apple-touch-icon.png':
            # iOS no respeta la transparencia: fondo crema solido
            fondo = Image.new('RGBA', (tam, tam), CREMA)
            fondo.alpha_composite(img)
            img = fondo
        img.save(os.path.join(ROOT, nombre))
        print('->', nombre, tam, 'px  modo', img.mode)


if __name__ == '__main__':
    main()
