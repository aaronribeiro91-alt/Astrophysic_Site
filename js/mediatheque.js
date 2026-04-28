// ============================================
// MÉDIATHÈQUE COSMOS — Films/Séries & Manga/Anime Tracker
// ============================================

import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    orderBy
} from "firebase/firestore";

// ---------- Firebase Config ----------
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- API Config ----------
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const JIKAN_BASE = 'https://api.jikan.moe/v4';

// ---------- State ----------
let currentMainTab = 'movies'; // 'movies' | 'anime'
let currentSubTab = 'discover'; // 'discover' | 'mylist'
let currentFilter = 'all';
let currentProfile = 'Aaron'; // Active profile
let myList = []; // cached from Firebase
let searchTimeout = null;
let jikanLastRequest = 0; // Rate limit tracker for Jikan API
const PASSCODE = '121626';

// ---------- Status Config ----------
const STATUS_CONFIG = {
    to_watch: { label: 'À voir', emoji: '📋', color: 'status-to_watch' },
    watching: { label: 'En cours', emoji: '▶️', color: 'status-watching' },
    watched:  { label: 'Vu', emoji: '✅', color: 'status-watched' },
    liked:    { label: 'Aimé', emoji: '❤️', color: 'status-liked' },
    disliked: { label: 'Pas aimé', emoji: '👎', color: 'status-disliked' },
};

// Conflict groups: statuses within the same group are mutually exclusive
const STATUS_CONFLICTS = [
    ['to_watch', 'watching', 'watched'],  // view state — can only pick one
    ['liked', 'disliked'],                // opinion — can only pick one
];

function getConflicts(status) {
    for (const group of STATUS_CONFLICTS) {
        if (group.includes(status)) return group.filter(s => s !== status);
    }
    return [];
}

// Normalize: ensure statuses is always an array (handles old single-status data)
function getStatuses(item) {
    if (Array.isArray(item.statuses)) return item.statuses;
    if (item.status) return [item.status];
    return [];
}

// ---------- Utility ----------
function showToast(message, type = 'success') {
    const container = document.getElementById('media-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `media-toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

function debounce(fn, delay) {
    return (...args) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => fn(...args), delay);
    };
}

// ---------- TMDB API ----------
async function tmdbFetch(endpoint, params = {}) {
    if (!TMDB_API_KEY) {
        console.warn('TMDB API key is missing. Add VITE_TMDB_API_KEY to .env.local');
        return null;
    }
    const url = new URL(`${TMDB_BASE}${endpoint}`);
    url.searchParams.set('api_key', TMDB_API_KEY);
    url.searchParams.set('language', 'fr-FR');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`TMDB ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('TMDB fetch error:', err);
        return null;
    }
}

async function getTrendingMovies() {
    const data = await tmdbFetch('/trending/movie/day');
    return data?.results?.slice(0, 12) || [];
}

async function getTrendingTV() {
    const data = await tmdbFetch('/trending/tv/day');
    return data?.results?.slice(0, 12) || [];
}

async function searchTMDB(queryStr, type = 'movie') {
    if (!queryStr.trim()) return [];
    const data = await tmdbFetch(`/search/${type}`, { query: queryStr });
    return data?.results || [];
}

async function getMovieDetails(id) {
    return await tmdbFetch(`/movie/${id}`);
}

async function getTVDetails(id) {
    return await tmdbFetch(`/tv/${id}`);
}

// ---------- Jikan API (MyAnimeList) ----------
async function jikanFetch(endpoint) {
    // Rate limit: Jikan allows ~3 req/s, we wait at least 400ms between calls
    const now = Date.now();
    const diff = now - jikanLastRequest;
    if (diff < 400) {
        await new Promise(r => setTimeout(r, 400 - diff));
    }
    jikanLastRequest = Date.now();

    try {
        const res = await fetch(`${JIKAN_BASE}${endpoint}`);
        if (!res.ok) throw new Error(`Jikan ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('Jikan fetch error:', err);
        return null;
    }
}

async function getTopAnime() {
    const data = await jikanFetch('/top/anime?limit=12');
    return data?.data || [];
}

