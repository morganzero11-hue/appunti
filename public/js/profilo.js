// ── HELPER COOKIE ──
function getCookieSafe(name) {
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// ── AGGIORNA TESTO QUANDO SI SELEZIONA UN FILE ──
function aggiornaTestoFile(inputId, labelId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if (input.files && input.files.length > 0) {
        label.innerHTML = `✅ Selezionato: <strong>${input.files[0].name}</strong>`;
        label.style.color = "var(--accent)";
    } else {
        if(inputId === 'coverAppunto') label.innerHTML = "📸 Clicca per selezionare l'immagine di copertina";
        if(inputId === 'fileAppunto') label.innerHTML = "📄 Clicca per selezionare il file dei tuoi appunti";
        label.style.color = "var(--text)";
    }
}

// ── GESTIONE TABS ──
window.cambiaTab = function(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    btnElement.classList.add('active');
}

// ── CARICAMENTO DATI PROFILO HEADER ──
async function aggiornaHeaderProfilo() {
    let usernameLoggato = getCookieSafe('username');
    
    if(!usernameLoggato) {
        document.getElementById('valNome').textContent = "Ospite";
        document.getElementById('valUsername').textContent = "effettua_login";
        document.getElementById('sezionePubblica').innerHTML = "<div class='empty-state'>Devi accedere per pubblicare.</div>";
        return;
    }

    document.getElementById('valUsername').textContent = usernameLoggato;

    try {
        const res = await fetch(`/api/utente?username=${encodeURIComponent(usernameLoggato)}`);
        if (res.ok) {
            const user = await res.json();
            
            document.getElementById('valNome').textContent = user.nome ? (user.nome + ' ' + (user.cognome || '')) : usernameLoggato;
            document.getElementById('valScuola').textContent = user.scuola || 'Scuola non impostata';
            
            if (user.foto_profilo_url) {
                const img = document.getElementById('avatarImg');
                img.src = user.foto_profilo_url;
                img.style.display = 'block';
                document.getElementById('avatarPh').style.display = 'none';
            } else if (user.nome) {
                document.getElementById('avatarPh').textContent = user.nome.charAt(0).toUpperCase();
            }
        }
    } catch (e) {
        console.error("Errore nel recuperare i dati dell'utente:", e);
    }
}

// ── UPLOAD FOTO PROFILO ──
window.uploadAvatar = async function(event) {
    let utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi essere loggato per cambiare la foto profilo!");

    const file = event.target.files[0];
    if (!file) return;

    const ph = document.getElementById('avatarPh');
    const img = document.getElementById('avatarImg');
    
    ph.textContent = '⏳';
    ph.style.display = 'block';
    img.style.display = 'none';

    try {
        const resBlob = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: file,
        });
        if (!resBlob.ok) throw new Error("Errore Blob");
        const blob = await resBlob.json();

        const resDb = await fetch('/api/aggiorna-profilo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: utenteId, foto_profilo_url: blob.url })
        });
        if (!resDb.ok) throw new Error("Errore DB");

        img.src = blob.url;
        img.style.display = 'block';
        ph.style.display = 'none';
        alert("✅ Foto profilo aggiornata!");
        
    } catch (error) {
        console.error("Errore upload avatar:", error);
        alert("❌ Impossibile caricare la foto.");
        ph.textContent = '?';
    }
}

