// ============================================================
//  Litto – APIs de Livros e Mídia Audiovisual
//  • Livros   → Google Books API (requer chave)
//  • Filmes   → TMDB             (requer chave)
// ============================================================

import { GOOGLE_BOOKS_KEY, TMDB_API_KEY } from './config.js';

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';

const TMDB_BASE    = 'https://api.themoviedb.org/3';
const TMDB_IMG     = 'https://image.tmdb.org/t/p/w300';

// ──────────────────────────────────────────
//  LIVROS – Google Books
// ──────────────────────────────────────────

export async function searchBooks(query, limit = 10) {
  const url = `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&langRestrict=pt&key=${GOOGLE_BOOKS_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('Erro ao buscar livros');
  const data = await res.json();

  return (data.items || []).map(item => {
    const info = item.volumeInfo;
    return {
      id:     item.id,
      title:  info.title,
      author: info.authors?.[0] ?? 'Autor desconhecido',
      year:   info.publishedDate?.slice(0, 4) ?? null,
      cover:  info.imageLinks?.thumbnail?.replace('http:', 'https:') ?? null,
      olUrl:  info.infoLink,
    };
  });
}

export async function getBookDetails(volumeId) {
  const res  = await fetch(`${GOOGLE_BOOKS_BASE}/volumes/${volumeId}?key=${GOOGLE_BOOKS_KEY}`);
  if (!res.ok) throw new Error('Livro não encontrado');
  const item = await res.json();
  const info = item.volumeInfo;

  return {
    id:          item.id,
    title:       info.title,
    description: info.description ?? 'Sem descrição disponível.',
    subjects:    info.categories ?? [],
    cover:       info.imageLinks?.large?.replace('http:', 'https:') ?? null,
    olUrl:       info.infoLink,
  };
}

// ──────────────────────────────────────────
//  FILMES & SÉRIES – TMDB
// ──────────────────────────────────────────

export async function searchMedia(query, limit = 5) {
  const [movRes, tvRes] = await Promise.all([
    fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`),
    fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`),
  ]);
  if (!movRes.ok || !tvRes.ok) throw new Error('Erro ao buscar mídia');
  const [movData, tvData] = await Promise.all([movRes.json(), tvRes.json()]);

  const formatMovie = m => ({
    id:      m.id, type: 'movie',
    title:   m.title,
    year:    m.release_date?.slice(0, 4) ?? null,
    poster:  m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
    rating:  m.vote_average?.toFixed(1) ?? null,
    tmdbUrl: `https://www.themoviedb.org/movie/${m.id}`,
  });

  const formatSeries = s => ({
    id:      s.id, type: 'series',
    title:   s.name,
    year:    s.first_air_date?.slice(0, 4) ?? null,
    poster:  s.poster_path ? `${TMDB_IMG}${s.poster_path}` : null,
    rating:  s.vote_average?.toFixed(1) ?? null,
    tmdbUrl: `https://www.themoviedb.org/tv/${s.id}`,
  });

  return {
    movies: (movData.results || []).slice(0, limit).map(formatMovie),
    series: (tvData.results  || []).slice(0, limit).map(formatSeries),
  };
}

export async function getMediaDetails(id, type) {
  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const res = await fetch(`${TMDB_BASE}/${endpoint}/${id}?api_key=${TMDB_API_KEY}&language=pt-BR`);
  if (!res.ok) throw new Error('Mídia não encontrada');
  const d = await res.json();

  return type === 'movie'
    ? {
        id: d.id, type: 'movie',
        title:    d.title,
        overview: d.overview,
        year:     d.release_date?.slice(0, 4),
        runtime:  d.runtime ? `${d.runtime} min` : null,
        poster:   d.poster_path ? `${TMDB_IMG}${d.poster_path}` : null,
        rating:   d.vote_average?.toFixed(1),
        genres:   d.genres?.map(g => g.name) ?? [],
        tmdbUrl:  `https://www.themoviedb.org/movie/${d.id}`,
      }
    : {
        id: d.id, type: 'series',
        title:    d.name,
        overview: d.overview,
        year:     d.first_air_date?.slice(0, 4),
        seasons:  d.number_of_seasons,
        poster:   d.poster_path ? `${TMDB_IMG}${d.poster_path}` : null,
        rating:   d.vote_average?.toFixed(1),
        genres:   d.genres?.map(g => g.name) ?? [],
        tmdbUrl:  `https://www.themoviedb.org/tv/${d.id}`,
      };
}

export async function findAdaptations(bookTitle) {
  const results = await searchMedia(bookTitle, 3);
  const words = bookTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  return [...results.movies, ...results.series]
    .map(item => ({ ...item, _score: words.filter(w => item.title.toLowerCase().includes(w)).length }))
    .filter(item => item._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 6);
}

