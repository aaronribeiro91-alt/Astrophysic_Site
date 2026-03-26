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

    // Footer with date + action buttons
    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const dateEl = document.createElement("span");
    dateEl.className = "modal-date";
    dateEl.textContent = data.date ? formatDate(data.date) : formatDate(new Date());
    footer.appendChild(dateEl);

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
                <textarea id="edit-content" class="form-input form-textarea">${data.text}</textarea>
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
            const newTitle = editForm.querySelector("#edit-title").value.trim();
            const newText = editForm.querySelector("#edit-content").value.trim();
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
                        titre: newTitle,
                        contenu: newText,
                        main: newMain,
                        extras: newExtras
                    });
                } else if (localId) {
                    // Update local storage
                    const arr = loadLocalArticles();
                    const idx = arr.findIndex(a => a._localId === localId);
                    if (idx !== -1) {
                        arr[idx].titre = newTitle;
                        arr[idx].contenu = newText;
                        arr[idx].main = newMain;
                        arr[idx].extras = newExtras;
                        saveLocalArticles(arr);
                    }
                }

                // Update UI in background
                data.title = newTitle;
                data.text = newText;
                data.main = newMain;
                data.extras = newExtras;

                // Update Card UI
                if (cardEl) {
                    const cardTitle = cardEl.querySelector(".card-title");
                    if (cardTitle) cardTitle.textContent = newTitle;
                    const cardExcerpt = cardEl.querySelector(".card-excerpt");
                    if (cardExcerpt) cardExcerpt.textContent = newText;
                    
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

    actionsRight.appendChild(editBtn);
    actionsRight.appendChild(deleteBtn);
    footer.appendChild(actionsRight);
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