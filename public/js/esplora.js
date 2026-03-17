// public/js/esplora.js
let tuttiAppunti = [];
let visibili = [];

// Gestione stili dinamici basati sulla colonna 'materia'
function getMateriaStyle(materia) {
    const stili = {
        'Matematica': { icon: "∑", colore: "#d97706", grad: "linear-gradient(135deg,#1a0a00 0%,#3d1f00 50%,#1a0a00 100%)" },
        'Scienze': { icon: "🔬", colore: "#16a34a", grad: "linear-gradient(135deg,#001a08 0%,#003d15 50%,#001a08 100%)" },
        'piopio': { icon: "🐥", colore: "#f0c040", grad: "linear-gradient(135deg,#1a1a00 0%,#404000 50%,#1a1a00 100%)" }
    };
    return stili[materia] || { icon: "📚", colore: "#888", grad: "linear-gradient(135deg,#111 0%,#222 50%,#111 100%)" };
}

async function initEsplora() {
    try {
        const res = await fetch('/api/appunti');
        tuttiAppunti = await res.json();
        visibili = [...tuttiAppunti];
        renderFeed();
    } catch (err) {
        console.error("Errore caricamento:", err);
    }
}

function renderFeed() {
    const feed = document.getElementById('feed');
    const dots = document.getElementById('progressDots');
    if(!feed || !dots) return;
    
    feed.innerHTML = '';
    dots.innerHTML = '';

    visibili.forEach((appunto, i) => {
        const stile = getMateriaStyle(appunto.materia);
        const dataFormattata = appunto.data_caricamento 
            ? new Date(appunto.data_caricamento).toLocaleDateString('it-IT') 
            : "Data non disp.";

        // Slide HTML
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.innerHTML = `
            <div class="slide__bg" style="background:${stile.grad}"></div>
            <div class="slide__deco">${stile.icon}</div>
            <div class="slide__content">
                <div class="slide__main">
                    <div class="slide__chip" style="color:${stile.colore}; border-color:${stile.colore}40">
                        <span class="slide__chip-dot" style="background:${stile.colore}"></span>
                        ${appunto.materia}
                    </div>
                    <div class="slide__title">${appunto.titolo}</div>
                    <div class="slide__author">
                        <div class="slide__avatar">👤</div>
                        <div class="slide__author-info">
                            <div class="slide__author-name">Caricato da ID: ${appunto.utente_id}</div>
                            <div class="slide__author-date">${dataFormattata}</div>
                        </div>
                    </div>
                </div>
                <div class="slide__actions">
                    <a href="${appunto.file_url}" target="_blank" class="action-btn" style="text-decoration:none">
                        <div class="action-btn__icon">📖</div>
                        <span class="action-btn__count">Leggi</span>
                    </a>
                </div>
            </div>`;
        feed.appendChild(slide);

        // Dot di navigazione
        const dot = document.createElement('div');
        dot.className = 'pdot' + (i === 0 ? ' active' : '');
        dot.onclick = () => {
            feed.scrollTo({ top: i * feed.clientHeight, behavior: 'smooth' });
        };
        dots.appendChild(dot);
    });
}

// Filtro per materia
window.filtra = function(materia, el) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    visibili = materia === 'tutti' ? [...tuttiAppunti] : tuttiAppunti.filter(a => a.materia === materia);
    renderFeed();
};

document.addEventListener('DOMContentLoaded', initEsplora);