// ──────────────────────────────────────────
//  IDs de gêneros TMDB
// ──────────────────────────────────────────
export const TMDB_GENRE_IDS = {
  'Ação': 28, 'Aventura': 12, 'Animação': 16, 'Comédia': 35,
  'Crime': 80, 'Documentário': 99, 'Drama': 18, 'Família': 10751,
  'Fantasia': 14, 'História': 36, 'Terror': 27, 'Música': 10402,
  'Mistério': 9648, 'Romance': 10749, 'Ficção científica': 878,
  'Thriller': 53, 'Guerra': 10752, 'Faroeste': 37,
};

// ──────────────────────────────────────────
//  Busca TMDB com filtros de gênero e ano
// ──────────────────────────────────────────
export async function searchMediaWithFilters({ query = '', genreId = null, year = null, limit = 12 } = {}) {
  const buildUrl = (type) => {
    if (query) {
      let url = `${TMDB_BASE}/search/${type}?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`;
      if (year) url += `&${type === 'movie' ? 'primary_release_year' : 'first_air_date_year'}=${year}`;
      return url;
    }
    let url = `${TMDB_BASE}/discover/${type}?api_key=${TMDB_API_KEY}&language=pt-BR&sort_by=popularity.desc`;
    if (genreId) url += `&with_genres=${genreId}`;
    if (year)    url += `&${type === 'movie' ? 'primary_release_year' : 'first_air_date_year'}=${year}`;
    return url;
  };

  const [movRes, tvRes] = await Promise.all([fetch(buildUrl('movie')), fetch(buildUrl('tv'))]);
  const [movData, tvData] = await Promise.all([
    movRes.ok ? movRes.json() : { results: [] },
    tvRes.ok  ? tvRes.json()  : { results: [] },
  ]);

  const movies = (movData.results || []).slice(0, limit).map(m => ({
    id: m.id, type: 'movie',
    title: m.title, overview: m.overview,
    year: m.release_date?.slice(0, 4),
    poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
    rating: m.vote_average?.toFixed(1),
    tmdbUrl: `https://www.themoviedb.org/movie/${m.id}`,
  }));

  const series = (tvData.results || []).slice(0, limit).map(s => ({
    id: s.id, type: 'series',
    title: s.name, overview: s.overview,
    year: s.first_air_date?.slice(0, 4),
    poster: s.poster_path ? `${TMDB_IMG}${s.poster_path}` : null,
    rating: s.vote_average?.toFixed(1),
    tmdbUrl: `https://www.themoviedb.org/tv/${s.id}`,
  }));

  return { movies, series };
}

// ──────────────────────────────────────────
//  Recomendações por gênero via Google Books
// ──────────────────────────────────────────
const GENRE_TO_SUBJECT = {
  'Ficção científica': 'science fiction',
  'Fantasia':          'fantasy fiction',
  'Terror':            'horror fiction',
  'Thriller':          'thriller',
  'Ação':              'action adventure',
  'Aventura':          'adventure fiction',
  'Drama':             'literary fiction',
  'Romance':           'romance fiction',
  'Crime':             'crime fiction',
  'Mistério':          'mystery fiction',
  'Animação':          'fantasy fiction',
  'Família':           'juvenile fiction',
  'História':          'historical fiction',
  'Guerra':            'war fiction',
  'Faroeste':          'western fiction',
  'Comédia':           'humorous fiction',
};

export async function searchBooksByGenres(genres = [], limit = 8) {
  const subjects = [...new Set(genres.map(g => GENRE_TO_SUBJECT[g]).filter(Boolean))];
  if (subjects.length === 0) return [];

  // Combina até 2 subjects para resultados mais precisos
  const subjectQuery = subjects.slice(0, 2).map(s => `subject:${s}`).join('+');
  const url = `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(subjectQuery)}&maxResults=${limit * 2}&orderBy=relevance&key=${GOOGLE_BOOKS_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro ao buscar livros por gênero');
  const data = await res.json();

  // Categorias a excluir
  const EXCLUIR = ['poetry', 'poems', 'comic', 'graphic novel', 'juvenile nonfiction',
    'nonfiction', 'biography', 'autobiography', 'self-help', 'essays', 'cooking',
    'religion', 'science', 'history', 'true crime'];

  const filtrados = (data.items || []).filter(item => {
    const cats = (item.volumeInfo.categories || []).join(' ').toLowerCase();
    const tipo = (item.volumeInfo.printType || '').toLowerCase();
    if (tipo === 'magazine') return false;
    return !EXCLUIR.some(exc => cats.includes(exc));
  });

  return filtrados.slice(0, limit).map(item => {
    const info = item.volumeInfo;
    return {
      id:     item.id,
      title:  info.title,
      author: info.authors?.[0] ?? 'Autor desconhecido',
      year:   info.publishedDate?.slice(0, 4) ?? null,
      cover:  info.imageLinks?.thumbnail?.replace('http:', 'https:') ?? null,
      olUrl:  info.infoLink,
    };
  });
}
