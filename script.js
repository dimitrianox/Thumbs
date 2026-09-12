// --- CONFIGURACIÓN Y VARIABLES GLOBALES ---
const urlParams = new URLSearchParams(window.location.search);
const galeriaActual = urlParams.get('galeria') || 'francia';

const rutaJson = `./${galeriaActual}/fotos.json`;
const rutaCarpeta = `./${galeriaActual}/`;

const tituloPais = document.getElementById('titulo-pais');
const tituloAnio = document.getElementById('titulo-anio');
const contenedorGaleria = document.getElementById('galeria');
const modal = document.querySelector('.modal');
const modalMediaWrapper = document.getElementById('modal-media-wrapper');
const modalImg = document.getElementById('modal-img');
const modalVideo = document.getElementById('modal-video');

const infoUbicacion = document.getElementById('info-ubicacion');
const infoFecha = document.getElementById('info-fecha');
const infoTitulo = document.getElementById('info-titulo');
const infoDescripcion = document.getElementById('info-descripcion');
const descOverlay = document.getElementById('description-overlay');

const clasesTamano = ['', '', 'span-col-2', 'span-row-2', 'span-big'];

// Variables para control de Zoom táctil en Modal
let scale = 1;
let lastScale = 1;
let startDistance = 0;
let posX = 0;
let posY = 0;
let startX = 0;
let startY = 0;
let isDragging = false;

// Variables para detección de pulsación sostenida (Hold)
let pressTimer = null;
let isPressing = false;

// Bloqueo estricto global en fase de captura
function anularAccionNativa(e) {
  if (e.cancelable) e.preventDefault();
  e.stopPropagation();
  return false;
}

['contextmenu', 'selectstart', 'dragstart'].forEach(evento => {
  window.addEventListener(evento, anularAccionNativa, { capture: true, passive: false });
  document.addEventListener(evento, anularAccionNativa, { capture: true, passive: false });
});

function esVideo(url, tipo) {
  if (tipo === 'video') return true;
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
}

function resolverRuta(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return rutaCarpeta + url;
}