// ── PUBBLICAZIONE NUOVO APPUNTO ──
window.pubblicaAppunto = async function() {
    let utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi effettuare il login per pubblicare un appunto!");

    const fileIn = document.getElementById('fileAppunto');
    const coverIn = document.getElementById('coverAppunto');
    const titolo = document.getElementById('titoloAppunto').value.trim();
    const materia = document.getElementById('materiaAppunto').value;

    if (!titolo) return alert("Inserisci un titolo!");
    if (!fileIn.files || fileIn.files.length === 0) return alert("Seleziona il file dei tuoi appunti!");

    const btn = document.getElementById('btnPubblica');
    btn.textContent = "⏳ Caricamento in corso...";
    btn.disabled = true;

    let success = false;

    try {
        const file = fileIn.files[0];
        let coverUrl = null;

        if (coverIn.files && coverIn.files.length > 0) {
            btn.textContent = "⏳ Caricamento Copertina...";
            const coverFile = coverIn.files[0];
            const resCover = await fetch(`/api/upload?filename=cover_${encodeURIComponent(coverFile.name)}`, {
                method: 'POST',
                body: coverFile,
            });
            if (resCover.ok) {
                const coverBlob = await resCover.json();
                coverUrl = coverBlob.url;
            }
        }

        btn.textContent = "⏳ Caricamento Documento...";
        const resBlob = await fetch(`/api/upload?filename=appunto_${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: file,
        });
        if (!resBlob.ok) throw new Error("Errore caricamento file principale");
        const blob = await resBlob.json();

        btn.textContent = "⏳ Salvataggio...";
        const resDb = await fetch('/api/appunti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                utente_id: utenteId,
                titolo: titolo,
                materia: materia,
                file_url: blob.url,
                cover_url: coverUrl 
            })
        });
        if (!resDb.ok) throw new Error("Errore salvataggio DB");

        success = true;

    } catch (err) {
        console.error("Errore pubblicazione:", err);
        alert("❌ C'è stato un problema durante il caricamento.");
    } finally {
        btn.textContent = "🚀 Condividi con tutti";
        btn.disabled = false;
    }

    if (success) {
        alert("✅ Appunto pubblicato con successo!");
        window.location.reload();
    }
}

// ── CARICAMENTO LISTA APPUNTI PUBBLICATI ──
async function caricaMieiAppunti() {
    let utenteId = getCookieSafe('utente_id');
    const container = document.getElementById('listaMieiAppunti');
    
    if (!utenteId) {
        container.innerHTML = "<div class='empty-state'><div class='empty-icon'>🔒</div><div class='empty-text'>Effettua il login per vedere i tuoi appunti.</div></div>";
        return;
    }

    try {
        const res = await fetch(`/api/appunti?utente_id=${utenteId}`);
        if (!res.ok) throw new Error("Errore chiamata API appunti");
        
        const appunti = await res.json();

        document.getElementById('statAppunti').textContent = appunti.length;

        if (appunti.length === 0) {
            container.innerHTML = "<div class='empty-state'><div class='empty-icon'>📭</div><div class='empty-text'>Non hai ancora pubblicato nulla.</div></div>";
            return;
        }

        container.innerHTML = appunti.map(a => {
            const coverHTML = a.cover_url 
                ? `<img src="${a.cover_url}" alt="Cover Appunto">`
                : `<div class="note-thumb-bg"></div><span style="font-size:3rem; position:relative; z-index:1;">📄</span>`;

            return `
            <div class="note-card" id="nota-${a.id}">
                <div class="note-thumb">
                    ${coverHTML}
                </div>
                <div class="note-info">
                    <div class="note-title">${a.titolo}</div>
                    <div class="note-meta">${a.materia} • ${new Date(a.data_caricamento).toLocaleDateString('it-IT', {day:'2-digit', month:'short'})}</div>
                    <div class="note-actions">
                        <a href="${a.file_url}" target="_blank" class="btn-small btn-open">Apri</a>
                        <button class="btn-small btn-delete" onclick="eliminaAppunto(${a.id})">Elimina</button>
                    </div>
                </div>
            </div>
        `}).join('');
    } catch (err) {
        console.error("Errore caricamento tuoi appunti:", err);
        container.innerHTML = "<div class='empty-state'><div class='empty-text'>Errore di caricamento. Riprova.</div></div>";
    }
}

// ── ELIMINA APPUNTO ──
window.eliminaAppunto = async function(appuntoId) {
    let utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi essere loggato per eliminare un appunto.");

    if (!confirm("Sei sicuro di voler eliminare questo appunto? L'azione è irreversibile.")) {
        return;
    }

    try {
        const res = await fetch(`/api/appunti?id=${appuntoId}`, { method: 'DELETE' });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Errore durante l'eliminazione");
        }

        const notaCard = document.getElementById(`nota-${appuntoId}`);
        if (notaCard) {
            notaCard.remove();
        }
        
        const container = document.getElementById('listaMieiAppunti');
        if (container.children.length === 0) {
            caricaMieiAppunti(); 
        } else {
             let cont = parseInt(document.getElementById('statAppunti').textContent);
             if(cont > 0) document.getElementById('statAppunti').textContent = cont - 1;
        }

    } catch (err) {
        console.error("Errore eliminazione:", err);
        alert("❌ Non è stato possibile eliminare l'appunto.");
    }
}

// ── AVVIO ──
document.addEventListener('DOMContentLoaded', () => {
    // Gestione visualizzazione bottone Login
    const btnLogin = document.getElementById('navLoginBtn');
    if (btnLogin) {
        const loggato = getCookieSafe('username') !== null;
        if (loggato) btnLogin.style.display = 'none';
    }

    aggiornaHeaderProfilo();
    caricaMieiAppunti();
});