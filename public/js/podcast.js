function getCookieSafe(name) {
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

let tuttiPodcast = []; 
let mieiLikesPodcast = []; // Salveremo qui gli ID dei podcast che ci piacciono

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
                mieiLikesPodcast = dataLikes.podcast.map(p => p.id); // Estrae solo gli ID
            }
        }

        // 3. Genera la sezione "I Più Amati" (simuliamo un piccolo calcolo di gradimento)
        mostraInEvidenza();

        // 4. Mostra tutti gli altri tramite la griglia filtrabile
        applicaFiltri(); 
    } catch (err) {
        console.error(err);
        document.getElementById('podcastFeed').innerHTML = "<p>Errore nel caricamento dei podcast.</p>";
    }
}

// ── NUOVA FUNZIONE: MOSTRA IN EVIDENZA ──
function mostraInEvidenza() {
    const featuredSection = document.getElementById('featuredSection');
    const featuredFeed = document.getElementById('featuredFeed');

    if (tuttiPodcast.length === 0) return;

    // Per mostrare i top, prendiamo i primi 3 più recenti (o potresti ordinarli per popolarità se l'API lo permette)
    // In questo caso, prendiamo i primi 3 caricati (che di solito sono in cima) per dare un po' di dinamismo.
    const topPodcast = tuttiPodcast.slice(0, 3);

    if (topPodcast.length > 0) {
        featuredSection.style.display = 'block';
        featuredFeed.innerHTML = topPodcast.map(p => creaCardHTML(p, true)).join('');
    }
}

// ── FILTRI PER LA GRIGLIA PRINCIPALE ──
function applicaFiltri() {
    const search = document.getElementById('searchTitolo').value.toLowerCase().trim();
    const categoria = document.getElementById('filterCategoria').value.toLowerCase().trim();
    const scuola = document.getElementById('filterScuola').value.toLowerCase().trim();
    const fonte = document.getElementById('filterFonti').value.toLowerCase().trim();

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
    if (filtrati.length === 0) {
        feed.innerHTML = `<div class="empty-state"><div style="font-size:3rem; margin-bottom:10px;">🕵️‍♂️</div><h3>Nessun podcast trovato</h3><p>Prova a modificare i filtri di ricerca!</p></div>`;
    } else {
        feed.innerHTML = filtrati.map(p => creaCardHTML(p, false)).join('');
    }
}

// ── FUNZIONE DI SUPPORTO PER GENERARE L'HTML DELLA CARD ──
function creaCardHTML(p, isFeatured) {
    const cover = p.cover_url ? `url('${p.cover_url}')` : 'linear-gradient(45deg, #1c1c24, #2c2c38)';
    const autore = p.username ? `@${p.username}` : 'Anonimo';
    const testoScuola = p.scuola ? ` | 🏫 ${p.scuola}` : '';
    const testoFonti = p.fonti ? `<div style="font-size:0.8rem; color:var(--accent); margin-bottom: 15px;">📚 Fonti: ${p.fonti}</div>` : '';
    
    // Verifica se questo podcast è tra i miei mi piace
    const isLiked = mieiLikesPodcast.includes(p.id);
    const iconaCuore = isLiked ? '❤️' : '🤍';
    const stileBottone = isLiked ? 'background: rgba(255,77,109,0.1);' : '';

    // Classi extra se è nella sezione in evidenza
    const cardClass = isFeatured ? 'pod-card featured-card' : 'pod-card';
    const badgeHTML = isFeatured ? `<div class="featured-badge">TOP 🔥</div>` : '';

    // Per renderli unici nell'HTML (visto che potrebbero apparire sia sopra che sotto)
    const btnId = isFeatured ? `btn-like-top-${p.id}` : `btn-like-${p.id}`;

    return `
    <div class="${cardClass}">
        <div class="pod-cover" style="background-image: ${cover}">
            ${badgeHTML}
        </div>
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

            <div style="display: flex; align-items: center;">
                <button id="${btnId}" class="btn-like" style="${stileBottone}" onclick="mettiMiPiace(${p.id}, '${btnId}')">${iconaCuore} Mi Piace</button>
            </div>
        </div>
    </div>`;
}

// ── METTI / TOGLI MI PIACE ──
async function mettiMiPiace(podcastId, btnIdToUpdate) {
    const utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi fare il login per mettere mi piace!");

    // Troviamo il bottone specifico cliccato
    const btn = document.getElementById(btnIdToUpdate);
    
    // Troviamo anche l'eventuale "gemello" (se clicchi sotto, si deve aggiornare anche quello sopra)
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
            
            // Aggiorniamo la lista locale
            if (nowLiked) {
                mieiLikesPodcast.push(podcastId);
            } else {
                mieiLikesPodcast = mieiLikesPodcast.filter(id => id !== podcastId);
            }

            // Funzione interna per aggiornare graficamente i bottoni
            const aggiornaUIBottone = (bottoneHTML) => {
                if(!bottoneHTML) return;
                bottoneHTML.innerHTML = nowLiked ? '❤️ Mi Piace' : '🤍 Mi Piace';
                bottoneHTML.style.background = nowLiked ? 'rgba(255,77,109,0.1)' : 'transparent';
            };

            // Aggiorna entrambi i bottoni se presenti
            aggiornaUIBottone(btnNormal);
            aggiornaUIBottone(btnTop);

        } else {
            alert("Errore nell'aggiunta del like.");
        }
    } catch (err) {
        console.error(err);
        alert("Errore di connessione.");
    }
}

document.addEventListener('DOMContentLoaded', initPodcast);