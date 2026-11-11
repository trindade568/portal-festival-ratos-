// Núcleo compartilhado do frontend: API, toasts e utilitários. (nome interno "TCS" é só por compatibilidade)

const TCS = (() => {
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  const state = {
    toastStack: null
  };


  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value) || 0);
  }

  function formatDate(iso, options = {}) {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...options
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function hexToRgba(hex, alpha = 1) {
    const clean = String(hex || '').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const int = parseInt(full || 'ff2e3f', 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function debounce(fn, wait = 180) {
    let timer;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  async function api(path, options = {}) {
    const config = {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    };
    if (options.body) config.body = JSON.stringify(options.body);

    let response;
    try {
      response = await fetch(path, config);
    } catch {
      throw new Error('Não foi possível conectar ao servidor. Verifique se ele está ativo na porta 2000.');
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || !payload || payload.ok === false) {
      const message = (payload && (payload.erro || payload.mensagem)) || `Erro ${response.status} ao processar a requisição.`;
      const error = new Error(message);
      error.status = response.status;
      error.details = payload && payload.detalhes;
      throw error;
    }

    return payload;
  }


  function toast(message, type = 'info', timeout = 4600) {
    if (!state.toastStack) {
      state.toastStack = document.createElement('div');
      state.toastStack.className = 'toast-stack';
      state.toastStack.setAttribute('role', 'status');
      state.toastStack.setAttribute('aria-live', 'polite');
      document.body.appendChild(state.toastStack);
    }

    const icons = { success: '✓', error: '!', info: 'i' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'i'}</span><span>${escapeHtml(message)}</span>`;
    state.toastStack.appendChild(el);

    const remove = () => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 300);
    };
    setTimeout(remove, timeout);
    el.addEventListener('click', remove);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copiado para a área de transferência.', 'success');
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        toast('Copiado para a área de transferência.', 'success');
        return true;
      } catch {
        toast('Não foi possível copiar automaticamente.', 'error');
        return false;
      } finally {
        area.remove();
      }
    }
  }


  function initHeader() {
    const header = $('.site-header');
    const toggle = $('.nav-toggle');
    const page = document.body.dataset.page;

    if (page) {
      $$('.main-nav a').forEach((link) => {
        if (link.dataset.nav === page) link.classList.add('is-active');
      });
    }

    const onScroll = () => {
      if (!header) return;
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', String(open));
      });

      $$('.main-nav a').forEach((link) => {
        link.addEventListener('click', () => {
          document.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });

      document.addEventListener('click', (event) => {
        if (!document.body.classList.contains('nav-open')) return;
        if (event.target.closest('.main-nav') || event.target.closest('.nav-toggle')) return;
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          document.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
          document.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }


  let revealObserver = null;

  function observeReveals(root = document) {
    const elements = $$('.reveal:not(.is-visible)', root);
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }

    elements.forEach((el) => revealObserver.observe(el));
  }


  function initBackToTop() {
    const button = document.createElement('button');
    button.className = 'to-top';
    button.type = 'button';
    button.setAttribute('aria-label', 'Voltar ao topo');
    button.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(button);

    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    const onScroll = () => button.classList.toggle('is-visible', window.scrollY > 640);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }


  function initCountdown() {
    const container = $('[data-countdown]');
    if (!container) return;

    const target = new Date(container.dataset.countdown || '2026-12-04T16:00:00-03:00').getTime();
    const fields = {
      dias: $('[data-cd="dias"]', container),
      horas: $('[data-cd="horas"]', container),
      minutos: $('[data-cd="minutos"]', container),
      segundos: $('[data-cd="segundos"]', container)
    };
    const caption = $('[data-countdown-caption]');

    const pad = (value) => String(value).padStart(2, '0');

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        Object.values(fields).forEach((el) => { if (el) el.textContent = '00'; });
        if (caption) caption.textContent = 'O festival começou. Aproveitem cada segundo!';
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (fields.dias) fields.dias.textContent = pad(days);
      if (fields.horas) fields.horas.textContent = pad(hours);
      if (fields.minutos) fields.minutos.textContent = pad(minutes);
      if (fields.segundos) fields.segundos.textContent = pad(seconds);
    }

    tick();
    setInterval(tick, 1000);
  }


  const DRAFT_KEY = 'rdp.ingresso.rascunho';

  const draft = {
    save(data) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    },
    load() {
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    clear() {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignora
      }
    }
  };


  function init() {
    initHeader();
    initBackToTop();
    initCountdown();
    observeReveals();

    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    $,
    $$,
    escapeHtml,
    formatCurrency,
    formatDate,
    hexToRgba,
    param,
    debounce,
    api,
    toast,
    copyText,
    observeReveals,
    draft
  };
})();

window.TCS = TCS;
