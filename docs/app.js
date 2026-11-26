/*
 * Hospital Flow · demo estática (DataMad 2026, Black Bulls)
 * Creador: Flavio Durán (con ayuda de Claude) · Día: 20/11/2026
 *
 * Problemas vistos:
 *  - No hay datos reales de esperas de urgencias ni de ocupación: se marcan como SIMULADOS.
 *  - No hay datos por especialidad: la lista de espera es la del hospital en general.
 *  - Las coordenadas de los hospitales son aproximadas (±1 km).
 *
 * Seguridad:
 *  - Sin claves de API, sin backend y sin llamadas de red desde la página.
 *  - Nunca se usa innerHTML con texto del usuario: todo se escribe con textContent.
 *  - Lo único que se guarda es contactos, y solo en este navegador (localStorage).
 *  - La ubicación se pide solo si el usuario pulsa el botón y no se envía a ningún sitio.
 *  - El triaje por reglas va antes que todo: si hay señales de gravedad, se muestra el 112.
 */
(function () {
  'use strict';

  var DATOS = window.HF_DATOS || { hospitales: [], taxis: [] };
  var MAX_TEXTO = 500;
  var MAX_CONTACTOS = 5;
  var MAX_NOMBRE = 40;
  var CLAVE_CONTACTOS = 'hospital-flow-demo.contactos';
  var CIRCUNFERENCIA = 503; // 2 · π · 80, radio del anillo en el SVG
  var EJEMPLO = { lat: 40.4168, lon: -3.7038 }; // Puerta del Sol, solo como ejemplo

  // Señales de gravedad: se evalúan antes que nada y siempre llevan al 112.
  var GRAVE = [
    /pecho/,
    /no puedo respirar|cuesta respirar|dificultad para respirar|me ahogo/,
    /desmay/,
    /convulsi/,
    /no puedo hablar|habla raro|cara torcida/,
    /sangra mucho|sangrado abundante|hemorragia/,
    /inconsciente|no responde/
  ];
  // Niños: solo para filtrar hospitales. No se guarda nada del texto.
  var NINO = /(^|\s)(hij[oa]s?|niñ[oa]s?|bebé|bebe|crío|peque)(\s|$|[.,!?])/i;
  var PROGRAMADA = /operar|operaci[oó]n|cirug|prueba|resonancia|\btac\b|ecograf|lista de espera|revisi[oó]n|cita/i;
  var ESPECIALIDADES = [
    [/rodilla|cadera|hombro|tobillo|hueso|fractur|espalda|traumat/i, 'Traumatología'],
    [/\bojo|vista|visi[oó]n/i, 'Oftalmología'],
    [/coraz[oó]n|palpitac/i, 'Cardiología'],
    [/niñ|hij|bebé|bebe|crío|peque/i, 'Pediatría']
  ];

  // Estado
  var posicion = { lat: EJEMPLO.lat, lon: EJEMPLO.lon, real: false };
  var seleccion = null; // { grave: true } o { hospital, ... }
  var hojaActiva = null;
  var disparador = null;
  var temporizador = null;

  function $(id) { return document.getElementById(id); }

  // ---------- Triaje por reglas ----------
  function triaje(texto) {
    var t = texto.toLowerCase();
    for (var g = 0; g < GRAVE.length; g++) {
      if (GRAVE[g].test(t)) { return { grave: true }; }
    }
    var especialidad = 'Consulta general';
    for (var i = 0; i < ESPECIALIDADES.length; i++) {
      if (ESPECIALIDADES[i][0].test(t)) { especialidad = ESPECIALIDADES[i][1]; break; }
    }
    return {
      grave: false,
      nino: NINO.test(t),
      programada: PROGRAMADA.test(t),
      especialidad: especialidad
    };
  }

  // ---------- Distancia (Haversine) ----------
  function km(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var h = Math.pow(Math.sin(dLat / 2), 2) +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.pow(Math.sin(dLon / 2), 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // Espera de urgencias: NO hay datos reales. Valor fijo por hospital, solo para la demo.
  function esperaSimulada(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) % 100000; }
    return 25 + (h % 110);
  }

  // ---------- Ranking ----------
  function ranking(tri, origen) {
    var lista = DATOS.hospitales.filter(function (h) {
      return tri.nino ? h.solo_ninos : !h.solo_ninos; // hospital infantil solo para niños
    });
    if (tri.nino && lista.length === 0) { lista = DATOS.hospitales.slice(); }

    return lista.map(function (h) {
      var d = km(origen, h);
      var viaje = Math.round(d * 3 + 4); // estimación: ~20 km/h más 4 min de margen
      var r = { hospital: h, km: d, viaje: viaje };
      if (tri.programada) {
        r.dias = h.quirurgica ? h.quirurgica.demora_dias : null;
        r.score = (r.dias === null ? 999 : r.dias) + d * 1.5;
      } else {
        r.espera = esperaSimulada(h.id);
        r.score = r.espera + viaje;
      }
      return r;
    }).sort(function (a, b) { return a.score - b.score; });
  }

  // Número con formato español (coma decimal, máximo un decimal).
  function num(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }

  // ---------- Pantallas ----------
  var PANTALLAS = ['pantalla-inicio', 'pantalla-cargando', 'pantalla-resultado', 'pantalla-grave'];

  function mostrar(id, enfocar) {
    PANTALLAS.forEach(function (p) { $(p).hidden = (p !== id); });
    if (enfocar === false) { return; }
    var titulo = $(id).querySelector('h1');
    if (titulo) { titulo.focus({ preventScroll: true }); }
  }

  function pintarResultado(tri, lista) {
    var top = lista[0];
    var alt = lista[1];
    var h = top.hospital;
    var total, unidad, progreso, porque, espera, esperaTxt, nota;

    if (tri.programada) {
      var dias = top.dias;
      total = dias === null ? '—' : String(Math.round(dias));
      unidad = 'días de demora media';
      progreso = dias === null ? 0 : Math.min(dias, 365) / 365;
      porque = dias === null
        ? 'No tenemos dato de lista de espera para este hospital.'
        : 'Mejor combinación de demora media (' + num(dias) + ' días, dato de ' + h.quirurgica.anio + ') y distancia.';
      if (alt && alt.dias !== null) {
        porque += ' La siguiente opción, ' + alt.hospital.nombre + ', tiene ' + num(alt.dias) + ' días.';
      }
      espera = dias === null ? '—' : String(Math.round(dias));
      esperaTxt = 'días de demora';
      nota = 'Demora real de la Comunidad de Madrid, por hospital (no por especialidad). Distancia con coordenadas aproximadas.';
    } else {
      var minutos = top.espera + top.viaje;
      total = String(minutos);
      unidad = 'min en total';
      progreso = Math.min(minutos, 180) / 180;
      porque = 'Espera estimada de ' + top.espera + ' min más ' + top.viaje + ' min de viaje.';
      espera = top.espera + ' min';
      esperaTxt = 'espera (simulada)';
      nota = 'Espera de urgencias SIMULADA: la base de datos no tiene esperas reales. El viaje es una estimación en línea recta.';
    }
    if (tri.nino) {
      nota = 'Con niños, confirma antes de ir: los datos no indican qué servicios tiene cada hospital. ' + nota;
    }

    $('res-etiqueta').textContent = (tri.programada ? 'Programada · ' : 'Que te vean hoy · ') + tri.especialidad;
    $('anillo').setAttribute('stroke-dashoffset', String(Math.round(CIRCUNFERENCIA * (1 - progreso))));
    $('res-total').textContent = total;
    $('res-unidad').textContent = unidad;
    $('res-nombre').textContent = h.nombre;
    $('res-municipio').textContent = h.municipio;
    $('m-viaje').textContent = top.viaje + ' min';
    $('m-espera').textContent = espera;
    $('m-espera-txt').textContent = esperaTxt;
    $('res-porque').textContent = porque;
    $('res-maps').href = 'https://www.google.com/maps/dir/?api=1&destination=' + h.lat + ',' + h.lon;
    $('res-nota').textContent = nota;
  }

  function buscar() {
    var texto = ($('texto').value || '').trim().slice(0, MAX_TEXTO);
    if (texto.length < 3) {
      $('aviso-corto').hidden = false;
      $('texto').focus();
      return;
    }
    $('aviso-corto').hidden = true;
    var tri = triaje(texto);

    if (tri.grave) {
      seleccion = { grave: true };
      mostrar('pantalla-grave');
      return;
    }

    if (!DATOS.hospitales.length) {
      $('aviso-corto').textContent = 'No hay datos de hospitales cargados. Si es una emergencia, llama al 112.';
      $('aviso-corto').hidden = false;
      return;
    }

    mostrar('pantalla-cargando', false);
    clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      var lista = ranking(tri, posicion);
      seleccion = { grave: false, hospital: lista[0].hospital, lista: lista };
      pintarResultado(tri, lista);
      mostrar('pantalla-resultado');
    }, 900);
  }

  function volverInicio() {
    clearTimeout(temporizador);
    seleccion = null;
    mostrar('pantalla-inicio');
    $('texto').focus();
  }

  // ---------- Ubicación (solo si el usuario la pide) ----------
  function pintarUbicacion(texto) { $('ubicacion-txt').textContent = texto; }

  $('btn-ubicacion').addEventListener('click', function () {
    if (!navigator.geolocation) {
      pintarUbicacion('Este navegador no permite usar la ubicación.');
      return;
    }
    pintarUbicacion('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(function (p) {
      posicion = { lat: p.coords.latitude, lon: p.coords.longitude, real: true };
      pintarUbicacion('Tu ubicación, solo en este móvil');
    }, function () {
      pintarUbicacion('No hemos podido obtenerla. Usamos Puerta del Sol como ejemplo.');
    }, { timeout: 8000, maximumAge: 60000 });
  });

  // ---------- Contactos (localStorage, validados al leer y al guardar) ----------
  function telefonoValido(texto) {
    var limpio = String(texto || '').replace(/[\s.\-]/g, '');
    return /^\+?\d{6,15}$/.test(limpio) ? limpio : null;
  }

  function leerContactos() {
    try {
      var v = JSON.parse(window.localStorage.getItem(CLAVE_CONTACTOS) || '[]');
      if (!Array.isArray(v)) { return []; }
      return v.map(function (c) {
        var tel = c ? telefonoValido(c.telefono) : null;
        return tel ? { nombre: String(c.nombre || '').slice(0, MAX_NOMBRE), telefono: tel } : null;
      }).filter(Boolean).slice(0, MAX_CONTACTOS);
    } catch (e) {
      return [];
    }
  }

  function guardarContactos(lista) {
    try {
      window.localStorage.setItem(CLAVE_CONTACTOS, JSON.stringify(lista));
      return true;
    } catch (e) {
      return false;
    }
  }

  function enlace(texto, href, clase, externo) {
    var a = document.createElement('a');
    a.textContent = texto;
    a.href = href;
    a.className = clase;
    if (externo) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }

  function mensajeAviso() {
    if (seleccion && seleccion.grave) { return 'Estoy llamando al 112. Te aviso en cuanto pueda.'; }
    if (seleccion && seleccion.hospital) {
      var h = seleccion.hospital;
      var m = 'Voy al ' + h.nombre + ' (' + h.municipio + ').';
      if (posicion.real) {
        m += ' Mi ubicación: https://www.google.com/maps?q=' + posicion.lat.toFixed(5) + ',' + posicion.lon.toFixed(5);
      }
      return m;
    }
    return 'Te escribo para avisarte. Te llamo en cuanto pueda.';
  }

  function renderContactos() {
    var lista = $('lista-contactos');
    lista.textContent = '';
    var contactos = leerContactos();
    if (!contactos.length) {
      var vacio = document.createElement('p');
      vacio.className = 'vacio';
      vacio.textContent = 'Aún no tienes contactos guardados.';
      lista.appendChild(vacio);
      return;
    }
    var msg = encodeURIComponent(mensajeAviso());
    contactos.forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'contacto';
      var nombre = document.createElement('span');
      nombre.className = 'contacto-nombre';
      nombre.textContent = c.nombre || 'Contacto';
      var fila = document.createElement('div');
      fila.className = 'acciones-fila';
      fila.appendChild(enlace('Llamar', 'tel:' + c.telefono, 'btn-suave btn-azul', false));
      fila.appendChild(enlace('WhatsApp', 'https://wa.me/' + c.telefono.replace('+', '') + '?text=' + msg, 'btn-suave btn-menta', true));
      fila.appendChild(enlace('SMS', 'sms:' + c.telefono + '?body=' + msg, 'btn-suave btn-lila', false));
      li.appendChild(nombre);
      li.appendChild(fila);
      lista.appendChild(li);
    });
  }

  $('form-contacto').addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = ($('contacto-nombre').value || '').trim().slice(0, MAX_NOMBRE);
    var tel = telefonoValido($('contacto-tel').value);
    var error = $('contacto-error');
    if (!nombre || !tel) {
      error.textContent = 'Escribe un nombre y un teléfono válido (solo números, con prefijo si es internacional).';
      error.hidden = false;
      return;
    }
    var lista = leerContactos().filter(function (c) { return c.telefono !== tel; });
    lista.unshift({ nombre: nombre, telefono: tel });
    if (!guardarContactos(lista.slice(0, MAX_CONTACTOS))) {
      error.textContent = 'No se ha podido guardar en este navegador.';
      error.hidden = false;
      return;
    }
    $('contacto-nombre').value = '';
    $('contacto-tel').value = '';
    error.hidden = true;
    renderContactos();
  });

  $('borrar-datos').addEventListener('click', function () {
    try { window.localStorage.removeItem(CLAVE_CONTACTOS); } catch (e) { /* sin acceso: nada que borrar */ }
    renderContactos();
  });

  // ---------- Taxi ----------
  function renderTaxis() {
    var lista = $('lista-taxis');
    lista.textContent = '';
    var h = seleccion && seleccion.hospital;
    $('taxi-dile').textContent = h
      ? 'Dile al taxista: ' + h.nombre + ', ' + h.municipio + '.'
      : 'Busca primero un hospital para indicar el destino.';
    (DATOS.taxis || []).forEach(function (t) {
      var tel = telefonoValido(t.telefono);
      if (!tel) { return; }
      var li = document.createElement('li');
      li.appendChild(enlace(t.nombre + ' · ' + tel + (t.verificado ? '' : ' (sin verificar)'), 'tel:' + tel, 'fila-enlace', false));
      lista.appendChild(li);
    });
    $('taxi-aviso').textContent = 'Los números marcados como «sin verificar» son de ejemplo: confírmalos en el listado oficial antes de llamar.';
  }

  // ---------- Hojas (modales) ----------
  function abrirHoja(id, origen) {
    hojaActiva = $(id);
    disparador = origen || null;
    $('velo').hidden = false;
    hojaActiva.hidden = false;
    hojaActiva.querySelector('h2').focus({ preventScroll: true });
  }

  function cerrarHoja() {
    if (!hojaActiva) { return; }
    hojaActiva.hidden = true;
    $('velo').hidden = true;
    hojaActiva = null;
    if (disparador) { disparador.focus(); }
    disparador = null;
  }

  function abrirAvisar(origen) {
    $('avisar-msg').textContent = mensajeAviso();
    renderContactos();
    abrirHoja('hoja-avisar', origen);
  }

  // ---------- Eventos ----------
  $('form-consulta').addEventListener('submit', function (e) { e.preventDefault(); buscar(); });

  document.querySelectorAll('.chip').forEach(function (b) {
    b.addEventListener('click', function () {
      $('texto').value = b.getAttribute('data-texto') || '';
      $('aviso-corto').hidden = true;
      $('texto').focus();
    });
  });

  document.querySelectorAll('[data-volver]').forEach(function (b) {
    b.addEventListener('click', volverInicio);
  });

  $('abrir-taxi').addEventListener('click', function (e) {
    renderTaxis();
    abrirHoja('hoja-taxi', e.currentTarget);
  });
  $('abrir-avisar').addEventListener('click', function (e) { abrirAvisar(e.currentTarget); });
  $('grave-avisar').addEventListener('click', function (e) { abrirAvisar(e.currentTarget); });
  $('nav-contactos').addEventListener('click', function (e) { abrirAvisar(e.currentTarget); });

  document.querySelectorAll('[data-cerrar]').forEach(function (b) { b.addEventListener('click', cerrarHoja); });
  $('velo').addEventListener('click', cerrarHoja);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { cerrarHoja(); }
  });
})();
