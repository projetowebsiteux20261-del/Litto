// ============================================================
// LITTO – Aplicativo principal
// Navegação SPA · Autenticação Firebase · Mapa Leaflet
// ============================================================

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp, doc, setDoc, getDoc,
  getDocs, updateDoc, deleteDoc, query, orderBy, limit,
  where, getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initMap, initMapHome } from "./mapa.js";
import {
  searchBooks, searchMedia, searchMediaWithFilters,
  searchBooksByGenres, findAdaptations, getBookDetails, getMediaDetails,
} from './apis.js';

// ─── Estado ─────────────────────────────────────────────────
let currentUser = null;

// ─── Referências de telas ────────────────────────────────────
const screens = {
  home:                   document.getElementById("screen-home"),
  mapa:                   document.getElementById("screen-mapa"),
  perfil:                 document.getElementById("screen-perfil"),
  "perfil-publico":       document.getElementById("screen-perfil-publico"),
  login:                  document.getElementById("screen-login"),
  cadastro:               document.getElementById("screen-cadastro"),
  "recuperar-senha":      document.getElementById("screen-recuperar-senha"),
  explorar:               document.getElementById("screen-explorar"),
  "bibliotecas-digitais": document.getElementById("screen-bibliotecas-digitais"),
  busca:                  document.getElementById("screen-busca"),
  livro:                  document.getElementById("screen-livro"),
  midia:                  document.getElementById("screen-midia"),
  recomendacoes:          document.getElementById("screen-recomendacoes"),
};

// ─── Histórico de navegação ──────────────────────────────────
let previousScreen = "home";

// ─── Curiosidades rotativas ──────────────────────────────────
const CURIOSIDADES = [
  { titulo: 'O Senhor dos Anéis', texto: 'J.R.R. Tolkien levou mais de 12 anos para escrever a trilogia. Ele criou idiomas inteiros, incluindo o Quenya e o Sindarin, antes de escrever uma única linha da história.', icone: 'castle', bg: '#5065ff', badge: 'VOCÊ SABIA?', badgeBg: '#ffdf2b', badgeColor: '#000' },
  { titulo: 'Duna', texto: 'Frank Herbert pesquisou por 6 anos antes de escrever Duna. A obra foi rejeitada por 23 editoras antes de ser publicada em 1965 e se tornar o livro de ficção científica mais vendido da história.', icone: 'sunny', bg: '#fe4c00', badge: 'CURIOSIDADE', badgeBg: '#ffdf2b', badgeColor: '#000' },
  { titulo: '1984', texto: 'George Orwell escreveu 1984 enquanto estava gravemente doente com tuberculose. Publicado em 1949, o livro cunhou termos como "Grande Irmão" e "Duplipensar" que usamos até hoje.', icone: 'visibility', bg: '#1a1b24', badge: 'VOCÊ SABIA?', badgeBg: '#ffdf2b', badgeColor: '#000' },
  { titulo: 'Dom Casmurro', texto: 'Machado de Assis escreveu Dom Casmurro em 1899. A questão sobre a culpa ou inocência de Capitu gerou debates literários por mais de um século — e ainda não tem resposta definitiva.', icone: 'question_mark', bg: '#ffdf2b', badge: 'DEBATE ETERNO', badgeBg: '#1a1b24', badgeColor: '#fff' },
  { titulo: 'O Iluminado', texto: 'Stephen King escreveu O Iluminado em poucos meses durante um período difícil de sua vida. Curiosamente, ele odiou a adaptação de Kubrick, dizendo que ela perdia a humanidade dos personagens.', icone: 'skull', bg: '#fe4c00', badge: 'FATO ASSUSTADOR', badgeBg: '#1a1b24', badgeColor: '#fff' },
];
let curiosidadeAtual = Math.floor(Math.random() * CURIOSIDADES.length);

function renderCuriosidade(idx) {
  const c = CURIOSIDADES[idx];
  const container = document.getElementById('curiosidade-container');
  const tituloEl  = document.getElementById('curiosidade-titulo');
  const textoEl   = document.getElementById('curiosidade-texto');
  const iconeEl   = document.getElementById('curiosidade-icone');
  const badgeEl   = document.getElementById('curiosidade-badge');
  if (container) container.style.background = c.bg;
  if (tituloEl)  tituloEl.textContent  = c.titulo;
  if (textoEl)   textoEl.textContent   = c.texto;
  if (iconeEl)   iconeEl.textContent   = c.icone;
  if (badgeEl) { badgeEl.textContent = c.badge; badgeEl.style.background = c.badgeBg; badgeEl.style.color = c.badgeColor; }
}
renderCuriosidade(curiosidadeAtual);
document.getElementById('proxima-curiosidade')?.addEventListener('click', () => {
  curiosidadeAtual = (curiosidadeAtual + 1) % CURIOSIDADES.length;
  renderCuriosidade(curiosidadeAtual);
});

// ─── Estatísticas reais da comunidade ───────────────────────
async function carregarEstatisticasComunidade() {
  try {
    const [snapUsers, snapRecs] = await Promise.all([
      getCountFromServer(collection(db, "users")),
      getCountFromServer(collection(db, "recommendations")),
    ]);
    const elUsers = document.getElementById("stat-usuarios");
    const elRecs  = document.getElementById("stat-recomendacoes");
    if (elUsers) elUsers.textContent = snapUsers.data().count;
    if (elRecs)  elRecs.textContent  = snapRecs.data().count;
  } catch(e) { console.warn("Erro ao carregar estatísticas:", e); }
}

// ─── Capas do Explorar ───────────────────────────────────────
async function carregarCapasExplorar() {
  const livrosExplorar = [
    { id: 'dom-casmurro', query: 'Dom Casmurro Machado de Assis' },
    { id: 'duna',         query: 'Duna Frank Herbert' },
    { id: 'iluminado',    query: 'O Iluminado Stephen King' },
    { id: '1984',         query: '1984 George Orwell' },
  ];
  livrosExplorar.forEach(async ({ id, query }) => {
    const el = document.getElementById(`cover-${id}`);
    if (!el) return;
    try {
      const livros = await searchBooks(query, 1);
      if (livros[0]?.cover) el.innerHTML = `<img src="${livros[0].cover}" alt="${query}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`;
    } catch(_) {}
  });
  const midiaExplorar = [
    { id: 'senhor-aneis', tmdbId: '120',   type: 'movie' },
    { id: 'succession',   tmdbId: '79696', type: 'tv'    },
    { id: 'pulp-fiction', tmdbId: '680',   type: 'movie' },
  ];
  midiaExplorar.forEach(async ({ id, tmdbId, type }) => {
    const el = document.getElementById(`cover-${id}`);
    if (!el) return;
    try {
      const details = await getMediaDetails(Number(tmdbId), type === 'movie' ? 'movie' : 'series');
      if (details?.poster) el.innerHTML = `<img src="${details.poster}" alt="${id}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`;
    } catch(_) {}
  });
}

