// Checkout simulado: resumo do pedido, pagamento e confirmação da compra

(function initCheckout() {
  const {
    $, $$, api, escapeHtml, formatCurrency, copyText, draft, toast
  } = TCS;

  const root = $('#checkoutRoot');
  const successRoot = $('#successRoot');
  const stepsEl = $('.checkout-steps');
  const stepPay = $('#stepPay');
  const stepDone = $('#stepDone');
  const form = $('#checkoutForm');
  const summaryCard = $('#summaryCard');
  const alertEl = $('#checkoutAlert');
  const payBtn = $('#payBtn');
  const payBtnLabel = $('#payBtnLabel');
  const processing = $('#processing');
  const tabs = $$('.pay-method');
  const panels = $$('.pay-panel');

  const dados = draft.load();

  const METHOD_LABELS = {
    pix: 'PIX',
    cartao: 'Cartão de crédito',
    boleto: 'Boleto bancário'
  };

  let metodo = 'pix';
  let pixCode = '';

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


  if (!dados) {
    if (stepsEl) stepsEl.hidden = true;
    root.innerHTML = `
      <div class="form-card">
        <div class="empty-state" style="padding:24px 0;">
          <div class="es-icon" aria-hidden="true">🎟️</div>
          <h3>Nenhuma compra em andamento</h3>
          <p>Não encontramos os dados da sua compra neste navegador. Preencha o formulário para escolher um lote e seguir ao pagamento.</p>
          <a class="btn btn-primary" href="inscricoes.html">Ir para o formulário de compra</a>
          <p class="form-note" style="margin-top:18px;">Seus dados ficam salvos apenas durante esta sessão do navegador.</p>
        </div>
      </div>`;
    return;
  }


  const total = Number(dados.valor) || 0;

  function renderSummary() {
    summaryCard.innerHTML = `
      <h3>Resumo do pedido</h3>
      <div class="summary-row"><span>Participante</span><span>${escapeHtml(dados.nome)}</span></div>
      <div class="summary-row"><span>E-mail</span><span style="word-break:break-word;">${escapeHtml(dados.email)}</span></div>
      <div class="summary-row"><span>Lote</span><span>${escapeHtml(dados.loteNome || dados.loteId)}</span></div>
      <div class="summary-row"><span>Banda de maior interesse</span><span>${escapeHtml(dados.trilhaNome || dados.trilha)}</span></div>
      <div class="summary-row"><span>Forma de pagamento</span><span id="summaryMethod">${escapeHtml(METHOD_LABELS[metodo])}</span></div>
      <div class="summary-row"><span>Taxas</span><span>Grátis</span></div>
      <div class="summary-total"><span>Total</span><strong>${formatCurrency(total)}</strong></div>
      <p class="summary-note">Ingresso individual com acesso às três noites do festival, credencial colecionável e copo oficial.</p>
      <a class="btn btn-ghost btn-sm btn-block" href="inscricoes.html" style="margin-top:18px;">Editar dados</a>
      <div class="info-banner" style="margin-top:18px;padding:12px 14px;font-size:0.72rem;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3 3 7v5c0 5 4 8.5 9 9 5-.5 9-4 9-9V7z"/><path d="m9 12 2 2 4-4"/></svg>
        <div><strong>Ambiente seguro.</strong> Nenhum dado de cartão é enviado ou armazenado.</div>
      </div>`;
  }

  renderSummary();


  function hashSeed(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed;
    return function random() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fakeQrSvg(seedText) {
    const size = 25;
    const random = mulberry32(hashSeed(seedText));
    const grid = Array.from({ length: size }, () => Array(size).fill(false));

    function finder(ox, oy) {
      for (let y = 0; y < 7; y += 1) {
        for (let x = 0; x < 7; x += 1) {
          const border = x === 0 || y === 0 || x === 6 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          grid[oy + y][ox + x] = border || core;
        }
      }
    }

    finder(0, 0);
    finder(size - 7, 0);
    finder(0, size - 7);

    const reserved = (x, y) => {
      const inFinder = (ox, oy) => x >= ox - 1 && x <= ox + 7 && y >= oy - 1 && y <= oy + 7;
      return inFinder(0, 0) || inFinder(size - 7, 0) || inFinder(0, size - 7);
    };

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (reserved(x, y)) continue;
        const timing = (x === 6 || y === 6) && (x + y) % 2 === 0;
        grid[y][x] = timing || random() > 0.52;
      }
    }

    let cells = '';
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (grid[y][x]) cells += `<rect x="${x + 2}" y="${y + 2}" width="1" height="1" rx="0.18"/>`;
      }
    }

    return `<svg viewBox="0 0 29 29" width="100%" height="100%" role="img" aria-label="QR Code simulado">
      <rect width="29" height="29" fill="#ffffff"/>
      <g fill="#141016">${cells}</g>
    </svg>`;
  }

  function buildPixCode() {
    const stamp = Date.now().toString(36).toUpperCase().slice(-6);
    const valor = total.toFixed(2).padStart(6, '0');
    const crc = hashSeed(`${dados.email}-${stamp}`).toString(16).toUpperCase().slice(0, 4).padStart(4, '0');
    const merchant = '45 ANOS DE BARULHO';
    const city = 'SAO PAULO';
    return `00020126580014BR.GOV.BCB.PIX0136rdp26-${stamp.toLowerCase()}-${hashSeed(dados.email).toString(16)}52040000530398654${valor}5802BR59${String(merchant.length).padStart(2, '0')}${merchant}60${String(city.length).padStart(2, '0')}${city}62070503***6304${crc}`;
  }

  pixCode = buildPixCode();
  const pixQr = $('#pixQr');
  if (pixQr) pixQr.innerHTML = fakeQrSvg(`${dados.email}-${total}`);
  const pixCodeEl = $('#pixCode');
  if (pixCodeEl) pixCodeEl.textContent = pixCode;

  const boletoLinha = $('#boletoLinha');
  if (boletoLinha) {
    const base = hashSeed(dados.email).toString().padEnd(20, '7');
    boletoLinha.textContent = `34191.${base.slice(0, 5)} 01043.${base.slice(5, 11)} 91020.${base.slice(11, 17)} 8 ${hashSeed(dados.nome).toString().slice(0, 14)}`;
  }

  const copyPixBtn = $('#copyPix');
  if (copyPixBtn) copyPixBtn.addEventListener('click', () => copyText(pixCode));


  function selectMethod(next) {
    if (!METHOD_LABELS[next]) return;
    metodo = next;

    tabs.forEach((tab) => {
      const active = tab.dataset.method === next;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    panels.forEach((panel) => {
      const active = panel.id === `panel${next.charAt(0).toUpperCase()}${next.slice(1)}`;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    const labels = {
      pix: 'Confirmar compra com PIX',
      cartao: 'Confirmar pagamento',
      boleto: 'Gerar boleto e confirmar'
    };
    payBtnLabel.textContent = labels[next];

    const summaryMethod = $('#summaryMethod');
    if (summaryMethod) summaryMethod.textContent = METHOD_LABELS[next];

    const cardFields = ['cardNome', 'cardNumero', 'cardValidade', 'cardCvv'];
    if (next !== 'cartao') cardFields.forEach((name) => clearError(name));
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectMethod(tab.dataset.method));

    tab.addEventListener('keydown', (event) => {
      const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      let target = index;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      tabs[target].focus();
      selectMethod(tabs[target].dataset.method);
    });
  });

  // começa só com o painel ativo aberto
  panels.forEach((panel) => { panel.hidden = !panel.classList.contains('is-active'); });


  const cardNumero = $('#cardNumero');
  const cardValidade = $('#cardValidade');
  const cardCvv = $('#cardCvv');
  const cardNome = $('#cardNome');
  const parcelas = $('#parcelas');
  const cardBrandHint = $('#cardBrandHint');
  const parcelHint = $('#parcelHint');

  function digits(value) {
    return String(value).replace(/\D/g, '');
  }

  function maskNumero(value) {
    return digits(value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  function maskValidade(value) {
    const d = digits(value).slice(0, 4);
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}/${d.slice(2)}`;
  }

  if (cardNumero) {
    cardNumero.addEventListener('input', () => {
      cardNumero.value = maskNumero(cardNumero.value);
      const d = digits(cardNumero.value);
      let brand = 'Cartão';
      if (/^4/.test(d)) brand = 'Visa';
      else if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) brand = 'Mastercard';
      else if (/^6/.test(d)) brand = 'Elo';
      if (cardBrandHint) {
        cardBrandHint.textContent = d.length >= 4
          ? `Bandeira identificada: ${brand} (simulação).`
          : 'Aceitamos Visa, Mastercard e Elo (simulação).';
      }
    });
  }

  if (cardValidade) {
    cardValidade.addEventListener('input', () => {
      cardValidade.value = maskValidade(cardValidade.value);
    });
  }

  if (cardCvv) {
    cardCvv.addEventListener('input', () => {
      cardCvv.value = digits(cardCvv.value).slice(0, 4);
    });
  }

  function atualizarParcelas() {
    if (!parcelas || !parcelHint) return;
    const n = Number(parcelas.value) || 1;
    if (n === 1) {
      parcelHint.textContent = `1x de ${formatCurrency(total)} à vista, sem juros.`;
    } else {
      parcelHint.textContent = `${n}x de ${formatCurrency(total / n)} sem juros (simulação).`;
    }
  }

  if (parcelas) {
    parcelas.addEventListener('change', atualizarParcelas);
    atualizarParcelas();
  }


  function fieldWrapper(name) {
    const input = form.querySelector(`[name="${name}"]`);
    return input ? input.closest('.field') : null;
  }

  function showError(name, message) {
    const wrapper = fieldWrapper(name);
    const input = form.querySelector(`[name="${name}"]`);
    const error = form.querySelector(`[data-error-for="${name}"]`);
    if (wrapper) wrapper.classList.add('has-error');
    if (input) input.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = message;
  }

  function clearError(name) {
    const wrapper = fieldWrapper(name);
    const input = form.querySelector(`[name="${name}"]`);
    const error = form.querySelector(`[data-error-for="${name}"]`);
    if (wrapper) wrapper.classList.remove('has-error');
    if (input) input.removeAttribute('aria-invalid');
    if (error) error.textContent = '';
  }

  function clearAllErrors() {
    $$('.field.has-error', form).forEach((field) => field.classList.remove('has-error'));
    $$('[data-error-for]', form).forEach((error) => { error.textContent = ''; });
    $$('[aria-invalid]', form).forEach((input) => input.removeAttribute('aria-invalid'));
    alertEl.classList.remove('is-visible');
    alertEl.innerHTML = '';
  }

  form.addEventListener('input', (event) => {
    if (event.target.name) clearError(event.target.name);
  });

  function validarCartao() {
    const erros = [];

    const nome = cardNome.value.trim();
    if (nome.length < 5 || !nome.includes(' ')) {
      showError('cardNome', 'Informe o nome como está impresso no cartão.');
      erros.push('cardNome');
    }

    const numero = digits(cardNumero.value);
    if (numero.length < 13 || numero.length > 16) {
      showError('cardNumero', 'Informe um número de cartão com 13 a 16 dígitos.');
      erros.push('cardNumero');
    }

    const validade = cardValidade.value.trim();
    const match = validade.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) {
      showError('cardValidade', 'Use o formato MM/AA.');
      erros.push('cardValidade');
    } else {
      const mes = Number(match[1]);
      const ano = 2000 + Number(match[2]);
      const hoje = new Date();
      const expirado = ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes < hoje.getMonth() + 1);
      if (expirado) {
        showError('cardValidade', 'Este cartão está vencido.');
        erros.push('cardValidade');
      }
    }

    const cvv = digits(cardCvv.value);
    if (cvv.length < 3) {
      showError('cardCvv', 'Informe o código de segurança de 3 ou 4 dígitos.');
      erros.push('cardCvv');
    }

    if (erros.length) {
      alertEl.innerHTML = `<strong>Revise os dados do cartão.</strong> Nenhuma cobrança foi realizada.`;
      alertEl.classList.add('is-visible');
      const primeiro = form.querySelector(`[name="${erros[0]}"]`);
      if (primeiro) {
        primeiro.focus({ preventScroll: true });
        primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    return true;
  }


  function setProcessing(ativo) {
    processing.classList.toggle('is-visible', ativo);
    form.hidden = ativo;
    payBtn.disabled = ativo;
  }

  function erroServidor(error) {
    setProcessing(false);
    const detalhes = Array.isArray(error.details) ? error.details : [];
    alertEl.innerHTML = `
      <strong>${escapeHtml(error.message)}</strong>
      ${detalhes.length ? `<ul>${detalhes.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>` : ''}
      ${error.status === 409 ? '<p style="margin-top:8px;">Se você já comprou um ingresso, consulte seu protocolo com a produção.</p>' : ''}`;
    alertEl.classList.add('is-visible');
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(error.message, 'error', 6000);
  }

  function mostrarSucesso(resultado) {
    const inscricao = resultado.inscricao || {};
    const protocolo = resultado.protocolo || inscricao.protocolo;

    stepPay.classList.remove('is-active');
    stepPay.classList.add('is-done');
    stepDone.classList.add('is-active', 'is-done');

    root.hidden = true;
    successRoot.hidden = false;

    successRoot.innerHTML = `
      <div class="success-card">
        <div class="success-icon" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <h2>Compra confirmada!</h2>
        <p>${escapeHtml(inscricao.nome || dados.nome)}, seu lugar nas três noites do <strong style="color:var(--text);">Ratos de Porão — 45 Anos de Barulho</strong> está garantido.<br>Enviamos os próximos passos para <strong style="color:var(--text);">${escapeHtml(inscricao.email || dados.email)}</strong>.</p>

        <div class="protocol-box">
          <div class="label">Seu protocolo de entrada</div>
          <div class="code" id="protocolCode">${escapeHtml(protocolo)}</div>
          <button class="btn btn-ghost btn-sm" type="button" id="copyProtocol" style="margin-top:12px;">Copiar protocolo</button>
        </div>

        <div class="receipt">
          <div class="summary-row"><span>Lote</span><span>${escapeHtml(inscricao.loteNome || dados.loteNome)}</span></div>
          <div class="summary-row"><span>Banda de maior interesse</span><span>${escapeHtml(inscricao.trilhaNome || dados.trilhaNome)}</span></div>
          <div class="summary-row"><span>Forma de pagamento</span><span>${escapeHtml(METHOD_LABELS[inscricao.metodoPagamento] || METHOD_LABELS[metodo])}</span></div>
          <div class="summary-row"><span>Valor</span><span>${formatCurrency(inscricao.valor ?? total)}</span></div>
          <div class="summary-row"><span>Status</span><span style="color:var(--success);">Confirmada</span></div>
        </div>

        <div class="form-actions" style="justify-content:center;margin-top:28px;">
          <a class="btn btn-primary" href="programacao.html">Montar minha agenda</a>
          <a class="btn btn-ghost" href="local.html">Ver mapa do evento</a>
          <button class="btn btn-ghost" type="button" id="printReceipt">Imprimir comprovante</button>
        </div>

        <p class="form-note" style="margin-top:20px;">
          Guarde este protocolo. Ele será solicitado nos portões do Galpão do Barulho, junto com um documento com foto.
        </p>
        <p class="form-note" style="margin-top:6px;">
          Este é um projeto acadêmico: nenhuma cobrança real foi efetuada e nenhum dado de cartão foi armazenado.
        </p>
      </div>`;

    const copyBtn = $('#copyProtocol');
    if (copyBtn) copyBtn.addEventListener('click', () => copyText(protocolo));

    const printBtn = $('#printReceipt');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    toast('Compra confirmada! Guarde o seu protocolo.', 'success', 7000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAllErrors();

    if (metodo === 'cartao' && !validarCartao()) return;

    setProcessing(true);

    const payload = {
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      empresa: dados.empresa || '',
      cidade: dados.cidade,
      trilha: dados.trilha,
      loteId: dados.loteId,
      metodoPagamento: metodo,
      comoConheceu: dados.comoConheceu || 'Não informado',
      aceite: dados.aceite === true
    };

    try {
      const [resultado] = await Promise.all([
        api('/api/inscricoes', { method: 'POST', body: payload }),
        sleep(1400)
      ]);

      draft.clear();
      mostrarSucesso(resultado);
    } catch (error) {
      console.error('[checkout]', error);
      erroServidor(error);
    }
  });


  selectMethod('pix');
  TCS.observeReveals();
})();
