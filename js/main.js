// ============================================
// COSMOS — Main Application Logic
// ============================================

import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    doc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit
} from "firebase/firestore";

import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "firebase/storage";

import { profanities as profanitiesEN } from "profanities";
import { profanities as profanitiesFR } from "profanities/fr";

// ---------- Quill Custom Formats ----------
if (typeof Quill !== 'undefined') {
    const Inline = Quill.import('blots/inline');
    class ProfanityBlot extends Inline {}
    ProfanityBlot.blotName = 'profanity';
    ProfanityBlot.className = 'ql-profanity';
    Quill.register(ProfanityBlot);
}


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
const storage = getStorage(app);

// ---------- Media & State ----------
let selectedMediaFile = null;

// ---------- Search State ----------
let allLoadedArticles = []; // Stores public articles for search
let adminArticlesList = []; // Stores admin articles for search

// ---------- Translations ----------
const TRANSLATIONS = {
    fr: {
        navCreate: "Créer",
        navActualites: "Actualités",
        navLaunches: "Lancements",
        navSkyMap: "Carte du Ciel",
        navISS: "ISS",
        navArticles: "Articles",
        heroBadge: "🔭 Explorez l'infini",
        heroTitle1: "Partagez vos découvertes",
        heroTitle2: "cosmiques",
        heroSubtitle: "Créez et publiez des articles sur l'astronomie, les étoiles, les galaxies et les mystères de l'univers.",
        heroCta: "Commencer à écrire",
        sectionCreateTag: "✍️ Rédaction",
        sectionCreateTitle: "Créer un article",
        sectionCreateDesc: "Partagez vos connaissances et passions astronomiques avec le monde.",
        labelTitle: "Titre de l'article",
        labelContent: "Contenu",
        labelMainImage: "Image principale",
        labelExtras: "Images supplémentaires",
        placeholderTitle: "Ex: La nébuleuse d'Orion révèle ses secrets...",
        placeholderContent: "Écrivez votre article ici...",
        btnEffacer: "Effacer",
        btnPublier: "Publier l'article",
        sectionArticlesTag: "📡 Publications",
        sectionArticlesTitle: "Articles publiés",
        sectionArticlesDesc: "Découvrez les dernières publications de la communauté.",
        emptyTitle: "Aucun article pour l'instant",
        emptyDesc: "Soyez le premier à partager une découverte cosmique !",
        emptyCta: "Créer un article",
        footerTagline: "Explorez l'univers, un article à la fois.",
        toastPublie: "Article publié avec succès !",
        toastSupprime: "Article supprimé",
        toastMisAJour: "Article mis à jour !",
        toastEfface: "Formulaire effacé",
        adminTitle: "Panel Administration",
        adminClose: "Fermer",
        adminArticles: "Articles",
        btnModifier: "Modifier",
        btnSupprimer: "Supprimer",
        confirmDelete: "Supprimer cet article définitivement ?",
        confirmClear: "Effacer tous les champs ?",
        settingsTitle: "Paramètres",
        settingsLang: "Langue du site",
        langFR: "Français",
        langEN: "English",
        labelSources: "Sources",
        btnSources: "Sources",
        placeholderSourceName: "Nom (ex: NASA)",
        placeholderSourceUrl: "Lien (URL)",
        tabArxiv: "ArXiv",
        btnSelectTomorrow: "Choisir pour demain",
        toastArxivSelected: "Article sélectionné pour demain !",
        arxivLibraryDesc: "Sélectionnez un article pour qu'il soit mis en avant demain.",
        issPositionLabel: "Position",
        issSpeedLabel: "Vitesse",
        issAltLabel: "Altitude",
        issCrewLabel: "Équipage",
        issLoading: "Chargement...",
        issAstronauts: "astronautes",
        moonPhases: ["Nouvelle Lune", "Premier Croissant", "Premier Quartier", "Gibbeuse Croissante", "Pleine Lune", "Gibbeuse Décroissante", "Dernier Quartier", "Dernier Croissant"],
        funFactTitle: "Saviez-vous ?",
        facts: [
            "Un jour sur Vénus est plus long qu'une année sur Vénus.",
            "L'espace est complètement silencieux car il n'est pas rempli d'air.",
            "Il y a plus d'étoiles dans l'univers que de grains de sable sur Terre.",
            "Si deux morceaux du même métal se touchent dans l'espace, ils se soudent à froid.",
            "Le coucher de soleil sur Mars est bleu.",
            "La Grande Tache Rouge de Jupiter est une tempête de 300 ans.",
            "Un an sur Mercure ne dure que 88 jours terrestres.",
            "L'empreinte des astronautes sur la Lune y restera des millions d'années."
        ]
    },
    en: {
        navCreate: "Create",
        navActualites: "News",
        navLaunches: "Launches",
        navSkyMap: "Sky Map",
        navISS: "ISS",
        navArticles: "Articles",
        heroBadge: "🔭 Explore the infinity",
        heroTitle1: "Share your cosmic",
        heroTitle2: "discoveries",
        heroSubtitle: "Create and publish articles about astronomy, stars, galaxies, and the mysteries of the universe.",
        heroCta: "Start writing",
        sectionCreateTag: "✍️ Writing",
        sectionCreateTitle: "Create an article",
        sectionCreateDesc: "Share your astronomical knowledge and passions with the world.",
        labelTitle: "Article Title",
        labelContent: "Content",
        labelMainImage: "Main Image",
        labelExtras: "Additional Images",
        placeholderTitle: "Ex: The Orion Nebula reveals its secrets...",
        placeholderContent: "Write your article here...",
        btnEffacer: "Clear",
        btnPublier: "Publish article",
        sectionArticlesTag: "📡 Publications",
        sectionArticlesTitle: "Published articles",
        sectionArticlesDesc: "Discover the latest publications from the community.",
        emptyTitle: "No articles yet",
        emptyDesc: "Be the first to share a cosmic discovery!",
        emptyCta: "Create an article",
        footerTagline: "Explore the universe, one article at a time.",
        toastPublie: "Article published successfully!",
        toastSupprime: "Article deleted",
        toastMisAJour: "Article updated!",
        toastEfface: "Form cleared",
        adminTitle: "Admin Panel",
        adminClose: "Close",
        adminArticles: "Articles",
        btnModifier: "Edit",
        btnSupprimer: "Delete",
        confirmDelete: "Delete this article permanently?",
        confirmClear: "Clear all fields?",
        settingsTitle: "Settings",
        settingsLang: "Site Language",
        langFR: "French",
        langEN: "English",
        labelSources: "Sources",
        btnSources: "Sources",
        placeholderSourceName: "Name (ex: NASA)",
        placeholderSourceUrl: "Link (URL)",
        tabArxiv: "ArXiv",
        btnSelectTomorrow: "Select for tomorrow",
        toastArxivSelected: "Article selected for tomorrow!",
        arxivLibraryDesc: "Select an article to be featured tomorrow.",
        issPositionLabel: "Position",
        issSpeedLabel: "Speed",
        issAltLabel: "Altitude",
        issCrewLabel: "Crew",
        issLoading: "Loading...",
        issAstronauts: "astronauts",
        moonPhases: ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"],
        funFactTitle: "Did you know?",
        facts: [
            "A day on Venus is longer than a year on Venus.",
            "Space is completely silent because there is no atmosphere.",
            "There are more stars in the universe than grains of sand on Earth.",
            "If two pieces of the same metal touch in space, they bond permanently.",
            "Sunsets on Mars are blue.",
            "Jupiter's Great Red Spot is a 300-year-old storm.",
            "One year on Mercury is only 88 Earth days.",
            "Footprints on the Moon will stay there for millions of years."
        ]
    }
};

let currentLang = localStorage.getItem("cosmos_lang") || "fr";
let currentType = "article"; // 'article' or 'note'
let hasNoteAccess = false;
let quill;

// ---------- Passcode Modal (iPhone/Safe Style) ----------
function showPasscodeModal() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'passcode-overlay';
        
        overlay.innerHTML = `
            <div class="passcode-modal">
                <div class="passcode-header">
                    <div class="passcode-title">${currentLang === 'fr' ? 'Accès Restreint' : 'Restricted Access'}</div>
                    <div class="passcode-dots">
                        <div class="passcode-dot"></div>
                        <div class="passcode-dot"></div>
                        <div class="passcode-dot"></div>
                        <div class="passcode-dot"></div>
                    </div>
                </div>
                <div class="passcode-keypad">
                    <div class="keypad-btn" data-val="1">1</div>
                    <div class="keypad-btn" data-val="2">2</div>
                    <div class="keypad-btn" data-val="3">3</div>
                    <div class="keypad-btn" data-val="4">4</div>
                    <div class="keypad-btn" data-val="5">5</div>
                    <div class="keypad-btn" data-val="6">6</div>
                    <div class="keypad-btn" data-val="7">7</div>
                    <div class="keypad-btn" data-val="8">8</div>
                    <div class="keypad-btn" data-val="9">9</div>
                    <div class="keypad-btn action" data-val="cancel">${currentLang === 'fr' ? 'Annuler' : 'Cancel'}</div>
                    <div class="keypad-btn" data-val="0">0</div>
                    <div class="keypad-btn action" data-val="clear">${currentLang === 'fr' ? 'Effacer' : 'Clear'}</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        
        // Trigger animation
        setTimeout(() => overlay.classList.add('active'), 10);

        const dots = overlay.querySelectorAll('.passcode-dot');
        const modal = overlay.querySelector('.passcode-modal');
        let tempCode = "";

        const updateDots = () => {
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx < tempCode.length);
                dot.classList.remove('error');
            });
        };

        const handleInput = async (val) => {
            if (val === 'cancel') {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 400);
                resolve(false);
                return;
            }
            if (val === 'clear') {
                tempCode = "";
                updateDots();
                return;
            }

            if (tempCode.length < 4) {
                tempCode += val;
                updateDots();

                if (tempCode.length === 4) {
                    if (tempCode === '1216') {
                        // Success!
                        overlay.classList.remove('active');
                        setTimeout(() => overlay.remove(), 400);
                        resolve(true);
                    } else {
                        // Error
                        modal.classList.add('passcode-error-shake');
                        dots.forEach(dot => dot.classList.add('error'));
                        
                        setTimeout(() => {
                            modal.classList.remove('passcode-error-shake');
                            tempCode = "";
                            updateDots();
                        }, 600);
                    }
                }
            }
        };

        overlay.querySelectorAll('.keypad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleInput(btn.dataset.val);
            });
        });

        // Close on overlay click (cancel)
        overlay.addEventListener('click', () => handleInput('cancel'));
        modal.addEventListener('click', (e) => e.stopPropagation());
    });
}

// ---------- Media Handling ----------
function initMediaDropzone() {
    const dropzone = document.getElementById('media-dropzone');
    const fileInput = document.getElementById('media-file-input');
    const previewContainer = document.getElementById('media-preview-container');
    const mainImageInput = document.getElementById('main-image');

    if (!dropzone || !fileInput) return;

    // Click to select
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        dropzone.addEventListener(evt, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropzone.addEventListener('dragover', () => dropzone.classList.add('dragover'));
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
        dropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) handleMediaFile(files[0]);
    });

    fileInput.addEventListener('change', e => {
        if (e.target.files.length) handleMediaFile(e.target.files[0]);
    });

    // Handle URL input fallback
    if (mainImageInput) {
        mainImageInput.addEventListener('input', () => {
            if (mainImageInput.value.trim()) {
                clearMediaFile();
            }
        });
    }
}

function handleMediaFile(file) {
    if (!file) return;
    
    selectedMediaFile = file;
    const previewContainer = document.getElementById('media-preview-container');
    const dropzoneContent = document.querySelector('.dropzone-content');
    const extraImagesGroup = document.getElementById('extra-images-group');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    previewContainer.classList.remove('hidden');
    if (dropzoneContent) dropzoneContent.style.opacity = '0';

    if (file.type.startsWith('image/')) {
        mediaType = 'image';
        if (extraImagesGroup) extraImagesGroup.classList.add('hidden');
        const reader = new FileReader();
        reader.onload = e => {
            const img = document.createElement('img');
            img.src = e.target.result;
            previewContainer.appendChild(img);
            addRemoveButton(previewContainer);
        };
        reader.readAsDataURL(file);
    }
}

function addRemoveButton(container) {
    const btn = document.createElement('button');
    btn.className = 'btn-remove-media';
    btn.innerHTML = '✕';
    btn.onclick = (e) => {
        e.stopPropagation();
        clearMediaFile();
    };
    container.appendChild(btn);
}

function clearMediaFile() {
    selectedMediaFile = null;
    const previewContainer = document.getElementById('media-preview-container');
    const dropzoneContent = document.querySelector('.dropzone-content');
    const fileInput = document.getElementById('media-file-input');
    const extraImagesGroup = document.getElementById('extra-images-group');
    
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.classList.add('hidden');
    }
    if (extraImagesGroup) extraImagesGroup.classList.add('hidden');
    if (dropzoneContent) dropzoneContent.style.opacity = '1';
    if (fileInput) fileInput.value = '';
}

// ---------- Sources Manager ----------
function addSourceField(name = '', url = '') {
    const container = document.getElementById('sources-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'source-row';
    row.innerHTML = `
        <input type="text" class="form-input source-name" placeholder="Nom (ex: NASA)" value="${name}">
        <input type="url" class="form-input source-url" placeholder="Lien (URL)" value="${url}">
        <button type="button" class="btn-remove-source" title="Supprimer">✕</button>
    `;

    row.querySelector('.btn-remove-source').onclick = () => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        setTimeout(() => row.remove(), 200);
    };

    container.appendChild(row);
}

function initSourcesManager() {
    const addBtn = document.getElementById('add-source-btn');
    if (addBtn) {
        addBtn.onclick = () => addSourceField();
    }
}

function getSourcesData() {
    const rows = document.querySelectorAll('.source-row');
    const sources = [];
    rows.forEach(row => {
        const name = row.querySelector('.source-name').value.trim();
        const url = row.querySelector('.source-url').value.trim();
        if (name || url) {
            sources.push({ name: name || url, url });
        }
    });
    return sources;
}

function showSourcesPopup(sources) {
    if (!sources || sources.length === 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.style.maxWidth = '400px';

    modal.innerHTML = `
        <button class="modal-close">✕</button>
        <h2 class="modal-title" style="margin-bottom: 20px;">Sources & Références</h2>
        <div class="sources-modal-list">
            ${sources.map(s => `
                <a href="${s.url || '#'}" target="_blank" class="source-modal-item">
                    ${s.name}
                    ${s.url ? `<span>${s.url}</span>` : ''}
                </a>
            `).join('')}
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector('.modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

// ---------- ArXiv Actualités (Daily Feed) ----------
const ARXIV_CACHE_KEY = "cosmos_arxiv_cache_v5";
const NASA_CACHE_KEY = "cosmos_nasa_cache_v5";
const NEWS_CACHE_DURATION = 3600000; // 1 hour in ms

// Proxy list for CORS bypass (fallback chain)
const CORS_PROXIES = [
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
];

async function fetchViaProxy(url) {
    for (const makeProxy of CORS_PROXIES) {
        try {
            const proxyUrl = makeProxy(url);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
            const res = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) continue;
            return await res.text();
        } catch (_) { continue; }
    }
    return null;
}

