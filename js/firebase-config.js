// ============================================================
// LITTO – Configuração do Firebase
// ============================================================
// INSTRUÇÕES:
// 1. Acesse https://console.firebase.google.com
// 2. Crie um projeto ou use um existente
// 3. Em "Configurações do projeto" → "Seus aplicativos" → escolha Web (</>)
// 4. Copie o objeto firebaseConfig e substitua os valores abaixo
// 5. Em "Authentication" → "Método de login" → habilite "E-mail/senha"
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "SUA_API_KEY_AQUI",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId:             "SEU_APP_ID"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
