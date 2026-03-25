// main.js

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";

// TES clés Firebase (celles de ta capture de tout à l'heure)
const firebaseConfig = {
  apiKey: "AIzaSyDasIxnc9Eh_qIJILjRBIl5YdUMEEDMXWk",
  authDomain: "astrophysic-articles.firebaseapp.com",
  projectId: "astrophysic-articles",
  storageBucket: "astrophysic-articles.firebasestorage.app",
  messagingSenderId: "1024642956813",
  appId: "1:1024642956813:web:644a95393d20504e0e5623"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Local fallback key
const LOCAL_KEY = 'astro_articles_local_v1';

function saveLocalArticles(arr) {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(arr || []));
    } catch (e) {
        console.warn('Impossible de sauvegarder en local', e);
    }
}

function loadLocalArticles() {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Impossible de lire les articles locaux', e);
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
    const arr = loadLocalArticles().filter(a => a._localId !== id && a.id !== id);
    saveLocalArticles(arr);
}

// Petite fonction pour afficher tes articles d'astro
async function chargerArticles() {
    const container = document.getElementById('articles-container');
    if (!container) return;

    // Clear existing (avoid duplicates)
    container.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "Article"));
        if (!querySnapshot || querySnapshot.empty) {
            // No docs in Firestore, fallback to local storage
            const local = loadLocalArticles();
            local.forEach(a => {
                const node = buildArticleNode({ title: a.titre || a.title || a.titleText || '', text: a.contenu || a.content || a.text || '', main: a.main || a.mainImage || null, extras: a.extras || [] });
                // attach local id so deletion can remove it from localStorage
                if (a._localId) node.dataset.localId = a._localId;
                container.appendChild(node);
            });
            return;
        }

        querySnapshot.forEach((d) => {
            const data = d.data();
            const id = d.id;
            // Use the same node builder so delete handlers and modal behave the same
            const node = buildArticleNode({ title: data.titre || data.title || '', text: data.contenu || data.content || '', main: data.main || null, extras: data.extras || [] }, id);
            container.appendChild(node);
        });
    } catch (err) {
        console.warn('Erreur lecture Firestore, fallback local', err);
        const local = loadLocalArticles();
        local.forEach(a => {
            const node = buildArticleNode({ title: a.titre || a.title || a.titleText || '', text: a.contenu || a.content || a.text || '', main: a.main || a.mainImage || null, extras: a.extras || [] });
            if (a._localId) node.dataset.localId = a._localId;
            container.appendChild(node);
        });
    }
}