function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseArxivXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const entries = doc.querySelectorAll("entry");
    const articles = [];

    entries.forEach(entry => {
        const title = entry.querySelector("title")?.textContent?.replace(/\s+/g, ' ').trim() || "";
        const summary = entry.querySelector("summary")?.textContent?.replace(/\s+/g, ' ').trim() || "";
        const published = entry.querySelector("published")?.textContent || "";
        const id = entry.querySelector("id")?.textContent || "";

        const authors = [];
        entry.querySelectorAll("author > name").forEach(n => authors.push(n.textContent));

        const links = entry.querySelectorAll("link");
        let pdfLink = "";
        let absLink = id;
        links.forEach(l => {
            if (l.getAttribute("title") === "pdf") pdfLink = l.getAttribute("href");
            if (l.getAttribute("type") === "text/html") absLink = l.getAttribute("href");
        });

        articles.push({ title, summary, published, authors, id, pdfLink, absLink });
    });

    return articles;
}

async function fetchArxivArticles() {
    const rawUrl = "https://export.arxiv.org/api/query?search_query=cat:astro-ph&sortBy=submittedDate&sortOrder=descending&max_results=20";
    const xmlText = await fetchViaProxy(rawUrl);
    if (!xmlText) return null;
    return parseArxivXml(xmlText);
}

async function fetchLatestNasaArticle() {
    // Check cache first
    try {
        const cache = JSON.parse(localStorage.getItem(NASA_CACHE_KEY));
        const now = Date.now();
        if (cache && cache.timestamp && (now - cache.timestamp < NEWS_CACHE_DURATION) && cache.article) {
            return cache.article;
        }
    } catch (_) {}

    const html = await fetchViaProxy("https://www.nasa.gov/news/recently-published/");
    if (!html) return null;

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Target the specific NASA content item class
        const items = doc.querySelectorAll(".hds-content-item");
        let nasaArticle = null;

        for (const item of items) {
            const headingLink = item.querySelector(".hds-content-item-heading");
            const title = headingLink ? headingLink.textContent.trim() : "";
            const href = headingLink ? headingLink.getAttribute("href") : "";
            const excerptEl = item.querySelector(".hds-content-item-excerpt, p");
            const summary = excerptEl ? excerptEl.textContent.trim() : "";

            // Ignore navigation items or empty titles
            if (!title || !href || title.toLowerCase() === "news & events") continue;

            const fullUrl = href.startsWith("http") ? href : `https://www.nasa.gov${href}`;
            nasaArticle = {
                title: title,
                summary: summary,
                absLink: fullUrl,
                source: "NASA",
                published: new Date().toISOString()
            };
            break; // Found the first real article
        }

        if (nasaArticle) {
            localStorage.setItem(NASA_CACHE_KEY, JSON.stringify({ 
                timestamp: Date.now(), 
                article: nasaArticle 
            }));
        }
        return nasaArticle;
    } catch (err) {
        console.warn("NASA parse error:", err);
        return null;
    }
}

async function loadDailyArxiv() {
    const container = document.getElementById("arxiv-container");
    const loading = document.getElementById("arxiv-loading");
    if (!container) return;

    // Check cache
    let finalArticles = null;
    try {
        const cache = JSON.parse(localStorage.getItem(ARXIV_CACHE_KEY));
        const now = Date.now();
        if (cache && cache.timestamp && (now - cache.timestamp < NEWS_CACHE_DURATION) && cache.articles?.length >= 2) {
            finalArticles = cache.articles;
        }
    } catch (_) {}

    if (!finalArticles) {
        if (loading) loading.classList.remove("hidden");
        
        // Fetch ArXiv + NASA in parallel
        const [allCandidates, nasaArticle] = await Promise.all([
            fetchArxivArticles(),
            fetchLatestNasaArticle()
        ]);

        if (allCandidates && allCandidates.length > 0) {
            const todayStr = getTodayStr();
            const q = query(collection(db, "ArXivPicks"), where("scheduledFor", "==", todayStr), limit(1));
            const pickSnap = await getDocs(q);
            
            finalArticles = [];
            let pickedId = null;

            if (!pickSnap.empty) {
                const pickData = pickSnap.docs[0].data();
                finalArticles.push(pickData);
                pickedId = pickData.id;
            }

            const filtered = allCandidates.filter(a => a.id !== pickedId);
            const shuffled = filtered.sort(() => Math.random() - 0.5);
            
            while (finalArticles.length < 2 && shuffled.length > 0) {
                finalArticles.push(shuffled.pop());
            }

            // Add NASA article as 3rd card
            if (nasaArticle) {
                finalArticles.push(nasaArticle);
            }

            localStorage.setItem(ARXIV_CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                articles: finalArticles
            }));
        }
    }

    if (loading) loading.classList.add("hidden");

    if (!finalArticles || finalArticles.length === 0) {
        container.innerHTML = `<div style="text-align:center; color: rgba(255,255,255,0.3); padding: 40px; grid-column: 1/-1;">
            ${currentLang === 'fr' ? 'Impossible de charger les actualités.' : 'Unable to load news.'}
        </div>`;
        return;
    }

    container.innerHTML = "";
    finalArticles.forEach(entry => {
        container.appendChild(buildArxivCard(entry));
    });

    startArxivCountdown();
}

function startArxivCountdown() {
    const timerEl = document.getElementById("cooldown-timer");
    if (!timerEl) return;

    function update() {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0); // Next midnight

        const diff = tomorrow - now;
        if (diff <= 0) {
            timerEl.textContent = "00:00:00";
            // Refresh feed if it hit zero
            localStorage.removeItem(ARXIV_CACHE_KEY);
            loadDailyArxiv();
            return;
        }

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        timerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    update();
    setInterval(update, 1000);
}

function buildArxivCard(entry) {
    const card = document.createElement("div");
    card.className = "arxiv-card";

    const isNasa = entry.source === 'NASA';
    const pubDate = entry.published ? new Date(entry.published) : null;
    const dateStr = pubDate ? pubDate.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric', month: 'short', year: 'numeric'
    }) : '';

    const authorsStr = entry.authors?.slice(0, 3).join(", ") + (entry.authors?.length > 3 ? " et al." : "") || "";
    const badge = isNasa 
        ? '<span class="arxiv-badge nasa-badge">🚀 NASA</span>'
        : '<span class="arxiv-badge">📡 ArXiv</span>';

    card.innerHTML = `
        <div class="arxiv-card-header">
            ${badge}
            <span class="arxiv-date">${dateStr}</span>
        </div>
        <h3 class="arxiv-card-title">${entry.title}</h3>
        ${authorsStr ? `<p class="arxiv-card-authors">${authorsStr}</p>` : ''}
        <p class="arxiv-card-abstract">${entry.summary}</p>
    `;

    card.onclick = () => showArxivModal(entry);
    return card;
}

function showArxivModal(entry) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const modal = document.createElement("div");
    modal.className = "modal-container";

    const isNasa = entry.source === 'NASA';
    const pubDate = entry.published ? new Date(entry.published) : null;
    const dateStr = pubDate ? pubDate.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric', month: 'long', year: 'numeric'
    }) : '';

    const authorsStr = entry.authors?.join(", ") || "";
    const badge = isNasa 
        ? '<span class="arxiv-badge nasa-badge">🚀 NASA</span>'
        : '<span class="arxiv-badge">📡 ArXiv</span>';
    const linkLabel = isNasa ? 'Voir sur NASA' : 'Voir sur ArXiv';

    modal.innerHTML = `
        <button class="modal-close">✕</button>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
            ${badge}
            <span class="arxiv-date">${dateStr}</span>
        </div>
        <h2 class="modal-title">${entry.title}</h2>
        ${authorsStr ? `<p class="arxiv-modal-authors">${authorsStr}</p>` : ''}
        <div class="arxiv-modal-abstract">${entry.summary}</div>
        <div class="arxiv-modal-actions">
            ${entry.absLink ? `<a href="${entry.absLink}" target="_blank" class="arxiv-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                ${linkLabel}
            </a>` : ''}
            ${entry.pdfLink ? `<a href="${entry.pdfLink}" target="_blank" class="arxiv-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                PDF
            </a>` : ''}
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector('.modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

async function uploadMedia(file) {
    const storageRef = ref(storage, `media/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
}

