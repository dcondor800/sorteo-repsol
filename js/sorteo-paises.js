// =========================================================================
// CONFIGURACIÓN DE CATEGORÍAS
// Cada categoría define su etiqueta, número de equipos requeridos y
// la lista de países con nombre e imagen de bandera.
// Todas las banderas se sirven desde flagcdn.com usando el código ISO del país.
// =========================================================================
const categoryConfig = {
  futbol_masculino: {
    label: 'Futbol Masculino',
    teamCount: 9,
    countries: [
      { name: 'Francia',       image: 'https://flagcdn.com/w160/fr.png' },
      { name: 'España',        image: 'https://flagcdn.com/w160/es.png' },
      { name: 'Argentina',     image: 'https://flagcdn.com/w160/ar.png' },
      { name: 'Inglaterra',    image: 'https://flagcdn.com/w160/gb-eng.png' },
      { name: 'Brasil',        image: 'https://flagcdn.com/w160/br.png' },
      { name: 'Portugal',      image: 'https://flagcdn.com/w160/pt.png' },
      { name: 'Marruecos',     image: 'https://flagcdn.com/w160/ma.png' },
      { name: 'Países Bajos',  image: 'https://flagcdn.com/w160/nl.png' },
      { name: 'Ecuador',       image: 'https://flagcdn.com/w160/ec.png' }
    ]
  },
  futbol_femenino: {
    label: 'Futbol Femenino',
    teamCount: 3,
    countries: [
      { name: 'Bélgica',   image: 'https://flagcdn.com/w160/be.png' },
      { name: 'Alemania',  image: 'https://flagcdn.com/w160/de.png' },
      { name: 'Colombia',  image: 'https://flagcdn.com/w160/co.png' }
    ]
  },
  voley_mixto: {
    label: 'Voley Mixto',
    teamCount: 10,
    countries: [
      { name: 'Croacia',        image: 'https://flagcdn.com/w160/hr.png' },
      { name: 'Uruguay',        image: 'https://flagcdn.com/w160/uy.png' },
      { name: 'Suiza',          image: 'https://flagcdn.com/w160/ch.png' },
      { name: 'México',         image: 'https://flagcdn.com/w160/mx.png' },
      { name: 'Estados Unidos', image: 'https://flagcdn.com/w160/us.png' },
      { name: 'Japón',          image: 'https://flagcdn.com/w160/jp.png' },
      { name: 'Senegal',        image: 'https://flagcdn.com/w160/sn.png' },
      { name: 'Irán',           image: 'https://flagcdn.com/w160/ir.png' },
      { name: 'Corea del Sur',  image: 'https://flagcdn.com/w160/kr.png' },
      { name: 'Perú',           image: 'https://flagcdn.com/w160/pe.png' }
    ]
  },
  padel: {
    label: 'Pádel',
    teamCount: 10,
    countries: [
      { name: 'Austria',       image: 'https://flagcdn.com/w160/at.png' },
      { name: 'Canadá',        image: 'https://flagcdn.com/w160/ca.png' },
      { name: 'Australia',     image: 'https://flagcdn.com/w160/au.png' },
      { name: 'Noruega',       image: 'https://flagcdn.com/w160/no.png' },
      { name: 'Panamá',        image: 'https://flagcdn.com/w160/pa.png' },
      { name: 'Arabia Saudí',  image: 'https://flagcdn.com/w160/sa.png' },
      { name: 'Paraguay',      image: 'https://flagcdn.com/w160/py.png' },
      { name: 'Suecia',        image: 'https://flagcdn.com/w160/se.png' },
      { name: 'Egipto',        image: 'https://flagcdn.com/w160/eg.png' },
      { name: 'Turquía',       image: 'https://flagcdn.com/w160/tr.png' }
    ]
  }
};

// Duración en ms de la animación de sorteo antes de mostrar los resultados
const ANIMATION_DURATION = 4000;

// =========================================================================
// REFERENCIAS AL DOM
// Se obtienen una sola vez al cargar y se reutilizan en todas las funciones.
// =========================================================================
const categoryEl          = document.getElementById('category');
const teamsCountDisplayEl = document.getElementById('teamsCountDisplay');
const assignBtn           = document.getElementById('assignBtn');
const resetBtn            = document.getElementById('resetBtn');
const hintEl              = document.getElementById('hint');
const errorEl             = document.getElementById('error');
const bulkNamesEl         = document.getElementById('bulkNames');
const resultEl            = document.getElementById('result');
const loadingEl           = document.getElementById('loading');
const flipStageEl         = document.getElementById('flipStage');
const countriesPreviewEl  = document.getElementById('countriesPreview');
const downloadBtn         = document.getElementById('downloadBtn');

