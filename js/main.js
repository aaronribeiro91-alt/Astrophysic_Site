// ============================================
// COSMOS — Main Application Logic
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

// ---------- Translations ----------
const TRANSLATIONS = {
    fr: {
        navCreate: "Créer",
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
        langEN: "English"
    },
    en: {
        navCreate: "Create",
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
        langEN: "English"
    }
};

let currentLang = localStorage.getItem("cosmos_lang") || "fr";
let currentType = "article"; // 'article' or 'note'
let quill;

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
        '[href="#articles"].nav-link': t.navArticles,
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
        '.footer-text': t.footerTagline
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
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;

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
        extras: (data.extras || []).slice(0, 3),
        date: data.date || null,
        lang: data.lang || "fr",
        type: data.type || "article"
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

    // Main image
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
        editForm.innerHTML = `
            <div class="form-group">
                <label class="form-label">Titre de l'article</label>
                <input type="text" id="edit-title" class="form-input" value="${data.title.replace(/"/g, '&quot;')}">
            </div>
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
        editForm.querySelector("#edit-save").addEventListener("click", async () => {
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
                        extras: newExtras
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
                        saveLocalArticles(arr);
                    }
                }

                // Update UI in background
                data.title = finalTitle;
                data.text = finalContent;
                data.main = newMain;
                data.extras = newExtras;

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
        if (!confirm("Supprimer cet article définitivement ?")) return;

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

    const closeAdmin = () => {
        overlay.remove();
        document.body.style.overflow = "";
    };
    overlay.querySelector("#admin-close").onclick = closeAdmin;

    async function renderArticles() {
        tabArticles.classList.add("active");
        tabBanned.classList.remove("active");
        contentArea.innerHTML = `
            <div style="background: rgba(255, 159, 67, 0.1); border: 1px solid rgba(255, 159, 67, 0.2); padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; color: #ff9f43; display: flex; align-items: start; gap: 12px;">
                <span style="font-size: 1.2rem; transform: translateY(-2px);">💡</span>
                <div>
                    <strong style="display: block; margin-bottom: 4px;">Astuce d'administrateur :</strong>
                    ${currentLang === 'fr' 
                        ? 'Pour contourner le filtre de mots interdits, entourez le mot de dièses. Exemple: <code>#mot#</code>.' 
                        : 'To bypass the profanity filter, wrap the word in hashes. Example: <code>#word#</code>.'}
                </div>
            </div>
            <div class="admin-list" id="admin-article-list">
                <div class="btn-spinner"></div>
            </div>
        `;
        const list = contentArea.querySelector("#admin-article-list");
        try {
            const q = query(collection(db, "Article"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            list.innerHTML = "";
            if (snapshot.empty) {
                list.innerHTML = `<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.3);">${currentLang === 'fr' ? 'Aucun article trouvé.' : 'No articles found.'}</div>`;
                return;
            }
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
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
                        <button class="btn btn-edit btn-sm" data-id="${id}">${t.btnModifier || 'Modifier'}</button>
                        <button class="btn btn-danger btn-sm" data-id="${id}">${t.btnSupprimer || 'Supprimer'}</button>
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
                    if (confirm(currentLang === 'fr' ? "Supprimer définitivement cet élément ?" : "Delete this item permanently?")) {
                        try {
                            await deleteDoc(doc(db, "Article", id));
                            item.remove();
                            showToast(t.toastSupprime || "Supprimé", "success");
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

    container.innerHTML = "";
    if (loading) loading.classList.remove("hidden");
    try {
        // Fetch ALL articles (no where clause to avoid index issues with missing 'lang' field)
        const q = query(collection(db, "Article"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        if (loading) loading.classList.add("hidden");

        if (snapshot.empty) {
            // Fallback to local storage
            const local = loadLocalArticles();
            if (local.length > 0) {
                local.forEach((a) => {
                    const node = buildArticleCard({
                        title: a.titre || a.title || "",
                        text: a.contenu || a.content || "",
                        main: a.main || null,
                        extras: a.extras || [],
                        date: a.createdAt || null,
                        lang: a.lang || "fr",
                        type: a.type || "article"
                    });
                    if (a._localId) node.dataset.localId = a._localId;
                    container.appendChild(node);
                });
            }
            updateEmptyState();
            return;
        }

        snapshot.forEach((d) => {
            const data = d.data();
            const createdAt = data.createdAt?.toDate?.() || null;
            const articleLang = data.lang || null;

            // Visibility Logic: 
            // 1. Show if lang matches currentLang
            // 2. Show if it's a legacy article (no lang field) - as requested by user
            if (!articleLang || articleLang === currentLang) {
                const node = buildArticleCard(
                    {
                        title: data.titre || data.title || "",
                        text: data.contenu || data.content || "",
                        main: data.main || null,
                        extras: data.extras || [],
                        date: createdAt,
                        lang: articleLang || "fr",
                        type: data.type || "article"
                    },
                    d.id
                );
                container.appendChild(node);
            }
        });

        updateEmptyState();
        console.log("✅ Articles chargés depuis Firebase");
    } catch (err) {
        console.warn("Erreur Firebase, fallback localStorage", err);
        // ... local storage fallback already handled by snapshot.empty check above if needed, 
        // but let's keep a catch fallback for total failure.
        if (loading) loading.classList.add("hidden");
        const local = loadLocalArticles();
        local.forEach((a) => {
            const node = buildArticleCard({
                title: a.titre || a.title || "",
                text: a.contenu || a.content || "",
                main: a.main || null,
                extras: a.extras || [],
                date: a.createdAt || null,
                lang: a.lang || "fr",
                type: a.type || "article"
            });
            if (a._localId) node.dataset.localId = a._localId;
            container.appendChild(node);
        });
        updateEmptyState();
    }
}

// ---------- Publish Article ----------
async function publishArticle() {
    const titleEl = document.getElementById("title");
    const contentEl = document.getElementById("content");
    const mainImageEl = document.getElementById("main-image");
    const publishBtn = document.getElementById("publish-button");

    const title = titleEl?.value.trim() || "";
    const text = quill ? quill.root.innerHTML : "";
    const mainImage = mainImageEl?.value.trim() || null;

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

    // Loading state on button
    const originalHTML = publishBtn.innerHTML;
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<span class="btn-spinner"></span> Publication...';

    const container = document.getElementById("articles-container");
    let node;

    try {
        const docRef = await addDoc(collection(db, "Article"), {
            titre: finalTitle,
            contenu: finalContent,
            main: currentType === 'note' ? null : mainImage,
            extras: currentType === 'note' ? [] : extras,
            type: currentType,
            lang: currentLang,
            createdAt: serverTimestamp(),
        });

        node = buildArticleCard(
            { title: finalTitle, text: finalContent, main: currentType === 'note' ? null : mainImage, extras: currentType === 'note' ? [] : extras, date: new Date(), type: currentType },
            docRef.id
        );

        showToast(currentType === 'note' 
            ? (currentLang === 'fr' ? 'Note publiée !' : 'Note published!') 
            : (currentLang === 'fr' ? 'Article publié avec succès !' : 'Article published!'), "success");
    } catch (err) {
        console.warn("Échec Firestore, sauvegarde locale", err);

        const localId = `local_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        node = buildArticleCard({ title, text, main: mainImage, extras, date: new Date() });
        node.dataset.localId = localId;

        addLocalArticle({
            _localId: localId,
            titre: title,
            contenu: text,
            main: mainImage,
            extras: extras,
            createdAt: new Date().toISOString(),
        });

        showToast("Article sauvegardé localement", "info");
    }

    // Insert the article at the top
    if (container && node) {
        container.prepend(node);
        updateEmptyState();
    }

    // Reset form
    publishBtn.disabled = false;
    publishBtn.innerHTML = originalHTML;

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

    // Scroll to the newly published article
    if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

// ---------- Clear Form ----------
function clearForm() {
    if (!confirm("Effacer tous les champs ?")) return;

    const fields = ["title", "main-image", "additional-image-1", "additional-image-2", "additional-image-3"];
    fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    if (quill) quill.setContents([]);

    const preview = document.getElementById("main-image-preview");
    if (preview) {
        preview.innerHTML = "";
        preview.classList.add("hidden");
    }

    showToast("Formulaire effacé", "info");
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
    initQuill();
    initTypeToggle();
    initNavbar();
    initImagePreview();
    translateUI();

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
});