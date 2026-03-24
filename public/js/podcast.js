// HELPER COOKIE E TESTO FILE
function getCookieSafe(name) {
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function aggiornaTestoFile(inputId, labelId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if (input.files && input.files.length > 0) {
        label.innerHTML = `✅ <strong>${input.files[0].name}</strong>`;
        label.style.color = "var(--accent)";
    }
}

// Array globale per salvare i podcast e poterli filtrare velocemente
let tuttiPodcast = []; 

// 1. CARICAMENTO DEL FEED PODCAST
async function initPodcast() {
    const btnLogin = document.getElementById('navLoginBtn');
    if (btnLogin && getCookieSafe('username')) btnLogin.style.display = 'none';

    try {
        const res = await fetch('/api/podcast');
        if (!res.ok) throw new Error("Errore API");
        
        tuttiPodcast = await res.json();
        applicaFiltri(); // Avvia i filtri per mostrare i podcast caricati

    } catch (err) {
        console.error(err);
        document.getElementById('podcastFeed').innerHTML = "<p>Errore nel caricamento dei podcast.</p>";
    }
}

// 2. FUNZIONE PER FILTRARE (VERSIONE POTENZIATA)
function applicaFiltri() {
    const search = document.getElementById('searchTitolo').value.toLowerCase().trim();
    const categoria = document.getElementById('filterCategoria').value.toLowerCase().trim();
    const scuola = document.getElementById('filterScuola').value.toLowerCase().trim();
    const fonte = document.getElementById('filterFonti').value.toLowerCase().trim();

    const filtrati = tuttiPodcast.filter(p => {
        // Prepariamo i dati del database trasformandoli tutti in minuscolo per il confronto
        const dbTitolo = p.titolo ? p.titolo.toLowerCase() : "";
        const dbDesc = p.descrizione ? p.descrizione.toLowerCase() : "";
        const dbCat = p.categoria ? p.categoria.toLowerCase().trim() : "";
        const dbScuola = p.scuola ? p.scuola.toLowerCase() : "";
        const dbFonte = p.fonti ? p.fonti.toLowerCase() : "";

        // Verifichiamo le corrispondenze
        const matchTitolo = dbTitolo.includes(search) || dbDesc.includes(search);
        const matchCategoria = categoria === "" || dbCat === categoria;
        const matchScuola = scuola === "" || dbScuola.includes(scuola);
        const matchFonte = fonte === "" || dbFonte.includes(fonte);
        
        return matchTitolo && matchCategoria && matchScuola && matchFonte;
    });

    disegnaPodcast(filtrati);
}

// 3. DISEGNA LE CARD NELLA PAGINA
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

// 4. METTI MI PIACE
async function mettiMiPiace(podcastId) {
    const utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi fare il login per mettere mi piace!");

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
            alert("❤️ Hai messo mi piace a questo podcast!");
        } else {
            alert("Errore nell'aggiunta del like.");
        }
    } catch (err) {
        console.error(err);
    }
}

// 5. SALVATAGGIO NUOVO PODCAST
async function salvaPodcast() {
    const utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi fare il login per caricare un podcast!");

    const titolo = document.getElementById('podTitolo').value.trim();
    const desc = document.getElementById('podDesc').value.trim();
    const categoria = document.getElementById('podCategoria').value;
    const scuola = document.getElementById('podScuola').value.trim(); // Scuola
    const fonti = document.getElementById('podFonti').value.trim();   // Fonti
    const audioIn = document.getElementById('podAudio').files[0];
    const coverIn = document.getElementById('podCover').files[0];
    const btn = document.getElementById('btnSalvaPod');

    if (!titolo) return alert("Inserisci il titolo del podcast!");
    if (!audioIn) return alert("Devi caricare un file audio!");

    btn.textContent = "⏳ Caricamento...";
    btn.disabled = true;

    try {
        // Upload Audio
        const resAudio = await fetch(`/api/upload?filename=podcast_${Date.now()}.mp3`, {
            method: 'POST', body: audioIn
        });
        if(!resAudio.ok) throw new Error("Errore upload audio");
        const dataAudio = await resAudio.json();

        // Upload Cover
        let coverUrl = null;
        if (coverIn) {
            const resCover = await fetch(`/api/upload?filename=podcover_${Date.now()}`, {
                method: 'POST', body: coverIn
            });
            if(resCover.ok) {
                const dataCover = await resCover.json();
                coverUrl = dataCover.url;
            }
        }

        // Salva in DB
        const resDb = await fetch('/api/podcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                utente_id: utenteId,
                titolo: titolo,
                descrizione: desc,
                categoria: categoria,
                scuola: scuola,
                fonti: fonti,
                audio_url: dataAudio.url,
                cover_url: coverUrl
            })
        });

        if (!resDb.ok) throw new Error("Errore DB");

        alert("✅ Podcast pubblicato con successo!");
        window.location.reload();

    } catch (err) {
        console.error(err);
        alert("❌ Errore durante il caricamento!");
    } finally {
        btn.textContent = "🚀 Pubblica";
        btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', initPodcast);