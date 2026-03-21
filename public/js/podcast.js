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

// 1. CARICAMENTO DEL FEED PODCAST
async function initPodcast() {
    const btnLogin = document.getElementById('navLoginBtn');
    if (btnLogin && getCookieSafe('username')) btnLogin.style.display = 'none';

    const feed = document.getElementById('podcastFeed');
    try {
        const res = await fetch('/api/podcast');
        if (!res.ok) throw new Error("Errore API");
        const data = await res.json();
        
        if (data.length === 0) {
            feed.innerHTML = `
            <div class="empty-state">
                <div style="font-size:3rem; margin-bottom:10px;">🎙️</div>
                <h3>Nessun podcast disponibile</h3>
                <p>Sii il primo a registrare una lezione!</p>
            </div>`;
            return;
        }

        feed.innerHTML = data.map(p => {
            const cover = p.cover_url ? `url('${p.cover_url}')` : 'linear-gradient(45deg, #1c1c24, #2c2c38)';
            const autore = p.username ? `@${p.username}` : 'Anonimo';
            
            return `
            <div class="pod-card">
                <div class="pod-cover" style="background-image: ${cover}"></div>
                <div class="pod-info">
                    <div class="pod-category">${p.categoria || 'Generale'}</div>
                    <div class="pod-title">${p.titolo}</div>
                    <div class="pod-author">${autore}</div>
                    <div class="pod-desc">${p.descrizione || ''}</div>
                    
                    <audio controls class="pod-audio">
                        <source src="${p.audio_url}" type="audio/mpeg">
                        Il browser non supporta l'audio.
                    </audio>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error(err);
        feed.innerHTML = "<p>Errore nel caricamento dei podcast.</p>";
    }
}

// 2. SALVATAGGIO NUOVO PODCAST
async function salvaPodcast() {
    const utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi fare il login per caricare un podcast!");

    const titolo = document.getElementById('podTitolo').value.trim();
    const desc = document.getElementById('podDesc').value.trim();
    const categoria = document.getElementById('podCategoria').value;
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