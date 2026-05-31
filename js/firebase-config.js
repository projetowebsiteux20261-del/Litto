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

import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./js/firebase-config-values.js";

const app         = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
