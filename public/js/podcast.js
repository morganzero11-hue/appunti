// ==========================================
// FUNZIONI HELPER
// ==========================================
function getCookieSafe(name) {
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// ==========================================
// VARIABILI GLOBALI
// ==========================================
let tuttiPodcast = []; 
let mieiLikesPodcast = []; // Qui salviamo gli ID dei podcast a cui abbiamo messo mi piace

// ==========================================
// 1. CARICAMENTO DEL FEED PODCAST
// ==========================================
async function initPodcast() {
    const btnLogin = document.getElementById('navLoginBtn');
    const utenteId = getCookieSafe('utente_id');
    
    // Nasconde il tasto login se l'utente è loggato
    if (btnLogin && getCookieSafe('username')) btnLogin.style.display = 'none';

    try {
        // A. Recupera tutti i podcast dal database
        const res = await fetch('/api/podcast');
        if (!res.ok) throw new Error("Errore API");
        tuttiPodcast = await res.json();

        // B. Se l'utente è loggato, recuperiamo i suoi "Mi Piace" per mostrare il cuore giusto
        if (utenteId) {
            const resLikes = await fetch(`/api/likes?utente_id=${utenteId}`);
            if (resLikes.ok) {
                const dataLikes = await resLikes.json();
                // Estraiamo solo gli ID dei podcast piaciuti e li salviamo nell'array
                mieiLikesPodcast = dataLikes.podcast.map(p => p.id);
            }
        }

        // Avviamo i filtri che, essendo vuoti, mostreranno tutto
        applicaFiltri(); 
    } catch (err) {
        console.error(err);
        document.getElementById('podcastFeed').innerHTML = "<p>Errore nel caricamento dei podcast.</p>";
    }
}

// ==========================================
// 2. FUNZIONE PER FILTRARE
// ==========================================
function applicaFiltri() {
    const search = document.getElementById('searchTitolo').value.toLowerCase().trim();
    const categoria = document.getElementById('filterCategoria').value.toLowerCase().trim();
    const scuola = document.getElementById('filterScuola').value.toLowerCase().trim();
    const fonte = document.getElementById('filterFonti').value.toLowerCase().trim();

    const filtrati = tuttiPodcast.filter(p => {
        // Prepariamo i dati del DB (evitando errori se un campo è vuoto)
        const dbTitolo = p.titolo ? p.titolo.toLowerCase() : "";
        const dbDesc = p.descrizione ? p.descrizione.toLowerCase() : "";
        const dbCat = p.categoria ? p.categoria.toLowerCase().trim() : "";
        const dbScuola = p.scuola ? p.scuola.toLowerCase() : "";
        const dbFonte = p.fonti ? p.fonti.toLowerCase() : "";

        // Condizioni di filtro
        const matchTitolo = dbTitolo.includes(search) || dbDesc.includes(search);
        const matchCategoria = categoria === "" || dbCat === categoria;
        const matchScuola = scuola === "" || dbScuola.includes(scuola);
        const matchFonte = fonte === "" || dbFonte.includes(fonte);
        
        return matchTitolo && matchCategoria && matchScuola && matchFonte;
    });

    disegnaPodcast(filtrati);
}

// ==========================================
// 3. DISEGNA LE CARD NELLA PAGINA
// ==========================================
function disegnaPodcast(dati) {
    const feed = document.getElementById('podcastFeed');
    
    if (dati.length === 0) {
        feed.innerHTML = `
        <div class="empty-state">
            <div style="font-size:3rem; margin-bottom:10px;">🕵️‍♂️</div>
            <h3>Nessun podcast trovato</h3>
            <p>Prova a modificare i filtri di ricerca!</p>
        </div>`;
        return;
    }

    feed.innerHTML = dati.map(p => {
        const cover = p.cover_url ? `url('${p.cover_url}')` : 'linear-gradient(45deg, #1c1c24, #2c2c38)';
        const autore = p.username ? `@${p.username}` : 'Anonimo';
        
        // Testi opzionali
        const testoScuola = p.scuola ? ` | 🏫 ${p.scuola}` : '';
        const testoFonti = p.fonti ? `<div style="font-size:0.8rem; color:var(--accent); margin-bottom: 15px;">📚 Fonti: ${p.fonti}</div>` : '';
        
        // Controllo se abbiamo già messo Mi Piace a questo podcast
        const isLiked = mieiLikesPodcast.includes(p.id);
        const iconaCuore = isLiked ? '❤️' : '🤍';
        const stileBottone = isLiked ? 'background: rgba(255,77,109,0.1);' : '';

        return `
        <div class="pod-card">
            <div class="pod-cover" style="background-image: ${cover}"></div>
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

                <button id="btn-like-${p.id}" class="btn-like" style="${stileBottone}" onclick="mettiMiPiace(${p.id})">${iconaCuore} Mi Piace</button>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// 4. METTI / TOGLI MI PIACE (TOGGLE)
// ==========================================
async function mettiMiPiace(podcastId) {
    const utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi fare il login per mettere mi piace!");

    const btn = document.getElementById(`btn-like-${podcastId}`);

    try {
        const res = await fetch('/api/likes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                utente_id: utenteId, 
                elemento_id: podcastId, 
                tipo: 'podcast' 
            })
        });

        if (res.ok) {
            const data = await res.json();
            
            // Se l'API ha risposto 'liked' o 'added', coloriamo il cuore
            if (data.action === 'liked' || data.action === 'added') {
                btn.innerHTML = '❤️ Mi Piace';
                btn.style.background = 'rgba(255,77,109,0.1)';
                mieiLikesPodcast.push(podcastId); // Aggiungiamo alla nostra lista
            } else {
                // Altrimenti, svuotiamo il cuore
                btn.innerHTML = '🤍 Mi Piace';
                btn.style.background = 'transparent';
                mieiLikesPodcast = mieiLikesPodcast.filter(id => id !== podcastId); // Rimuoviamo dalla lista
            }
        } else {
            alert("Errore nell'aggiunta del like.");
        }
    } catch (err) {
        console.error(err);
        alert("Errore di connessione.");
    }
}

// Avvio alla fine del caricamento
document.addEventListener('DOMContentLoaded', initPodcast);