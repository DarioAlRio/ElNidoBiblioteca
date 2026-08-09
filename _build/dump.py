# -*- coding: utf-8 -*-
"""Extrae las filas del Excel de la biblioteca a _build/books_raw.json.
   Se puede usar como función (extraer) o ejecutar suelto."""
import zipfile, re, json, collections, os
import xml.etree.ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def localizar_excel():
    """Busca el Excel en orden: datos/ del proyecto, _build/, y Descargas."""
    candidatos = [
        os.path.join(ROOT, 'datos', 'Biblioteca Fuentemolinos.xlsx'),
        os.path.join(HERE, 'Biblioteca Fuentemolinos.xlsx'),
        r'C:/Users/Dario/Downloads/Biblioteca Fuentemolinos.xlsx',
    ]
    # además, cualquier .xlsx que haya en datos/ (por si lo renombran)
    datos = os.path.join(ROOT, 'datos')
    if os.path.isdir(datos):
        for f in sorted(os.listdir(datos)):
            if f.lower().endswith('.xlsx') and not f.startswith('~$'):
                candidatos.insert(0, os.path.join(datos, f))
                break
    for c in candidatos:
        if os.path.exists(c):
            return c
    raise FileNotFoundError(
        'No encuentro el Excel. Guárdalo en:\n  ' + os.path.join(ROOT, 'datos') +
        '\\Biblioteca Fuentemolinos.xlsx')


def extraer(src=None):
    if src is None:
        src = localizar_excel()
    z = zipfile.ZipFile(src)
    shared = []
    sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in sst.findall(NS + 'si'):
        shared.append(''.join(t.text or '' for t in si.iter(NS + 't')))

    sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = []
    for row in sheet.iter(NS + 'row'):
        cells = {}
        for c in row.findall(NS + 'c'):
            col = re.match(r'[A-Z]+', c.get('r')).group()
            t, v, isel = c.get('t'), c.find(NS + 'v'), c.find(NS + 'is')
            if t == 's' and v is not None:
                val = shared[int(v.text)]
            elif isel is not None:
                val = ''.join(x.text or '' for x in isel.iter(NS + 't'))
            elif v is not None:
                val = v.text
            else:
                val = ''
            val = str(val).strip()
            if val:
                cells[col] = val
        if cells:
            rows.append(cells)

    with open(os.path.join(HERE, 'books_raw.json'), 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)

    lines = ['rows: %d' % len(rows)]
    for col in ['J', 'N', 'M', 'G', 'H', 'K', 'L', 'F', 'I']:
        c = collections.Counter(r.get(col, '(vacio)') for r in rows[1:])
        lines.append('--- col %s | unicos: %d' % (col, len(c)))
        for k, v in c.most_common(80):
            lines.append('    %-45s %d' % (repr(k), v))
    with open(os.path.join(HERE, 'summary.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    return src, len(rows)


if __name__ == '__main__':
    ruta, n = extraer()
    print('ok', n, '|', ruta)
