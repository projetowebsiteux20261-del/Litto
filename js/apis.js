// ============================================================
//  Litto – APIs de Livros e Mídia Audiovisual
//  • Livros   → Open Library  (gratuita, sem chave)
//  • Filmes   → TMDB          (gratuita, requer chave)
//
//  SETUP TMDB:
//  1. Crie conta em https://www.themoviedb.org/signup
//  2. Vá em Configurações → API → Solicitar chave (tipo: Developer)
//  3. Substitua o valor de TMDB_API_KEY abaixo
// ============================================================

const TMDB_API_KEY = '7dbf7128baf22521877136df552400b5'; // ← troque isso
const TMDB_BASE    = 'https://api.themoviedb.org/3';
const TMDB_IMG     = 'https://image.tmdb.org/t/p/w300';
const OL_BASE      = 'https://openlibrary.org';

// ──────────────────────────────────────────
//  LIVROS – Open Library
// ──────────────────────────────────────────

/**
 * Pesquisa livros por título, autor ou ISBN.
 * @param {string} query  Termo de busca
 * @param {number} limit  Máx de resultados (padrão 10)
 * @returns {Promise<Array>} Lista de livros formatados
 */
export async function searchBooks(query, limit = 10) {
  const url = `${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i,subject`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('Erro ao buscar livros');
  const data = await res.json();

  return (data.docs || []).map(doc => ({
    id:        doc.key,                        // ex: "/works/OL45804W"
    title:     doc.title,
    author:    doc.author_name?.[0] ?? 'Autor desconhecido',
    year:      doc.first_publish_year ?? null,
    cover:     doc.cover_i
                 ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                 : null,
    subjects:  doc.subject?.slice(0, 5) ?? [],
    olUrl:     `https://openlibrary.org${doc.key}`,
  }));
}

/**
 * Retorna detalhes de uma obra pelo ID Open Library.
 * @param {string} workId  ex: "/works/OL45804W"
 */
export async function getBookDetails(workId) {
  const res  = await fetch(`${OL_BASE}${workId}.json`);
  if (!res.ok) throw new Error('Livro não encontrado');
  const data = await res.json();

  const description =
    typeof data.description === 'string'
      ? data.description
      : data.description?.value ?? 'Sem descrição disponível.';

  return {
    id:          data.key,
    title:       data.title,
    description,
    subjects:    data.subjects?.slice(0, 8) ?? [],
    cover:       data.covers?.[0]
                   ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
                   : null,
    olUrl:       `https://openlibrary.org${data.key}`,
  };
}

// ──────────────────────────────────────────
//  FILMES & SÉRIES – TMDB
// ──────────────────────────────────────────

/**
 * Pesquisa filmes E séries simultaneamente.
 * @param {string} query  Termo de busca
 * @param {number} limit  Máx por categoria (padrão 5)
 * @returns {Promise<{movies: Array, series: Array}>}
 */
export async function searchMedia(query, limit = 5) {
  const [movRes, tvRes] = await Promise.all([
    fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`),
    fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`),
  ]);

  if (!movRes.ok || !tvRes.ok) throw new Error('Erro ao buscar mídia');

  const [movData, tvData] = await Promise.all([movRes.json(), tvRes.json()]);

  const formatMovie = m => ({
    id:       m.id,
    type:     'movie',
    title:    m.title,
    overview: m.overview,
    year:     m.release_date?.slice(0, 4) ?? null,
    poster:   m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
    rating:   m.vote_average?.toFixed(1) ?? null,
    genres:   m.genre_ids ?? [],
    tmdbUrl:  `https://www.themoviedb.org/movie/${m.id}`,
  });

  const formatSeries = s => ({
    id:       s.id,
    type:     'series',
    title:    s.name,
    overview: s.overview,
    year:     s.first_air_date?.slice(0, 4) ?? null,
    poster:   s.poster_path ? `${TMDB_IMG}${s.poster_path}` : null,
    rating:   s.vote_average?.toFixed(1) ?? null,
    genres:   s.genre_ids ?? [],
    tmdbUrl:  `https://www.themoviedb.org/tv/${s.id}`,
  });

  return {
    movies: (movData.results || []).slice(0, limit).map(formatMovie),
    series: (tvData.results  || []).slice(0, limit).map(formatSeries),
  };
}

/**
 * Retorna detalhes completos de um filme ou série.
 * @param {number} id    ID TMDB
 * @param {'movie'|'tv'} type
 */
export async function getMediaDetails(id, type) {
  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const res = await fetch(
    `${TMDB_BASE}/${endpoint}/${id}?api_key=${TMDB_API_KEY}&language=pt-BR`
  );
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

// ──────────────────────────────────────────
//  RECOMENDAÇÕES CRUZADAS (livro ↔ mídia)
// ──────────────────────────────────────────

/**
 * Dado um livro, busca adaptações ou obras relacionadas no TMDB.
 * Estratégia: pesquisa pelo título do livro nas duas mídias.
 * @param {string} bookTitle
 * @param {string} [authorName]
 */
export async function findAdaptations(bookTitle, authorName = '') {
  // Tenta primeiro só o título, depois título + autor
  const results = await searchMedia(bookTitle, 3);

  // Filtra por relevância simples (título com palavra em comum)
  const words = bookTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const score = item =>
    words.filter(w => item.title.toLowerCase().includes(w)).length;

  const ranked = [...results.movies, ...results.series]
    .map(item => ({ ...item, _score: score(item) }))
    .filter(item => item._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 6);

  return ranked;
}

// ──────────────────────────────────────────
//  HELPERS DE UI  (prontos para usar no app)
// ──────────────────────────────────────────

/**
 * Renderiza card de livro no estilo neo-brutalista do Litto.
 * @param {Object} book  Objeto retornado por searchBooks / getBookDetails
 * @returns {string} HTML string
 */
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
           class="btn btn--sm" aria-label="Ver ${book.title} na Open Library">
          Ver na Open Library
        </a>
      </div>
    </article>`;
}

/**
 * Renderiza card de mídia (filme ou série).
 * @param {Object} media  Objeto retornado por searchMedia / findAdaptations
 * @returns {string} HTML string
 */
export function renderMediaCard(media) {
  const poster = media.poster
    ? `<img src="${media.poster}" alt="Poster de ${media.title}" loading="lazy">`
    : `<div class="card__no-cover"><span class="material-symbols-outlined">movie</span></div>`;

  const typeLabel = media.type === 'movie' ? 'Filme' : 'Série';
  const extra     = media.type === 'series' && media.seasons
    ? `<span class="media-card__seasons">${media.seasons} temporada(s)</span>`
    : (media.runtime ? `<span class="media-card__runtime">${media.runtime}</span>` : '');

  return `
    <article class="media-card" data-id="${media.id}" data-type="${media.type}" tabindex="0"
             aria-label="${media.title} – ${typeLabel}">
      <div class="media-card__poster">${poster}</div>
      <div class="media-card__info">
        <span class="chip chip--blue">${typeLabel}</span>
        <h3 class="media-card__title">${media.title}</h3>
        ${media.year ? `<span class="media-card__year">${media.year}</span>` : ''}
        ${media.rating ? `<span class="media-card__rating">★ ${media.rating}</span>` : ''}
        ${extra}
        <a href="${media.tmdbUrl}" target="_blank" rel="noopener"
           class="btn btn--sm" aria-label="Ver ${media.title} no TMDB">
          Ver no TMDB
        </a>
      </div>
    </article>`;
}