// ─── Filtros de busca ────────────────────────────────────────
document.getElementById('busca-filtros')?.addEventListener('click', e => {
  const btn = e.target.closest('.filtro-genre-btn');
  if (!btn) return;
  document.querySelectorAll('.filtro-genre-btn').forEach(b => { b.setAttribute('aria-pressed', 'false'); b.style.background = '#fff'; });
  btn.setAttribute('aria-pressed', 'true');
  btn.style.background = '#ffdf2b';
  realizarBusca(document.getElementById('busca-input')?.value?.trim() || '');
});
document.getElementById('filtro-ano')?.addEventListener('change', () => {
  realizarBusca(document.getElementById('busca-input')?.value?.trim() || '');
});

// ─── Cards de gênero da home ─────────────────────────────────
document.querySelectorAll('[data-genre]').forEach(el => {
  el.addEventListener('click', () => {
    const genreMap = { 'Fantasia': 14, 'Ficção científica': 878, 'História': 36, 'Mistério': 9648, 'Drama': 18, 'Thriller': 53, 'Ação': 28, 'Terror': 27 };
    const gId = genreMap[el.dataset.genre];
    document.querySelectorAll('.filtro-genre-btn').forEach(b => { b.setAttribute('aria-pressed', 'false'); b.style.background = '#fff'; });
    if (gId) {
      const matchBtn = document.querySelector(`.filtro-genre-btn[data-genre-id="${gId}"]`);
      if (matchBtn) { matchBtn.setAttribute('aria-pressed', 'true'); matchBtn.style.background = '#ffdf2b'; }
    }
    const buscaInput = document.getElementById('busca-input');
    if (buscaInput) buscaInput.value = '';
    showScreen('busca');
    realizarBusca('');
  });
});

// ─── Pesquisa ────────────────────────────────────────────────
function executarBusca(origem) {
  const query = (origem === "explorar"
    ? document.getElementById("explorar-search")?.value
    : document.getElementById("hero-search")?.value)?.trim();
  if (!query) return;
  const buscaInput = document.getElementById("busca-input");
  if (buscaInput) buscaInput.value = query;
  showScreen("busca");
  realizarBusca(query);
}
document.getElementById("hero-search")?.addEventListener("keydown", e => { if (e.key === "Enter") executarBusca("home"); });
document.querySelector(".btn-search")?.addEventListener("click", () => executarBusca("home"));
document.getElementById("explorar-search")?.addEventListener("keydown", e => { if (e.key === "Enter") executarBusca("explorar"); });
document.getElementById("explorar-buscar")?.addEventListener("click", () => executarBusca("explorar"));
document.getElementById("busca-btn")?.addEventListener("click", () => { const q = document.getElementById("busca-input")?.value?.trim(); if (q) realizarBusca(q); });
document.getElementById("busca-input")?.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.value?.trim()) realizarBusca(e.target.value.trim()); });

async function realizarBusca(query) {
  const midiaEl = document.getElementById("busca-midia");
  if (midiaEl) midiaEl.innerHTML = '<p class="opacity-50 text-sm col-span-full">Buscando filmes e séries…</p>';
  const activeBtn = document.querySelector('.filtro-genre-btn[aria-pressed="true"]');
  const genreId = activeBtn?.dataset.genreId !== '' ? (Number(activeBtn?.dataset.genreId) || null) : null;
  const ano = document.getElementById('filtro-ano')?.value?.trim() || null;
  const resultado = await Promise.allSettled([searchMediaWithFilters({ query: query || '', genreId, year: ano, limit: 12 })]);
  if (midiaEl) {
    if (resultado[0].status === 'rejected') {
      midiaEl.innerHTML = '<p class="opacity-50 text-sm col-span-full">Erro ao buscar filmes/séries.</p>';
    } else {
      const { movies = [], series = [] } = resultado[0].value;
      const todos = [...movies, ...series];
      if (todos.length === 0) {
        midiaEl.innerHTML = '<p class="opacity-50 text-sm col-span-full">Nenhuma mídia encontrada.</p>';
      } else {
        midiaEl.innerHTML = todos.map(m => renderMidiaCard(m)).join('');
        midiaEl.querySelectorAll('[data-midia-id]').forEach(el => {
          el.addEventListener('click', () => abrirMidia(el.dataset.midiaId, el.dataset.midiaTipo, el.dataset.midiaTitulo, el.dataset.midiaPoster, el.dataset.midiaAno, el.dataset.midiaRating, el.dataset.midiaOverview));
        });
      }
    }
  }
}

// ─── Render cards ────────────────────────────────────────────
function renderLivroCard(book) {
  const imgHtml = book.cover
    ? `<img src="${book.cover}" alt="Capa de ${book.title}" loading="lazy" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-bottom:2px solid #000;">`
    : `<div style="aspect-ratio:2/3;background:#5065ff;display:flex;align-items:center;justify-content:center;border-bottom:2px solid #000;"><span class="material-symbols-outlined" style="font-size:3rem;color:#fff;font-variation-settings:'FILL' 1">menu_book</span></div>`;
  return `
    <article class="bg-white border-2 border-black cursor-pointer hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      data-livro-id="${book.id}" data-livro-titulo="${book.title.replace(/"/g,'&quot;')}"
      data-livro-autor="${(book.author||'').replace(/"/g,'&quot;')}" data-livro-cover="${book.cover || ''}" data-livro-ano="${book.year || ''}"
      tabindex="0" role="button" aria-label="Ver ${book.title}">
      ${imgHtml}
      <div style="padding:0.75rem;">
        <h3 style="font-weight:700;font-size:0.9rem;line-height:1.2;margin-bottom:0.25rem;">${book.title}</h3>
        <p style="font-size:0.75rem;opacity:0.6;">${book.author}</p>
        ${book.year ? `<span style="font-size:0.7rem;font-weight:900;opacity:0.4;">${book.year}</span>` : ''}
      </div>
    </article>`;
}

function renderMidiaCard(media) {
  const tipo = media.type === 'movie' ? 'Filme' : 'Série';
  const bgChip = media.type === 'movie' ? '#5065ff' : '#fe4c00';
  const poster = media.poster
    ? `<img src="${media.poster}" alt="${media.title}" loading="lazy" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-bottom:2px solid #000;">`
    : `<div style="aspect-ratio:2/3;background:#fe4c00;display:flex;align-items:center;justify-content:center;border-bottom:2px solid #000;"><span class="material-symbols-outlined" style="font-size:3rem;color:#fff;font-variation-settings:'FILL' 1">movie</span></div>`;
  return `
    <article class="bg-white border-2 border-black cursor-pointer hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      data-midia-id="${media.id}" data-midia-tipo="${media.type}"
      data-midia-titulo="${(media.title||'').replace(/"/g,'&quot;')}" data-midia-poster="${media.poster || ''}"
      data-midia-ano="${media.year || ''}" data-midia-rating="${media.rating || ''}"
      data-midia-overview="${(media.overview||'').replace(/"/g,'&quot;').slice(0,300)}"
      tabindex="0" role="button" aria-label="Ver ${media.title}">
      ${poster}
      <div style="padding:0.75rem;">
        <span style="font-size:0.65rem;font-weight:900;color:#fff;background:${bgChip};padding:2px 6px;border:1px solid #000;">${tipo}</span>
        <h3 style="font-weight:700;font-size:0.9rem;line-height:1.2;margin:0.3rem 0 0.2rem;">${media.title}</h3>
        ${media.year ? `<span style="font-size:0.7rem;font-weight:900;opacity:0.4;">${media.year}</span>` : ''}
        ${media.rating ? `<span style="font-size:0.7rem;font-weight:700;margin-left:6px;opacity:0.6;">★ ${media.rating}</span>` : ''}
      </div>
    </article>`;
}

