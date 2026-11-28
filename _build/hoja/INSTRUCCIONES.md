# Hoja de Google para abrir/cerrar y marcar préstamos

Con esta hoja, la biblioteca puede, sin tocar la web:

- poner el cartel de la cabecera en **Abierto** o **Cerrado** (o dejar que siga el horario);
- marcar qué libros están **prestados** ahora mismo. En el catálogo salen con la etiqueta «Prestado».

Los cambios tardan **unos 5 minutos** en verse en la web, porque Google tarda en actualizar la versión publicada.

> **Importante:** las pestañas «Estado» y «Préstamos» se publican en internet. **Nunca escribas en ellas nombres de personas** (ni de quien se lleva el libro ni de quien lo cedió). Si quieres apuntar a quién prestas cada libro, hazlo en otra pestaña que **no** publiques.

---

## 1. Crear la hoja (una sola vez, mejor desde el ordenador)

1. Con la cuenta de Google de la biblioteca, entra en <https://sheets.new>. Se abre una hoja nueva.
2. Ponle de nombre «El Nido – web».
3. Crea **tres pestañas**, con el **+** de abajo a la izquierda. Para renombrar una pestaña, haz doble clic en su nombre:
   - `Estado`
   - `Préstamos`
   - `Catálogo`

### Pestaña «Estado»

- En **A1** escribe `Estado de la biblioteca`.
- En **B1** pon un desplegable:
  1. Clic en B1 → menú **Insertar → Desplegable**.
  2. Opciones: `Según horario`, `Abierto` y `Cerrado`.
  3. Elige `Según horario`.

### Pestaña «Catálogo»

Es la lista de todos los libros, para elegirlos sin escribirlos a mano. Esta pestaña **no** se publica.

1. Abre la pestaña `Catálogo` y haz clic en A1.
2. Menú **Archivo → Importar → Subir** y elige el archivo `catalogo-para-la-hoja.csv` (está en esta misma carpeta).
3. En «Ubicación de importación» elige **Sustituir hoja actual** y pulsa **Importar datos**.

La columna A tiene el nombre de cada libro y la B cuántos ejemplares hay. Los libros con el título repetido salen como «Título — Autor · Editorial» para distinguirlos.

### Pestaña «Préstamos»

1. En **A1** escribe `Libro`.
2. Selecciona la columna A desde A2 hacia abajo (por ejemplo, A2:A300).
3. Menú **Insertar → Desplegable**. En «Criterios» elige **Desplegable (de un intervalo)** y escribe `=Catálogo!A2:A`.
4. Pulsa **Hecho**.

## 2. Publicar las dos pestañas (una sola vez)

1. Menú **Archivo → Compartir → Publicar en la web**.
2. En el primer desplegable elige la pestaña **Estado** y en el segundo **Valores separados por comas (.csv)**.
3. Pulsa **Publicar** y copia el enlace.
4. Repite con la pestaña **Préstamos**, también en formato .csv, y copia el segundo enlace.
5. Pasa los dos enlaces a quien mantiene la web, para que los ponga en `script.js` (bloque `HOJA`, arriba del cartel).

No publiques la pestaña `Catálogo` ni ninguna otra.

## 3. Uso diario (vale el móvil, con la app Google Sheets)

- **Abrir o cerrar a mano** (festivos, vacaciones, un día que abres fuera de hora): en `Estado`, cambia B1 a `Abierto` o `Cerrado`. Cuando vuelvas al horario normal, ponlo otra vez en `Según horario`.
- **Prestar un libro:** en `Préstamos`, en la primera fila vacía de la columna A, toca la celda y elige el libro del desplegable. Si el libro tiene varios ejemplares (columna B de `Catálogo`), añade una fila por cada ejemplar prestado. Solo sale como prestado cuando están todos fuera.
- **Devolución:** borra esa fila, o deja la celda vacía.

## Si algo falla

Si la hoja no responde o se despublica, la web sigue funcionando: el cartel vuelve a seguir el horario y ningún libro sale como prestado.

## Cuando se actualice el catálogo

Cuando se añadan libros a la web, vuelve a generar `catalogo-para-la-hoja.csv` (pídeselo a quien mantiene la web) e impórtalo otra vez en la pestaña `Catálogo` con **Sustituir hoja actual**.