function showConfirmModal(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'passcode-overlay';
        
        overlay.innerHTML = `
            <div class="passcode-modal">
                <div class="passcode-header">
                    <div class="passcode-title">${currentLang === 'fr' ? 'Confirmation' : 'Confirmation'}</div>
                </div>
                <div class="confirm-modal-content">
                    <p>${message}</p>
                    <div class="confirm-modal-actions">
                        <button id="confirm-no" class="btn btn-ghost btn-confirm-no">${currentLang === 'fr' ? 'Annuler' : 'Cancel'}</button>
                        <button id="confirm-yes" class="hero-cta btn-confirm-yes" style="border:none; cursor:pointer;">
                            <span>${currentLang === 'fr' ? 'Confirmer' : 'Confirm'}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('active'), 10);

        const btnNo = overlay.querySelector('#confirm-no');
        const btnYes = overlay.querySelector('#confirm-yes');

        const close = (res) => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 400);
            resolve(res);
        };

        btnNo.onclick = () => close(false);
        btnYes.onclick = () => close(true);
        
        const handleKey = (e) => {
            if (e.key === 'Escape') btnNo.click();
            if (e.key === 'Enter') btnYes.click();
        };
        window.addEventListener('keydown', handleKey, { once: true });
    });
}

function initQuill() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: TRANSLATIONS[currentLang].placeholderContent,
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'clean']
            ]
        }
    });

    // Live profanity checking
    quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
            updateLiveProfanity(quill);
        }
    });
}

let profanityTimeout;
function updateLiveProfanity(q) {
    if (!q) return;
    clearTimeout(profanityTimeout);
    profanityTimeout = setTimeout(() => {
        const text = q.getText();
        const lowerText = text.toLowerCase();
        
        q.formatText(0, text.length, 'profanity', false, 'silent');

        let foundCount = 0;
        for (const word of BANNED_WORDS) {
            if (WHITELISTED_WORDS.has(word)) continue;
            
            let index = lowerText.indexOf(word);
            while (index !== -1) {
                const prevChar = index > 0 ? lowerText[index - 1] : ' ';
                const nextChar = index + word.length < lowerText.length ? lowerText[index + word.length] : ' ';
                if (/\s|[^\p{L}\p{N}]/u.test(prevChar) && /\s|[^\p{L}\p{N}]/u.test(nextChar)) {
                    if (prevChar !== '#' || nextChar !== '#') {
                        q.formatText(index, word.length, 'profanity', true, 'silent');
                        foundCount++;
                    }
                }
                index = lowerText.indexOf(word, index + 1);
            }
        }

        const wrapper = q.root.closest('.editor-wrapper');
        if (wrapper) {
            wrapper.classList.toggle('input-profanity', foundCount > 0);
        }
    }, 700);
}

function translateUI() {
    const t = TRANSLATIONS[currentLang];
    
    // Update simple text elements
    const mappings = {
        '[href="#create"].nav-link': t.navCreate,
        '[href="#actualites"].nav-link': t.navActualites,
        '[href="#launches"].nav-link': t.navLaunches,
        '[href="#skymap"].nav-link': t.navSkyMap,
        '[href="#iss"].nav-link': t.navISS,
        '[href="#articles"].nav-link': t.navArticles,
        '[data-translate="issPositionLabel"]': t.issPositionLabel,
        '[data-translate="issSpeedLabel"]': t.issSpeedLabel,
        '[data-translate="issAltLabel"]': t.issAltLabel,
        '[data-translate="issCrewLabel"]': t.issCrewLabel,
        '.hero-badge': t.heroBadge,
        '.hero-subtitle': t.heroSubtitle,
        '.hero-cta span': t.heroCta,
        '#create .section-tag': t.sectionCreateTag,
        '#create .section-title': t.sectionCreateTitle,
        '#create .section-desc': t.sectionCreateDesc,
        'label[for="title"]': t.labelTitle,
        'label[for="content"]': t.labelContent,
        'label[for="main-image"]': t.labelMainImage,
        '#create .form-group:nth-child(4) .form-label': t.labelExtras,
        '#clear-button': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> ${t.btnEffacer}`,
        '#publish-button': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> ${t.btnPublier}`,
        '#articles .section-tag': t.sectionArticlesTag,
        '#articles .section-title': t.sectionArticlesTitle,
        '#articles .section-desc': t.sectionArticlesDesc,
        '#articles-empty h3': t.emptyTitle,
        '#articles-empty p': t.emptyDesc,
        '#articles-empty .btn': t.emptyCta,
        '.footer-text': t.footerTagline,
        '.fact-emoji': '💡',
        '#fun-fact-container .fact-emoji + span': t.funFactTitle
    };

    for (const [selector, text] of Object.entries(mappings)) {
        const el = document.querySelector(selector);
        if (el) {
            if (selector.includes('button') || selector.includes('cta')) el.innerHTML = text;
            else el.textContent = text;
        }
    }

    // Special case for hero title with gradient
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.innerHTML = `${t.heroTitle1} <span class="hero-gradient">${t.heroTitle2}</span>`;
    }

    // Placeholders
    const titleInp = document.getElementById('title');
    if (titleInp) titleInp.placeholder = t.placeholderTitle;
    const contentInp = document.getElementById('content');
    if (contentInp) contentInp.placeholder = t.placeholderContent;

    // Document title
    document.title = `Cosmos — ${currentLang === 'fr' ? "Articles d'Astronomie" : "Astronomy Articles"}`;
    document.documentElement.lang = currentLang;

    // Refresh aesthetic features on translate
    initMoonPhase();
    initFunFacts();
}

// ---------- Local Storage Fallback ----------
const LOCAL_KEY = "cosmos_articles_v2";

function saveLocalArticles(arr) {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(arr || []));
    } catch (e) {
        console.warn("Impossible de sauvegarder en local", e);
    }
}

function loadLocalArticles() {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function addLocalArticle(obj) {
    const arr = loadLocalArticles();
    arr.unshift(obj);
    saveLocalArticles(arr);
}

function removeLocalArticleById(id) {
    if (!id) return;
    const arr = loadLocalArticles().filter(
        (a) => a._localId !== id && a.id !== id
    );
    saveLocalArticles(arr);
}

// ---------- Toast Notifications ----------
function showToast(message, type = "info", duration = 3500, onClick = null) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const icons = {
        success: "✓",
        error: "✕",
        info: "ℹ",
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}` + (onClick ? " clickable" : "");
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;

    if (onClick) {
        toast.style.cursor = "pointer";
        toast.onclick = (e) => {
            e.stopPropagation();
            onClick();
            toast.classList.add("toast-out");
            setTimeout(() => toast.remove(), 300);
        };
    }

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.setAttribute('style', 'pointer-events: none;'); // Prevent clicks while fading
            toast.classList.add("toast-out");
            toast.addEventListener("animationend", () => toast.remove());
        }
    }, duration);
}

// ---------- Content Helpers ----------
function stripHtml(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

// ---------- Profanity Filter ----------
let BANNED_WORDS = new Set([...profanitiesEN, ...profanitiesFR].map(w => w.toLowerCase()));
const CUSTOM_BANNED_WORDS_REFS = new Map(); // word -> docId
const WHITELISTED_WORDS = new Set();
const WHITELIST_REFS = new Map(); // word -> docId

async function loadCustomBannedWords() {
    try {
        const qB = query(collection(db, "BannedWords"));
        const snapB = await getDocs(qB);
        snapB.forEach(d => {
            const word = d.data().word?.toLowerCase();
            if (word) {
                BANNED_WORDS.add(word);
                CUSTOM_BANNED_WORDS_REFS.set(word, d.id);
            }
        });

        const qW = query(collection(db, "WhitelistedWords"));
        const snapW = await getDocs(qW);
        snapW.forEach(d => {
            const word = d.data().word?.toLowerCase();
            if (word) {
                WHITELISTED_WORDS.add(word);
                WHITELIST_REFS.set(word, d.id);
            }
        });
        console.log(`✅ Mots bannis (${snapB.size}) et Liste blanche (${snapW.size}) chargés`);
    } catch (err) {
        console.error("Erreur chargement mots bannis/blancs:", err);
    }
}

async function addCustomBannedWord(word) {
    const w = word.toLowerCase().trim();
    if (!w) return;
    // If it was whitelisted, remove from whitelist first
    if (WHITELISTED_WORDS.has(w)) await removeFromWhitelist(w);
    
    if (BANNED_WORDS.has(w) && CUSTOM_BANNED_WORDS_REFS.has(w)) return;

    try {
        const docRef = await addDoc(collection(db, "BannedWords"), {
            word: w,
            createdAt: serverTimestamp()
        });
        BANNED_WORDS.add(w);
        CUSTOM_BANNED_WORDS_REFS.set(w, docRef.id);
        return docRef.id;
    } catch (err) {
        console.error("Erreur ajout mot banni:", err);
        throw err;
    }
}

async function deleteCustomBannedWord(word) {
    const w = word.toLowerCase().trim();
    const id = CUSTOM_BANNED_WORDS_REFS.get(w);
    if (!id) return;
    try {
        await deleteDoc(doc(db, "BannedWords", id));
        BANNED_WORDS.delete(w);
        CUSTOM_BANNED_WORDS_REFS.delete(w);
    } catch (err) {
        console.error("Erreur suppression mot banni:", err);
        throw err;
    }
}

async function addToWhitelist(word) {
    const w = word.toLowerCase().trim();
    if (WHITELISTED_WORDS.has(w)) return;
    try {
        const docRef = await addDoc(collection(db, "WhitelistedWords"), {
            word: w,
            createdAt: serverTimestamp()
        });
        WHITELISTED_WORDS.add(w);
        WHITELIST_REFS.set(w, docRef.id);
    } catch (err) {
        console.error("Erreur ajout liste blanche:", err);
        throw err;
    }
}

async function removeFromWhitelist(word) {
    const w = word.toLowerCase().trim();
    const id = WHITELIST_REFS.get(w);
    if (!id) return;
    try {
        await deleteDoc(doc(db, "WhitelistedWords", id));
        WHITELISTED_WORDS.delete(w);
        WHITELIST_REFS.delete(w);
    } catch (err) {
        console.error("Erreur suppression liste blanche:", err);
        throw err;
    }
}

function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    
    for (const word of BANNED_WORDS) {
        if (WHITELISTED_WORDS.has(word)) continue; // Bypass if whitelisted
        
        let index = lowerText.indexOf(word);
        while (index !== -1) {
            // Check if it's a whole word match (boundary check)
            const prevChar = index > 0 ? lowerText[index - 1] : ' ';
            const nextChar = index + word.length < lowerText.length ? lowerText[index + word.length] : ' ';
            
            // Boundary = whitespace or punctuation
            const isAtStart = /\s|[^\p{L}\p{N}]/u.test(prevChar);
            const isAtEnd = /\s|[^\p{L}\p{N}]/u.test(nextChar);
            
            if (isAtStart && isAtEnd) {
                // If wrapped in # (e.g. #word#), we allow it
                if (prevChar === '#' && nextChar === '#') {
                    // Bypass - continue searching for other occurrences
                } else {
                    return word; // Direct hit, not allowed
                }
            }
            
            index = lowerText.indexOf(word, index + 1);
        }
    }
    return null;
}

function stripProfanityHashes(text) {
    let cleaned = text;
    for (const word of BANNED_WORDS) {
        if (WHITELISTED_WORDS.has(word)) continue;
        
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`#(${escaped})#`, 'gi');
        cleaned = cleaned.replace(regex, '$1');
    }
    return cleaned;
}

function highlightProfanityInQuill(q, word) {
    if (!q) return;
    const text = q.getText();
    const lowerText = text.toLowerCase();
    const lowerWord = word.toLowerCase();
    let index = lowerText.indexOf(lowerWord);
    let found = false;
    
    while (index !== -1) {
        // Boundary check for Quill text
        const prevChar = index > 0 ? lowerText[index - 1] : ' ';
        const nextChar = index + word.length < lowerText.length ? lowerText[index + word.length] : ' ';
        const isAtStart = /\s|[^\p{L}\p{N}]/u.test(prevChar);
        const isAtEnd = /\s|[^\p{L}\p{N}]/u.test(nextChar);

        if (isAtStart && isAtEnd) {
            q.formatText(index, word.length, { 'background': 'rgba(255, 77, 77, 0.3)', 'color': '#ff4d4d' }, 'user');
            found = true;
            
            const currentIndex = index;
            setTimeout(() => {
                const formats = q.getFormat(currentIndex, word.length);
                if (formats.background === 'rgba(255, 77, 77, 0.3)') {
                    q.removeFormat(currentIndex, word.length, 'user');
                }
            }, 5000);
        }
        index = lowerText.indexOf(lowerWord, index + 1);
    }
    
    if (found) {
        const firstIndex = lowerText.indexOf(lowerWord);
        q.setSelection(firstIndex, word.length);
        q.root.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const wrapper = q.root.closest('.editor-wrapper');
        if (wrapper) {
            wrapper.classList.add('input-profanity');
            setTimeout(() => {
                // We don't remove it here because updateLiveProfanity will handle it 
                // but let's clear it if the text actually changed or after a while
            }, 5000);
        }
    }
}

