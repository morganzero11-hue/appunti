/* ── HELPER COOKIE ── */
function getCookieSafe(name) {
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

let tuttiAppunti = [];
let activeMateria = 'Tutte';
let activeLivello = 'Tutti'; // Nuova variabile per tenere traccia del livello
let searchQuery = '';
let currentAppuntoPerPlaylist = null; 

/* ── STATO AUDIO ── */
let currentAudio = new Audio();
let isMuted = false;

window.toggleMute = function(event) {
    if (event) event.stopPropagation();
    isMuted = !isMuted;
    currentAudio.muted = isMuted;
    
    document.querySelectorAll('.card-audio-btn').forEach(btn => {
        btn.textContent = isMuted ? "🔇" : "🔊";
    });
}

/* ── INIT: Recupera dal server ── */
async function initEsplora() {
    try {
        const res = await fetch('/api/appunti');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        tuttiAppunti = await res.json();
        
        // Se non abbiamo ancora definito la funzione dal file HTML, usiamo quella base
        if (typeof window.applicaFiltriCombinati !== 'function') {
            applicaFiltriReale();
        }
    } catch (err) {
        console.error('Errore recupero appunti:', err);
        mostraErrore();
    }
}

/* ── GESTIONE FILTRI E RICERCA ── */

// Questa funzione viene chiamata dal file HTML quando si cambiano le tendine
window.applicaFiltriCombinati = function(materiaSelezionata, livelloSelezionato) {
    if (materiaSelezionata) activeMateria = materiaSelezionata;
    if (livelloSelezionato) activeLivello = livelloSelezionato;
    
    // Aggiorno visivamente i bottoncini su PC (se esistono e se la materia non è null)
    if (materiaSelezionata) {
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            chip.classList.remove('active');
            // Cerca il bottone che ha come testo (escludendo l'icona iniziale) la materia selezionata
            if (chip.textContent.includes(materiaSelezionata)) {
                chip.classList.add('active');
            }
        });
    }

    applicaFiltriReale();
}

window.onSearchInput = function(event) {
    searchQuery = event.target.value.toLowerCase();
    applicaFiltriReale();
}

// Questa è la funzione che esegue effettivamente il filtro sui dati
function applicaFiltriReale() {
    let appuntiFiltrati = tuttiAppunti;

    // 1. Filtro per Materia
    if (activeMateria !== 'Tutte') {
        appuntiFiltrati = appuntiFiltrati.filter(a => 
            a.materia && a.materia.toLowerCase() === activeMateria.toLowerCase()
        );
    }

    // 2. Filtro per Livello
    if (activeLivello !== 'Tutti') {
        appuntiFiltrati = appuntiFiltrati.filter(a => 
            a.livello && a.livello.toLowerCase() === activeLivello.toLowerCase()
        );
    }

    // 3. Filtro per Ricerca testuale
    if (searchQuery.trim() !== '') {
        appuntiFiltrati = appuntiFiltrati.filter(a => 
            a.titolo && a.titolo.toLowerCase().includes(searchQuery)
        );
    }

    renderFeed(appuntiFiltrati);
}

/* ── FORMATTA DATA ── */
function formatData(dateStr) {
    if (!dateStr) return 'Recente';
    const d = new Date(dateStr);
    if (isNaN(d)) return 'Recente';
    const diff = Math.floor((new Date() - d) / 1000);
    if (diff < 60)     return 'adesso';
    if (diff < 3600)   return `${Math.floor(diff / 60)} min fa`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)} ore fa`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} giorni fa`;
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

/* ── SALVA IL MI PIACE ── */
window.toggleLike = async function(appuntoId, btnElement) {
    let utenteId = getCookieSafe('utente_id');
    if (!utenteId) return window.toast('⚠️ Devi fare il login per salvare gli appunti!');

    try {
        const res = await fetch('/api/likes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ utente_id: utenteId, elemento_id: appuntoId, tipo: 'appunto' })
        });
        if (!res.ok) throw new Error('Errore nel salvataggio del like');
        const data = await res.json();

        if (data.action === 'liked' || data.action === 'added') {
            btnElement.classList.add('liked');
            btnElement.querySelector('.side-btn__icon').textContent = '❤️';
            window.toast('❤️ Salvato nei tuoi Mi Piace!');
        } else {
            btnElement.classList.remove('liked');
            btnElement.querySelector('.side-btn__icon').textContent = '🤍';
            window.toast('💔 Rimosso dai Mi Piace');
        }
    } catch (err) {
        console.error(err);
        window.toast('❌ Errore di connessione. Riprova.');
    }
}

