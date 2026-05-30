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
};

// ─── Pesquisa (home e explorar) ──────────────────────────────
function executarBusca() {
  showScreen("fundacao");
}

document.getElementById("hero-search")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") executarBusca();
});
document.querySelector(".btn-search")?.addEventListener("click", executarBusca);

document.getElementById("explorar-search")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") executarBusca();
});
document.getElementById("explorar-buscar")?.addEventListener("click", executarBusca);

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
