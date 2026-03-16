// Recupera un cookie specifico
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
};

// Variabili globali utili
const utenteId = getCookie('utente_id');
const username = getCookie('username');