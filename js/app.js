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
  findAdaptations,
  getBookDetails,
  renderBookCard,
  renderMediaCard,
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
  fundacao:               document.getElementById("screen-fundacao"),
  busca:                  document.getElementById("screen-busca"),
  livro:                  document.getElementById("screen-livro"),
};

// ─── Histórico de navegação (para o botão Voltar do livro) ───
let previousScreen = "home";

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
  const livrosEl = document.getElementById("busca-livros");
  const midiaEl  = document.getElementById("busca-midia");

  if (livrosEl) livrosEl.innerHTML = '<p class="opacity-50 text-sm col-span-full">Buscando livros…</p>';
  if (midiaEl)  midiaEl.innerHTML  = '<p class="opacity-50 text-sm col-span-full">Buscando filmes e séries…</p>';

  try {
    const [livros, midia] = await Promise.all([
      searchBooks(query, 12),
      searchMedia(query, 6).catch(() => ({ movies: [], series: [] })),
    ]);

    // Livros
    if (livrosEl) {
      if (livros.length === 0) {
        livrosEl.innerHTML = '<p class="opacity-50 text-sm col-span-full">Nenhum livro encontrado.</p>';
      } else {
        livrosEl.innerHTML = livros.map(b => renderLivroCard(b)).join('');
        livrosEl.querySelectorAll('[data-livro-id]').forEach(el => {
          el.addEventListener('click', () => abrirLivro(el.dataset.livroId, el.dataset.livroTitulo, el.dataset.livroAutor, el.dataset.livroCover, el.dataset.livroAno));
        });
      }
    }

    // Mídia
    if (midiaEl) {
      const todos = [...(midia.movies || []), ...(midia.series || [])];
      if (todos.length === 0) {
        midiaEl.innerHTML = '<p class="opacity-50 text-sm col-span-full">Nenhuma mídia encontrada.</p>';
      } else {
        midiaEl.innerHTML = todos.map(m => renderMediaCard(m)).join('');
      }
    }
  } catch (err) {
    console.error("Erro na busca:", err);
    if (livrosEl) livrosEl.innerHTML = '<p class="text-red-500 text-sm col-span-full">Erro ao buscar. Tente novamente.</p>';
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