function highlightProfanityInInput(input, word) {
    if (!input) return;
    input.focus();
    input.classList.add('profanity-highlight-error');
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => {
        input.classList.remove('profanity-highlight-error');
    }, 5000);
}

function showBanList() {
    const overlay = document.createElement("div");
    overlay.className = "admin-overlay";
    
    const sortedWords = Array.from(BANNED_WORDS).sort();
    
    overlay.innerHTML = `
        <div class="admin-header">
            <h2 class="admin-title">Banned Words (${sortedWords.length})</h2>
            <button class="btn btn-ghost" id="ban-list-close">${TRANSLATIONS[currentLang].adminClose}</button>
        </div>
        <div class="admin-content" style="max-height: 70vh; overflow-y: auto; padding-bottom: 40px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; padding: 20px;">
                ${sortedWords.map(word => `<span style="background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 4px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s; cursor: default;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">${word}</span>`).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    document.getElementById("ban-list-close").onclick = () => {
        overlay.remove();
        document.body.style.overflow = "";
    };
}

// ---------- Date Formatting ----------
function formatDate(date) {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(currentLang === "fr" ? "fr-FR" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}

// ---------- Navbar Scroll Effect ----------
function initNavbar() {
    const navbar = document.getElementById("navbar");
    const logo = document.querySelector(".nav-brand");
    const settingsBtn = document.getElementById("settings-btn");
    if (!navbar) return;

    const onScroll = () => {
        navbar.classList.toggle("scrolled", window.scrollY > 20);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Admin Panel Trigger
    let clickCount = 0;
    let lastClick = 0;
    if (logo) {
        logo.addEventListener("click", (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastClick < 500) {
                clickCount++;
            } else {
                clickCount = 1;
            }
            lastClick = now;

            if (clickCount >= 10) {
                clickCount = 0;
                logo.classList.add("logo-shake");
                setTimeout(() => logo.classList.remove("logo-shake"), 500);
                showAdminPanel();
            }
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener("click", showSettingsModal);
    }
}

// ---------- Image Preview ----------
function initImagePreview() {
    const input = document.getElementById("main-image");
    const preview = document.getElementById("main-image-preview");
    if (!input || !preview) return;

    input.addEventListener("input", () => {
        const url = input.value.trim();
        if (url) {
            const img = document.createElement("img");
            img.src = url;
            img.alt = "Aperçu";
            img.onerror = () => preview.classList.add("hidden");
            img.onload = () => {
                preview.innerHTML = "";
                preview.appendChild(img);
                preview.classList.remove("hidden");
            };
        } else {
            preview.innerHTML = "";
            preview.classList.add("hidden");
        }
    });
}

// ---------- Type Toggle ----------
function initTypeToggle() {
    const toggle = document.getElementById('type-toggle');
    if (!toggle) return;

    const btns = toggle.querySelectorAll('.type-toggle-btn');
    const imageFields = document.getElementById('image-fields');
    const labelTitle = document.getElementById('label-title');
    const labelContent = document.getElementById('label-content');
    const publishBtn = document.getElementById('publish-button');
    const titleInput = document.getElementById('title');

    btns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const nextType = btn.dataset.type;
            
            // Passcode protection for Note mode
            if (nextType === 'note' && !hasNoteAccess) {
                const granted = await showPasscodeModal();
                if (granted) {
                    hasNoteAccess = true;
                } else {
                    return; // Prevent switch
                }
            }

            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = nextType;

            // Add animation to the form
            const form = document.getElementById('article-form');
            if (form) {
                form.classList.remove('form-switch-anim');
                void form.offsetWidth; // Force reflow
                form.classList.add('form-switch-anim');
            }

            const t = TRANSLATIONS[currentLang];
            if (currentType === 'note') {
                imageFields?.classList.add('hidden');
                if (labelTitle) labelTitle.textContent = currentLang === 'fr' ? 'Titre de la note' : 'Note Title';
                if (labelContent) labelContent.textContent = currentLang === 'fr' ? 'Contenu de la note' : 'Note Content';
                if (publishBtn) publishBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    ${currentLang === 'fr' ? 'Publier la note' : 'Publish note'}
                `;
                if (titleInput) titleInput.placeholder = currentLang === 'fr' ? 'Ex: Rappel - Observer la pluie de météores...' : 'Ex: Reminder - Watch the meteor shower...';
                if (quill) quill.root.dataset.placeholder = currentLang === 'fr' ? 'Écrivez vos notes ici...' : 'Write your notes here...';
            } else {
                imageFields?.classList.remove('hidden');
                if (labelTitle) labelTitle.textContent = t.labelTitle;
                if (labelContent) labelContent.textContent = t.labelContent;
                if (publishBtn) publishBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    ${t.btnPublier}
                `;
                if (titleInput) titleInput.placeholder = t.placeholderTitle;
                if (quill) quill.root.dataset.placeholder = t.placeholderContent;
            }
        });
    });
}

// ---------- Article Card Builder ----------
function buildArticleCard(data, firestoreId) {
    const card = document.createElement("article");
    card.className = "article-card";
    if (firestoreId) card.dataset.id = firestoreId;

    // Store data for modal
    card._articleData = {
        title: data.title || "",
        text: data.text || "",
        main: data.main || null,
        video: data.video || null,
        extras: (data.extras || []).slice(0, 3),
        sources: data.sources || [],
        date: data.date || null,
        lang: data.lang || "fr",
        type: data.type || "article",
        author: data.author || null
    };

    const isNote = (data.type === 'note');
    if (isNote) card.classList.add('note-card');

    // Image or placeholder
    if (data.main) {
        const wrapper = document.createElement("div");
        wrapper.className = "card-image-wrapper";
        const img = document.createElement("img");
        img.className = "card-image";
        img.src = data.main;
        img.alt = data.title || "Image article";
        img.loading = "lazy";
        img.onerror = () => {
            wrapper.innerHTML = '<div class="card-placeholder">🌠</div>';
        };
        wrapper.appendChild(img);
        
        card.appendChild(wrapper);
    } else {
        const emojis = isNote 
            ? ["📝", "✏️", "📌", "💡", "🗒️"] 
            : ["🪐", "🌌", "⭐", "🔭", "🚀", "☄️", "🌙", "💫"];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        card.innerHTML += `<div class="card-placeholder">${emoji}</div>`;
    }

    // Card body
    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = data.title || "Sans titre";
    body.appendChild(title);

    const excerpt = document.createElement("p");
    excerpt.className = "card-excerpt";
    // Strip HTML for the card preview to avoid showing raw tags
    excerpt.textContent = stripHtml(data.text || "");
    body.appendChild(excerpt);

    const meta = document.createElement("div");
    meta.className = "card-meta";

    const date = document.createElement("span");
    date.className = "card-date";
    date.textContent = data.date ? formatDate(data.date) : formatDate(new Date());
    meta.appendChild(date);

    const tag = document.createElement("span");
    tag.className = "card-tag";
    tag.textContent = isNote ? "Note" : "Astronomie";
    meta.appendChild(tag);

    // Translation badge if viewing cross-lang
    if (data.lang && data.lang !== currentLang) {
        const transBadge = document.createElement("span");
        transBadge.className = "card-tag";
        transBadge.style.background = "rgba(108, 138, 255, 0.1)";
        transBadge.style.color = "var(--accent-blue)";
        transBadge.textContent = currentLang === 'en' ? "Translated" : "Traduit";
        meta.appendChild(transBadge);
    }

    body.appendChild(meta);

    if (data.author) {
        const signature = document.createElement("div");
        signature.className = "article-signature";
        signature.textContent = `- ${data.author} -`;
        body.appendChild(signature);
    }

    card.appendChild(body);

    // Stagger animation
    const index = document.querySelectorAll(".article-card").length;
    card.style.animationDelay = `${index * 0.08}s`;

    // Click → open modal
    card.addEventListener("click", () => {
        showArticleModal(card, card._articleData);
    });

    return card;
}

// ---------- Modal ----------
function showArticleModal(cardEl, data, autoEdit = false) {
    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    // Modal container
    const modal = document.createElement("div");
    modal.className = "modal-container";

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.setAttribute("aria-label", "Fermer");
    closeBtn.innerHTML = "✕";
    closeBtn.addEventListener("click", closeModal);
    modal.appendChild(closeBtn);

    // Title
    const h2 = document.createElement("h2");
    h2.className = "modal-title";
    h2.textContent = data.title || "Sans titre";
    modal.appendChild(h2);

    if (data.author) {
        const signature = document.createElement("div");
        signature.className = "article-signature";
        signature.style.marginTop = "-15px";
        signature.style.marginBottom = "20px";
        signature.textContent = `- ${data.author} -`;
        modal.appendChild(signature);
    }

    // Main media
    if (data.main) {
        const img = document.createElement("img");
        img.className = "modal-image";
        img.src = data.main;
        img.alt = data.title || "Image";
        img.onerror = () => (img.style.display = "none");
        modal.appendChild(img);
    }

    // Text (Render as HTML for rich text support)
    const text = document.createElement("div");
    text.className = "modal-text";
    text.innerHTML = data.text || "";
    modal.appendChild(text);

    // Sources Trigger
    if (data.sources && data.sources.length > 0) {
        const trigger = document.createElement("div");
        trigger.className = "article-sources-trigger";
        trigger.innerHTML = `<span>🔗</span> ${TRANSLATIONS[currentLang].btnSources} (${data.sources.length})`;
        trigger.onclick = () => showSourcesPopup(data.sources);
        modal.appendChild(trigger);
    }

    // Gallery
    if (data.extras && data.extras.length > 0) {
        const gallery = document.createElement("div");
        gallery.className = "modal-gallery";
        data.extras.forEach((src) => {
            if (!src) return;
            const img = document.createElement("img");
            img.src = src;
            img.alt = "Image supplémentaire";
            img.onerror = () => (img.style.display = "none");
            gallery.appendChild(img);
        });
        modal.appendChild(gallery);
    }

    // Footer with date + action buttons
    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const dateEl = document.createElement("span");
    dateEl.className = "modal-date";
    dateEl.textContent = data.date ? formatDate(data.date) : formatDate(new Date());
    footer.appendChild(dateEl);

    // Google Translate Link if lang mismatch
    if (data.lang && data.lang !== currentLang) {
        const transLink = document.createElement("a");
        transLink.className = "btn btn-ghost btn-sm";
        transLink.style.marginLeft = "15px";
        transLink.target = "_blank";
        const targetUrl = encodeURIComponent(window.location.href);
        transLink.href = `https://translate.google.com/translate?sl=${data.lang}&tl=${currentLang}&u=${targetUrl}`;
        transLink.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12M7 2h1"/><path d="M22 22l-5-10-5 10M14 18h6"/></svg>
            ${currentLang === 'en' ? 'Translate Content' : 'Traduire le contenu'}
        `;
        footer.appendChild(transLink);
    }

    const actionsRight = document.createElement("div");
    actionsRight.className = "modal-actions-right";
    actionsRight.style.display = "flex";
    actionsRight.style.gap = "10px";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-edit";
    editBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Modifier
    `;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        Supprimer
    `;

    // Edit Logic
    if (autoEdit) {
        setTimeout(() => enterEditMode(), 100);
        
        // Add actions to footer only in admin mode
        actionsRight.appendChild(editBtn);
        actionsRight.appendChild(deleteBtn);
        footer.appendChild(actionsRight);
    }

    editBtn.addEventListener("click", () => {
        enterEditMode();
    });

    function enterEditMode() {
        // Hide view elements
        h2.style.display = "none";
        if (modal.querySelector(".modal-image")) modal.querySelector(".modal-image").style.display = "none";
        text.style.display = "none";
        if (modal.querySelector(".modal-gallery")) modal.querySelector(".modal-gallery").style.display = "none";
        footer.style.display = "none";

        // Create Form
        const editForm = document.createElement("div");
        editForm.className = "modal-edit-form";
        
        let sourcesHtml = '';
        if (data.sources && data.sources.length > 0) {
            sourcesHtml = `
                <div class="form-group">
                    <label class="form-label">${TRANSLATIONS[currentLang].labelSources}</label>
                    <div id="edit-sources-container" class="sources-container">
                        ${data.sources.map((s, i) => `
                            <div class="source-row">
                                <input type="text" class="form-input source-name" placeholder="${TRANSLATIONS[currentLang].placeholderSourceName}" value="${s.name}">
                                <input type="url" class="form-input source-url" placeholder="${TRANSLATIONS[currentLang].placeholderSourceUrl}" value="${s.url}">
                                <button type="button" class="btn-remove-source">✕</button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" id="edit-add-source-btn" class="btn btn-ghost btn-sm">+ Source</button>
                </div>
            `;
        }

        editForm.innerHTML = `
            <div class="form-group">
                <label class="form-label">Titre de l'article</label>
                <input type="text" id="edit-title" class="form-input" value="${data.title.replace(/"/g, '&quot;')}">
            </div>
            ${sourcesHtml}
            <div class="form-group">
                <label class="form-label">Contenu</label>
                <div id="edit-editor-wrapper" class="editor-wrapper">
                    <div id="edit-editor" style="height: 250px;"></div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Image principale (URL)</label>
                <input type="text" id="edit-image" class="form-input" value="${data.main || ""}">
            </div>
            <div class="modal-edit-grid">
                <div class="form-group">
                    <label class="form-label">Image 1</label>
                    <input type="text" id="edit-extra-1" class="form-input" value="${data.extras[0] || ""}">
                </div>
                <div class="form-group">
                    <label class="form-label">Image 2</label>
                    <input type="text" id="edit-extra-2" class="form-input" value="${data.extras[1] || ""}">
                </div>
                <div class="form-group">
                    <label class="form-label">Image 3</label>
                    <input type="text" id="edit-extra-3" class="form-input" value="${data.extras[2] || ""}">
                </div>
            </div>
            <div class="edit-actions">
                <button id="edit-cancel" class="btn btn-ghost">Annuler</button>
                <button id="edit-save" class="btn btn-primary">Enregistrer les modifications</button>
            </div>
        `;

        modal.appendChild(editForm);

        // Init Quill for edit mode
        const editQuill = new Quill('#edit-editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'header': [1, 2, false] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'color': [] }],
                    ['link', 'clean']
                ]
            }
        });
        editQuill.root.innerHTML = data.text;

        // Live profanity checking for edit mode
        editQuill.on('text-change', (delta, oldDelta, source) => {
            if (source === 'user') updateLiveProfanity(editQuill);
        });
        const editTitleEl = editForm.querySelector("#edit-title");
        if (editTitleEl) {
            editTitleEl.addEventListener('input', () => {
                const hasProfanity = containsProfanity(editTitleEl.value);
                editTitleEl.classList.toggle('input-profanity', !!hasProfanity);
            });
            // Initial check
            if (containsProfanity(editTitleEl.value)) editTitleEl.classList.add('input-profanity');
        }
        // Initial check for quill
        setTimeout(() => updateLiveProfanity(editQuill), 100);

        // Cancel
        editForm.querySelector("#edit-cancel").addEventListener("click", () => {
            editForm.remove();
            h2.style.display = "";
            if (modal.querySelector(".modal-image") && data.main) modal.querySelector(".modal-image").style.display = "";
            text.style.display = "";
            if (modal.querySelector(".modal-gallery") && data.extras.length > 0) modal.querySelector(".modal-gallery").style.display = "";
            footer.style.display = "";
        });

        // Save
        const editSaveBtn = editForm.querySelector("#edit-save");
        const editAddSourceBtn = editForm.querySelector("#edit-add-source-btn");

        if (editAddSourceBtn) {
            editAddSourceBtn.onclick = () => {
                const container = editForm.querySelector("#edit-sources-container");
                const row = document.createElement('div');
                row.className = 'source-row';
                row.innerHTML = `
                    <input type="text" class="form-input source-name" placeholder="${TRANSLATIONS[currentLang].placeholderSourceName}" value="">
                    <input type="url" class="form-input source-url" placeholder="${TRANSLATIONS[currentLang].placeholderSourceUrl}" value="">
                    <button type="button" class="btn-remove-source">✕</button>
                `;
                row.querySelector('.btn-remove-source').onclick = () => row.remove();
                container.appendChild(row);
            };
            
            // Init remove buttons for existing sources
            editForm.querySelectorAll('.btn-remove-source').forEach(btn => {
                btn.onclick = () => btn.closest('.source-row').remove();
            });
        }

        editSaveBtn.addEventListener("click", async () => {
            const editTitleEl = editForm.querySelector("#edit-title");
            const newTitle = editTitleEl.value.trim();
            const newText = editQuill.root.innerHTML;

            if (!newTitle) {
                showToast(currentLang === 'fr' ? "Veuillez ajouter un titre." : "Please add a title.", "error");
                return;
            }
            const plainText = stripHtml(newText).trim();
            if (!plainText) {
                showToast(currentLang === 'fr' ? "Veuillez ajouter du contenu." : "Please add some content.", "error");
                return;
            }

            // Profanity check - Title
            const titleBadWord = containsProfanity(newTitle);
            if (titleBadWord) {
                showToast(
                    currentLang === 'fr' ? `Gros mot détecté dans le titre. Cliquez pour voir.` : `Profanity detected in title. Click to see.`,
                    "error",
                    5000,
                    () => highlightProfanityInInput(editTitleEl, titleBadWord)
                );
                return;
            }

            // Profanity check - Content
            const contentBadWord = containsProfanity(plainText);
            if (contentBadWord) {
                showToast(
                    currentLang === 'fr' ? `Gros mot détecté dans le contenu. Cliquez pour voir.` : `Profanity detected in content. Click to see.`,
                    "error",
                    5000,
                    () => highlightProfanityInQuill(editQuill, contentBadWord)
                );
                return;
            }

            // Clean hashes before saving
            const finalTitle = stripProfanityHashes(newTitle);
            const finalContent = stripProfanityHashes(newText);
            const newMain = editForm.querySelector("#edit-image").value.trim() || null;
            const newExtras = [
                editForm.querySelector("#edit-extra-1").value.trim(),
                editForm.querySelector("#edit-extra-2").value.trim(),
                editForm.querySelector("#edit-extra-3").value.trim()
            ].filter(Boolean);

            const newSources = [];
            editForm.querySelectorAll('.source-row').forEach(row => {
                const name = row.querySelector('.source-name').value.trim();
                const url = row.querySelector('.source-url').value.trim();
                if (name || url) {
                    newSources.push({ name: name || url, url });
                }
            });

            if (!newTitle) {
                showToast("Le titre est obligatoire", "error");
                return;
            }

            const saveBtn = editForm.querySelector("#edit-save");
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="btn-spinner"></span> Enregistrement...';

            const id = cardEl?.dataset?.id;
            const localId = cardEl?.dataset?.localId;

            try {
                if (id) {
                    await updateDoc(doc(db, "Article", id), {
                        titre: finalTitle,
                        contenu: finalContent,
                        main: newMain,
                        main: newMain,
                        extras: newExtras,
                        sources: newSources
                    });
                } else if (localId) {
                    // Update local storage
                    const arr = loadLocalArticles();
                    const idx = arr.findIndex(a => a._localId === localId);
                    if (idx !== -1) {
                        arr[idx].titre = finalTitle;
                        arr[idx].contenu = finalContent;
                        arr[idx].main = newMain;
                        arr[idx].extras = newExtras;
                        arr[idx].sources = newSources;
                        saveLocalArticles(arr);
                    }
                }

                // Update UI in background
                data.title = finalTitle;
                data.text = finalContent;
                data.main = newMain;
                data.extras = newExtras;
                data.sources = newSources;

                // Update Card UI
                if (cardEl) {
                    const cardTitle = cardEl.querySelector(".card-title");
                    if (cardTitle) cardTitle.textContent = finalTitle;
                    const cardExcerpt = cardEl.querySelector(".card-excerpt");
                    if (cardExcerpt) cardExcerpt.textContent = stripHtml(finalContent);
                    
                    const oldImg = cardEl.querySelector(".card-image");
                    const wrapper = cardEl.querySelector(".card-image-wrapper");
                    const placeholder = cardEl.querySelector(".card-placeholder");

                    if (newMain) {
                        if (oldImg) {
                            oldImg.src = newMain;
                        } else {
                            if (placeholder) placeholder.remove();
                            const newWrapper = document.createElement("div");
                            newWrapper.className = "card-image-wrapper";
                            const img = document.createElement("img");
                            img.className = "card-image";
                            img.src = newMain;
                            newWrapper.appendChild(img);
                            cardEl.prepend(newWrapper);
                        }
                    } else {
                        if (wrapper) wrapper.remove();
                        if (!cardEl.querySelector(".card-placeholder")) {
                            cardEl.innerHTML = `<div class="card-placeholder">🌠</div>` + cardEl.innerHTML;
                        }
                    }
                }

                showToast("Article mis à jour !", "success");
                closeModal();
            } catch (err) {
                console.error("Erreur update", err);
                showToast("Échec de la mise à jour", "error");
                saveBtn.disabled = false;
                saveBtn.innerHTML = "Enregistrer les modifications";
            }
        });
    }

    deleteBtn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        if (!(await showConfirmModal(currentLang === 'fr' ? "Supprimer cet article définitivement ?" : "Delete this article permanently?"))) return;

        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="btn-spinner"></span> Suppression...';

        try {
            const id = cardEl?.dataset?.id;
            const localId = cardEl?.dataset?.localId;
            if (id) {
                await deleteDoc(doc(db, "Article", id));
                removeLocalArticleById(id);
            }
            if (localId) {
                removeLocalArticleById(localId);
            }
        } catch (err) {
            console.error("Erreur suppression Firestore", err);
        }

        if (cardEl?.parentNode) {
            cardEl.style.transition = "opacity 0.3s, transform 0.3s";
            cardEl.style.opacity = "0";
            cardEl.style.transform = "scale(0.95)";
            setTimeout(() => {
                cardEl.remove();
                updateEmptyState();
            }, 300);
        }

        closeModal();
        showToast("Article supprimé", "success");
    });

    // Public view: edit/delete are hidden by default (only shown if autoEdit is true above)
    
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    closeBtn.focus();

    function closeModal() {
        document.body.style.overflow = "";
        if (overlay?.parentNode) overlay.remove();
        document.removeEventListener("keydown", onKey);
    }

    function onKey(e) {
        if (e.key === "Escape") closeModal();
    }

    document.addEventListener("keydown", onKey);
    overlay.addEventListener("click", (ev) => {
        if (ev.target === overlay) closeModal();
    });
}

