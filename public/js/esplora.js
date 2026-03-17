// js/esplora.js
let tuttiAppunti = [];

async function initEsplora() {
    try {
        const res = await fetch('/api/appunti');
        tuttiAppunti = await res.json();
        renderFeed(tuttiAppunti);
    } catch (err) {
        console.error("Errore recupero dati:", err);
    }
}

function getMateriaStyle(materia) {
    const stili = {
        'Matematica': { icon: "∑", grad: "linear-gradient(180deg, #1a2a6c, #b21f1f, #fdbb2d)" },
        'Scienze': { icon: "🔬", grad: "linear-gradient(180deg, #11998e, #38ef7d)" },
        'piopio': { icon: "🐥", grad: "linear-gradient(180deg, #ff9966, #ff5e62)" }
    };
    return stili[materia] || { icon: "📚", grad: "linear-gradient(180deg, #303336, #000000)" };
}

function renderFeed(data) {
    const feed = document.getElementById('feed');
    feed.innerHTML = data.map(appunto => {
        const stile = getMateriaStyle(appunto.materia);
        return `
            <div class="slide">
                <div class="slide__bg" style="background: ${stile.grad}"></div>
                <div class="slide__content">
                    <div class="slide__chip" style="border-color: white;">${appunto.materia}</div>
                    <div class="slide__title">${appunto.titolo}</div>
                    <div class="slide__author">Caricato da ID: ${appunto.utente_id}</div>
                </div>
                <a href="${appunto.file_url}" target="_blank" class="action-btn">
                    <span>📖</span>
                    <small>APRI</small>
                </a>
            </div>
        `;
    }).join('');
}

window.filtra = function(materia, el) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const filtrati = materia === 'tutti' ? tuttiAppunti : tuttiAppunti.filter(a => a.materia === materia);
    renderFeed(filtrati);
};

document.addEventListener('DOMContentLoaded', initEsplora);