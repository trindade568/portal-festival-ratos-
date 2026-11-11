/* ==========================================================================
   Home — carrega dados reais da API e monta as seções dinâmicas
   ========================================================================== */

(async function initHome() {
  const { api, $, escapeHtml, observeReveals } = TCS;

  const trilhasEl = $('#trilhasPreview');
  const keynoteEl = $('#keynoteGrid');
  const diasEl = $('#diasGrid');
  const sponsorEl = $('#sponsorTrack');

  function fail(container, message) {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="es-icon" aria-hidden="true">⚠️</div>
        <h3>Não foi possível carregar esta seção</h3>
        <p>${escapeHtml(message)}</p>
        <a class="btn btn-ghost btn-sm" href="index.html">Tentar novamente</a>
      </div>`;
  }

  try {
    const [eventoRes, trilhasRes, programacaoRes] = await Promise.all([
      api('/api/evento'),
      api('/api/trilhas'),
      api('/api/programacao')
    ]);

    /* ---------- Patrocinadores ---------- */
    if (sponsorEl) {
      const nomes = (eventoRes.evento.patrocinadores || []).map((p) => p.nome);
      const group = nomes.map((nome) => `<span class="marquee-item">${escapeHtml(nome)}</span>`).join('');
      sponsorEl.innerHTML = `${group}<span aria-hidden="true" style="display:contents">${group}</span>`;
    }

    /* ---------- Line-up em destaque ---------- */
    if (trilhasEl) {
      trilhasEl.innerHTML = trilhasRes.trilhas
        .map((trilha, index) => TCS.cards.trilha(trilha, index))
        .join('');
    }

    /* ---------- Keynotes ---------- */
    if (keynoteEl) {
      const destaques = [];
      trilhasRes.trilhas.forEach((trilha) => {
        (trilha.palestrantes || []).forEach((p) => {
          destaques.push({ ...p, cor: p.cor || trilha.cor, trilha: trilha.nome });
        });
      });

      const selecionados = [
        destaques.find((p) => p.nome === 'João Gordo'),
        destaques.find((p) => p.nome === 'Jão'),
        destaques.find((p) => p.nome === 'Vera Vidro'),
        destaques.find((p) => p.nome === 'Bruna Brasa')
      ].filter(Boolean);

      keynoteEl.innerHTML = selecionados
        .slice(0, 4)
        .map((p, index) => TCS.cards.speaker(p, index))
        .join('');
    }

    /* ---------- Dias ---------- */
    if (diasEl) {
      const sessoes = programacaoRes.sessoes || [];
      diasEl.innerHTML = programacaoRes.dias
        .map((dia, index) => {
          const total = sessoes.filter((s) => s.dia === dia.dia).length;
          return `
            <article class="day-card reveal" style="--d:${index * 90}ms">
              <div class="day-card-top">
                <span class="day-num">0${dia.dia}</span>
                <span class="badge">${escapeHtml(dia.label)} · ${escapeHtml(dia.diaSemana)}</span>
              </div>
              <h3>${escapeHtml(dia.titulo)}</h3>
              <p>${escapeHtml(dia.descricao)}</p>
              <div class="day-card-foot">
                <span><strong>${total}</strong> atrações</span>
                <a class="card-link" href="programacao.html?dia=${dia.dia}">Ver dia <span aria-hidden="true">→</span></a>
              </div>
            </article>`;
        })
        .join('');
    }

    observeReveals();
  } catch (error) {
    const message = error.message || 'Verifique se o servidor está ativo na porta 2000.';
    fail(trilhasEl, message);
    fail(keynoteEl, message);
    fail(diasEl, message);
    if (sponsorEl) sponsorEl.innerHTML = '';
    console.error('[home]', error);
  }
})();
