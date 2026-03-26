function getCookieSafe(name) {
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

let tuttiPodcast = []; 
window.mieiLikesPodcast = []; // Reso globale (window) per sicurezza

async function initPodcast() {
    const btnLogin = document.getElementById('navLoginBtn');
    const utenteId = getCookieSafe('utente_id');
    
    if (btnLogin && getCookieSafe('username')) btnLogin.style.display = 'none';

    try {
        // 1. Recupera tutti i podcast
        const res = await fetch('/api/podcast');
        if (!res.ok) throw new Error("Errore API");
        tuttiPodcast = await res.json();

        // 2. Se l'utente è loggato, recupera i suoi "Mi Piace" per mostrare il cuore giusto
        if (utenteId) {
            const resLikes = await fetch(`/api/likes?utente_id=${utenteId}`);
            if (resLikes.ok) {
                const dataLikes = await resLikes.json();
                window.mieiLikesPodcast = dataLikes.podcast.map(p => p.id); 
            }
        }

        // 3. Genera la sezione "I Più Amati"
        mostraInEvidenza();

        // 4. Mostra tutti gli altri tramite la griglia filtrabile
        applicaFiltri(); 
    } catch (err) {
        console.error(err);
        const feed = document.getElementById('podcastFeed');
        if (feed) feed.innerHTML = "<p>Errore nel caricamento dei podcast.</p>";
    }
}

// ── MOSTRA IN EVIDENZA ──
function mostraInEvidenza() {
    const featuredSection = document.getElementById('featuredSection');
    const featuredFeed = document.getElementById('featuredFeed');

    if (!featuredSection || !featuredFeed) return;
    if (tuttiPodcast.length === 0) return;

    const topPodcast = tuttiPodcast.slice(0, 3);

    if (topPodcast.length > 0) {
        featuredSection.style.display = 'block';
        featuredFeed.innerHTML = topPodcast.map(p => creaCardHTML(p, true)).join('');
    }
}

// ── FILTRI PER LA GRIGLIA PRINCIPALE ──
window.applicaFiltri = function() {
    const searchEl = document.getElementById('searchTitolo');
    const catEl = document.getElementById('filterCategoria');
    const scuolaEl = document.getElementById('filterScuola');
    const fonteEl = document.getElementById('filterFonti');

    const search = searchEl ? searchEl.value.toLowerCase().trim() : "";
    const categoria = catEl ? catEl.value.toLowerCase().trim() : "";
    const scuola = scuolaEl ? scuolaEl.value.toLowerCase().trim() : "";
    const fonte = fonteEl ? fonteEl.value.toLowerCase().trim() : "";

    const filtrati = tuttiPodcast.filter(p => {
        const dbTitolo = p.titolo ? p.titolo.toLowerCase() : "";
        const dbDesc = p.descrizione ? p.descrizione.toLowerCase() : "";
        const dbCat = p.categoria ? p.categoria.toLowerCase().trim() : "";
        const dbScuola = p.scuola ? p.scuola.toLowerCase() : "";
        const dbFonte = p.fonti ? p.fonti.toLowerCase() : "";

        return (dbTitolo.includes(search) || dbDesc.includes(search)) &&
               (categoria === "" || dbCat === categoria) &&
               (scuola === "" || dbScuola.includes(scuola)) &&
               (fonte === "" || dbFonte.includes(fonte));
    });

    const feed = document.getElementById('podcastFeed');
    if (!feed) return;

    if (filtrati.length === 0) {
        feed.innerHTML = `<div class="empty-state"><div style="font-size:3rem; margin-bottom:10px;">🕵️‍♂️</div><h3>Nessun podcast trovato</h3><p>Prova a modificare i filtri di ricerca!</p></div>`;
    } else {
        feed.innerHTML = filtrati.map(p => creaCardHTML(p, false)).join('');
    }
};

// ── GENERAZIONE HTML CARD AGGIORNATA (CON TASTO PLAYLIST) ──
window.creaCardHTML = function(p, isFeatured) {
    const hasCover = p.cover_url;
    const coverStyle = hasCover ? `background-image: url('${p.cover_url}'); background-size: cover; background-position: center;` : '';
    const autore = p.username ? `@${p.username}` : 'Anonimo';
    const testoScuola = p.scuola ? ` · 🏫 ${p.scuola}` : '';
    const testoFonti = p.fonti ? `<div class="pod-fonti">📚 ${p.fonti}</div>` : '';

    const isLiked = window.mieiLikesPodcast.includes(p.id);
    const iconaCuore = isLiked ? '❤️' : '🤍';
    const stileBottone = isLiked ? 'background:rgba(255,77,109,0.12);border-color:rgba(255,77,109,0.3);color:var(--accent2);' : '';

    const cardClass = isFeatured ? 'pod-card featured-card' : 'pod-card';
    const badgeHTML = isFeatured ? `<div class="featured-badge">TOP 🔥</div>` : '';
    const btnId = isFeatured ? `btn-like-top-${p.id}` : `btn-like-${p.id}`;

    const waveHeights = [10,16,22,14,20,8,18,24,12,20,16,10,22];
    const waveHTML = `<div class="pod-cover-wave">${waveHeights.map(h => `<span style="height:${h}px"></span>`).join('')}</div>`;

    const coverContent = hasCover
        ? `<div class="pod-cover" style="${coverStyle}">${badgeHTML}${waveHTML}</div>`
        : `<div class="pod-cover pod-cover--empty">${badgeHTML}<span class="pod-cover--empty-icon">🎙️</span>${waveHTML}</div>`;

    return `
    <div class="${cardClass}">
        ${coverContent}
        <div class="pod-info">
            <div class="pod-category">${p.categoria || 'Generale'}</div>
            <div class="pod-title">${p.titolo}</div>
            <div class="pod-author">${autore}${testoScuola}</div>
            <div class="pod-desc">${p.descrizione || ''}</div>
            ${testoFonti}
            <audio controls class="pod-audio">
                <source src="${p.audio_url}" type="audio/mpeg">
                Il browser non supporta l'audio.
            </audio>
            
            <div class="actions-row">
                <button id="${btnId}" class="btn-like" style="${stileBottone}" onclick="event.preventDefault(); event.stopPropagation(); mettiMiPiace(${p.id}, '${btnId}')">
                    ${iconaCuore} Mi Piace
                </button>
                <button class="btn-playlist" onclick="event.preventDefault(); event.stopPropagation(); apriModalePlaylist('${p.id}')">
                    📁 Salva
                </button>
            </div>
            
        </div>
    </div>`;
};

// ── METTI / TOGLI MI PIACE ──
window.mettiMiPiace = async function(podcastId, btnIdToUpdate) {
    const utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi fare il login per mettere mi piace!");

    const btnNormal = document.getElementById(`btn-like-${podcastId}`);
    const btnTop = document.getElementById(`btn-like-top-${podcastId}`);

    try {
        const res = await fetch('/api/likes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ utente_id: utenteId, elemento_id: podcastId, tipo: 'podcast' })
        });

        if (res.ok) {
            const data = await res.json();
            const nowLiked = (data.action === 'liked' || data.action === 'added');
            
            if (nowLiked) {
                if (!window.mieiLikesPodcast.includes(podcastId)) window.mieiLikesPodcast.push(podcastId);
            } else {
                window.mieiLikesPodcast = window.mieiLikesPodcast.filter(id => id !== podcastId);
            }

            const aggiornaUIBottone = (bottoneHTML) => {
                if(!bottoneHTML) return;
                bottoneHTML.innerHTML = nowLiked ? '❤️ Mi Piace' : '🤍 Mi Piace';
                bottoneHTML.style.background = nowLiked ? 'rgba(255,77,109,0.12)' : 'transparent';
                bottoneHTML.style.borderColor = nowLiked ? 'rgba(255,77,109,0.3)' : 'var(--border2)';
                bottoneHTML.style.color = nowLiked ? 'var(--accent2)' : 'var(--muted)';
            };

            aggiornaUIBottone(btnNormal);
            aggiornaUIBottone(btnTop);

        } else {
            alert("Errore nell'aggiunta del like.");
        }
    } catch (err) {
        console.error(err);
        alert("Errore di connessione.");
    }
};

// Avvia tutto quando il DOM è pronto
document.addEventListener('DOMContentLoaded', initPodcast);