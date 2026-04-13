El único cambio que tenés que hacer al script bash es reemplazar la lectura del CSV por esta línea:

while IFS='|' read -r ip nombre grupo; do
    # tu lógica de ping, igual que antes
done < <(sqlite3 data/monitor.db "SELECT ip,nombre,grupo FROM hosts WHERE activo=1")


Y para arrancar, solo:

bashpip3 install flask --break-system-packages
python3 server.py

# Migración a SQLite — Python / Flask
# (sin Node, sin npm, sin dependencias pesadas)

## Qué cambia respecto a antes

| Antes                      | Ahora                              |
|----------------------------|------------------------------------|
| `python -m http.server`    | `python3 server.py` (Flask)        |
| Lee hosts de `hosts.csv`   | Lee hosts de `data/monitor.db`     |
| Sin API                    | API REST en `/api/hosts`           |
| Sin ABM                    | ABM en `http://pi:3000/abm`        |
| Script bash lee el CSV     | Script bash lee SQLite (ver abajo) |

El `abm.html`, `index.html`, `style.css` y los `.js` del frontend **no cambian nada**.

---

## Estructura resultante

```
proyecto/
├── data/
│   ├── monitor.db          ← se crea automáticamente
│   └── ping_state.json     ← escrito por el bash (igual que antes)
├── public/
│   ├── index.html
│   ├── abm.html            ← página de gestión de hosts
│   ├── css/style.css
│   └── js/
│       ├── script.js
│       ├── layout.js
│       └── modal.js
├── hosts.csv               ← solo para la migración inicial
├── config.sh
└── server.py               ← reemplaza python -m http.server
```

---

## 1. Instalación (solo Flask)

```bash
pip3 install flask

# En Raspberry Pi OS con Python 3.11+ puede requerir:
pip3 install flask --break-system-packages

# O con entorno virtual (recomendado):
python3 -m venv venv
source venv/bin/activate
pip install flask
```

`sqlite3` ya viene incluido en Python. No hay nada más que instalar.

---

## 2. Primera ejecución

```bash
python3 server.py
# [DB] Migración completada: 104 hosts importados desde hosts.csv
# Monitor corriendo en  http://0.0.0.0:3000
# ABM de hosts en       http://0.0.0.0:3000/abm
```

La migración desde `hosts.csv` corre **solo una vez**.
Para reimportar: `rm data/monitor.db && python3 server.py`

---

## 3. Adaptar el script bash

Reemplazá la lectura del CSV por:

```bash
DB="data/monitor.db"

while IFS='|' read -r ip nombre grupo; do
    # tu lógica de ping acá — igual que antes
    echo "Pinging $nombre ($ip)..."
done < <(sqlite3 "$DB" "SELECT ip,nombre,grupo FROM hosts WHERE activo=1 ORDER BY grupo,nombre")
```

El `ping_state.json` no cambia nada, el bash lo sigue escribiendo igual.

---

## 4. Servicio systemd

```bash
sudo nano /etc/systemd/system/network-monitor.service
```

```ini
[Unit]
Description=Network Monitor
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/network-monitor
ExecStart=/usr/bin/python3 server.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable network-monitor
sudo systemctl start  network-monitor
journalctl -u network-monitor -f
```

---

## 5. Recursos en Raspberry Pi

- RAM en reposo: ~15–20 MB (vs ~8 MB de http.server)
- CPU en idle: 0%
- monitor.db con ~100 hosts: < 100 KB