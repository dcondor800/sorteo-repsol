# Repsol — Sorteo Deportivo: Documentación del Proyecto

Documento de referencia para entender, mantener y ampliar la aplicación sin necesidad de releer todos los archivos.

---

## 1. Qué hace la app

Aplicación web estática para gestionar un torneo deportivo interno de Repsol con temática de Copa Mundial. Consta de **cinco herramientas independientes** que comparten la misma identidad visual:

| Herramienta | Archivo | Propósito |
|---|---|---|
| Asignación de Países | `index.html` | Asigna un país (con bandera) a cada equipo aleatoriamente y permite descargar el resultado en Excel |
| Fixture / Emparejamientos (legado) | `sorteo-equipos.html` | Genera partidos enfrentando equipos de a pares de forma aleatoria |
| Dashboard del Sorteo en Vivo | `dashboard-sorteo.html` | Panel del operador para registrar versus uno a uno durante el sorteo en directo |
| Fixture Público en Vivo | `fixture-sorteo.html` | Pantalla del proyector: recibe los versus en tiempo real y los muestra con animaciones |
| Sorteo por Grupos | `sorteo-grupos.html` | Distribuye países en grupos (A, B, C…) de forma aleatoria con animación de tarjetas volantes |

Todas las herramientas son completamente **client-side**: no requieren servidor, base de datos ni build. Se abren directamente en el navegador.

---

## 2. Estructura de archivos y responsabilidades

```
/
├── index.html                  ← Asignación de países (página principal)
├── sorteo-equipos.html         ← Generación de fixture/partidos (herramienta legado)
├── dashboard-sorteo.html       ← Panel del operador para el sorteo en vivo
├── fixture-sorteo.html         ← Pantalla pública del proyector (sorteo en vivo)
├── sorteo-grupos.html          ← Sorteo por grupos (animación: tarjetas volantes — VERSIÓN ACTIVA)
├── sorteo-grupos-op1.html      ← Variante: animación ruleta de banderas (slot machine)
├── sorteo-grupos-op3.html      ← Variante: animación cuenta regresiva + confeti
├── repsol.png                  ← Banner corporativo Repsol (aparece en todas las páginas)
│
├── css/
│   ├── sorteo-paises.css       ← Estilos exclusivos de index.html
│   └── styles.css              ← Estilos exclusivos de sorteo-equipos.html
│
├── js/
│   ├── sorteo-paises.js        ← Toda la lógica de index.html (asignación + Excel)
│   └── app.js                  ← Toda la lógica de sorteo-equipos.html (fixture)
│
└── img/flags/                  ← Carpeta de banderas locales (sin uso activo; las banderas se sirven desde flagcdn.com)
```

> `dashboard-sorteo.html`, `fixture-sorteo.html` y los tres archivos `sorteo-grupos*.html` tienen todo su CSS y JS **embebido** dentro del mismo archivo HTML. No usan archivos externos propios.

---

## 3. Arquitectura y flujo principal

### 3.1 Página de Fixture (legado) (`sorteo-equipos.html` + `app.js`)

```
Usuario selecciona categoría
        ↓
applyCategorySettings()
  → Actualiza contador de equipos
  → Sincroniza textarea (agrega/quita líneas)
  → Resetea resultados
        ↓
Usuario escribe nombres y presiona "Sortear"
        ↓
draw()
  → Valida (conteo exacto + sin duplicados)
  → Si hay errores: showError() y detiene
  → Si es válido: bloquea controles, lanza animación (carriles desplazables)
        ↓
setTimeout(4000ms)
  → shuffle() los nombres (Fisher-Yates)
  → pairTeams() de a pares (último impar → "Rival por definir")
  → renderMatches() inyecta HTML en #result
  → Desbloquea controles
```

### 3.2 Página de Asignación de Países (`index.html` + `sorteo-paises.js`)

