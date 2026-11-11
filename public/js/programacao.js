/* ==========================================================================
   Horários — grade interativa dos shows com filtros e favoritos
   ========================================================================== */

(async function initProgramacao() {
  const { api, $, $$, escapeHtml, hexToRgba, observeReveals, param, toast } = TCS;

  const FAV_KEY = 'rdp.agenda.v1';

  const TYPE_LABELS = {
    portoes: 'Portões',
    feira: 'Feira',
    show: 'Show',
    'show-principal': 'Headliner',
    meetGreet: 'Meet & Greet',
    'meet-greet': 'Meet & Greet',
    dj: 'DJ',
    intervalo: 'Intervalo',
    cerimonia: 'Cerimônia',
    afterparty: 'Afterparty',
    encerramento: 'Encerramento'
  };

  const dayTabsEl = $('#dayTabs');
  const filtersEl = $('#trilhaFilters');
  const favFilterEl = $('#favFilter');
  const favCountEl = $('#favCount');
  const clearEl = $('#clearFilters');
  const summaryEl = $('#scheduleSummary');
  const listEl = $('#scheduleList');

  let dados = null;
  let diaAtual = 1;
  let trilhaAtual = 'all';
  let somenteFavoritos = false;
  let favoritos = new Set();

  try {
    const salvo = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    if (Array.isArray(salvo)) favoritos = new Set(salvo);
  } catch {
    favoritos = new Set();
  }

  function persistirFavoritos() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favoritos)));
    } catch {
      /* armazenamento indisponível */
    }
  }

  function duracao(inicio, fim) {
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fim.split(':').map(Number);
    const total = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (total <= 0) return '';
    const horas = Math.floor(total / 60);
    const minutos = total % 60;
    if (!horas) return `${minutos} min`;
    return minutos ? `${horas}h${String(minutos).padStart(2, '0')}` : `${horas}h`;
  }

  function formatarCarga(totalMinutos) {
    if (!totalMinutos) return '0h';
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return minutos ? `${horas}h${String(minutos).padStart(2, '0')}` : `${horas}h`;
  }

  function trilhaPorSlug(slug) {
    return (dados.trilhas || []).find((t) => t.slug === slug) || null;
  }

  function corDaSessao(sessao) {
    const trilha = trilhaPorSlug(sessao.trilha);
    return trilha ? trilha.cor : '#a89f95';
  }

  /* ---------- Filtros ---------- */

  function renderFiltros() {
    const total = dados.sessoes.length;
    const chips = [`<button class="filter-chip ${trilhaAtual === 'all' ? 'is-active' : ''}" type="button" data-trilha="all">Todas as bandas <span class="count">${total}</span></button>`];

    dados.trilhas.forEach((trilha) => {
      const qtd = dados.sessoes.filter((s) => s.trilha === trilha.slug).length;
      chips.push(`
        <button class="filter-chip ${trilhaAtual === trilha.slug ? 'is-active' : ''}" type="button" data-trilha="${escapeHtml(trilha.slug)}" style="--dot:${trilha.cor}">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${trilha.cor};margin-right:5px;"></span>
          ${escapeHtml(trilha.nome)} <span class="count">${qtd}</span>
        </button>`);
    });

    filtersEl.innerHTML = chips.join('');
    if (favCountEl) favCountEl.textContent = String(favoritos.size);
  }

  function renderTabs() {
    const totalPorDia = {};
    dados.sessoes.forEach((s) => { totalPorDia[s.dia] = (totalPorDia[s.dia] || 0) + 1; });

    dayTabsEl.innerHTML = dados.dias.map((dia) => `
      <button class="day-tab ${dia.dia === diaAtual ? 'is-active' : ''}" type="button" role="tab"
        aria-selected="${dia.dia === diaAtual}" data-dia="${dia.dia}">
        <strong>${escapeHtml(dia.label)}</strong>
        <span>${escapeHtml(dia.diaSemana)} · ${totalPorDia[dia.dia] || 0} atrações</span>
      </button>`).join('');
  }

  function atualizarFiltroFavoritos() {
    if (!favFilterEl) return;
    favFilterEl.classList.toggle('is-active', somenteFavoritos);
    favFilterEl.setAttribute('aria-pressed', String(somenteFavoritos));
  }

  function atualizarURL() {
    const url = new URL(window.location.href);
    if (diaAtual !== 1) url.searchParams.set('dia', String(diaAtual));
    else url.searchParams.delete('dia');
    if (trilhaAtual !== 'all') url.searchParams.set('trilha', trilhaAtual);
    else url.searchParams.delete('trilha');
    history.replaceState(null, '', url);
  }

  /* ---------- Sessões ---------- */

  function sessaoHTML(sessao, index) {
    const cor = corDaSessao(sessao);
    const trilha = trilhaPorSlug(sessao.trilha);
    const favorita = favoritos.has(sessao.id);
    const tipoLabel = TYPE_LABELS[sessao.tipo] || sessao.tipo;
    const dur = duracao(sessao.inicio, sessao.fim);

    return `
      <article class="session reveal ${favorita ? 'is-fav' : ''}"
        style="--accent:${cor};--accent-soft:${hexToRgba(cor, 0.12)};--d:${Math.min(index, 10) * 35}ms">
        <div class="session-time">
          <strong>${escapeHtml(sessao.inicio)}</strong>
          <span>${escapeHtml(sessao.fim)}</span>
        </div>
        <div class="session-body">
          <div class="session-tags">
            <span class="badge type-${escapeHtml(sessao.tipo)}">${escapeHtml(tipoLabel)}</span>
            ${trilha ? `<span class="badge" style="color:${cor};border-color:${hexToRgba(cor, 0.35)};background:${hexToRgba(cor, 0.09)};">${escapeHtml(trilha.nome)}</span>` : ''}
            ${sessao.vagas ? `<span class="badge badge-warn">${sessao.vagas} vagas</span>` : ''}
            ${favorita ? '<span class="badge badge-warn">★ Na sua agenda</span>' : ''}
          </div>
          <h4>${escapeHtml(sessao.titulo)}</h4>
          <p class="session-desc">${escapeHtml(sessao.descricao)}</p>
          <div class="session-meta">
            <span aria-label="Integrante">🎸 ${escapeHtml(sessao.palestrante)}</span>
            <span aria-label="Local">📍 ${escapeHtml(sessao.palco)}</span>
            ${dur ? `<span aria-label="Duração">⏱ ${dur}</span>` : ''}
          </div>
        </div>
        <button class="session-fav ${favorita ? 'is-fav' : ''}" type="button" data-fav="${escapeHtml(sessao.id)}"
          aria-pressed="${favorita}" aria-label="${favorita ? 'Remover' : 'Adicionar'} “${escapeHtml(sessao.titulo)}” ${favorita ? 'da' : 'à'} sua agenda">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="${favorita ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>
        </button>
      </article>`;
  }

  function renderResumo(lista, dia) {
    const minutos = lista.reduce((total, sessao) => {
      const [h1, m1] = sessao.inicio.split(':').map(Number);
      const [h2, m2] = sessao.fim.split(':').map(Number);
      return total + Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
    }, 0);

    const favoritasDoDia = dados.sessoes.filter((s) => s.dia === diaAtual && favoritos.has(s.id)).length;

    summaryEl.innerHTML = `
      <span><strong>${escapeHtml(dia.label)} · ${escapeHtml(dia.diaSemana)}</strong> — ${escapeHtml(dia.titulo)}</span>
      <span class="sep" aria-hidden="true"></span>
      <span><strong>${lista.length}</strong> ${lista.length === 1 ? 'atração exibida' : 'atrações exibidas'}</span>
      <span class="sep" aria-hidden="true"></span>
      <span><strong>${favoritasDoDia}</strong> na sua agenda</span>
      <span class="sep" aria-hidden="true"></span>
      <span>${formatarCarga(minutos)} de barulho</span>`;
  }

  function renderLista() {
    if (!dados) return;

    const dia = dados.dias.find((d) => d.dia === diaAtual) || dados.dias[0];
    let lista = dados.sessoes.filter((s) => s.dia === diaAtual);
    if (trilhaAtual !== 'all') lista = lista.filter((s) => s.trilha === trilhaAtual);
    if (somenteFavoritos) lista = lista.filter((s) => favoritos.has(s.id));
    lista = lista.slice().sort((a, b) => a.inicio.localeCompare(b.inicio) || a.titulo.localeCompare(b.titulo));

    renderResumo(lista, dia);

    if (!lista.length) {
      const vazioPorFavoritos = somenteFavoritos && favoritos.size === 0;
      listEl.innerHTML = `
        <div class="schedule-empty">
          <div style="font-size:1.8rem;margin-bottom:10px;" aria-hidden="true">${vazioPorFavoritos ? '☆' : '🗓️'}</div>
          <strong>${vazioPorFavoritos ? 'Sua agenda ainda está vazia' : 'Nenhuma atração encontrada'}</strong>
          <p style="margin-bottom:18px;">${vazioPorFavoritos
            ? 'Toque na estrela de qualquer atração para montar a sua agenda personalizada.'
            : 'Não há atrações com os filtros selecionados neste dia. Tente outra combinação.'}</p>
          <button class="btn btn-ghost btn-sm" type="button" data-limpar>Ver todas as atrações</button>
        </div>`;
      return;
    }

    listEl.innerHTML = lista.map((sessao, index) => sessaoHTML(sessao, index)).join('');
    observeReveals(listEl);
  }

  function renderTudo() {
    renderTabs();
    renderFiltros();
    atualizarFiltroFavoritos();
    renderLista();
    if (favCountEl) favCountEl.textContent = String(favoritos.size);
  }

  /* ---------- Eventos ---------- */

  function limparFiltros() {
    trilhaAtual = 'all';
    somenteFavoritos = false;
    atualizarURL();
    renderTudo();
  }

  function alternarFavorito(id) {
    if (!id) return;
    if (favoritos.has(id)) favoritos.delete(id);
    else favoritos.add(id);
    persistirFavoritos();

    if (favCountEl) favCountEl.textContent = String(favoritos.size);

    if (somenteFavoritos) {
      renderLista();
      return;
    }

    const botao = listEl.querySelector(`[data-fav="${id}"]`);
    if (botao) {
      const ativa = favoritos.has(id);
      botao.classList.toggle('is-fav', ativa);
      botao.setAttribute('aria-pressed', String(ativa));
      const svg = botao.querySelector('svg');
      if (svg) svg.setAttribute('fill', ativa ? 'currentColor' : 'none');
      const card = botao.closest('.session');
      if (card) card.classList.toggle('is-fav', ativa);
    }

    const dia = dados.dias.find((d) => d.dia === diaAtual);
    let lista = dados.sessoes.filter((s) => s.dia === diaAtual);
    if (trilhaAtual !== 'all') lista = lista.filter((s) => s.trilha === trilhaAtual);
    renderResumo(lista, dia);
  }

  dayTabsEl.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-dia]');
    if (!tab) return;
    diaAtual = Number(tab.dataset.dia);
    atualizarURL();
    renderTudo();
  });

  filtersEl.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-trilha]');
    if (!chip) return;
    trilhaAtual = chip.dataset.trilha;
    atualizarURL();
    renderTudo();
  });

  if (favFilterEl) {
    favFilterEl.addEventListener('click', () => {
      somenteFavoritos = !somenteFavoritos;
      atualizarFiltroFavoritos();
      renderLista();
    });
  }

  if (clearEl) clearEl.addEventListener('click', limparFiltros);

  listEl.addEventListener('click', (event) => {
    const botaoFav = event.target.closest('[data-fav]');
    if (botaoFav) {
      alternarFavorito(botaoFav.dataset.fav);
      return;
    }
    if (event.target.closest('[data-limpar]')) limparFiltros();
  });

  /* ---------- Carga inicial ---------- */

  try {
    dados = await api('/api/programacao');

    const diaQuery = Number(param('dia'));
    if ([1, 2, 3].includes(diaQuery)) diaAtual = diaQuery;

    const trilhaQuery = param('trilha');
    if (trilhaQuery && dados.trilhas.some((t) => t.slug === trilhaQuery)) trilhaAtual = trilhaQuery;

    renderTudo();

    if (trilhaAtual !== 'all') {
      const nome = trilhaPorSlug(trilhaAtual);
      if (nome) toast(`Mostrando os horários de ${nome.nome}.`, 'info', 3600);
    }
  } catch (error) {
    console.error('[programacao]', error);
    summaryEl.innerHTML = '<span>Não foi possível carregar os horários.</span>';
    listEl.innerHTML = `
      <div class="schedule-empty">
        <strong>Erro ao carregar a agenda</strong>
        <p>${escapeHtml(error.message)}</p>
        <button class="btn btn-ghost btn-sm" type="button" onclick="window.location.reload()">Recarregar página</button>
      </div>`;
    dayTabsEl.innerHTML = '';
    filtersEl.innerHTML = '';
  }
})();
