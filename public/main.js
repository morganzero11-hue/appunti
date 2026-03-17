// CONFIGURAZIONE COLORI
const coloriMateria = {
    "Matematica":"#f97316","Scienze":"#22c55e","Fisica":"#3b82f6","Chimica":"#a855f7",
    "Storia":"#ec4899","Italiano":"#f59e0b","Inglese":"#6366f1"
};

// 1. GESTIONE NAVBAR E LOGIN
function inizializzaNavbar() {
    const authBtn = document.getElementById('authBtn');
    const isLoggato = document.cookie.split(';').some(c => c.trim().startsWith('username='));

    if (authBtn) {
        if (isLoggato) {
            authBtn.textContent = 'Logout';
            authBtn.href = 'logout.html';
            authBtn.style.background = '#ff4d6d'; // Rosso per il logout
        } else {
            authBtn.textContent = 'Accedi';
            authBtn.href = 'login.html';
        }
    }

    // Evidenzia link attivo
    const path = window.location.pathname.split("/").pop() || 'index.html';
    const linkMap = {
        'index.html': 'nav-home',
        'esplora.html': 'nav-esplora',
        'profilo.html': 'nav-profilo',
        'utenti.html': 'nav-utenti'
    };
    if (linkMap[path]) document.getElementById(linkMap[path])?.classList.add('active');
}

// 2. FUNZIONI DI RICERCA GLOBALI
async function cerca() {
    const q = document.getElementById('searchInput').value.trim();
    if (!q) return;

    // Se l'overlay non esiste (es. sei in Esplora), reindirizza alla home con parametro ricerca
    if (!document.getElementById('searchOverlay')) {
        window.location.href = `index.html?search=${encodeURIComponent(q)}`;
        return;
    }

    try {
        const [resU, resA] = await Promise.all([
            fetch(`/api/cerca-utenti?q=${encodeURIComponent(q)}`),
            fetch(`/api/cerca-appunti?q=${encodeURIComponent(q)}`)
        ]);
        const utenti = await resU.json();
        const appunti = await resA.json();
        mostraRisultati(q, utenti, appunti);
    } catch (err) { console.error("Errore ricerca:", err); }
}

function chiudiRicerca() {
    const overlay = document.getElementById('searchOverlay');
    if(overlay) overlay.style.display = 'none';
}

// 3. CARICAMENTO DATI HOME
async function caricaUltimiAppunti() {
    const grid = document.getElementById('homeNotesGrid');
    if (!grid) return;
    try {
        const res = await fetch('/api/appunti?limit=6');
        const data = await res.json();
        grid.innerHTML = data.map(n => `
            <article class="note-card">
                <div class="note-card__tag" style="--c:${coloriMateria[n.materia] || '#888'}">${n.materia}</div>
                <h3>${n.titolo}</h3>
                <div class="note-card__footer">👤 ${n.autore}</div>
            </article>
        `).join('');
    } catch (e) { grid.innerHTML = "Errore caricamento."; }
}

// ESECUZIONE AL CARICAMENTO
document.addEventListener('DOMContentLoaded', () => {
    inizializzaNavbar();
    
    // Gestione invio con tasto Enter sulla ricerca
    document.getElementById('searchInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') cerca();
    });

    // Se arrivo dalla home con una ricerca pendente
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('search')) {
        document.getElementById('searchInput').value = urlParams.get('search');
        cerca();
    }
});