// Variables de estado global: guardan el último sorteo para poder descargarlo
let lastAssignments   = null;  // Array de { team, country } del sorteo más reciente
let lastCategoryLabel = '';    // Nombre de la categoría del sorteo más reciente

// =========================================================================
// MANEJO DE ERROR EN CARGA DE IMÁGENES
// Se llama desde onerror en cualquier <img> de bandera.
// Evita el bucle infinito anulando onerror, oculta la imagen rota
// y muestra un placeholder neutro con un emoji de bandera.
// =========================================================================
const FLAG_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100">' +
  '<rect width="160" height="100" fill="#e2e8f0" rx="8"/>' +
  '<text x="80" y="58" font-size="40" text-anchor="middle" fill="#94a3b8">🏳</text>' +
  '</svg>'
);

function flagError(img) {
  img.onerror = null;           // evitar bucle infinito si el placeholder falla
  img.src     = FLAG_PLACEHOLDER;
  img.style.opacity = '0.55';
}

// =========================================================================
// FUNCIONES DE UTILIDAD
// =========================================================================

// Retorna el objeto de configuración de la categoría actualmente seleccionada
function getCurrentCategoryConfig() {
  return categoryConfig[categoryEl.value];
}

// Oculta el bloque de error y limpia su texto
function hideError() {
  errorEl.style.display = 'none';
  errorEl.textContent = '';
}

// Muestra el bloque de error con el mensaje indicado
function showError(message) {
  errorEl.style.display = 'block';
  errorEl.textContent = message;
}

// Muestra el bloque de animación de carga
function showLoading() {
  loadingEl.style.display = 'block';
}

// Oculta el bloque de animación de carga
function hideLoading() {
  loadingEl.style.display = 'none';
}

// Bloquea los controles y muestra la animación mientras se "sortea"
function startAnimationState() {
  assignBtn.disabled = true;
  categoryEl.disabled = true;
  bulkNamesEl.disabled = true;
  showLoading();
}

// Desbloquea los controles y oculta la animación al terminar el sorteo
function stopAnimationState() {
  assignBtn.disabled = false;
  categoryEl.disabled = false;
  bulkNamesEl.disabled = false;
  hideLoading();
}

// Restaura el contenedor de resultados al estado vacío inicial
function resetResults() {
  resultEl.innerHTML = '<div class="empty-state">Aún no hay asignaciones generadas. Ingresa los equipos y presiona <strong>Asignar países</strong>.</div>';
}

// Elimina espacios al inicio/fin y colapsa espacios múltiples internos en uno
function normalizeName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

// Lee el textarea, separa por saltos de línea y devuelve sólo las líneas con contenido
function getNamesFromTextarea() {
  const raw = bulkNamesEl.value.trim();
  if (!raw) return [];
  return raw.split('\n').map(normalizeName).filter(Boolean);
}

// Ajusta el textarea para que tenga exactamente teamCount líneas:
// trunca si hay de más o rellena con líneas vacías si hay de menos.
function syncTextareaWithCount(teamCount) {
  const current = bulkNamesEl.value.split('\n');
  const trimmed = current.slice(0, teamCount);

  while (trimmed.length < teamCount) {
    trimmed.push('');
  }

  bulkNamesEl.value = trimmed.join('\n');
}

// Actualiza el texto del campo de sólo lectura con el número de equipos
function updateTeamsCountDisplay(teamCount) {
  teamsCountDisplayEl.textContent = `${teamCount} equipos`;
}

// =========================================================================
// RENDERIZADO DE BANDERAS
// Genera el HTML de la grilla de países disponibles para la categoría activa
// =========================================================================
function renderCountriesPreview(countries) {
  countriesPreviewEl.innerHTML = countries
    .map(country => `
      <div class="country-card">
        <img class="country-flag" src="${country.image}" alt="Bandera de ${country.name}" onerror="flagError(this)">
        <div class="country-name">${country.name}</div>
      </div>
    `)
    .join('');
}

