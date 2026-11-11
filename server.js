// Servidor do Ratos de Porão — 45 Anos de Barulho
// Node.js puro: serve o frontend e a API em /api, salva os pedidos em data/inscricoes.json (porta 2000)

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const PORT = 2000;
const HOST = '0.0.0.0';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const INSCRICOES_FILE = path.join(DATA_DIR, 'inscricoes.json');
const MAX_BODY = 1024 * 128; // 128 KB

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

// utilitários

const now = () => new Date();

function log(req, status, extra = '') {
  const stamp = new Date().toISOString();
  console.log(`[${stamp}] ${req.method} ${req.url} -> ${status}${extra ? ' ' + extra : ''}`);
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function error(res, status, message, details) {
  json(res, status, { ok: false, erro: message, detalhes: details || null });
}

async function readJsonFile(file) {
  const raw = await fsp.readFile(file, 'utf8');
  return JSON.parse(raw);
}

async function loadData(name) {
  return readJsonFile(path.join(DATA_DIR, `${name}.json`));
}

function sanitizeText(value, max = 160) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value) && value.length <= 120;
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

// pedidos: fila única e gravação atômica

let storeQueue = Promise.resolve();

function enqueue(task) {
  const run = storeQueue.then(task, task);
  storeQueue = run.catch(() => {});
  return run;
}

async function ensureStore() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(INSCRICOES_FILE);
  } catch {
    await fsp.writeFile(INSCRICOES_FILE, '[]\n', 'utf8');
  }
}

