/* ==========================================================================
   Line-up — listagem, busca e filtro em tempo real
   ========================================================================== */

(async function initTrilhas() {
  const { api, $, escapeHtml, debounce, observeReveals } = TCS;

  const grid = $('#trilhasGrid');
  const countEl = $('#trilhasCount');
  const searchEl = $('#trilhasSearch');
  const emptyEl = $('#trilhasEmpty');

  let trilhas = [];

  function render(list, term = '') {
    if (!list.length) {
      grid.innerHTML = '';
      countEl.textContent = '0 bandas';
      emptyEl.innerHTML = `
        <div class="empty-state" style="margin-top:22px;">
          <div class="es-icon" aria-hidden="true">🔎</div>
          <h3>Nenhuma banda encontrada</h3>
          <p>Não localizamos resultados para “${escapeHtml(term)}”. Tente outro termo, como “hardcore”, “Oi!”, “stoner” ou “thrash”.</p>
          <button class="btn btn-ghost btn-sm" type="button" id="clearSearch">Limpar busca</button>
        </div>`;
      const clear = $('#clearSearch');
      if (clear) {
        clear.addEventListener('click', () => {
          searchEl.value = '';
          render(trilhas);
          searchEl.focus();
        });
      }
      return;
    }

    emptyEl.innerHTML = '';
    grid.innerHTML = list.map((trilha, index) => TCS.cards.trilha(trilha, index)).join('');
    countEl.textContent = `${list.length} ${list.length === 1 ? 'banda' : 'bandas'}`;
    observeReveals(grid);
  }

  try {
    const resposta = await api('/api/trilhas');
    trilhas = resposta.trilhas || [];
    render(trilhas);
  } catch (error) {
    grid.innerHTML = '';
    emptyEl.innerHTML = `
      <div class="empty-state">
        <div class="es-icon" aria-hidden="true">⚠️</div>
        <h3>Não foi possível carregar o line-up</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="btn btn-ghost btn-sm" type="button" onclick="window.location.reload()">Recarregar página</button>
      </div>`;
    countEl.textContent = '—';
    return;
  }

  if (searchEl) {
    searchEl.addEventListener('input', debounce(() => {
      const term = searchEl.value.trim().toLowerCase();
      if (!term) {
        render(trilhas);
        return;
      }

      const filtradas = trilhas.filter((trilha) => {
        const palestrantes = (trilha.palestrantes || [])
          .map((p) => `${p.nome} ${p.cargo} ${p.empresa} ${(p.tags || []).join(' ')}`)
          .join(' ');
        const haystack = [
          trilha.nome,
          trilha.tagline,
          trilha.resumo,
          trilha.descricao,
          trilha.nivel,
          trilha.publico,
          (trilha.topicos || []).join(' '),
          palestrantes
        ].join(' ').toLowerCase();
        return haystack.includes(term);
      });

      render(filtradas, searchEl.value.trim());
    }, 160));
  }
})();