// =========================================================================
// VALIDACIÓN
// Devuelve un array de mensajes de error; vacío si todo es correcto.
// Verifica que el número de nombres coincida con el requerido y que no
// haya nombres duplicados (comparación sin distinción de mayúsculas).
// =========================================================================
function validateTeams(teamCount, names) {
  const errors = [];

  // Verificar conteo exacto
  if (names.length !== teamCount) {
    errors.push(`• Debes ingresar exactamente ${teamCount} nombres. Actualmente hay ${names.length}.`);
  }

  // Detectar duplicados usando un Set para comparar en minúsculas
  const seen = new Set();
  const duplicates = new Set();

  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) duplicates.add(name);
    seen.add(key);
  }

  if (duplicates.size) {
    errors.push(`• Hay nombres duplicados: ${Array.from(duplicates).join(', ')}`);
  }

  return errors;
}

// =========================================================================
// ALGORITMO DE MEZCLA (Fisher-Yates)
// Crea una copia del array y lo baraja aleatoriamente de forma uniforme.
// No modifica el array original.
// =========================================================================
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    // Genera un índice aleatorio entre 0 e i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));
    // Intercambia los elementos en las posiciones i y j
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// =========================================================================
// LÓGICA DE ASIGNACIÓN
// Baraja por separado los equipos y los países, luego los empareja por
// posición: equipo[0] → país[0], equipo[1] → país[1], etc.
// Devuelve un array de objetos { team, country }.
// =========================================================================
function assignCountries(teams, countries) {
  const shuffledTeams     = shuffle(teams);
  const shuffledCountries = shuffle(countries);

  return shuffledTeams.map((team, index) => ({
    team,
    country: shuffledCountries[index]
  }));
}

// =========================================================================
// RENDERIZADO DE RESULTADOS
// Guarda el sorteo en variables globales para poder descargarlo después,
// hace visible el botón de descarga e inyecta el HTML de las tarjetas.
// =========================================================================
function renderAssignments(assignments, totalTeams, categoryLabel) {
  // Guardar para la descarga posterior
  lastAssignments   = assignments;
  lastCategoryLabel = categoryLabel;

  // Mostrar el botón de descarga
  downloadBtn.classList.add('visible');

  // Construir el HTML de cada tarjeta de asignación
  const cardsHtml = assignments.map((item, index) => `
    <div class="assignment-card">
      <div class="assignment-number">Equipo ${index + 1}</div>
      <div class="assignment-team">${item.team}</div>
      <div class="assignment-arrow">→</div>
      <div class="assignment-country">
        <img src="${item.country.image}" alt="Bandera de ${item.country.name}" onerror="flagError(this)">
        <div class="assignment-country-name">${item.country.name}</div>
      </div>
    </div>
  `).join('');

  // Insertar resumen + lista en el contenedor de resultados
  resultEl.innerHTML = `
    <div class="summary">
      <div class="pill">${categoryLabel}</div>
      <div class="pill">${totalTeams} equipos</div>
    </div>
    <div class="assignment-list">${cardsHtml}</div>
  `;
}