// ─── Página de mídia ─────────────────────────────────────────
async function abrirMidia(id, tipo, titulo, poster, ano, rating, overview) {
  previousScreen = Object.entries(screens).find(([, el]) => el?.classList.contains('active'))?.[0] || 'busca';
  showScreen('midia');
  document.getElementById('midia-titulo').textContent    = titulo || '–';
  document.getElementById('midia-tipo-ano').textContent  = `${tipo === 'movie' ? 'Filme' : 'Série'}${ano ? ' · ' + ano : ''}`;
  document.getElementById('midia-rating').textContent    = rating ? `★ ${rating} / 10` : '–';
  document.getElementById('midia-extra').textContent     = '–';
  document.getElementById('midia-descricao').textContent = overview || 'Carregando sinopse…';
  document.getElementById('midia-tags').innerHTML        = '';
  document.getElementById('midia-livros').innerHTML      = '<p class="opacity-50 col-span-full text-sm">Buscando livros relacionados…</p>';
  const posterWrap = document.getElementById('midia-poster-wrap');
  posterWrap.innerHTML = poster
    ? `<img src="${poster}" alt="${titulo}" style="width:100%;border:4px solid #000;box-shadow:12px 12px 0 0 #5065ff;" loading="lazy">`
    : `<div class="book-icon-container bg-orange border-4 border-black shadow-[16px_16px_0px_0px_#5065ff]"><span class="material-symbols-outlined text-white text-8xl" style="font-variation-settings:'FILL' 1,'wght' 700">movie</span></div>`;
  try {
    const detalhes = await getMediaDetails(Number(id), tipo).catch(() => null);
    if (detalhes) {
      if (detalhes.overview) document.getElementById('midia-descricao').textContent = detalhes.overview;
      document.getElementById('midia-tmdb-link').href = detalhes.tmdbUrl || '#';
      if (detalhes.runtime) document.getElementById('midia-extra').textContent = detalhes.runtime;
      if (detalhes.seasons) document.getElementById('midia-extra').textContent = `${detalhes.seasons} temporada(s)`;
      const tagsEl = document.getElementById('midia-tags');
      const cores = ['bg-orange text-white', 'bg-blue text-white', 'bg-yellow text-black'];
(detalhes.subjects || []).slice(0, 4).forEach((s, i) => {
  const span = document.createElement('span');
  span.className = `${cores[i % cores.length]} px-3 py-1 font-black text-xs uppercase border-2 border-black cursor-pointer hover:-translate-y-0.5 transition-all`;
  span.textContent = s;
  span.title = `Buscar por ${s}`;
  span.addEventListener('click', () => navegarParaTagGenero(s));
  tagsEl.appendChild(span);
});
      const livrosEl = document.getElementById('midia-livros');
      try {
        const livros = await searchBooksByGenres(
  detalhes.genres || [],
  8,
  titulo,                        // passa o título da mídia
  detalhes.overview || ''        // passa a sinopse
);
        if (livros.length > 0) {
          livrosEl.innerHTML = livros.slice(0, 4).map(b => renderLivroCard(b)).join('');
          livrosEl.querySelectorAll('[data-livro-id]').forEach(el => {
            el.addEventListener('click', () => abrirLivro(el.dataset.livroId, el.dataset.livroTitulo, el.dataset.livroAutor, el.dataset.livroCover, el.dataset.livroAno));
          });
        } else {
          livrosEl.innerHTML = '<p class="opacity-50 col-span-full text-sm">Nenhum livro relacionado encontrado.</p>';
        }
      } catch(err) { document.getElementById('midia-livros').innerHTML = '<p class="opacity-50 col-span-full text-sm">Erro ao buscar livros relacionados.</p>'; }
    }
  } catch(err) { console.error('Erro ao carregar mídia:', err); }
}
document.getElementById('midia-back-btn')?.addEventListener('click', () => showScreen(previousScreen || 'busca'));

// ─── Página de livro ─────────────────────────────────────────
async function abrirLivro(workId, titulo, autor, cover, ano) {
  previousScreen = Object.entries(screens).find(([, el]) => el?.classList.contains('active'))?.[0] || 'home';
  showScreen('livro');
  document.getElementById('livro-titulo').textContent    = titulo || '–';
  document.getElementById('livro-autor').textContent     = autor  || '–';
  document.getElementById('livro-ano').textContent       = ano    || '–';
  document.getElementById('livro-descricao').textContent = 'Carregando descrição…';
  document.getElementById('livro-tags').innerHTML        = '';
  document.getElementById('livro-adaptacoes').innerHTML  = '<p class="opacity-50 col-span-full text-sm">Buscando adaptações…</p>';
  const tituloEnc = encodeURIComponent(`"${titulo}"`);
  const lerBiblion = document.getElementById('ler-biblion');
  const lerMec     = document.getElementById('ler-mec');
  const lerDominio = document.getElementById('ler-dominio');
  const lerOL      = document.getElementById('ler-openlibrary');
  if (lerBiblion) lerBiblion.href = `https://www.google.com/search?q=${tituloEnc}+site:biblion.odilo.us`;
  if (lerMec)     lerMec.href     = `https://www.google.com/search?q=${tituloEnc}+site:meclivros.mec.gov.br`;
  if (lerDominio) lerDominio.href = `https://dominiopublico.mec.gov.br/pesquisa/PesquisaObraForm.jsp?co_autor=&tx_titulo=${encodeURIComponent(titulo)}`;
  if (lerOL)      lerOL.href      = `https://openlibrary.org/search?q=${encodeURIComponent(titulo)}`;
  const coverWrap = document.getElementById('livro-cover-wrap');
  coverWrap.innerHTML = cover
    ? `<img src="${cover}" alt="Capa de ${titulo}" style="width:100%;border:4px solid #000;box-shadow:12px 12px 0 0 #fe4c00;" loading="lazy">`
    : `<div class="book-icon-container bg-blue border-4 border-black shadow-[16px_16px_0px_0px_#fe4c00]"><span class="material-symbols-outlined text-white text-8xl" style="font-variation-settings:'FILL' 1,'wght' 700">auto_stories</span></div>`;

  // Carrega resenhas do livro
  carregarResenhasLivro(workId || titulo);

  // Preenche dados no formulário de resenha
  const inputLivroId    = document.getElementById('resenha-livro-id');
  const inputLivroTit   = document.getElementById('resenha-livro-titulo');
  const inputLivroAutor = document.getElementById('resenha-livro-autor');
  const inputLivroCover = document.getElementById('resenha-livro-cover');
  if (inputLivroId)    inputLivroId.value    = workId || titulo;
  if (inputLivroTit)   inputLivroTit.value   = titulo;
  if (inputLivroAutor) inputLivroAutor.value = autor || '';
  if (inputLivroCover) inputLivroCover.value = cover || '';

  try {
    const [detalhes, adaptacoes] = await Promise.all([
      workId ? getBookDetails(workId).catch(() => null) : Promise.resolve(null),
      findAdaptations(titulo, autor).catch(() => []),
    ]);
    if (detalhes) {
      document.getElementById('livro-descricao').textContent = detalhes.description || 'Sem descrição disponível.';
      document.getElementById('livro-ol-link').href = detalhes.olUrl || '#';
      const tagsEl = document.getElementById('livro-tags');
      const cores = ['bg-yellow text-black', 'bg-blue text-white', 'bg-orange text-white'];
(detalhes.genres || []).slice(0, 4).forEach((g, i) => {
  const span = document.createElement('span');
  span.className = `${cores[i % cores.length]} px-3 py-1 font-black text-xs uppercase border-2 border-black cursor-pointer hover:-translate-y-0.5 transition-all`;
  span.textContent = g;
  span.title = `Buscar por ${g}`;
  span.addEventListener('click', () => navegarParaTagGenero(g));
  tagsEl.appendChild(span);
});
    } else {
      document.getElementById('livro-descricao').textContent = 'Descrição não disponível.';
    }
    const adaptEl = document.getElementById('livro-adaptacoes');
    if (adaptacoes.length === 0) {
      adaptEl.innerHTML = '<p class="opacity-50 col-span-full text-sm">Nenhuma adaptação encontrada no TMDB.</p>';
    } else {
      adaptEl.innerHTML = adaptacoes.map(m => {
        const tipo = m.type === 'movie' ? 'Filme' : 'Série';
        const poster = m.poster
          ? `<img src="${m.poster}" alt="${m.title}" loading="lazy" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-bottom:2px solid #000;">`
          : `<div style="aspect-ratio:2/3;background:#1d9e75;display:flex;align-items:center;justify-content:center;border-bottom:2px solid #000;"><span class="material-symbols-outlined" style="font-size:2.5rem;color:#fff;font-variation-settings:'FILL' 1">movie</span></div>`;
        return `<a href="${m.tmdbUrl}" target="_blank" rel="noopener" class="bg-white border-2 border-black hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] block">
          ${poster}
          <div style="padding:0.6rem;">
            <span style="font-size:0.65rem;font-weight:900;background:#fe4c00;color:#fff;padding:2px 6px;border:1px solid #000;">${tipo}</span>
            <h4 style="font-weight:700;font-size:0.85rem;margin-top:0.3rem;line-height:1.2;">${m.title}</h4>
            ${m.year ? `<p style="font-size:0.7rem;opacity:0.5;">${m.year}</p>` : ''}
          </div>
        </a>`;
      }).join('');
    }
  } catch(err) {
    console.error('Erro ao carregar livro:', err);
    document.getElementById('livro-descricao').textContent = 'Erro ao carregar detalhes.';
  }
}
document.getElementById('livro-back-btn')?.addEventListener('click', () => showScreen(previousScreen || 'busca'));