async function getTopManga() {
    const data = await jikanFetch('/top/manga?limit=12');
    return data?.data || [];
}

async function searchAnime(queryStr) {
    if (!queryStr.trim()) return [];
    const data = await jikanFetch(`/anime?q=${encodeURIComponent(queryStr)}&limit=20&sfw=true`);
    return data?.data || [];
}

async function searchManga(queryStr) {
    if (!queryStr.trim()) return [];
    const data = await jikanFetch(`/manga?q=${encodeURIComponent(queryStr)}&limit=20&sfw=true`);
    return data?.data || [];
}

// ---------- Firebase CRUD ----------
async function loadMyList() {
    try {
        const q = query(collection(db, 'mediatheque'), orderBy('addedAt', 'desc'));
        const snap = await getDocs(q);
        myList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('Error loading list:', err);
        myList = [];
    }
}

async function addToList(item) {
    try {
        const docRef = await addDoc(collection(db, 'mediatheque'), {
            ...item,
            addedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        myList.unshift({ id: docRef.id, ...item, addedAt: new Date(), updatedAt: new Date() });
        showToast(`"${item.title}" ajouté à ta liste !`);
        return docRef.id;
    } catch (err) {
        console.error('Error adding to list:', err);
        showToast("Erreur d'ajout", 'error');
        return null;
    }
}

async function updateListItem(docId, updates) {
    try {
        await updateDoc(doc(db, 'mediatheque', docId), {
            ...updates,
            updatedAt: serverTimestamp()
        });
        const idx = myList.findIndex(i => i.id === docId);
        if (idx !== -1) myList[idx] = { ...myList[idx], ...updates };
        showToast('Mis à jour ✨');
    } catch (err) {
        console.error('Error updating:', err);
        showToast('Erreur de mise à jour', 'error');
    }
}

async function removeFromList(docId, title) {
    try {
        await deleteDoc(doc(db, 'mediatheque', docId));
        myList = myList.filter(i => i.id !== docId);
        showToast(`"${title}" retiré de ta liste`);
    } catch (err) {
        console.error('Error removing:', err);
        showToast('Erreur de suppression', 'error');
    }
}

function findInList(externalId, mediaType) {
    return myList.find(i => i.externalId === externalId && i.mediaType === mediaType && (i.listOwner || 'Aaron') === currentProfile);
}

// ---------- Card Builders ----------
function buildTMDBCard(item, type = 'movie') {
    const title = item.title || item.name || 'Sans titre';
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
    const posterPath = item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null;
    const mediaType = type === 'movie' ? 'movie' : 'tv';
    const existing = findInList(item.id, mediaType);
    const existingStatuses = existing ? getStatuses(existing) : [];

    const card = document.createElement('div');
    card.className = 'media-card';
    card.style.animationDelay = `${Math.random() * 0.2}s`;

    const badgesHTML = existingStatuses.map(s => {
        const cfg = STATUS_CONFIG[s];
        return cfg ? `<div class="media-card-status ${cfg.color}">${cfg.emoji} ${cfg.label}</div>` : '';
    }).join('');

    card.innerHTML = `
        ${badgesHTML}
        ${posterPath 
            ? `<div class="media-card-poster"><img src="${posterPath}" alt="${title}" loading="lazy">${rating ? `<div class="media-card-rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${rating}</div>` : ''}</div>` 
            : `<div class="media-card-placeholder">🎬</div>`}
        <div class="media-card-body">
            <div class="media-card-title">${title}</div>
            <div class="media-card-meta">
                <span class="media-card-year">${year}</span>
                <span class="media-card-type type-${mediaType}">${type === 'movie' ? 'Film' : 'Série'}</span>
            </div>
        </div>
    `;

    card.onclick = () => showDetailModal({
        externalId: item.id,
        mediaType,
        title,
        year,
        rating: item.vote_average,
        posterUrl: posterPath,
        synopsis: item.overview || '',
        genres: item.genre_ids || [],
        backdropUrl: item.backdrop_path ? `${TMDB_IMG}/w780${item.backdrop_path}` : null,
        rawData: item
    });

    return card;
}

function buildAnimeCard(item, type = 'anime') {
    const title = item.title || item.title_english || 'Sans titre';
    const year = item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : '') || (item.published?.from ? new Date(item.published.from).getFullYear() : '');
    const rating = item.score ? item.score.toFixed(1) : null;
    const posterUrl = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null;
    const mediaType = type;
    const existing = findInList(item.mal_id, mediaType);
    const existingStatuses = existing ? getStatuses(existing) : [];

    const card = document.createElement('div');
    card.className = 'media-card';
    card.style.animationDelay = `${Math.random() * 0.2}s`;

    const badgesHTML = existingStatuses.map(s => {
        const cfg = STATUS_CONFIG[s];
        return cfg ? `<div class="media-card-status ${cfg.color}">${cfg.emoji} ${cfg.label}</div>` : '';
    }).join('');

    card.innerHTML = `
        ${badgesHTML}
        ${posterUrl 
            ? `<div class="media-card-poster"><img src="${posterUrl}" alt="${title}" loading="lazy">${rating ? `<div class="media-card-rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${rating}</div>` : ''}</div>` 
            : `<div class="media-card-placeholder">${type === 'anime' ? '📺' : '📖'}</div>`}
        <div class="media-card-body">
            <div class="media-card-title">${title}</div>
            <div class="media-card-meta">
                <span class="media-card-year">${year}</span>
                <span class="media-card-type type-${mediaType}">${type === 'anime' ? 'Anime' : 'Manga'}</span>
            </div>
        </div>
    `;

    card.onclick = () => showDetailModal({
        externalId: item.mal_id,
        mediaType,
        title,
        year,
        rating: item.score,
        posterUrl,
        synopsis: item.synopsis || '',
        genres: item.genres?.map(g => g.name) || [],
        episodes: item.episodes || item.chapters || null,
        status: item.status || '',
        backdropUrl: null,
        rawData: item
    });

    return card;
}

function buildMyListCard(item) {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.style.animationDelay = `${Math.random() * 0.2}s`;

    const itemStatuses = getStatuses(item);
    const typeLabels = { movie: 'Film', tv: 'Série', anime: 'Anime', manga: 'Manga' };

    const badgesHTML = itemStatuses.map(s => {
        const cfg = STATUS_CONFIG[s];
        return cfg ? `<div class="media-card-status ${cfg.color}">${cfg.emoji} ${cfg.label}</div>` : '';
    }).join('');

    card.innerHTML = `
        ${badgesHTML}
        ${item.posterUrl 
            ? `<div class="media-card-poster"><img src="${item.posterUrl}" alt="${item.title}" loading="lazy">${item.rating ? `<div class="media-card-rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${Number(item.rating).toFixed(1)}</div>` : ''}</div>` 
            : `<div class="media-card-placeholder">🎬</div>`}
        <div class="media-card-body">
            <div class="media-card-title">${item.title}</div>
            <div class="media-card-meta">
                <span class="media-card-year">${item.year || ''}</span>
                <span class="media-card-type type-${item.mediaType}">${typeLabels[item.mediaType] || item.mediaType}</span>
            </div>
        </div>
    `;

    card.onclick = () => showDetailModal({
        ...item,
        genres: item.genres || [],
        synopsis: item.synopsis || item.personalNote || ''
    });

    return card;
}

// ---------- Detail Modal ----------
function showDetailModal(data) {
    const existing = findInList(data.externalId, data.mediaType);
    const overlay = document.createElement('div');
    overlay.className = 'media-modal-overlay';

    const genresHTML = Array.isArray(data.genres) 
        ? data.genres.map(g => `<span class="media-genre-tag">${typeof g === 'string' ? g : ''}</span>`).join('') 
        : '';

    const currentStatuses = existing ? getStatuses(existing) : [];
    const currentNote = existing?.personalNote || '';

    const typeLabels = { movie: 'Film', tv: 'Série TV', anime: 'Anime', manga: 'Manga' };

    overlay.innerHTML = `
        <div class="media-modal">
            <button class="media-modal-close">✕</button>
            ${data.backdropUrl ? `<div class="media-modal-banner"><img src="${data.backdropUrl}" alt=""></div>` : '<div class="media-modal-banner" style="background: linear-gradient(135deg, rgba(191,90,242,0.2), rgba(255,45,85,0.2)); height: 160px;"></div>'}
            <div class="media-modal-content">
                <div class="media-modal-poster">
                    ${data.posterUrl ? `<img src="${data.posterUrl}" alt="${data.title}">` : '<div style="width:100%;height:100%;background:rgba(191,90,242,0.1);display:flex;align-items:center;justify-content:center;font-size:3rem;">🎬</div>'}
                </div>
                <div class="media-modal-info">
                    <h2 class="media-modal-title">${data.title}</h2>
                    <div class="media-modal-meta-row">
                        <span class="media-card-type type-${data.mediaType}">${typeLabels[data.mediaType] || ''}</span>
                        ${data.year ? `<span class="media-modal-meta-tag">${data.year}</span>` : ''}
                        ${data.rating ? `<span class="media-modal-rating-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="var(--neon-gold)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ${Number(data.rating).toFixed(1)}</span>` : ''}
                        ${data.episodes ? `<span class="media-modal-meta-tag">${data.episodes} ${data.mediaType === 'manga' ? 'chap.' : 'éps.'}</span>` : ''}
                    </div>
                    ${genresHTML ? `<div class="media-modal-genres">${genresHTML}</div>` : ''}
                    ${data.synopsis ? `<p class="media-modal-synopsis">${data.synopsis}</p>` : ''}

                    <div class="media-status-section">
                        <div class="media-status-label">📌 Mon statut</div>
                        <div class="media-status-options" id="modal-status-options">
                            ${Object.entries(STATUS_CONFIG).map(([key, cfg]) => `
                                <button class="media-status-btn ${currentStatuses.includes(key) ? 'selected' : ''}" data-status="${key}">
                                    ${cfg.emoji} ${cfg.label}
                                </button>
                            `).join('')}
                            ${existing ? `<button class="media-status-btn remove-btn" data-action="remove">🗑️ Retirer</button>` : ''}
                        </div>

                        <div style="margin-top: 14px;">
                            <textarea class="media-note-input" id="modal-note" placeholder="Note personnelle (optionnel)...">${currentNote}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close handler
    overlay.querySelector('.media-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    // Status buttons — multi-select with conflict logic, modal stays open
    const statusContainer = overlay.querySelector('#modal-status-options');
    // Track active statuses in modal
    let modalStatuses = [...currentStatuses];

    function updateModalButtons() {
        statusContainer.querySelectorAll('.media-status-btn[data-status]').forEach(b => {
            b.classList.toggle('selected', modalStatuses.includes(b.dataset.status));
        });
    }

    overlay.querySelectorAll('.media-status-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();

            if (btn.dataset.action === 'remove') {
                const currentExisting = findInList(data.externalId, data.mediaType);
                if (currentExisting) {
                    await removeFromList(currentExisting.id, data.title);
                    modalStatuses = [];
                    updateModalButtons();
                    const removeBtn = statusContainer.querySelector('[data-action="remove"]');
                    if (removeBtn) removeBtn.remove();
                    renderView();
                }
                return;
            }

            const status = btn.dataset.status;
            if (!status) return;

            if (modalStatuses.includes(status)) {
                // Toggle off: remove this status
                modalStatuses = modalStatuses.filter(s => s !== status);
            } else {
                // Toggle on: add this status, remove conflicts
                const conflicts = getConflicts(status);
                modalStatuses = modalStatuses.filter(s => !conflicts.includes(s));
                modalStatuses.push(status);
            }

            updateModalButtons();

            const noteEl = document.getElementById('modal-note');
            const note = noteEl ? noteEl.value.trim() : '';

            const currentExisting = findInList(data.externalId, data.mediaType);
            if (currentExisting) {
                await updateListItem(currentExisting.id, { statuses: modalStatuses, status: modalStatuses[0] || '', personalNote: note });
            } else if (modalStatuses.length > 0) {
                const newId = await addToList({
                    mediaType: data.mediaType,
                    externalId: data.externalId,
                    title: data.title,
                    posterUrl: data.posterUrl || '',
                    rating: data.rating || null,
                    year: data.year || '',
                    synopsis: data.synopsis || '',
                    genres: data.genres || [],
                    statuses: modalStatuses,
                    status: modalStatuses[0] || '',
                    personalNote: note,
                    listOwner: currentProfile
                });
                // Add remove button since item is now in the list
                if (newId && !statusContainer.querySelector('[data-action="remove"]')) {
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'media-status-btn remove-btn';
                    removeBtn.dataset.action = 'remove';
                    removeBtn.innerHTML = '🗑️ Retirer';
                    removeBtn.onclick = async (ev) => {
                        ev.stopPropagation();
                        const ex = findInList(data.externalId, data.mediaType);
                        if (ex) {
                            await removeFromList(ex.id, data.title);
                            modalStatuses = [];
                            updateModalButtons();
                            removeBtn.remove();
                            renderView();
                        }
                    };
                    statusContainer.appendChild(removeBtn);
                }
            }

            // Refresh the grid behind the modal
            renderView();
        };
    });
}

// ---------- Render Functions ----------
function showSkeletons(container, count = 8) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="media-skeleton-card">
                <div class="media-skeleton-poster"></div>
                <div class="media-skeleton-body">
                    <div class="media-skeleton-line"></div>
                    <div class="media-skeleton-line"></div>
                </div>
            </div>
        `;
    }
}

