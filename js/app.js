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
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initMap, initMapHome } from "./mapa.js";
// importação de APIs do arquivo 
import {
  searchBooks,
  searchMedia,
  searchMediaWithFilters,
  searchBooksByGenres,
  findAdaptations,
  getBookDetails,
  getMediaDetails,
} from './apis.js';

// ─── Estado ─────────────────────────────────────────────────
let currentUser = null;

// ─── Referências de telas ────────────────────────────────────
const screens = {
  home:                   document.getElementById("screen-home"),
  mapa:                   document.getElementById("screen-mapa"),
  perfil:                 document.getElementById("screen-perfil"),
  login:                  document.getElementById("screen-login"),
  cadastro:               document.getElementById("screen-cadastro"),
  explorar:               document.getElementById("screen-explorar"),
  "bibliotecas-digitais": document.getElementById("screen-bibliotecas-digitais"),
  busca:                  document.getElementById("screen-busca"),
  livro:                  document.getElementById("screen-livro"),
  midia:                  document.getElementById("screen-midia"),
};

// ─── Histórico de navegação (para o botão Voltar do livro) ───
let previousScreen = "home";

// ─── Curiosidades rotativas ──────────────────────────────────
const CURIOSIDADES = [
  { titulo: 'Senhor dos Anéis', texto: 'J.R.R. Tolkien levou mais de 12 anos para escrever O Senhor dos Anéis. A trilogia foi publicada em 3 volumes entre 1954 e 1955 e transformou o gênero fantasia para sempre.' },
  { titulo: 'Duna', texto: 'Frank Herbert pesquisou por 6 anos antes de escrever Duna. A obra foi rejeitada por 23 editoras antes de ser publicada em 1965 e se tornar o livro de ficção científica mais vendido da história.' },
  { titulo: '1984', texto: 'George Orwell escreveu 1984 enquanto estava gravemente doente com tuberculose. O livro foi publicado em 1949 e cunhou termos como "Grande Irmão" e "Duplipensar" que usamos até hoje.' },
  { titulo: 'Dom Casmurro', texto: 'Machado de Assis escreveu Dom Casmurro em 1899. A questão sobre a culpa ou inocência de Capitu gerou debates literários por mais de um século — e ainda não tem resposta definitiva.' },
  { titulo: 'O Iluminado', texto: 'Stephen King escreveu O Iluminado em apenas alguns meses. O próprio King odiou a adaptação de Kubrick, dizendo que ela perdia a humanidade dos personagens.' },
];
let curiosidadeAtual = Math.floor(Math.random() * CURIOSIDADES.length);

function renderCuriosidade(idx) {
  const c = CURIOSIDADES[idx];
  const tituloEl = document.getElementById('curiosidade-titulo');
  const textoEl  = document.getElementById('curiosidade-texto');
  if (tituloEl) tituloEl.textContent = c.titulo;
  if (textoEl)  textoEl.textContent  = c.texto;
}
renderCuriosidade(curiosidadeAtual);

document.getElementById('proxima-curiosidade')?.addEventListener('click', () => {
  curiosidadeAtual = (curiosidadeAtual + 1) % CURIOSIDADES.length;
  renderCuriosidade(curiosidadeAtual);
});

// ─── Filtros estáticos da tela de busca ─────────────────────
document.getElementById('busca-filtros')?.addEventListener('click', e => {
  const btn = e.target.closest('.filtro-genre-btn');
  if (!btn) return;
  document.querySelectorAll('.filtro-genre-btn').forEach(b => {
    b.setAttribute('aria-pressed', 'false');
    b.style.background = '#fff';
  });
  btn.setAttribute('aria-pressed', 'true');
  btn.style.background = '#ffdf2b';
  const q = document.getElementById('busca-input')?.value?.trim() || '';
  realizarBusca(q);
});

document.getElementById('filtro-ano')?.addEventListener('change', () => {
  const q = document.getElementById('busca-input')?.value?.trim() || '';
  realizarBusca(q);
});