// ─── Navegação ───────────────────────────────────────────────
const navLinks = document.querySelectorAll("[data-nav]");

function showScreen(name) {
  Object.values(screens).forEach(s => s && s.classList.remove("active"));
  navLinks.forEach(l => l.classList.remove("active"));
  const target = screens[name];
  if (target) target.classList.add("active");
  navLinks.forEach(l => { if (l.dataset.nav === name) l.classList.add("active"); });
  if (name === "mapa")          setTimeout(initMap, 100);
  if (name === "home")          { setTimeout(initMapHome, 200); carregarEstatisticasComunidade(); }
  if (name === "explorar")      carregarCapasExplorar();
  if (name === "recomendacoes") carregarRecomendacoes();
  if (name === "perfil" && currentUser) carregarPerfilProprio();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", (e) => {
  const navEl = e.target.closest("[data-nav]");
  if (!navEl) return;
  e.preventDefault();
  const dest = navEl.dataset.nav;
  if ((dest === "perfil" || dest === "recomendacoes") && !currentUser) { showScreen("login"); return; }
  showScreen(dest);
});

// ─── Auth ────────────────────────────────────────────────────
let authResolved = false;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  atualizarHeaderAuth(user);
  atualizarPerfil(user);

  if (user) {
    // Salva/atualiza perfil público no Firestore
    await setDoc(doc(db, "users", user.uid), {
      nome: user.displayName || user.email,
      email: user.email,
      uid: user.uid,
      atualizadoEm: serverTimestamp(),
    }, { merge: true });
  }

  if (!authResolved) {
    authResolved = true;
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.classList.add("hidden");
    showScreen("home");
  } else {
    if (!user) {
      const telaAtiva = Object.entries(screens).find(([, el]) => el && el.classList.contains("active"))?.[0];
      if (telaAtiva === "perfil" || telaAtiva === "recomendacoes") showScreen("login");
    }
  }
});

function atualizarHeaderAuth(user) {
  const btnCadastro = document.getElementById("header-cadastro-btn");
  const btnAvatar   = document.getElementById("header-avatar");
  const btnLoginNav = document.getElementById("bottom-nav-login");
  if (user) {
    if (btnCadastro) btnCadastro.style.display = "none";
    if (btnAvatar)   btnAvatar.style.display   = "flex";
    const initial = document.getElementById("avatar-initial");
    if (initial) { initial.textContent = (user.displayName || user.email || "U")[0].toUpperCase(); initial.style.fontFamily = "Poppins, sans-serif"; initial.style.fontSize = "1rem"; initial.style.fontWeight = "900"; }
    if (btnLoginNav) { btnLoginNav.dataset.nav = "perfil"; btnLoginNav.setAttribute("aria-label", "Perfil"); btnLoginNav.querySelector(".material-symbols-outlined").textContent = "person"; btnLoginNav.lastChild.textContent = "Perfil"; }
  } else {
    if (btnCadastro) btnCadastro.style.display = "";
    if (btnAvatar)   btnAvatar.style.display   = "none";
    if (btnLoginNav) { btnLoginNav.dataset.nav = "login"; btnLoginNav.setAttribute("aria-label", "Entrar"); btnLoginNav.querySelector(".material-symbols-outlined").textContent = "login"; const span = btnLoginNav.querySelector(".material-symbols-outlined"); if (span && span.nextSibling) span.nextSibling.textContent = "Entrar"; }
  }
}

function atualizarPerfil(user) {
  const elNome   = document.getElementById("perfil-nome");
  const elHandle = document.getElementById("perfil-handle");
  if (!elNome) return;
  if (user) { elNome.textContent = user.displayName || user.email; elHandle.textContent = user.email; }
  else       { elNome.textContent = "–"; elHandle.textContent = ""; }
}