```
Usuario selecciona categoría
        ↓
applyCategorySettings()
  → Actualiza contador de equipos
  → Sincroniza textarea
  → renderCountriesPreview() → muestra grilla de banderas disponibles
  → Resetea resultados
        ↓
Usuario escribe nombres y presiona "Asignar países"
        ↓
assignCountriesToTeams()
  → Valida (conteo exacto + sin duplicados)
  → Si hay errores: showError() y detiene
  → Si es válido: bloquea controles, lanza animación (flip cards 3D)
        ↓
setTimeout(4000ms)
  → assignCountries() → shuffle(equipos) + shuffle(países) → empareja por posición
  → renderAssignments() → guarda en lastAssignments, muestra tarjetas, revela botón Excel
  → Desbloquea controles
        ↓
(Opcional) Usuario presiona "Descargar Excel"
        ↓
downloadExcel()
  → Lee lastAssignments y lastCategoryLabel
  → Construye hoja .xlsx con estilos (xlsx-js-style CDN)
  → Descarga via Blob + anchor temporal
```

### 3.3 Sorteo en Vivo (`dashboard-sorteo.html` ↔ `fixture-sorteo.html`)

Estas dos páginas funcionan como un sistema sincronizado pensado para usarse simultáneamente: el operador tiene `dashboard-sorteo.html` y el proyector muestra `fixture-sorteo.html`.

```
DASHBOARD (operador)                    FIXTURE (proyector)
────────────────────                    ───────────────────
Selecciona disciplina                   Carga localStorage al abrir
Selecciona Equipo 1 y Equipo 2          Escucha BroadcastChannel
  (listas precargadas por disciplina)   Escucha window.storage (respaldo)
Presiona "Agregar versus"
        ↓
addVersus()
  → Valida campos
  → Crea objeto { id, disciplina,
    equipo1, equipo2, fechaHora }
  → fixture.push(versus)
  → localStorage.setItem(LS_KEY)
  → BroadcastChannel.postMessage
    { type:'ADD', versus, allData }
        ↓                                       ↓
  refreshTeamSelects(disciplina)      channel.onmessage recibe ADD
  Mantiene disciplina seleccionada            ↓
  Muestra mensaje de éxito           enqueueAnimation(versus)
  Actualiza lista del dashboard               ↓
                                     runAnimation(versus, callback)
                                       → Overlay fade-in
                                       → Disciplina slide-down
                                       → Equipo 1 slide-left
                                       → VS scale-in
                                       → Equipo 2 slide-right
                                       → Confetti (80 partículas)
                                       → Overlay fade-out (~5.5s)
                                               ↓
                                     renderFixture(versus.id)
                                       → Sección de disciplina visible
                                       → Tarjeta nueva con card-enter
                                       → Scroll al final de la sección
```

**Sincronización para otras acciones:**

| Acción en dashboard | Mensaje broadcast | Efecto en fixture |
|---|---|---|
| Deshacer último | `{ type:'UNDO', allData }` | Re-renderiza sin animación |
| Eliminar individual | `{ type:'REMOVE', id, allData }` | Re-renderiza sin animación |
| Limpiar fixture | `{ type:'CLEAR', allData:[] }` | Vuelve al estado vacío |

### 3.4 Sorteo por Grupos (`sorteo-grupos.html`)

```
Usuario selecciona disciplina
        ↓
doReset()
  → renderCountriesPreview(cfg) → muestra grilla de banderas de la disciplina
  → renderEmpty(cfg) → muestra slots vacíos (A1, A2… / B1, B2…)
        ↓
Usuario presiona "Sortear"
        ↓
doSort()
  → Captura posiciones DOM de las tarjetas de la grilla (getBoundingClientRect)
  → shuffle(cfg.countries) → array barajado
  → renderEmpty(cfg) → resetea slots
  → Crea overlay fijo con clones de las tarjetas (position: fixed)
  → Atenúa grilla original (opacity: 0.15)
        ↓
FASE 1 — Caos (0–950ms)
  → Cada tarjeta vuela a posición aleatoria cerca del centro
  → Rotaciones y escalas aleatorias
        ↓
FASE 2 — Despacho (950ms+, stagger 140ms por slot)
  → Cada tarjeta vuela a su slot asignado
  → Al llegar: slot hace flip 3D → revela posición + bandera + país
  → Tarjeta volante se desvanece
        ↓
Cleanup
  → Overlay eliminado
  → Grilla original restaurada
  → Controles desbloqueados
```

