// Gera os avatares SVG das bandas e da equipe. Uso: node tools/gerar-avatares.js

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'assets', 'equipe');

const people = [
  // Ratos de Porão
  { file: 'band-joao-gordo', nome: 'João Gordo', skin: '#c68a5e', hair: '#141414', shirt: '#ff2e3f', bg1: '#2b060a', bg2: '#ff2e3f', style: 'short', beard: true },
  { file: 'band-jao', nome: 'Jão', skin: '#a96b45', hair: '#1f1b18', shirt: '#ff6b1a', bg1: '#2b1206', bg2: '#ff6b1a', style: 'fade' },
  { file: 'band-juninho', nome: 'Juninho', skin: '#8a5233', hair: '#141414', shirt: '#f2e205', bg1: '#2b2606', bg2: '#c9b900', style: 'short', beard: true },
  { file: 'band-boka', nome: 'Boka', skin: '#e0a97f', hair: '#2e2118', shirt: '#9fb4c7', bg1: '#141c26', bg2: '#5f7285', style: 'fade', glasses: true },
  // Carcaça Urbana
  { file: 'band-dita', nome: 'Dita', skin: '#e0a97f', hair: '#3f2a1d', shirt: '#f2e205', bg1: '#2b2606', bg2: '#8a7a06', style: 'curly' },
  { file: 'band-fumaca', nome: 'Fumaça', skin: '#c68a5e', hair: '#141414', shirt: '#57534e', bg1: '#1c1917', bg2: '#57534e', style: 'short', beard: true },
  { file: 'band-tico', nome: 'Tico', skin: '#a96b45', hair: '#2e2118', shirt: '#e0cf1a', bg1: '#241f05', bg2: '#7a6f10', style: 'fade' },
  { file: 'band-nena', nome: 'Nena', skin: '#8a5233', hair: '#1f1b18', shirt: '#d9c21a', bg1: '#242105', bg2: '#6f6a0d', style: 'bun' },
  // Vômito Nuclear
  { file: 'band-ze-podre', nome: 'Zé Podre', skin: '#c68a5e', hair: '#141414', shirt: '#ff6b35', bg1: '#2b1206', bg2: '#a83f14', style: 'short', beard: true },
  { file: 'band-carca', nome: 'Carca', skin: '#a96b45', hair: '#1f1b18', shirt: '#d94f1e', bg1: '#26100a', bg2: '#8a3008', style: 'fade' },
  { file: 'band-bode', nome: 'Bode', skin: '#8a5233', hair: '#141414', shirt: '#f28a5c', bg1: '#261209', bg2: '#8a4a1f', style: 'short' },
  // Sibéria 77
  { file: 'band-vera-vidro', nome: 'Vera Vidro', skin: '#f2c9a5', hair: '#141414', shirt: '#9fb4c7', bg1: '#141c26', bg2: '#46586c', style: 'bob' },
  { file: 'band-icaro-frio', nome: 'Ícaro Frio', skin: '#e0a97f', hair: '#2e2118', shirt: '#6f879b', bg1: '#141c26', bg2: '#37475a', style: 'fade', glasses: true },
  { file: 'band-mara-lenta', nome: 'Mara Lenta', skin: '#e0a97f', hair: '#5a3a22', shirt: '#b8c8d8', bg1: '#19222e', bg2: '#4f6076', style: 'long' },
  { file: 'band-deco-cinza', nome: 'Deco Cinza', skin: '#c68a5e', hair: '#141414', shirt: '#8299ad', bg1: '#151c24', bg2: '#3a4656', style: 'short', beard: true },
  // Cortina de Fumaça
  { file: 'band-bruna-brasa', nome: 'Bruna Brasa', skin: '#f2c9a5', hair: '#5a3a22', shirt: '#b8d96a', bg1: '#1a2408', bg2: '#58731f', style: 'curly' },
  { file: 'band-toco', nome: 'Toco', skin: '#c68a5e', hair: '#1f1b18', shirt: '#8fb23f', bg1: '#182008', bg2: '#46591c', style: 'fade', beard: true },
  { file: 'band-cimento', nome: 'Cimento', skin: '#a96b45', hair: '#141414', shirt: '#a3c255', bg1: '#1b220b', bg2: '#4a5420', style: 'short' },
  { file: 'band-zeca-pedra', nome: 'Zeca Pedra', skin: '#8a5233', hair: '#2e2118', shirt: '#c9e58a', bg1: '#1e260e', bg2: '#596b2e', style: 'fade' },
  // Motim
  { file: 'band-leo-rua', nome: 'Léo Rua', skin: '#c68a5e', hair: '#141414', shirt: '#f2ece4', bg1: '#24211e', bg2: '#57524a', style: 'short' },
  { file: 'band-kiko-bala', nome: 'Kiko Bala', skin: '#a96b45', hair: '#1f1b18', shirt: '#c9bfae', bg1: '#211f1c', bg2: '#4f4b43', style: 'fade' },
  { file: 'band-nana', nome: 'Naná', skin: '#e0a97f', hair: '#3f2a1d', shirt: '#e3dacb', bg1: '#22201d', bg2: '#57534a', style: 'bun' },
  { file: 'band-xande', nome: 'Xande', skin: '#8a5233', hair: '#141414', shirt: '#d6ccba', bg1: '#201e1b', bg2: '#4a4740', style: 'short', beard: true },
  // Equipe de produção
  { file: 'time-ana', nome: 'Ana Beatriz Carvalho', skin: '#f2c9a5', hair: '#2e2118', shirt: '#ff2e3f', bg1: '#2b060a', bg2: '#8a1420', style: 'long' },
  { file: 'time-bruno', nome: 'Bruno Tavares Lima', skin: '#a96b45', hair: '#141414', shirt: '#f2e205', bg1: '#2b2606', bg2: '#7a6f10', style: 'fade', beard: true },
  { file: 'time-carla', nome: 'Carla Mendes Oliveira', skin: '#e0a97f', hair: '#5a3a22', shirt: '#ff6b1a', bg1: '#2b1206', bg2: '#8a3008', style: 'curly' },
  { file: 'time-daniel', nome: 'Daniel Rocha Santos', skin: '#c68a5e', hair: '#1f1b18', shirt: '#9fb4c7', bg1: '#141c26', bg2: '#46586c', style: 'short', glasses: true },
  { file: 'time-eduarda', nome: 'Eduarda Nunes Ferreira', skin: '#8a5233', hair: '#2e2118', shirt: '#f2e205', bg1: '#241f05', bg2: '#6f6a0d', style: 'bun' },
  { file: 'time-felipe', nome: 'Felipe Andrade Moreira', skin: '#f2c9a5', hair: '#3f2a1d', shirt: '#ff2e3f', bg1: '#26100a', bg2: '#8a1420', style: 'bob', glasses: true }
];

