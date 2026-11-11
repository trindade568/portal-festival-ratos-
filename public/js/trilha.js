// Banda: detalhe individual com integrantes e shows

(async function initTrilha() {
  const { api, $, escapeHtml, hexToRgba, observeReveals, param } = TCS;

  const slug = param('slug');
  if (!slug) {
    window.location.replace('trilhas.html');
    return;
  }

  const heroSection = $('#trilhaHero');
  const heroContent = $('#trilhaHeroContent');
  const crumb = $('#crumbName');
  const main = $('#trilhaMain');
  const side = $('#trilhaSide');

  const TYPE_LABELS = {
    portoes: 'Portões',
    feira: 'Feira',
    show: 'Show',
    showPrincipal: 'Headliner',
    'show-principal': 'Headliner',
    meetGreet: 'Meet & Greet',
    'meet-greet': 'Meet & Greet',
    dj: 'DJ',
    intervalo: 'Intervalo',
    cerimonia: 'Cerimônia',
    afterparty: 'Afterparty',
    encerramento: 'Encerramento'
  };

  function showError(message) {
    if (crumb) crumb.textContent = 'Banda não encontrada';
    if (heroContent) {
      heroContent.innerHTML = `
        <h1 style="margin-top:10px;">Banda não encontrada</h1>
        <p class="lead">${escapeHtml(message)}</p>
        <div class="hero-cta"><a class="btn btn-primary" href="trilhas.html">Ver o line-up completo</a></div>`;
    }
    if (main) main.innerHTML = '';
    if (side) side.innerHTML = '';
  }

  try {
    const [detail, lista] = await Promise.all([
      api(`/api/trilhas/${encodeURIComponent(slug)}`),
      api('/api/trilhas')
    ]);

    const { trilha, sessoes, dias } = detail;
    const accent = trilha.cor;
    const vars = `--accent:${accent};--accent-soft:${hexToRgba(accent, 0.13)};--accent-line:${hexToRgba(accent, 0.42)};`;

    document.title = `${trilha.nome} — Ratos de Porão · 45 Anos de Barulho`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', trilha.resumo);

    if (heroSection) heroSection.setAttribute('style', vars);
    if (crumb) crumb.textContent = trilha.nome;

    if (heroContent) {
      heroContent.innerHTML = `
        <div class="trilha-hero-head">
          <div class="trilha-hero-icon" aria-hidden="true">${escapeHtml(trilha.icone)}</div>
          <div>
            <span class="eyebrow">Banda do line-up</span>
            <h1>${escapeHtml(trilha.nome)}</h1>
            <p class="trilha-hero-tagline">${escapeHtml(trilha.tagline)}</p>
          </div>
        </div>
        <p class="lead">${escapeHtml(trilha.resumo)}</p>
        <div class="page-hero-meta">
          <span class="pill">${escapeHtml(trilha.nivel)}</span>
          <span class="pill">${sessoes.length} shows no festival</span>
          <span class="pill">${trilha.palestrantes.length} integrantes</span>
          <span class="pill">Acesso com qualquer ingresso</span>
        </div>
        <div class="hero-cta">
          <a class="btn btn-primary" href="inscricoes.html">Garantir ingresso</a>
          <a class="btn btn-ghost" href="programacao.html?trilha=${encodeURIComponent(trilha.slug)}">Ver nos horários</a>
        </div>`;
    }

    if (main) {
      const topicos = (trilha.topicos || [])
        .map((topico, index) => `
          <div class="topic-item">
            <span class="num">${String(index + 1).padStart(2, '0')}</span>
            <span>${escapeHtml(topico)}</span>
          </div>`)
        .join('');

      const palestrantes = trilha.palestrantes
        .map((p) => `
          <article class="speaker-detail" style="${vars}">
            <img src="${escapeHtml(p.avatar)}" alt="Ilustração de ${escapeHtml(p.nome)}" width="120" height="120" loading="lazy">
            <div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <h4>${escapeHtml(p.nome)}</h4>
                ${p.destaque ? '<span class="badge badge-accent">Destaque</span>' : ''}
              </div>
              <p class="role">${escapeHtml(p.cargo)} · ${escapeHtml(p.empresa)}</p>
              <p class="bio">${escapeHtml(p.bio)}</p>
              <div class="chip-list">${(p.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}</div>
            </div>
          </article>`)
        .join('');

      const porDia = new Map();
      sessoes.forEach((sessao) => {
        if (!porDia.has(sessao.dia)) porDia.set(sessao.dia, []);
        porDia.get(sessao.dia).push(sessao);
      });

      const programacao = Array.from(porDia.entries())
        .map(([diaNumero, listaDia]) => {
          const dia = dias.find((d) => d.dia === diaNumero) || { label: `Dia ${diaNumero}`, titulo: '' };
          const itens = listaDia
            .sort((a, b) => a.inicio.localeCompare(b.inicio))
            .map((sessao) => `
              <div class="mini-session">
                <div class="ms-time">
                  <span class="ms-day">${escapeHtml(dia.label)}</span>
                  ${escapeHtml(sessao.inicio)} – ${escapeHtml(sessao.fim)}
                </div>
                <div>
                  <h4>${escapeHtml(sessao.titulo)}</h4>
                  <p>${escapeHtml(sessao.palestrante)} · ${escapeHtml(sessao.palco)}</p>
                </div>
              </div>`)
            .join('');

          return `
            <div class="schedule-day-title">
              <h3>${escapeHtml(dia.label)} · ${escapeHtml(dia.diaSemana)}</h3>
              <span>${escapeHtml(dia.titulo)}</span>
            </div>
            ${itens}`;
        })
        .join('');

      const destaques = (trilha.destaques || [])
        .map((item) => `
          <li>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
            ${escapeHtml(item)}
          </li>`)
        .join('');

      main.innerHTML = `
        <section class="detail-block reveal" style="${vars}">
          <span class="eyebrow">Sobre a banda</span>
          <h2 style="margin-top:10px;">O que vai rolar</h2>
          <p>${escapeHtml(trilha.descricao)}</p>
          <div class="topic-grid">${topicos}</div>
        </section>

        <section class="detail-block reveal" style="${vars};--d:80ms">
          <span class="eyebrow">No palco</span>
          <h2 style="margin-top:10px;">Integrantes</h2>
          <p>Quem sobe ao palco e faz o barulho acontecer — direto, sem roteiro e sem enfeite.</p>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:22px;">${palestrantes}</div>
        </section>

        <section class="detail-block reveal" style="${vars};--d:120ms">
          <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;">
            <div>
              <span class="eyebrow">Na grade</span>
              <h2 style="margin-top:10px;margin-bottom:0;">Agenda da banda</h2>
            </div>
            <a class="link-arrow" href="programacao.html?trilha=${encodeURIComponent(trilha.slug)}">Ver grade completa <span aria-hidden="true">→</span></a>
          </div>
          <div style="margin-top:20px;">${programacao || '<p>Agenda em breve.</p>'}</div>
        </section>

        <section class="detail-block reveal" style="${vars};--d:160ms">
          <span class="eyebrow">O que você leva</span>
          <h2 style="margin-top:10px;">Destaques desta banda</h2>
          <ul class="highlight-list">${destaques}</ul>
        </section>`;
    }

    if (side) {
      const outras = (lista.trilhas || []).filter((t) => t.slug !== trilha.slug);
      side.innerHTML = `
        <div class="side-card reveal" style="${vars}">
          <h3>Em resumo</h3>
          <div class="side-row"><span>Nível</span><strong>${escapeHtml(trilha.nivel)}</strong></div>
          <div class="side-row"><span>Atrações</span><strong>${sessoes.length}</strong></div>
          <div class="side-row"><span>Integrantes</span><strong>${trilha.palestrantes.length}</strong></div>
          <div class="side-row"><span>Formato</span><strong>Shows ao vivo</strong></div>
          <div class="side-row"><span>Acesso</span><strong>Qualquer ingresso</strong></div>
        </div>

        <div class="side-card reveal" style="--d:80ms">
          <h3>Garanta seu lugar</h3>
          <p class="small muted" style="margin-bottom:16px;">Um ingresso dá acesso a todas as bandas, aos três dias e à feira de vinil e merch.</p>
          <a class="btn btn-primary btn-block" href="inscricoes.html">Ver ingressos</a>
          <p class="form-note" style="text-align:center;margin-top:10px;">A partir de R$ 120</p>
        </div>

        <div class="side-card reveal" style="--d:160ms">
          <h3>Outras bandas</h3>
          <div class="other-trilhas">
            ${outras.map((t) => `
              <a href="trilha.html?slug=${encodeURIComponent(t.slug)}" style="--accent:${t.cor};--accent-soft:${hexToRgba(t.cor, 0.13)};--accent-line:${hexToRgba(t.cor, 0.4)};">
                <span class="ot-icon" aria-hidden="true">${escapeHtml(t.icone)}</span>
                <span>${escapeHtml(t.nome)}</span>
              </a>`).join('')}
          </div>
        </div>`;
    }

    observeReveals();
  } catch (error) {
    console.error('[trilha]', error);
    showError(error.status === 404 ? 'Não encontramos uma banda com este endereço. Ela pode ter saído do line-up ou o link pode estar desatualizado.' : error.message);
  }
})();
