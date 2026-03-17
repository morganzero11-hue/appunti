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
    
    if (!utenteId) {
        console.warn("Nessun utente loggato. Uso ID 1 per i test.");
        utenteId = "1"; 
    }

    try {
        const res = await fetch(`/api/utente?id=${utenteId}`);
        if (!res.ok) throw new Error("Utente non trovato");
        
        const user = await res.json();

        document.getElementById('valNome').textContent = user.nome || 'Non impostato';
        document.getElementById('valCognome').textContent = user.cognome || 'Non impostato';
        document.getElementById('valEmail').textContent = user.email || 'Non impostata';
        
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
        document.getElementById('valEmail').textContent = "Effettua il login";
    }
}

// 2. UPLOAD AVATAR
async function uploadAvatar(event) {
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

        let utenteId = getCookieSafe('utente_id') || '1';

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

// 3. PUBBLICAZIONE APPUNTO
async function pubblicaAppunto() {
    const fileIn = document.getElementById('fileAppunto');
    const titolo = document.getElementById('titoloAppunto').value.trim();
    const materia = document.getElementById('materiaAppunto').value;
    let utenteId = getCookieSafe('utente_id') || '1';

    if (!titolo) return alert("Inserisci un titolo!");
    if (!fileIn.files[0]) return alert("Seleziona un file PDF o Immagine!");

    const btn = document.getElementById('btnPubblica');
    btn.textContent = "⏳ Caricamento in corso...";
    btn.disabled = true;

    let success = false;

    try {
        const file = fileIn.files[0];
        
        const resBlob = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: file,
        });
        if (!resBlob.ok) throw new Error("Errore Blob");
        const blob = await resBlob.json();

        const resDb = await fetch('/api/appunti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                utente_id: utenteId,
                titolo: titolo,
                materia: materia,
                file_url: blob.url
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
        if (typeof caricaMieiAppunti === 'function') caricaMieiAppunti();
    }
}

// 4. CARICA I MIEI APPUNTI
async function caricaMieiAppunti() {
    let utenteId = getCookieSafe('utente_id') || '1';
    const container = document.getElementById('listaMieiAppunti');
    if (!container) return;

    try {
        const res = await fetch(`/api/appunti?utente_id=${utenteId}`);
        const appunti = await res.json();

        if (appunti.length === 0) {
            container.innerHTML = "<p style='color: var(--muted);'>Non hai ancora caricato nulla.</p>";
            return;
        }

        container.innerHTML = appunti.map(a => `
            <div class="note-card">
                <div>
                    <h3>${a.titolo}</h3>
                    <p>${a.materia} • ${new Date(a.data_caricamento || Date.now()).toLocaleDateString()}</p>
                </div>
                <a href="${a.file_url}" target="_blank" class="note-link">Apri File</a>
            </div>
        `).join('');
    } catch (err) {
        console.error("Errore caricamento tuoi appunti:", err);
    }
}

// AVVIO
document.addEventListener('DOMContentLoaded', () => {
    initProfilo();
    caricaMieiAppunti();
});