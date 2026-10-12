<p align="center"><img src="logo-cabecera.png" alt="Biblioteca El Nido" width="160"></p>

# Biblioteca El Nido

Web de la biblioteca vecinal **El Nido** de Fuentemolinos (Burgos).
Sitio estático en **HTML, CSS y JS puro**, sin frameworks ni dependencias, desplegado en Vercel.

🌐 **[elnidobiblioteca.com](https://elnidobiblioteca.com)**

## Qué incluye

- **Catálogo de 1.096 libros** con buscador y filtros por tema y edad. Cada libro tiene emoji, descripción y etiquetas.
- **Portada con estantería interactiva** para descubrir libros destacados.
- **Actividades**: cuentacuentos, club de lectura, talleres de temporada, mercadillo de intercambio y donaciones.
- **Preguntas frecuentes, contacto y textos legales** (aviso legal, privacidad y cookies).
- **SEO**: datos estructurados `Library` (JSON-LD) con dirección, coordenadas y horario, `FAQPage`, canonicals, `sitemap.xml` y `robots.txt`.
- **Accesibilidad y diseño responsive**.

## Estructura

```
├── index.html  catalogo.html  actividades.html  faq.html  contacto.html  legal.html
├── styles.css  script.js     Estilos y JavaScript compartidos por las 6 páginas
├── data/
│   ├── libros.js             Catálogo completo (solo lo carga catalogo.html)
│   └── destacados.js         48 libros para la portada
├── sitemap.xml  robots.txt
└── _build/                   Scripts de Python que generan el catálogo (no se publican)
```

## Actualizar el catálogo

El catálogo se genera a partir de un Excel con [Python](https://www.python.org/):

1. Reemplaza el Excel en `datos/Biblioteca Fuentemolinos.xlsx`.
2. Doble clic en **`Actualizar catalogo.bat`** (o `python _build/actualizar.py`). Reasigna etiquetas, emoji y descripción a cada libro y reescribe `data/libros.js` y `data/destacados.js`.
3. Comprueba que todo está bien con `python _build/validar.py`.
4. `git add . && git commit && git push`: Vercel publica los cambios solo.

> La carpeta `datos/` y los datos extraídos en `_build/` no se suben a GitHub ni se publican,
> porque contienen los nombres de quién cedió cada libro. Ver `.gitignore` y `.vercelignore`.

Guía completa de mantenimiento en [LEEME.md](LEEME.md).

## Créditos

Diseño y desarrollo: [El Escaparate](https://elescaparateweb.com).
