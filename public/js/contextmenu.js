// =============================================
// MENU CONTEXTUAL: clic derecho en cualquier parte de la pantalla
// =============================================

function ocultarMenu(menu) {
    menu.classList.remove('ctx-visible');
}

function mostrarConfirmacionCierre() {
    const overlay = document.createElement('div');
    overlay.id = 'close-confirm';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-box" style="width: 320px;">
            <div class="modal-header">
                <div class="modal-titles">
                    <span class="modal-title">Cerrar aplicación</span>
                </div>
                <button class="modal-close" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">
                <p class="confirm-text">¿Seguro que querés cerrar la aplicación?</p>
                <div class="confirm-actions">
                    <button class="confirm-btn confirm-btn-cancel">Cancelar</button>
                    <button class="confirm-btn confirm-btn-danger">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));

    function cerrarDialogo() {
        overlay.classList.remove('modal-visible');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        document.removeEventListener('keydown', handleEsc);
    }

    function handleEsc(e) {
        if (e.key === 'Escape') cerrarDialogo();
    }

    overlay.addEventListener('click', e => { if (e.target === overlay) cerrarDialogo(); });
    overlay.querySelector('.modal-close').addEventListener('click', cerrarDialogo);
    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', cerrarDialogo);
    overlay.querySelector('.confirm-btn-danger').addEventListener('click', () => {
        // Los navegadores solo permiten cerrar pestañas/ventanas abiertas por script;
        // en modo kiosco (chromium --app / --kiosk) esto sí cierra la ventana.
        window.close();
    });

    document.addEventListener('keydown', handleEsc);
}

export function initContextMenu() {
    const menu = document.createElement('div');
    menu.id = 'ctx-menu';
    menu.className = 'ctx-menu';
    menu.innerHTML = `<div class="ctx-menu-item" id="ctx-cerrar-app">Cerrar aplicación</div>`;
    document.body.appendChild(menu);

    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        menu.style.left = e.clientX + 'px';
        menu.style.top  = e.clientY + 'px';
        menu.classList.add('ctx-visible');

        // Recalcula tras el layout para que el menú no se salga de pantalla
        const rect = menu.getBoundingClientRect();
        const overflowX = rect.right  - window.innerWidth;
        const overflowY = rect.bottom - window.innerHeight;
        if (overflowX > 0) menu.style.left = Math.max(10, e.clientX - overflowX - 10) + 'px';
        if (overflowY > 0) menu.style.top  = Math.max(10, e.clientY - overflowY - 10) + 'px';
    });

    document.addEventListener('click', () => ocultarMenu(menu));
    window.addEventListener('blur', () => ocultarMenu(menu));

    menu.querySelector('#ctx-cerrar-app').addEventListener('click', e => {
        e.stopPropagation();
        ocultarMenu(menu);
        mostrarConfirmacionCierre();
    });
}
