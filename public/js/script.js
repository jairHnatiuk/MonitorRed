import { showHistoryModal } from './modal.js';

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

// Valores por defecto — se sobreescriben con lo que venga del JSON
let META = { warning: 1, error: 5 };

const mapaColores = {};
let colorIdx = 0;

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

        // Lógica corregida: respeta ambos umbrales
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

        // Leer umbrales desde el JSON (generados por config.sh → monitor.sh)
        if (json.meta) META = json.meta;

        const hosts = (json.hosts ?? json).sort((a, b) => {
            const g = a.grupo.localeCompare(b.grupo);
            return g !== 0 ? g : a.nombre.localeCompare(b.nombre);
        });

        render(hosts);
    } catch (e) {
        console.error('Error cargando status.json:', e);
    }
}

fetchStatus();
setInterval(fetchStatus, 3000);