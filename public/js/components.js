// Componentes reutilizáveis de interface

(function () {
  const { escapeHtml, hexToRgba } = TCS;

  function accentVars(color) {
    return `--accent:${color};--accent-soft:${hexToRgba(color, 0.13)};--accent-line:${hexToRgba(color, 0.42)};`;
  }

  function trilhaCard(trilha, index = 0) {
    const palestrantes = trilha.palestrantes || [];
    const avatars = palestrantes
      .slice(0, 3)
      .map((p) => `<img src="${escapeHtml(p.avatar)}" alt="" width="28" height="28" loading="lazy">`)
      .join('');

    const topicos = (trilha.topicos || [])
      .slice(0, 3)
      .map((t) => `<span class="chip">${escapeHtml(t)}</span>`)
      .join('');

    return `
      <article class="trilha-card reveal" style="${accentVars(trilha.cor)}--d:${index * 70}ms">
        <div class="trilha-card-top">
          <div class="trilha-icon" aria-hidden="true">${escapeHtml(trilha.icone)}</div>
          <div class="session-count"><strong>${trilha.totalSessoes ?? '—'}</strong>shows</div>
        </div>
        <h3><a href="trilha.html?slug=${encodeURIComponent(trilha.slug)}">${escapeHtml(trilha.nome)}</a></h3>
        <p class="trilha-tagline">${escapeHtml(trilha.tagline)}</p>
        <p class="trilha-resumo">${escapeHtml(trilha.resumo)}</p>
        <div class="trilha-topics">${topicos}</div>
        <div class="trilha-card-foot">
          <div class="speaker-mini">
            <div class="avatar-stack" aria-hidden="true">${avatars}</div>
            <span>${palestrantes.length} integrantes</span>
          </div>
          <a class="card-link" href="trilha.html?slug=${encodeURIComponent(trilha.slug)}">
            Explorar <span aria-hidden="true">→</span>
          </a>
        </div>
      </article>
    `;
  }

  function speakerCard(palestrante, index = 0) {
    const tags = (palestrante.tags || [])
      .slice(0, 3)
      .map((t) => `<span class="chip">${escapeHtml(t)}</span>`)
      .join('');

    return `
      <article class="speaker-card reveal" style="${accentVars(palestrante.cor || '#ff2e3f')}--d:${index * 80}ms">
        <img class="speaker-avatar" src="${escapeHtml(palestrante.avatar)}" alt="Ilustração de ${escapeHtml(palestrante.nome)}" width="74" height="74" loading="lazy">
        <div class="speaker-info">
          <h4>${escapeHtml(palestrante.nome)}</h4>
          <div class="speaker-role">${escapeHtml(palestrante.cargo)}</div>
          <div class="speaker-company">${escapeHtml(palestrante.empresa)}</div>
          <div class="chip-list">${tags}</div>
        </div>
      </article>
    `;
  }

  TCS.cards = { trilha: trilhaCard, speaker: speakerCard, accentVars };
})();
