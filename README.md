# Ratos de Porão — 45 Anos de Barulho · Portal do Festival

Portal completo (frontend + backend integrados) para **Ratos de Porão — 45 Anos de Barulho**, um festival
**fictício** de punk e thrash criado como projeto acadêmico da disciplina de **Desenvolvimento Web**.

> **Aviso importante:** "Ratos de Porão — 45 Anos de Barulho" é um evento imaginário. Ratos de Porão é uma
> banda real, brasileira, ativa desde 1981. Este portal é um trabalho acadêmico sem vínculo com a banda,
> seus integrantes ou representantes, e não vende ingressos de verdade.

O site roda **exclusivamente na porta 2000**, com backend em **Node.js puro** (apenas módulos nativos,
sem dependências externas) e frontend em **HTML, CSS e JavaScript vanilla**.

---

## Sumário

- [Visão geral](#visão-geral)
- [Requisitos](#requisitos)
- [Como executar](#como-executar)
- [Páginas do portal](#páginas-do-portal)
- [Fluxo de ingresso](#fluxo-de-ingresso)
- [API REST](#api-rest)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Dados do festival](#dados-do-festival)
- [Design e acessibilidade](#design-e-acessibilidade)
- [Solução de problemas](#solução-de-problemas)
- [Equipe e créditos](#equipe-e-créditos)

---

## Visão geral

Três noites de festival em São Paulo celebrando 45 anos do Ratos de Porão, com um álbum clássico na íntegra
por noite (*Crucificados pelo Sistema*, *Brasil* e *Necropolítica*). O portal apresenta o line-up, a grade
completa dos três dias, o local com mapa interativo e o processo de compra com **checkout simulado**
(PIX, cartão ou boleto). Todas as informações são servidas por uma API REST própria e renderizadas
dinamicamente no navegador.

**Destaques técnicos**

- Backend HTTP nativo (`node:http`), roteamento manual e API REST em `/api`.
- Persistência de ingressos em JSON com escrita atômica e fila de gravação.
- Validação de dados no cliente e no servidor, com mensagens de erro amigáveis.
- Design system próprio com variáveis CSS, componentes reutilizáveis e animações de entrada.
- Layout responsivo (desktop, tablet e celular) e navegação por teclado.
- Mapa interativo do Galpão do Barulho construído em SVG.
- Agenda com filtros por noite/banda e favoritos salvos em `localStorage`.
- Avatares ilustrados gerados em SVG (sem imagens externas).

---

## Requisitos

- **Node.js 18 ou superior** (testado com Node 24).
- Nenhum `npm install` é necessário — o projeto não usa dependências externas.
- Navegador moderno com suporte a `fetch`, `IntersectionObserver` e `sessionStorage`.

---

## Como executar

Na pasta raiz do projeto, execute:

```bash
npm start
```

ou, alternativamente:

```bash
node server.js
```

O terminal exibirá algo como:

```text
   ══════════════════════════════════════════
    ⚡  R A T O S   D E   P O R Ã O
       45 ANOS DE BARULHO
   ══════════════════════════════════════════

   Servidor ativo em: http://localhost:2000
   API REST em:       http://localhost:2000/api
   Porta fixa:        2000
```

Abra o navegador em:

**<http://localhost:2000>**

> A porta **2000** é fixa no código (`const PORT = 2000`). O servidor escuta em `0.0.0.0`,
> portanto também pode ser acessado por outros dispositivos da rede local pelo IP da máquina.

Para encerrar o servidor, use `Ctrl + C` no terminal.

---

## Páginas do portal

| Página | Arquivo | Conteúdo |
| --- | --- | --- |
| Início | `public/index.html` | Hero com credencial, contagem regressiva, números do festival, line-up em destaque, integrantes, as três noites, local e chamada para ingressos. |
| Line-up | `public/trilhas.html` | Listagem das 6 bandas com busca em tempo real. |
| Detalhe da banda | `public/trilha.html?slug=...` | Descrição completa, tópicos, integrantes e agenda da banda. |
| Horários | `public/programacao.html` | Grade dos 3 dias, filtros por banda, favoritos e resumo da agenda. |
| Local & estrutura | `public/local.html` | Mapa interativo em SVG, palcos, setores, acessibilidade, serviços e como chegar. |
| Ingressos | `public/inscricoes.html` | Lotes com preço, benefícios e ocupação, formulário validado e FAQ. |
| Checkout simulado | `public/checkout.html` | Resumo do pedido, PIX/cartão/boleto, processamento, protocolo e comprovante. |
| Produção | `public/quem-somos.html` | Equipe com foto, nome, RA, função, tecnologias e contribuições; stack e processo do projeto. |
| 404 | `public/404.html` | Página de erro amigável para rotas inexistentes. |

URLs amigáveis também funcionam, por exemplo `http://localhost:2000/trilhas` e `http://localhost:2000/local`.

---

## Fluxo de ingresso

1. O participante escolhe um lote em **Ingressos** e preenche o formulário.
2. Os dados são validados no navegador e salvos como rascunho em `sessionStorage`.
3. O usuário é redirecionado para **Checkout**, que recupera o rascunho e exibe o resumo.
4. Escolhe a forma de pagamento simulada:
   - **PIX** — QR Code e código copia e cola gerados no cliente;
   - **Cartão** — máscaras, validação de número, validade e CVV (nada é enviado ao servidor);
   - **Boleto** — linha digitável fictícia com vencimento em 3 dias úteis.
5. Ao confirmar, o frontend envia `POST /api/inscricoes`.
6. O servidor valida os dados, confere disponibilidade do lote, grava o pedido em
   `data/inscricoes.json` e devolve um **protocolo** (ex.: `RDP26-A1B2C3D`).
7. A tela de sucesso exibe o protocolo, o comprovante e permite copiar ou imprimir.

O protocolo pode ser consultado em `GET /api/inscricoes/:protocolo`.

> **Importante:** nenhum pagamento real é processado. O checkout existe apenas para demonstrar
> a integração frontend/backend e o fluxo completo de compra.

---

## API REST

Base: `http://localhost:2000/api`

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/api` | Lista os endpoints disponíveis. |
| `GET` | `/api/health` | Status do servidor, versão e uptime. |
| `GET` | `/api/evento` | Dados do festival, números, patrocinadores e total de ingressos confirmados. |
| `GET` | `/api/trilhas` | Lista as bandas com integrantes, tópicos e contagem de shows. |
| `GET` | `/api/trilhas/:slug` | Detalhe de uma banda e seus shows. |
| `GET` | `/api/programacao` | Grade completa agrupada por dia. |
| `GET` | `/api/lotes` | Lotes com vagas vendidas, restantes e percentual de ocupação. |
| `GET` | `/api/local` | Local, palcos, setores, mapa, acessibilidade, serviços e transporte. |
| `GET` | `/api/equipe` | Integrantes da produção do projeto. |
| `POST` | `/api/inscricoes` | Cria um pedido de ingresso e retorna o protocolo. |
| `GET` | `/api/inscricoes/:protocolo` | Consulta um pedido pelo protocolo. |

### Exemplo de criação de ingresso

```bash
curl -X POST http://localhost:2000/api/inscricoes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Silva",
    "email": "maria@exemplo.com",
    "telefone": "11999998888",
    "empresa": "Universidade Exemplo",
    "cidade": "São Paulo / SP",
    "trilha": "ratos-de-porao",
    "loteId": "lote-2",
    "metodoPagamento": "pix",
    "comoConheceu": "Instagram",
    "aceite": true
  }'
```

Resposta `201 Created`:

```json
{
  "ok": true,
  "mensagem": "Compra confirmada com sucesso!",
  "protocolo": "RDP26-A1B2C3D",
  "inscricao": {
    "protocolo": "RDP26-A1B2C3D",
    "nome": "Maria Silva",
    "email": "maria@exemplo.com",
    "loteId": "lote-2",
    "loteNome": "Pista · Lote 2",
    "valor": 240,
    "metodoPagamento": "pix",
    "status": "confirmada"
  }
}
```

### Códigos de status usados

| Código | Situação |
| --- | --- |
| `200` | Consulta realizada com sucesso. |
| `201` | Pedido criado. |
| `404` | Recurso, banda, lote ou protocolo não encontrado. |
| `405` | Método HTTP não permitido. |
| `409` | Lote esgotado ou e-mail já cadastrado. |
| `422` | Dados inválidos (retorna lista em `detalhes`). |
| `500` | Erro interno. |

---

## Estrutura do projeto

```text
Projeto Padrão/
├── package.json              # scripts e metadados (sem dependências)
├── server.js                 # servidor HTTP + API REST + arquivos estáticos
├── README.md
├── data/                     # "banco de dados" em JSON
│   ├── evento.json
│   ├── trilhas.json          # bandas e integrantes
│   ├── programacao.json      # grade dos três dias
│   ├── lotes.json
│   ├── local.json            # Galpão do Barulho
│   ├── equipe.json           # produção (projeto acadêmico)
│   └── inscricoes.json       # pedidos persistidos (inicia como [])
├── public/                   # frontend estático
│   ├── index.html
│   ├── trilhas.html
│   ├── trilha.html
│   ├── programacao.html
│   ├── local.html
│   ├── inscricoes.html
│   ├── checkout.html
│   ├── quem-somos.html
│   ├── 404.html
│   ├── css/
│   │   └── styles.css        # design system completo (tema punk/thrash)
│   ├── js/
│   │   ├── app.js            # utilitários compartilhados (API, toasts, rascunho...)
│   │   ├── components.js     # cards reutilizáveis de banda e integrante
│   │   ├── home.js
│   │   ├── trilhas.js
│   │   ├── trilha.js
│   │   ├── programacao.js
│   │   ├── local.js
│   │   ├── inscricoes.js
│   │   ├── checkout.js
│   │   └── quem-somos.js
│   └── assets/
│       ├── favicon.svg
│       └── equipe/           # 29 avatares SVG (bandas + equipe)
└── tools/
    └── gerar-avatares.js     # gerador dos avatares ilustrados
```

---

## Dados do festival

- **Evento:** Ratos de Porão — 45 Anos de Barulho
- **Datas:** 04, 05 e 06 de dezembro de 2026
- **Local:** Galpão do Barulho — Rua do Estampido, 1981 (Barra Funda), São Paulo/SP
- **Line-up:** 6 bandas, 23 integrantes (Ratos de Porão + 5 convidadas)
- **Grade:** 47 atrações distribuídas em 3 dias e 3 palcos
- **Lotes:** Pista 1, Pista 2, Pista 3, Meia-entrada Estudante, Camarote Vista do Caos e Na porta (Last Call)
- **Álbuns executados na íntegra:** *Crucificados pelo Sistema* (1984), *Brasil* (1989) e *Necropolítica* (2014)

Nomes de bandas convidadas, local, datas, valores e patrocinadores são fictícios e foram criados para fins didáticos.
O Ratos de Porão, sua história e sua discografia são reais.

---

## Design e acessibilidade

- Tema escuro "punk/thrash": preto, vermelho-sangue, laranja-ácido e amarelo-gema; tipografia Anton/Inter/JetBrains Mono.
- Componentes reutilizáveis: botões, badges, chips, cards, formulários, steps, FAQ, toasts e skeleton loading.
- Layout responsivo com breakpoints para 1024 px, 900 px, 760 px e 560 px.
- `skip-link`, foco visível, `aria-*` em navegação, abas, mapa e mensagens de erro.
- Respeito a `prefers-reduced-motion` para reduzir animações.
- Contraste de texto e estados de foco pensados para leitura confortável.
- Estilos de impressão para o comprovante de ingresso.
- Aviso visível em todas as páginas de que o festival é fictício e não tem vínculo com a banda.

---

## Solução de problemas

**A porta 2000 já está em uso**

No Windows (PowerShell), descubra o processo e encerre-o:

```powershell
Get-NetTCPConnection -LocalPort 2000 | Select-Object OwningProcess
Stop-Process -Id <PID>
```

No macOS/Linux:

```bash
lsof -i :2000
kill <PID>
```

**A página abre, mas os dados não carregam**

Confirme que o servidor está ativo (`npm start`) e acesse pela URL `http://localhost:2000`.
Se o navegador estiver com cache antigo, recarregue com `Ctrl + F5`.

**O pedido não é salvo**

Verifique se a pasta `data/` existe e se o processo tem permissão de escrita.
O arquivo `data/inscricoes.json` deve conter um array JSON (inicialmente `[]`).

**O checkout mostra "nenhuma compra em andamento"**

O rascunho fica em `sessionStorage` e expira ao fechar a aba. Volte a
`inscricoes.html`, preencha o formulário e siga novamente para o checkout.

---

## Equipe e créditos

Projeto acadêmico desenvolvido por seis integrantes:

| Integrante | RA | Frente |
| --- | --- | --- |
| Ana Beatriz Carvalho | 2026-014578 | Direção de Arte & Identidade Visual |
| Bruno Tavares Lima | 2026-009312 | Produção Técnica & Bilheteria |
| Carla Mendes Oliveira | 2026-017204 | Experiência do Público & Acessibilidade |
| Daniel Rocha Santos | 2026-005887 | Infraestrutura & Operações |
| Eduarda Nunes Ferreira | 2026-012045 | Curadoria de Dados & Line-up |
| Felipe Andrade Moreira | 2026-020111 | Qualidade & Documentação |

Os perfis completos, tecnologias e contribuições estão disponíveis na página **Produção** do portal.

---

© 2026 Ratos de Porão — 45 Anos de Barulho. Festival fictício; projeto acadêmico de Desenvolvimento Web, sem vínculo com a banda Ratos de Porão.
