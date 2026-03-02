// =============================================
// MODAL: Historial de pings por host
// =============================================

export function showHistoryModal(host) {
    // Cerrar modal previo si existe
    closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'ping-modal';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <div class="modal-titles">
                    <span class="modal-title">${host.nombre}</span>
                    <span class="modal-subtitle">${host.ip}</span>
                </div>
                <button class="modal-close" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">
                ${renderHistory(host.history)}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Forzar reflow para activar la transición CSS
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));

    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', handleEsc);
}

function renderHistory(history) {
    if (!history || history.length === 0) {
        return '<p class="modal-empty">Sin datos aún. Esperando el primer ciclo de pings...</p>';
    }

    const hoy = new Date().toDateString();

    // Mostrar del más reciente al más antiguo
    const rows = [...history].reverse().map(entry => {
        const fecha   = new Date(entry.ts * 1000);
        const esHoy   = fecha.toDateString() === hoy;
        const hora    = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const dia     = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
        const label   = esHoy ? hora : `${dia} ${hora}`;
        const ok      = entry.ok === 1;

        return `
            <div class="h-row ${ok ? 'h-ok' : 'h-fail'}">
                <span class="h-dot"></span>
                <span class="h-time">${label}</span>
                <span class="h-status">${ok ? 'OK' : 'TIMEOUT'}</span>
            </div>`;
    }).join('');

    const total   = history.length;
    const success = history.filter(e => e.ok === 1).length;
    const pct     = Math.round((success / total) * 100);

    return `
        <div class="h-summary">
            <span>${success}/${total} exitosos</span>
            <span class="h-pct ${pct === 100 ? 'pct-ok' : pct >= 80 ? 'pct-warn' : 'pct-err'}">${pct}%</span>
        </div>
        <div class="h-list">${rows}</div>`;
}

export function closeModal() {
    const modal = document.getElementById('ping-modal');
    if (!modal) return;

    modal.classList.remove('modal-visible');
    modal.addEventListener('transitionend', () => modal.remove(), { once: true });
    document.removeEventListener('keydown', handleEsc);
}

function handleEsc(e) {
    if (e.key === 'Escape') closeModal();
}