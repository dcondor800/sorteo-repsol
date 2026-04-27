# Repsol — Sorteo Deportivo: Documentación del Proyecto

Documento de referencia para entender, mantener y ampliar la aplicación sin necesidad de releer todos los archivos.

---

## 1. Qué hace la app

Aplicación web estática para gestionar un torneo deportivo interno de Repsol con temática de Copa Mundial. Consta de **cuatro herramientas independientes** que comparten la misma identidad visual:

| Herramienta | Archivo | Propósito |
|---|---|---|
| Asignación de Países | `index.html` | Asigna un país (con bandera) a cada equipo aleatoriamente y permite descargar el resultado en Excel |
| Fixture / Emparejamientos (legado) | `sorteo-equipos.html` | Genera partidos enfrentando equipos de a pares de forma aleatoria |
| Dashboard del Sorteo en Vivo | `dashboard-sorteo.html` | Panel del operador para registrar versus uno a uno durante el sorteo en directo |
| Fixture Público en Vivo | `fixture-sorteo.html` | Pantalla del proyector: recibe los versus en tiempo real y los muestra con animaciones |

Todas las herramientas son completamente **client-side**: no requieren servidor, base de datos ni build. Se abren directamente en el navegador.

---

## 2. Estructura de archivos y responsabilidades

```
/
├── index.html              ← Asignación de países (página principal)
├── sorteo-equipos.html     ← Generación de fixture/partidos (herramienta legado)
├── dashboard-sorteo.html   ← Panel del operador para el sorteo en vivo
├── fixture-sorteo.html     ← Pantalla pública del proyector (sorteo en vivo)
├── repsol.png              ← Banner corporativo Repsol (aparece en todas las páginas)
│
├── css/
│   ├── sorteo-paises.css   ← Estilos exclusivos de index.html
│   └── styles.css          ← Estilos exclusivos de sorteo-equipos.html
│
├── js/
│   ├── sorteo-paises.js    ← Toda la lógica de index.html (asignación + Excel)
│   └── app.js              ← Toda la lógica de sorteo-equipos.html (fixture)
│
└── img/flags/              ← Carpeta de banderas locales (sin uso activo; las banderas se sirven desde flagcdn.com)
```

> `dashboard-sorteo.html` y `fixture-sorteo.html` tienen todo su CSS y JS **embebido** dentro del mismo archivo HTML. No usan archivos externos propios.

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
Escribe Equipo 1 y Equipo 2             Escucha BroadcastChannel
Presiona "Agregar versus"               Escucha window.storage (respaldo)
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
  Limpia Equipo 1 y Equipo 2         channel.onmessage recibe ADD
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
  disciplina: String, // 'Vóley mixto' | 'Fútbol masculino' | 'Vóley femenino' | 'Pádel'
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

Las disciplinas están declaradas en el array `DISCIPLINES` dentro de `fixture-sorteo.html`:

| Disciplina | Color de acento | Icono | ID de sección |
|---|---|---|---|
| Vóley mixto | `#f59e0b` (ámbar) | 🏐 | `sec-voley-mixto` |
| Fútbol masculino | `#4ade80` (verde) | ⚽ | `sec-futbol-masculino` |
| Vóley femenino | `#f0abfc` (fucsia) | 🏐 | `sec-voley-femenino` |
| Pádel | `#7dd3fc` (azul cielo) | 🎾 | `sec-padel` |

El layout del fixture es una **cuadrícula 2×2** (dos columnas, dos filas). Las secciones sin cruces se ocultan con `.hidden`; las que tienen cruces se muestran y el grid se ajusta automáticamente.

---

## 7. Configuración de categorías (herramientas legado)

Todo el comportamiento variable de `sorteo-equipos.html` e `index.html` está en el objeto `categoryConfig` al inicio de cada archivo JS.

| Clave | Nombre visible | Equipos | Países |
|---|---|---|---|
| `futbol_masculino` | Futbol Masculino | 9 | Francia, España, Argentina, Inglaterra, Brasil, Portugal, Marruecos, Países Bajos, Ecuador |
| `futbol_femenino` | Futbol Femenino | 3 | Bélgica, Alemania, Colombia |
| `voley_mixto` | Voley Mixto | 10 | Croacia, Uruguay, Suiza, México, EEUU, Japón, Senegal, Irán, Corea del Sur, Perú |
| `padel` | Pádel | 10 | Austria, Canadá, Australia, Noruega, Panamá, Arabia Saudí, Paraguay, Suecia, Egipto, Turquía |

Las banderas usan el CDN `https://flagcdn.com/w160/{codigo-iso}.png`.

---

## 8. Convenciones de código y estilos

### JavaScript
- Vanilla JS puro, sin frameworks ni bundler.
- Funciones nombradas con `camelCase`.
- Referencias al DOM obtenidas una sola vez al cargar y reutilizadas.
- `dashboard-sorteo.html` y `fixture-sorteo.html` tienen todo el código embebido en un único `<script>` al final del `<body>`.

### CSS
- Variables CSS en `:root` compartidas entre las herramientas del mismo tipo:
  - Herramientas legado: `--bg1: #062c4f`, `--bg2: #0a3d6b`, `--accent: #00bcd4`, `--radius: 18px`
  - Sorteo en vivo: fondo muy oscuro (`#08101e`), colores por disciplina como variables propias