---

## 4. Funciones y lógica clave

### Comunes a `app.js` y `sorteo-paises.js`

| Función | Descripción |
|---|---|
| `categoryConfig` | Objeto de configuración central. Define `label`, `teamCount` y (en sorteo-paises.js) `countries` por categoría. **Único lugar donde se añaden/modifican categorías.** |
| `shuffle(array)` | Implementación Fisher-Yates. Devuelve copia barajada, no muta el original. |
| `validateTeams(teamCount, names)` | Devuelve array de errores: verifica conteo exacto y duplicados (case-insensitive). |
| `applyCategorySettings()` | Se llama al cargar y en cada cambio del `<select>`. Centraliza la sincronización del estado visual. |
| `syncTextareaWithCount(n)` | Trunca o rellena el textarea a exactamente `n` líneas. |
| `startAnimationState()` / `stopAnimationState()` | Bloquean/desbloquean controles del formulario durante la animación. |

### Exclusivas de `sorteo-paises.js`

| Función | Descripción |
|---|---|
| `assignCountries(teams, countries)` | Baraja equipos y países por separado, luego los empareja por índice. |
| `renderCountriesPreview(countries)` | Genera la grilla de tarjetas con banderas de los países disponibles. |
| `buildFlipCards(countries)` | Toma hasta 5 países al azar y genera el HTML de las flip cards animadas. |
| `flagError(img)` | Fallback para banderas rotas: anula `onerror`, aplica un SVG placeholder. Evita bucles infinitos. |
| `downloadExcel()` | Genera un `.xlsx` nativo con estilos de celda usando `xlsx-js-style`. |

### Exclusivas de `app.js`

| Función | Descripción |
|---|---|
| `pairTeams(teams)` | Agrupa en pares. Si el array es impar, el último partido usa `PENDING_RIVAL_TEXT`. |
| `buildAnimationLane(names, reverse)` | Genera los chips de los carriles animados (18 chips duplicados para scroll infinito). |
| `renderMatches(matches, total, label)` | Construye el HTML del scoreboard con los partidos. |

### Exclusivas de `dashboard-sorteo.html` (JS embebido)

| Función | Descripción |
|---|---|
| `getAvailableTeams(disciplina)` | Filtra de `TEAMS_BY_DISCIPLINE` los equipos que aún no han sido usados en un versus de esa disciplina. |
| `refreshTeamSelects(disciplina)` | Repuebla ambos `<select>` de equipo con los equipos disponibles (no usados). Se llama tras add, undo, remove, clear y cambio de disciplina. |
| `addVersus()` | Valida, crea el objeto versus, lo guarda en localStorage y lo emite por BroadcastChannel. |
| `undoLast()` | Elimina el último elemento del array y sincroniza. |
| `removeById(id)` | Elimina un versus por ID y sincroniza. |
| `clearFixture()` | Vacía el array completo con confirmación y sincroniza. |
| `exportExcel()` | Genera `fixture-sorteo.xlsx` usando `xlsx-js-style` (mismo patrón que `sorteo-paises.js`). |
| `broadcast(type, extra)` | Envía un mensaje al `BroadcastChannel` con el tipo de acción y `allData` completo. |
| `renderList()` | Muestra los versus en orden inverso (más reciente primero) en el panel del operador. |
| `showError(text)` / `showSuccess(text)` | Mensajes de estado con auto-ocultado (4.5s / 3.5s). |

### Exclusivas de `fixture-sorteo.html` (JS embebido)

| Función | Descripción |
|---|---|
| `enqueueAnimation(versus)` | Añade un versus a la cola y la procesa si está libre. |
| `processNextAnimation()` | Consume el siguiente elemento de la cola de forma recursiva. |
| `runAnimation(versus, onComplete)` | Ejecuta la secuencia completa del overlay (disciplina → equipo1 → VS → equipo2 → confetti → cierre). |
| `createConfetti()` | Genera 80 partículas `div` con posición, tamaño, color y duración aleatorios. |
| `renderFixture(highlightId)` | Re-renderiza todas las secciones del fixture; aplica `card-enter` solo a la tarjeta nueva. |
| `updateClock()` | Actualiza el reloj en tiempo real en el header (llamado cada segundo). |

