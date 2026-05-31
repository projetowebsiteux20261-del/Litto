#!/bin/bash
cat > js/js/firebase-config-values.js << CONF
export const firebaseConfig = {
  apiKey:            "${FIREBASE_API_KEY}",
  authDomain:        "${FIREBASE_AUTH_DOMAIN}",
  projectId:         "${FIREBASE_PROJECT_ID}",
  storageBucket:     "${FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${FIREBASE_MESSAGING_ID}",
  appId:             "${FIREBASE_APP_ID}"
};
CONF

cat > js/config.js << CONF
export const GOOGLE_BOOKS_KEY = '${GOOGLE_BOOKS_KEY}';
export const TMDB_API_KEY     = '${TMDB_API_KEY}';
CONF