/* ── APRI MODALE PLAYLIST ── */
window.apriModalPlaylist = async function(appuntoId) {
    let utenteId = getCookieSafe('utente_id');
    if (!utenteId) return window.toast('⚠️ Devi fare il login per usare le playlist!');

    currentAppuntoPerPlaylist = appuntoId; 
    const container = document.getElementById('elencoPlaylistsModale');
    container.innerHTML = '<p style="color:var(--muted); text-align:center;">Caricamento playlist...</p>';
    
    document.getElementById('modalPlaylist').classList.add('open');

    try {
        const res = await fetch(`/api/playlists?utente_id=${utenteId}`);
        if (!res.ok) throw new Error('Errore API');
        const playlists = await res.json();

        if (playlists.length === 0) {
            container.innerHTML = `<p style="color:var(--muted); text-align:center; padding: 20px;">Non hai ancora creato nessuna playlist.</p>`;
            return;
        }

        container.innerHTML = playlists.map(pl => `
            <div class="playlist-item" onclick="salvaAppuntoInPlaylist(${pl.id})">
                <span class="playlist-item-title">📂 ${pl.titolo}</span>
                <span class="playlist-item-count">${pl.numero_appunti || 0} appunti</span>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:var(--muted); text-align:center;">Errore nel caricamento delle playlist.</p>';
    }
}

window.chiudiModalPlaylist = function() {
    document.getElementById('modalPlaylist').classList.remove('open');
    currentAppuntoPerPlaylist = null;
}

/* ── SALVA NELLA PLAYLIST ── */
window.salvaAppuntoInPlaylist = async function(playlistId) {
    if (!currentAppuntoPerPlaylist) return;

    try {
        const res = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlist_id: playlistId, appunto_id: currentAppuntoPerPlaylist })
        });
        
        if (res.ok) {
            window.toast('✅ Appunto salvato nella playlist!');
            chiudiModalPlaylist();
        } else {
            const data = await res.json();
            window.toast(`⚠️ ${data.error || 'Errore nel salvataggio.'}`);
        }
    } catch (err) {
        console.error(err);
        window.toast('❌ Errore di connessione. Riprova.');
    }
}

/* ── SCARICA TUTTE LE IMMAGINI ── */
window.scaricaTutteLeImmagini = async function(urlsString, titolo) {
    if (!urlsString) return;
    const urls = urlsString.split(',');
    
    if (urls.length > 1) {
        window.toast(`⏳ Download di ${urls.length} file in corso... attendi.`);
    } else {
        window.toast(`⏳ Download in corso...`);
    }

    for (let i = 0; i < urls.length; i++) {
        try {
            const response = await fetch(urls[i]);
            const blob = await response.blob();
            
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            
            const nomePulito = (titolo || 'Appunto').replace(/[^a-zA-Z0-9]/g, '_');
            a.download = `Appunto_${nomePulito}_pag_${i + 1}.png`; 
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            window.URL.revokeObjectURL(blobUrl);
            
            await new Promise(resolve => setTimeout(resolve, 600));
        } catch (err) {
            console.error("Errore nel download della pagina " + (i+1), err);
        }
    }
    
    if (urls.length > 1) {
        window.toast(`✅ Download di tutti i file completato!`);
    }
};

/* ── RENDER FEED ── */
function renderFeed(lista) {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';

    if (!lista || lista.length === 0) {
        feed.innerHTML = `
            <div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--muted);text-align:center;padding:32px">
                <div style="font-size:3rem">📭</div>
                <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:900;color:var(--text)">Nessun appunto trovato</div>
                <div style="font-size:0.88rem;max-width:280px;line-height:1.6">Non ci sono risultati per questa ricerca o materia.</div>
                <button onclick="apriModal()" style="margin-top:8px;background:var(--accent);color:#0f0f0f;border:none;border-radius:10px;padding:10px 24px;font-family:'Cabinet Grotesk',sans-serif;font-size:0.88rem;font-weight:800;cursor:pointer;">✦ Carica un file</button>
            </div>`;
        return;
    }

    const COLORI = {
        "Matematica":"#f97316", "Scienze":"#22c55e", "Fisica":"#3b82f6",
        "Chimica":"#a855f7", "Storia":"#ec4899", "Geografia":"#14b8a6",
        "Italiano":"#f59e0b", "Inglese":"#6366f1", "Informatica":"#ef4444",
        "Arte":"#0ea5e9", "Biologia":"#059669", "Geometria":"#7c3aed", "Altro":"#888888"
    };
    const ICONE = {
        "Matematica":"∑", "Scienze":"🔬", "Fisica":"⚛️", "Chimica":"🧪", "Storia":"📖",
        "Geografia":"🌍", "Italiano":"✏️", "Inglese":"🗣️", "Informatica":"💻",
        "Arte":"🎨", "Biologia":"🧬", "Geometria":"📐", "Altro":"📌"
    };
    const avatarColori = ['#7c3aed','#ec4899','#3b82f6','#22c55e','#f97316','#0ea5e9','#ef4444'];

    lista.forEach(a => {
        const mc = COLORI[a.materia] || '#888';
        const icona = ICONE[a.materia] || '📄';
        
        const username = a.username || a.utente_id || 'Anonimo'; 
        const autore = String(a.nome ? `${a.nome} ${a.cognome || ''}` : username);
        const iniziale = autore[0].toUpperCase();
        const ac = avatarColori[autore.charCodeAt(0) % avatarColori.length];
        const data_str = formatData(a.data_caricamento);
        const titoloSafe = a.titolo ? a.titolo.replace(/'/g, "\\'").replace(/"/g, '&quot;') : 'Appunto';

        // Estrai il livello da stampare a schermo
        let testoLivello = '';
        if (a.livello) {
            if (a.livello === 'medie') testoLivello = 'Scuole Medie';
            if (a.livello === 'superiori') testoLivello = 'Scuole Superiori';
            if (a.livello === 'universita') testoLivello = 'Università';
        }

        const fotoProfiloHTML = a.foto_profilo_url 
            ? `<img src="${a.foto_profilo_url}" alt="Foto" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<span style="color:${ac}; font-family: 'Fraunces', serif;">${iniziale}</span>`;

        const immagini = a.file_url ? a.file_url.split(',') : [];
        let sliderHTML = `<div class="card__slider" id="slider-${a.id}">`;
        let dotsHTML = `<div class="slider-dots" id="dots-${a.id}">`;
        
        if (immagini.length > 0) {
            immagini.forEach((img, i) => {
                sliderHTML += `
                    <div class="slider__item">
                        <img src="${img}" class="card__media-img" loading="lazy">
                        <div class="page-indicator">${i + 1} / ${immagini.length}</div>
                    </div>`;
                dotsHTML += `<div class="dot ${i === 0 ? 'active' : ''}" onclick="document.getElementById('slider-${a.id}').scrollTo({left: document.getElementById('slider-${a.id}').clientWidth * ${i}, behavior: 'smooth'})"></div>`;
            });
        } else {
            sliderHTML += `
                <div class="card__no-media">
                    <div class="card__no-media-icon">${icona}</div>
                    <div style="font-weight:700">Anteprima non disponibile</div>
                </div>`;
        }
        sliderHTML += `</div>`;
        dotsHTML += `</div>`;

        const bgImg = a.cover_url || (immagini.length > 0 ? immagini[0] : '');
        const bgSfumato = bgImg
            ? `background: url('${bgImg}') center/cover no-repeat;`
            : `background: radial-gradient(ellipse at center, ${mc}66 0%, #0a0a0a 100%);`;

        const card = document.createElement('div');
        card.className = 'card';
        card.id = `appunto-${a.id}`;
        if (a.audio_url) card.setAttribute('data-audio', a.audio_url);
        
        card.innerHTML = `
            <div class="card__bg" style="${bgSfumato}"></div>
            
            <div class="card__media-container" style="border: 1px solid ${mc}44;">
                ${sliderHTML}
                
                ${immagini.length > 1 ? dotsHTML : ''}

                ${a.audio_url ? `<button class="card-audio-btn" title="Attiva/Disattiva Audio" onclick="toggleMute(event)">${isMuted ? '🔇' : '🔊'}</button>` : ''}

                <div class="card__content">
                    <div class="card__meta">
                        <div>
                            <div class="card__author">@${username}</div>
                            <div class="card__school">${data_str}</div>
                        </div>
                    </div>
                    <div class="card__subject" style="color:${mc}; border-color:${mc}66;">
                        ${icona} ${a.materia || 'Generale'} ${testoLivello ? ` • ${testoLivello}` : ''}
                    </div>
                    <div class="card__title">${a.titolo || 'Senza titolo'}</div>
                    <div class="card__actions">
                        ${immagini.length > 0 ? `<button onclick="scaricaTutteLeImmagini('${a.file_url}', '${titoloSafe}')" class="card__btn">📥 Apri/Scarica Tutto</button>` : ''}
                    </div>
                </div>
            </div>

            <div class="card__sidebar">
                <a href="utenti.html?user=${encodeURIComponent(username)}" class="sidebar-avatar" style="background:${ac}22; border-color: ${ac};">
                    ${fotoProfiloHTML}
                </a>

                <button class="side-btn" onclick="toggleLike(${a.id}, this)">
                    <div class="side-btn__icon">🤍</div>
                    <span class="side-btn__count">Like</span>
                </button>

                <button class="side-btn" onclick="apriModalPlaylist(${a.id})">
                    <div class="side-btn__icon">📂</div>
                    <span class="side-btn__count">Salva</span>
                </button>
                
                <button class="side-btn" onclick="navigator.clipboard.writeText(window.location.origin + '/esplora.html?focus=${a.id}'); window.toast('🔗 Link copiato!')">
                    <div class="side-btn__icon">🔗</div>
                    <span class="side-btn__count">Copia</span>
                </button>
            </div>
        `;
        feed.appendChild(card);
    });

    document.querySelectorAll('.card__slider').forEach(slider => {
        slider.addEventListener('scroll', (e) => {
            const id = slider.id.replace('slider-', '');
            const index = Math.round(e.target.scrollLeft / e.target.clientWidth);
            const dotsContainer = document.getElementById(`dots-${id}`);
            
            if (dotsContainer) {
                Array.from(dotsContainer.querySelectorAll('.dot')).forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
            }
        });
    });

    initAudioObserver();
    gestisciFocus(); 
}

