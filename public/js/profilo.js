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
// 3. UPLOAD AVATAR (FOTO PROFILO) SU VERCEL BLOB
// ==========================================
async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Feedback visivo: l'utente capisce che sta caricando
    const avatarPh = document.getElementById('avatarPh');
    const avatarImg = document.getElementById('avatarImg');
    
    // Se è visibile il placeholder, cambiamo l'icona in una clessidra
    if (avatarPh.style.display !== 'none') {
        avatarPh.innerHTML = '⏳'; 
    } else {
        avatarImg.style.opacity = '0.5'; // Opacizza l'immagine vecchia durante l'upload
    }

    try {
        // 1. Caricamento su Vercel Blob
        const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`, {
            method: 'POST',
            body: file,
        });
        
        if (!response.ok) throw new Error("Errore durante l'upload su Blob");
        const newBlob = await response.json();

        // 2. Aggiornamento UI istantaneo
        avatarImg.src = newBlob.url;
        avatarImg.style.display = 'block';
        avatarImg.style.opacity = '1';
        avatarPh.style.display = 'none';

        // 3. Aggiornamento nel Database PostgreSQL
        const utenteId = getCookie('utente_id');
        await fetch('/api/aggiorna-profilo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: utenteId, foto_profilo_url: newBlob.url })
        });

        alert("✅ Foto profilo aggiornata con successo!");
    } catch (error) {
        console.error("Errore upload:", error);
        alert("❌ Errore durante il caricamento dell'immagine.");
        // Ripristina l'UI in caso di errore
        avatarPh.innerHTML = '👤';
        avatarImg.style.opacity = '1';
    }
}

// ==========================================
// 4. CARICA GLI APPUNTI DELL'UTENTE
// ==========================================
async function caricaMieiAppunti() {
    const utenteId = getCookie('utente_id');
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
            <div class="note-card" style="background: var(--surface); padding: 16px; border-radius: 12px; border: 1px solid var(--border2); margin-bottom: 12px;">
                <span style="font-size: 0.75rem; background: var(--surface2); padding: 4px 10px; border-radius: 8px; font-weight: bold; color: var(--accent);">${a.materia}</span>
                <h3 style="margin: 8px 0; font-family: 'Fraunces', serif;">${a.titolo}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 0.8rem; color: var(--muted);">
                    <span>${new Date(a.data_caricamento || Date.now()).toLocaleDateString('it-IT')}</span>
                    <a href="${a.file_url}" target="_blank" style="color: #0f0f0f; background: var(--accent); padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: 800;">Apri File</a>
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