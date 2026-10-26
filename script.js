'use strict';

const MOODS = {
  happy: 'شاد',
  sad: 'غمگین',
  angry: 'عصبانی',
  surprise: 'متعجب',
  neutral: 'خنثی'
};

const GENRES = {
  animation: 'انیمیشن', comedy: 'کمدی', drama: 'درام', adventure: 'ماجراجویی',
  'sci-fi': 'علمی‌تخیلی', action: 'اکشن', music: 'موسیقی', family: 'خانوادگی',
  fantasy: 'فانتزی', romance: 'عاشقانه', mystery: 'معمایی', thriller: 'دلهره‌آور'
};

const POSTER_PALETTES = [
  ['#e7a58c','#f2d6a0'], ['#a8c6c0','#e7cf91'], ['#e6b95f','#c65e45'],
  ['#b7c5e1','#e2a3a0'], ['#d5e77a','#d67c54'], ['#a4b9a8','#e7d8bd'],
  ['#e2a49a','#f1c46f'], ['#c0b3d9','#d7e77b']
];

const state = {
  movies: [],
  mood: 'all',
  genre: 'all',
  search: '',
  sort: 'recommended',
  favoritesOnly: false,
  favorites: readFavorites(),
  activeMovieId: null
};

const elements = {
  grid: document.querySelector('#movie-grid'),
  moodList: document.querySelector('#mood-list'),
  search: document.querySelector('#search-input'),
  genre: document.querySelector('#genre-filter'),
  sort: document.querySelector('#sort-select'),
  empty: document.querySelector('#empty-state'),
  summary: document.querySelector('#results-summary'),
  footerCount: document.querySelector('#footer-count'),
  favoritesToggle: document.querySelector('#favorites-toggle'),
  favoriteCount: document.querySelector('#favorite-count'),
  activeFilters: document.querySelector('#active-filters'),
  dialog: document.querySelector('#movie-dialog'),
  dialogArt: document.querySelector('#dialog-art'),
  dialogTitle: document.querySelector('#dialog-title'),
  dialogOriginal: document.querySelector('#dialog-original'),
  dialogMeta: document.querySelector('#dialog-meta'),
  dialogDescription: document.querySelector('#dialog-description'),
  dialogTags: document.querySelector('#dialog-tags'),
  dialogFavorite: document.querySelector('#dialog-favorite'),
  toast: document.querySelector('#toast')
};

function readFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem('cinemood-favorites') || '[]');
    return Array.isArray(stored) ? stored.filter(Number.isFinite) : [];
  } catch (error) {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem('cinemood-favorites', JSON.stringify(state.favorites));
  } catch (error) {
    showToast('مرورگر اجازه‌ی ذخیره‌سازی نداد؛ بعداً دوباره امتحان کن.');
  }
  updateFavoriteCounter();
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function toPersianDigits(value) {
  return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function getPalette(movie) {
  return POSTER_PALETTES[(movie.id - 1) % POSTER_PALETTES.length];
}

function getGenreLabel(genre) {
  return GENRES[genre] || genre;
}

function getMovieMoodLabels(movie) {
  return (movie.moods || []).map(mood => MOODS[mood] || mood);
}

function makePoster(movie, large = false) {
  const [background, accent] = getPalette(movie);
  const title = movie.title_fa || movie.title;
  const genre = (movie.genres || [])[0] || 'film';
  return `
    <div class="poster-graphic" style="--poster-bg:${background};--poster-accent:${accent}">
      <span class="poster-number">${String(movie.id).padStart(2, '0')}</span>
      <span class="poster-genre">${escapeHTML(genre.toUpperCase())}</span>
      <span class="poster-orb"></span><span class="poster-stripe"></span>
      <span class="poster-title"><small>CINEMOOD / SELECTED</small>${escapeHTML(title)}</span>
      <span class="poster-stamp">${toPersianDigits(movie.year)}</span>
    </div>`;
}

function makeCard(movie, index) {
  const isFavorite = state.favorites.includes(movie.id);
  const genres = (movie.genres || []).slice(0, 3).map(genre =>
    `<span class="genre-pill">${escapeHTML(getGenreLabel(genre))}</span>`
  ).join('');
  const card = document.createElement('article');
  card.className = 'movie-card';
  card.style.animationDelay = `${Math.min(index * 35, 280)}ms`;
  card.innerHTML = `
    <div class="poster-button" role="button" tabindex="0" data-open-movie="${movie.id}" aria-label="دیدن جزئیات ${escapeHTML(movie.title_fa || movie.title)}">
      ${makePoster(movie)}
    </div>
    <button class="favorite-button ${isFavorite ? 'is-favorite' : ''}" type="button" data-favorite="${movie.id}" aria-label="${isFavorite ? 'حذف از' : 'افزودن به'} نشان‌شده‌ها" aria-pressed="${isFavorite}">${isFavorite ? '♥' : '♡'}</button>
    <div class="card-info">
      <div class="card-meta"><span>${toPersianDigits(movie.year)}</span><span class="rating"><span class="rating-star">★</span>${Number(movie.rating).toFixed(1)}</span></div>
      <div class="card-title-row"><div><h3 class="card-title">${escapeHTML(movie.title_fa || movie.title)}</h3><div class="card-title-en">${escapeHTML(movie.title)}</div></div></div>
      <div class="card-genres">${genres}</div>
      <div class="card-open"><span>یادداشت فیلم</span><span aria-hidden="true">↙</span></div>
    </div>`;
  return card;
}

function getFilteredMovies() {
  let result = [...state.movies];
  const query = state.search.trim().toLocaleLowerCase('fa');

  if (query) {
    result = result.filter(movie =>
      (movie.title || '').toLocaleLowerCase().includes(query) ||
      (movie.title_fa || '').toLocaleLowerCase('fa').includes(query)
    );
  }
  if (state.genre !== 'all') {
    result = result.filter(movie => (movie.genres || []).includes(state.genre));
  }
  if (state.mood !== 'all') {
    result = result.filter(movie => (movie.moods || []).includes(state.mood));
  }
  if (state.favoritesOnly) {
    result = result.filter(movie => state.favorites.includes(movie.id));
  }

  if (state.sort === 'rating-desc') result.sort((a, b) => b.rating - a.rating);
  if (state.sort === 'year-desc') result.sort((a, b) => b.year - a.year);
  if (state.sort === 'year-asc') result.sort((a, b) => a.year - b.year);
  return result;
}

function renderMovies() {
  const movies = getFilteredMovies();
  elements.grid.replaceChildren();
  elements.grid.setAttribute('aria-busy', 'false');

  if (!movies.length) {
    elements.grid.hidden = true;
    elements.empty.hidden = false;
  } else {
    elements.grid.hidden = false;
    elements.empty.hidden = true;
    const fragment = document.createDocumentFragment();
    movies.forEach((movie, index) => fragment.appendChild(makeCard(movie, index)));
    elements.grid.appendChild(fragment);
  }

  const total = movies.length;
  const prefix = state.favoritesOnly ? 'فیلم‌های نشان‌شده‌ی تو' : state.mood === 'all' ? 'چند انتخاب برای تماشای بعدی تو' : `فیلم‌هایی برای حالِ ${MOODS[state.mood]}`;
  elements.summary.textContent = `${prefix} · ${toPersianDigits(total)} عنوان`;
  elements.footerCount.textContent = `${toPersianDigits(total)} عنوان / یک شبِ سینمایی`;
  renderActiveFilters();
  updateFavoriteCounter();
}

function renderActiveFilters() {
  const tags = [];
  if (state.search.trim()) tags.push(['search', `جستجو: ${state.search.trim()}`]);
  if (state.genre !== 'all') tags.push(['genre', getGenreLabel(state.genre)]);
  if (state.mood !== 'all') tags.push(['mood', MOODS[state.mood]]);
  if (state.favoritesOnly) tags.push(['favorites', 'فقط نشان‌شده‌ها']);
  elements.activeFilters.innerHTML = tags.map(([key, label]) =>
    `<span class="filter-tag">${escapeHTML(label)}<button type="button" data-clear-filter="${key}" aria-label="حذف فیلتر ${escapeHTML(label)}">×</button></span>`
  ).join('');
  elements.activeFilters.hidden = tags.length === 0;
}

function updateFavoriteCounter() {
  elements.favoriteCount.textContent = toPersianDigits(state.favorites.length);
  elements.favoritesToggle.setAttribute('aria-pressed', String(state.favoritesOnly));
  elements.favoritesToggle.classList.toggle('is-active', state.favoritesOnly);
}

function populateGenres() {
  const genres = [...new Set(state.movies.flatMap(movie => movie.genres || []))].sort((a, b) => getGenreLabel(a).localeCompare(getGenreLabel(b), 'fa'));
  elements.genre.innerHTML = '<option value="all">همه‌ی ژانرها</option>' + genres.map(genre =>
    `<option value="${escapeHTML(genre)}">${escapeHTML(getGenreLabel(genre))}</option>`
  ).join('');
}

function toggleFavorite(movieId) {
  if (state.favorites.includes(movieId)) {
    state.favorites = state.favorites.filter(id => id !== movieId);
    showToast('از نشان‌شده‌ها حذف شد.');
  } else {
    state.favorites.push(movieId);
    showToast('برای شب بعد نگهش داشتیم ♥');
  }
  saveFavorites();
  renderMovies();
  if (state.activeMovieId === movieId && elements.dialog.open) updateDialogFavorite(movieId);
}

function openMovie(movieId) {
  const movie = state.movies.find(item => item.id === movieId);
  if (!movie) return;
  state.activeMovieId = movieId;
  const [background, accent] = getPalette(movie);
  elements.dialogArt.style.setProperty('--poster-bg', background);
  elements.dialogArt.style.setProperty('--poster-accent', accent);
  elements.dialogArt.innerHTML = makePoster(movie, true);
  elements.dialogTitle.textContent = movie.title_fa || movie.title;
  elements.dialogOriginal.textContent = movie.title;
  elements.dialogMeta.innerHTML = `<span>${toPersianDigits(movie.year)}</span><span>★ ${Number(movie.rating).toFixed(1)}</span><span>شناسه ${toPersianDigits(movie.id)}</span>`;
  elements.dialogDescription.textContent = `این فیلم در قفسه‌ی سینمود با حال‌های ${getMovieMoodLabels(movie).join('، ')} قرار گرفته. امتیاز ثبت‌شده در داده‌ی نمونه ${Number(movie.rating).toFixed(1)} از ۱۰ است؛ توضیح حال، بخشی از دسته‌بندی پروژه است و تضمین‌کننده‌ی تجربه‌ی شخصی تو نیست.`;
  elements.dialogTags.innerHTML = [
    ...(movie.genres || []).map(genre => `<span class="genre-pill">${escapeHTML(getGenreLabel(genre))}</span>`),
    ...getMovieMoodLabels(movie).map(mood => `<span class="genre-pill">حال: ${escapeHTML(mood)}</span>`)
  ].join('');
  updateDialogFavorite(movieId);
  elements.dialog.showModal();
}

function updateDialogFavorite(movieId) {
  const isFavorite = state.favorites.includes(movieId);
  elements.dialogFavorite.classList.toggle('is-favorite', isFavorite);
  elements.dialogFavorite.textContent = isFavorite ? '♥ حذف از نشان‌شده‌ها' : '♡ افزودن به نشان‌شده‌ها';
  elements.dialogFavorite.setAttribute('aria-pressed', String(isFavorite));
}

let toastTimeout;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => elements.toast.classList.remove('show'), 2200);
}

