function getCookieSafe(name) {
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

let tuttiPodcast = []; 

async function initPodcast() {
    const btnLogin = document.getElementById('navLoginBtn');
    if (btnLogin && getCookieSafe('username')) btnLogin.style.display = 'none';

    try {
        const res = await fetch('/api/podcast');
        if (!res.ok) throw new Error("Errore API");
        
        tuttiPodcast = await res.json();
        applicaFiltri(); 
    } catch (err) {
        console.error(err);
        document.getElementById('podcastFeed').innerHTML = "<p>Errore nel caricamento dei podcast.</p>";
    }
}

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

        const matchTitolo = dbTitolo.includes(search) || dbDesc.includes(search);
        const matchCategoria = categoria === "" || dbCat === categoria;
        const matchScuola = scuola === "" || dbScuola.includes(scuola);
        const matchFonte = fonte === "" || dbFonte.includes(fonte);
        
        return matchTitolo && matchCategoria && matchScuola && matchFonte;
    });

    disegnaPodcast(filtrati);
}

function disegnaPodcast(dati) {
    const feed = document.getElementById('podcastFeed');
    
    if (dati.length === 0) {
        feed.innerHTML = `<div class="empty-state"><div style="font-size:3rem; margin-bottom:10px;">🕵️‍♂️</div><h3>Nessun podcast trovato</h3><p>Prova a modificare i filtri di ricerca!</p></div>`;
        return;
    }

    feed.innerHTML = dati.map(p => {
        const cover = p.cover_url ? `url('${p.cover_url}')` : 'linear-gradient(45deg, #1c1c24, #2c2c38)';
        const autore = p.username ? `@${p.username}` : 'Anonimo';
        const testoScuola = p.scuola ? ` | 🏫 ${p.scuola}` : '';
        const testoFonti = p.fonti ? `<div style="font-size:0.8rem; color:var(--accent); margin-bottom: 15px;">📚 Fonti: ${p.fonti}</div>` : '';
        
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

                <button class="btn-like" onclick="mettiMiPiace(${p.id})">❤️ Mi Piace</button>
            </div>
        </div>`;
    }).join('');
}

async function mettiMiPiace(podcastId) {
    const utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi fare il login per mettere mi piace!");

    try {
        const res = await fetch('/api/likes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ utente_id: utenteId, elemento_id: podcastId, tipo: 'podcast' })
        });

        if (res.ok) alert("❤️ Hai salvato questo podcast nei tuoi preferiti!");
        else alert("Errore nell'aggiunta del like.");
    } catch (err) {
        console.error(err);
    }
}

document.addEventListener('DOMContentLoaded', initPodcast);