### Exclusivas de `sorteo-grupos.html` y variantes (JS embebido)

| Función | Descripción |
|---|---|
| `CONFIG` | Objeto central con `label`, `countries[]`, `groups[]` y opcionalmente `constrained[]` por disciplina. |
| `shuffle(arr)` | Fisher-Yates. Usado para todas las disciplinas sin restricción. |
| `getConstrainedShuffle(cfg)` | Sorteo fixture-aware para disciplinas con `constrained`. Para Pádel: divide los 4 especiales en 2+2 entre grupos, luego asigna cada par a una posición de slot que **solo juega en Fecha 2** (`{1,5}·{2,3}·{2,4}·{3,5}·{4,5}`), elegida al azar. Los países normales rellenan los 3 slots restantes de cada grupo. Garantiza que los 4 especiales no se enfrenten en Fecha 1. |
| `renderCountriesPreview(cfg)` | Muestra la grilla de banderas de la disciplina activa. |
| `renderEmpty(cfg)` | Renderiza los grupos con slots vacíos mostrando solo la etiqueta de posición. |
| `doSort()` | Lanza la animación de sorteo. Llama a `getConstrainedShuffle` si `cfg.constrained` existe, o `shuffle` en caso contrario. Implementación de animación difiere por variante. |
| `doReset()` | Restaura el estado inicial: preview de países + slots vacíos. |
| `setControls(disabled)` | Bloquea/desbloquea select y botones durante la animación. |
| `flagError(img)` | Mismo patrón que sorteo-paises.js: SVG placeholder inline para banderas rotas. |

---

## 5. Persistencia y comunicación (sorteo en vivo)

### Claves y canales

| Elemento | Valor |
|---|---|
| Clave localStorage | `fixture_sorteo_data` |
| Nombre BroadcastChannel | `fixture_sorteo_channel` |

### Estructura del objeto versus

```js
{
  id:        String,  // ID único: Date.now().toString(36) + random
  disciplina: String, // 'Vóley mixto' | 'Fútbol masculino' | 'Fútbol femenino' | 'Pádel'
  equipo1:   String,
  equipo2:   String,
  fechaHora: String   // Formato localizado es-ES: "DD/MM/YYYY, HH:MM"
}
```

### Por qué dos mecanismos de sincronización

- **BroadcastChannel**: canal principal, funciona entre pestañas/ventanas del mismo origen. Permite distinguir el tipo de acción (ADD vs REMOVE) para decidir si animar o solo re-renderizar.
- **`window.storage`**: respaldo para edge cases donde BroadcastChannel no dispara. Solo re-renderiza (no anima) para evitar duplicados.

---

## 6. Disciplinas del sorteo en vivo

Las disciplinas están declaradas en el array `DISCIPLINES` dentro de `fixture-sorteo.html`, y en los `<option>` del select de `dashboard-sorteo.html`. **Ambos deben usar los mismos strings exactos como claves.**

| Disciplina | Color de acento | Icono | ID de sección CSS (interno) |
|---|---|---|---|
| Vóley mixto | `#f59e0b` (ámbar) | 🏐 | `sec-voley-mixto` / `disc-voley-mixto` |
| Fútbol masculino | `#4ade80` (verde) | ⚽ | `sec-futbol-masculino` / `disc-futbol-masculino` |
| Fútbol femenino | `#f0abfc` (fucsia) | ⚽ | `sec-voley-femenino` / `disc-voley-femenino` |
| Pádel | `#7dd3fc` (azul cielo) | 🎾 | `sec-padel` / `disc-padel` |

> Los IDs internos de Fútbol femenino conservan el prefijo `voley-femenino` por razones históricas. El string visible y la clave de matching es `'Fútbol femenino'`.

El layout del fixture es una **cuadrícula 2×2** (dos columnas, dos filas). Las secciones sin cruces se ocultan con `.hidden`.

---

