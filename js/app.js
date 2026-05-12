// ============================================================
// LITTO – Aplicativo principal (navegação, auth, validação)
// ============================================================

import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initMap } from "./mapa.js";

// ===== ESTADO =====
let currentUser = null;

// ===== NAVEGAÇÃO =====
const screens = {
  home:     document.getElementById("screen-home"),
  mapa:     document.getElementById("screen-mapa"),
  perfil:   document.getElementById("screen-perfil"),
  login:    document.getElementById("screen-login"),
  cadastro: document.getElementById("screen-cadastro"),
};

const navLinks = document.querySelectorAll("[data-nav]");

function showScreen(name) {
  Object.values(screens).forEach(s => s && s.classList.remove("active"));
  navLinks.forEach(l => l.classList.remove("active"));

  const target = screens[name];
  if (target) target.classList.add("active");

  // Ativa link de nav correspondente
  navLinks.forEach(l => {
    if (l.dataset.nav === name) l.classList.add("active");
  });

  // Inicia mapa quando a tela de mapa for exibida
  if (name === "mapa") {
    setTimeout(initMap, 100);
  }

  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Delegar todos os cliques de navegação
document.addEventListener("click", (e) => {
  const navEl = e.target.closest("[data-nav]");
  if (!navEl) return;
  e.preventDefault();
  const dest = navEl.dataset.nav;

  // Telas protegidas (requerem login)
  if ((dest === "perfil") && !currentUser) {
    showScreen("login");
    return;
  }

  showScreen(dest);
});

// ===== FIREBASE AUTH =====
// Resolvido uma vez ao carregar: define a tela inicial correta
let authResolved = false;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateHeaderUser(user);

  if (!authResolved) {
    authResolved = true;

    // Remove o overlay de carregamento
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.classList.add("hidden");

    // Primeira resolução: decide qual tela mostrar
    if (user) {
      showScreen("home");
    } else {
      showScreen("login");
    }
  } else {
    // Mudanças subsequentes (ex: logout): redireciona se necessário
    if (!user) {
      // Se estava em tela protegida, volta para login
      const protegidas = ["perfil"];
      const telaAtiva = Object.entries(screens).find(
        ([, el]) => el && el.classList.contains("active")
      )?.[0];
      if (protegidas.includes(telaAtiva)) {
        showScreen("login");
      }
    }
  }
});

function updateHeaderUser(user) {
  const avatarBtn = document.getElementById("header-avatar");
  if (!avatarBtn) return;
  if (user) {
    avatarBtn.setAttribute("aria-label", `Perfil de ${user.displayName || user.email}`);
    avatarBtn.dataset.nav = "perfil";
    // Exibe inicial do nome no avatar
    const initial = document.getElementById("avatar-initial");
    if (initial) initial.textContent = (user.displayName || user.email || "U")[0].toUpperCase();
  } else {
    avatarBtn.dataset.nav = "login";
  }
}

// ===== VALIDAÇÃO =====
function showFieldError(fieldId, errorId, msg) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(errorId);
  if (field) field.setAttribute("aria-invalid", "true");
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.add("visible");
  }
}

function clearFieldError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(errorId);
  if (field) field.removeAttribute("aria-invalid");
  if (errEl) errEl.classList.remove("visible");
}

function showAlert(alertId, type, msg) {
  const el = document.getElementById(alertId);
  if (!el) return;
  el.className = `alert-message visible ${type}`;
  el.textContent = msg;
}

function hideAlert(alertId) {
  const el = document.getElementById(alertId);
  if (el) el.classList.remove("visible");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mapFirebaseError(code) {
  const erros = {
    "auth/email-already-in-use":    "Este e-mail já está cadastrado.",
    "auth/invalid-email":           "E-mail inválido.",
    "auth/weak-password":           "Senha muito fraca. Use ao menos 6 caracteres.",
    "auth/user-not-found":          "E-mail não encontrado.",
    "auth/wrong-password":          "Senha incorreta.",
    "auth/too-many-requests":       "Muitas tentativas. Aguarde alguns minutos.",
    "auth/network-request-failed":  "Erro de conexão. Verifique sua internet.",
    "auth/invalid-credential":      "E-mail ou senha incorretos.",
  };
  return erros[code] || "Erro inesperado. Tente novamente.";
}

// ===== CADASTRO =====
const formCadastro = document.getElementById("form-cadastro");
if (formCadastro) {
  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("cadastro-alert");

    const nome    = document.getElementById("cad-nome").value.trim();
    const email   = document.getElementById("cad-email").value.trim();
    const senha   = document.getElementById("cad-senha").value;
    const conf    = document.getElementById("cad-conf-senha").value;

    let valid = true;

    // Limpa erros
    ["cad-nome","cad-email","cad-senha","cad-conf-senha"].forEach((id, i) =>
      clearFieldError(id, ["err-nome","err-email","err-senha","err-conf"][i])
    );

    if (!nome) {
      showFieldError("cad-nome", "err-nome", "Informe seu nome completo.");
      valid = false;
    }
    if (!isValidEmail(email)) {
      showFieldError("cad-email", "err-email", "Informe um e-mail válido.");
      valid = false;
    }
    if (senha.length < 6) {
      showFieldError("cad-senha", "err-senha", "A senha deve ter ao menos 6 caracteres.");
      valid = false;
    }
    if (senha !== conf) {
      showFieldError("cad-conf-senha", "err-conf", "As senhas não coincidem.");
      valid = false;
    }

    if (!valid) return;

    const btn = formCadastro.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Criando conta...";

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(cred.user, { displayName: nome });
      currentUser = cred.user;
      updateHeaderUser(cred.user);
      formCadastro.reset();
      showScreen("home");
    } catch (err) {
      showAlert("cadastro-alert", "error", mapFirebaseError(err.code));
    } finally {
      btn.disabled = false;
      btn.textContent = "Cadastrar";
    }
  });
}

// ===== LOGIN =====
const formLogin = document.getElementById("form-login");
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("login-alert");

    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value;

    let valid = true;

    clearFieldError("login-email", "err-login-email");
    clearFieldError("login-senha", "err-login-senha");

    if (!isValidEmail(email)) {
      showFieldError("login-email", "err-login-email", "Informe um e-mail válido.");
      valid = false;
    }
    if (!senha) {
      showFieldError("login-senha", "err-login-senha", "Informe sua senha.");
      valid = false;
    }

    if (!valid) return;

    const btn = formLogin.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      currentUser = cred.user;
      updateHeaderUser(cred.user);
      formLogin.reset();
      showScreen("home");
    } catch (err) {
      showAlert("login-alert", "error", mapFirebaseError(err.code));
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
}

// ===== LOGOUT =====
document.addEventListener("click", async (e) => {
  if (e.target.closest("#btn-logout")) {
    await signOut(auth);
    currentUser = null;
    updateHeaderUser(null);
    showScreen("login");
  }
});

// ===== TABS DA ESTANTE =====
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const group = btn.closest(".tabs");
    group.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    // Aqui poderia filtrar a estante – lógica extensível
  });
});

// ===== TELA INICIAL =====
// A tela inicial é definida pelo onAuthStateChanged acima.
// Enquanto o Firebase resolve, nenhuma tela fica visível (sem .active no HTML).
