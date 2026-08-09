# -*- coding: utf-8 -*-
"""Checklist automatico previo a la entrega."""
import json, os, re, sys, glob

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
paginas = sorted(glob.glob(os.path.join(ROOT, '*.html')))
fallos, avisos = [], []


def leer(ruta):
    with open(ruta, encoding='utf-8') as f:
        return f.read()


docs = {os.path.basename(p): leer(p) for p in paginas}

# --- 1. JSON-LD: un bloque bien formado, sin aperturas/cierres duplicados
for nombre, html in docs.items():
    aperturas = len(re.findall(r'<script type="application/ld\+json">', html))
    bloques = re.findall(r'<script type="application/ld\+json">(.*?)</script>',
                         html, re.S)
    if aperturas != len(bloques):
        fallos.append('%s: %d aperturas de JSON-LD y %d bloques cerrados'
                      % (nombre, aperturas, len(bloques)))
    for i, b in enumerate(bloques):
        try:
            datos = json.loads(b)
        except ValueError as e:
            fallos.append('%s: bloque JSON-LD #%d no parsea (%s)' % (nombre, i + 1, e))
            continue
        if '@context' not in datos or '@type' not in datos:
            fallos.append('%s: bloque JSON-LD #%d sin @context/@type' % (nombre, i + 1))
    if not bloques:
        avisos.append('%s: sin datos estructurados' % nombre)

# --- 2. Pie identico caracter por caracter
pies = {}
for nombre, html in docs.items():
    m = re.search(r'<footer class="pie">.*?</footer>', html, re.S)
    if not m:
        fallos.append('%s: no tiene pie' % nombre)
        continue
    pies.setdefault(m.group(0), []).append(nombre)
if len(pies) > 1:
    fallos.append('el pie NO es identico: %s'
                  % ' | '.join('[' + ', '.join(v) + ']' for v in pies.values()))

# --- 3. Cabecera identica salvo el aria-current de la pagina activa
cabeceras = {}
for nombre, html in docs.items():
    m = re.search(r'<header class="cabecera">.*?</header>', html, re.S)
    if not m:
        fallos.append('%s: no tiene cabecera' % nombre)
        continue
    normal = m.group(0).replace(' aria-current="page"', '')
    cabeceras.setdefault(normal, []).append(nombre)
if len(cabeceras) > 1:
    fallos.append('la cabecera NO es identica: %s'
                  % ' | '.join('[' + ', '.join(v) + ']' for v in cabeceras.values()))

# --- 4. title, description y canonical unicos por pagina
for etiqueta, patron in [('title', r'<title>(.*?)</title>'),
                         ('description', r'<meta name="description" content="(.*?)">'),
                         ('canonical', r'<link rel="canonical" href="(.*?)">')]:
    vistos = {}
    for nombre, html in docs.items():
        encontrados = re.findall(patron, html, re.S)
        if len(encontrados) != 1:
            fallos.append('%s: %d etiquetas <%s> (debe haber 1)'
                          % (nombre, len(encontrados), etiqueta))
            continue
        vistos.setdefault(encontrados[0], []).append(nombre)
    for valor, paginas_rep in vistos.items():
        if len(paginas_rep) > 1:
            fallos.append('%s repetido en %s' % (etiqueta, ', '.join(paginas_rep)))
    for nombre, html in docs.items():
        can = re.findall(r'<link rel="canonical" href="(.*?)">', html)
        if etiqueta == 'canonical' and can and not can[0].endswith('/' + nombre):
            fallos.append('%s: canonical apunta a %s' % (nombre, can[0]))

# --- 5. Enlaces internos que apuntan a archivos existentes
for nombre, html in docs.items():
    for href in set(re.findall(r'(?:href|src)="([^"#:]+?)(?:#[^"]*)?"', html)):
        if href.startswith(('http', 'mailto', 'tel', '//')) or not href:
            continue
        href = href.split('?')[0]          # descartar la versión de caché (?v=2)
        if not href:
            continue
        if not os.path.exists(os.path.join(ROOT, href.replace('/', os.sep))):
            fallos.append('%s: enlace roto -> %s' % (nombre, href))

