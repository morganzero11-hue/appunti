let tuttiAppunti = [];

async function init() {
    const res = await fetch('/api/appunti');
    tuttiAppunti = await res.json();
    render(tuttiAppunti);
}

function getStyle(materia) {
    const stili = {
        'Matematica': { icon: "∑", grad: "linear-gradient(180deg, #2c3e50, #000)" },
        'Scienze': { icon: "🔬", grad: "linear-gradient(180deg, #11998e, #000)" },
        'piopio': { icon: "🐥", grad: "linear-gradient(180deg, #f12711, #000)" }
    };
    return stili[materia] || { icon: "📚", grad: "linear-gradient(180deg, #434343, #000)" };
}

function render(data) {
    const container = document.getElementById('feed');
    container.innerHTML = data.map(a => {
        const s = getStyle(a.materia);
        return `
            <div class="slide">
                <div class="slide__bg" style="background: ${s.grad}"></div>
                <div class="slide__content">
                    <div class="slide__chip">${a.materia}</div>
                    <div class="slide__title">${a.titolo}</div>
                    <div style="opacity: 0.7">Caricato da Utente #${a.utente_id}</div>
                </div>
                <a href="${a.file_url}" target="_blank" class="action-btn">
                    <div style="font-size: 24px;">📖</div>
                    <div style="font-size: 10px;">LEGGI</div>
                </a>
            </div>
        `;
    }).join('');
}

window.filtra = (m) => {
    const filtrati = m === 'tutti' ? tuttiAppunti : tuttiAppunti.filter(a => a.materia === m);
    render(filtrati);
};

document.addEventListener('DOMContentLoaded', init);