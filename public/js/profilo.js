// ==========================================
// 1. CARICAMENTO DATI INIZIALI
// ==========================================
async function initProfilo() {
    const utenteId = getCookie('utente_id'); 
    
    if (!utenteId) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`/api/utente?id=${utenteId}`);
        const user = await res.json();

        if (res.ok) {
            document.getElementById('nomeIn').value = user.nome || '';
            document.getElementById('cognomeIn').value = user.cognome || '';
            document.getElementById('emailIn').value = user.email || '';
            
            if (user.foto_profilo_url) {
                const img = document.getElementById('avatarImg');
                img.src = user.foto_profilo_url;
                img.style.display = 'block';
                document.getElementById('avatarPh').style.display = 'none';
            }
        }
    } catch (err) {
        console.error("Errore recupero dati:", err);
    }
}

// ==========================================
// 2. SALVATAGGIO PROFILO (NOME, COGNOME, EMAIL)
// ==========================================
async function salvaProfilo() {
    const utenteId = getCookie('utente_id');
    const payload = {
        id: utenteId,
        nome: document.getElementById('nomeIn').value.trim(),
        cognome: document.getElementById('cognomeIn').value.trim(),
        email: document.getElementById('emailIn').value.trim()
    };

    try {
        const res = await fetch('/api/aggiorna-profilo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) alert("✅ Profilo aggiornato nel database!");
        else alert("⚠️ Errore durante il salvataggio.");
    } catch (err) {
        alert("⚠️ Errore di connessione.");
    }
}

// ==========================================
// 3. UPLOAD AVATAR (FOTO PROFILO)
// ==========================================
async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const response = await fetch(`/api/upload?filename=${file.name}&contentType=${file.type}`, {
            method: 'POST',
            body: file,
        });
        const newBlob = await response.json();

        document.getElementById('avatarImg').src = newBlob.url;
        document.getElementById('avatarImg').style.display = 'block';
        document.getElementById('avatarPh').style.display = 'none';

        const utenteId = getCookie('utente_id');
        await fetch('/api/aggiorna-profilo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: utenteId, foto_profilo_url: newBlob.url })
        });

        alert("✅ Foto profilo aggiornata!");
    } catch (error) {
        console.error("Errore upload:", error);
    }
}

// ==========================================
// 4. PUBBLICAZIONE NUOVO APPUNTO
// ==========================================
async function pubblicaAppunto() {
    const fileIn = document.getElementById('fileAppunto');
    const titolo = document.getElementById('titoloAppunto').value;
    const materia = document.getElementById('materiaAppunto').value;
    const utenteId = getCookie('utente_id');

    if (!fileIn.files[0]) return alert("Seleziona un file!");

    try {
        const file = fileIn.files[0];
        const resBlob = await fetch(`/api/upload?filename=${file.name}`, {
            method: 'POST',
            body: file,
        });
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

        if (resDb.ok) {
            alert("✅ Appunto pubblicato con successo!");
            caricaMieiAppunti(); // Ricarica la lista per mostrare il nuovo appunto
        }
    } catch (err) {
        console.error("Errore durante la pubblicazione:", err);
    }
}

// ==========================================
// 5. CARICA GLI APPUNTI DELL'UTENTE
// ==========================================
async function caricaMieiAppunti() {
    const utenteId = getCookie('utente_id');
    const container = document.getElementById('listaMieiAppunti');
    
    if (!container) return; // Se il container non c'è, ignora

    try {
        const res = await fetch(`/api/appunti?utente_id=${utenteId}`);
        const appunti = await res.json();

        if (appunti.length === 0) {
            container.innerHTML = "<p style='color: #999;'>Non hai ancora caricato nulla.</p>";
            return;
        }

        container.innerHTML = appunti.map(a => `
            <div class="note-card">
                <span class="note-card__tag" style="--c: var(--accent2)">${a.materia}</span>
                <h3>${a.titolo}</h3>
                <div class="note-card__footer">
                    <span>${new Date(a.data_caricamento || Date.now()).toLocaleDateString()}</span>
                    <a href="${a.file_url}" target="_blank" style="color: var(--accent); font-weight: bold; text-decoration: none;">Apri File</a>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Errore nel caricamento dei tuoi appunti:", err);
    }
}

// ==========================================
// AVVIO AL CARICAMENTO DELLA PAGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initProfilo();
    caricaMieiAppunti();
});