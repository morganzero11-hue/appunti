// ==========================================
// 4. PUBBLICAZIONE NUOVO APPUNTO (Migliorata)
// ==========================================
async function pubblicaAppunto() {
    const fileIn = document.getElementById('fileAppunto');
    const titolo = document.getElementById('titoloAppunto').value.trim();
    const materia = document.getElementById('materiaAppunto').value.trim();
    const utenteId = getCookie('utente_id') || 'Anonimo'; // Fallback se non c'è cookie

    if (!titolo) return alert("Inserisci un titolo!");
    if (!fileIn.files[0]) return alert("Seleziona un file!");

    const btn = document.getElementById('btnPubblica');
    btn.textContent = "⏳ Caricamento in corso...";
    btn.disabled = true;

    try {
        const file = fileIn.files[0];
        
        // 1. Carica su Blob
        const resBlob = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: file,
        });
        
        if (!resBlob.ok) throw new Error("Errore Blob");
        const blob = await resBlob.json();

        // 2. Salva su DB
        const resDb = await fetch('/api/appunti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                utente_id: utenteId,
                titolo: titolo,
                materia: materia || 'Generale',
                file_url: blob.url
            })
        });

        if (resDb.ok) {
            alert("✅ Appunto pubblicato con successo!");
            // Pulisci i campi
            document.getElementById('titoloAppunto').value = '';
            document.getElementById('materiaAppunto').value = '';
            fileIn.value = '';
            // Ricarica la lista
            caricaMieiAppunti(); 
        } else {
            alert("⚠️ Errore nel salvataggio su database.");
        }
    } catch (err) {
        console.error("Errore durante la pubblicazione:", err);
        alert("❌ C'è stato un problema durante il caricamento.");
    } finally {
        btn.textContent = "Pubblica su Esplora";
        btn.disabled = false;
    }
}