function hairBehind(style, hair) {
  if (style === 'long') {
    return `
      <path d="M112 192 C104 94 148 70 200 70 C252 70 296 94 288 192 L294 330 C262 340 246 300 248 232 L152 232 C154 300 138 340 106 330 Z" fill="${hair}"/>
      <path d="M124 178 C116 240 120 292 110 318 C134 322 150 300 148 260 L148 196 Z" fill="${hair}"/>
      <path d="M276 178 C284 240 280 292 290 318 C266 322 250 300 252 260 L252 196 Z" fill="${hair}"/>
    `;
  }
  if (style === 'bob') {
    return `
      <path d="M114 190 C108 94 148 72 200 72 C252 72 292 94 286 190 L284 262 C266 278 250 262 248 226 L152 226 C150 262 134 278 116 262 Z" fill="${hair}"/>
      <path d="M124 180 C118 226 120 252 114 272 C134 276 146 256 146 232 L146 196 Z" fill="${hair}"/>
      <path d="M276 180 C282 226 280 252 286 272 C266 276 254 256 254 232 L254 196 Z" fill="${hair}"/>
    `;
  }
  if (style === 'curly') {
    return `
      <g fill="${hair}">
        <circle cx="130" cy="156" r="36"/>
        <circle cx="270" cy="156" r="36"/>
        <circle cx="150" cy="110" r="32"/>
        <circle cx="250" cy="110" r="32"/>
        <circle cx="200" cy="86" r="36"/>
      </g>
    `;
  }
  if (style === 'bun') {
    return `
      <circle cx="200" cy="64" r="36" fill="${hair}"/>
      <path d="M120 180 C116 108 152 82 200 82 C248 82 284 108 280 180 L272 220 L128 220 Z" fill="${hair}"/>
    `;
  }
  return '';
}