function showEmpty(container, message = "Rien à afficher") {
    container.innerHTML = `
        <div class="media-empty">
            <div class="media-empty-icon">${currentMainTab === 'movies' ? '🎬' : '📺'}</div>
            <h3>${message}</h3>
            <p>Cherche quelque chose ou explore les tendances !</p>
        </div>
    `;
}

async function renderDiscover() {
    const grid = document.getElementById('media-grid');
    const trendingSection = document.getElementById('trending-section');
    if (!grid) return;

    // Show trending
    if (trendingSection) trendingSection.classList.remove('hidden');

    showSkeletons(grid);

    if (currentMainTab === 'movies') {
        // Load trending movies & TV
        const trendingScroll = document.getElementById('trending-scroll');
        if (trendingScroll) {
            const [movies, tvShows] = await Promise.all([getTrendingMovies(), getTrendingTV()]);
            trendingScroll.innerHTML = '';
            movies.forEach(m => trendingScroll.appendChild(buildTMDBCard(m, 'movie')));

            grid.innerHTML = '';
            if (tvShows.length > 0) {
                tvShows.forEach(t => grid.appendChild(buildTMDBCard(t, 'tv')));
            } else {
                showEmpty(grid, "Impossible de charger les tendances");
            }
        }
    } else {
        // Anime tab
        const trendingScroll = document.getElementById('trending-scroll');
        if (trendingScroll) {
            const topAnime = await getTopAnime();
            trendingScroll.innerHTML = '';
            topAnime.forEach(a => trendingScroll.appendChild(buildAnimeCard(a, 'anime')));
        }

        const topManga = await getTopManga();
        grid.innerHTML = '';
        if (topManga.length > 0) {
            topManga.forEach(m => grid.appendChild(buildAnimeCard(m, 'manga')));
        } else {
            showEmpty(grid, "Impossible de charger le top manga");
        }
    }
}