// =========================================================================
// DESCARGA EN EXCEL
// Usa la librería xlsx-js-style para generar un .xlsx nativo con estilos
// de celda (colores, fuentes, bordes), evitando el aviso de Excel que
// aparece con archivos HTML renombrados como .xls.
// =========================================================================
function downloadExcel() {
  if (!lastAssignments) return;

  // Verificar que la librería xlsx-js-style haya cargado desde el CDN
  if (typeof XLSX === 'undefined') {
    alert('La librería de Excel no está disponible. Verifica tu conexión a internet e intenta de nuevo.');
    return;
  }

  const fecha = new Date().toLocaleDateString('es-ES');

  // Función auxiliar: crea un objeto de celda con valor (v) y estilo (s)
  // t:'s' indica que el valor es string (SheetJS type)
  function c(v, s) { return { v, t: 's', s }; }

  // Borde fino azul para todas las celdas de datos
  const border = {
    top:    { style: 'thin', color: { rgb: 'BFDBFE' } },
    bottom: { style: 'thin', color: { rgb: 'BFDBFE' } },
    left:   { style: 'thin', color: { rgb: 'BFDBFE' } },
    right:  { style: 'thin', color: { rgb: 'BFDBFE' } }
  };

  // Definición de estilos de celda para cada tipo de fila
  // Los colores van en RGB hexadecimal SIN el símbolo #
  const S = {
    // Fila de título: azul muy oscuro con texto blanco grande
    title: {
      fill:      { patternType: 'solid', fgColor: { rgb: '062C4F' } },
      font:      { color: { rgb: 'FFFFFF' }, bold: true, sz: 14, name: 'Arial' },
      alignment: { horizontal: 'left', vertical: 'center' }
    },
    // Fila de subtítulo: azul medio con texto azul claro
    subtitle: {
      fill:      { patternType: 'solid', fgColor: { rgb: '0A3D6B' } },
      font:      { color: { rgb: '93C5FD' }, sz: 10, name: 'Arial' },
      alignment: { horizontal: 'left', vertical: 'center' }
    },
    // Celda de encabezado "#": centrada
    headerNum: {
      fill:      { patternType: 'solid', fgColor: { rgb: '0F172A' } },
      font:      { color: { rgb: 'FFFFFF' }, bold: true, sz: 11, name: 'Arial' },
      alignment: { horizontal: 'center', vertical: 'center' }
    },
    // Celdas de encabezado de texto: alineadas a la izquierda
    headerText: {
      fill:      { patternType: 'solid', fgColor: { rgb: '0F172A' } },
      font:      { color: { rgb: 'FFFFFF' }, bold: true, sz: 11, name: 'Arial' },
      alignment: { horizontal: 'left', vertical: 'center' }
    },
    // Pie de tabla: azul muy claro con texto oscuro en cursiva
    footer: {
      fill:      { patternType: 'solid', fgColor: { rgb: 'E0F2FE' } },
      font:      { color: { rgb: '075985' }, sz: 10, name: 'Arial', italic: true },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Genera los estilos para una fila de datos según su índice:
  // filas pares → azul claro (DBEAFE), filas impares → gris muy claro (F8FAFC)
  function rowStyles(i) {
    const rgb  = i % 2 === 0 ? 'DBEAFE' : 'F8FAFC';
    const base = { fill: { patternType: 'solid', fgColor: { rgb } }, font: { sz: 11, name: 'Arial' }, border };
    return {
      num:     { ...base, font: { ...base.font, bold: true, color: { rgb: '1D4ED8' } }, alignment: { horizontal: 'center', vertical: 'center' } },
      team:    { ...base, font: { ...base.font, bold: true, color: { rgb: '0F172A' } }, alignment: { horizontal: 'left',   vertical: 'center' } },
      country: { ...base, font: { ...base.font, bold: true, color: { rgb: '0F172A' } }, alignment: { horizontal: 'left',   vertical: 'center' } }
    };
  }

  // Construir el array de arrays (aoa) que representa la hoja de cálculo:
  // cada elemento del array exterior es una fila; cada elemento interior, una celda.
  const aoa = [
    // Fila 0: título fusionado en 3 columnas
    [c(`SORTEO DE PAÍSES — ${lastCategoryLabel.toUpperCase()}`, S.title), c('', S.title), c('', S.title)],
    // Fila 1: subtítulo con fecha y conteo, también fusionado
    [c(`Fecha: ${fecha}   |   Total equipos: ${lastAssignments.length}`, S.subtitle), c('', S.subtitle), c('', S.subtitle)],
    // Fila 2: encabezados de columnas
    [c('#', S.headerNum), c('Equipo', S.headerText), c('País Asignado', S.headerText)],
    // Filas 3…N: una fila por cada asignación del sorteo
    ...lastAssignments.map((item, i) => {
      const rs = rowStyles(i);
      return [c(`Equipo ${i + 1}`, rs.num), c(item.team, rs.team), c(item.country.name, rs.country)];
    }),
    // Última fila: pie de tabla fusionado
    [c('Generado por Dinámica Oficial Repsol', S.footer), c('', S.footer), c('', S.footer)]
  ];

  // Crear libro y hoja de cálculo con xlsx-js-style
  const WB = XLSX.utils.book_new();
  const WS = XLSX.utils.aoa_to_sheet(aoa);

  // Definir celdas fusionadas: título (fila 0), subtítulo (fila 1) y pie (última fila)
  // s = start {row, col}, e = end {row, col} — índices base 0
  const lastRow = lastAssignments.length + 3;
  WS['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: lastRow, c: 0 }, e: { r: lastRow, c: 2 } }
  ];

  // Anchos de columna en caracteres (wch): número, equipo, país
  WS['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 26 }];

  // Altos de fila en puntos (hpt): título, subtítulo, encabezados, datos, pie
  WS['!rows'] = [
    { hpt: 28 }, { hpt: 18 }, { hpt: 22 },
    ...lastAssignments.map(() => ({ hpt: 20 })),
    { hpt: 16 }
  ];

  // Agregar la hoja al libro
  XLSX.utils.book_append_sheet(WB, WS, 'Sorteo');

  // Generar el archivo como ArrayBuffer y descargarlo via Blob
  // (más confiable que XLSX.writeFile en entornos de navegador local)
  const wbout   = XLSX.write(WB, { bookType: 'xlsx', type: 'array' });
  const blob    = new Blob([wbout], { type: 'application/octet-stream' });
  const url     = URL.createObjectURL(blob);
  const anchor  = document.createElement('a');
  const nombre  = `sorteo-paises-${lastCategoryLabel.toLowerCase().replace(/\s+/g, '-')}.xlsx`;

  anchor.href     = url;
  anchor.download = nombre;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// =========================================================================
// ANIMACIÓN DE SORTEO (flip cards)
// Toma hasta 5 países al azar de la categoría activa y construye el HTML
// de las tarjetas con efecto 3D para mostrar durante la espera.
// =========================================================================
function buildFlipCards(countries) {
  const previewCountries = shuffle(countries).slice(0, 5);
  return previewCountries.map(country => `
    <div class="flip-card">
      <div class="flip-card-inner">
        <div class="flip-face front">
          <div class="flip-icon">🌍</div>
          <div class="flip-title">País oculto</div>
        </div>
        <div class="flip-face back">
          <img class="flip-flag" src="${country.image}" alt="Bandera de ${country.name}" onerror="flagError(this)">
          <div class="flip-country">${country.name}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// Inyecta las flip cards en el contenedor de la máquina de sorteo
function prepareDrawAnimation(countries) {
  flipStageEl.innerHTML = buildFlipCards(countries);
}

// =========================================================================
// CAMBIO DE CATEGORÍA
// Se ejecuta al cargar la página y cada vez que el usuario cambia el selector.
// Actualiza: contador, textarea, grilla de banderas, hint y resultados.
// =========================================================================
function applyCategorySettings() {
  stopAnimationState();
  hideError();

  const config = getCurrentCategoryConfig();
  updateTeamsCountDisplay(config.teamCount);
  syncTextareaWithCount(config.teamCount);
  renderCountriesPreview(config.countries);
  hintEl.textContent = `Categoría seleccionada: ${config.label}. Debes registrar ${config.teamCount} equipos y se asignarán ${config.teamCount} países al azar.`;
  resetResults();
}

// =========================================================================
// FLUJO PRINCIPAL DE ASIGNACIÓN
// 1. Valida los nombres ingresados en el textarea.
// 2. Si hay errores, los muestra y se detiene.
// 3. Si es válido, bloquea controles, lanza la animación y espera
//    ANIMATION_DURATION ms antes de calcular y mostrar los resultados.
// =========================================================================
function assignCountriesToTeams() {
  hideError();

  const config = getCurrentCategoryConfig();
  syncTextareaWithCount(config.teamCount);

  const names  = getNamesFromTextarea();
  const errors = validateTeams(config.teamCount, names);

  // Mostrar errores y abortar si la validación falla
  if (errors.length) {
    showError(errors.join('\n'));
    resetResults();
    stopAnimationState();
    return;
  }

  // Iniciar animación y bloquear controles
  startAnimationState();
  prepareDrawAnimation(config.countries);
  resultEl.innerHTML = '';
  hintEl.textContent = 'Preparando la asignación de países...';

  // Tras la animación, calcular el sorteo y renderizar resultados
  window.setTimeout(() => {
    const assignments = assignCountries(names, config.countries);

    hintEl.textContent = `Asignación completada: ${assignments.length} equipos recibieron un país distinto.`;
    stopAnimationState();
    renderAssignments(assignments, config.teamCount, config.label);
  }, ANIMATION_DURATION);
}

// =========================================================================
// RESET COMPLETO
// Limpia el textarea, las variables de estado global, oculta el botón de
// descarga y vuelve a aplicar la configuración inicial de la categoría.
// =========================================================================
function resetAll() {
  bulkNamesEl.value  = '';
  lastAssignments    = null;
  lastCategoryLabel  = '';
  downloadBtn.classList.remove('visible');
  stopAnimationState();
  applyCategorySettings();
  hideError();
}

// =========================================================================
// REGISTRO DE EVENTOS
// =========================================================================
categoryEl.addEventListener('change', applyCategorySettings); // Cambio de categoría
assignBtn.addEventListener('click', assignCountriesToTeams);  // Botón asignar
resetBtn.addEventListener('click', resetAll);                 // Botón reset
downloadBtn.addEventListener('click', downloadExcel);         // Botón descargar

// =========================================================================
// INICIALIZACIÓN
// Carga la configuración de la primera categoría al abrir la página.
// =========================================================================
applyCategorySettings();
