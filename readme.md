
Logging — logs/server.log con rotación automática: cuando llega a 1 MB rota, guarda hasta 5 archivos (server.log, server.log.1 … server.log.5), así nunca ocupa más de ~5 MB. Loguea accesos al ABM, errores de auth, operaciones CRUD y errores al leer el JSON de pings.
Autenticación — HTTP Basic Auth en /abm y todas las rutas /api/hosts. Lee la clave de abm_password.txt en la raíz del proyecto (al lado de server.py, fuera de public/).

Autenticacion para ABM
# Usuario abm y:
# Primera vez — el archivo se crea solo con "admin" si no existe
# Cambiala así:
echo "tu_nueva_clave" > abm_password.txt


# Rotar monitor.log semanalmente (agregar en crontab -e)
0 0 * * 0 mv /usr/local/monitorRed/logs/monitor.log /usr/local/monitorRed/logs/monitor.log.$(date +\%Y\%m\%d) 2>/dev/null; true