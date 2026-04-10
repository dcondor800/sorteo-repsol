
    // Configuración fija por categoría.
    // Cada categoría tiene un número predeterminado de equipos.
    const categoryConfig = {
      futbol_masculino: {
        label: 'Futbol Masculino',
        teamCount: 9
      },
      futbol_femenino: {
        label: 'Futbol Femenino',
        teamCount: 3
      },
      voley_mixto: {
        label: 'Voley Mixto',
        teamCount: 10
      },
      padel: {
        label: 'Pádel',
        teamCount: 8
      }
    };

    const ANIMATION_DURATION = 4000;
    const PENDING_RIVAL_TEXT = 'Rival por definir...';

    // Referencias a elementos del DOM.
    const sportEl = document.getElementById('sport');
    const teamsCountDisplayEl = document.getElementById('teamsCountDisplay');
    const drawBtn = document.getElementById('drawBtn');
    const resetBtn = document.getElementById('resetBtn');
    const hintEl = document.getElementById('hint');
    const errorEl = document.getElementById('error');
    const bulkNamesEl = document.getElementById('bulkNames');
    const resultEl = document.getElementById('result');
    const loadingEl = document.getElementById('loading');
    const drawLaneLeftEl = document.getElementById('drawLaneLeft');
    const drawLaneRightEl = document.getElementById('drawLaneRight');

    function getCurrentCategoryConfig() {
      return categoryConfig[sportEl.value];
    }

    function hideError() {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }

    function showError(message) {
      errorEl.style.display = 'block';
      errorEl.textContent = message;
    }

    function showLoading() {
      loadingEl.style.display = 'block';
    }

    function hideLoading() {
      loadingEl.style.display = 'none';
    }

    function startAnimationState() {
      drawBtn.disabled = true;
      sportEl.disabled = true;
      bulkNamesEl.disabled = true;
      showLoading();
    }

    function stopAnimationState() {
      drawBtn.disabled = false;
      sportEl.disabled = false;
      bulkNamesEl.disabled = false;
      hideLoading();
    }

    function resetResults() {
      resultEl.innerHTML = '<div class="empty-state">Aún no hay cruces generados. Ingresa los equipos y presiona <strong>Sortear</strong>.</div>';
    }

    function normalizeName(value) {
      return value.trim().replace(/\s+/g, ' ');
    }

    function getNamesFromTextarea() {
      const raw = bulkNamesEl.value.trim();
      if (!raw) return [];
      return raw.split('\n').map(normalizeName).filter(Boolean);
    }

    // Ajusta automáticamente el textarea al número de equipos permitido.
    function syncTextareaWithCount(teamCount) {
      const current = bulkNamesEl.value.split('\n');
      const trimmed = current.slice(0, teamCount);

      while (trimmed.length < teamCount) {
        trimmed.push('');
      }

      bulkNamesEl.value = trimmed.join('\n');
    }

    function updateTeamsCountDisplay(teamCount) {
      teamsCountDisplayEl.textContent = `${teamCount} equipos`;
    }

    function validateTeams(teamCount, names) {
      const errors = [];

      if (names.length !== teamCount) {
        errors.push(`• Debes ingresar exactamente ${teamCount} nombres. Actualmente hay ${names.length}.`);
      }

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

    function shuffle(array) {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    // Genera partidos de dos en dos.
    // Si queda un equipo sin rival, se asigna 'Rival por definir...'.
    function pairTeams(teams) {
      const matches = [];
      for (let i = 0; i < teams.length; i += 2) {
        matches.push([teams[i], teams[i + 1] ?? PENDING_RIVAL_TEXT]);
      }
      return matches;
    }

    function renderMatches(matches, totalTeams, categoryLabel) {
      const pendingCount = totalTeams % 2 === 0 ? 0 : 1;

      const matchesHtml = matches.map((match, index) => {
        const isPending = match[1] === PENDING_RIVAL_TEXT;
        return `
          <div class="match">
            <div class="match-number">Partido ${index + 1}</div>
            <div class="team">${match[0]}</div>
            <div class="vs">VS</div>
            <div class="team ${isPending ? 'pending' : ''}">${match[1]}</div>
          </div>
        `;
      }).join('');

      resultEl.innerHTML = `
        <div class="summary">
          <div class="pill">${categoryLabel}</div>
          <div class="pill">${totalTeams} equipos</div>
          <div class="pill">${matches.length - pendingCount} cruces cerrados${pendingCount ? ` + ${pendingCount} rival por definir` : ''}</div>
        </div>
        <div class="scoreboard">${matchesHtml}</div>
      `;
    }

    function buildAnimationLane(names, reverse) {
      const shuffledNames = shuffle(names);
      const pool = shuffledNames.length ? shuffledNames : ['Equipo'];
      const repeated = [];

      while (repeated.length < 18) {
        repeated.push(...pool);
      }

      const visible = repeated.slice(0, 18);
      if (reverse) visible.reverse();

      const chips = visible.map(name => `<div class="draw-chip">${name}</div>`).join('');
      return chips + chips;
    }

    function prepareDrawAnimation(names) {
      drawLaneLeftEl.innerHTML = buildAnimationLane(names, false);
      drawLaneRightEl.innerHTML = buildAnimationLane(names, true);
    }

    // Aplica la configuración de la categoría elegida.
    function applyCategorySettings() {
      stopAnimationState();
      hideError();

      const config = getCurrentCategoryConfig();
      updateTeamsCountDisplay(config.teamCount);
      syncTextareaWithCount(config.teamCount);
      hintEl.textContent = `Categoría seleccionada: ${config.label}. Debes registrar ${config.teamCount} equipos.`;
      resetResults();
    }

    function draw() {
      hideError();

      const config = getCurrentCategoryConfig();
      syncTextareaWithCount(config.teamCount);

      const names = getNamesFromTextarea();
      const errors = validateTeams(config.teamCount, names);

      if (errors.length) {
        showError(errors.join('\n'));
        resetResults();
        stopAnimationState();
        return;
      }

      startAnimationState();
      prepareDrawAnimation(names);
      resultEl.innerHTML = '';
      hintEl.textContent = 'Preparando el sorteo...';

      window.setTimeout(() => {
        const shuffled = shuffle(names);
        const matches = pairTeams(shuffled);

        const hasPending = config.teamCount % 2 !== 0;
        hintEl.textContent = hasPending
          ? `Sorteo completado: hay un equipo con ${PENDING_RIVAL_TEXT}`
          : `Sorteo completado: todos los equipos tienen rival.`;

        stopAnimationState();
        renderMatches(matches, config.teamCount, config.label);
      }, ANIMATION_DURATION);
    }

    function resetAll() {
      bulkNamesEl.value = '';
      stopAnimationState();
      applyCategorySettings();
      hideError();
    }

    // Eventos
    sportEl.addEventListener('change', applyCategorySettings);
    drawBtn.addEventListener('click', draw);
    resetBtn.addEventListener('click', resetAll);

    // Inicialización
    applyCategorySettings();