function hairFront(style, hair) {
  if (style === 'fade') {
    return `
      <path d="M124 172 C120 118 154 90 200 90 C246 90 280 118 276 172 C268 150 244 136 200 136 C156 136 132 150 124 172 Z" fill="${hair}"/>
      <path d="M130 160 C150 138 172 130 200 130" stroke="#ffffff" stroke-opacity=".14" stroke-width="4" fill="none" stroke-linecap="round"/>
    `;
  }
  if (style === 'curly') {
    return `
      <path d="M122 172 C118 112 154 88 200 88 C246 88 282 112 278 172 C266 144 244 128 200 128 C156 128 134 144 122 172 Z" fill="${hair}"/>
      <g fill="${hair}">
        <circle cx="146" cy="132" r="18"/>
        <circle cx="180" cy="116" r="18"/>
        <circle cx="218" cy="114" r="18"/>
        <circle cx="252" cy="132" r="18"/>
      </g>
    `;
  }
  if (style === 'bun') {
    return `
      <path d="M124 174 C120 112 154 86 200 86 C246 86 280 112 276 174 C266 144 244 128 200 128 C156 128 134 144 124 174 Z" fill="${hair}"/>
      <path d="M200 90 C186 108 178 120 176 132" stroke="#ffffff" stroke-opacity=".12" stroke-width="5" fill="none" stroke-linecap="round"/>
    `;
  }
  if (style === 'long' || style === 'bob') {
    return `
      <path d="M120 176 C116 106 150 84 200 84 C250 84 284 106 280 176 C268 142 244 124 200 124 C156 124 132 142 120 176 Z" fill="${hair}"/>
      <path d="M200 88 C184 104 176 116 172 128" stroke="#ffffff" stroke-opacity=".13" stroke-width="5" fill="none" stroke-linecap="round"/>
    `;
  }
  return `
    <path d="M121 174 C118 112 152 86 200 86 C248 86 282 112 279 174 C270 142 246 122 200 122 C154 122 130 142 121 174 Z" fill="${hair}"/>
    <path d="M150 128 C170 112 196 108 220 114" stroke="#ffffff" stroke-opacity=".13" stroke-width="5" fill="none" stroke-linecap="round"/>
  `;
}

function svgFor(person) {
  const { nome, skin, hair, shirt, bg1, bg2, style, glasses, beard } = person;
  const shade = 'rgba(0,0,0,.12)';
  const beardPath = beard
    ? `<path d="M134 210 C142 262 170 282 200 282 C230 282 258 262 266 210 C260 246 240 260 200 260 C160 260 140 246 134 210 Z" fill="${hair}" opacity=".82"/>`
    : '';
  const glassesSvg = glasses
    ? `<g fill="none" stroke="#111827" stroke-opacity=".78" stroke-width="5">
         <rect x="138" y="174" width="54" height="40" rx="13"/>
         <rect x="208" y="174" width="54" height="40" rx="13"/>
         <path d="M192 192 h16"/>
         <path d="M138 188 l-16 -4"/>
         <path d="M262 188 l16 -4"/>
       </g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Ilustração de ${nome}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shirt}"/>
      <stop offset="1" stop-color="${bg1}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="60%">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clip"><rect width="400" height="400"/></clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="400" height="400" fill="url(#bg)"/>
    <circle cx="330" cy="76" r="128" fill="#ffffff" opacity=".06"/>
    <circle cx="62" cy="340" r="104" fill="#ffffff" opacity=".05"/>
    <circle cx="200" cy="188" r="150" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="1.5"/>
    <circle cx="200" cy="188" r="118" fill="none" stroke="#ffffff" stroke-opacity=".06" stroke-width="1.5"/>
    <rect width="400" height="400" fill="url(#glow)"/>
    ${hairBehind(style, hair)}
    <path d="M52 400 C52 316 112 284 200 284 C288 284 348 316 348 400 Z" fill="url(#shirt)"/>
    <path d="M156 296 L200 336 L244 296 L228 288 L200 314 L172 288 Z" fill="#ffffff" opacity=".16"/>
    <path d="M164 252 h72 v42 c0 20 -72 20 -72 0 z" fill="${skin}"/>
    <path d="M164 252 h72 v20 c-24 10 -48 10 -72 0 z" fill="${shade}"/>
    <ellipse cx="120" cy="198" rx="14" ry="21" fill="${skin}"/>
    <ellipse cx="280" cy="198" rx="14" ry="21" fill="${skin}"/>
    <ellipse cx="200" cy="190" rx="79" ry="89" fill="${skin}"/>
    <ellipse cx="200" cy="206" rx="79" ry="73" fill="${skin}"/>
    <circle cx="158" cy="220" r="15" fill="#e8798a" opacity=".14"/>
    <circle cx="242" cy="220" r="15" fill="#e8798a" opacity=".14"/>
    ${beardPath}
    <path d="M150 166 q20 -11 38 -2" stroke="${hair}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M250 166 q-20 -11 -38 -2" stroke="${hair}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <ellipse cx="161" cy="193" rx="6" ry="8" fill="#20242e"/>
    <ellipse cx="239" cy="193" rx="6" ry="8" fill="#20242e"/>
    <circle cx="163" cy="190" r="2" fill="#ffffff" opacity=".7"/>
    <circle cx="241" cy="190" r="2" fill="#ffffff" opacity=".7"/>
    <path d="M199 202 q-7 19 5 21" stroke="${shade}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M176 238 q24 17 48 0" stroke="#8d4a45" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${hairFront(style, hair)}
    ${glassesSvg}
  </g>
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const person of people) {
  fs.writeFileSync(path.join(OUT, `${person.file}.svg`), svgFor(person), 'utf8');
}
console.log(`Gerados ${people.length} avatares em ${OUT}`);
