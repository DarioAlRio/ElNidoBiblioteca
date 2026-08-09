# -*- coding: utf-8 -*-
"""Actualiza el catálogo de la web a partir del Excel, en un solo paso.

   1) lee el Excel (de la carpeta datos/ del proyecto)
   2) reasigna etiquetas, emoji y descripción a cada libro
   3) reescribe data/libros.js y data/destacados.js

   Uso:  python _build/actualizar.py
   o bien: doble clic en «Actualizar catalogo.bat»
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import dump
import build_data

print('=' * 60)
print('  ACTUALIZAR CATÁLOGO — Biblioteca El Nido')
print('=' * 60)

try:
    ruta, n = dump.extraer()
except FileNotFoundError as e:
    print('\n[ERROR] ' + str(e))
    sys.exit(1)

print('\n1) Excel leído:')
print('   ' + ruta)
print('   %d filas (incluida la cabecera)' % n)

print('\n2) Reasignando etiquetas, emoji y descripción...\n')
build_data.main()

print('\n' + '=' * 60)
print('  LISTO. Se han reescrito:')
print('    data/libros.js       (catálogo completo)')
print('    data/destacados.js   (portada)')
print('\n  Siguiente paso: sube esos dos archivos a tu hosting')
print('  (o vuelve a subir toda la carpeta). Eso es todo.')
print('=' * 60)
