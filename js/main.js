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
    serverTimestamp,
    query,
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
function showToast(message, type = "info", duration = 3500) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const icons = {
        success: "✓",
        error: "✕",
        info: "ℹ",
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-out");
        toast.addEventListener("animationend", () => toast.remove());
    }, duration);
}

// ---------- Date Formatting ----------
function formatDate(date) {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
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
    if (!navbar) return;

    const onScroll = () => {
        navbar.classList.toggle("scrolled", window.scrollY > 20);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
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
    };

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
        const emojis = ["🪐", "🌌", "⭐", "🔭", "🚀", "☄️", "🌙", "💫"];
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
    excerpt.textContent = data.text || "";
    body.appendChild(excerpt);

    const meta = document.createElement("div");
    meta.className = "card-meta";

    const date = document.createElement("span");
    date.className = "card-date";
    date.textContent = data.date ? formatDate(data.date) : formatDate(new Date());
    meta.appendChild(date);

    const tag = document.createElement("span");
    tag.className = "card-tag";
    tag.textContent = "Astronomie";
    meta.appendChild(tag);

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
function showArticleModal(cardEl, data) {
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

    // Text
    const text = document.createElement("p");
    text.className = "modal-text";
    text.textContent = data.text || "";
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

    // Footer with date + delete
    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const dateEl = document.createElement("span");
    dateEl.className = "modal-date";
    dateEl.textContent = data.date ? formatDate(data.date) : formatDate(new Date());
    footer.appendChild(dateEl);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        Supprimer
    `;
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

    footer.appendChild(deleteBtn);
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
            const node = buildArticleCard(
                {
                    title: data.titre || data.title || "",
                    text: data.contenu || data.content || "",
                    main: data.main || null,
                    extras: data.extras || [],
                    date: createdAt,
                },
                d.id
            );
            container.appendChild(node);
        });

        updateEmptyState();
        console.log("✅ Articles chargés depuis Firebase");
    } catch (err) {
        console.warn("Erreur Firebase, fallback localStorage", err);
        if (loading) loading.classList.add("hidden");

        const local = loadLocalArticles();
        local.forEach((a) => {
            const node = buildArticleCard({
                title: a.titre || a.title || "",
                text: a.contenu || a.content || "",
                main: a.main || null,
                extras: a.extras || [],
                date: a.createdAt || null,
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
    const text = contentEl?.value.trim() || "";
    const mainImage = mainImageEl?.value.trim() || null;

    if (!title && !text) {
        showToast("Ajoutez un titre ou du contenu avant de publier.", "error");
        return;
    }

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
            titre: title,
            contenu: text,
            main: mainImage,
            extras: extras,
            createdAt: serverTimestamp(),
        });

        node = buildArticleCard(
            { title, text, main: mainImage, extras, date: new Date() },
            docRef.id
        );

        showToast("Article publié avec succès !", "success");
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
    if (contentEl) contentEl.value = "";
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

    const fields = ["title", "content", "main-image", "additional-image-1", "additional-image-2", "additional-image-3"];
    fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const preview = document.getElementById("main-image-preview");
    if (preview) {
        preview.innerHTML = "";
        preview.classList.add("hidden");
    }

    showToast("Formulaire effacé", "info");
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
    initNavbar();
    initImagePreview();

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

    await loadArticles();
});