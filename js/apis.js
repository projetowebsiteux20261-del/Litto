// ============================================================
//  Litto – APIs de Livros e Mídia Audiovisual
//  • Livros   → Google Books API (requer chave)
//  • Filmes   → TMDB             (requer chave)
// ============================================================

const GOOGLE_BOOKS_KEY  = 'AIzaSyCqKuIQBlRptnWRtQYOuwVCX7JbQSoPL6M';
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';

const TMDB_API_KEY = '7dbf7128baf22521877136df552400b5';
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
//  HELPERS DE UI
// ──────────────────────────────────────────

export function renderBookCard(book) {
  const cover = book.cover
    ? `<img src="${book.cover}" alt="Capa de ${book.title}" loading="lazy">`
    : `<div class="card__no-cover"><span class="material-symbols-outlined">menu_book</span></div>`;

  return `
    <article class="book-card" data-id="${book.id}" tabindex="0"
             aria-label="${book.title} – ${book.author}">
      <div class="book-card__cover">${cover}</div>
      <div class="book-card__info">
        <h3 class="book-card__title">${book.title}</h3>
        <p class="book-card__author">${book.author}</p>
        ${book.year ? `<span class="book-card__year">${book.year}</span>` : ''}
        <a href="${book.olUrl}" target="_blank" rel="noopener"
           class="btn btn--sm">Ver no Google Books</a>
      </div>
    </article>`;
}

export function renderMediaCard(media) {
  const poster = media.poster
    ? `<img src="${media.poster}" alt="Poster de ${media.title}" loading="lazy">`
    : `<div class="card__no-cover"><span class="material-symbols-outlined">movie</span></div>`;

  const typeLabel = media.type === 'movie' ? 'Filme' : 'Série';
  const extra = media.type === 'series' && media.seasons
    ? `<span class="media-card__seasons">${media.seasons} temporada(s)</span>`
    : (media.runtime ? `<span class="media-card__runtime">${media.runtime}</span>` : '');

  return `
    <article class="media-card" data-id="${media.id}" data-type="${media.type}" tabindex="0"
             aria-label="${media.title} – ${typeLabel}">
      <div class="media-card__poster">${poster}</div>
      <div class="media-card__info">
        <span class="chip chip--blue">${typeLabel}</span>
        <h3 class="media-card__title">${media.title}</h3>
        ${media.year   ? `<span class="media-card__year">${media.year}</span>`       : ''}
        ${media.rating ? `<span class="media-card__rating">★ ${media.rating}</span>` : ''}
        ${extra}
        <a href="${media.tmdbUrl}" target="_blank" rel="noopener"
           class="btn btn--sm">Ver no TMDB</a>
      </div>
    </article>`;
}
