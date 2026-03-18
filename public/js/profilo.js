// Funzione d'emergenza per i cookie se auth.js non è caricato
function getCookieSafe(name) {
    try {
        if (typeof getCookie === 'function') return getCookie(name);
        let value = `; ${document.cookie}`;
        let parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    } catch (e) {}
    return null;
}

// 1. CARICAMENTO DATI PROFILO
async function initProfilo() {
    let utenteId = getCookieSafe('utente_id');
    
    // Se non c'è utente loggato, mostra la modalità ospite e nascondi le sezioni
    if (!utenteId) {
        console.warn("Nessun utente loggato. Modalità ospite attivata.");
        
        document.getElementById('valNome').textContent = "Ospite";
        document.getElementById('valCognome').textContent = "Effettua il login";
        document.getElementById('valScuola').textContent = "-";
        
        // Nascondi la sezione per pubblicare
        const sezionePubblica = document.getElementById('sezionePubblica');
        if (sezionePubblica) sezionePubblica.style.display = 'none';
        
        // Nascondi la lista dei propri appunti
        const titoloMieiAppunti = document.getElementById('titoloMieiAppunti');
        if (titoloMieiAppunti) titoloMieiAppunti.style.display = 'none';
        
        const listaMieiAppunti = document.getElementById('listaMieiAppunti');
        if (listaMieiAppunti) listaMieiAppunti.style.display = 'none';
        
        return; // Ferma l'esecuzione qui
    }

    try {
        const res = await fetch(`/api/utente?id=${utenteId}`);
        if (!res.ok) throw new Error("Utente non trovato");
        
        const user = await res.json();

        document.getElementById('valNome').textContent = user.nome || 'Non impostato';
        document.getElementById('valCognome').textContent = user.cognome || 'Non impostato';
        document.getElementById('valScuola').textContent = user.scuola || 'Non inserita';
        
        if (user.foto_profilo_url) {
            const img = document.getElementById('avatarImg');
            img.src = user.foto_profilo_url;
            img.style.display = 'block';
            document.getElementById('avatarPh').style.display = 'none';
        }
    } catch (err) {
        console.error("Errore recupero profilo:", err);
        document.getElementById('valNome').textContent = "Ospite";
        document.getElementById('valCognome').textContent = "";
        document.getElementById('valScuola').textContent = "Effettua il login";
    }
}

// 2. UPLOAD AVATAR
async function uploadAvatar(event) {
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
        ph.textContent = '📸'; 
        alert("✅ Foto profilo aggiornata!");
        
    } catch (error) {
        console.error("Errore upload avatar:", error);
        alert("❌ Impossibile caricare la foto.");
        ph.textContent = '📸';
    }
}

// 3. PUBBLICAZIONE APPUNTO CON PREVIEW
async function pubblicaAppunto() {
    let utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi effettuare il login per pubblicare un appunto!");

    const fileIn = document.getElementById('fileAppunto');
    const coverIn = document.getElementById('coverAppunto');
    const titolo = document.getElementById('titoloAppunto').value.trim();
    const materia = document.getElementById('materiaAppunto').value;

    if (!titolo) return alert("Inserisci un titolo!");
    if (!fileIn.files[0]) return alert("Seleziona un file PDF o Immagine!");

    const btn = document.getElementById('btnPubblica');
    btn.textContent = "⏳ Caricamento in corso...";
    btn.disabled = true;

    let success = false;

    try {
        const file = fileIn.files[0];
        let coverUrl = null;

        // Se l'utente ha inserito una copertina, carichiamola
        if (coverIn.files[0]) {
            btn.textContent = "⏳ Caricamento Preview...";
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

        // Caricamento del file principale
        btn.textContent = "⏳ Caricamento Appunto...";
        const resBlob = await fetch(`/api/upload?filename=appunto_${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: file,
        });
        if (!resBlob.ok) throw new Error("Errore Blob");
        const blob = await resBlob.json();

        btn.textContent = "⏳ Salvataggio nel Database...";
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
        btn.textContent = "🚀 Pubblica su Esplora";
        btn.disabled = false;
    }

    if (success) {
        alert("✅ Appunto pubblicato con successo!");
        document.getElementById('titoloAppunto').value = '';
        fileIn.value = '';
        coverIn.value = '';
        if (typeof caricaMieiAppunti === 'function') caricaMieiAppunti();
    }
}

// 4. CARICA I MIEI APPUNTI
async function caricaMieiAppunti() {
    let utenteId = getCookieSafe('utente_id');
    const container = document.getElementById('listaMieiAppunti');
    if (!container) return;

    if (!utenteId) {
        container.innerHTML = "<p style='color: var(--muted);'>Effettua il login per vedere i tuoi appunti.</p>";
        return;
    }

    try {
        const res = await fetch(`/api/appunti?utente_id=${utenteId}`);
        const appunti = await res.json();

        if (appunti.length === 0) {
            container.innerHTML = "<p style='color: var(--muted);'>Non hai ancora caricato nulla.</p>";
            return;
        }

        container.innerHTML = appunti.map(a => `
            <div class="note-card" id="nota-${a.id}">
                <div>
                    <h3>${a.titolo}</h3>
                    <p>${a.materia} • ${new Date(a.data_caricamento || Date.now()).toLocaleDateString()}</p>
                </div>
                <div class="note-actions">
                    <a href="${a.file_url}" target="_blank" class="note-link">Apri File</a>
                    <button class="btn-delete" onclick="eliminaAppunto(${a.id})">Elimina</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Errore caricamento tuoi appunti:", err);
    }
}

// 5. ELIMINA APPUNTO
async function eliminaAppunto(appuntoId) {
    let utenteId = getCookieSafe('utente_id');
    if (!utenteId) return alert("Devi essere loggato per eliminare un appunto.");

    if (!confirm("Sei sicuro di voler eliminare questo appunto? L'azione è irreversibile.")) {
        return;
    }

    try {
        const res = await fetch(`/api/appunti?id=${appuntoId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Errore durante l'eliminazione");
        }

        // Rimuove l'elemento dalla pagina senza doverla ricaricare
        const notaCard = document.getElementById(`nota-${appuntoId}`);
        if (notaCard) {
            notaCard.remove();
        }
        
        const container = document.getElementById('listaMieiAppunti');
        if (container.children.length === 0) {
            caricaMieiAppunti(); // Ricarica per mostrare il messaggio "Non hai ancora caricato nulla"
        }

    } catch (err) {
        console.error("Errore eliminazione:", err);
        alert("❌ Non è stato possibile eliminare l'appunto.");
    }
}

// AVVIO
document.addEventListener('DOMContentLoaded', () => {
    initProfilo();
    caricaMieiAppunti();
});