// ─── Perfil próprio (dados reais) ────────────────────────────
async function carregarPerfilProprio() {
  if (!currentUser) return;
  try {
    const shelfSnap = await getDoc(doc(db, "shelves", currentUser.uid));
    const shelf = shelfSnap.exists() ? shelfSnap.data() : { lidos: [], querLer: [], filmesVistos: [] };
    renderEstante(shelf.lidos || [], 'lidos');
    renderEstante(shelf.querLer || [], 'quer-ler');
    renderFilmesVistos(shelf.filmesVistos || []);

    const elLidos  = document.getElementById("stat-lidos");
    const elQuer   = document.getElementById("stat-quer-ler");
    const elFilmes = document.getElementById("stat-filmes");
    if (elLidos)  elLidos.textContent  = (shelf.lidos || []).length;
    if (elQuer)   elQuer.textContent   = (shelf.querLer || []).length;
    if (elFilmes) elFilmes.textContent = (shelf.filmesVistos || []).length;

    // Resenhas do usuário
    const qResenhas = query(collection(db, "reviews"), where("uid", "==", currentUser.uid), orderBy("criadoEm", "desc"));
    const resenhasSnap = await getDocs(qResenhas);
    const elResenhas = document.getElementById("stat-resenhas");
    if (elResenhas) elResenhas.textContent = resenhasSnap.size;
    renderMinhasResenhas(resenhasSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // Recomendações do usuário
    const qRecs = query(collection(db, "recommendations"), where("uid", "==", currentUser.uid), orderBy("criadoEm", "desc"));
    const recsSnap = await getDocs(qRecs);
    renderMinhasRecomendacoes(recsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch(err) { console.error("Erro ao carregar perfil:", err); }
}

function renderEstante(items, tipo) {
  const elId = tipo === 'lidos' ? 'estante-lidos' : 'estante-quer-ler';
  const el = document.getElementById(elId);
  if (!el) return;
  if (items.length === 0) { el.innerHTML = `<p class="opacity-50 text-sm col-span-full">Nenhum livro aqui ainda.</p>`; return; }
  el.innerHTML = items.map(item => `
    <div class="bk-card" style="position:relative;">
      <div class="book-spine" style="background:var(--tertiary);overflow:hidden;">
        ${item.cover ? `<img src="${item.cover}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">` : `<span class="material-symbols-outlined" style="font-size:2.5rem;color:#fff;">menu_book</span>`}
      </div>
      <div style="padding:0.75rem;">
        <h4 style="font-weight:700;font-size:0.875rem;">${item.titulo}</h4>
        <p style="font-size:0.75rem;color:#555;margin-top:0.2rem;">${item.autor || ''}</p>
      </div>
      <button data-remover-livro="${item.id}" data-tipo="${tipo}" title="Remover"
        style="position:absolute;top:6px;right:6px;background:#fe4c00;border:2px solid #000;color:#fff;width:24px;height:24px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;font-weight:900;">×</button>
    </div>`).join('');
}

function renderFilmesVistos(items) {
  const el = document.getElementById('estante-filmes');
  if (!el) return;
  if (items.length === 0) { el.innerHTML = `<p class="opacity-50 text-sm col-span-full">Nenhum filme/série aqui ainda.</p>`; return; }
  el.innerHTML = items.map(item => `
    <div class="bk-card" style="position:relative;">
      <div class="book-spine" style="background:var(--primary);overflow:hidden;">
        ${item.poster ? `<img src="${item.poster}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">` : `<span class="material-symbols-outlined" style="font-size:2.5rem;color:#fff;">movie</span>`}
      </div>
      <div style="padding:0.75rem;">
        <h4 style="font-weight:700;font-size:0.875rem;">${item.titulo}</h4>
        <p style="font-size:0.75rem;color:#555;margin-top:0.2rem;">${item.tipo || ''}</p>
      </div>
      <button data-remover-filme="${item.id}" title="Remover"
        style="position:absolute;top:6px;right:6px;background:#fe4c00;border:2px solid #000;color:#fff;width:24px;height:24px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;font-weight:900;">×</button>
    </div>`).join('');
}

// ─── Adicionar à estante ─────────────────────────────────────
async function adicionarNaEstante(tipo, item) {
  if (!currentUser) { showScreen('login'); return; }
  try {
    const ref  = doc(db, "shelves", currentUser.uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : { lidos: [], querLer: [], filmesVistos: [] };
    const campo = tipo === 'lido' ? 'lidos' : tipo === 'quer-ler' ? 'querLer' : 'filmesVistos';
    const lista = data[campo] || [];
    if (lista.find(i => i.id === item.id)) { alert('Já está na sua lista!'); return; }
    lista.push(item);
    await setDoc(ref, { ...data, [campo]: lista }, { merge: true });
    alert('✅ Adicionado com sucesso!');
    carregarPerfilProprio();
  } catch(err) { console.error(err); alert('Erro ao salvar.'); }
}

async function removerDaEstante(tipo, itemId) {
  if (!currentUser) return;
  try {
    const ref  = doc(db, "shelves", currentUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data  = snap.data();
    const campo = tipo === 'lidos' ? 'lidos' : tipo === 'quer-ler' ? 'querLer' : 'filmesVistos';
    data[campo] = (data[campo] || []).filter(i => i.id !== itemId);
    await setDoc(ref, data);
    carregarPerfilProprio();
  } catch(err) { console.error(err); }
}

// Delegação para botões de remover da estante
document.addEventListener('click', async (e) => {
  const btnLivro  = e.target.closest('[data-remover-livro]');
  const btnFilme  = e.target.closest('[data-remover-filme]');
  if (btnLivro) { const tipo = btnLivro.dataset.tipo; await removerDaEstante(tipo, btnLivro.dataset.removerLivro); }
  if (btnFilme) { await removerDaEstante('filmesVistos', btnFilme.dataset.removerFilme); }
});

// Botões "Adicionar à estante" nas páginas de livro e mídia
document.getElementById('btn-add-lido')?.addEventListener('click', () => {
  const titulo = document.getElementById('livro-titulo')?.textContent;
  const autor  = document.getElementById('livro-autor')?.textContent;
  const cover  = document.getElementById('resenha-livro-cover')?.value || '';
  const id     = document.getElementById('resenha-livro-id')?.value || titulo;
  adicionarNaEstante('lido', { id, titulo, autor, cover });
});
document.getElementById('btn-add-quer-ler')?.addEventListener('click', () => {
  const titulo = document.getElementById('livro-titulo')?.textContent;
  const autor  = document.getElementById('livro-autor')?.textContent;
  const cover  = document.getElementById('resenha-livro-cover')?.value || '';
  const id     = document.getElementById('resenha-livro-id')?.value || titulo;
  adicionarNaEstante('quer-ler', { id, titulo, autor, cover });
});
document.getElementById('btn-add-filme-visto')?.addEventListener('click', () => {
  const titulo  = document.getElementById('midia-titulo')?.textContent;
  const tipoStr = document.getElementById('midia-tipo-ano')?.textContent || '';
  const poster  = document.getElementById('midia-poster-wrap')?.querySelector('img')?.src || '';
  const id      = Date.now().toString();
  adicionarNaEstante('filme-visto', { id, titulo, tipo: tipoStr.split('·')[0].trim(), poster });
});

// ─── Resenhas ────────────────────────────────────────────────
let resenhaEditandoId = null;

const formResenha = document.getElementById('form-resenha');
if (formResenha) {
  formResenha.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showScreen('login'); return; }
    const texto   = document.getElementById('resenha-texto')?.value.trim();
    const nota    = Number(document.getElementById('resenha-nota')?.value);
    const spoiler = document.getElementById('resenha-spoiler')?.checked;
    const livroId    = document.getElementById('resenha-livro-id')?.value;
    const livroTit   = document.getElementById('resenha-livro-titulo')?.value;
    const livroAutor = document.getElementById('resenha-livro-autor')?.value;
    const livroCover = document.getElementById('resenha-livro-cover')?.value;
    if (!texto) { alert('Escreva sua resenha.'); return; }
    const btn = formResenha.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      const payload = {
        uid: currentUser.uid, nomeUsuario: currentUser.displayName || currentUser.email,
        livroId, livroTitulo: livroTit, livroAutor, livroCover,
        texto, nota, spoiler, criadoEm: serverTimestamp(),
      };
      if (resenhaEditandoId) {
        await updateDoc(doc(db, "reviews", resenhaEditandoId), { texto, nota, spoiler });
        resenhaEditandoId = null;
      } else {
        await addDoc(collection(db, "reviews"), payload);
      }
      formResenha.reset();
      document.getElementById('resenha-form-titulo').textContent = 'Escrever Resenha';
      btn.textContent = 'Publicar Resenha';
      carregarResenhasLivro(livroId);
      if (screens.perfil?.classList.contains('active')) carregarPerfilProprio();
    } catch(err) { console.error(err); alert('Erro ao salvar resenha.'); }
    finally { btn.disabled = false; }
  });
}

async function carregarResenhasLivro(livroId) {
  const el = document.getElementById('livro-resenhas-lista');
  if (!el || !livroId) return;
  el.innerHTML = '<p class="opacity-50 text-sm">Carregando resenhas…</p>';
  try {
    const q = query(collection(db, "reviews"), where("livroId", "==", livroId), orderBy("criadoEm", "desc"), limit(20));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = '<p class="opacity-50 text-sm">Seja o primeiro a resenhar este livro!</p>'; return; }
    el.innerHTML = snap.docs.map(d => renderResenhaCard({ id: d.id, ...d.data() })).join('');
    ativarSpoilerBtns(el);
  } catch(err) { el.innerHTML = '<p class="opacity-50 text-sm">Erro ao carregar resenhas.</p>'; }
}