function renderMyList() {
    const grid = document.getElementById('media-grid');
    const trendingSection = document.getElementById('trending-section');
    if (!grid) return;

    if (trendingSection) trendingSection.classList.add('hidden');

    let filtered = myList;

    // Filter by profile
    filtered = filtered.filter(i => (i.listOwner || 'Aaron') === currentProfile);

    // Filter by main tab
    if (currentMainTab === 'movies') {
        filtered = filtered.filter(i => i.mediaType === 'movie' || i.mediaType === 'tv');
    } else {
        filtered = filtered.filter(i => i.mediaType === 'anime' || i.mediaType === 'manga');
    }

    // Filter by status (supports multi-status)
    if (currentFilter !== 'all') {
        filtered = filtered.filter(i => getStatuses(i).includes(currentFilter));
    }

    grid.innerHTML = '';

    if (filtered.length === 0) {
        showEmpty(grid, currentFilter !== 'all' ? "Aucun élément avec ce statut" : "Ta liste est vide");
        return;
    }

    filtered.forEach(item => grid.appendChild(buildMyListCard(item)));

    // Update filter counts
    updateFilterCounts();
}

function updateFilterCounts() {
    let listForTab = myList.filter(i => (i.listOwner || 'Aaron') === currentProfile);
    if (currentMainTab === 'movies') {
        listForTab = listForTab.filter(i => i.mediaType === 'movie' || i.mediaType === 'tv');
    } else {
        listForTab = listForTab.filter(i => i.mediaType === 'anime' || i.mediaType === 'manga');
    }

    const allCountEl = document.querySelector('[data-filter="all"] .media-filter-count');
    if (allCountEl) allCountEl.textContent = listForTab.length;

    Object.keys(STATUS_CONFIG).forEach(status => {
        const countEl = document.querySelector(`[data-filter="${status}"] .media-filter-count`);
        if (countEl) countEl.textContent = listForTab.filter(i => getStatuses(i).includes(status)).length;
    });
}

