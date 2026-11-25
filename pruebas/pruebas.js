/* Página de pruebas: pinta 8 libros destacados como cubiertas de color. */
(function () {
  'use strict';
  var caja = document.querySelector('[data-p-fichas]');
  var libros = window.DESTACADOS;
  if (!caja || !libros || !libros.length) return;

  var COLORES = ['#6a45a0', '#a24a26', '#3f5b63', '#5c6626', '#7d3719', '#8a6a3d', '#4e6b4a', '#96522f'];

  function escapar(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Título sin el subtítulo pegado tras un punto («Título.Subtítulo»)
  function tituloCorto(t) { return t.split(/\.(?=\S)/)[0]; }

  var html = '';
  for (var i = 0; i < 8 && i < libros.length; i++) {
    var l = libros[i];
    html +=
      '<a class="p-libro" href="../catalogo.html?q=' + encodeURIComponent(l.t) + '" style="--c:' + COLORES[i % COLORES.length] + '">' +
        '<span class="p-libro__cinta">' + escapar(l.g[0]) + '</span>' +
        '<span class="p-libro__titulo">' + escapar(tituloCorto(l.t)) + '</span>' +
        '<span class="p-libro__emoji" aria-hidden="true">' + l.e + '</span>' +
        '<span class="p-libro__autor">' + escapar(l.a || l.ed || '') + '</span>' +
      '</a>';
  }
  caja.innerHTML = html;
})();