// ─── Cards de gênero da home ativam filtro na busca ─────────
document.querySelectorAll('[data-genre]').forEach(el => {
  el.addEventListener('click', () => {
    const genreName = el.dataset.genre;
    const genreMap = { 'Fantasia': 14, 'Ficção científica': 878, 'História': 36, 'Mistério': 9648, 'Drama': 18, 'Thriller': 53, 'Ação': 28, 'Terror': 27 };
    const gId = genreMap[genreName];
    document.querySelectorAll('.filtro-genre-btn').forEach(b => {
      b.setAttribute('aria-pressed', 'false');
      b.style.background = '#fff';
    });
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

// ─── Pesquisa (home e explorar) ──────────────────────────────
function executarBusca(origem) {
  const heroInput    = document.getElementById("hero-search");
  const explorarInput = document.getElementById("explorar-search");
  const query = (origem === "explorar" ? explorarInput?.value : heroInput?.value)?.trim();

  if (!query) return;

  // Leva o termo para a tela de busca e dispara a pesquisa
  const buscaInput = document.getElementById("busca-input");
  if (buscaInput) buscaInput.value = query;
  showScreen("busca");
  realizarBusca(query);
}

document.getElementById("hero-search")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") executarBusca("home");
});
document.querySelector(".btn-search")?.addEventListener("click", () => executarBusca("home"));

document.getElementById("explorar-search")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") executarBusca("explorar");
});
document.getElementById("explorar-buscar")?.addEventListener("click", () => executarBusca("explorar"));

// ─── Busca na tela de busca ──────────────────────────────────
document.getElementById("busca-btn")?.addEventListener("click", () => {
  const q = document.getElementById("busca-input")?.value?.trim();
  if (q) realizarBusca(q);
});
document.getElementById("busca-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = e.target.value?.trim();
    if (q) realizarBusca(q);
  }
});

async function realizarBusca(query) {
  const midiaEl = document.getElementById("busca-midia");
  if (midiaEl) midiaEl.innerHTML = '<p class="opacity-50 text-sm col-span-full">Buscando filmes e séries…</p>';

  const activeBtn = document.querySelector('.filtro-genre-btn[aria-pressed="true"]');
  const genreId = activeBtn?.dataset.genreId !== '' ? (Number(activeBtn?.dataset.genreId) || null) : null;
  const ano = document.getElementById('filtro-ano')?.value?.trim() || null;

  const resultado = await Promise.allSettled([
    searchMediaWithFilters({ query: query || '', genreId, year: ano, limit: 12 })
  ]);

  if (midiaEl) {
    if (resultado[0].status === 'rejected') {
      console.error('Erro mídia:', resultado[0].reason);
      midiaEl.innerHTML = '<p class="opacity-50 text-sm col-span-full">Erro ao buscar filmes/séries.</p>';
    } else {
      const { movies = [], series = [] } = resultado[0].value;
      const todos = [...movies, ...series];
      if (todos.length === 0) {
        midiaEl.innerHTML = '<p class="opacity-50 text-sm col-span-full">Nenhuma mídia encontrada.</p>';
      } else {
        midiaEl.innerHTML = todos.map(m => renderMidiaCard(m)).join('');
        midiaEl.querySelectorAll('[data-midia-id]').forEach(el => {
          el.addEventListener('click', () => abrirMidia(
            el.dataset.midiaId, el.dataset.midiaTipo,
            el.dataset.midiaTitulo, el.dataset.midiaPoster,
            el.dataset.midiaAno, el.dataset.midiaRating,
            el.dataset.midiaOverview
          ));
        });
      }
    }
  }
}

function renderLivroCard(book) {
  const imgHtml = book.cover
    ? `<img src="${book.cover}" alt="Capa de ${book.title}" loading="lazy" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-bottom:2px solid #000;">`
    : `<div style="aspect-ratio:2/3;background:#5065ff;display:flex;align-items:center;justify-content:center;border-bottom:2px solid #000;"><span class="material-symbols-outlined" style="font-size:3rem;color:#fff;font-variation-settings:'FILL' 1">menu_book</span></div>`;

  return `
    <article class="bg-white border-2 border-black cursor-pointer hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      data-livro-id="${book.id}"
      data-livro-titulo="${book.title.replace(/"/g,'&quot;')}"
      data-livro-autor="${(book.author||'').replace(/"/g,'&quot;')}"
      data-livro-cover="${book.cover || ''}"
      data-livro-ano="${book.year || ''}"
      tabindex="0" role="button" aria-label="Ver ${book.title}">
      ${imgHtml}
      <div style="padding:0.75rem;">
        <h3 style="font-weight:700;font-size:0.9rem;line-height:1.2;margin-bottom:0.25rem;">${book.title}</h3>
        <p style="font-size:0.75rem;opacity:0.6;">${book.author}</p>
        ${book.year ? `<span style="font-size:0.7rem;font-weight:900;opacity:0.4;">${book.year}</span>` : ''}
      </div>
    </article>`;
}

