// js/esplora.js

let tuttiAppunti = [];

/* ─────────────────────────────────────────
   INIT — carica appunti dal server
───────────────────────────────────────── */
async function initEsplora() {
    mostraScheletro();
    try {
        const res = await fetch('/api/appunti');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        tuttiAppunti = await res.json();
        renderFeed(tuttiAppunti);
    } catch (err) {
        console.error('Errore recupero appunti:', err);
        mostraErrore();
    }
}

/* ─────────────────────────────────────────
   STILI MATERIA — gradient + icona
───────────────────────────────────────── */
const MATERIE_STILI = {
    'Matematica':  { icon: '∑',   grad: 'linear-gradient(160deg, #1a2a6c 0%, #b21f1f 60%, #fdbb2d 100%)', color: '#fdbb2d' },
    'Fisica':      { icon: '⚛️',  grad: 'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', color: '#60b8f0' },
    'Scienze':     { icon: '🔬',  grad: 'linear-gradient(160deg, #11998e 0%, #38ef7d 100%)',               color: '#38ef7d' },
    'Chimica':     { icon: '🧪',  grad: 'linear-gradient(160deg, #4b0082 0%, #9400d3 100%)',               color: '#c084fc' },
    'Storia':      { icon: '📖',  grad: 'linear-gradient(160deg, #3e1f00 0%, #be185d 100%)',               color: '#f9a8d4' },
    'Italiano':    { icon: '✏️',  grad: 'linear-gradient(160deg, #5c3a1e 0%, #d97706 100%)',               color: '#fcd34d' },
    'Inglese':     { icon: '🗣️', grad: 'linear-gradient(160deg, #003973 0%, #4f46e5 100%)',               color: '#a5b4fc' },
    'Informatica': { icon: '💻',  grad: 'linear-gradient(160deg, #0f0f0f 0%, #dc2626 100%)',               color: '#fca5a5' },
    'Arte':        { icon: '🎨',  grad: 'linear-gradient(160deg, #0c4a6e 0%, #0891b2 100%)',               color: '#67e8f9' },
    'Geografia':   { icon: '🌍',  grad: 'linear-gradient(160deg, #064e3b 0%, #0d9488 100%)',               color: '#6ee7b7' },
    'piopio':      { icon: '🐥',  grad: 'linear-gradient(160deg, #ff9966 0%, #ff5e62 100%)',               color: '#ffa07a' },
};

function getMateriaStyle(materia) {
    return MATERIE_STILI[materia] || {
        icon: '📚',
        grad: 'linear-gradient(160deg, #1c1c1c 0%, #303336 100%)',
        color: '#aaaaaa'
    };
}

/* ─────────────────────────────────────────
   FORMATTA DATA
───────────────────────────────────────── */
function formatData(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const now  = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)     return 'adesso';
    if (diff < 3600)   return `${Math.floor(diff / 60)} min fa`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)} ore fa`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} giorni fa`;
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

/* ─────────────────────────────────────────
   RENDER FEED
───────────────────────────────────────── */
function renderFeed(data) {
    const feed = document.getElementById('feed');
    if (!feed) return;

    if (!data || data.length === 0) {
        feed.innerHTML = `
            <div class="feed-empty">
                <div class="feed-empty__icon">📭</div>
                <div class="feed-empty__title">Nessun appunto ancora</div>
                <div class="feed-empty__sub">Sii il primo a condividere qualcosa con la community!</div>
            </div>`;
        return;
    }

    feed.innerHTML = data.map(appunto => {
        const stile    = getMateriaStyle(appunto.materia);
        const autore   = String(appunto.utente_id || 'Anonimo');
        const iniziale = autore[0].toUpperCase();
        const data_str = formatData(appunto.data_caricamento);

        return `
        <div class="slide">
            <div class="slide__bg" style="background: ${stile.grad}"></div>
            <div class="slide__overlay"></div>

            <div class="slide__content">
                <div class="slide__meta">
                    <div class="slide__avatar">${iniziale}</div>
                    <div class="slide__author-info">
                        <span class="slide__author">${autore}</span>
                        ${data_str ? `<span class="slide__time">${data_str}</span>` : ''}
                    </div>
                </div>

                <div class="slide__chip" style="border-color:${stile.color};color:${stile.color}">
                    ${stile.icon} ${appunto.materia || 'Generale'}
                </div>

                <div class="slide__title">${appunto.titolo || 'Senza titolo'}</div>

                ${appunto.descrizione ? `<div class="slide__desc">${appunto.descrizione}</div>` : ''}

                <div class="slide__actions">
                    ${appunto.file_url ? `
                        <a href="${appunto.file_url}" target="_blank" class="slide__btn slide__btn--primary">
                            📥 Apri appunto
                        </a>` : ''}
                    <button class="slide__btn slide__btn--ghost"
                        onclick="toggleLike(${appunto.id}, this)">
                        🤍 <span class="like-count">0</span>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

/* ─────────────────────────────────────────
   LIKE (ottimistico — aggiorna l'UI subito)
───────────────────────────────────────── */
async function toggleLike(id, btn) {
    const countEl = btn.querySelector('.like-count');
    const liked   = btn.dataset.liked === 'true';
    const delta   = liked ? -1 : 1;

    // update UI subito
    btn.dataset.liked   = String(!liked);
    btn.textContent     = '';
    btn.innerHTML       = `${liked ? '🤍' : '❤️'} <span class="like-count">${(parseInt(countEl?.textContent) || 0) + delta}</span>`;

    // chiama API in background
    try {
        await fetch(`/api/appunti/${id}/like`, {
            method: liked ? 'DELETE' : 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.warn('Errore like:', err);
    }
}

/* ─────────────────────────────────────────
   FILTRA per materia
───────────────────────────────────────── */
window.filtra = function(materia, el) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const filtrati = materia === 'tutti'
        ? tuttiAppunti
        : tuttiAppunti.filter(a => a.materia === materia);
    renderFeed(filtrati);
};

/* ─────────────────────────────────────────
   STATI: scheletro e errore
───────────────────────────────────────── */
function mostraScheletro() {
    const feed = document.getElementById('feed');
    if (!feed) return;
    feed.innerHTML = `
        <div class="slide slide--skeleton">
            <div class="skeleton skeleton--bg"></div>
            <div class="slide__content">
                <div class="skeleton skeleton--chip"></div>
                <div class="skeleton skeleton--title"></div>
                <div class="skeleton skeleton--line"></div>
            </div>
        </div>`;
}

function mostraErrore() {
    const feed = document.getElementById('feed');
    if (!feed) return;
    feed.innerHTML = `
        <div class="feed-empty">
            <div class="feed-empty__icon">⚠️</div>
            <div class="feed-empty__title">Errore di connessione</div>
            <div class="feed-empty__sub">Impossibile caricare gli appunti. Controlla che il server sia attivo.</div>
            <button onclick="initEsplora()" class="feed-empty__retry">🔄 Riprova</button>
        </div>`;
}

/* ─────────────────────────────────────────
   AVVIO
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initEsplora);