// chargerArticles will be called after the DOM is ready and after buildArticleNode is defined
document.addEventListener('DOMContentLoaded', async () => {
    const publishBtn = document.getElementById('publish-button');
    const clearBtn = document.getElementById('clear-button');
    const articlesContainer = document.getElementById('articles-container');

    const titleEl = document.getElementById('title');
    const contentEl = document.getElementById('content');

    const mainFileInput = document.getElementById('main-image-file') || document.querySelector('input[type="file"][id^="main"]');
    const mainUrlInput = document.getElementById('main-image') || document.getElementById('main-image-url');

    const extraUrlSimple = [
        document.getElementById('additional-image-1'),
        document.getElementById('additional-image-2'),
        document.getElementById('additional-image-3')
    ].filter(Boolean);

    const extraFileInputs = Array.from(document.querySelectorAll('.extra-file'));
    const extraUrlInputs = Array.from(document.querySelectorAll('.extra-url'));
    const extrasSimpleUrls = extraUrlSimple.length ? extraUrlSimple : [];

    const fileToDataURL = file => new Promise((res, rej) => {
        if (!file) return res(null);
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.onerror = () => res(null);
        reader.readAsDataURL(file);
    });

    async function getMainSrc() {
        if (mainFileInput && mainFileInput.files && mainFileInput.files[0]) {
            return await fileToDataURL(mainFileInput.files[0]);
        }
        if (mainUrlInput && mainUrlInput.value && mainUrlInput.value.trim()) {
            return mainUrlInput.value.trim();
        }
        return null;
    }

    async function getExtras() {
        const extras = [];
        if (extraFileInputs.length || extraUrlInputs.length) {
            for (let i = 0; i < Math.max(extraFileInputs.length, extraUrlInputs.length, 3); i++) {
                let src = null;
                const fi = extraFileInputs[i];
                const ui = extraUrlInputs[i];
                if (fi && fi.files && fi.files[0]) {
                    src = await fileToDataURL(fi.files[0]);
                } else if (ui && ui.value && ui.value.trim()) {
                    src = ui.value.trim();
                }
                if (src) extras.push(src);
                if (extras.length >= 3) break;
            }
            return extras;
        }
        for (let i = 0; i < extrasSimpleUrls.length && extras.length < 3; i++) {
            const v = extrasSimpleUrls[i].value && extrasSimpleUrls[i].value.trim();
            if (v) extras.push(v);
        }
        return extras;
    }

    // Create and show modal with full article content. `articleEl` is the list node to remove on delete.
    function showArticleModal(articleEl, data) {
        // overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(2,6,12,0.85)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 9999;
        overlay.style.padding = '20px';

        // modal container
        const modal = document.createElement('div');
        modal.style.width = 'min(900px, 98%)';
        modal.style.maxHeight = '90%';
        modal.style.overflow = 'auto';
        modal.style.background = 'linear-gradient(180deg, rgba(10,10,14,0.98), rgba(6,6,10,0.98))';
        modal.style.borderRadius = '12px';
        modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.6)';
        modal.style.padding = '20px';
        modal.style.position = 'relative';
        modal.style.color = '#fff';

        // close button (top-right)
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.setAttribute('aria-label', 'Fermer');
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '10px';
        closeBtn.style.right = '10px';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = '1px solid rgba(255,255,255,0.06)';
        closeBtn.style.color = '#fff';
        closeBtn.style.padding = '6px 10px';
        closeBtn.style.borderRadius = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', closeModal);

        // title
        const h = document.createElement('h2');
        h.textContent = data.title || 'Sans titre';
        h.style.marginTop = '4px';
        h.style.marginBottom = '12px';

        modal.appendChild(closeBtn);
        modal.appendChild(h);

        // main image
        if (data.main) {
            const img = document.createElement('img');
            img.src = data.main;
            img.alt = data.title || 'Image principale';
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            img.style.objectFit = 'cover';
            img.style.marginBottom = '12px';
            img.onerror = () => img.style.display = 'none';
            modal.appendChild(img);
        }

        // text
        const p = document.createElement('p');
        p.textContent = data.text || '';
        p.style.color = 'rgba(255,255,255,0.92)';
        p.style.lineHeight = '1.6';
        p.style.marginBottom = '12px';
        modal.appendChild(p);

        // gallery
        if (data.extras && data.extras.length) {
            const gallery = document.createElement('div');
            gallery.style.display = 'flex';
            gallery.style.gap = '10px';
            gallery.style.flexWrap = 'wrap';
            gallery.style.marginBottom = '12px';
            data.extras.forEach(src => {
                if (!src) return;
                const im = document.createElement('img');
                im.src = src;
                im.alt = 'Image supplémentaire';
                im.style.width = 'calc(33.333% - 6.6px)';
                im.style.borderRadius = '8px';
                im.style.objectFit = 'cover';
                im.style.height = '140px';
                im.onerror = () => im.style.display = 'none';
                gallery.appendChild(im);
            });
            modal.appendChild(gallery);
        }

        // meta row: time + delete
        const metaRow = document.createElement('div');
        metaRow.style.display = 'flex';
        metaRow.style.justifyContent = 'space-between';
        metaRow.style.alignItems = 'center';
        metaRow.style.gap = '10px';
        metaRow.style.marginTop = '6px';

        const time = document.createElement('small');
        time.textContent = new Date().toLocaleString();
        time.style.color = 'var(--muted)';

        const del = document.createElement('button');
        del.textContent = 'Supprimer';
        del.style.background = 'transparent';
        del.style.border = '1px solid rgba(255,140,140,0.12)';
        del.style.color = '#ff9b9b';
        del.style.padding = '8px 12px';
        del.style.borderRadius = '8px';
        del.style.cursor = 'pointer';
        del.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            // remove article element from list and Firestore if it exists
            try {
                const id = articleEl && articleEl.dataset && articleEl.dataset.id;
                const localId = articleEl && articleEl.dataset && articleEl.dataset.localId;
                if (id) {
                    await deleteDoc(doc(db, 'Article', id));
                    removeLocalArticleById(id);
                }
                if (localId) {
                    removeLocalArticleById(localId);
                }
            } catch (err) {
                console.error('Erreur suppression Firestore', err);
            }
            if (articleEl && articleEl.parentNode) articleEl.parentNode.removeChild(articleEl);
            closeModal();
        });

        metaRow.appendChild(time);
        metaRow.appendChild(del);
        modal.appendChild(metaRow);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // focus close button
        closeBtn.focus();

        // handlers to close modal
        function closeModal() {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            document.removeEventListener('keydown', onKey);
        }
        function onKey(e) {
            if (e.key === 'Escape') closeModal();
        }
        document.addEventListener('keydown', onKey);

        // click outside modal closes
        overlay.addEventListener('click', (ev) => {
            if (ev.target === overlay) closeModal();
        });
    }

    function buildArticleNode({ title, text, main, extras }, id) {
        const article = document.createElement('article');
        article.className = 'article card';

        const header = document.createElement('div');
        header.className = 'header';

        const h = document.createElement('h3');
        h.textContent = title || 'Sans titre';
        header.appendChild(h);

        if (main) {
            const thumb = document.createElement('div');
            thumb.className = 'thumb';
            const img = document.createElement('img');
            img.src = main;
            img.alt = title || 'Vignette';
            img.onerror = () => img.style.display = 'none';
            thumb.appendChild(img);
            header.appendChild(thumb);
        }

        article.appendChild(header);

        // store data for modal
        article._articleData = { title: title || '', text: text || '', main: main || null, extras: (extras || []).slice(0,3) };

        // attach firestore id if provided
        if (id) {
            article.dataset.id = id;
        }

        // body (kept in DOM but collapsed — we won't toggle; modal used for full view)
        const body = document.createElement('div');
        body.className = 'body';
        body.style.display = 'none'; // hidden; modal used instead

        const contentWrap = document.createElement('div');
        contentWrap.className = 'content';
        const p = document.createElement('p');
        p.textContent = text || '';
        contentWrap.appendChild(p);
        body.appendChild(contentWrap);

        // meta row with small delete (still present)
        const meta = document.createElement('div');
        meta.className = 'meta';
        const time = document.createElement('small');
        time.textContent = new Date().toLocaleString();
        time.style.color = 'var(--muted)';
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.type = 'button';
        del.textContent = 'Supprimer';
        del.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            article.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.98)' }], { duration: 220 });
            // delete from Firestore if this node has an id, also remove from local fallback
            try {
                const id = article.dataset && article.dataset.id;
                const localId = article.dataset && article.dataset.localId;
                if (id) await deleteDoc(doc(db, 'Article', id));
                if (id) removeLocalArticleById(id);
                if (localId) removeLocalArticleById(localId);
            } catch (err) {
                console.error('Erreur suppression Firestore', err);
            }
            setTimeout(() => article.remove(), 240);
        });

        meta.appendChild(time);
        meta.appendChild(del);
        contentWrap.appendChild(meta);

        article.appendChild(body);

        // open modal on header click
        header.addEventListener('click', () => {
            showArticleModal(article, article._articleData);
        });

        return article;
    }

    // Now that buildArticleNode is defined, load articles from Firestore
    // On définit la fonction ICI pour qu'elle puisse utiliser buildArticleNode
    async function chargerArticles() {
        const container = document.getElementById('articles-container');
        if (!container) return;
        container.innerHTML = ''; 

        try {
            const querySnapshot = await getDocs(collection(db, "Article"));
            
            // Si Firebase répond, on affiche les articles
            querySnapshot.forEach((d) => {
                const data = d.data();
                const node = buildArticleNode({ 
                    title: data.titre || data.title || '', 
                    text: data.contenu || data.content || '', 
                    main: data.main || null, 
                    extras: data.extras || [] 
                }, d.id);
                container.appendChild(node);
            });
            console.log("✅ Articles récupérés de Firebase !");
        } catch (err) {
            console.error("Erreur Firebase : ", err);
            // Si ça rate, on charge le localStorage (ton secours)
            const local = loadLocalArticles();
            local.forEach(a => {
                const node = buildArticleNode({ title: a.titre || '', text: a.contenu || '', main: a.main || null, extras: a.extras || [] });
                if (a._localId) node.dataset.localId = a._localId;
                container.appendChild(node);
            });
        }
    }

    // On lance le chargement !
    await chargerArticles();

    if (publishBtn) {
        publishBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const title = titleEl ? titleEl.value.trim() : '';
            const text = contentEl ? contentEl.value.trim() : '';

            if (!title && !text) {
                alert('Ajoutez un titre ou du contenu avant de publier.');
                return;
            }

            const main = await getMainSrc();
            const extras = await getExtras();

            // Build the node
            let node = buildArticleNode({ title, text, main, extras });

            // Persist: try Firestore first, fallback to localStorage
            let backendId = null;
            try {
                const docRef = await addDoc(collection(db, 'Article'), {
                    titre: title,
                    contenu: text,
                    main: main || null,
                    extras: extras || [],
                    createdAt: serverTimestamp()
                });
                backendId = docRef.id;
                node.dataset.id = backendId;
            } catch (err) {
                console.warn('Échec sauvegarde Firestore, on utilise le localStorage', err);
                // create a local id
                const localId = `local_${Date.now()}_${Math.floor(Math.random()*10000)}`;
                node.dataset.localId = localId;
                // Save minimal payload to local storage so it persists across reload
                addLocalArticle({ _localId: localId, titre: title, contenu: text, main: main || null, extras: extras || [] });
            }

            if (articlesContainer) {
                articlesContainer.prepend(node);
                node.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
            }

            try {
                if (titleEl) titleEl.value = '';
                if (contentEl) contentEl.value = '';
                if (mainFileInput) mainFileInput.value = '';
                if (mainUrlInput) mainUrlInput.value = '';
                extraFileInputs.forEach(i => i.value = '');
                extraUrlInputs.forEach(i => i.value = '');
                extrasSimpleUrls.forEach(i => i.value = '');
                document.querySelectorAll('.preview img').forEach(img => img.remove());
            } catch (err) {
                console.error(err);
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            if (!confirm('Effacer tous les champs ?')) return;
            if (titleEl) titleEl.value = '';
            if (contentEl) contentEl.value = '';
            if (mainFileInput) mainFileInput.value = '';
            if (mainUrlInput) mainUrlInput.value = '';
            extraFileInputs.forEach(i => i.value = '');
            extraUrlInputs.forEach(i => i.value = '');
            extrasSimpleUrls.forEach(i => i.value = '');
            document.querySelectorAll('.preview').forEach(p => p.textContent = 'Aucun aperçu');
        });
    }
});