// ─── Abre página dinâmica do livro ───────────────────────────

function renderMidiaCard(media) {
  const tipo = media.type === 'movie' ? 'Filme' : 'Série';
  const bgChip = media.type === 'movie' ? '#5065ff' : '#fe4c00';
  const poster = media.poster
    ? `<img src="${media.poster}" alt="${media.title}" loading="lazy" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-bottom:2px solid #000;">`
    : `<div style="aspect-ratio:2/3;background:#fe4c00;display:flex;align-items:center;justify-content:center;border-bottom:2px solid #000;"><span class="material-symbols-outlined" style="font-size:3rem;color:#fff;font-variation-settings:'FILL' 1">movie</span></div>`;

  return `
    <article class="bg-white border-2 border-black cursor-pointer hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      data-midia-id="${media.id}"
      data-midia-tipo="${media.type}"
      data-midia-titulo="${(media.title||'').replace(/"/g,'&quot;')}"
      data-midia-poster="${media.poster || ''}"
      data-midia-ano="${media.year || ''}"
      data-midia-rating="${media.rating || ''}"
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

async function abrirMidia(id, tipo, titulo, poster, ano, rating, overview) {
  previousScreen = Object.entries(screens).find(([, el]) => el?.classList.contains('active'))?.[0] || 'busca';
  showScreen('midia');

  document.getElementById('midia-titulo').textContent   = titulo || '–';
  document.getElementById('midia-tipo-ano').textContent = `${tipo === 'movie' ? 'Filme' : 'Série'}${ano ? ' · ' + ano : ''}`;
  document.getElementById('midia-rating').textContent   = rating ? `★ ${rating} / 10` : '–';
  document.getElementById('midia-extra').textContent    = '–';
  document.getElementById('midia-descricao').textContent = overview || 'Carregando sinopse…';
  document.getElementById('midia-tags').innerHTML = '';
  document.getElementById('midia-livros').innerHTML = '<p class="opacity-50 col-span-full text-sm">Buscando livros relacionados…</p>';

  const posterWrap = document.getElementById('midia-poster-wrap');
  if (poster) {
    posterWrap.innerHTML = `<img src="${poster}" alt="${titulo}" style="width:100%;border:4px solid #000;box-shadow:12px 12px 0 0 #5065ff;" loading="lazy">`;
  } else {
    posterWrap.innerHTML = `<div class="book-icon-container bg-orange border-4 border-black shadow-[16px_16px_0px_0px_#5065ff]"><span class="material-symbols-outlined text-white text-8xl" style="font-variation-settings:'FILL' 1,'wght' 700">movie</span></div>`;
  }

  try {
    // Primeiro busca os detalhes para ter os gêneros
    const detalhes = await getMediaDetails(Number(id), tipo).catch(() => null);

    if (detalhes) {
      if (detalhes.overview) document.getElementById('midia-descricao').textContent = detalhes.overview;
      document.getElementById('midia-tmdb-link').href = detalhes.tmdbUrl || '#';
      if (detalhes.runtime) document.getElementById('midia-extra').textContent = detalhes.runtime;
      if (detalhes.seasons) document.getElementById('midia-extra').textContent = `${detalhes.seasons} temporada(s)`;

      const tagsEl = document.getElementById('midia-tags');
      const cores = ['bg-orange text-white', 'bg-blue text-white', 'bg-yellow text-black'];
      (detalhes.genres || []).slice(0, 4).forEach((g, i) => {
        const span = document.createElement('span');
        span.className = `${cores[i % cores.length]} px-3 py-1 font-black text-xs uppercase border-2 border-black`;
        span.textContent = g;
        tagsEl.appendChild(span);
      });

      // Busca livros pelos gêneros do TMDB via Google Books
      const livrosEl = document.getElementById('midia-livros');
      try {
        const livros = await searchBooksByGenres(detalhes.genres || [], 8);
        if (livros.length > 0) {
          livrosEl.innerHTML = livros.slice(0, 4).map(b => renderLivroCard(b)).join('');
          livrosEl.querySelectorAll('[data-livro-id]').forEach(el => {
            el.addEventListener('click', () => abrirLivro(
              el.dataset.livroId, el.dataset.livroTitulo,
              el.dataset.livroAutor, el.dataset.livroCover, el.dataset.livroAno
            ));
          });
        } else {
          livrosEl.innerHTML = '<p class="opacity-50 col-span-full text-sm">Nenhum livro relacionado encontrado para esses gêneros.</p>';
        }
      } catch(err) {
        console.error('Erro ao buscar livros por gênero:', err);
        document.getElementById('midia-livros').innerHTML = '<p class="opacity-50 col-span-full text-sm">Erro ao buscar livros relacionados.</p>';
      }
    }
  } catch (err) {
    console.error('Erro ao carregar mídia:', err);
  }
}

// ─── Botão Voltar da página de mídia ────────────────────────
document.getElementById('midia-back-btn')?.addEventListener('click', () => {
  showScreen(previousScreen || 'busca');
});

async function abrirLivro(workId, titulo, autor, cover, ano) {
  previousScreen = Object.entries(screens).find(([, el]) => el?.classList.contains('active'))?.[0] || 'home';
  showScreen('livro');

  // Preenche dados básicos imediatamente
  document.getElementById('livro-titulo').textContent   = titulo || '–';
  document.getElementById('livro-autor').textContent    = autor  || '–';
  document.getElementById('livro-ano').textContent      = ano    || '–';
  document.getElementById('livro-descricao').textContent = 'Carregando descrição…';
  document.getElementById('livro-tags').innerHTML = '';
  document.getElementById('livro-adaptacoes').innerHTML = '<p class="opacity-50 col-span-full text-sm">Buscando adaptações…</p>';

  // Capa
  const coverWrap = document.getElementById('livro-cover-wrap');
  if (cover) {
    coverWrap.innerHTML = `<img src="${cover}" alt="Capa de ${titulo}" style="width:100%;border:4px solid #000;box-shadow:12px 12px 0 0 #fe4c00;" loading="lazy">`;
  } else {
    coverWrap.innerHTML = `<div class="book-icon-container bg-blue border-4 border-black shadow-[16px_16px_0px_0px_#fe4c00]"><span class="material-symbols-outlined text-white text-8xl" style="font-variation-settings:'FILL' 1,'wght' 700">auto_stories</span></div>`;
  }

  // Busca detalhes e adaptações em paralelo
  try {
    const [detalhes, adaptacoes] = await Promise.all([
      workId ? getBookDetails(workId).catch(() => null) : Promise.resolve(null),
      findAdaptations(titulo, autor).catch(() => []),
    ]);

    if (detalhes) {
      document.getElementById('livro-descricao').textContent = detalhes.description || 'Sem descrição disponível.';
      document.getElementById('livro-ol-link').href = detalhes.olUrl || '#';

      // Tags de assuntos
      const tagsEl = document.getElementById('livro-tags');
      const cores = ['bg-yellow text-black', 'bg-blue text-white', 'bg-orange text-white'];
      (detalhes.subjects || []).slice(0, 4).forEach((s, i) => {
        const span = document.createElement('span');
        span.className = `${cores[i % cores.length]} px-3 py-1 font-black text-xs uppercase border-2 border-black`;
        span.textContent = s;
        tagsEl.appendChild(span);
      });
    } else {
      document.getElementById('livro-descricao').textContent = 'Descrição não disponível.';
    }

    // Adaptações
    const adaptEl = document.getElementById('livro-adaptacoes');
    if (adaptacoes.length === 0) {
      adaptEl.innerHTML = '<p class="opacity-50 col-span-full text-sm">Nenhuma adaptação encontrada no TMDB.</p>';
    } else {
      adaptEl.innerHTML = adaptacoes.map(m => {
        const tipo = m.type === 'movie' ? 'Filme' : 'Série';
        const poster = m.poster
          ? `<img src="${m.poster}" alt="${m.title}" loading="lazy" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-bottom:2px solid #000;">`
          : `<div style="aspect-ratio:2/3;background:#1d9e75;display:flex;align-items:center;justify-content:center;border-bottom:2px solid #000;"><span class="material-symbols-outlined" style="font-size:2.5rem;color:#fff;font-variation-settings:'FILL' 1">movie</span></div>`;
        return `
          <a href="${m.tmdbUrl}" target="_blank" rel="noopener"
             class="bg-white border-2 border-black hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] block">
            ${poster}
            <div style="padding:0.6rem;">
              <span style="font-size:0.65rem;font-weight:900;background:#fe4c00;color:#fff;padding:2px 6px;border:1px solid #000;">${tipo}</span>
              <h4 style="font-weight:700;font-size:0.85rem;margin-top:0.3rem;line-height:1.2;">${m.title}</h4>
              ${m.year ? `<p style="font-size:0.7rem;opacity:0.5;">${m.year}</p>` : ''}
            </div>
          </a>`;
      }).join('');
    }
  } catch (err) {
    console.error('Erro ao carregar livro:', err);
    document.getElementById('livro-descricao').textContent = 'Erro ao carregar detalhes.';
  }
}

