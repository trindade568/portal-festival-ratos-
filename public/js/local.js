/* ==========================================================================
   Local & infraestrutura — mapa interativo, palcos, setores e serviços
   ========================================================================== */

(async function initLocal() {
  const { api, $, escapeHtml, hexToRgba, toast } = TCS;

  const metaEl = $('#localMeta');
  const mapEl = $('#venueMap');
  const legendEl = $('#mapLegend');
  const detailEl = $('#zoneDetail');
  const noteEl = $('#mapNote');
  const horariosEl = $('#horariosList');
  const palcosEl = $('#palcosGrid');
  const setoresEl = $('#setoresGrid');
  const comoChegarEl = $('#comoChegarGrid');
  const acessibilidadeEl = $('#acessibilidadeList');
  const servicosEl = $('#servicosGrid');

  /* Layout fixo da planta (coordenadas em um viewBox 900 x 580) */
  const LAYOUT = {
    orion: { x: 30, y: 30, w: 360, h: 150 },
    nebula: { x: 410, y: 30, w: 220, h: 150 },
    pulsar: { x: 650, y: 30, w: 220, h: 150 },
    feira: { x: 30, y: 200, w: 360, h: 150 },
    lab1: { x: 410, y: 200, w: 105, h: 150 },
    lab2: { x: 525, y: 200, w: 105, h: 150 },
    alimentacao: { x: 650, y: 200, w: 220, h: 150 },
    hackathon: { x: 30, y: 370, w: 170, h: 150 },
    carreiras: { x: 220, y: 370, w: 170, h: 150 },
    lounge: { x: 410, y: 370, w: 220, h: 150 },
    foyer: { x: 650, y: 370, w: 220, h: 150 }
  };

  const ICONS = {
    orion: '🎸',
    nebula: '🎤',
    pulsar: '🥁',
    lab1: '🖤',
    lab2: '🧥',
    feira: '💿',
    carreiras: '🥃',
    alimentacao: '🍔',
    lounge: '🎮',
    hackathon: '⚡',
    foyer: '🎟️'
  };

  let zonas = [];

  function accentVars(color) {
    return `--accent:${color};--accent-soft:${hexToRgba(color, 0.13)};--accent-line:${hexToRgba(color, 0.42)};`;
  }

  function checkIcon() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  }

  /* ---------- Cabeçalho: metadados e horários ---------- */

  function renderMeta(local) {
    const itens = [
      { label: 'Endereço', valor: local.endereco },
      { label: 'Cidade / CEP', valor: `${local.cidade} · ${local.cep}` },
      { label: 'Área total', valor: local.area },
      { label: 'Capacidade', valor: local.capacidade }
    ];

    metaEl.innerHTML = itens.map((item) => `
      <div class="local-meta reveal">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.valor)}</strong>
      </div>`).join('');
  }

  function renderHorarios(horarios) {
    horariosEl.innerHTML = (horarios || []).map((h) => `
      <div class="summary-row">
        <span>${escapeHtml(h.dia)}</span>
        <span>${escapeHtml(h.abertura)} — ${escapeHtml(h.fechamento)}</span>
      </div>`).join('');
  }

  /* ---------- Mapa interativo ---------- */

  function renderLegend(legenda) {
    legendEl.innerHTML = (legenda || []).map((item) => `
      <span class="legend-item">
        <i style="background:${escapeHtml(item.cor)}" aria-hidden="true"></i>
        ${escapeHtml(item.nome)}
      </span>`).join('');
  }

  function zoneLabelMarkup(zona, box) {
    const nome = zona.nome;
    const small = box.w < 140;
    const lines = small && nome.includes('·')
      ? nome.split('·').map((part) => part.trim())
      : [nome];
    const cx = box.x + box.w / 2;

    if (lines.length > 1) {
      const firstY = box.y + box.h / 2 - 14;
      const secondY = firstY + 16;
      return `
        <text x="${cx}" y="${firstY}" text-anchor="middle" class="map-label" style="font-size:12px;">${escapeHtml(lines[0])}</text>
        <text x="${cx}" y="${secondY}" text-anchor="middle" class="map-label" style="font-size:12px;">${escapeHtml(lines[1])}</text>
        <text x="${cx}" y="${secondY + 18}" text-anchor="middle" class="map-sublabel">${escapeHtml(zona.capacidade)}</text>`;
    }

    const nameY = box.y + box.h / 2 - 6;
    return `
      <text x="${cx}" y="${nameY}" text-anchor="middle" class="map-label" style="${small ? 'font-size:12px;' : ''}">${escapeHtml(nome)}</text>
      <text x="${cx}" y="${nameY + 20}" text-anchor="middle" class="map-sublabel">${escapeHtml(zona.capacidade)}</text>`;
  }

  function renderMap() {
    const zonesMarkup = zonas.map((zona) => {
      const box = LAYOUT[zona.id];
      if (!box) return '';
      const active = false;
      return `
        <g class="map-zone${active ? ' is-active' : ''}" data-zone="${escapeHtml(zona.id)}" tabindex="0" role="button"
          aria-label="${escapeHtml(`${zona.nome}, ${zona.tipo}, ${zona.capacidade}`)}">
          <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="11"
            fill="${hexToRgba(zona.cor, 0.16)}" stroke="${hexToRgba(zona.cor, 0.55)}" stroke-width="1.4"></rect>
          <text x="${box.x + 12}" y="${box.y + 21}" style="font-size:13px;" aria-hidden="true">${ICONS[zona.id] || '📍'}</text>
          ${zoneLabelMarkup(zona, box)}
        </g>`;
    }).join('');

    mapEl.innerHTML = `
      <defs>
        <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0H0V30" fill="none" stroke="rgba(255,255,255,0.045)" stroke-width="1"></path>
        </pattern>
      </defs>
      <rect width="900" height="580" fill="url(#mapGrid)"></rect>
      <rect x="14" y="14" width="872" height="500" rx="18" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"></rect>
      <text x="30" y="548" class="map-entrance">PISO TÉRREO</text>
      <text x="870" y="548" text-anchor="end" class="map-entrance">ENTRADA PRINCIPAL ↓</text>
      <line x1="760" y1="520" x2="760" y2="536" stroke="rgba(223,230,245,0.4)" stroke-width="1.4" stroke-dasharray="3 3"></line>
      ${zonesMarkup}
      <g transform="translate(852 480)" aria-hidden="true">
        <circle r="14" fill="rgba(5,6,11,0.6)" stroke="rgba(255,255,255,0.12)"></circle>
        <path d="M0 -7 4 4 0 2 -4 4Z" fill="#dfe6f5"></path>
      </g>`;
  }

  function renderDetail(zona) {
    detailEl.style.cssText = accentVars(zona.cor);
    detailEl.innerHTML = `
      <div class="zd-icon" aria-hidden="true">${ICONS[zona.id] || '📍'}</div>
      <h3>${escapeHtml(zona.nome)}</h3>
      <div class="zd-type">${escapeHtml(zona.tipo)}</div>
      <span class="zd-cap"><span aria-hidden="true">👥</span> ${escapeHtml(zona.capacidade)}</span>
      <p>${escapeHtml(zona.descricao)}</p>
      <div class="chip-list">
        ${(zona.recursos || []).map((r) => `<span class="chip">${escapeHtml(r)}</span>`).join('')}
      </div>`;
  }

  function selectZone(id) {
    const zona = zonas.find((z) => z.id === id);
    if (!zona) return;
    mapEl.querySelectorAll('.map-zone').forEach((group) => {
      group.classList.toggle('is-active', group.dataset.zone === id);
    });
    renderDetail(zona);
  }

  function bindMap() {
    mapEl.addEventListener('click', (event) => {
      const group = event.target.closest('.map-zone');
      if (group) selectZone(group.dataset.zone);
    });

    mapEl.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const group = event.target.closest('.map-zone');
      if (!group) return;
      event.preventDefault();
      selectZone(group.dataset.zone);
    });
  }

  /* ---------- Palcos, setores, transporte e serviços ---------- */

  function renderPalcos(palcos) {
    palcosEl.innerHTML = palcos.map((palco, index) => {
      const icon = /bar/i.test(palco.nome) ? '🍺' : /arena|externa/i.test(palco.nome) ? '🔊' : '🎸';
      const recursos = (palco.recursos || []).map((r) => `<span class="chip">${escapeHtml(r)}</span>`).join('');
      return `
        <article class="info-card reveal" style="${accentVars(palco.cor)}--d:${index * 60}ms;border-left:3px solid ${palco.cor};">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div class="ic-icon" aria-hidden="true">${icon}</div>
            <span class="badge badge-accent">${escapeHtml(palco.capacidade)} lugares</span>
          </div>
          <h4>${escapeHtml(palco.nome)}</h4>
          <p>${escapeHtml(palco.descricao)}</p>
          <div class="chip-list" style="margin-top:14px;">${recursos}</div>
        </article>`;
    }).join('');
  }

  function renderSetores(setores) {
    setoresEl.innerHTML = setores.map((setor, index) => `
      <article class="info-card reveal" style="--d:${index * 50}ms">
        <div class="ic-icon" aria-hidden="true">${escapeHtml(setor.icone)}</div>
        <h4>${escapeHtml(setor.nome)}</h4>
        <p>${escapeHtml(setor.descricao)}</p>
      </article>`).join('');
  }

  function renderComoChegar(itens) {
    comoChegarEl.innerHTML = itens.map((item, index) => `
      <article class="info-card reveal" style="--d:${index * 60}ms">
        <div class="ic-icon" aria-hidden="true">${escapeHtml(item.icone)}</div>
        <h4>${escapeHtml(item.titulo)}</h4>
        <p>${escapeHtml(item.texto)}</p>
      </article>`).join('');
  }

  function renderAcessibilidade(itens) {
    acessibilidadeEl.innerHTML = itens.map((item) => `
      <li>${checkIcon()}<span>${escapeHtml(item)}</span></li>`).join('');
  }

  function renderServicos(servicos) {
    servicosEl.innerHTML = servicos.map((servico, index) => `
      <article class="info-card reveal" style="--d:${index * 50}ms">
        <div class="ic-icon" aria-hidden="true">${escapeHtml(servico.icone)}</div>
        <h4>${escapeHtml(servico.nome)}</h4>
        <p>${escapeHtml(servico.texto)}</p>
      </article>`).join('');
  }

  /* ---------- Carga inicial ---------- */

  try {
    const { local } = await api('/api/local');

    document.title = `${local.nome} — Local & estrutura · Ratos de Porão · 45 Anos de Barulho`;

    renderMeta(local);
    renderHorarios(local.horarios);
    renderLegend(local.mapa && local.mapa.legenda);
    renderPalcos(local.palcos || []);
    renderSetores(local.setores || []);
    renderComoChegar(local.comoChegar || []);
    renderAcessibilidade(local.acessibilidade || []);
    renderServicos(local.servicos || []);

    zonas = (local.mapa && local.mapa.zonas) || [];
    renderMap();
    bindMap();

    if (noteEl && local.mapa && local.mapa.observacao) noteEl.textContent = local.mapa.observacao;
    if (zonas.length) selectZone(zonas[0].id);

    TCS.observeReveals();
  } catch (error) {
    console.error('[local]', error);
    toast(error.message, 'error', 6000);
    if (noteEl) noteEl.textContent = 'Não foi possível carregar o mapa interativo. Recarregue a página para tentar novamente.';
    [palcosEl, setoresEl, comoChegarEl, servicosEl].forEach((container) => {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="es-icon" aria-hidden="true">⚠️</div>
          <h3>Conteúdo indisponível</h3>
          <p>${escapeHtml(error.message)}</p>
          <button class="btn btn-ghost btn-sm" type="button" onclick="window.location.reload()">Recarregar página</button>
        </div>`;
    });
  }
})();