function renderResenhaCard(r) {
  const isOwner = currentUser && currentUser.uid === r.uid;
  const estrelas = '★'.repeat(r.nota || 0) + '☆'.repeat(5 - (r.nota || 0));
  const textoHtml = r.spoiler
    ? `<div class="spoiler-wrap" style="position:relative;">
        <div class="spoiler-blur" style="filter:blur(5px);user-select:none;">${r.texto}</div>
        <button class="spoiler-reveal-btn" style="position:absolute;inset:0;width:100%;background:rgba(0,0,0,0.5);color:#fff;font-weight:900;border:none;cursor:pointer;font-size:0.85rem;">
          ⚠️ Spoiler — clique para revelar
        </button>
      </div>`
    : `<p>${r.texto}</p>`;
  return `
    <div class="resenha-card" data-resenha-id="${r.id}" style="border:2px solid #000;padding:1.25rem;margin-bottom:1rem;background:#fff;box-shadow:4px 4px 0 0 #000;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
        <div>
          <span style="font-weight:900;font-size:0.9rem;">${r.nomeUsuario}</span>
          ${r.spoiler ? '<span style="font-size:0.7rem;font-weight:700;background:#fe4c00;color:#fff;padding:2px 6px;border:1px solid #000;margin-left:6px;">SPOILER</span>' : ''}
          <button data-ver-perfil="${r.uid}" style="background:none;border:none;cursor:pointer;font-size:0.75rem;font-weight:700;text-decoration:underline;margin-left:8px;padding:0;">ver perfil</button>
        </div>
        <span style="font-size:1rem;color:#ffdf2b;text-shadow:0 0 2px #000;">${estrelas}</span>
      </div>
      <div style="font-size:0.9rem;line-height:1.6;">${textoHtml}</div>
      ${isOwner ? `
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
          <button data-editar-resenha="${r.id}" style="font-size:0.75rem;font-weight:700;padding:4px 10px;border:2px solid #000;background:#ffdf2b;cursor:pointer;">Editar</button>
          <button data-apagar-resenha="${r.id}" style="font-size:0.75rem;font-weight:700;padding:4px 10px;border:2px solid #000;background:#fe4c00;color:#fff;cursor:pointer;">Apagar</button>
        </div>` : ''}
    </div>`;
}

function renderMinhasResenhas(resenhas) {
  const el = document.getElementById('perfil-resenhas');
  if (!el) return;
  if (resenhas.length === 0) { el.innerHTML = '<p class="opacity-50 text-sm">Você ainda não escreveu nenhuma resenha.</p>'; return; }
  el.innerHTML = resenhas.map(r => renderResenhaCard(r)).join('');
  ativarSpoilerBtns(el);
}

function ativarSpoilerBtns(container) {
  container.querySelectorAll('.spoiler-reveal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.spoiler-wrap');
      if (wrap) { wrap.querySelector('.spoiler-blur').style.filter = 'none'; btn.remove(); }
    });
  });
}

// Delegação para editar/apagar resenha
document.addEventListener('click', async (e) => {
  const editBtn   = e.target.closest('[data-editar-resenha]');
  const apagarBtn = e.target.closest('[data-apagar-resenha]');
  if (editBtn) {
    const id = editBtn.dataset.editarResenha;
    const card = editBtn.closest('[data-resenha-id]');
    const texto = card?.querySelector('p')?.textContent || card?.querySelector('.spoiler-blur')?.textContent || '';
    const nota  = card?.querySelector('.resenha-card')?.dataset.nota || 0;
    document.getElementById('resenha-texto').value = texto;
    document.getElementById('resenha-form-titulo').textContent = 'Editar Resenha';
    const btn = formResenha?.querySelector('button[type=submit]');
    if (btn) btn.textContent = 'Salvar Alterações';
    resenhaEditandoId = id;
    document.getElementById('resenha-texto')?.scrollIntoView({ behavior: 'smooth' });
  }
  if (apagarBtn) {
    if (!confirm('Apagar esta resenha?')) return;
    try {
      await deleteDoc(doc(db, "reviews", apagarBtn.dataset.apagarResenha));
      apagarBtn.closest('[data-resenha-id]')?.remove();
    } catch(err) { alert('Erro ao apagar.'); }
  }
});

// ─── Recomendações ───────────────────────────────────────────
let recEditandoId = null;

const formRec = document.getElementById('form-recomendacao');
if (formRec) {
  formRec.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showScreen('login'); return; }
    const midia   = document.getElementById('rec-midia')?.value.trim();
    const livro   = document.getElementById('rec-livro')?.value.trim();
    const texto   = document.getElementById('rec-texto')?.value.trim();
    const spoiler = document.getElementById('rec-spoiler')?.checked;
    if (!midia || !livro) { alert('Preencha o filme/série e o livro recomendado.'); return; }
    const btn = formRec.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      if (recEditandoId) {
        await updateDoc(doc(db, "recommendations", recEditandoId), { midia, livro, texto, spoiler });
        recEditandoId = null;
        document.getElementById('rec-form-titulo').textContent = 'Nova Recomendação';
        btn.textContent = 'Publicar';
      } else {
        await addDoc(collection(db, "recommendations"), {
          uid: currentUser.uid, nomeUsuario: currentUser.displayName || currentUser.email,
          midia, livro, texto, spoiler, criadoEm: serverTimestamp(),
        });
      }
      formRec.reset();
      carregarRecomendacoes();
    } catch(err) { console.error(err); alert('Erro ao salvar recomendação.'); }
    finally { btn.disabled = false; btn.textContent = recEditandoId ? 'Salvar Alterações' : 'Publicar'; }
  });
}