## 7. Equipos por disciplina (dashboard-sorteo.html)

Los equipos están hardcodeados en `TEAMS_BY_DISCIPLINE` dentro del JS embebido de `dashboard-sorteo.html`. Al seleccionar una disciplina, los selects de Equipo 1 y Equipo 2 se cargan solo con los equipos **no usados aún** en esa disciplina.

| Disciplina | Equipos |
|---|---|
| Pádel | Bicampeones, Doble Energía Pampilla, El dúo de la historia, Los doble falta, Par técnico, Henry Cup, Dúo dinamita, Torres gemelas, Six-Seven, One CYC |
| Fútbol masculino | Movilidad con ALMA FC, Real Blending F.C., Atlético Octano, Los Ejecutores, Alto Octanaje FC, Real E&P, Supply & Trading, CFO, Los Re-Finos F.C. |
| Fútbol femenino | Energía Femenina, Motomamis FC, Focus Mode FC |
| Vóley mixto | Bloque técnico, Bloqueo 57, Octanaje Implacable, Servicios Globales, Repsolitos Pyoneros, Energía 360, Energizados Pampilla, Latinita Repsol, Pampilla Lovers, Repvol |

---

## 8. Configuración de categorías (herramientas legado + sorteo por grupos)

### Herramientas legado (`app.js` y `sorteo-paises.js`)

Objeto `categoryConfig` al inicio de cada archivo JS.

| Clave | Nombre visible | Equipos | Países |
|---|---|---|---|
| `futbol_masculino` | Futbol Masculino | 9 | Francia, España, Argentina, Inglaterra, Brasil, Portugal, Marruecos, Países Bajos, Ecuador |
| `futbol_femenino` | Futbol Femenino | 3 | Bélgica, Alemania, Colombia |
| `voley_mixto` | Voley Mixto | 10 | Croacia, Uruguay, Suiza, México, EEUU, Japón, Senegal, Irán, Corea del Sur, Perú |
| `padel` | Pádel | 10 | Austria, Canadá, Australia, Noruega, Panamá, Arabia Saudí, Paraguay, Suecia, Egipto, Turquía |

Las banderas usan el CDN `https://flagcdn.com/w160/{codigo-iso}.png`.

### Sorteo por grupos (`sorteo-grupos.html` y variantes)

Objeto `CONFIG` embebido en el JS de cada archivo. Estructura de cada entrada:

```js
{
  label: String,          // Nombre visible en la UI
  countries: [            // Países que participan (mismo orden no importa, se barajan)
    { name: String, code: String }  // code = código ISO para flagcdn.com
  ],
  groups: [               // Definición de grupos
    { name: String, prefix: String, size: Number }
    // name: "GRUPO A" | prefix: letra del slot ("A", "B", "F"…) | size: cantidad de slots
  ],
  constrained: [String]   // OPCIONAL. Códigos ISO de países con restricción de fixture.
                          // Si está presente, se usa getConstrainedShuffle() en lugar de shuffle().
}
```

| Disciplina | Grupos | Slots | Países |
|---|---|---|---|
| Fútbol Masculino | A, B, C | A1–A3, B1–B3, C1–C3 | Francia, España, Argentina, Inglaterra, Brasil, Portugal, Marruecos, Países Bajos, Ecuador |
| Fútbol Femenino | A (prefix F) | F1, F2, F3 | Bélgica, Alemania, Colombia |
| Vóley Mixto | A, B | A1–A5, B1–B5 | Croacia, Uruguay, Suiza, México, EEUU, Japón, Senegal, Irán, Corea del Sur, Perú |
| Pádel | A, B | A1–A5, B1–B5 | Austria, Canadá, Australia, Noruega, Panamá, Arabia Saudita, Paraguay, Suecia, Egipto, Turquía |

**Restricción especial de Pádel:** Austria, Egipto, Canadá y Turquía están declarados en `constrained: ['at','eg','ca','tr']`. El sorteo garantiza que ninguno de estos 4 países se enfrente entre sí en **Fecha 1**. Ver `getConstrainedShuffle` en sección 4.

