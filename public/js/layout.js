// =============================================
// LAYOUT: Calcula la grilla óptima y maneja el toggle
// =============================================

// 'col' = se llena de arriba abajo primero (por columna)
// 'row' = se llena de izquierda a derecha primero (por fila)
let modoActual = 'col';

const ICON_COL = `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="5" height="18" rx="1"/>
  <rect x="10" y="3" width="5" height="18" rx="1"/>
  <rect x="17" y="3" width="5" height="18" rx="1"/>
</svg>`;

const ICON_ROW = `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3"  width="18" height="5" rx="1"/>
  <rect x="3" y="10" width="18" height="5" rx="1"/>
  <rect x="3" y="17" width="18" height="5" rx="1"/>
</svg>`;

/**
 * Calcula la cantidad óptima de columnas dada la cantidad de tarjetas
 * y el aspect ratio del viewport.
 * Busca la combinación cols×rows que minimice el espacio desperdiciado
 * y se acerque al ratio del contenedor.
 */
function calcularGrid(n) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const GAP = 10;
    const PAD = 20; // padding total del dashboard (2 × 10px)

    let mejorCols = 1;
    let mejorScore = Infinity;

    for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const cardW = (W - PAD - GAP * (cols - 1)) / cols;
        const cardH = (H - PAD - GAP * (rows - 1)) / rows;

        // Penalizar tarjetas demasiado angostas o demasiado bajas
        const aspectCard = cardW / cardH;
        // Aspect ratio "ideal" para una tarjeta de este tipo: ~3:1
        const TARGET = 3.5;
        const score = Math.abs(Math.log(aspectCard / TARGET));
        
        // Penalización extra si hay demasiadas celdas vacías (> 15% del total)
        const vacias = cols * rows - n;
        const penVacias = vacias > cols ? (vacias / (cols * rows)) * 2 : 0;

        if (score + penVacias < mejorScore) {
            mejorScore = score + penVacias;
            mejorCols = cols;
        }
    }

    return { cols: mejorCols, rows: Math.ceil(n / mejorCols) };
}

/**
 * Aplica el layout al contenedor según el modo y cantidad de tarjetas.
 */
export function aplicarLayout(dash, n) {
    if (n === 0) return;

    const { cols, rows } = calcularGrid(n);

    dash.style.display    = 'grid';
    dash.style.gap        = '10px';
    dash.style.padding    = '10px';
    dash.style.boxSizing  = 'border-box';
    dash.style.width      = '100%';
    dash.style.height     = '100%';
    dash.style.overflow   = 'hidden';

    if (modoActual === 'col') {
        // Relleno por columna: fijo el número de filas, las columnas se generan solas
        dash.style.gridAutoFlow       = 'column';
        dash.style.gridTemplateRows   = `repeat(${rows}, 1fr)`;
        dash.style.gridTemplateColumns = '';
    } else {
        // Relleno por fila: fijo el número de columnas
        dash.style.gridAutoFlow        = 'row';
        dash.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        dash.style.gridTemplateRows    = '';
    }

    actualizarBoton();
}

/**
 * Crea e inyecta el botón toggle si no existe todavía.
 * Devuelve el botón.
 */
export function iniciarBotonLayout(onToggle) {
    let btn = document.getElementById('layout-toggle');
    if (btn) return btn;

    btn = document.createElement('button');
    btn.id = 'layout-toggle';
    btn.title = 'Cambiar disposición';
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
        modoActual = modoActual === 'col' ? 'row' : 'col';
        onToggle();
    });

    actualizarBoton();
    return btn;
}

function actualizarBoton() {
    const btn = document.getElementById('layout-toggle');
    if (!btn) return;
    // Muestra el ícono del modo al que VA a cambiar (no el actual)
    if (modoActual === 'col') {
        btn.innerHTML = ICON_ROW;
        btn.title = 'Cambiar a diseño por fila';
    } else {
        btn.innerHTML = ICON_COL;
        btn.title = 'Cambiar a diseño por columna';
    }
}