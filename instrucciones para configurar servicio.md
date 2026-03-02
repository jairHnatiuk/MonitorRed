Crear dos archivos .service en /etc/systemd/system

sudo systemctl daemon-reload
sudo systemctl enable monitorRedWeb.service
sudo systemctl start monitorRedWeb.service

[Unit]
Description=Script de Monitoreo de Red
After=network.target

[Service]
ExecStart=/bin/bash /usr/local/monitorRed/monitor.sh
WorkingDirectory=/usr/local/monitorRed
StandardOutput=inherit
StandardError=inherit
Restart=always
User=admin

[Install]
WantedBy=multi-user.target
admin@raspberrypi:/etc/systemd/system $ cat monitorRedWeb.service
[Unit]
Description=Servidor Web Dashboard
After=network.target

[Service]
# Ejecuta el servidor en el puerto 8080
ExecStart=/usr/bin/python3 -m http.server 8080
WorkingDirectory=/usr/local/monitorRed/public
StandardOutput=inherit
StandardError=inherit
Restart=always
User=admin

[Install]
WantedBy=multi-user.target