// Paleta de colores para los bordes de los grupos
const coloresGrupos = [
    '#89b4fa', '#f5c2e7', '#fab387', '#94e2d5', 
    '#cba6f7', '#f9e2af', '#a6e3a1', '#eba0ac'
];
const mapaColores = {}; 
let colorIndex = 0;

function obtenerColorGrupo(nombreGrupo) {
    if (!mapaColores[nombreGrupo]) {
        mapaColores[nombreGrupo] = coloresGrupos[colorIndex % coloresGrupos.length];
        colorIndex++;
    }
    return mapaColores[nombreGrupo];
}

function formatearFecha(timestamp) {
    if (timestamp === 0) return "nunca";
    const fechaHost = new Date(timestamp * 1000);
    const hoy = new Date();
    const esHoy = fechaHost.toDateString() === hoy.toDateString();

    const horaStr = fechaHost.toLocaleTimeString('es-AR', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    });

    return esHoy ? horaStr : `${fechaHost.toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit'})} ${horaStr}`;
}

async function fetchStatus() {
    try {
        const response = await fetch('status.json?t=' + new Date().getTime());
        const data = await response.json();
        renderDashboard(data);
    } catch (error) {
        console.error("Error:", error);
    }
}

function renderDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';

    // Ordenar: primero por GRUPO, luego por NOMBRE
    data.sort((a, b) => {
        if (a.grupo < b.grupo) return -1;
        if (a.grupo > b.grupo) return 1;
        return a.nombre.localeCompare(b.nombre);
    });

    data.forEach(host => {
        const card = document.createElement('div');
        const octetos = host.ip.split('.');
        const ipCorta = octetos.length === 4 ? `${octetos[2]}.${octetos[3]}` : host.ip;
        
        // Asignar color de borde según el grupo
        const colorBorde = obtenerColorGrupo(host.grupo);
        card.style.borderLeftColor = colorBorde;

        card.innerHTML = `
            <div class="host-name">${host.nombre} (${ipCorta})</div>
            <div class="host-time">${formatearFecha(host.last_seen)}</div>
        `;

        // Color de fondo según estado
        if (host.missed === 0) card.className = 'host-card status-verde';
        else if (host.missed < 10) card.className = 'host-card status-amarillo';
        else card.className = 'host-card status-rojo';

        dashboard.appendChild(card);
    });
}

fetchStatus();
setInterval(fetchStatus, 3000);