function formatearFecha(fechaOriginal) {
  if (!fechaOriginal) return '';
  
  const parteFecha = fechaOriginal.split(' ')[0];
  const partes = parteFecha.split(/[:\/-]/);
  
  if (partes.length === 3) {
    let dia, mes, anio;

    if (partes[0].length === 4) {
      [anio, mes, dia] = partes;
    } else {
      [dia, mes, anio] = partes;
    }

    const fechaObj = new Date(parseInt(anio, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
    
    if (!isNaN(fechaObj.getTime())) {
      return fechaObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }
  
  return fechaOriginal;
}

function mezclarArray(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function resetZoom() {
  scale = 1;
  lastScale = 1;
  posX = 0;
  posY = 0;
  modalImg.style.transform = `translate(0px, 0px) scale(1)`;
}

function cerrarModal() {
  modal.classList.remove('overlay');
  document.body.style.overflow = '';
  modalVideo.pause();
  modalVideo.removeAttribute('src');
  modalVideo.load();
  modalVideo.style.display = 'none';
  modalImg.src = '';
  modalImg.style.display = 'none';
  ocultarOverlayDesc();
  resetZoom();
}

// --- FUNCIONES Y EVENTOS DE DESCRIPCIÓN AL MANTENER PRESIONADO ---
function mostrarOverlayDesc() {
  const texto = infoDescripcion.textContent.trim();
  if (texto) {
    descOverlay.textContent = texto;
    descOverlay.classList.add('active');
  }
}

function ocultarOverlayDesc() {
  descOverlay.classList.remove('active');
}

function iniciarPulsacion() {
  isPressing = false;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    isPressing = true;
    mostrarOverlayDesc();
  }, 280);
}

function cancelarPulsacion() {
  clearTimeout(pressTimer);
  ocultarOverlayDesc();
}

// --- CARGA Y RENDERIZADO DE DATOS (FETCH) ---
fetch(rutaJson)
  .then(res => {
    if (!res.ok) throw new Error("Galería no encontrada");
    return res.json();
  })
  .then(data => {
    let listaArchivos = [];
    
    if (data && data.pais) {
      const partes = data.pais.trim().split(' ');
      if (partes.length > 1 && !isNaN(partes[partes.length - 1])) {
        tituloAnio.textContent = partes.pop();
        tituloPais.textContent = partes.join(' ');
      } else {
        tituloPais.textContent = data.pais;
        tituloAnio.textContent = '';
      }
    } else {
      const partesCarpeta = galeriaActual.split('-');
      const ultimoElemento = partesCarpeta[partesCarpeta.length - 1];

      if (!isNaN(ultimoElemento) && partesCarpeta.length > 1) {
        tituloAnio.textContent = partesCarpeta.pop();
        tituloPais.textContent = partesCarpeta.join(' ');
      } else {
        tituloPais.textContent = galeriaActual.replace(/-/g, ' ');
        tituloAnio.textContent = '';
      }
    }

    if (Array.isArray(data)) {
      listaArchivos = data;
    } else if (data && Array.isArray(data.items)) {
      listaArchivos = data.items;
    } else if (data && typeof data === 'object') {
      listaArchivos = Object.keys(data).map(k => ({ file: k, ...data[k] }));
    }

    const listaAleatoria = mezclarArray(listaArchivos);

    listaAleatoria.forEach(item => {
      if (item.visible === false) return;

      const urlHD = resolverRuta(item.url || item.file);
      const urlThumb = resolverRuta(item.thumb || item.url || item.file);
      
      if (!urlHD) return;

      const titulo = item.title || '';
      const ubicacion = item.location || '';
      const fecha = item.date || item.fecha || '';
      const descripcion = item.description || item.descripcion || '';
      const poster = item.poster ? resolverRuta(item.poster) : '';

      const esVid = esVideo(urlHD, item.type);

      const anchor = document.createElement('div');
      anchor.className = 'galeria-item';

      const claseAzar = clasesTamano[Math.floor(Math.random() * clasesTamano.length)];
      if (claseAzar) anchor.classList.add(claseAzar);

      anchor.dataset.url = urlHD;
      anchor.dataset.titulo = titulo;
      anchor.dataset.ubicacion = ubicacion;
      anchor.dataset.fecha = fecha;
      anchor.dataset.descripcion = descripcion;
      anchor.dataset.esVideo = esVid;

      if (esVid) {
        if (poster) {
          const img = document.createElement('img');
          img.src = poster;
          img.alt = titulo || 'Video';
          img.referrerPolicy = 'no-referrer';
          anchor.appendChild(img);
        } else {
          const video = document.createElement('video');
          video.referrerPolicy = 'no-referrer';
          video.src = `${urlHD}#t=0.1`;
          video.muted = true;
          video.preload = "metadata";
          video.playsInline = true;
          anchor.appendChild(video);
        }
      } else {
        const img = document.createElement('img');
        img.src = urlThumb;
        img.alt = titulo || 'Fotografía';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        anchor.appendChild(img);
      }

      contenedorGaleria.appendChild(anchor);
    });

    inicializarEventos();
  })
  .catch(err => {
    console.error("Error al cargar fotos.json:", err);
    contenedorGaleria.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; margin-top: 2rem;">No se pudo cargar la galería "${galeriaActual}".</p>`;
  });

function inicializarEventos() {
  contenedorGaleria.querySelectorAll('.galeria-item').forEach(anchor => {
    anchor.addEventListener('contextmenu', anularAccionNativa, true);

    anchor.addEventListener('click', (e) => {
      e.preventDefault();

      const url = anchor.dataset.url;
      const esVid = anchor.dataset.esVideo === 'true';

      const ubicacionLimpia = anchor.dataset.ubicacion ? `📍 ${anchor.dataset.ubicacion}` : '';
      infoUbicacion.textContent = ubicacionLimpia;
      infoFecha.textContent = formatearFecha(anchor.dataset.fecha);
      infoTitulo.textContent = anchor.dataset.titulo;

      const desc = anchor.dataset.descripcion;
      infoDescripcion.textContent = desc || '';

      if (esVid) {
        modalImg.style.display = 'none';
        modalImg.src = '';
        modalVideo.referrerPolicy = 'no-referrer';
        modalVideo.src = url;
        modalVideo.style.display = 'block';
        modalVideo.play();
      } else {
        modalVideo.pause();
        modalVideo.style.display = 'none';
        modalVideo.removeAttribute('src');
        modalVideo.load();
        modalImg.referrerPolicy = 'no-referrer';
        modalImg.src = url;
        modalImg.style.display = 'block';
        resetZoom();
      }

      modal.classList.add('overlay');
      document.body.style.overflow = 'hidden';
    });
  });
}

// --- GESTIÓN DE EVENTOS DE INTERACCIÓN Y NAVEGACIÓN ---

function getDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

// 1. EVENTOS PARA IMÁGENES (ZOOM, HOLD Y CIERRE A 1 TAP)
modalMediaWrapper.addEventListener('mousedown', (e) => {
  if (e.button === 0 && modalImg.style.display !== 'none') iniciarPulsacion();
});
modalMediaWrapper.addEventListener('mouseup', cancelarPulsacion);
modalMediaWrapper.addEventListener('mouseleave', cancelarPulsacion);

let touchMoved = false;

modalMediaWrapper.addEventListener('touchstart', (e) => {
  if (modalImg.style.display === 'none') return;
  touchMoved = false;

  if (e.touches.length === 2) {
    cancelarPulsacion();
    startDistance = getDistance(e.touches);
  } else if (e.touches.length === 1) {
    if (scale > 1) {
      isDragging = true;
      startX = e.touches[0].clientX - posX;
      startY = e.touches[0].clientY - posY;
    } else {
      iniciarPulsacion();
    }
  }
}, { passive: false });

modalMediaWrapper.addEventListener('touchmove', (e) => {
  if (modalImg.style.display === 'none') return;
  touchMoved = true;

  if (e.touches.length === 2) {
    cancelarPulsacion();
    if (e.cancelable) e.preventDefault();
    const currentDistance = getDistance(e.touches);
    if (startDistance > 0) {
      scale = Math.min(Math.max(1, lastScale * (currentDistance / startDistance)), 4);
      modalImg.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    }
  } else if (e.touches.length === 1 && isDragging && scale > 1) {
    cancelarPulsacion();
    if (e.cancelable) e.preventDefault();
    posX = e.touches[0].clientX - startX;
    posY = e.touches[0].clientY - startY;
    modalImg.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  }
}, { passive: false });

modalMediaWrapper.addEventListener('touchend', (e) => {
  if (modalImg.style.display === 'none') return;

  if (e.touches.length < 2) {
    lastScale = scale;
  }

  if (e.touches.length === 0) {
    isDragging = false;

    if (isPressing) {
      cancelarPulsacion();
      isPressing = false;
      return;
    }

    cancelarPulsacion();

    // IMAGEN: 1 Tap cierra la pantalla
    if (!touchMoved) {
      if (scale > 1) {
        resetZoom();
      } else {
        cerrarModal();
      }
    }
  }
});

modalMediaWrapper.addEventListener('touchcancel', () => {
  cancelarPulsacion();
  isPressing = false;
});

modalMediaWrapper.addEventListener('click', (e) => {
  if (modalImg.style.display === 'none') return;
  e.stopPropagation();

  if (!('ontouchstart' in window)) {
    if (scale > 1) {
      resetZoom();
    } else {
      cerrarModal();
    }
  }
});

// 2. EVENTOS EXCLUSIVOS PARA VIDEOS (CIERRE EXCLUSIVO A DOBLE TAP)
let ultimoToqueVideo = 0;

modalVideo.addEventListener('touchend', function(e) {
  e.stopPropagation();

  const tiempoActual = new Date().getTime();
  const diferenciaToques = tiempoActual - ultimoToqueVideo;

  if (diferenciaToques < 300 && diferenciaToques > 0) {
    if (e.cancelable) e.preventDefault();
    cerrarModal();
    ultimoToqueVideo = 0;
  } else {
    ultimoToqueVideo = tiempoActual;
  }
});

modalVideo.addEventListener('dblclick', function(e) {
  e.stopPropagation();
  cerrarModal();
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    cerrarModal();
  }
});