async function readInscricoes() {
  try {
    const list = await readJsonFile(INSCRICOES_FILE);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeInscricoes(list) {
  const tmp = `${INSCRICOES_FILE}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(list, null, 2) + '\n', 'utf8');
  await fsp.rename(tmp, INSCRICOES_FILE);
}

function soldForLote(inscricoes, loteId) {
  return inscricoes.filter((i) => i.loteId === loteId && i.status === 'confirmada').length;
}

function publicInscricao(item) {
  return {
    protocolo: item.protocolo,
    nome: item.nome,
    email: item.email,
    empresa: item.empresa,
    cidade: item.cidade,
    trilha: item.trilha,
    trilhaNome: item.trilhaNome,
    loteId: item.loteId,
    loteNome: item.loteNome,
    valor: item.valor,
    metodoPagamento: item.metodoPagamento,
    status: item.status,
    criadaEm: item.criadaEm
  };
}

// API

async function apiEvento(res) {
  const [evento, trilhas, programacao, inscricoes] = await Promise.all([
    loadData('evento'),
    loadData('trilhas'),
    loadData('programacao'),
    readInscricoes()
  ]);
  const confirmadas = inscricoes.filter((i) => i.status === 'confirmada').length;
  json(res, 200, {
    ok: true,
    evento,
    resumo: {
      bandas: trilhas.length,
      sessoes: programacao.sessoes.length,
      integrantes: trilhas.reduce((total, t) => total + t.palestrantes.length, 0),
      inscritos: 3480 + confirmadas,
      inscricoesConfirmadas: confirmadas
    }
  });
}

async function apiTrilhas(res) {
  const [trilhas, programacao] = await Promise.all([loadData('trilhas'), loadData('programacao')]);
  const lista = trilhas.map((t) => ({
    ...t,
    totalSessoes: programacao.sessoes.filter((s) => s.trilha === t.slug).length,
    palestrantes: t.palestrantes.map((p) => ({
      nome: p.nome,
      cargo: p.cargo,
      empresa: p.empresa,
      avatar: p.avatar,
      cor: p.cor,
      tags: p.tags,
      destaque: p.destaque
    }))
  }));
  json(res, 200, { ok: true, trilhas: lista });
}

async function apiTrilha(res, slug) {
  const [trilhas, programacao] = await Promise.all([loadData('trilhas'), loadData('programacao')]);
  const trilha = trilhas.find((t) => t.slug === slug);
  if (!trilha) return error(res, 404, 'Banda não encontrada.');
  const sessoes = programacao.sessoes
    .filter((s) => s.trilha === slug)
    .sort((a, b) => (a.dia - b.dia) || a.inicio.localeCompare(b.inicio));
  const dias = programacao.dias;
  json(res, 200, { ok: true, trilha, sessoes, dias });
}

async function apiProgramacao(res) {
  const [programacao, trilhas] = await Promise.all([loadData('programacao'), loadData('trilhas')]);
  const trilhasResumo = trilhas.map((t) => ({ slug: t.slug, nome: t.nome, cor: t.cor, icone: t.icone }));
  json(res, 200, {
    ok: true,
    dias: programacao.dias,
    sessoes: programacao.sessoes,
    trilhas: trilhasResumo
  });
}

async function apiLotes(res) {
  const [lotes, inscricoes] = await Promise.all([loadData('lotes'), readInscricoes()]);
  const lista = lotes.map((lote) => {
    const vendidos = lote.vendidosBase + soldForLote(inscricoes, lote.id);
    const restantes = Math.max(0, lote.capacidade - vendidos);
    return {
      ...lote,
      vendidos,
      restantes,
      percentual: Math.min(100, Math.round((vendidos / lote.capacidade) * 100)),
      esgotado: restantes === 0
    };
  });
  json(res, 200, { ok: true, lotes: lista });
}

async function apiEquipe(res) {
  const equipe = await loadData('equipe');
  json(res, 200, { ok: true, equipe });
}

async function apiLocal(res) {
  const local = await loadData('local');
  json(res, 200, { ok: true, local });
}

async function apiInscricaoPorProtocolo(res, protocolo) {
  const inscricoes = await readInscricoes();
  const item = inscricoes.find((i) => i.protocolo.toUpperCase() === protocolo.toUpperCase());
  if (!item) return error(res, 404, 'Nenhum ingresso encontrado para este protocolo.');
  json(res, 200, { ok: true, inscricao: publicInscricao(item) });
}

async function apiCriarInscricao(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return error(res, 400, err.message);
  }

  const nome = sanitizeText(body.nome, 100);
  const email = sanitizeText(body.email, 120).toLowerCase();
  const telefone = digitsOnly(body.telefone).slice(0, 13);
  const empresa = sanitizeText(body.empresa, 90) || 'Não informado';
  const cidade = sanitizeText(body.cidade, 90);
  const trilhaSlug = sanitizeText(body.trilha, 60);
  const loteId = sanitizeText(body.loteId, 40);
  const metodoPagamento = sanitizeText(body.metodoPagamento, 20) || 'pix';
  const comoConheceu = sanitizeText(body.comoConheceu, 60) || 'Não informado';
  const aceite = body.aceite === true;

  const erros = [];
  if (nome.length < 3 || !nome.includes(' ')) erros.push('Informe o nome completo (nome e sobrenome).');
  if (!isValidEmail(email)) erros.push('Informe um e-mail válido.');
  if (telefone.length < 10) erros.push('Informe um telefone com DDD válido.');
  if (cidade.length < 2) erros.push('Informe a cidade de origem.');
  if (!aceite) erros.push('É necessário aceitar o regulamento e a política de privacidade.');
  if (!['pix', 'cartao', 'boleto'].includes(metodoPagamento)) erros.push('Método de pagamento inválido.');
  if (erros.length) return error(res, 422, 'Revise os dados informados.', erros);

  const result = await enqueue(async () => {
    const [lotes, trilhas, inscricoes] = await Promise.all([
      loadData('lotes'),
      loadData('trilhas'),
      readInscricoes()
    ]);

    const lote = lotes.find((l) => l.id === loteId);
    if (!lote) return { status: 404, erro: 'Lote de ingresso não encontrado.' };

    const vendidos = lote.vendidosBase + soldForLote(inscricoes, lote.id);
    if (vendidos >= lote.capacidade) {
      return { status: 409, erro: 'Este lote está esgotado. Escolha outro lote disponível.' };
    }

    const trilha = trilhas.find((t) => t.slug === trilhaSlug);
    if (!trilha) return { status: 422, erro: 'Selecione uma banda do line-up válida.' };

    if (inscricoes.some((i) => i.email === email && i.status === 'confirmada')) {
      return { status: 409, erro: 'Já existe um ingresso confirmado com este e-mail.' };
    }

    const protocolo = `RDP26-${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7)}`;
    const inscricao = {
      protocolo,
      nome,
      email,
      telefone,
      empresa,
      cidade,
      trilha: trilha.slug,
      trilhaNome: trilha.nome,
      loteId: lote.id,
      loteNome: lote.nome,
      valor: lote.preco,
      metodoPagamento,
      comoConheceu,
      status: 'confirmada',
      criadaEm: new Date().toISOString()
    };

    inscricoes.push(inscricao);
    await writeInscricoes(inscricoes);
    return { status: 201, inscricao };
  });

  if (result.erro) return error(res, result.status, result.erro);
  log(req, 201, `protocolo=${result.inscricao.protocolo}`);
  json(res, 201, {
    ok: true,
    mensagem: 'Compra confirmada com sucesso!',
    protocolo: result.inscricao.protocolo,
    inscricao: publicInscricao(result.inscricao)
  });
}

async function apiHealth(res) {
  json(res, 200, {
    ok: true,
    servico: '45 Anos de Barulho API',
    versao: '1.0.0',
    porta: PORT,
    uptimeSegundos: Math.round(process.uptime()),
    hora: new Date().toISOString()
  });
}

// funções http

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Corpo da requisição excede o limite permitido.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON inválido no corpo da requisição.'));
      }
    });
    req.on('error', () => reject(new Error('Falha ao ler o corpo da requisição.')));
  });
}

async function serveStatic(req, res, pathname) {
  let relative = decodeURIComponent(pathname);
  if (relative === '/' || relative === '') relative = '/index.html';

  // /trilhas vira /trilhas.html
  if (!path.extname(relative)) {
    const asHtml = path.join(PUBLIC_DIR, `${relative}.html`);
    try {
      const st = await fsp.stat(asHtml);
      if (st.isFile()) relative = `${relative}.html`;
    } catch {
      // deixa o caminho como veio
    }
  }

  const filePath = path.resolve(PUBLIC_DIR, `.${path.sep}${relative.replace(/^[/\\]+/, '')}`);
  const relativeToPublic = path.relative(PUBLIC_DIR, filePath);

  if (relativeToPublic.startsWith('..') || path.isAbsolute(relativeToPublic)) {
    return error(res, 403, 'Acesso negado.');
  }

  let stat;
  try {
    stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      stat = await fsp.stat(indexPath);
      return streamFile(req, res, indexPath, stat);
    }
  } catch {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      try {
        const notFound = path.join(PUBLIC_DIR, '404.html');
        const st = await fsp.stat(notFound);
        return streamFile(req, res, notFound, st, 404);
      } catch {
        // cai no 404
      }
    }
    return error(res, 404, 'Recurso não encontrado.');
  }

  return streamFile(req, res, filePath, stat);
}

function streamFile(req, res, filePath, stat, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const cache = 'no-cache';

  res.writeHead(statusCode, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });

  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath)
    .on('error', () => res.destroy())
    .pipe(res);
}

// rotas

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { Allow: 'GET, POST, HEAD, OPTIONS' });
    return res.end();
  }

  if (pathname === '/api' || pathname === '/api/') {
    return json(res, 200, {
      ok: true,
      servico: '45 Anos de Barulho API',
      endpoints: [
        'GET /api/evento',
        'GET /api/trilhas',
        'GET /api/trilhas/:slug',
        'GET /api/programacao',
        'GET /api/lotes',
        'GET /api/local',
        'GET /api/equipe',
        'POST /api/inscricoes',
        'GET /api/inscricoes/:protocolo',
        'GET /api/health'
      ]
    });
  }

  if (pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'HEAD') {
      return error(res, 405, 'Método não permitido.');
    }

    if (pathname === '/api/health') return apiHealth(res);
    if (pathname === '/api/evento') return apiEvento(res);
    if (pathname === '/api/trilhas') return apiTrilhas(res);
    if (pathname === '/api/programacao') return apiProgramacao(res);
    if (pathname === '/api/lotes') return apiLotes(res);
    if (pathname === '/api/equipe') return apiEquipe(res);
    if (pathname === '/api/local') return apiLocal(res);

    const matchTrilha = pathname.match(/^\/api\/trilhas\/([a-z0-9-]+)$/i);
    if (matchTrilha) return apiTrilha(res, matchTrilha[1].toLowerCase());

    if (pathname === '/api/inscricoes' && req.method === 'POST') {
      return apiCriarInscricao(req, res);
    }

    const matchInscricao = pathname.match(/^\/api\/inscricoes\/([A-Za-z0-9-]+)$/);
    if (matchInscricao && req.method === 'GET') {
      return apiInscricaoPorProtocolo(res, matchInscricao[1]);
    }

    return error(res, 404, 'Endpoint não encontrado.');
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return error(res, 405, 'Método não permitido.');
  }

  return serveStatic(req, res, pathname);
}

const server = http.createServer((req, res) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Powered-By', 'Ratos de Porao 45');

  handleRequest(req, res).catch((err) => {
    console.error('[ERRO]', err);
    if (!res.headersSent) error(res, 500, 'Erro interno no servidor.');
    else res.destroy();
  });

  res.on('finish', () => {
    if (urlPath(req.url).startsWith('/api/')) log(req, res.statusCode);
  });
});

function urlPath(raw) {
  try {
    return new URL(raw, 'http://localhost').pathname;
  } catch {
    return raw || '';
  }
}

async function start() {
  await ensureStore();
  server.listen(PORT, HOST, () => {
    console.log('');
    console.log('   ══════════════════════════════════════════');
    console.log('    ⚡  R A T O S   D E   P O R Ã O');
    console.log('       45 ANOS DE BARULHO');
    console.log('   ══════════════════════════════════════════');
    console.log('');
    console.log('   Festival fictício · projeto acadêmico');
    console.log(`   Servidor ativo em: http://localhost:${PORT}`);
    console.log(`   API REST em:       http://localhost:${PORT}/api`);
    console.log(`   Porta fixa:        ${PORT}`);
    console.log('');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  A porta ${PORT} já está em uso. Encerre o processo que a utiliza e tente novamente.\n`);
      process.exit(1);
    }
    throw err;
  });
}

process.on('SIGINT', () => {
  console.log('\n  Encerrando o servidor...');
  server.close(() => process.exit(0));
});

start();
