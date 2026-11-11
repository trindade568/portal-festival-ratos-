// Produção: equipe do festival e informações acadêmicas

(async function initQuemSomos() {
  const { api, $, escapeHtml, hexToRgba, toast } = TCS;

  const grid = $('#teamGrid');

  function accentVars(color) {
    return `--accent:${color};--accent-soft:${hexToRgba(color, 0.13)};--accent-line:${hexToRgba(color, 0.42)};`;
  }

  function memberCard(membro, index) {
    const tecnologias = (membro.tecnologias || [])
      .map((tec) => `<span class="chip">${escapeHtml(tec)}</span>`)
      .join('');

    const contribuicoes = (membro.contribuicoes || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');

    const links = membro.links || {};
    const linkItems = [
      links.github ? `<a href="${escapeHtml(links.github)}" target="_blank" rel="noopener" aria-label="GitHub de ${escapeHtml(membro.nome)}">GitHub</a>` : '',
      links.linkedin ? `<a href="${escapeHtml(links.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn de ${escapeHtml(membro.nome)}">LinkedIn</a>` : ''
    ].filter(Boolean).join('');

    return `
      <article class="member-card reveal" style="${accentVars(membro.cor || '#ff2e3f')}--d:${index * 70}ms">
        <div class="member-photo">
          <img src="${escapeHtml(membro.foto)}" alt="Ilustração de ${escapeHtml(membro.nome)}" width="420" height="345" loading="lazy">
          <span class="member-ra">RA ${escapeHtml(membro.ra)}</span>
        </div>
        <div class="member-body">
          <h3>${escapeHtml(membro.nome)}</h3>
          <div class="member-role">${escapeHtml(membro.funcao)}</div>
          <p class="member-bio">${escapeHtml(membro.resumo)}</p>

          <div class="chip-list">${tecnologias}</div>

          ${contribuicoes ? `
            <div class="member-contrib">
              <h4>Contribuições no projeto</h4>
              <ul>${contribuicoes}</ul>
            </div>` : ''}

          ${linkItems ? `<div class="member-links">${linkItems}</div>` : ''}
        </div>
      </article>`;
  }

  try {
    const { equipe } = await api('/api/equipe');

    if (!Array.isArray(equipe) || !equipe.length) {
      throw new Error('Nenhum integrante foi encontrado.');
    }

    grid.innerHTML = equipe.map((membro, index) => memberCard(membro, index)).join('');
    TCS.observeReveals(grid);
  } catch (error) {
    console.error('[quem-somos]', error);
    toast(error.message, 'error', 6000);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="es-icon" aria-hidden="true">⚠️</div>
        <h3>Não foi possível carregar a equipe</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="btn btn-ghost btn-sm" type="button" onclick="window.location.reload()">Recarregar página</button>
      </div>`;
  }
})();
