async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // 1. Upload su Vercel Blob
        const response = await fetch(`/api/upload?filename=${file.name}&contentType=${file.type}`, {
            method: 'POST',
            body: file,
        });
        const newBlob = await response.json();

        // 2. Anteprima immediata nell'interfaccia
        document.getElementById('avatarImg').src = newBlob.url;
        document.getElementById('avatarImg').style.display = 'block';
        document.getElementById('avatarPh').style.display = 'none';

        // 3. Salva l'URL nel Database (colonna foto_profilo_url vista in DBeaver)
        const utenteId = getCookie('utente_id');
        await fetch('/api/aggiorna-profilo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: utenteId, foto_profilo_url: newBlob.url })
        });

        alert("Foto profilo aggiornata!");
    } catch (error) {
        console.error("Errore upload:", error);
    }

}
async function pubblicaAppunto() {
    const fileIn = document.getElementById('fileAppunto');
    const titolo = document.getElementById('titoloAppunto').value;
    const materia = document.getElementById('materiaAppunto').value;
    const utenteId = getCookie('utente_id');

    if (!fileIn.files[0]) return alert("Seleziona un file!");

    try {
        // 1. Carica il file su Vercel Blob
        const file = fileIn.files[0];
        const resBlob = await fetch(`/api/upload?filename=${file.name}`, {
            method: 'POST',
            body: file,
        });
        const blob = await resBlob.json();

        // 2. Salva nel Database (tabella appunti)
        const resDb = await fetch('/api/appunti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                utente_id: utenteId,
                titolo: titolo,
                materia: materia,
                file_url: blob.url // URL pubblico di Vercel Blob
            })
        });

        if (resDb.ok) alert("Appunto pubblicato con successo!");
    } catch (err) {
        console.error("Errore durante la pubblicazione:", err);
    }
}