/**
 * EXPORTED Logic for Edit Mode (Used by Admin Panel)
 */
function openArticleEditor(cardEl, data, modalToClose) {
    if (modalToClose) modalToClose();
    showArticleModal(cardEl, data);
    // This is a bit tricky since showArticleModal doesn't return the modal
    // I will refactor to have enterEditMode accessible
}

// ---------- Settings Modal ----------
function showSettingsModal() {
    const t = TRANSLATIONS[currentLang];
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const modal = document.createElement("div");
    modal.className = "modal-container";
    modal.style.maxWidth = "400px";

    modal.innerHTML = `
        <button class="modal-close">✕</button>
        <h2 class="modal-title">${t.settingsTitle}</h2>
        <div class="settings-list">
            <div class="form-group">
                <label class="form-label">${t.settingsLang}</label>
                <div class="lang-switch">
                    <button class="lang-btn ${currentLang === 'fr' ? 'active' : ''}" data-lang="fr">${t.langFR}</button>
                    <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">${t.langEN}</button>
                </div>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector(".modal-close").onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    modal.querySelectorAll(".lang-btn").forEach(btn => {
        btn.onclick = () => {
            const lang = btn.dataset.lang;
            if (lang === currentLang) return;
            currentLang = lang;
            localStorage.setItem("cosmos_lang", lang);
            translateUI();
            overlay.remove();
            loadArticles();
            showToast(currentLang === 'fr' ? "Langue changée : Français" : "Language changed: English", "info");
        };
    });
}

// ---------- Admin Panel ----------
async function showAdminPanel() {
    const t = TRANSLATIONS[currentLang];
    const overlay = document.createElement("div");
    overlay.className = "admin-overlay";

    overlay.innerHTML = `
        <div class="admin-header">
            <h2 class="admin-title">${t.adminTitle}</h2>
            <button class="btn btn-ghost" id="admin-close">${t.adminClose}</button>
        </div>
        <div class="admin-tabs">
            <button class="admin-tab active" id="tab-articles">${currentLang === 'fr' ? 'Articles' : 'Articles'}</button>
            <button class="admin-tab" id="tab-banned">${currentLang === 'fr' ? 'Mots Interdits' : 'Banned Words'}</button>
            <button class="admin-tab" id="tab-arxiv">${currentLang === 'fr' ? 'Bibliothèque ArXiv' : 'ArXiv Library'}</button>
        </div>
        <div class="admin-content" id="admin-main-content">
            <div class="btn-spinner" style="margin: 40px auto; display: block;"></div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const contentArea = overlay.querySelector("#admin-main-content");
    const tabArticles = overlay.querySelector("#tab-articles");
    const tabBanned = overlay.querySelector("#tab-banned");
    const tabArxiv = overlay.querySelector("#tab-arxiv");

    const closeAdmin = () => {
        overlay.remove();
        document.body.style.overflow = "";
    };
    overlay.querySelector("#admin-close").onclick = closeAdmin;

    tabArticles.onclick = () => renderArticles();
    tabBanned.onclick = () => renderBannedWords();
    tabArxiv.onclick = () => renderArxivLibrary(0);

    const LIB_CACHE = new Map(); // Simple session cache for pagination
    let currentArxivSort = "descending";
    let currentArxivSearch = "";
    let arxivSearchTimeout = null;

    async function renderArxivLibrary(offset = 0) {
        tabArticles.classList.remove("active");
        tabBanned.classList.remove("active");
        tabArxiv.classList.add("active");

        contentArea.innerHTML = `
            <div class="admin-filters" style="display: flex; flex-direction: column; gap: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: start; width: 100%;">
                    <div style="flex: 1;">
                        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 4px;">
                            ${currentLang === 'fr' ? 'Bibliothèque ArXiv' : 'ArXiv Library'}
                        </div>
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.4);">
                            ${currentLang === 'fr' ? 'Parcourez et planifiez pour demain' : 'Browse and schedule for tomorrow'}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 0.8rem; opacity: 0.6;">${currentLang === 'fr' ? 'Tri :' : 'Sort :'}</span>
                        <select class="admin-select" id="arxiv-sort-select">
                            <option value="descending" ${currentArxivSort === 'descending' ? 'selected' : ''}>${currentLang === 'fr' ? 'Plus récents' : 'Newest'}</option>
                            <option value="ascending" ${currentArxivSort === 'ascending' ? 'selected' : ''}>${currentLang === 'fr' ? 'Plus anciens' : 'Oldest'}</option>
                        </select>
                    </div>
                </div>
                <div class="admin-search-container" style="margin-bottom: 0;">
                    <input type="text" id="arxiv-search-input" class="admin-search-input" placeholder="${currentLang === 'fr' ? 'Rechercher un titre sur ArXiv...' : 'Search title on ArXiv...'}" value="${currentArxivSearch}">
                </div>
            </div>
            <div class="admin-list" id="admin-arxiv-list">
                <div class="btn-spinner" style="margin: 40px auto; display: block;"></div>
            </div>
            <div class="admin-pagination" id="arxiv-pagination" style="display: none;">
                <button class="btn btn-ghost btn-sm" id="prev-arxiv" ${offset === 0 ? 'disabled' : ''}>${currentLang === 'fr' ? ' Précédent' : ' Previous'}</button>
                <span class="page-info">${currentLang === 'fr' ? 'Page' : 'Page'} ${Math.floor(offset / 20) + 1}</span>
                <button class="btn btn-ghost btn-sm" id="next-arxiv">${currentLang === 'fr' ? 'Suivant ' : 'Next '}</button>
            </div>
        `;

        const list = contentArea.querySelector("#admin-arxiv-list");
        const pagination = contentArea.querySelector("#arxiv-pagination");
        const sortSelect = contentArea.querySelector("#arxiv-sort-select");
        const searchInput = contentArea.querySelector("#arxiv-search-input");

        sortSelect.onchange = (e) => {
            currentArxivSort = e.target.value;
            renderArxivLibrary(0); // Reset to page 1 on sort change
        };

        searchInput.oninput = (e) => {
            clearTimeout(arxivSearchTimeout);
            arxivSearchTimeout = setTimeout(() => {
                currentArxivSearch = e.target.value.trim();
                renderArxivLibrary(0); // Reset to page 1 on search
            }, 600); // 600ms debounce
        };

        try {
            let allArticles = null;
            const safeSearch = encodeURIComponent(currentArxivSearch.replace(/"/g, ''));
            const queryPart = currentArxivSearch ? `+AND+ti:%22${safeSearch}%22` : "";
            const cacheKey = `${currentArxivSort}_search_${safeSearch}_p_${offset}`;
            const cached = LIB_CACHE.get(cacheKey);
            
            // Cache valid for 10 minutes
            if (cached && (Date.now() - cached.time < 10 * 60 * 1000)) {
                allArticles = cached.data;
            } else {
                const paginatedRawUrl = `https://export.arxiv.org/api/query?search_query=cat:astro-ph${queryPart}&sortBy=submittedDate&sortOrder=${currentArxivSort}&start=${offset}&max_results=20`;
                const xmlText = await fetchViaProxy(paginatedRawUrl);
                if (xmlText) {
                    allArticles = parseArxivXml(xmlText);
                    LIB_CACHE.set(cacheKey, { data: allArticles, time: Date.now() });
                }
            }

            if (!allArticles || allArticles.length === 0) {
                list.innerHTML = `<div style="color: #ff4d4d; text-align: center; padding: 20px;">${currentLang === 'fr' ? 'Aucun article trouvé. Essayez un autre filtre.' : 'No articles found. Try another filter.'}</div>`;
                return;
            }

            // Check scheduled
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const q = query(collection(db, "ArXivPicks"), where("scheduledFor", "==", tomorrowStr), limit(1));
            const pickSnap = await getDocs(q);
            const scheduledId = pickSnap.empty ? null : pickSnap.docs[0].data().id;

            list.innerHTML = "";
            allArticles.forEach(entry => {
                const item = document.createElement("div");
                item.className = "admin-item";
                
                const isScheduled = (entry.id === scheduledId);
                const authorsStr = entry.authors?.slice(0, 2).join(", ") + (entry.authors?.length > 2 ? " et al." : "");
                const pubDate = formatDate(entry.published);

                item.innerHTML = `
                    <div class="admin-item-info" style="flex: 1;">
                        <div class="admin-item-title" style="margin-bottom: 2px;">${entry.title}</div>
                        <div class="admin-item-meta">${authorsStr} • <span style="opacity: 0.8;">${pubDate}</span></div>
                    </div>
                    <div class="admin-item-actions">
                        ${isScheduled ? `<span class="scheduled-badge">DÉJÀ CHOISI</span>` : ""}
                        <button class="btn-select-next" ${isScheduled ? 'disabled' : ''}>
                            ${currentLang === 'fr' ? 'Choisir pour demain' : 'Select for tomorrow'}
                        </button>
                    </div>
                `;

                const selectBtn = item.querySelector(".btn-select-next");
                selectBtn.onclick = async () => {
                    selectBtn.disabled = true;
                    selectBtn.innerHTML = '<span class="btn-spinner"></span>';
                    try {
                        const existingPicks = await getDocs(q);
                        for (const d of existingPicks.docs) await deleteDoc(doc(db, "ArXivPicks", d.id));
                        await addDoc(collection(db, "ArXivPicks"), { ...entry, scheduledFor: tomorrowStr, createdAt: serverTimestamp() });
                        showToast(TRANSLATIONS[currentLang].toastArxivSelected || "Sélectionné !", "success");
                        renderArxivLibrary(offset);
                    } catch (err) {
                        showToast("Erreur", "error");
                        renderArxivLibrary(offset);
                    }
                };
                list.appendChild(item);
            });

            // Setup pagination buttons
            pagination.style.display = "flex";
            pagination.querySelector("#prev-arxiv").onclick = () => renderArxivLibrary(Math.max(0, offset - 20));
            pagination.querySelector("#next-arxiv").onclick = () => renderArxivLibrary(offset + 20);

            // Background prefetch next page for instant navigation
            const safeSearch2 = encodeURIComponent(currentArxivSearch.replace(/"/g, ''));
            const queryPart2 = currentArxivSearch ? `+AND+ti:%22${safeSearch2}%22` : "";
            const nextCacheKey = `${currentArxivSort}_search_${safeSearch2}_p_${offset + 20}`;
            
            if (!LIB_CACHE.has(nextCacheKey)) {
                const nextUrl = `https://export.arxiv.org/api/query?search_query=cat:astro-ph${queryPart2}&sortBy=submittedDate&sortOrder=${currentArxivSort}&start=${offset + 20}&max_results=20`;
                fetchViaProxy(nextUrl).then(xml => {
                    if (xml) LIB_CACHE.set(nextCacheKey, { data: parseArxivXml(xml), time: Date.now() });
                }).catch(() => {});
            }

        } catch (err) {
            list.innerHTML = `<div style="color: #ff4d4d; text-align: center; padding: 20px;">Erreur lors du chargement.</div>`;
        }
    }

    async function renderArticles() {
        tabArticles.classList.add("active");
        tabBanned.classList.remove("active");
        contentArea.innerHTML = `
            <div class="admin-list" id="admin-article-list">
                <div class="btn-spinner"></div>
            </div>
        `;
        const list = contentArea.querySelector("#admin-article-list");

        try {
            const q = query(collection(db, "Article"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            list.innerHTML = "";
            adminArticlesList = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));

            if (adminArticlesList.length === 0) {
                list.innerHTML = `<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.3);">${currentLang === 'fr' ? 'Aucun article trouvé.' : 'No articles found.'}</div>`;
                return;
            }

            adminArticlesList.forEach(articleObj => {
                const { data, id } = articleObj;
                const item = document.createElement("div");
                item.className = "admin-item" + (data.type === 'note' ? ' admin-note' : '');
                
                const createdAt = data.createdAt?.toDate?.() || new Date();
                const typeLabel = data.type === 'note' ? '<span class="admin-note-badge">NOTE</span>' : '';

                item.innerHTML = `
                    <div class="admin-item-info">
                        <div class="admin-item-title">${data.titre || data.title}${typeLabel}</div>
                        <div class="admin-item-meta">${formatDate(createdAt)} | Lang: ${(data.lang || 'fr').toUpperCase()}</div>
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn btn-edit btn-sm" data-id="${id}">${TRANSLATIONS[currentLang].btnModifier || 'Modifier'}</button>
                        <button class="btn btn-danger btn-sm" data-id="${id}">${TRANSLATIONS[currentLang].btnSupprimer || 'Supprimer'}</button>
                    </div>
                `;

                item.querySelector(".btn-edit").onclick = () => {
                    const dummyCard = document.createElement("div");
                    dummyCard.dataset.id = id;
                    showArticleModal(dummyCard, {
                        title: data.titre || data.title || "",
                        text: data.contenu || data.content || "",
                        main: data.main || null,
                        extras: data.extras || [],
                        date: createdAt,
                        lang: data.lang || "fr",
                        type: data.type || "article"
                    }, true);
                };

                item.querySelector(".btn-danger").onclick = async () => {
                    if (await showConfirmModal(currentLang === 'fr' ? "Supprimer définitivement cet élément ?" : "Delete this item permanently?")) {
                        try {
                            await deleteDoc(doc(db, "Article", id));
                            adminArticlesList = adminArticlesList.filter(a => a.id !== id);
                            item.remove();
                            showToast(TRANSLATIONS[currentLang].toastSupprime || "Supprimé", "success");
                            loadArticles(); 
                        } catch (e) {
                            showToast("Error", "error");
                        }
                    }
                };
                list.appendChild(item);
            });
        } catch (err) {
            list.innerHTML = `<div style="color: #ff4d4d; text-align: center; padding: 20px;">Erreur lors du chargement des articles.</div>`;
        }
    }

    async function renderBannedWords() {
        tabArticles.classList.remove("active");
        tabBanned.classList.add("active");
        contentArea.innerHTML = `
            <div class="banned-manager-header" style="flex-direction: column; gap: 8px;">
                <div style="display: flex; gap: 8px; width: 100%;">
                    <input type="text" id="banned-search" class="form-input" placeholder="${currentLang === 'fr' ? 'Rechercher ou ajouter un mot...' : 'Search or add a word...'}" style="flex: 1;">
                    <button id="add-banned-btn" class="btn btn-primary" style="min-width: 100px;">${currentLang === 'fr' ? 'Ajouter' : 'Add'}</button>
                </div>
                <div id="search-status" style="font-size: 0.85rem; color: rgba(255,255,255,0.5); padding-left: 4px;"></div>
            </div>
            <div class="admin-list" id="admin-banned-list"></div>
        `;
        const list = contentArea.querySelector("#admin-banned-list");
        const input = contentArea.querySelector("#banned-search");
        const addBtn = contentArea.querySelector("#add-banned-btn");
        const status = contentArea.querySelector("#search-status");

        const updateList = () => {
            const query = input.value.trim().toLowerCase();
            list.innerHTML = "";
            
            if (!query) {
                status.textContent = currentLang === 'fr' ? "Affichage des mots personnalisés" : "Showing custom words";
                const customWords = Array.from(CUSTOM_BANNED_WORDS_REFS.keys()).sort();
                if (customWords.length === 0) {
                    list.innerHTML = `<div style="text-align: center; color: rgba(255,255,255,0.3); padding: 40px;">${currentLang === 'fr' ? 'Aucun mot banni personnalisé.' : 'No custom banned words.'}</div>`;
                    return;
                }
                customWords.forEach(word => createBannedItem(word, list, true));
            } else {
                // Search in ALL banned words (default + custom)
                const results = Array.from(BANNED_WORDS).filter(w => w.includes(query)).slice(0, 50);
                status.textContent = `${results.length > 0 ? results.length : 0} ${currentLang === 'fr' ? 'résultats correspondants' : 'results found'}`;
                
                results.forEach(word => {
                    const isCustom = CUSTOM_BANNED_WORDS_REFS.has(word);
                    createBannedItem(word, list, isCustom);
                });
            }
        };

        const createBannedItem = (word, container, isCustom) => {
            const item = document.createElement("div");
            item.className = "banned-word-item";
            
            const isWhitelisted = WHITELISTED_WORDS.has(word);
            const wordStyle = isWhitelisted ? 'text-decoration: line-through; opacity: 0.5; color: #fff;' : '';
            const actionText = isWhitelisted ? (currentLang === 'fr' ? 'Bloquer' : 'Block') : (currentLang === 'fr' ? 'Autoriser' : 'Allow');
            const actionColor = isWhitelisted ? '#ff9f43' : '#4dff88';

            item.innerHTML = `
                <span class="banned-word-text" style="${wordStyle}">${word} ${!isCustom ? '<small style="opacity:0.5; font-size:0.7em;">(par défaut)</small>' : ''}</span>
                <div style="display: flex; gap: 8px;">
                    ${!isCustom ? `
                        <button class="btn btn-ghost btn-sm btn-whitelist" style="color: ${actionColor}; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.1);">${actionText}</button>
                    ` : `
                        <button class="btn btn-ghost btn-sm btn-delete" style="color: #ff4d4d;">✕</button>
                    `}
                </div>
            `;

            if (isCustom) {
                item.querySelector(".btn-delete").onclick = async () => {
                    if (!(await showConfirmModal(currentLang === 'fr' ? `Supprimer "${word}" définitivement ?` : `Delete "${word}" permanently?`))) return;
                    await deleteCustomBannedWord(word);
                    item.remove();
                    showToast(`"${word}" supprimé`, "info");
                };
            } else {
                item.querySelector(".btn-whitelist").onclick = async () => {
                    if (isWhitelisted) {
                        await removeFromWhitelist(word);
                        showToast(`"${word}" re-bloqué`, "info");
                    } else {
                        await addToWhitelist(word);
                        showToast(`"${word}" autorisé`, "success");
                    }
                    updateList();
                };
            }
            container.appendChild(item);
        };

        input.oninput = updateList;
        addBtn.onclick = async () => {
            const val = input.value.trim().toLowerCase();
            if (!val) return;
            addBtn.disabled = true;
            try {
                await addCustomBannedWord(val);
                input.value = "";
                updateList();
                showToast(`"${val}" ajouté`, "success");
            } catch (err) {
                showToast("Erreur", "error");
            } finally {
                addBtn.disabled = false;
            }
        };

        updateList();
    }

    tabArticles.onclick = renderArticles;
    tabBanned.onclick = renderBannedWords;

    // Initial view
    renderArticles();
}

// ---------- UI State ----------
function updateEmptyState() {
    const container = document.getElementById("articles-container");
    const empty = document.getElementById("articles-empty");
    const loading = document.getElementById("articles-loading");

    if (loading) loading.classList.add("hidden");

    if (!container || !empty) return;
    const hasArticles = container.children.length > 0;
    empty.classList.toggle("hidden", hasArticles);
}

// ---------- Load Articles ----------
async function loadArticles() {
    const container = document.getElementById("articles-container");
    const loading = document.getElementById("articles-loading");
    if (!container) return;

    if (loading) loading.classList.remove("hidden");
    try {
        const q = query(collection(db, "Article"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        if (loading) loading.classList.add("hidden");

        const articles = [];
        snapshot.forEach((d) => {
            const data = d.data();
            articles.push({ id: d.id, ...data });
        });

        allLoadedArticles = articles;
        applyPublicSearch();

        // One-time setup for search listener if not already done
        const searchInput = document.getElementById("public-search");
        if (searchInput && !searchInput.dataset.initialized) {
            searchInput.oninput = () => applyPublicSearch();
            searchInput.dataset.initialized = "true";
        }

        console.log("✅ Articles chargés depuis Firebase");
    } catch (err) {
        console.warn("Erreur Firebase, fallback localStorage", err);
        if (loading) loading.classList.add("hidden");
        const local = loadLocalArticles();
        allLoadedArticles = local;
        applyPublicSearch();
    }
}

function applyPublicSearch() {
    const container = document.getElementById("articles-container");
    const queryStr = document.getElementById("public-search")?.value.toLowerCase().trim() || "";
    if (!container) return;

    container.innerHTML = "";
    
    const filtered = allLoadedArticles.filter(a => {
        const title = (a.titre || a.title || "").toLowerCase();
        const articleLang = a.lang || null;
        // Search match AND Visibility Logic (language)
        const matchesSearch = title.includes(queryStr);
        const matchesLang = !articleLang || articleLang === currentLang;
        return matchesSearch && matchesLang;
    });

    if (filtered.length === 0) {
        updateEmptyState(); // Will show empty state if nothing matches
        return;
    }

    filtered.forEach((data) => {
        const createdAt = data.createdAt?.toDate?.() || data.createdAt || null;
        const node = buildArticleCard(
            {
                title: data.titre || data.title || "",
                text: data.contenu || data.content || "",
                main: data.main || null,
                extras: data.extras || [],
                date: createdAt,
                lang: data.lang || "fr",
                type: data.type || "article",
                authorPseudo: data.authorPseudo || null,
                sources: data.sources || []
            },
            data.id
        );
        if (data._localId) node.dataset.localId = data._localId;
        container.appendChild(node);
    });

    updateEmptyState();
}

// ---------- Publish Article ----------
async function publishArticle() {
    const titleEl = document.getElementById("title");
    const authorEl = document.getElementById("author-name");
    const contentEl = document.getElementById("content");
    const mainImageEl = document.getElementById("main-image");
    const publishBtn = document.getElementById("publish-button");

    const title = titleEl?.value.trim() || "";
    const author = authorEl?.value.trim() || null;
    const text = quill ? quill.root.innerHTML : "";
    let mainImage = document.getElementById("main-image")?.value.trim() || null;

    if (!title) {
        showToast(currentLang === 'fr' ? "Veuillez ajouter un titre." : "Please add a title.", "error");
        return;
    }

    // Strip HTML to check if content is actually empty (Quill might return <p><br></p>)
    const plainText = stripHtml(text).trim();
    if (!plainText) {
        showToast(currentLang === 'fr' ? "Veuillez ajouter du contenu." : "Please add some content.", "error");
        return;
    }

    // Profanity check - Title
    const titleBadWord = containsProfanity(title);
    if (titleBadWord) {
        showToast(
            currentLang === 'fr' ? `Gros mot détecté dans le titre. Cliquez pour voir.` : `Profanity detected in title. Click to see.`,
            "error",
            5000,
            () => highlightProfanityInInput(titleEl, titleBadWord)
        );
        return;
    }

    // Profanity check - Content
    const contentBadWord = containsProfanity(plainText);
    if (contentBadWord) {
        showToast(
            currentLang === 'fr' ? `Gros mot détecté dans le contenu. Cliquez pour voir.` : `Profanity detected in content. Click to see.`,
            "error",
            5000,
            () => highlightProfanityInQuill(quill, contentBadWord)
        );
        return;
    }

    // Clean hashes before saving
    const finalTitle = stripProfanityHashes(title);
    const finalContent = stripProfanityHashes(text);

    const extras = [];
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById(`additional-image-${i}`);
        const val = el?.value.trim();
        if (val) extras.push(val);
    }

    const sources = getSourcesData();

    // Loading state on button
    const originalHTML = publishBtn.innerHTML;
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<span class="btn-spinner"></span> Envoi...';

    try {
        // Handle Media Upload
        if (selectedMediaFile) {
            try {
                mainImage = await uploadMedia(selectedMediaFile);
            } catch (err) {
                console.error("Upload error:", err);
                showToast("Erreur lors de l'envoi du média", "error");
                return; // Will hit finally
            }
        }

        const container = document.getElementById("articles-container");
        let node;

        try {
            const docRef = await addDoc(collection(db, "Article"), {
                titre: finalTitle,
                contenu: finalContent,
                main: mainImage,
                extras: currentType === 'note' ? [] : extras,
                type: currentType,
                lang: currentLang,
                author: author,
                sources: sources,
                createdAt: serverTimestamp(),
            });

            node = buildArticleCard(
                { 
                    title: finalTitle, 
                    text: finalContent, 
                    main: mainImage, 
                    author: author,
                    sources: sources,
                    extras: currentType === 'note' ? [] : extras, 
                    date: new Date(), 
                    type: currentType 
                },
                docRef.id
            );

            showToast(currentType === 'note' 
                ? (currentLang === 'fr' ? 'Note publiée !' : 'Note published!') 
                : (currentLang === 'fr' ? 'Article publié avec succès !' : 'Article published!'), "success");
        } catch (err) {
            console.warn("Échec Firestore, sauvegarde locale", err);

            const localId = `local_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            node = buildArticleCard({ 
                title: finalTitle, 
                text: finalContent, 
                main: mainImage, 
                extras: currentType === 'note' ? [] : extras, 
                date: new Date(),
                authorPseudo: author,
                sources: sources
            });
            node.dataset.localId = localId;

            addLocalArticle({
                _localId: localId,
                titre: finalTitle,
                contenu: finalContent,
                main: mainImage,
                extras: extras,
                authorPseudo: author,
                sources: sources,
                createdAt: new Date().toISOString(),
            });

            showToast("Article sauvegardé localement", "info");
        }

        // Insert the article at the top
        if (container && node) {
            container.prepend(node);
            updateEmptyState();
        }

        // Reset form inputs only on SUCCESS
        if (titleEl) titleEl.value = "";
        if (quill) quill.setContents([]);
        if (mainImageEl) mainImageEl.value = "";
        for (let i = 1; i <= 3; i++) {
            const el = document.getElementById(`additional-image-${i}`);
            if (el) el.value = "";
        }
        const preview = document.getElementById("main-image-preview");
        if (preview) {
            preview.innerHTML = "";
            preview.classList.add("hidden");
        }
        const sourcesContainer = document.getElementById("sources-container");
        if (sourcesContainer) sourcesContainer.innerHTML = "";
        if (typeof clearMediaFile === 'function') clearMediaFile();

        // Scroll to the newly published article
        if (node) {
            node.scrollIntoView({ behavior: "smooth", block: "center" });
        }

    } catch (err) {
        console.error("Publication error:", err);
        showToast("Erreur lors de la publication", "error");
    } finally {
        publishBtn.disabled = false;
        publishBtn.innerHTML = originalHTML;
    }
}

// ---------- Clear Form ----------
async function clearForm() {
    if (!(await showConfirmModal(TRANSLATIONS[currentLang].confirmClear))) return;

    const fields = ["title", "author-name", "main-image", "additional-image-1", "additional-image-2", "additional-image-3"];
    fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    if (quill) quill.setContents([]);

    if (typeof clearMediaFile === 'function') clearMediaFile();

    const sourcesContainer = document.getElementById("sources-container");
    if (sourcesContainer) sourcesContainer.innerHTML = "";

    showToast(TRANSLATIONS[currentLang].toastEfface || "Formulaire effacé", "info");
}

// ---------- Live Launches Tracker ----------
async function fetchLaunches() {
    const container = document.getElementById("launches-container");
    const loading = document.getElementById("launches-loading");
    if (!container) return;

    const LAUNCH_CACHE_KEY = "cosmos_launches_cache_v2";
    let launchData = null;

    try {
        const cache = JSON.parse(localStorage.getItem(LAUNCH_CACHE_KEY));
        const now = Date.now();
        if (cache && cache.timestamp && (now - cache.timestamp < 86400000) && cache.data) {
            launchData = cache.data;
        }
    } catch (_) {}

    try {
        if (!launchData) {
            const res = await fetch("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=3");
            const data = await res.json();
            if (data.results) {
                launchData = data.results;
                localStorage.setItem(LAUNCH_CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: launchData
                }));
            }
        }
        
        if (loading) loading.classList.add("hidden");
        container.innerHTML = "";

        if (launchData && launchData.length > 0) {
            launchData.forEach(launch => {
                const card = document.createElement("div");
                card.className = "launch-card glass-card";
                card.style.cursor = "pointer";
                
                // Prioritize video live stream, fallback to SpaceLaunchNow page, then Google search
                let targetUrl = null;
                if (launch.vid_urls && launch.vid_urls.length > 0) {
                    targetUrl = launch.vid_urls[0].url;
                } else if (launch.slug) {
                    targetUrl = `https://spacelaunchnow.me/launch/${launch.slug}`;
                } else {
                    targetUrl = `https://www.google.com/search?q=${encodeURIComponent(launch.name + ' launch')}`;
                }
                card.onclick = () => window.open(targetUrl, '_blank');
                
                const provider = launch.launch_service_provider ? launch.launch_service_provider.name : "Inconnu";
                const location = launch.pad ? launch.pad.location.name : "Lieu Inconnu";
                
                card.innerHTML = `
                    <div class="launch-provider">${provider}</div>
                    <div class="launch-title">${launch.name}</div>
                    <div class="launch-location">📍 ${location}</div>
                    <div class="launch-countdown" data-time="${launch.net}">T- --:--:--</div>
                `;
                container.appendChild(card);
            });

            // Start countdown interval
            setInterval(updateCountdowns, 1000);
            updateCountdowns(); // initial call
        }
    } catch (err) {
        console.error("Launch API Error:", err);
        if (loading) loading.classList.add("hidden");
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.5);">Impossible de charger les lancements.</p>`;
    }
}

function updateCountdowns() {
    const els = document.querySelectorAll(".launch-countdown");
    const now = new Date().getTime();
    
    els.forEach(el => {
        const target = new Date(el.getAttribute("data-time")).getTime();
        const diff = target - now;
        
        if (diff <= 0) {
            el.innerHTML = "LANCEMENT !";
            el.style.color = "#ff4b2b";
            return;
        }
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        const pad = (n) => n.toString().padStart(2, '0');
        
        if (d > 0) {
            el.innerHTML = `T- ${d}J ${pad(h)}:${pad(m)}:${pad(s)}`;
        } else {
            el.innerHTML = `T- ${pad(h)}:${pad(m)}:${pad(s)}`;
        }
    });
}

// ---------- Interactive Sky Map ----------
function initSkyMap() {
    const starmap = document.getElementById("starmap");
    const geoBtn = document.getElementById("geo-request-btn");
    if (!starmap) return;

    const buildIframe = (lat = 48.8566, lon = 2.3522) => {
        starmap.innerHTML = `<iframe loading="lazy" width="100%" height="500" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://virtualsky.lco.global/embed/index.html?longitude=${lon}&latitude=${lat}&projection=stereo&constellations=true&constellationlabels=true&meteorshowers=true&showstarlabels=true&live=true&az=180&color=2e2f3d"></iframe>`;
    };

    // Default to Paris
    buildIframe();

    if (geoBtn) {
        geoBtn.addEventListener("click", () => {
            if (navigator.geolocation) {
                geoBtn.textContent = "Recherche en cours...";
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        buildIframe(position.coords.latitude, position.coords.longitude);
                        geoBtn.textContent = "Ciel mis à jour !";
                        geoBtn.style.color = "#4caf50";
                        geoBtn.style.pointerEvents = "none";
                    },
                    (error) => {
                        console.error("Geo error:", error);
                        geoBtn.textContent = "Position refusée.";
                        geoBtn.style.color = "#ff4b2b";
                    }
                );
            } else {
                geoBtn.textContent = "GPS non supporté.";
            }
        });
    }
}