async function renderView() {
    if (currentSubTab === 'discover') {
        await renderDiscover();
    } else {
        renderMyList();
    }
}

async function handleSearch(queryStr) {
    const grid = document.getElementById('media-grid');
    const trendingSection = document.getElementById('trending-section');
    if (!grid) return;

    if (!queryStr.trim()) {
        renderView();
        return;
    }

    if (trendingSection) trendingSection.classList.add('hidden');

    // Show spinner
    grid.innerHTML = '<div class="media-spinner"></div>';

    if (currentMainTab === 'movies') {
        const [movies, tvShows] = await Promise.all([
            searchTMDB(queryStr, 'movie'),
            searchTMDB(queryStr, 'tv')
        ]);
        grid.innerHTML = '';
        
        if (movies.length === 0 && tvShows.length === 0) {
            showEmpty(grid, `Aucun résultat pour "${queryStr}"`);
            return;
        }

        movies.forEach(m => grid.appendChild(buildTMDBCard(m, 'movie')));
        tvShows.forEach(t => grid.appendChild(buildTMDBCard(t, 'tv')));
    } else {
        const [anime, manga] = await Promise.all([
            searchAnime(queryStr),
            searchManga(queryStr)
        ]);
        grid.innerHTML = '';
        
        if (anime.length === 0 && manga.length === 0) {
            showEmpty(grid, `Aucun résultat pour "${queryStr}"`);
            return;
        }

        anime.forEach(a => grid.appendChild(buildAnimeCard(a, 'anime')));
        manga.forEach(m => grid.appendChild(buildAnimeCard(m, 'manga')));
    }
}