Las banderas usan `https://flagcdn.com/w80/{codigo-iso}.png` (tamaño más pequeño que las herramientas legado).

---

## 9. Variantes de animación (sorteo por grupos)

| Archivo | Animación | Estado |
|---|---|---|
| `sorteo-grupos.html` | **Tarjetas volantes** — las banderas se despegan de la grilla, vuelan al centro caóticamente y luego cada una aterriza en su slot disparando el flip 3D | Versión activa |
| `sorteo-grupos-op1.html` | **Ruleta** — todos los slots giran simultáneamente con banderas en bucle rápido, luego se frenan y bloquean uno a uno con flip de confirmación | Variante de comparación |
| `sorteo-grupos-op3.html` | **Cuenta regresiva** — overlay oscuro con 3→2→1 animado, destello "¡SORTEO!" y confeti (90 partículas), luego reveals escalonados con flip | Variante de comparación |

Para elegir una variante como definitiva: renombrar el archivo elegido a `sorteo-grupos.html` (o actualizar los enlaces que apunten a él).

---

## 10. Convenciones de código y estilos

### JavaScript
- Vanilla JS puro, sin frameworks ni bundler.
- Funciones nombradas con `camelCase`.
- Referencias al DOM obtenidas una sola vez al cargar y reutilizadas.
- Archivos con JS embebido: todo en un único `<script>` al final del `<body>`.

### CSS
- Variables CSS en `:root` compartidas entre las herramientas del mismo tipo:
  - Herramientas legado y grupos: `--bg1: #062c4f`, `--bg2: #0a3d6b`, `--accent: #00bcd4`, `--radius: 18px`
  - Sorteo en vivo: fondo muy oscuro (`#08101e`), colores por disciplina como variables propias
- Layout responsive con breakpoint en `620–900px` según archivo.
- `fixture-sorteo.html`: diseño oscuro deportivo optimizado para proyector 16:9, texto grande con `clamp()`.

### HTML
- Semántica simple: `<section>` para bloques principales, `<div>` para layout.
- IDs en `camelCase` para elementos manipulados por JS.
- Clases CSS en `kebab-case`.
- Los `<script>` van al final del `<body>`.

---

## 11. Dependencias