// ---------- ISS Tracker ----------
function initISSTracker() {
    const posEl = document.getElementById('iss-position');
    const crewEl = document.getElementById('iss-crew');
    if (!posEl) return;

    async function updateISSPosition() {
        try {
            const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
            const data = await res.json();
            const lat = parseFloat(data.latitude).toFixed(2);
            const lon = parseFloat(data.longitude).toFixed(2);
            const latDir = lat >= 0 ? 'N' : 'S';
            const lonDir = lon >= 0 ? 'E' : 'W';
            posEl.textContent = `${Math.abs(lat)}°${latDir}, ${Math.abs(lon)}°${lonDir}`;
            
            const speedEl = document.getElementById('iss-speed');
            const altEl = document.getElementById('iss-altitude');
            if (speedEl) speedEl.textContent = `${Math.round(data.velocity).toLocaleString()} km/h`;
            if (altEl) altEl.textContent = `${parseFloat(data.altitude).toFixed(1)} km`;
        } catch (err) {
            console.error('ISS position error:', err);
        }
    }

    async function updateISSCrew() {
        try {
            const res = await fetch('http://api.open-notify.org/astros.json');
            const data = await res.json();
            const issCrew = data.people.filter(p => p.craft === 'ISS');
            if (crewEl) crewEl.textContent = `${issCrew.length} ${TRANSLATIONS[currentLang].issAstronauts}`;
        } catch (err) {
            console.error('ISS crew error:', err);
            if (crewEl) crewEl.textContent = `7 ${TRANSLATIONS[currentLang].issAstronauts}`;
        }
    }

    updateISSPosition();
    updateISSCrew();
    setInterval(updateISSPosition, 5000); // Update position every 5s

    // Globe controls
    const wrapper = document.querySelector('.iss-globe-wrapper');
    const zoomInBtn = document.getElementById('iss-zoom-in');
    const zoomOutBtn = document.getElementById('iss-zoom-out');
    let currentZoom = 1;

    if (zoomInBtn && wrapper) {
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(currentZoom + 0.2, 2.5);
            wrapper.style.transform = `scale(${currentZoom})`;
        });
    }
    if (zoomOutBtn && wrapper) {
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(currentZoom - 0.2, 0.6);
            wrapper.style.transform = `scale(${currentZoom})`;
        });
    }
}