// ---------- UI Initialization ----------
function initTabs() {
    // Main tabs (Movies / Anime)
    document.querySelectorAll('.media-tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.media-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMainTab = btn.dataset.tab;

            // Update search placeholder
            const searchInput = document.getElementById('media-search');
            if (searchInput) {
                searchInput.value = '';
                searchInput.placeholder = currentMainTab === 'movies' 
                    ? 'Rechercher un film ou une série...'
                    : 'Rechercher un anime ou manga...';
            }

            // Update trending title
            const trendingTitle = document.getElementById('trending-title');
            if (trendingTitle) {
                trendingTitle.innerHTML = currentMainTab === 'movies' 
                    ? '🔥 Films Tendances' 
                    : '🔥 Top Anime';
            }

            // Update grid subtitle
            const gridTitle = document.getElementById('grid-title');
            if (gridTitle) {
                gridTitle.innerHTML = currentMainTab === 'movies' 
                    ? '📺 Séries Tendances' 
                    : '📖 Top Manga';
            }

            renderView();
        };
    });

    // Sub tabs (Discover / My List)
    document.querySelectorAll('.media-sub-tab').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.media-sub-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSubTab = btn.dataset.subtab;

            // Show/hide filter bar
            const filterBar = document.getElementById('filter-bar');
            if (filterBar) filterBar.classList.toggle('hidden', currentSubTab !== 'mylist');

            // Show/hide search
            const searchSection = document.getElementById('search-section');
            if (searchSection) searchSection.classList.toggle('hidden', currentSubTab === 'mylist');

            renderView();
        };
    });

    // Filter buttons (in My List)
    document.querySelectorAll('.media-filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.media-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderMyList();
        };
    });
}

