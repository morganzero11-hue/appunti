// ==========================================
// 4. PUBBLICAZIONE NUOVO APPUNTO (Corretta)
// ==========================================
async function pubblicaAppunto() {
    const fileIn = document.getElementById('fileAppunto');
    const titolo = document.getElementById('titoloAppunto').value.trim();
    const materia = document.getElementById('materiaAppunto').value.trim();
    
    // Fallback sicuro nel caso in cui getCookie non sia ancora pronto
    let utenteId = 'Anonimo';
    try { if (typeof getCookie === 'function') utenteId = getCookie('utente_id') || 'Anonimo'; } catch(e){}

    if (!titolo) return alert("Inserisci un titolo!");
    if (!fileIn.files[0]) return alert("Seleziona un file!");

    const btn = document.getElementById('btnPubblica');
    btn.textContent = "⏳ Caricamento in corso...";
    btn.disabled = true;

    let caricamentoCompletato = false; // Usiamo questa variabile come semaforo

    // --- FASE 1: PARLIAMO CON IL SERVER ---
    try {
        const file = fileIn.files[0];
        
        // Carica su Blob
        const resBlob = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: file,
        });
        
        if (!resBlob.ok) throw new Error("Errore Blob");
        const blob = await resBlob.json();

        // Salva su DB
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

        if (!resDb.ok) throw new Error("Errore DB");

        // Se arriva fin qui, è andato tutto perfetto!
        caricamentoCompletato = true;

    } catch (err) {
        console.error("Errore di rete/server:", err);
        alert("❌ C'è stato un problema durante il caricamento.");
    } finally {
        // Riaccendiamo sempre il bottone alla fine
        btn.textContent = "Pubblica su Esplora";
        btn.disabled = false;
    }

    // --- FASE 2: AGGIORNAMENTO GRAFICO (Fuori dalla zona di pericolo) ---
    if (caricamentoCompletato) {
        alert("✅ Appunto pubblicato con successo!");
        
        // Pulisci i campi
        document.getElementById('titoloAppunto').value = '';
        document.getElementById('materiaAppunto').value = '';
        fileIn.value = '';
        
        // Aggiorna la lista in basso, ma in modo super sicuro
        try {
            if (typeof caricaMieiAppunti === 'function') {
                caricaMieiAppunti(); 
            }
        } catch (errGrafico) {
            console.warn("L'appunto è salvo, ma c'è un problema ad aggiornare la lista visiva:", errGrafico);
            // Non diamo nessun fastidioso alert rosso qui!
        }
    }
}