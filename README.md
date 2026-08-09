# Biblioteca El Nido

Web de la biblioteca vecinal **El Nido** (Fuentemolinos, Burgos). Sitio estático
en HTML/CSS/JS puro, sin frameworks ni dependencias, desplegado en Vercel.

- **Catálogo** de más de 1.000 libros con buscador y filtros por tema y edad.
- Portada con estantería interactiva, páginas de actividades, FAQ, contacto y aviso legal.
- SEO técnico (JSON-LD, sitemap), accesibilidad y diseño responsive.

## Actualizar el catálogo

1. Reemplaza el Excel en `datos/Biblioteca Fuentemolinos.xlsx`.
2. Doble clic en **`Actualizar catalogo.bat`** (o `python _build/actualizar.py`).
3. `git add . && git commit && git push` → Vercel despliega solo.

Guía completa de mantenimiento en [LEEME.md](LEEME.md).

> Nota: la carpeta `datos/` y los datos extraídos en `_build/` no se versionan
> ni se publican (contienen nombres de quién cedió cada libro). Ver `.gitignore`
> y `.vercelignore`.
