// Ingressos: lotes, formulário e redirecionamento ao checkout simulado

(async function initInscricoes() {
  const { api, $, $$, escapeHtml, formatCurrency, debounce, draft, toast, param } = TCS;

  const grid = $('#loteGrid');
  const statusEl = $('#lotesStatus');
  const form = $('#inscricaoForm');
  const alertEl = $('#formAlert');
  const submitBtn = $('#submitBtn');
  const trilhaSelect = $('#trilha');
  const loteSelect = $('#lote');
  const telefoneInput = $('#telefone');

  let lotes = [];
  let trilhas = [];
  let loteSelecionado = null;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  function precoSeparado(valor) {
    const inteiro = Math.floor(Number(valor) || 0);
    const centavos = Math.round(((Number(valor) || 0) - inteiro) * 100);
    return { inteiro, centavos: String(centavos).padStart(2, '0') };
  }


  function loteHTML(lote, index) {
    const preco = precoSeparado(lote.preco);
    const beneficios = (lote.beneficios || [])
      .map((b) => `
        <li>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
          ${escapeHtml(b)}
        </li>`)
      .join('');

    return `
      <article class="lote-card reveal ${lote.destaque ? 'is-featured' : ''} ${lote.esgotado ? 'is-soldout' : ''} ${loteSelecionado === lote.id ? 'is-selected' : ''}"
        style="--d:${index * 70}ms" data-lote-card="${escapeHtml(lote.id)}">
        <div class="lote-head">
          <span class="lote-name">${escapeHtml(lote.nome)}</span>
          ${lote.esgotado
            ? '<span class="badge badge-danger">Esgotado</span>'
            : lote.destaque
              ? '<span class="badge badge-accent">Mais vendido</span>'
              : `<span class="badge">${lote.restantes} vagas</span>`}
        </div>

        <div class="lote-price" aria-label="${formatCurrency(lote.preco)}">
          <span class="currency">R$</span>
          <span class="amount">${preco.inteiro}</span>
          <span class="cents">,${preco.centavos}</span>
        </div>
        <div class="lote-period">${escapeHtml(lote.periodo)}</div>
        <p class="lote-desc">${escapeHtml(lote.descricao)}</p>

        <ul class="lote-benefits">${beneficios}</ul>

        <div class="lote-progress">
          <div class="lote-progress-head">
            <span>Ocupação do lote</span>
            <span><strong>${lote.vendidos}</strong> / ${lote.capacidade}</span>
          </div>
          <div class="progress" role="progressbar" aria-valuenow="${lote.percentual}" aria-valuemin="0" aria-valuemax="100" aria-label="Ocupação do ${escapeHtml(lote.nome)}">
            <i style="width:${lote.percentual}%"></i>
          </div>
          <div class="lote-progress-head" style="margin-top:6px;">
            <span>${lote.esgotado ? 'Lote encerrado' : `Restam ${lote.restantes} ingressos`}</span>
            <span>${lote.percentual}%</span>
          </div>
        </div>

        <button class="btn ${lote.destaque ? 'btn-primary' : 'btn-ghost'} btn-block" type="button"
          data-select-lote="${escapeHtml(lote.id)}" ${lote.esgotado ? 'disabled' : ''}>
          ${lote.esgotado ? 'Esgotado' : lote.destaque ? 'Garantir este lote' : 'Selecionar lote'}
        </button>
        <p class="lote-note">${lote.esgotado ? 'Escolha outro lote disponível' : 'Pagamento simulado · sem cobrança real'}</p>
      </article>`;
  }

  function renderLotes() {
    grid.innerHTML = lotes.map((lote, index) => loteHTML(lote, index)).join('');
    const disponiveis = lotes.filter((l) => !l.esgotado).length;
    if (statusEl) {
      statusEl.textContent = disponiveis
        ? `${disponiveis} ${disponiveis === 1 ? 'lote disponível' : 'lotes disponíveis'}`
        : 'Todos os lotes esgotados';
      statusEl.className = `badge ${disponiveis ? 'badge-warn' : 'badge-danger'}`;
    }
    TCS.observeReveals(grid);
  }

  function popularSelects() {
    trilhaSelect.innerHTML = '<option value="">Selecione uma banda</option>' + trilhas
      .map((t) => `<option value="${escapeHtml(t.slug)}">${escapeHtml(t.nome)}</option>`)
      .join('');

    loteSelect.innerHTML = '<option value="">Selecione um lote</option>' + lotes
      .map((l) => `<option value="${escapeHtml(l.id)}" ${l.esgotado ? 'disabled' : ''}>${escapeHtml(l.nome)} — ${formatCurrency(l.preco)}${l.esgotado ? ' (esgotado)' : ''}</option>`)
      .join('');
  }

  function atualizarSelecaoVisual() {
    $$('[data-lote-card]').forEach((card) => {
      card.classList.toggle('is-selected', card.dataset.loteCard === loteSelecionado);
    });
    $$('[data-select-lote]').forEach((botao) => {
      const lote = lotes.find((l) => l.id === botao.dataset.selectLote);
      if (!lote || lote.esgotado) return;
      const selecionado = lote.id === loteSelecionado;
      botao.textContent = selecionado ? 'Lote selecionado ✓' : (lote.destaque ? 'Garantir este lote' : 'Selecionar lote');
    });
  }

  function selecionarLote(id, opcoes = {}) {
    const lote = lotes.find((l) => l.id === id);
    if (!lote || lote.esgotado) return;

    loteSelecionado = id;
    loteSelect.value = id;
    atualizarSelecaoVisual();
    limparErro('lote');

    if (opcoes.scroll) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => loteSelect.focus({ preventScroll: true }), 420);
    }
    if (opcoes.toast) toast(`Lote selecionado: ${lote.nome}.`, 'success', 3000);
  }


  function mascaraTelefone(valor) {
    const digitos = String(valor).replace(/\D/g, '').slice(0, 11);
    if (!digitos) return '';
    if (digitos.length <= 2) return `(${digitos}`;
    if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }

  function campo(nome) {
    return form.querySelector(`[name="${nome}"]`);
  }

  function mostrarErro(nome, mensagem) {
    const input = campo(nome);
    const wrapper = input ? input.closest('.field') : null;
    const erro = form.querySelector(`[data-error-for="${nome}"]`);
    if (wrapper) wrapper.classList.add('has-error');
    if (erro) erro.textContent = mensagem;
  }

  function limparErro(nome) {
    const input = campo(nome);
    const wrapper = input ? input.closest('.field') : null;
    const erro = form.querySelector(`[data-error-for="${nome}"]`);
    if (wrapper) wrapper.classList.remove('has-error');
    if (erro) erro.textContent = '';
  }

  function limparTodosErros() {
    $$('.field.has-error', form).forEach((f) => f.classList.remove('has-error'));
    $$('[data-error-for]', form).forEach((e) => { e.textContent = ''; });
    alertEl.classList.remove('is-visible');
    alertEl.innerHTML = '';
  }

  function validar() {
    limparTodosErros();
    const erros = [];

    const nome = campo('nome').value.trim();
    const email = campo('email').value.trim();
    const telefone = campo('telefone').value.replace(/\D/g, '');
    const cidade = campo('cidade').value.trim();
    const trilha = campo('trilha').value;
    const loteId = campo('lote').value;
    const aceite = campo('aceite').checked;

    if (nome.length < 5 || !nome.includes(' ')) {
      mostrarErro('nome', 'Informe seu nome completo (nome e sobrenome).');
      erros.push('nome');
    }
    if (!EMAIL_RE.test(email)) {
      mostrarErro('email', 'Informe um e-mail válido, como voce@exemplo.com.');
      erros.push('email');
    }
    if (telefone.length < 10) {
      mostrarErro('telefone', 'Informe um telefone com DDD.');
      erros.push('telefone');
    }
    if (cidade.length < 2) {
      mostrarErro('cidade', 'Informe sua cidade.');
      erros.push('cidade');
    }
    if (!trilha || !trilhas.some((t) => t.slug === trilha)) {
      mostrarErro('trilha', 'Selecione a banda de maior interesse.');
      erros.push('trilha');
    }
    if (!loteId) {
      mostrarErro('lote', 'Selecione um lote de ingresso.');
      erros.push('lote');
    } else {
      const lote = lotes.find((l) => l.id === loteId);
      if (!lote || lote.esgotado) {
        mostrarErro('lote', 'Este lote está esgotado. Escolha outro disponível.');
        erros.push('lote');
      }
    }
    if (!aceite) {
      mostrarErro('aceite', 'É necessário aceitar o regulamento e a política de privacidade.');
      erros.push('aceite');
    }

    if (erros.length) {
      alertEl.innerHTML = `<strong>Revise ${erros.length === 1 ? 'o campo destacado' : `os ${erros.length} campos destacados`} antes de continuar.</strong>`;
      alertEl.classList.add('is-visible');
      const primeiro = campo(erros[0]);
      if (primeiro) {
        primeiro.focus({ preventScroll: true });
        primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    return true;
  }

  function restaurarRascunho() {
    const salvo = draft.load();
    if (!salvo) return;

    const mapa = ['nome', 'email', 'telefone', 'empresa', 'cidade', 'comoConheceu'];
    mapa.forEach((name) => {
      const input = campo(name);
      if (input && salvo[name]) input.value = salvo[name];
    });

    if (salvo.trilha && trilhas.some((t) => t.slug === salvo.trilha)) trilhaSelect.value = salvo.trilha;
    if (salvo.loteId && lotes.some((l) => l.id === salvo.loteId && !l.esgotado)) {
      selecionarLote(salvo.loteId);
    }
    if (salvo.aceite) campo('aceite').checked = true;
    if (salvo.telefone) telefoneInput.value = mascaraTelefone(salvo.telefone);

    toast('Recuperamos os dados da sua última tentativa de compra.', 'info', 4200);
  }


  if (telefoneInput) {
    telefoneInput.addEventListener('input', () => {
      telefoneInput.value = mascaraTelefone(telefoneInput.value);
    });
  }

  grid.addEventListener('click', (event) => {
    const botao = event.target.closest('[data-select-lote]');
    if (!botao) return;
    selecionarLote(botao.dataset.selectLote, { scroll: true, toast: true });
  });

  loteSelect.addEventListener('change', () => {
    const lote = lotes.find((l) => l.id === loteSelect.value);
    if (lote && !lote.esgotado) {
      loteSelecionado = lote.id;
      atualizarSelecaoVisual();
      limparErro('lote');
    }
  });

  form.addEventListener('input', (event) => {
    const nome = event.target.name;
    if (nome) limparErro(nome);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validar()) return;

    const lote = lotes.find((l) => l.id === campo('lote').value);
    const trilha = trilhas.find((t) => t.slug === campo('trilha').value);

    const dados = {
      nome: campo('nome').value.trim(),
      email: campo('email').value.trim().toLowerCase(),
      telefone: campo('telefone').value.replace(/\D/g, ''),
      empresa: campo('empresa').value.trim(),
      cidade: campo('cidade').value.trim(),
      trilha: campo('trilha').value,
      trilhaNome: trilha ? trilha.nome : '',
      loteId: campo('lote').value,
      loteNome: lote ? lote.nome : '',
      valor: lote ? lote.preco : 0,
      comoConheceu: campo('comoConheceu').value,
      aceite: campo('aceite').checked
    };

    if (!draft.save(dados)) {
      alertEl.innerHTML = '<strong>Não foi possível salvar os dados neste navegador.</strong> Verifique se o armazenamento de sessão está habilitado.';
      alertEl.classList.add('is-visible');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Redirecionando para o pagamento…';
    window.location.href = 'checkout.html';
  });


  try {
    const [lotesRes, trilhasRes] = await Promise.all([api('/api/lotes'), api('/api/trilhas')]);
    lotes = lotesRes.lotes || [];
    trilhas = trilhasRes.trilhas || [];

    popularSelects();
    renderLotes();

    const loteQuery = param('lote');
    const loteInicial = lotes.find((l) => l.id === loteQuery && !l.esgotado)
      || lotes.find((l) => l.destaque && !l.esgotado)
      || lotes.find((l) => !l.esgotado);

    if (loteInicial) selecionarLote(loteInicial.id);

    restaurarRascunho();
  } catch (error) {
    console.error('[inscricoes]', error);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="es-icon" aria-hidden="true">⚠️</div>
        <h3>Não foi possível carregar os lotes</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="btn btn-ghost btn-sm" type="button" onclick="window.location.reload()">Recarregar página</button>
      </div>`;
    if (statusEl) statusEl.textContent = 'Indisponível';
    submitBtn.disabled = true;
  }
})();
