#!/usr/bin/env python3
# =============================================================================
# server.py  —  reemplaza "python -m http.server"
# Uso:  python3 server.py
# =============================================================================

import json
import os
import sqlite3
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, abort

# ── Rutas base ────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
PUBLIC_DIR  = BASE_DIR / "public"
DATA_DIR    = BASE_DIR / "data"
DB_PATH     = DATA_DIR / "monitor.db"
CSV_PATH    = BASE_DIR / "hosts.csv"
PING_STATE  = DATA_DIR / "ping_state.json"

DATA_DIR.mkdir(exist_ok=True)

app = Flask(__name__, static_folder=None)

# =============================================================================
# BASE DE DATOS
# =============================================================================

def get_db():
    """Devuelve una conexión con row_factory para obtener dicts."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Crea la tabla si no existe y migra desde CSV."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS hosts (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                ip         TEXT    NOT NULL UNIQUE,
                nombre     TEXT    NOT NULL,
                grupo      TEXT    NOT NULL DEFAULT 'Sin grupo',
                activo     INTEGER NOT NULL DEFAULT 1,
                orden      INTEGER NOT NULL DEFAULT 0,
                creado     TEXT    NOT NULL DEFAULT (datetime('now')),
                modificado TEXT    NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_hosts_grupo  ON hosts(grupo);
            CREATE INDEX IF NOT EXISTS idx_hosts_activo ON hosts(activo);
        """)

    # Migrar CSV solo si la tabla está vacía
    with get_db() as conn:
        n = conn.execute("SELECT COUNT(*) FROM hosts").fetchone()[0]
        if n == 0 and CSV_PATH.exists():
            _migrar_csv(conn)


def _migrar_csv(conn):
    lineas = CSV_PATH.read_text(encoding="utf-8").splitlines()
    rows = []
    for idx, linea in enumerate(lineas):
        linea = linea.strip()
        if not linea:
            continue
        partes = linea.split(",", 2)
        if len(partes) < 2:
            continue
        rows.append((
            partes[0].strip(),
            partes[1].strip(),
            partes[2].strip() if len(partes) > 2 else "Sin grupo",
            idx,
        ))
    conn.executemany(
        "INSERT OR IGNORE INTO hosts (ip, nombre, grupo, orden) VALUES (?,?,?,?)",
        rows,
    )
    print(f"[DB] Migración completada: {len(rows)} hosts importados desde hosts.csv")


# =============================================================================
# HELPERS
# =============================================================================

def validar_host(ip, nombre, grupo):
    if not ip    or not ip.strip():     raise ValueError("La IP es obligatoria.")
    if not nombre or not nombre.strip():raise ValueError("El nombre es obligatorio.")
    if not grupo or not grupo.strip():  raise ValueError("El grupo es obligatorio.")



def leer_estado_pings():
    """Lee el JSON de estado que escribe el script bash."""
    try:
        data = json.loads(PING_STATE.read_text(encoding="utf-8"))
        
        # El bash escribe {"hosts":[{ip, missed, last_seen, history},...]}
        # Convertimos a dict indexado por IP para lookup rápido
        if "hosts" in data:
            return {h["ip"]: h for h in data["hosts"]}
        
        # Formato dict por IP (fallback)
        return data
    except Exception:
        return {}

def fail(msg, status=400):
    return jsonify({"ok": False, "error": msg}), status


# =============================================================================
# ARCHIVOS ESTÁTICOS  (reemplaza python -m http.server)
# =============================================================================

@app.route("/")
def index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.route("/abm")
def abm():
    return send_from_directory(PUBLIC_DIR, "abm.html")


@app.route("/<path:filename>")
def static_files(filename):
    """Sirve cualquier archivo dentro de public/."""
    full = PUBLIC_DIR / filename
    if full.is_file():
        return send_from_directory(PUBLIC_DIR, filename)
    abort(404)


# =============================================================================
# ENDPOINT QUE USA EL FRONTEND DEL MONITOR
# =============================================================================

@app.route("/json/status.json")
def status_json():
    estado = leer_estado_pings()
    with get_db() as conn:
        hosts = conn.execute(
            "SELECT ip, nombre, grupo FROM hosts WHERE activo=1 ORDER BY grupo, nombre"
        ).fetchall()

    resultado = []
    for h in hosts:
        ip = h["ip"]
        e  = estado.get(ip, {})
        resultado.append({
            "ip":        ip,
            "nombre":    h["nombre"],
            "grupo":     h["grupo"],
            "missed":    e.get("missed",    0),
            "last_seen": e.get("last_seen", None),
            "history":   e.get("history",   []),
        })

    return jsonify({
        "meta":  {"warning": 3, "error": 7},
        "hosts": resultado,
    })


