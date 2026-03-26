function getCookieSafe(name) {
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

let tuttiPodcast = []; 
window.mieiLikesPodcast = []; 

async function initPodcast() {
    const btnLogin = document.getElementById('navLoginBtn');
    const utenteId = getCookieSafe('utente_id');
    
    if (btnLogin && getCookieSafe('username')) btnLogin.style.display = 'none';

    try {
        const res = await fetch('/api/podcast');
        if (!res.ok) throw new Error("Errore API");
        tuttiPodcast = await res.json();

        if (utenteId) {
            const resLikes = await fetch(`/api/likes?utente_id=${utenteId}`);
            if (resLikes.ok) {
                const dataLikes = await resLikes.json();
                window.mieiLikesPodcast = dataLikes.podcast.map(p => p.id); 
            }
        }

        mostraInEvidenza();
        applicaFiltri(); 
    } catch (err) {
        console.error(err);
        const feed = document.getElementById('podcastFeed');
        if (feed) feed.innerHTML = "<p>Errore nel caricamento dei podcast.</p>";
    }
}

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
                <button id="${btnId}" class="btn-like" style="${stileBottone}" onclick="event.preventDefault(); event.stopPropagation(); mettiMiPiace('${p.id}', '${btnId}')">
                    ${iconaCuore} Mi Piace
                </button>
                <button class="btn-playlist" onclick="event.preventDefault(); event.stopPropagation(); apriModalePlaylist('${p.id}')">
                    📁 Salva
                </button>
            </div>
            
        </div>
    </div>`;
};

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

let currentPodcastPerPlaylist = null;

window.apriModalePlaylist = async function(podcastId) {
    const utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert('Devi fare il login per usare le playlist!');

    currentPodcastPerPlaylist = podcastId;

    let modale = document.getElementById('modalPlaylistPodcast');
    if (!modale) {
        modale = document.createElement('div');
        modale.id = 'modalPlaylistPodcast';
        modale.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.7);
            display:flex; align-items:center; justify-content:center; z-index:9999;
        `;
        modale.innerHTML = `
            <div style="background:var(--surface, #1a1a1a); border-radius:16px; padding:24px; width:90%; max-width:380px;">
                <h3 style="margin:0 0 16px; color:var(--text, #fff);">📂 Salva in playlist</h3>
                <div id="elencoPlaylistsPodcast">Caricamento...</div>
                <button onclick="document.getElementById('modalPlaylistPodcast').style.display='none'" 
                    style="margin-top:16px; width:100%; padding:10px; border-radius:8px;
                           background:transparent; border:1px solid #444; color:#aaa; cursor:pointer;">
                    Annulla
                </button>
            </div>
        `;
        document.body.appendChild(modale);
    } else {
        modale.style.display = 'flex';
    }

    const container = document.getElementById('elencoPlaylistsPodcast');

    try {
        const res = await fetch(`/api/playlists?utente_id=${utenteId}`);
        const playlists = await res.json();

        if (!playlists.length) {
            container.innerHTML = '<p style="color:#888; text-align:center;">Nessuna playlist trovata.</p>';
            return;
        }

        container.innerHTML = playlists.map(pl => `
            <div onclick="salvaPodcastInPlaylist('${pl.id}')" style="
                padding:12px 16px; border-radius:10px; margin-bottom:8px;
                background:#ffffff0d; cursor:pointer; display:flex;
                justify-content:space-between; align-items:center;
                border:1px solid #ffffff11;
            ">
                <span style="color:var(--text,#fff)">📂 ${pl.titolo}</span>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p style="color:#888;">Errore nel caricamento.</p>';
    }
};

window.salvaPodcastInPlaylist = async function(playlistId) {
    if (!currentPodcastPerPlaylist) return;
    
    try {
        const res = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playlist_id: playlistId,
                podcast_id: currentPodcastPerPlaylist,
                tipo: 'podcast'
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('modalPlaylistPodcast').style.display = 'none';
            alert('✅ Podcast salvato nella playlist!');
        } else {
            console.error("Errore del server:", data);
            alert(`⚠️ Errore dal server: ${data.error}`);
        }
    } catch (err) {
        console.error("Errore Javascript:", err);
        alert('❌ Controlla la Console (F12) per i dettagli.');
    }
};

document.addEventListener('DOMContentLoaded', initPodcast);