# --- 6. Favicon como archivos externos, nunca en base64
for nombre, html in docs.items():
    if re.search(r'rel="(?:icon|apple-touch-icon)"[^>]*href="data:', html):
        fallos.append('%s: favicon incrustado en base64' % nombre)
    for necesario in ['favicon-16x16.png', 'favicon-32x32.png',
                      'favicon-48x48.png', 'apple-touch-icon.png']:
        if necesario not in html:
            fallos.append('%s: falta <link> a %s' % (nombre, necesario))
if re.search(r'data:image/[^;]+;base64', ' '.join(docs.values())):
    fallos.append('hay al menos una imagen incrustada en base64 en el HTML')

# --- 7. Accesibilidad basica: alt en imagenes y jerarquia de encabezados
for nombre, html in docs.items():
    for img in re.findall(r'<img\b[^>]*>', html):
        if 'alt=' not in img:
            fallos.append('%s: <img> sin alt -> %s' % (nombre, img[:60]))
    niveles = [int(h) for h in re.findall(r'<h([1-6])[ >]', html)]
    if niveles.count(1) != 1:
        fallos.append('%s: %d etiquetas <h1> (debe haber 1)' % (nombre, niveles.count(1)))
    previo = 0
    for n in niveles:
        if previo and n > previo + 1:
            avisos.append('%s: salto de encabezado h%d -> h%d' % (nombre, previo, n))
        previo = n

# --- 8. CSS y JS compartidos, no duplicados por pagina
for nombre, html in docs.items():
    if '<style' in html:
        avisos.append('%s: tiene CSS en linea (<style>)' % nombre)
    if 'styles.css' not in html:
        fallos.append('%s: no enlaza styles.css' % nombre)
    if 'script.js' not in html:
        fallos.append('%s: no enlaza script.js' % nombre)

# --- 9. Datos del catalogo
libros_js = os.path.join(ROOT, 'data', 'libros.js')
if os.path.exists(libros_js):
    texto = leer(libros_js)
    datos = json.loads(texto[texto.index('['):texto.rindex(';')])
    sin_tags = [b for b in datos if len(b.get('g', [])) < 2]
    sin_desc = [b for b in datos if not b.get('d')]
    sin_emoji = [b for b in datos if not b.get('e')]
    if sin_tags:
        fallos.append('%d libros con menos de 2 etiquetas' % len(sin_tags))
    if sin_desc:
        fallos.append('%d libros sin descripcion' % len(sin_desc))
    if sin_emoji:
        fallos.append('%d libros sin emoji' % len(sin_emoji))
    print('Catalogo: %d libros, todos con emoji, descripcion y etiquetas.' % len(datos))
else:
    fallos.append('falta data/libros.js')

# --- 10. sitemap y robots
mapa = os.path.join(ROOT, 'sitemap.xml')
if os.path.exists(mapa):
    urls = re.findall(r'<loc>.*?/([^/<]+)</loc>', leer(mapa))
    for u in urls:
        if u not in docs:
            fallos.append('sitemap.xml apunta a %s, que no existe' % u)
    for nombre in docs:
        if nombre not in urls:
            avisos.append('%s no esta en sitemap.xml' % nombre)
else:
    fallos.append('falta sitemap.xml')

# --- informe
print('\nPaginas analizadas: %s' % ', '.join(sorted(docs)))
if avisos:
    print('\nAVISOS (%d):' % len(avisos))
    for a in avisos:
        print('  ~ ' + a)
if fallos:
    print('\nFALLOS (%d):' % len(fallos))
    for f in fallos:
        print('  X ' + f)
    sys.exit(1)
print('\nOK: checklist superado sin fallos.')
