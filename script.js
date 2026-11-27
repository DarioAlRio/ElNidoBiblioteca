/* ==========================================================================
   Biblioteca El Nido — script compartido por todas las páginas
   1. Bloqueo de scroll     4. Modal genérico
   2. Menú de navegación    5. Estantería interactiva (portada)
   3. Acordeón (FAQ)        6. Catálogo (búsqueda + filtros)
   ========================================================================== */
(function () {
  'use strict';

  /* 1. Bloqueo de scroll ------------------------------------------------
     Guarda la posición y la compensa con `top` negativo: así el contenido
     `position:fixed` (menú, modal) no se descoloca aunque ya hubiera scroll,
     que es justo lo que rompe un `overflow:hidden` a secas. */
  var bloqueos = 0;
  var scrollGuardado = 0;

  function bloquearScroll() {
    if (bloqueos++ > 0) return;
    scrollGuardado = window.pageYOffset || document.documentElement.scrollTop;
    if (window.lenis) window.lenis.stop();
    document.body.style.top = -scrollGuardado + 'px';
    document.body.classList.add('scroll-bloqueado');
  }

  function liberarScroll() {
    if (bloqueos === 0 || --bloqueos > 0) return;
    document.body.classList.remove('scroll-bloqueado');
    document.body.style.top = '';
    window.scrollTo(0, scrollGuardado);
    if (window.lenis) {
      window.lenis.scrollTo(scrollGuardado, { immediate: true, force: true });
      window.lenis.start();
    }
  }

  // Salto instantáneo que también entiende el scroll suave
  function irA(y) {
    if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }

  /* Scroll suave con inercia (Lenis, cargado desde jsDelivr). Solo la rueda
     del ratón y el trackpad; en móvil el dedo sigue siendo el nativo. Se
     desactiva si el sistema pide reducir animaciones. */
  function iniciarScrollSuave() {
    if (!window.Lenis || window.lenis ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var lenis = window.lenis = new window.Lenis({
      lerp: 0.09,
      wheelMultiplier: 0.9,
      prevent: function (n) { return n.closest && n.closest('.modal, .nav, .filtros, [data-lenis-prevent]'); }
    });
    function bucle(t) { lenis.raf(t); requestAnimationFrame(bucle); }
    requestAnimationFrame(bucle);

    // Enlaces a otra parte de la misma página: suave y sin quedar bajo la cabecera
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || a.origin !== location.origin || a.pathname !== location.pathname || !a.hash) return;
      var destino = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (!destino) return;
      e.preventDefault();
      var cab = document.querySelector('.cabecera');
      lenis.scrollTo(destino, { offset: -(cab ? cab.offsetHeight : 0), duration: 1.1 });
      history.pushState(null, '', a.hash);
      if (destino.tabIndex < 0 && !destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
      destino.focus({ preventScroll: true });
    });
  }

  /* Publica la altura real de la cabecera para lo que quede pegado debajo. */
  function medirCabecera() {
    var cabecera = document.querySelector('.cabecera');
    if (!cabecera) return;
    var aplicar = function () {
      document.documentElement.style.setProperty(
        '--alto-cabecera', cabecera.offsetHeight + 'px');
    };
    aplicar();
    window.addEventListener('resize', aplicar);
  }

  /* 2. Menú de navegación ----------------------------------------------- */
  function iniciarMenu() {
    var boton = document.querySelector('[data-menu-boton]');
    var nav = document.querySelector('[data-menu]');
    if (!boton || !nav) return;

    function cerrar() {
      if (boton.getAttribute('aria-expanded') !== 'true') return;
      boton.setAttribute('aria-expanded', 'false');
      nav.setAttribute('data-abierto', 'false');
      liberarScroll();
    }

    boton.addEventListener('click', function () {
      var abierto = boton.getAttribute('aria-expanded') === 'true';
      if (abierto) { cerrar(); return; }
      boton.setAttribute('aria-expanded', 'true');
      nav.setAttribute('data-abierto', 'true');
      bloquearScroll();
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) cerrar();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrar();
    });

    // al pasar a escritorio el menú deja de ser un panel fijo
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) cerrar();
    });
  }

  /* 3. Acordeón ---------------------------------------------------------- */
  function iniciarAcordeon() {
    var botones = document.querySelectorAll('[data-acordeon-boton]');
    Array.prototype.forEach.call(botones, function (boton) {
      boton.addEventListener('click', function () {
        var panel = document.getElementById(boton.getAttribute('aria-controls'));
        var abierto = boton.getAttribute('aria-expanded') === 'true';
        boton.setAttribute('aria-expanded', abierto ? 'false' : 'true');
        if (panel) panel.setAttribute('data-abierto', abierto ? 'false' : 'true');
      });
    });
  }

  /* Icono de libro (trazo estilo Lucide) con el color de su público */
  var ICONO_LIBRO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" focusable="false">' +
    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
  function iconoLibro(libro, clase) {
    var p = (libro.g[0] || '').toLowerCase();
    var tono = p === 'infantil' ? 'infantil' : p === 'juvenil' ? 'juvenil' : 'adultos';
    return '<span class="' + clase + ' icono-libro icono-libro--' + tono + '" aria-hidden="true">' + ICONO_LIBRO + '</span>';
  }

  /* 4. Modal genérico ---------------------------------------------------- */
  var modal, modalCuerpo, modalCerrar, ultimoFoco;

  function crearModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-titulo');
    modal.setAttribute('data-abierto', 'false');
    modal.innerHTML =
      '<div class="modal__caja">' +
      '<button type="button" class="modal__cerrar" aria-label="Cerrar ventana">&#10005;</button>' +
      '<div data-modal-cuerpo></div>' +
      '</div>';
    document.body.appendChild(modal);
    modalCuerpo = modal.querySelector('[data-modal-cuerpo]');
    modalCerrar = modal.querySelector('.modal__cerrar');

    modalCerrar.addEventListener('click', cerrarModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) cerrarModal();      // clic fuera de la caja
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.getAttribute('data-abierto') === 'true') cerrarModal();
      if (e.key === 'Tab' && modal.getAttribute('data-abierto') === 'true') atraparFoco(e);
    });
    return modal;
  }

  function atraparFoco(e) {
    var focales = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focales.length) return;
    var primero = focales[0];
    var ultimo = focales[focales.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primero.focus();
    }
  }

  function abrirModal(html) {
    crearModal();
    ultimoFoco = document.activeElement;
    modalCuerpo.innerHTML = html;
    modal.setAttribute('data-abierto', 'true');
    bloquearScroll();
    modalCerrar.focus();
  }

  function cerrarModal() {
    if (!modal || modal.getAttribute('data-abierto') !== 'true') return;
    modal.setAttribute('data-abierto', 'false');
    modalCuerpo.innerHTML = '';
    liberarScroll();
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  /* Utilidades compartidas ----------------------------------------------- */
  function escapar(txt) {
    return String(txt)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function sinAcentos(txt) {
    return String(txt).toLowerCase()
      .replace(/[áàäâã]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
      .replace(/[óòöôõ]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
      .replace(/ç/g, 'c');
  }

  // Campos opcionales de cada ficha, en el orden en que se muestran.
  // 'Cedido por' se omite a propósito: son nombres de vecinos (dato personal).
  var CAMPOS = [
    ['a', 'Autor o autora'], ['il', 'Ilustración'], ['ed', 'Editorial'],
    ['c', 'Colección'], ['s', 'Sección'], ['ca', 'Categoría del inventario'],
    ['ap', 'Recomendado a partir de'], ['cu', 'Curso'], ['y', 'Año'],
    ['p', 'Premios']
  ];

  function fichaHTML(libro) {
    var filas = '';
    CAMPOS.forEach(function (campo) {
      var valor = libro[campo[0]];
      if (!valor) return;                     // si falta el dato, se omite
      filas += '<dt>' + campo[1] + '</dt><dd>' + escapar(valor) + '</dd>';
    });
    var etiquetas = libro.g.map(function (t, i) {
      return '<span class="etiqueta' + (i === 0 ? ' etiqueta--publico' : '') + '">' +
        escapar(t) + '</span>';
    }).join(' ');

    return '<p class="antetitulo" style="margin-bottom:.2rem">' + escapar(libro.g[0]) + '</p>' +
      '<h2 id="modal-titulo" style="font-size:1.5rem;margin-bottom:.3rem">' +
      escapar(libro.t) + '</h2>' +
      '<p style="color:var(--texto-suave)">' + escapar(libro.d) + '</p>' +
      '<div class="libro__etiquetas" style="margin-bottom:1rem">' + etiquetas + '</div>' +
      (filas ? '<dl class="datos-lista">' + filas + '</dl>' : '') +
      '<p style="margin:1.4rem 0 0;font-size:.88rem;color:var(--texto-suave)">' +
      'Para reservarlo, pásate por la biblioteca o escríbenos.</p>';
  }

  /* 5. Estantería interactiva (portada) ---------------------------------- */
  // lomos con los colores originales de libros reales (variados, cálidos)
  var TONOS = ['#a24a26', '#7d3719', '#4e6b4a', '#8a6a3d', '#6b4b3e',
               '#3f5b63', '#96522f', '#5a6b3a'];

  function iniciarEstanteria() {
    var caja = document.querySelector('[data-estanteria]');
    if (!caja) return;
    var libros = window.DESTACADOS || window.LIBROS;
    var lomos = caja.querySelector('[data-lomos]');
    var panel = caja.querySelector('[data-recomendacion]');
    if (!lomos || !panel) return;

    if (!libros || !libros.length) {
      panel.innerHTML = '<p>No hemos podido cargar las recomendaciones. ' +
        '<a href="catalogo.html">Consulta el catálogo completo</a>.</p>';
      return;
    }

    var TOTAL = 16;
    var indices = [];
    // Estantería con foto: cada libro es un recorte de la imagen con la forma
    // del libro entero (lomo + el costado que asoma por detrás), en píxeles
    // sobre img/estanteria.webp (1792 × 592, base de la balda en y = 483).
    var foto = caja.classList.contains('estanteria--foto');
    var FW = 1792, FH = 592, B = 483;
    function rect(x0, x1, y) { return [[x0, y], [x1, y], [x1, B], [x0, B]]; }
    var RECORTES = [
      rect(85, 187, 228),
      [[187, 70], [282, 72], [336, 93], [336, 107], [290, 107], [290, B], [187, B]],
      [[290, 107], [385, 107], [422, 122], [422, 145], [390, 145], [390, B], [290, B]],
      [[390, 145], [487, 145], [518, 158], [518, 183], [493, 183], [493, B], [390, B]],
      [[493, 183], [592, 183], [615, 193], [615, 223], [597, 223], [597, B], [493, B]],
      rect(597, 695, 223), rect(695, 800, 65), rect(803, 900, 102),
      rect(905, 1007, 140), rect(1012, 1117, 180), rect(1120, 1215, 220),
      [[1183, 80], [1218, 57], [1316, 57], [1316, B], [1218, B], [1218, 220], [1183, 220]],
      rect(1318, 1416, 98), rect(1422, 1524, 138), rect(1527, 1630, 175),
      [[1580, 167], [1633, 153], [1728, 153], [1728, B], [1633, B], [1633, 175], [1580, 175]]
    ];
    // Color medio del costado de los libros que lo enseñan (por hueco)
    var COSTADOS = { 1: '#6a5a52', 2: '#545850', 3: '#765f50', 4: '#54443b', 11: '#a07e65', 15: '#676852' };
    var SOMBRAS = {
      1: ['#827171', '#7b716f', '#786e6c', '#746662'], 2: ['#60615b', '#575b54', '#595b54', '#52524a'],
      3: ['#7b6155', '#776152', '#766050', '#715949'], 4: ['#5a483f', '#56473f', '#57463f', '#6d605c'],
      11: ['#9b7f69', '#9d7e67', '#a68368', '#bd8c60'], 15: ['#61614f', '#61634f', '#696d57', '#788869']
    };
    // Borde superior del costado [x, y] → [x, y] y dónde lo tapa el vecino
    var CANTOS = {
      1: [[282, 72], [336, 93], 107], 2: [[385, 107], [422, 122], 145],
      3: [[487, 145], [518, 158], 183], 4: [[592, 183], [615, 193], 223],
      11: [[1183, 80], [1218, 57], 220], 15: [[1580, 167], [1633, 153], 175]
    };
    // Cuerpo del libro: al levantarse, el costado se pinta completo en una
    // capa por detrás de los libros vecinos que sube a la vez que el libro
    // (misma transición), así lateral y frente suben juntos.
    function ponerCuerpo(i) {
      var c = CANTOS[i]; if (!c) return;
      var ys = RECORTES[i].map(function (p) { return p[1]; });
      var hb = Math.max.apply(null, ys) - Math.min.apply(null, ys);
      var dmax = hb * 0.12;
      var poli = [c[0], c[1], [c[1][0], c[2] + dmax + 2], [c[0][0], c[2] + dmax + 2]];
      var el = document.createElement('span');
      el.className = 'lomo-cuerpo';
      el.setAttribute('aria-hidden', 'true');
      colocar(el, poli, false);
      var hc = c[2] + dmax + 2 - Math.min(c[0][1], c[1][1]);
      el.style.setProperty('--sube', (-hb * 0.07 / hc * 100) + '%');
      el.style.setProperty('--sube-mas', (-hb * 0.12 / hc * 100) + '%');
      el.style.backgroundImage = 'linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, .2)), ' +
        'linear-gradient(to right, ' + SOMBRAS[i].join(', ') + ')';
      el.style.backgroundSize = '100% 100%, 100% 100%';
      el.style.backgroundPosition = '0 0, 0 0';
      lomos.appendChild(el);
    }
    // Caja que envuelve el recorte, fondo alineado con la foto y silueta
    function colocar(el, pts, conFondo) {
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var w = x1 - x0, h = y1 - y0;
      el.style.left = (x0 / FW * 100) + '%';
      el.style.top = (y0 / FH * 100) + '%';
      el.style.width = (w / FW * 100) + '%';
      el.style.height = (h / FH * 100) + '%';
      // la silueta y la foto van en una capa interior para que la sombra
      // (filter del botón) no quede recortada por el clip-path
      var capa = conFondo ? el.appendChild(document.createElement('span')) : el;
      if (conFondo) capa.className = 'lomo__foto';
      capa.style.clipPath = 'polygon(' + pts.map(function (p) {
        return ((p[0] - x0) / w * 100).toFixed(2) + '% ' + ((p[1] - y0) / h * 100).toFixed(2) + '%';
      }).join(', ') + ')';
      if (conFondo) {
        capa.style.backgroundSize = (FW / w * 100) + '% ' + (FH / h * 100) + '%';
        capa.style.backgroundPosition = (x0 / (FW - w) * 100) + '% ' + (y0 / (FH - h) * 100) + '%';
      } else {
        // El hueco es oscuro donde estaba el lomo (entre los libros); donde
        // asomaba el costado se pinta del color del costado, para que al
        // levantarse parezca que este sigue por detrás del libro vecino.
        var abajo = pts.filter(function (p) { return p[1] === B; }).map(function (p) { return p[0]; });
        var l0 = Math.min.apply(null, abajo), l1 = Math.max.apply(null, abajo);
        var hw = (l1 - l0) / w * 100, hl = (l0 - x0) / w * 100;
        el.style.backgroundPosition = (hw >= 100 ? 0 : hl / (100 - hw) * 100) + '% 0';
        el.style.backgroundSize = hw + '% 100%';
      }
    }
    for (var i = 0; i < TOTAL; i++) {
      indices.push(Math.floor(Math.random() * libros.length));
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lomo';
      b.style.setProperty('--alto', (52 + ((i * 37) % 46)) + '%');
      b.style.setProperty('--tono', TONOS[i % TONOS.length]);
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', 'Sacar un libro de la estantería, hueco ' + (i + 1));
      b.dataset.hueco = String(i);
      if (foto) {
        colocar(b, RECORTES[i], true);
      }
      lomos.appendChild(b);
      if (foto) {
        // hueco oscuro que queda en la balda cuando el libro se levanta
        var hueco = document.createElement('span');
        hueco.className = 'lomo-hueco';
        hueco.setAttribute('aria-hidden', 'true');
        colocar(hueco, RECORTES[i], false);
        if (COSTADOS[i]) hueco.style.backgroundColor = COSTADOS[i];
        lomos.appendChild(hueco);
        ponerCuerpo(i);
      }
    }

    function mostrar(hueco) {
      var libro = libros[indices[hueco]];
      Array.prototype.forEach.call(lomos.querySelectorAll('.lomo'), function (el) {
        el.setAttribute('aria-pressed', el.dataset.hueco === String(hueco) ? 'true' : 'false');
      });
      var etiquetas = libro.g.map(function (t, i) {
        return '<span class="etiqueta' + (i === 0 ? ' etiqueta--publico' : '') + '">' +
          escapar(t) + '</span>';
      }).join(' ');
      panel.innerHTML =
        iconoLibro(libro, 'recomendacion__emoji') +
        '<div>' +
        '<p class="recomendacion__titulo">' + escapar(libro.t) + '</p>' +
        (libro.a ? '<p class="recomendacion__autor">' + escapar(libro.a) + '</p>' : '') +
        '<p class="recomendacion__desc">' + escapar(libro.d) + '</p>' +
        '<div class="recomendacion__etiquetas">' + etiquetas + '</div>' +
        '</div>';
    }

    lomos.addEventListener('click', function (e) {
      var lomo = e.target.closest('.lomo');
      if (lomo) mostrar(Number(lomo.dataset.hueco));
    });

    var otro = caja.querySelector('[data-otro-libro]');
    if (otro) {
      otro.addEventListener('click', function () {
        var hueco = Math.floor(Math.random() * TOTAL);
        indices[hueco] = Math.floor(Math.random() * libros.length);
        mostrar(hueco);
      });
    }

    mostrar(Math.floor(Math.random() * TOTAL));
  }

  /* 6. Catálogo ---------------------------------------------------------- */
  var POR_TANDA = 60;

  function iniciarCatalogo() {
    var raiz = document.querySelector('[data-catalogo]');
    if (!raiz) return;

    var libros = window.LIBROS || [];
    var lista = raiz.querySelector('[data-lista]');
    var info = raiz.querySelector('[data-info]');
    var entrada = raiz.querySelector('[data-busqueda]');
    var limpiar = raiz.querySelector('[data-limpiar]');
    var cajaPublico = raiz.querySelector('[data-filtros-publico]');
    var cajaTemas = raiz.querySelector('[data-filtros-temas]');
    var verMas = raiz.querySelector('[data-ver-mas]');
    var avisoJS = raiz.querySelector('[data-aviso-js]');
    var panelFiltros = raiz.querySelector('[data-filtros]');
    var togglear = raiz.querySelector('[data-filtros-toggle]');
    var estadoFiltros = raiz.querySelector('[data-filtros-estado]');

    if (avisoJS) avisoJS.remove();

    if (!libros.length) {
      info.innerHTML = '<p>No se ha podido cargar el catálogo. Vuelve a intentarlo o ' +
        '<a href="contacto.html">escríbenos</a>.</p>';
      return;
    }

    // índice de búsqueda: título + autor + editorial + colección, sin acentos
    libros.forEach(function (b) {
      b._i = sinAcentos([b.t, b.a || '', b.ed || '', b.c || '', b.g.join(' ')].join(' '));
    });

    var PUBLICOS = ['Infantil', 'Juvenil', 'Adultos'];
    var cuentas = {};
    libros.forEach(function (b) {
      b.g.forEach(function (t) { cuentas[t] = (cuentas[t] || 0) + 1; });
    });
    var temas = Object.keys(cuentas)
      .filter(function (t) { return PUBLICOS.indexOf(t) === -1; })
      .sort(function (a, b) { return cuentas[b] - cuentas[a] || a.localeCompare(b, 'es'); });

    var seleccion = { publico: '', temas: [] };
    var mostrados = POR_TANDA;
    var filtrados = libros;

    function chip(texto, cuenta, tipo) {
      return '<button type="button" class="chip" aria-pressed="false" ' +
        'data-tipo="' + tipo + '" data-valor="' + escapar(texto) + '">' +
        escapar(texto) + ' <span class="chip__cuenta">' + cuenta + '</span></button>';
    }

    cajaPublico.innerHTML = PUBLICOS.filter(function (p) { return cuentas[p]; })
      .map(function (p) { return chip(p, cuentas[p], 'publico'); }).join('');
    cajaTemas.innerHTML = temas
      .map(function (t) { return chip(t, cuentas[t], 'tema'); }).join('');

    function coincide(libro, palabras) {
      for (var i = 0; i < palabras.length; i++) {
        if (libro._i.indexOf(palabras[i]) === -1) return false;
      }
      if (seleccion.publico && libro.g[0] !== seleccion.publico) return false;
      for (var j = 0; j < seleccion.temas.length; j++) {
        if (libro.g.indexOf(seleccion.temas[j]) === -1) return false;
      }
      return true;
    }

    function tarjeta(libro) {
      var etiquetas = libro.g.map(function (t, i) {
        return '<span class="etiqueta' + (i === 0 ? ' etiqueta--publico' : '') + '">' +
          escapar(t) + '</span>';
      }).join(' ');
      return '<li><button type="button" class="libro" data-id="' + libro._n + '">' +
        iconoLibro(libro, 'libro__emoji') +
        '<h3 class="libro__titulo">' + escapar(libro.t) + '</h3>' +
        (libro.a ? '<p class="libro__autor">' + escapar(libro.a) + '</p>' : '') +
        '<p class="libro__desc">' + escapar(libro.d) + '</p>' +
        '<span class="libro__etiquetas">' + etiquetas + '</span>' +
        '</button></li>';
    }

    libros.forEach(function (b, i) { b._n = i; });

    function pintar() {
      var texto = sinAcentos(entrada.value.trim());
      var palabras = texto ? texto.split(/\s+/) : [];
      filtrados = libros.filter(function (b) { return coincide(b, palabras); });
      limpiar.hidden = !entrada.value;

      if (!filtrados.length) {
        lista.innerHTML = '';
        info.innerHTML = '<span>Ningún libro coincide con la búsqueda.</span>';
        verMas.hidden = true;
        raiz.querySelector('[data-vacio]').hidden = false;
        return;
      }
      raiz.querySelector('[data-vacio]').hidden = true;

      var trozo = filtrados.slice(0, mostrados);
      lista.innerHTML = trozo.map(tarjeta).join('');
      info.innerHTML = '<span>Mostrando <strong>' + trozo.length + '</strong> de <strong>' +
        filtrados.length + '</strong> libros' +
        (filtrados.length !== libros.length ? ' (de ' + libros.length + ' en total)' : '') +
        '</span>';
      verMas.hidden = trozo.length >= filtrados.length;
    }

    /* Resume los filtros activos en el botón, para que al plegar el panel
       se siga viendo qué hay aplicado. */
    function resumirFiltros() {
      if (!estadoFiltros) return;
      var activos = [];
      if (seleccion.publico) activos.push(seleccion.publico);
      activos = activos.concat(seleccion.temas);
      estadoFiltros.textContent = activos.length
        ? (activos.length === 1 ? activos[0] : activos.length + ' activos')
        : 'Todas';
      if (togglear) togglear.setAttribute('data-activos', String(activos.length));
    }

    if (togglear && panelFiltros) {
      // Plegado de partida en todos los tamaños: la franja fija queda en una
      // sola línea y las etiquetas aparecen solo al pulsar el botón.
      var filtrosAbiertos = false;
      var pintarPanel = function () {
        panelFiltros.setAttribute('data-abierto', filtrosAbiertos ? 'true' : 'false');
        togglear.setAttribute('aria-expanded', filtrosAbiertos ? 'true' : 'false');
      };
      togglear.addEventListener('click', function () {
        filtrosAbiertos = !filtrosAbiertos;
        pintarPanel();
      });
      pintarPanel();
    }

    function reiniciar() { mostrados = POR_TANDA; resumirFiltros(); pintar(); }

    entrada.addEventListener('input', reiniciar);
    limpiar.addEventListener('click', function () {
      entrada.value = '';
      entrada.focus();
      reiniciar();
    });

    raiz.addEventListener('click', function (e) {
      var c = e.target.closest('.chip');
      if (c) {
        var valor = c.dataset.valor;
        if (c.dataset.tipo === 'publico') {
          seleccion.publico = seleccion.publico === valor ? '' : valor;
          Array.prototype.forEach.call(cajaPublico.children, function (el) {
            el.setAttribute('aria-pressed', el.dataset.valor === seleccion.publico ? 'true' : 'false');
          });
        } else {
          var pos = seleccion.temas.indexOf(valor);
          if (pos === -1) seleccion.temas.push(valor); else seleccion.temas.splice(pos, 1);
          c.setAttribute('aria-pressed', pos === -1 ? 'true' : 'false');
        }
        reiniciar();
        return;
      }
      var tarjetaBoton = e.target.closest('.libro');
      if (tarjetaBoton) abrirModal(fichaHTML(libros[Number(tarjetaBoton.dataset.id)]));
    });

    verMas.addEventListener('click', function () {
      mostrados += POR_TANDA;
      pintar();
      // deja el foco en el primer resultado nuevo para no perder el sitio
      var nuevas = lista.querySelectorAll('.libro');
      var destino = nuevas[mostrados - POR_TANDA];
      if (destino) destino.focus();
    });

    // permite llegar desde otra página con /catalogo.html?q=texto
    var q = new URLSearchParams(window.location.search).get('q');
    if (q) entrada.value = q;

    pintar();
  }

  /* Intro de bienvenida ----------------------------------------------------
     Sale una vez cada vez que se abre el navegador, sin cookies. Lo decide
     el script del <head> de cada página con dos anotaciones:
     - sessionStorage 'elnido-intro': la pestaña ya la vio (sobrevive a
       recargas y cambios de página; el navegador la borra al cerrarse);
     - localStorage 'elnido-activa': hora del último «latido» de cualquier
       pestaña abierta de la web. Si hay otra pestaña viva (latido de hace
       menos de 90 s), una pestaña nueva tampoco la repite.
     Las pestañas abiertas renuevan el latido con latirIntro(). */
  function latirIntro() {
    function latido() {
      try { localStorage.setItem('elnido-activa', String(Date.now())); } catch (e) { /* sin almacenamiento */ }
    }
    setInterval(latido, 20000);
    window.addEventListener('pagehide', latido);
    document.addEventListener('visibilitychange', latido);
  }
  var PAJARO_SVG =
    '<svg viewBox="0 0 64 52" aria-hidden="true" focusable="false">' +
      '<path class="pajaro__ala-lejos" d="M22 27 Q30 15 40 24 Q32 29 22 27Z" fill="#46502a"/>' +
      '<path d="M14 30 L1 24 L4 31 L2 37 Z" fill="#4e3a30"/>' +
      '<ellipse cx="28" cy="32" rx="17" ry="12" fill="#7a5540"/>' +
      '<ellipse cx="33" cy="37" rx="11" ry="6.5" fill="#efdfc2"/>' +
      '<path d="M30 35 Q36 30 42 33 Q37 40 30 35Z" fill="#8d63c4" opacity=".85"/>' +
      '<g class="pajaro__cabeza">' +
        '<circle cx="44" cy="22" r="9" fill="#7a5540"/>' +
        '<circle cx="47" cy="20" r="1.9" fill="#1d1a16"/>' +
        '<circle cx="47.6" cy="19.4" r=".6" fill="#fff"/>' +
        '<path d="M52 20.5 L60 23.5 L52 26 Z" fill="#e0a030"/>' +
      '</g>' +
      '<path class="pajaro__ala" d="M16 29 Q28 18 40 27 Q31 39 16 33Z" fill="#6b7a3a"/>' +
      '<g class="pajaro__patas" stroke="#b07a3a" stroke-width="1.6" stroke-linecap="round">' +
        '<path d="M26 43 L25 50 M23 50 L28 50"/><path d="M33 43 L34 50 M32 50 L37 50"/>' +
      '</g>' +
    '</svg>';

  function iniciarIntro() {
    var html = document.documentElement;
    if (!html.classList.contains('con-intro')) return;

    var intro = document.createElement('div');
    intro.className = 'intro';
    intro.innerHTML =
      '<div class="intro__escena" aria-hidden="true"><div class="intro__mover"><div class="intro__libro">' +
        '<div class="intro__paginas">' +
          '<p class="intro__paginas-titulo">Bienvenida<br>al nido</p>' +
          '<span class="intro__paginas-adorno"></span>' +
          '<p class="intro__paginas-texto">Pasa, coge un libro<br>y quédate a leer.</p>' +
        '</div>' +
        '<div class="intro__tapa">' +
          '<div class="intro__tapa-frente">' +
            '<img class="intro__nido" src="icon-512.png" alt="" width="512" height="512">' +
            '<p class="intro__titulo"><strong>El Nido</strong><span>Biblioteca vecinal</span></p>' +
          '</div>' +
          '<div class="intro__tapa-dorso"></div>' +
        '</div>' +
        '<div class="intro__pajaro">' + PAJARO_SVG + '</div>' +
      '</div></div></div>' +
      '<button class="intro__saltar" type="button">Saltar animación</button>';
    document.body.insertBefore(intro, document.body.firstChild);
    html.classList.add('intro-montada');

    var relojes = [];
    var terminado = false;
    var vuelo = null;        // animación del libro hacia su sitio
    var destino = null;      // lomo de la estantería o logo de la cabecera
    var desplazado = false;  // si hubo que bajar para ver la estantería
    function fase(nombre) { intro.setAttribute('data-fase', nombre); }
    function despues(ms, fn) { relojes.push(setTimeout(fn, ms)); }

    // Dónde se guarda el libro: un lomo de la estantería de la portada o,
    // en las demás páginas, el nido del logo de la cabecera.
    function elegirDestino() {
      var lomos = document.querySelectorAll('[data-lomos] .lomo');
      if (lomos.length) {
        intro.setAttribute('data-destino', 'lomo');
        return lomos[Math.floor(lomos.length / 2)];
      }
      intro.setAttribute('data-destino', 'logo');
      return document.querySelector('.marca__icono');
    }

    // El libro se cierra; mientras, con el fondo aún opaco, se prepara el
    // hueco en la estantería y se baja hasta ella si no se ve.
    function cerrar() {
      fase('cierra');
      destino = elegirDestino();
      if (!destino) return;
      if (destino.classList.contains('lomo')) {
        destino.style.setProperty('--tono', '#6a45a0');
        destino.style.visibility = 'hidden';
        var r = destino.getBoundingClientRect();
        if (r.top < 80 || r.bottom > window.innerHeight - 20) {
          irA(window.pageYOffset + r.top - (window.innerHeight - r.height) / 2);
          desplazado = true;
        }
      }
    }

    // Vuela hasta el destino encogiéndose; en la estantería acaba con la
    // forma exacta del lomo.
    function guardar() {
      if (!destino || !intro.animate) { fase('sale'); despues(350, terminar); return; }
      fase('guarda');
      var libro = intro.querySelector('.intro__mover');
      var a = libro.getBoundingClientRect();
      var b = destino.getBoundingClientRect();
      var sx, sy, x, y;
      if (destino.classList.contains('lomo')) {
        sx = b.width / a.width; sy = b.height / a.height; x = b.left; y = b.top;
      } else {
        sx = sy = (b.width * 0.85) / a.width;
        x = b.left + (b.width - a.width * sx) / 2;
        y = b.top + (b.height - a.height * sy) / 2;
      }
      var dx = x - a.left, dy = y - a.top;
      libro.style.transformOrigin = '0 0';
      vuelo = libro.animate([
        { transform: 'none' },
        { transform: 'translate(' + dx * 0.4 + 'px,' + (dy * 0.4 - 60) + 'px) scale(' +
            (0.35 + sx * 0.65) + ',' + (0.55 + sy * 0.45) + ') rotate(-4deg)', offset: 0.5 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }
      ], { duration: 1150, easing: 'cubic-bezier(.45, 0, .25, 1)', fill: 'forwards' });
      vuelo.onfinish = function () {
        // El lomo real ocupa ya su sitio: el libro volador desaparece al
        // instante para que no asome nada deformado durante el fundido final.
        libro.style.visibility = 'hidden';
        destino.style.visibility = '';
        destino.classList.add('lomo--llega');
        destino.addEventListener('animationend', function () {
          destino.classList.remove('lomo--llega');
        }, { once: true });
        fase('sale');
        despues(320, terminar);
        if (desplazado) {
          setTimeout(function () {
            if (window.lenis) window.lenis.scrollTo(0, { duration: 1.2 });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 1400);
        }
      };
    }

    function terminar() {
      if (terminado) return;
      terminado = true;
      relojes.forEach(clearTimeout);
      document.removeEventListener('keydown', alTeclear);
      if (intro.parentNode) intro.parentNode.removeChild(intro);
      html.classList.remove('con-intro', 'intro-montada');
    }
    function saltar() {
      relojes.forEach(clearTimeout);
      relojes = [];
      if (vuelo) { vuelo.onfinish = null; vuelo.cancel(); }
      if (destino) destino.style.visibility = '';
      if (desplazado) irA(0);
      intro.classList.add('intro--rapida');
      fase('sale');
      despues(400, terminar);
    }
    function alTeclear(e) { if (e.key === 'Escape') saltar(); }

    intro.querySelector('.intro__saltar').addEventListener('click', saltar);
    document.addEventListener('keydown', alTeclear);

    // Guion: libro (0 s) → vuelo del pájaro (0,7) → se posa (3) → se abre (4,1)
    //        → se cierra (5,9) → vuela a la estantería (7,05) → web (~8,5 s)
    requestAnimationFrame(function () { fase('entra'); });
    despues(700, function () { fase('vuela'); });
    despues(3000, function () { fase('posado'); });
    despues(4100, function () { fase('abre'); });
    despues(5900, cerrar);
    despues(7050, guardar);
  }

  /* Arranque -------------------------------------------------------------- */
  function iniciar() {
    iniciarScrollSuave();
    iniciarIntro();
    latirIntro();
    medirCabecera();
    iniciarMenu();
    iniciarAcordeon();
    iniciarEstanteria();
    iniciarCatalogo();
    var anio = document.querySelector('[data-anio]');
    if (anio) anio.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