| Dependencia | Cómo se usa | Dónde se carga |
|---|---|---|
| [xlsx-js-style v1.2.0](https://github.com/gitbrent/xlsx-js-style) | Genera archivos `.xlsx` con estilos de celda nativos | CDN en `index.html` y `dashboard-sorteo.html` |
| [flagcdn.com](https://flagcdn.com) | Sirve imágenes de banderas por código ISO | URLs en `categoryConfig`/`CONFIG` de los archivos JS |
| BroadcastChannel API | Comunicación en tiempo real entre dashboard y fixture | Nativo del navegador, sin CDN |

**No hay dependencias de Node, npm, ni sistema de build.** Todo funciona abriendo los archivos directamente en Chrome/Brave.

---

## 12. Partes sensibles del código

### Cola de animaciones en `fixture-sorteo.html`
Si el operador agrega varios versus rápidamente, `enqueueAnimation()` los apila. La función `processNextAnimation()` los consume uno a uno de forma recursiva. Si se modifica la duración del overlay (`T.HIDE_DONE`), hay que asegurarse de que `setTimeout(processNextAnimation, 400)` al final del callback siga siendo mayor que cero.

### Sincronización doble (BroadcastChannel + storage)
`fixture-sorteo.html` escucha ambos. Si llega un `ADD` por BroadcastChannel, **anima**. Si llega por `storage`, **solo renderiza** (sin animación) para evitar que aparezca dos veces. No mezclar los dos caminos.

### Estado global del dashboard
El array `fixture` en `dashboard-sorteo.html` es la única fuente de verdad. Todas las acciones (add, undo, remove, clear) terminan en `saveToStorage()` + `broadcast()` + `refreshTeamSelects()`. Si se agrega lógica nueva, siempre seguir ese orden.

### Equipos disponibles en el dashboard
`getAvailableTeams(disciplina)` recorre el array `fixture` completo para calcular qué equipos ya tienen versus. Si se borra el localStorage manualmente, `fixture` se recarga vacío y todos los equipos vuelven a estar disponibles automáticamente al recargar la página.

### Bucle infinito en `flagError`
Antes de cambiar `img.src` al placeholder SVG, se anula `img.onerror = null`. Sin esa línea, el cambio de `src` dispararía `onerror` de nuevo indefinidamente. Patrón presente en todos los archivos que muestran banderas.

### Descarga Excel via Blob (patrón compartido)
Tanto `sorteo-paises.js` como `dashboard-sorteo.html` usan el mismo patrón: `XLSX.write → Blob(octet-stream) → createObjectURL → anchor.click → revokeObjectURL`. Cualquier cambio en la estructura de celdas debe mantener coherencia entre `aoa`, `!merges` y `!rows` (índices base 0).

### Posicionamiento de tarjetas volantes (`sorteo-grupos.html`)
Las tarjetas volantes usan `position: fixed` dentro del overlay. Las coordenadas se obtienen con `getBoundingClientRect()` **antes** de que `renderEmpty()` destruya los elementos fuente del DOM. Si se cambia el orden de llamadas en `doSort()`, las posiciones quedarán en (0,0).

### `syncTextareaWithCount` (herramientas legado)
Trunca el textarea **silenciosamente** al cambiar de categoría. Los datos extra se pierden sin advertencia.

---

## 13. Guía rápida para cambios frecuentes

### Añadir un versus desde el dashboard
Seleccionar disciplina → los selects de equipo se cargan automáticamente con los equipos disponibles → seleccionar Equipo 1 y Equipo 2 → presionar "Agregar versus" (o Enter). Los equipos usados desaparecen de los selects automáticamente.

### Modificar la restricción de fixture en Pádel
La restricción está hardcodeada en `SAFE_PAIRS` dentro de `getConstrainedShuffle` (todos los archivos `sorteo-grupos*.html`). Los pares seguros actuales son los que **no** se enfrentan en Fecha 1: `{1,5},{2,3},{2,4},{3,5},{4,5}`. Si el fixture cambia, actualizar ese array. Los países con restricción se declaran en `CONFIG.padel.constrained`.

### Cambiar las disciplinas del sorteo en vivo
Editar el array `DISCIPLINES` en `fixture-sorteo.html` (colores, iconos, IDs de sección) **y** los `<option>` del `<select id="sel-disciplina">` en `dashboard-sorteo.html`. Ambos deben usar exactamente los mismos strings como claves. Si se agrega una disciplina nueva, también añadirla a `TEAMS_BY_DISCIPLINE` y a `DISC_BADGE_CLASS`.

### Cambiar el layout del fixture (columnas)
Modificar `grid-template-columns` y `grid-template-rows` en `.main-content` de `fixture-sorteo.html`. Actualmente `1fr 1fr` / `1fr 1fr` produce la cuadrícula 2×2.

### Cambiar la duración de la animación del overlay (sorteo en vivo)
Modificar los valores del objeto `T` en `fixture-sorteo.html` (en milisegundos). `T.HIDE_DONE - T.HIDE_START` define la duración del fade-out (actualmente 550ms).

### Modificar los estilos del Excel
Editar `exportExcel()` en `dashboard-sorteo.html` o `downloadExcel()` en `sorteo-paises.js`. Los colores van en RGB hexadecimal **sin `#`**. El patrón de construcción es idéntico en ambos archivos.

### Añadir una nueva categoría (herramientas legado)
1. En `js/app.js`: añadir entrada a `categoryConfig` con `label` y `teamCount`.
2. En `js/sorteo-paises.js`: añadir la misma entrada con `label`, `teamCount` y array `countries`.
3. En ambos `<select>` de los HTML legado: añadir `<option>`.

### Cambiar el banner corporativo
Reemplazar `repsol.png` en la raíz. Está referenciado directamente en todos los HTML.

### Limpiar el fixture en vivo entre ensayos
Presionar "Limpiar fixture" en el dashboard, o ejecutar en la consola del navegador:
```js
localStorage.removeItem('fixture_sorteo_data');
```
