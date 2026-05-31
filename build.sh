#!/bin/bash
cat > js/config.js << CONF
export const GOOGLE_BOOKS_KEY = '${GOOGLE_BOOKS_KEY}';
export const TMDB_API_KEY     = '${TMDB_API_KEY}';
CONF