// ---------- Moon Phase & Fun Facts ----------
function initMoonPhase() {
    const moonIcon = document.getElementById('moon-icon');
    const moonNav = document.getElementById('moon-phase-nav');
    if (!moonIcon) return;

    // 12-hour cache logic
    const CACHE_KEY = 'cosmos_moon_cache';
    const now = Date.now();
    let cached = localStorage.getItem(CACHE_KEY);
    if (cached) cached = JSON.parse(cached);

    let index;
    if (cached && (now - cached.time < 12 * 60 * 60 * 1000)) {
        index = cached.index;
    } else {
        const lp = 2551443; // synodic month in seconds
        const ref_new_moon = new Date(1970, 0, 7, 20, 35, 0);
        const phase = ((now - ref_new_moon.getTime()) / 1000) % lp;
        index = Math.floor((phase / lp) * 8);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ index, time: now }));
    }

    const MOON_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    const phaseName = TRANSLATIONS[currentLang].moonPhases[index];
    
    moonIcon.textContent = MOON_ICONS[index];
    if (moonNav) {
        moonNav.title = phaseName;
        // Click for big view
        moonNav.onclick = () => showMoonDetails(MOON_ICONS[index], phaseName);
    }
}

function showMoonDetails(icon, name) {
    const overlay = document.createElement('div');
    overlay.className = 'moon-modal-overlay';
    overlay.innerHTML = `
        <div class="moon-modal-content">
            <span class="moon-big-icon">${icon}</span>
            <div class="moon-big-name">${name}</div>
            <div class="moon-big-desc">${currentLang === 'fr' ? 'Phase Lunaire Actuelle' : 'Current Lunar Phase'}</div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);
    
    overlay.onclick = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 500);
    };
}

function initFunFacts() {
    const container = document.getElementById('fun-fact-container');
    const textEl = document.getElementById('fun-fact-text');
    if (!container || !textEl) return;

    const CACHE_KEY = 'cosmos_fact_cache';
    const now = Date.now();
    let cached = localStorage.getItem(CACHE_KEY);
    if (cached) cached = JSON.parse(cached);

    const facts = TRANSLATIONS[currentLang].facts;
    let factText;

    if (cached && (now - cached.time < 12 * 60 * 60 * 1000) && facts[cached.index]) {
        factText = facts[cached.index];
    } else {
        const index = Math.floor(Math.random() * facts.length);
        factText = facts[index];
        localStorage.setItem(CACHE_KEY, JSON.stringify({ index, time: now }));
    }

    textEl.textContent = factText;
    container.classList.remove('hidden');
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
    initQuill();
    initTypeToggle();
    initMediaDropzone();
    initSourcesManager();
    initNavbar();
    initImagePreview();
    translateUI();
    
    // Feature initializations
    fetchLaunches();
    initSkyMap();
    initISSTracker();
    initMoonPhase();
    initFunFacts();

    const publishBtn = document.getElementById("publish-button");
    const clearBtn = document.getElementById("clear-button");

    if (publishBtn) {
        publishBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            publishArticle();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            clearForm();
        });
    }

    const banTrigger = document.getElementById("ban-list-trigger");
    if (banTrigger) {
        banTrigger.addEventListener("click", showBanList);
    }

    const titleInput = document.getElementById('title');
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            const hasProfanity = containsProfanity(titleInput.value);
            titleInput.classList.toggle('input-profanity', !!hasProfanity);
        });
    }

    await loadCustomBannedWords();
    await loadArticles();
    loadDailyArxiv();
});