/* ── GESTIONE FOCUS (SCROLL) ── */
function gestisciFocus() {
    const urlParams = new URLSearchParams(window.location.search);
    const focusId = urlParams.get('focus');
    
    if (focusId) {
        const cardToFocus = document.getElementById(`appunto-${focusId}`);
        if (cardToFocus) {
            setTimeout(() => {
                cardToFocus.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
}

/* ── OBSERVER AUTOPLAY AUDIO ── */
function initAudioObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const audioUrl = entry.target.getAttribute('data-audio');
                if (audioUrl) {
                    currentAudio.src = audioUrl;
                    currentAudio.muted = isMuted;
                    currentAudio.play().catch(e => {
                        console.log("Autoplay bloccato: necessario cliccare sulla pagina prima.");
                    });
                } else {
                    currentAudio.pause();
                }
            }
        });
    }, { threshold: 0.6 });

    document.querySelectorAll('.card').forEach(c => observer.observe(c));
}

/* ── FUNZIONI MODAL E UPLOAD IN ESPLORA ── */
window.apriModal = function() { document.getElementById('modal').classList.add('open'); }
window.chiudiModal = function() { document.getElementById('modal').classList.remove('open'); }

window.pubblicaAppunto = async function() {
    let utenteId = getCookieSafe('utente_id');
    if (!utenteId) return window.toast('⚠️ Devi effettuare il login per pubblicare!');

    const filesIn = document.getElementById('mFile');
    const coverIn = document.getElementById('mCover');
    const audioIn = document.getElementById('mAudio');
    const titolo = document.getElementById('mTitolo').value.trim();
    const materia = document.getElementById('mMateria').value;
    const livello = document.getElementById('mLivello').value; // <-- AGGIUNTO QUI: Cattura il livello

    if (!titolo) return window.toast('⚠️ Inserisci il titolo!');
    if (!filesIn.files || filesIn.files.length === 0) return window.toast('⚠️ Seleziona almeno un documento!');

    const btn = document.getElementById('mBtnPubblica');
    btn.textContent = '⏳ Caricamento...';
    btn.disabled = true;

    try {
        let fileUrls = [];
        for (let file of filesIn.files) {
            const res = await fetch(`/api/upload?filename=page_${Date.now()}_${encodeURIComponent(file.name)}`, {
                method: 'POST', body: file
            });
            if (!res.ok) throw new Error("Errore caricamento immagine");
            const data = await res.json();
            fileUrls.push(data.url);
        }

        let audioUrl = null;
        if (audioIn.files && audioIn.files.length > 0) {
            const resAudio = await fetch(`/api/upload?filename=audio_${Date.now()}.mp3`, {
                method: 'POST', body: audioIn.files[0]
            });
            if (resAudio.ok) {
                const dataAudio = await resAudio.json();
                audioUrl = dataAudio.url;
            }
        }

        let coverUrl = fileUrls[0];
        if (coverIn.files && coverIn.files.length > 0) {
            const resCover = await fetch(`/api/upload?filename=cover_${Date.now()}`, {
                method: 'POST', body: coverIn.files[0]
            });
            if (resCover.ok) {
                const dataCover = await resCover.json();
                coverUrl = dataCover.url;
            }
        }

        const dbRes = await fetch('/api/appunti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                utente_id: utenteId, 
                titolo: titolo, 
                materia: materia, 
                livello: livello, // <-- AGGIUNTO QUI: Invia il livello al DB
                file_url: fileUrls.join(','), 
                audio_url: audioUrl, 
                cover_url: coverUrl 
            })
        });
        if (!dbRes.ok) throw new Error('Errore DB');

        window.toast('🚀 Appunto pubblicato con successo!');
        chiudiModal();
        
        document.getElementById('mTitolo').value = '';
        document.getElementById('mFile').value = '';
        document.getElementById('mCover').value = '';
        document.getElementById('mAudio').value = '';
        // Il livello non ha bisogno di essere resettato (può rimanere sull'ultima scelta)
        
        initEsplora();

    } catch (error) {
        console.error(error);
        window.toast('❌ Errore durante il caricamento.');
    } finally {
        btn.textContent = '🚀 Pubblica';
        btn.disabled = false;
    }
}