- Layout responsive con breakpoint en `900px` (tablet/móvil).
- `dashboard-sorteo.html`: fondo azul degradado, tarjetas blancas semitransparentes (misma línea estética que las herramientas legado).
- `fixture-sorteo.html`: diseño oscuro deportivo optimizado para proyector 16:9, texto grande con `clamp()`.

### HTML
- Semántica simple: `<section>` para bloques principales, `<div>` para layout.
- IDs en `camelCase` para elementos manipulados por JS.
- Clases CSS en `kebab-case`.
- Los `<script>` van al final del `<body>`.

---

## 9. Dependencias

| Dependencia | Cómo se usa | Dónde se carga |
|---|---|---|
| [xlsx-js-style v1.2.0](https://github.com/gitbrent/xlsx-js-style) | Genera archivos `.xlsx` con estilos de celda nativos | CDN en `index.html` y `dashboard-sorteo.html` |
| [flagcdn.com](https://flagcdn.com) | Sirve imágenes de banderas por código ISO | URLs en `categoryConfig` de `sorteo-paises.js` |
| BroadcastChannel API | Comunicación en tiempo real entre dashboard y fixture | Nativo del navegador, sin CDN |

**No hay dependencias de Node, npm, ni sistema de build.** Todo funciona abriendo los archivos directamente en Chrome/Brave.

---

## 10. Partes sensibles del código

### Cola de animaciones en `fixture-sorteo.html`
Si el operador agrega varios versus rápidamente, `enqueueAnimation()` los apila. La función `processNextAnimation()` los consume uno a uno de forma recursiva. Si se modifica la duración del overlay (`T.HIDE_DONE`), hay que asegurarse de que `setTimeout(processNextAnimation, 400)` al final del callback siga siendo mayor que cero.

### Sincronización doble (BroadcastChannel + storage)
`fixture-sorteo.html` escucha ambos. Si llega un `ADD` por BroadcastChannel, **anima**. Si llega por `storage`, **solo renderiza** (sin animación) para evitar que aparezca dos veces. No mezclar los dos caminos.

### Estado global del dashboard
El array `fixture` en `dashboard-sorteo.html` es la única fuente de verdad. Todas las acciones (add, undo, remove, clear) terminan en `saveToStorage()` + `broadcast()`. Si se agrega lógica nueva, siempre seguir ese orden.

### Bucle infinito en `flagError` (`sorteo-paises.js` líneas 103–107)
Antes de cambiar `img.src` al placeholder, se anula `img.onerror = null`. Sin esa línea, el cambio de `src` dispararía `onerror` de nuevo indefinidamente.

### Descarga Excel via Blob (patrón compartido)
Tanto `sorteo-paises.js` como `dashboard-sorteo.html` usan el mismo patrón: `XLSX.write → Blob(octet-stream) → createObjectURL → anchor.click → revokeObjectURL`. Cualquier cambio en la estructura de celdas debe mantener coherencia entre `aoa`, `!merges` y `!rows` (índices base 0).

### `syncTextareaWithCount` (herramientas legado)
Trunca el textarea **silenciosamente** al cambiar de categoría. Los datos extra se pierden sin advertencia.

---

## 11. Guía rápida para cambios frecuentes

### Añadir un versus desde el dashboard
Rellenar los tres campos y presionar "Agregar versus" (o Enter). La disciplina permanece seleccionada para el siguiente versus.

### Cambiar las disciplinas del sorteo en vivo
Editar el array `DISCIPLINES` en `fixture-sorteo.html` (colores, iconos, IDs de sección) **y** los `<option>` del `<select id="sel-disciplina">` en `dashboard-sorteo.html`. Ambos deben usar exactamente los mismos strings como claves.

### Cambiar el layout del fixture (columnas)
Modificar `grid-template-columns` y `grid-template-rows` en `.main-content` de `fixture-sorteo.html`. Actualmente `1fr 1fr` / `1fr 1fr` produce la cuadrícula 2×2.

### Cambiar la duración de la animación del overlay
Modificar los valores del objeto `T` en `fixture-sorteo.html` (en milisegundos). `T.HIDE_DONE - T.HIDE_START` define la duración del fade-out (actualmente 550ms).

### Modificar los estilos del Excel del dashboard
Editar `exportExcel()` en `dashboard-sorteo.html`. Los colores van en RGB hexadecimal **sin `#`**. El patrón es idéntico al de `downloadExcel()` en `sorteo-paises.js`.

### Añadir una nueva categoría (herramientas legado)
1. En `js/app.js`: añadir entrada a `categoryConfig` con `label` y `teamCount`.
2. En `js/sorteo-paises.js`: añadir la misma entrada con `label`, `teamCount` y array `countries`.
3. En ambos `<select>` de los HTML legado: añadir `<option>`.

### Cambiar el banner corporativo
Reemplazar `repsol.png` en la raíz. Está referenciado directamente en los cuatro HTML.

### Limpiar el fixture en vivo entre ensayos
Presionar "Limpiar fixture" en el dashboard, o ejecutar en la consola del navegador:
```js
localStorage.removeItem('fixture_sorteo_data');
```