function resetFilters() {
  state.mood = 'all';
  state.genre = 'all';
  state.search = '';
  state.sort = 'recommended';
  state.favoritesOnly = false;
  elements.search.value = '';
  elements.genre.value = 'all';
  elements.sort.value = 'recommended';
  elements.moodList.querySelectorAll('[data-mood]').forEach(button => {
    const active = button.dataset.mood === 'all';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderMovies();
}

async function loadMovies() {
  try {
    const response = await fetch('./movies_sample.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const movies = await response.json();
    if (!Array.isArray(movies)) throw new Error('ساختار فایل JSON آرایه نیست.');
    state.movies = movies.filter(movie => movie && Number.isFinite(movie.id));
    populateGenres();
    renderMovies();
  } catch (error) {
    elements.grid.setAttribute('aria-busy', 'false');
    elements.grid.innerHTML = '<div class="loading-card"><div><strong>فایل فیلم‌ها بارگذاری نشد.</strong><p>مطمئن شو پروژه را با Live Server اجرا کرده‌ای و movies_sample.json کنار index.html قرار دارد.</p></div></div>';
    console.error('خطا در خواندن movies_sample.json:', error);
  }
}

elements.moodList.addEventListener('click', event => {
  const button = event.target.closest('[data-mood]');
  if (!button) return;
  state.mood = button.dataset.mood;
  elements.moodList.querySelectorAll('[data-mood]').forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  renderMovies();
});

elements.search.addEventListener('input', event => {
  state.search = event.target.value;
  renderMovies();
});
elements.genre.addEventListener('change', event => {
  state.genre = event.target.value;
  renderMovies();
});
elements.sort.addEventListener('change', event => {
  state.sort = event.target.value;
  renderMovies();
});
elements.favoritesToggle.addEventListener('click', () => {
  state.favoritesOnly = !state.favoritesOnly;
  renderMovies();
  document.querySelector('#collection').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
elements.grid.addEventListener('click', event => {
  const favoriteButton = event.target.closest('[data-favorite]');
  if (favoriteButton) {
    event.stopPropagation();
    toggleFavorite(Number(favoriteButton.dataset.favorite));
    return;
  }
  const movieButton = event.target.closest('[data-open-movie]');
  if (movieButton) openMovie(Number(movieButton.dataset.openMovie));
});
elements.grid.addEventListener('keydown', event => {
  const target = event.target.closest('[data-open-movie]');
  if (target && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    openMovie(Number(target.dataset.openMovie));
  }
});
elements.activeFilters.addEventListener('click', event => {
  const button = event.target.closest('[data-clear-filter]');
  if (!button) return;
  const key = button.dataset.clearFilter;
  if (key === 'search') { state.search = ''; elements.search.value = ''; }
  if (key === 'genre') { state.genre = 'all'; elements.genre.value = 'all'; }
  if (key === 'mood') {
    state.mood = 'all';
    elements.moodList.querySelectorAll('[data-mood]').forEach(item => {
      const active = item.dataset.mood === 'all';
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
  }
  if (key === 'favorites') state.favoritesOnly = false;
  renderMovies();
});
document.querySelector('#reset-filters').addEventListener('click', resetFilters);
document.querySelector('#dialog-close').addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', event => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.dialogFavorite.addEventListener('click', () => {
  if (state.activeMovieId !== null) toggleFavorite(state.activeMovieId);
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    elements.search.focus();
  }
});

loadMovies();
