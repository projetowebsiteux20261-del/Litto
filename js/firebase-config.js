import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBcogSgcMtQXaj0uCZSwIuPogyyWzehdQQ",
  authDomain:        "litto-stitch.firebaseapp.com",
  projectId:         "litto-stitch",
  storageBucket:     "litto-stitch.firebasestorage.app",
  messagingSenderId: "420322820288",
  appId:             "1:420322820288:web:a25fb17b7e6a9223126d25"
};

const app         = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