// ─── Botão Voltar da página de livro ────────────────────────
document.getElementById('livro-back-btn')?.addEventListener('click', () => {
  showScreen(previousScreen || 'busca');
});

const navLinks = document.querySelectorAll("[data-nav]");

// ─── Mostrar tela ────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s && s.classList.remove("active"));
  navLinks.forEach(l => l.classList.remove("active"));

  const target = screens[name];
  if (target) target.classList.add("active");

  navLinks.forEach(l => {
    if (l.dataset.nav === name) l.classList.add("active");
  });

  if (name === "mapa") setTimeout(initMap, 100);
  if (name === "home") setTimeout(initMapHome, 200);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Delegação de cliques de navegação ──────────────────────
document.addEventListener("click", (e) => {
  const navEl = e.target.closest("[data-nav]");
  if (!navEl) return;
  e.preventDefault();

  const dest = navEl.dataset.nav;

  if (dest === "perfil" && !currentUser) {
    showScreen("login");
    return;
  }

  showScreen(dest);
});

// ─── Firebase Auth ───────────────────────────────────────────
let authResolved = false;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  atualizarHeaderAuth(user);
  atualizarPerfil(user);

  if (!authResolved) {
    authResolved = true;

    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.classList.add("hidden");

    showScreen("home");
  } else {
    if (!user) {
      const telaAtiva = Object.entries(screens).find(
        ([, el]) => el && el.classList.contains("active")
      )?.[0];
      if (telaAtiva === "perfil") showScreen("login");
    }
  }
});