function initSearch() {
    const searchInput = document.getElementById('media-search');
    if (!searchInput) return;

    const debouncedSearch = debounce(handleSearch, 500);
    searchInput.addEventListener('input', () => {
        debouncedSearch(searchInput.value);
    });
}

// ---------- Profile System ----------
function initProfiles() {
    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentProfile = btn.dataset.profile;

            // Update nav indicator
            const navProfile = document.getElementById('nav-profile-name');
            if (navProfile) navProfile.textContent = `👤 ${currentProfile}`;

            // Re-render
            updateFilterCounts();
            renderView();
        };
    });
}

// ---------- Passcode Gate ----------
function initPasscode() {
    // Check if already unlocked this session
    if (sessionStorage.getItem('mediatheque_unlocked') === 'true') {
        unlockPage();
        return;
    }

    const overlay = document.getElementById('passcode-overlay');
    const input = document.getElementById('passcode-input');
    const dots = document.querySelectorAll('#passcode-dots span');
    const errorEl = document.getElementById('passcode-error');
    let code = '';

    function updateDots() {
        dots.forEach((dot, i) => {
            dot.classList.toggle('filled', i < code.length);
        });
    }

    function tryUnlock() {
        if (code === PASSCODE) {
            sessionStorage.setItem('mediatheque_unlocked', 'true');
            overlay.classList.add('unlocked');
            setTimeout(() => {
                unlockPage();
                overlay.remove();
            }, 600);
        } else {
            // Shake + error
            overlay.classList.add('shake');
            errorEl.classList.add('visible');
            setTimeout(() => {
                overlay.classList.remove('shake');
                code = '';
                updateDots();
            }, 500);
            setTimeout(() => errorEl.classList.remove('visible'), 2000);
        }
    }

    function addDigit(digit) {
        if (code.length >= 6) return;
        code += digit;
        updateDots();
        if (code.length === 6) {
            setTimeout(tryUnlock, 200);
        }
    }

    function deleteDigit() {
        code = code.slice(0, -1);
        updateDots();
    }

    // Keypad clicks
    document.querySelectorAll('#passcode-keypad button').forEach(btn => {
        btn.onclick = () => {
            const key = btn.dataset.key;
            if (key === 'del') deleteDigit();
            else if (key === 'enter') { if (code.length === 6) tryUnlock(); }
            else addDigit(key);
        };
    });

    // Physical keyboard support
    document.addEventListener('keydown', (e) => {
        if (!document.getElementById('passcode-overlay')) return;
        if (e.key >= '0' && e.key <= '9') addDigit(e.key);
        else if (e.key === 'Backspace') deleteDigit();
        else if (e.key === 'Enter' && code.length === 6) tryUnlock();
    });
}

function unlockPage() {
    // Show the actual page content
    const page = document.querySelector('.media-page');
    const navbar = document.querySelector('.media-navbar');
    if (page) page.classList.remove('locked');
    if (navbar) navbar.classList.remove('locked');

    // Initialize the app
    initApp();
}

async function initApp() {
    initTabs();
    initSearch();
    initProfiles();

    // Load user's list from Firebase
    await loadMyList();
    updateFilterCounts();

    // Render initial view
    renderView();
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
    // Lock UI behind passcode
    const page = document.querySelector('.media-page');
    const navbar = document.querySelector('.media-navbar');
    if (page) page.classList.add('locked');
    if (navbar) navbar.classList.add('locked');

    initPasscode();
});