/* ── UTILITIES ── */
window.toast = function(msg) {
    const t = document.getElementById('toast');
    if(t) {
        t.textContent = msg; t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }
}

function mostraErrore() {
    const feed = document.getElementById('feed');
    if (!feed) return;
    feed.innerHTML = `
        <div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--muted);text-align:center;padding:32px">
            <div style="font-size:3rem">⚠️</div>
            <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:900;color:var(--text)">Errore Server</div>
            <div style="font-size:0.88rem;max-width:280px;line-height:1.6">Impossibile caricare dal database.</div>
        </div>`;
}

function aggiornaNavbar() {
    const btnLogin = document.getElementById('navLoginBtn');
    if (!btnLogin) return;
    if (getCookieSafe('username') !== null) btnLogin.style.display = 'none';
}

/* ── EVENT LISTENERS (Scroll e Navigazione) ── */
document.addEventListener('DOMContentLoaded', () => {
    aggiornaNavbar();
    initEsplora();

    const feedEl = document.getElementById('feed');
    if(feedEl) {
        feedEl.addEventListener('scroll', () => {
            const scrollHint = document.getElementById('scrollHint');
            if(scrollHint) {
                if (feedEl.scrollTop > 80) scrollHint.classList.add('hidden');
                else scrollHint.classList.remove('hidden');
            }
        }, { passive: true });
    }

    const modalEl = document.getElementById('modal');
    if(modalEl) {
        modalEl.addEventListener('click', e => { 
            if (e.target === modalEl) chiudiModal(); 
        });
    }

    const modalPlaylistEl = document.getElementById('modalPlaylist');
    if(modalPlaylistEl) {
        modalPlaylistEl.addEventListener('click', e => { 
            if (e.target === modalPlaylistEl) chiudiModalPlaylist(); 
        });
    }
});

document.addEventListener('keydown', e => {
    const feedEl = document.getElementById('feed');
    if(!feedEl) return;
    const h = window.innerHeight;
    if (e.key === 'ArrowDown') feedEl.scrollBy({ top: h, behavior: 'smooth' });
    if (e.key === 'ArrowUp')   feedEl.scrollBy({ top: -h, behavior: 'smooth' });
});