// ─── Atualiza header: Cadastro ↔ Avatar ──────────────────────
function atualizarHeaderAuth(user) {
  const btnCadastro = document.getElementById("header-cadastro-btn");
  const btnAvatar   = document.getElementById("header-avatar");
  const btnLoginNav = document.getElementById("bottom-nav-login");

  if (user) {
    if (btnCadastro) btnCadastro.style.display = "none";
    if (btnAvatar)   btnAvatar.style.display   = "flex";

    const initial = document.getElementById("avatar-initial");
    if (initial) {
      const letra = (user.displayName || user.email || "U")[0].toUpperCase();
      initial.textContent = letra;
      initial.style.fontFamily = "Poppins, sans-serif";
      initial.style.fontSize   = "1rem";
      initial.style.fontWeight = "900";
    }

    if (btnLoginNav) {
      btnLoginNav.dataset.nav = "perfil";
      btnLoginNav.setAttribute("aria-label", "Perfil");
      btnLoginNav.querySelector(".material-symbols-outlined").textContent = "person";
      btnLoginNav.lastChild.textContent = "Perfil";
    }
  } else {
    if (btnCadastro) btnCadastro.style.display = "";
    if (btnAvatar)   btnAvatar.style.display   = "none";

    if (btnLoginNav) {
      btnLoginNav.dataset.nav = "login";
      btnLoginNav.setAttribute("aria-label", "Entrar");
      btnLoginNav.querySelector(".material-symbols-outlined").textContent = "login";
      const span = btnLoginNav.querySelector(".material-symbols-outlined");
      if (span && span.nextSibling) span.nextSibling.textContent = "Entrar";
    }
  }
}

// ─── Preenche dados do perfil ────────────────────────────────
function atualizarPerfil(user) {
  const elNome   = document.getElementById("perfil-nome");
  const elHandle = document.getElementById("perfil-handle");
  if (!elNome) return;

  if (user) {
    elNome.textContent   = user.displayName || user.email;
    elHandle.textContent = user.email;
  } else {
    elNome.textContent   = "–";
    elHandle.textContent = "";
  }
}

