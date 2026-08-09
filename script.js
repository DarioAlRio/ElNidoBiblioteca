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
    document.body.style.top = -scrollGuardado + 'px';
    document.body.classList.add('scroll-bloqueado');
  }

  function liberarScroll() {
    if (bloqueos === 0 || --bloqueos > 0) return;
    document.body.classList.remove('scroll-bloqueado');
    document.body.style.top = '';
    window.scrollTo(0, scrollGuardado);
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
      '<span aria-hidden="true">' + libro.e + '</span> ' + escapar(libro.t) + '</h2>' +
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
      lomos.appendChild(b);
    }

    function mostrar(hueco) {
      var libro = libros[indices[hueco]];
      Array.prototype.forEach.call(lomos.children, function (el) {
        el.setAttribute('aria-pressed', el.dataset.hueco === String(hueco) ? 'true' : 'false');
      });
      var etiquetas = libro.g.map(function (t, i) {
        return '<span class="etiqueta' + (i === 0 ? ' etiqueta--publico' : '') + '">' +
          escapar(t) + '</span>';
      }).join(' ');
      panel.innerHTML =
        '<div class="recomendacion__emoji" aria-hidden="true">' + libro.e + '</div>' +
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
        '<span class="libro__emoji" aria-hidden="true">' + libro.e + '</span>' +
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
    }

    if (togglear && panelFiltros) {
      // Desplegado de partida en escritorio; plegado en móvil, donde 33 chips
      // taparían la lista. A partir de ahí manda el usuario: el redimensionado
      // ya no vuelve a tocarlo.
      var filtrosAbiertos = window.innerWidth > 860;
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

  /* Arranque -------------------------------------------------------------- */
  function iniciar() {
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
