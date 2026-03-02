import { showHistoryModal } from './modal.js';
import { aplicarLayout, iniciarBotonLayout } from './layout.js';

// =============================================
// PALETA DE COLORES POR GRUPO
// =============================================
const COLORES_BORDE = [
    '#1c2b46', // Azul Naval
    '#2d2d2d', // Grafito
    '#3e2723', // Marrón Café
    '#263238', // Pizarra
    '#311b92', // Índigo
    '#1b5e20', // Bosque
    '#4a148c', // Púrpura
    '#37474f', // Acero
];

let META = { warning: 1, error: 5 };

const mapaColores = {};
let colorIdx  = 0;
let lastHosts = [];   // caché para redibujar sin re-fetch al cambiar layout

// =============================================
// RENDER
// =============================================
function render(hosts) {
    const dash = document.getElementById('dashboard');
    dash.innerHTML = '';

    hosts.forEach(h => {
        const card = document.createElement('div');
        const [,, c, d] = h.ip.split('.');

        card.style.borderLeftColor = obtenerColorGrupo(h.grupo);
        card.innerHTML = `
            <div class="host-name">${h.nombre}</div>
            <div class="host-time">${c}.${d} | ${formatearFecha(h.last_seen)}</div>
        `;

        if (h.missed < META.warning) {
            card.className = 'host-card status-verde';
        } else if (h.missed < META.error) {
            card.className = 'host-card status-amarillo';
        } else {
            card.className = 'host-card status-rojo';
        }

        card.addEventListener('click', () => showHistoryModal(h));
        dash.appendChild(card);
    });

    aplicarLayout(dash, hosts.length);
}

// =============================================
// HELPERS
// =============================================
function obtenerColorGrupo(grupo) {
    if (!mapaColores[grupo]) {
        mapaColores[grupo] = COLORES_BORDE[colorIdx % COLORES_BORDE.length];
        colorIdx++;
    }
    return mapaColores[grupo];
}

function formatearFecha(timestamp) {
    if (!timestamp) return '--:--:--';
    const fecha = new Date(timestamp * 1000);
    const hora  = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    if (fecha.toDateString() === new Date().toDateString()) return hora;
    return `${fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${hora}`;
}

// =============================================
// FETCH Y LOOP
// =============================================
async function fetchStatus() {
    try {
        const res  = await fetch('/json/status.json?t=' + Date.now());
        const json = await res.json();

        if (json.meta) META = json.meta;

        lastHosts = (json.hosts ?? json).sort((a, b) => {
            const g = a.grupo.localeCompare(b.grupo);
            return g !== 0 ? g : a.nombre.localeCompare(b.nombre);
        });

        render(lastHosts);
    } catch (e) {
        console.error('Error cargando status.json:', e);
    }
}

// =============================================
// INIT
// =============================================

// El botón llama a render con los datos en caché → sin re-fetch
iniciarBotonLayout(() => render(lastHosts));

// Recalcular layout si cambia el tamaño de la ventana
window.addEventListener('resize', () => {
    if (lastHosts.length) render(lastHosts);
});

fetchStatus();
setInterval(fetchStatus, 3000);