// ─── Validação ───────────────────────────────────────────────
function mostrarErroCampo(fieldId, errorId, msg) {
  const f = document.getElementById(fieldId);
  const e = document.getElementById(errorId);
  if (f) f.setAttribute("aria-invalid", "true");
  if (e) { e.textContent = msg; e.classList.add("visible"); }
}

function limparErroCampo(fieldId, errorId) {
  const f = document.getElementById(fieldId);
  const e = document.getElementById(errorId);
  if (f) f.removeAttribute("aria-invalid");
  if (e) e.classList.remove("visible");
}

function mostrarAlerta(alertId, tipo, msg) {
  const el = document.getElementById(alertId);
  if (!el) return;
  el.className = `alert-message visible ${tipo}`;
  el.textContent = msg;
}

function esconderAlerta(alertId) {
  const el = document.getElementById(alertId);
  if (el) el.classList.remove("visible");
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
  };
  return mapa[code] || "Erro inesperado. Tente novamente.";
}

// ─── Formulário de Cadastro ──────────────────────────────────
const formCadastro = document.getElementById("form-cadastro");
if (formCadastro) {
  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();
    esconderAlerta("cadastro-alert");

    const nome  = document.getElementById("cad-nome").value.trim();
    const email = document.getElementById("cad-email").value.trim();
    const senha = document.getElementById("cad-senha").value;
    const conf  = document.getElementById("cad-conf-senha").value;

    let valido = true;
    [["cad-nome","err-nome"],["cad-email","err-email"],["cad-senha","err-senha"],["cad-conf-senha","err-conf"]]
      .forEach(([f, e]) => limparErroCampo(f, e));

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
      atualizarHeaderAuth(cred.user);
      atualizarPerfil(cred.user);
      formCadastro.reset();
      showScreen("home");
    } catch (err) {
      mostrarAlerta("cadastro-alert", "error", traduzirErroFirebase(err.code));
    } finally {
      btn.disabled = false; btn.textContent = "Cadastrar";
    }
  });
}

// ─── Formulário de Login ─────────────────────────────────────
const formLogin = document.getElementById("form-login");
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    esconderAlerta("login-alert");

    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value;

    let valido = true;
    limparErroCampo("login-email", "err-login-email");
    limparErroCampo("login-senha", "err-login-senha");

    if (!emailValido(email)) { mostrarErroCampo("login-email", "err-login-email", "Informe um e-mail válido."); valido = false; }
    if (!senha)              { mostrarErroCampo("login-senha", "err-login-senha", "Informe sua senha."); valido = false; }
    if (!valido) return;

    const btn = formLogin.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Entrando…";

    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      currentUser = cred.user;
      atualizarHeaderAuth(cred.user);
      atualizarPerfil(cred.user);
      formLogin.reset();
      showScreen("home");
    } catch (err) {
      mostrarAlerta("login-alert", "error", traduzirErroFirebase(err.code));
    } finally {
      btn.disabled = false; btn.textContent = "Entrar";
    }
  });
}

// ─── Logout ──────────────────────────────────────────────────
document.addEventListener("click", async (e) => {
  if (e.target.closest("#btn-logout")) {
    await signOut(auth);
    currentUser = null;
    atualizarHeaderAuth(null);
    atualizarPerfil(null);
    showScreen("login");
  }
});

// ─── Tabs da estante ─────────────────────────────────────────
document.querySelectorAll(".tabs").forEach(grupo => {
  grupo.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      grupo.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
    });
  });
});

// ─── Formulário de Feedback ──────────────────────────────────
const formFeedback = document.getElementById("form-feedback");
if (formFeedback) {
  formFeedback.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome  = document.getElementById("fb-nome").value.trim();
    const email = document.getElementById("fb-email").value.trim();
    const msg   = document.getElementById("fb-msg").value.trim();

    if (!nome || !email || !msg) {
      alert("Preencha todos os campos antes de enviar.");
      return;
    }

    const btn = formFeedback.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Enviando…";

    try {
      await addDoc(collection(db, "sugestoes"), {
        nome,
        email,
        mensagem: msg,
        criadoEm: serverTimestamp(),
      });
      formFeedback.reset();
      alert("✅ Sugestão enviada! Obrigado pelo feedback.");
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar. Tente novamente.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar Feedback";
    }
  });
}