async function carregarRecomendacoes() {
  const el = document.getElementById('lista-recomendacoes');
  if (!el) return;
  el.innerHTML = '<p class="opacity-50 text-sm">Carregando recomendações…</p>';
  try {
    const q = query(collection(db, "recommendations"), orderBy("criadoEm", "desc"), limit(30));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = '<p class="opacity-50 text-sm">Nenhuma recomendação ainda. Seja o primeiro!</p>'; return; }
    el.innerHTML = snap.docs.map(d => renderRecCard({ id: d.id, ...d.data() })).join('');
    ativarSpoilerBtns(el);
  } catch(err) { el.innerHTML = '<p class="opacity-50 text-sm">Erro ao carregar recomendações.</p>'; }
}

function renderRecCard(r) {
  const isOwner = currentUser && currentUser.uid === r.uid;
  const textoHtml = r.texto
    ? (r.spoiler
        ? `<div class="spoiler-wrap" style="position:relative;margin-top:0.5rem;">
            <div class="spoiler-blur" style="filter:blur(5px);user-select:none;font-size:0.875rem;">${r.texto}</div>
            <button class="spoiler-reveal-btn" style="position:absolute;inset:0;width:100%;background:rgba(0,0,0,0.5);color:#fff;font-weight:900;border:none;cursor:pointer;font-size:0.85rem;">⚠️ Spoiler — clique para revelar</button>
          </div>`
        : `<p style="font-size:0.875rem;margin-top:0.5rem;opacity:0.8;">${r.texto}</p>`)
    : '';
  return `
    <div class="rec-card" data-rec-id="${r.id}" style="border:2px solid #000;padding:1.25rem;background:#fff;box-shadow:4px 4px 0 0 #000;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
        <span style="font-weight:900;font-size:0.85rem;">${r.nomeUsuario}</span>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          ${r.spoiler ? '<span style="font-size:0.7rem;font-weight:700;background:#fe4c00;color:#fff;padding:2px 6px;border:1px solid #000;">SPOILER</span>' : ''}
          <button data-ver-perfil="${r.uid}" style="background:none;border:none;cursor:pointer;font-size:0.75rem;font-weight:700;text-decoration:underline;padding:0;">ver perfil</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
        <span style="font-weight:700;font-size:0.95rem;background:#5065ff;color:#fff;padding:3px 10px;border:2px solid #000;">${r.midia}</span>
        <span class="material-symbols-outlined" style="font-size:1.2rem;">arrow_forward</span>
        <span style="font-weight:700;font-size:0.95rem;background:#ffdf2b;color:#000;padding:3px 10px;border:2px solid #000;">${r.livro}</span>
      </div>
      ${textoHtml}
      ${isOwner ? `
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
          <button data-editar-rec="${r.id}" style="font-size:0.75rem;font-weight:700;padding:4px 10px;border:2px solid #000;background:#ffdf2b;cursor:pointer;">Editar</button>
          <button data-apagar-rec="${r.id}" style="font-size:0.75rem;font-weight:700;padding:4px 10px;border:2px solid #000;background:#fe4c00;color:#fff;cursor:pointer;">Apagar</button>
        </div>` : ''}
    </div>`;
}

function renderMinhasRecomendacoes(recs) {
  const el = document.getElementById('perfil-recomendacoes');
  if (!el) return;
  if (recs.length === 0) { el.innerHTML = '<p class="opacity-50 text-sm">Você ainda não fez nenhuma recomendação.</p>'; return; }
  el.innerHTML = recs.map(r => renderRecCard(r)).join('');
  ativarSpoilerBtns(el);
}

// Delegação para editar/apagar recomendação
document.addEventListener('click', async (e) => {
  const editBtn   = e.target.closest('[data-editar-rec]');
  const apagarBtn = e.target.closest('[data-apagar-rec]');
  if (editBtn) {
    const id   = editBtn.dataset.editarRec;
    const card = editBtn.closest('[data-rec-id]');
    const midia = card?.querySelector('span[style*="5065ff"]')?.textContent || '';
    const livro = card?.querySelector('span[style*="ffdf2b"]')?.textContent || '';
    const texto = card?.querySelector('p')?.textContent || card?.querySelector('.spoiler-blur')?.textContent || '';
    document.getElementById('rec-midia').value = midia;
    document.getElementById('rec-livro').value = livro;
    document.getElementById('rec-texto').value = texto;
    document.getElementById('rec-form-titulo').textContent = 'Editar Recomendação';
    const btn = formRec?.querySelector('button[type=submit]');
    if (btn) btn.textContent = 'Salvar Alterações';
    recEditandoId = id;
    document.getElementById('rec-midia')?.scrollIntoView({ behavior: 'smooth' });
  }
  if (apagarBtn) {
    if (!confirm('Apagar esta recomendação?')) return;
    try {
      await deleteDoc(doc(db, "recommendations", apagarBtn.dataset.apagarRec));
      apagarBtn.closest('[data-rec-id]')?.remove();
    } catch(err) { alert('Erro ao apagar.'); }
  }
});

// ─── Perfil público de outros usuários ──────────────────────
async function abrirPerfilPublico(uid) {
  if (uid === currentUser?.uid) { showScreen('perfil'); return; }
  previousScreen = Object.entries(screens).find(([, el]) => el?.classList.contains('active'))?.[0] || 'home';
  showScreen('perfil-publico');
  const elNome   = document.getElementById('pub-perfil-nome');
  const elHandle = document.getElementById('pub-perfil-handle');
  const elRecs   = document.getElementById('pub-recomendacoes');
  const elRes    = document.getElementById('pub-resenhas');
  if (elNome)   elNome.textContent   = 'Carregando…';
  if (elHandle) elHandle.textContent = '';
  if (elRecs)   elRecs.innerHTML     = '<p class="opacity-50 text-sm">Carregando…</p>';
  if (elRes)    elRes.innerHTML      = '<p class="opacity-50 text-sm">Carregando…</p>';
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    const userData = userSnap.exists() ? userSnap.data() : {};
    if (elNome)   elNome.textContent   = userData.nome   || 'Usuário';
    if (elHandle) elHandle.textContent = userData.email  || '';

    const [recsSnap, resSnap] = await Promise.all([
      getDocs(query(collection(db, "recommendations"), where("uid", "==", uid), orderBy("criadoEm", "desc"), limit(20))),
      getDocs(query(collection(db, "reviews"),         where("uid", "==", uid), orderBy("criadoEm", "desc"), limit(20))),
    ]);

    if (elRecs) {
      if (recsSnap.empty) { elRecs.innerHTML = '<p class="opacity-50 text-sm">Nenhuma recomendação ainda.</p>'; }
      else { elRecs.innerHTML = recsSnap.docs.map(d => renderRecCard({ id: d.id, ...d.data() })).join(''); ativarSpoilerBtns(elRecs); }
    }
    if (elRes) {
      if (resSnap.empty) { elRes.innerHTML = '<p class="opacity-50 text-sm">Nenhuma resenha ainda.</p>'; }
      else { elRes.innerHTML = resSnap.docs.map(d => renderResenhaCard({ id: d.id, ...d.data() })).join(''); ativarSpoilerBtns(elRes); }
    }
  } catch(err) { console.error('Erro ao carregar perfil público:', err); }
}