# =============================================================================
# API REST  /api/hosts
# =============================================================================

@app.route("/api/hosts", methods=["GET"])
def api_get_hosts():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, ip, nombre, grupo, activo, orden FROM hosts ORDER BY grupo, nombre"
        ).fetchall()
    return jsonify({"ok": True, "hosts": [dict(r) for r in rows]})


@app.route("/api/hosts/grupos", methods=["GET"])
def api_get_grupos():
    with get_db() as conn:
        rows = conn.execute("SELECT DISTINCT grupo FROM hosts ORDER BY grupo").fetchall()
    return jsonify({"ok": True, "grupos": [r["grupo"] for r in rows]})


@app.route("/api/hosts/<int:host_id>", methods=["GET"])
def api_get_host(host_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM hosts WHERE id=?", (host_id,)).fetchone()
    if not row:
        return fail("Host no encontrado.", 404)
    return jsonify({"ok": True, "host": dict(row)})


@app.route("/api/hosts", methods=["POST"])
def api_crear_host():
    data = request.get_json(silent=True) or {}
    ip, nombre, grupo = data.get("ip",""), data.get("nombre",""), data.get("grupo","Sin grupo")
    try:
        validar_host(ip, nombre, grupo)
    except ValueError as e:
        return fail(str(e))

    try:
        with get_db() as conn:
            max_orden = conn.execute("SELECT COALESCE(MAX(orden),-1) FROM hosts").fetchone()[0]
            cur = conn.execute(
                "INSERT INTO hosts (ip, nombre, grupo, orden) VALUES (?,?,?,?)",
                (ip.strip(), nombre.strip(), grupo.strip(), max_orden + 1),
            )
        return jsonify({"ok": True, "id": cur.lastrowid}), 201
    except sqlite3.IntegrityError:
        return fail(f'La IP "{ip}" ya existe.', 409)


@app.route("/api/hosts/<int:host_id>", methods=["PUT"])
def api_actualizar_host(host_id):
    data = request.get_json(silent=True) or {}
    with get_db() as conn:
        actual = conn.execute("SELECT * FROM hosts WHERE id=?", (host_id,)).fetchone()
        if not actual:
            return fail("Host no encontrado.", 404)

        ip     = data.get("ip",     actual["ip"])
        nombre = data.get("nombre", actual["nombre"])
        grupo  = data.get("grupo",  actual["grupo"])
        activo = data.get("activo", actual["activo"])

        try:
            validar_host(ip, nombre, grupo)
        except ValueError as e:
            return fail(str(e))

        try:
            conn.execute(
                """UPDATE hosts
                   SET ip=?, nombre=?, grupo=?, activo=?, modificado=datetime('now')
                   WHERE id=?""",
                (ip.strip(), nombre.strip(), grupo.strip(), activo, host_id),
            )
        except sqlite3.IntegrityError:
            return fail(f'La IP "{ip}" ya está en uso.', 409)

    return jsonify({"ok": True})


@app.route("/api/hosts/<int:host_id>/activo", methods=["PATCH"])
def api_toggle_activo(host_id):
    data = request.get_json(silent=True) or {}
    if "activo" not in data:
        return fail('Falta el campo "activo".')
    with get_db() as conn:
        conn.execute(
            "UPDATE hosts SET activo=?, modificado=datetime('now') WHERE id=?",
            (1 if data["activo"] else 0, host_id),
        )
    return jsonify({"ok": True})


@app.route("/api/hosts/<int:host_id>", methods=["DELETE"])
def api_eliminar_host(host_id):
    with get_db() as conn:
        cur = conn.execute("DELETE FROM hosts WHERE id=?", (host_id,))
    if cur.rowcount == 0:
        return fail("Host no encontrado.", 404)
    return jsonify({"ok": True})


# =============================================================================
# ARRANQUE
# =============================================================================

if __name__ == "__main__":
    init_db()
    print("Monitor corriendo en  http://0.0.0.0:8080")
    print("ABM de hosts en       http://0.0.0.0:8080/abm")
    # debug=False y threaded=True es adecuado para producción liviana
    app.run(host="0.0.0.0", port=8080, debug=False, threaded=True)