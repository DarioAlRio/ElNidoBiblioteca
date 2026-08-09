# Biblioteca El Nido — web multipágina

Sitio estático en HTML/CSS/JS puro, sin frameworks ni dependencias externas.
Se abre tal cual: basta con subir la carpeta a cualquier hosting.

## Estructura

```
index.html          Portada, con la estantería interactiva
catalogo.html       Los 1.096 libros, con buscador y filtros
actividades.html    Cuentacuentos, club de lectura, talleres, donaciones
faq.html            9 preguntas frecuentes (con FAQPage en JSON-LD)
contacto.html       Dirección, horarios y vías de contacto
legal.html          Aviso legal + privacidad + cookies
styles.css          Hoja de estilos única, compartida por las 6 páginas
script.js           JavaScript único, compartido por las 6 páginas
data/libros.js      Catálogo completo (193 KB) — solo lo carga catalogo.html
data/destacados.js  48 libros (10 KB) — solo lo carga index.html
favicon-*.png       Favicons reales en PNG con transparencia
sitemap.xml
robots.txt
_build/             Scripts de generación (no se publica: bloqueado en robots.txt)
```

## ⚠️ Datos inventados que hay que sustituir

El prompt de encargo dejaba estos campos entre corchetes. Están rellenos con
valores **provisionales y verosímiles** para que el sitio funcione y valide,
pero **hay que cambiarlos antes de publicar**. Aparecen en las 6 páginas.

| Dato | Valor provisional | Dónde aparece |
|---|---|---|
| Dirección | Calle La Iglesia, 4 · 09453 Fuentemolinos (Burgos) | Pie de las 6 páginas, `contacto.html`, `legal.html`, JSON-LD de `index/contacto/actividades` |
| Teléfono | +34 947 55 30 12 | Ídem |
| Correo | hola@bibliotecaelnido.es | Ídem |
| Instagram | @bibliotecaelnido | Pie de las 6 páginas, `contacto.html`, JSON-LD de `index.html` |
| Dominio | https://www.bibliotecaelnido.es | `canonical`, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt` |
| Coordenadas | 41.5583, -3.8047 (centro del municipio) | JSON-LD de `index.html` y `contacto.html` |
| Enlace de Google Maps | Búsqueda del municipio, sin marcador exacto | Pie de las 6 páginas y `contacto.html` |
| Titular y NIF | Asociación Cultural Biblioteca El Nido · G00000000 | `legal.html` |
| Horarios | X y V 17–20 h · S 11–14 h | Pie no; sí `index`, `contacto`, `faq` y los JSON-LD |
| Actividades | Cuentacuentos, club de lectura, talleres, mercadillo | `actividades.html` y su JSON-LD |

Para cambiar cualquiera de ellos, un buscar-y-reemplazar sobre los `.html`
basta: el texto es idéntico carácter por carácter en todas las páginas.

## El catálogo

Los 1.096 libros salen de `Biblioteca Fuentemolinos.xlsx`. De cada ficha se
conserva todo lo que había en el Excel — autor, ilustrador, editorial,
colección, curso, categoría, premios, año, edad recomendada, sección y quién
lo cedió — y **los campos vacíos sencillamente no se muestran**.

A cada libro se le ha añadido:

- **1 etiqueta de público**: `Infantil`, `Juvenil` o `Adultos`.
- **1 a 3 etiquetas temáticas** de un vocabulario de 33 (Aventuras, Cocina,
  Fantasía, Cómic, Consulta, Poesía…).
- **Un emoji** que hace de portada.
- **Una descripción de una línea**.

Todo ello se deduce por reglas a partir del título, el autor, la editorial y la
colección, porque el Excel solo traía categoría en 205 de los 1.096 registros.
Es una aproximación automática: habrá aciertos y algún libro mal clasificado.
Para corregir casos concretos, edita las listas de palabras clave de
`_build/build_data.py` y vuelve a generar.

### Actualizar el catálogo cuando cambies el Excel  ← lo habitual

1. Guarda tu Excel actualizado en la carpeta **`datos/`** del proyecto, con el
   nombre `Biblioteca Fuentemolinos.xlsx` (sobrescribe el que hay). Vale
   cualquier `.xlsx` que dejes ahí; toma el primero que encuentre.
2. **Doble clic en `Actualizar catalogo.bat`** (o, en terminal,
   `python _build/actualizar.py`).
3. Sube a tu hosting los dos archivos que se han regenerado:
   `data/libros.js` y `data/destacados.js` (o vuelve a subir toda la carpeta).

Eso es todo. El script relee el Excel, reasigna etiquetas/emoji/descripción a
**todos** los libros (los nuevos también) y reescribe el catálogo. No hay que
tocar el HTML: la web carga esos `.js`.

> Las columnas del Excel deben mantener el mismo orden (B nombre, C apellido,
> D título, E ilustrador, F colección, G curso, H editorial, I cedido por,
> J categoría, K premios, L año, M a partir de, N sección). Si añades o mueves
> columnas, hay que ajustar `COLS` en `_build/build_data.py`.

Para regenerar el favicon y el logo, ver *Regenerar los favicons* más abajo.

### Pasar el checklist de calidad

```bash
python _build/validar.py
```

Comprueba los JSON-LD uno a uno, que el pie sea idéntico en las 6 páginas, que
no haya enlaces rotos, que los favicons sean archivos externos, que no haya
imágenes en base64, los `alt`, la jerarquía de encabezados y el sitemap.

### Regenerar los favicons

```bash
python _build/make_favicons.py
```

## Decisiones que conviene conocer

- **Sin cookies ni analítica.** No hay banner de consentimiento porque no hay
  nada que consentir, y la política de cookies lo dice así.
- **Sin formulario de contacto,** para no tratar datos personales a través de
  la web. El contacto es por teléfono, correo o Instagram.
- **Mapa enlazado, no incrustado.** Un iframe de Google Maps cargaría recursos
  de terceros antes de que el visitante acepte nada.
- **Sin tipografías web.** Se usan las del sistema, así no hay peticiones a
  Google Fonts ni transferencia de IP fuera de la UE.
- **El catálogo se carga solo donde se usa**, y se pinta de 60 en 60 para que
  1.096 tarjetas no bloqueen el navegador.
