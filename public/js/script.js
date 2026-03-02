import { showHistoryModal } from './modal.js';

// =============================================
// PALETA DE COLORES POR GRUPO
// =============================================
const COLORES_BORDE = [
    '#1c2b46',
    '#2d2d2d',
    '#3e2723',
    '#263238',
    '#311b92',
    '#1b5e20',
    '#4a148c',
    '#37474f',
];

let META = { warning: 1, error: 5 };

const mapaColores = {};
let colorIdx = 0;

// =============================================
// TAMAÑO DE FUENTE — cookie
// =============================================
const FS_MIN     = 0.6;
const FS_MAX     = 1.8;
const FS_STEP    = 0.1;
const FS_DEFAULT = 1.0;

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? parseFloat(decodeURIComponent(match[1])) : null;
}

function setCookie(name, value) {
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 2);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
}

let fontScale = getCookie('fontScale') ?? FS_DEFAULT;

function applyFontScale(scale) {
    fontScale = Math.round(Math.max(FS_MIN, Math.min(FS_MAX, scale)) * 100) / 100;
    document.documentElement.style.setProperty('--fs', fontScale);
    setCookie('fontScale', fontScale);
    const label = document.getElementById('font-size-label');
    if (label) label.textContent = Math.round(fontScale * 100) + '%';
}

function initFontControls() {
    const ctrl = document.createElement('div');
    ctrl.id = 'font-controls';
    ctrl.innerHTML = `
        <button id="fs-minus" title="Reducir texto">−</button>
        <span id="font-size-label"></span>
        <button id="fs-plus"  title="Agrandar texto">+</button>
    `;
    document.body.appendChild(ctrl);

    document.getElementById('fs-minus').addEventListener('click', () => applyFontScale(fontScale - FS_STEP));
    document.getElementById('fs-plus' ).addEventListener('click', () => applyFontScale(fontScale + FS_STEP));

    applyFontScale(fontScale);
}

// =============================================
// LAYOUT GRID
// Itera todas las opciones de columnas y elige
// la que produce las tarjetas más grandes,
// garantizando que TODAS entren en pantalla.
// =============================================
const GAP = 10;
const PAD = 10;

function calcGrid(n) {
    const vw = window.innerWidth  - PAD * 2;
    const vh = window.innerHeight - PAD * 2;

    let bestCols = 1;
    let bestArea = 0;

    for (let cols = 1; cols <= n; cols++) {
        const rows  = Math.ceil(n / cols);
        const cardW = (vw - GAP * (cols - 1)) / cols;
        const cardH = (vh - GAP * (rows - 1)) / rows;
        // Solo cuenta si la tarjeta tiene dimensiones positivas
        if (cardW <= 0 || cardH <= 0) continue;
        const area = cardW * cardH;
        if (area > bestArea) {
            bestArea = area;
            bestCols = cols;
        }
    }

    return { cols: bestCols, rows: Math.ceil(n / bestCols) };
}

function applyGrid(n) {
    const dash = document.getElementById('dashboard');
    const { cols, rows } = calcGrid(n);
    dash.style.display             = 'grid';
    dash.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    dash.style.gridTemplateRows    = `repeat(${rows}, 1fr)`;
}

// =============================================
// RENDER
// =============================================
function render(hosts) {
    const dash = document.getElementById('dashboard');
    dash.innerHTML = '';

    applyGrid(hosts.length);

    hosts.forEach(h => {
        const card = document.createElement('div');

        card.style.borderLeftColor = obtenerColorGrupo(h.grupo);
        card.innerHTML = `
            <div class="host-name">${h.nombre}</div>
            <div class="host-ip">${h.ip}</div>
            <div class="host-time">${formatearFecha(h.last_seen)}</div>
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
let lastHostCount = 0;

async function fetchStatus() {
    try {
        const res  = await fetch('/json/status.json?t=' + Date.now());
        const json = await res.json();

        if (json.meta) META = json.meta;

        const hosts = (json.hosts ?? json).sort((a, b) => {
            const g = a.grupo.localeCompare(b.grupo);
            return g !== 0 ? g : a.nombre.localeCompare(b.nombre);
        });

        render(hosts);
        lastHostCount = hosts.length;
    } catch (e) {
        console.error('Error cargando status.json:', e);
    }
}

window.addEventListener('resize', () => {
    if (lastHostCount > 0) applyGrid(lastHostCount);
});

initFontControls();
fetchStatus();
setInterval(fetchStatus, 3000);