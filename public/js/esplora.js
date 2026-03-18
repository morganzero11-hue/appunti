let tuttiAppunti = [];

/* ── INIT: Recupera dal server ── */
async function initEsplora() {
    try {
        const res = await fetch('/api/appunti');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        tuttiAppunti = await res.json();
        renderFeed(tuttiAppunti);
    } catch (err) {
        console.error('Errore recupero appunti:', err);
        mostraErrore();
    }
}

/* ── FORMATTA DATA ── */
function formatData(dateStr) {
    if (!dateStr) return 'Recente';
    const d = new Date(dateStr);
    if (isNaN(d)) return 'Recente';
    const diff = Math.floor((new Date() - d) / 1000);
    if (diff < 60)     return 'adesso';
    if (diff < 3600)   return `${Math.floor(diff / 60)} min fa`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)} ore fa`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} giorni fa`;
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

/* ── RENDER FEED (Stile "TikTok") ── */
function renderFeed(lista) {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';

    if (!lista || lista.length === 0) {
        feed.innerHTML = `
            <div style="height:calc(100vh - 62px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--muted);text-align:center;padding:32px">
                <div style="font-size:3rem">📭</div>
                <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:900;color:var(--text)">Nessun appunto ancora</div>
                <div style="font-size:0.88rem;max-width:280px;line-height:1.6">Sii il primo a condividere qualcosa con la community!</div>
                <button onclick="apriModal()" style="margin-top:8px;background:var(--accent);color:#0f0f0f;border:none;border-radius:10px;padding:10px 24px;font-family:'Cabinet Grotesk',sans-serif;font-size:0.88rem;font-weight:800;cursor:pointer;">✦ Carica un file</button>
            </div>`;
        return;
    }

    const COLORI = {
        'Matematica':'#d97706','Fisica':'#2563eb','Scienze':'#16a34a',
        'Storia':'#be185d','Italiano':'#b45309','Inglese':'#4f46e5','Informatica':'#dc2626'
    };
    const avatarColori = ['#7c3aed','#be185d','#2563eb','#16a34a','#d97706','#0891b2','#dc2626'];

    lista.forEach(a => {
        const mc = COLORI[a.materia] || '#888';
        
        // Cerchiamo di recuperare username e foto se disponibili dalla JOIN SQL
        // Altrimenti usiamo fallback
        const username = a.username || a.utente_id || 'Anonimo'; 
        const autore = String(a.nome ? `${a.nome} ${a.cognome || ''}` : username);
        const iniziale = autore[0].toUpperCase();
        const ac = avatarColori[autore.charCodeAt(0) % avatarColori.length];
        const data_str = formatData(a.data_caricamento);

        // Se abbiamo la foto dal db la mostriamo, altrimenti iniziale colorata
        const fotoHTML = a.foto_profilo_url 
            ? `<img src="${a.foto_profilo_url}" alt="Foto Profilo" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<span style="color:${ac}; font-family: 'Fraunces', serif;">${iniziale}</span>`;

        const card = document.createElement('div');
        card.className = 'card';
        
        // 1. Aggiungiamo un background dinamico in base alla materia come "Preview"
        // 2. Spostiamo l'avatar nella sidebar di destra con il link al profilo
        card.innerHTML = `
            <div class="card__bg" style="background: radial-gradient(ellipse at center, ${mc}33 0%, transparent 70%);"></div>
            
            <div class="card__content">
                <div class="card__meta">
                    <div>
                        <div class="card__author">@${username}</div>
                        <div class="card__school">${data_str}</div>
                    </div>
                </div>
                <div class="card__subject" style="background:${mc}18;color:${mc};border-color:${mc}44">${a.materia || 'Generale'}</div>
                <div class="card__title">${a.titolo || 'Senza titolo'}</div>
                <div class="card__actions">
                    ${a.file_url ? `<a href="${a.file_url}" target="_blank" class="card__btn card__btn--accent">📥 Apri Appunto</a>` : ''}
                </div>
            </div>
            
            <div class="card__sidebar">
                <a href="utenti.html?user=${encodeURIComponent(username)}" class="sidebar-avatar" style="background:${ac}22; border: 2px solid #fff;">
                    ${fotoHTML}
                </a>

                <button class="side-btn" onclick="toast('🤍 Mi piace aggiunto!')">
                    <div class="side-btn__icon">🤍</div>
                    <span class="side-btn__count">Like</span>
                </button>
                <button class="side-btn" onclick="navigator.clipboard.writeText('${a.file_url}'); toast('🔗 Link copiato!')">
                    <div class="side-btn__icon">🔗</div>
                    <span class="side-btn__count">Copia</span>
                </button>
            </div>
        `;
        feed.appendChild(card);
    });
}

function mostraErrore() {
    const feed = document.getElementById('feed');
    if (!feed) return;
    feed.innerHTML = `
        <div style="height:calc(100vh - 62px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--muted);text-align:center;padding:32px">
            <div style="font-size:3rem">⚠️</div>
            <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:900;color:var(--text)">Errore Server</div>
            <div style="font-size:0.88rem;max-width:280px;line-height:1.6">Impossibile caricare dal database.</div>
        </div>`;
}

// Avvia automaticamente quando si apre la pagina
document.addEventListener('DOMContentLoaded', initEsplora);