document.getElementById('pub-perfil-back-btn')?.addEventListener('click', () => showScreen(previousScreen || 'home'));

// Delegação para "ver perfil"
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ver-perfil]');
  if (btn) abrirPerfilPublico(btn.dataset.verPerfil);
});

// ─── Validação ───────────────────────────────────────────────
function mostrarErroCampo(fieldId, errorId, msg) {
  const f = document.getElementById(fieldId); const e = document.getElementById(errorId);
  if (f) f.setAttribute("aria-invalid", "true");
  if (e) { e.textContent = msg; e.classList.add("visible"); }
}
function limparErroCampo(fieldId, errorId) {
  const f = document.getElementById(fieldId); const e = document.getElementById(errorId);
  if (f) f.removeAttribute("aria-invalid");
  if (e) e.classList.remove("visible");
}
function mostrarAlerta(alertId, tipo, msg) {
  const el = document.getElementById(alertId);
  if (!el) return;
  el.className = `alert-message visible ${tipo}`; el.textContent = msg;
}
function esconderAlerta(alertId) { const el = document.getElementById(alertId); if (el) el.classList.remove("visible"); }
function emailValido(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function traduzirErroFirebase(code) {
  const mapa = {
    "auth/email-already-in-use":   "Este e-mail já está cadastrado.",
    "auth/invalid-email":          "E-mail inválido.",
    "auth/weak-password":          "Senha fraca. Use ao menos 6 caracteres.",
    "auth/user-not-found":         "E-mail não encontrado.",
    "auth/wrong-password":         "Senha incorreta.",
    "auth/invalid-credential":     "E-mail ou senha incorretos.",
    "auth/too-many-requests":      "Muitas tentativas. Aguarde alguns minutos.",
    "auth/network-request-failed": "Erro de conexão. Verifique sua internet.",
    "auth/missing-email":          "Informe um e-mail.",
  };
  return mapa[code] || "Erro inesperado. Tente novamente.";
}

// ─── Cadastro ────────────────────────────────────────────────
const formCadastro = document.getElementById("form-cadastro");
if (formCadastro) {
  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault(); esconderAlerta("cadastro-alert");
    const nome  = document.getElementById("cad-nome").value.trim();
    const email = document.getElementById("cad-email").value.trim();
    const senha = document.getElementById("cad-senha").value;
    const conf  = document.getElementById("cad-conf-senha").value;
    let valido = true;
    [["cad-nome","err-nome"],["cad-email","err-email"],["cad-senha","err-senha"],["cad-conf-senha","err-conf"]].forEach(([f, e]) => limparErroCampo(f, e));
    if (!nome)               { mostrarErroCampo("cad-nome",       "err-nome",  "Informe seu nome completo."); valido = false; }
    if (!emailValido(email)) { mostrarErroCampo("cad-email",      "err-email", "Informe um e-mail válido."); valido = false; }
    if (senha.length < 6)    { mostrarErroCampo("cad-senha",      "err-senha", "A senha deve ter ao menos 6 caracteres."); valido = false; }
    if (senha !== conf)      { mostrarErroCampo("cad-conf-senha", "err-conf",  "As senhas não coincidem."); valido = false; }
    if (!valido) return;
    const btn = formCadastro.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Criando conta…";
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(cred.user, { displayName: nome });
      currentUser = cred.user;
      atualizarHeaderAuth(cred.user); atualizarPerfil(cred.user);
      formCadastro.reset(); showScreen("home");
    } catch(err) { mostrarAlerta("cadastro-alert", "error", traduzirErroFirebase(err.code)); }
    finally { btn.disabled = false; btn.textContent = "Cadastrar"; }
  });
}

// ─── Login ───────────────────────────────────────────────────
const formLogin = document.getElementById("form-login");
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault(); esconderAlerta("login-alert");
    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value;
    let valido = true;
    limparErroCampo("login-email", "err-login-email"); limparErroCampo("login-senha", "err-login-senha");
    if (!emailValido(email)) { mostrarErroCampo("login-email", "err-login-email", "Informe um e-mail válido."); valido = false; }
    if (!senha)              { mostrarErroCampo("login-senha", "err-login-senha", "Informe sua senha."); valido = false; }
    if (!valido) return;
    const btn = formLogin.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Entrando…";
    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      currentUser = cred.user;
      atualizarHeaderAuth(cred.user); atualizarPerfil(cred.user);
      formLogin.reset(); showScreen("home");
    } catch(err) { mostrarAlerta("login-alert", "error", traduzirErroFirebase(err.code)); }
    finally { btn.disabled = false; btn.textContent = "Entrar"; }
  });
}

// ─── Recuperação de Senha ────────────────────────────────────
const formRecuperar = document.getElementById("form-recuperar-senha");
if (formRecuperar) {
  formRecuperar.addEventListener("submit", async (e) => {
    e.preventDefault(); esconderAlerta("recuperar-alert"); limparErroCampo("rec-email", "err-rec-email");
    const email = document.getElementById("rec-email").value.trim();
    if (!emailValido(email)) { mostrarErroCampo("rec-email", "err-rec-email", "Informe um e-mail válido."); return; }
    const btn = formRecuperar.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      await sendPasswordResetEmail(auth, email);
      mostrarAlerta("recuperar-alert", "success", "E-mail enviado! Verifique sua caixa de entrada (e o spam).");
      formRecuperar.reset();
    } catch(err) { mostrarAlerta("recuperar-alert", "error", traduzirErroFirebase(err.code)); }
    finally { btn.disabled = false; btn.textContent = "Enviar link de recuperação"; }
  });
}

// ─── Logout ──────────────────────────────────────────────────
document.addEventListener("click", async (e) => {
  if (e.target.closest("#btn-logout")) {
    await signOut(auth);
    currentUser = null;
    atualizarHeaderAuth(null); atualizarPerfil(null);
    showScreen("login");
  }
});

// ─── Tabs ────────────────────────────────────────────────────
document.querySelectorAll(".tabs").forEach(grupo => {
  grupo.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      grupo.querySelectorAll(".tab-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("active"); btn.setAttribute("aria-selected", "true");
      // Mostrar/ocultar painéis da estante
      const target = btn.dataset.tab;
      if (target) {
        grupo.closest('[data-tabs-container]')?.querySelectorAll('[data-tab-panel]').forEach(panel => {
          panel.style.display = panel.dataset.tabPanel === target ? '' : 'none';
        });
      }
    });
  });
});

// ─── Feedback ────────────────────────────────────────────────
const formFeedback = document.getElementById("form-feedback");
if (formFeedback) {
  formFeedback.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome  = document.getElementById("fb-nome").value.trim();
    const email = document.getElementById("fb-email").value.trim();
    const msg   = document.getElementById("fb-msg").value.trim();
    if (!nome || !email || !msg) { alert("Preencha todos os campos antes de enviar."); return; }
    const btn = formFeedback.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      await addDoc(collection(db, "sugestoes"), { nome, email, mensagem: msg, criadoEm: serverTimestamp() });
      formFeedback.reset();
      alert("✅ Sugestão enviada! Obrigado pelo feedback.");
    } catch(err) { console.error(err); alert("Erro ao enviar. Tente novamente."); }
    finally { btn.disabled = false; btn.textContent = "Enviar Feedback"; }
  });
}
