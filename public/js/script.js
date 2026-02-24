// Paleta "Industrial Dark": Tonos oscuros, elegantes y profesionales
const coloresBordes = [
    '#1c2b46', // Azul Naval Profundo
    '#2d2d2d', // Grafito / Carbono
    '#3e2723', // Marrón Café Oscuro
    '#263238', // Pizarra Azulado
    '#311b92', // Índigo Profundo
    '#1b5e20', // Bosque Seco (Oscuro)
    '#4a148c', // Púrpura Imperial
    '#37474f'  // Acero Grisáceo
];

const mapaColores = {}; 
let colorIdx = 0;

function obtenerColor(grupo) {
    if (!mapaColores[grupo]) {
        mapaColores[grupo] = coloresBordes[colorIdx % coloresBordes.length];
        colorIdx++;
    }
    return mapaColores[grupo];
}

function formatearFecha(timestamp) {
    if (timestamp === 0) return "--:--:--";
    const fecha = new Date(timestamp * 1000);
    const hoy = new Date();
    const esHoy = fecha.toDateString() === hoy.toDateString();

    const hora = fecha.toLocaleTimeString('es-AR', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    });

    return esHoy ? hora : `${fecha.toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit'})} ${hora}`;
}

async function fetchStatus() {
    try {
        const response = await fetch('/json/status.json?t=' + Date.now());
        const data = await response.json();
        
        data.sort((a, b) => {
            if (a.grupo !== b.grupo) return a.grupo.localeCompare(b.grupo);
            return a.nombre.localeCompare(b.nombre);
        });

        render(data);
    } catch (e) { console.error("Error cargando JSON", e); }
}

function render(data) {
    const dash = document.getElementById('dashboard');
    dash.innerHTML = '';

    data.forEach(h => {
        const card = document.createElement('div');
        const ipSplit = h.ip.split('.');
        const ipCorta = `${ipSplit[2]}.${ipSplit[3]}`;

        card.style.borderLeftColor = obtenerColor(h.grupo);
        
        card.innerHTML = `
            <div class="host-name">${h.nombre}</div>
            <div class="host-time">${ipCorta} | ${formatearFecha(h.last_seen)}</div>
        `;

        if (h.missed === 0) card.className = 'host-card status-verde';
        else if (h.missed < 10) card.className = 'host-card status-amarillo';
        else card.className = 'host-card status-rojo';

        dash.appendChild(card);
    });
}

fetchStatus();
setInterval(fetchStatus, 3000);