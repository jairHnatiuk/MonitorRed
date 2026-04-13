#!/bin/bash

source "$(dirname "$0")/config.sh"

CSV_FILE="$(dirname "$0")/hosts.csv"
JSON_FILE="$(dirname "$0")/public/json/status.json"
TMP_DIR=$(mktemp -d -p /dev/shm)

declare -A missed_count
declare -A host_name
declare -A host_group
declare -A last_seen

# Leer hosts del CSV
while IFS=',' read -r ip name group || [ -n "$ip" ]; do
    [[ -z "$ip" || "$ip" == \#* ]] && continue
    ip=$(echo "$ip"    | tr -d '\r ')
    name=$(echo "$name"  | tr -d '\r')
    group=$(echo "$group" | tr -d '\r')
    missed_count["$ip"]=0
    host_name["$ip"]="$name"
    host_group["$ip"]="$group"
    last_seen["$ip"]=0
done < "$CSV_FILE"

cleanup() {
    rm -rf "$TMP_DIR"
    echo -e "\nMonitor detenido."
    exit 0
}
trap cleanup EXIT INT TERM

# Convierte el archivo de historial de un host a un array JSON
build_history_json() {
    local safe_ip="${1//./_}"
    local hist_file="$TMP_DIR/hist_$safe_ip"
    local json="["
    local first=1

    if [ -f "$hist_file" ]; then
        while IFS=',' read -r ts ok; do
            [ $first -eq 0 ] && json+=","
            json+="{\"ts\":$ts,\"ok\":$ok}"
            first=0
        done < "$hist_file"
    fi
    echo "${json}]"
}

echo "Monitor iniciado — ciclo: ${INTERVALO_CICLO}s | warning: ${PINGS_PARA_WARNING} | error: ${PINGS_PARA_ERROR}"

while true; do
    # Lanzar todos los pings en paralelo
    for ip in "${!host_name[@]}"; do
        (
            ts=$(date +%s)
            if ping -c 1 -W "$TIMEOUT_SEGUNDOS" "$ip" > /dev/null 2>&1; then
                echo 0 > "$TMP_DIR/$ip"
                echo "$ts,1" >> "$TMP_DIR/hist_${ip//./_}"
            else
                echo 1 > "$TMP_DIR/$ip"
                echo "$ts,0" >> "$TMP_DIR/hist_${ip//./_}"
            fi
        ) &
    done

    wait

    # Recortar historial de cada host a los últimos HISTORY_SIZE registros
    for ip in "${!host_name[@]}"; do
        local_hist="$TMP_DIR/hist_${ip//./_}"
        [ -f "$local_hist" ] && \
            tail -n "$HISTORY_SIZE" "$local_hist" > "${local_hist}.tmp" && \
            mv "${local_hist}.tmp" "$local_hist"
    done

    # Actualizar contadores y construir JSON
    # El bloque "meta" lleva los umbrales para que el frontend no los hardcodee
    JSON="{\"meta\":{\"warning\":$PINGS_PARA_WARNING,\"error\":$PINGS_PARA_ERROR},\"hosts\":["
    FIRST=1

    for ip in "${!host_name[@]}"; do
        if [ -f "$TMP_DIR/$ip" ]; then
            res=$(cat "$TMP_DIR/$ip")
            if [ "$res" -eq 0 ]; then
                missed_count["$ip"]=0
                last_seen["$ip"]=$(date +%s)
            else
                missed_count["$ip"]=$((missed_count["$ip"] + 1))
            fi
        fi

        [ $FIRST -eq 0 ] && JSON+=","
        JSON+="{\"ip\":\"$ip\","
        JSON+="\"nombre\":\"${host_name[$ip]}\","
        JSON+="\"grupo\":\"${host_group[$ip]}\","
        JSON+="\"missed\":${missed_count[$ip]},"
        JSON+="\"last_seen\":${last_seen[$ip]},"
        JSON+="\"history\":$(build_history_json "$ip")}"
        FIRST=0
    done

    JSON+="]}"

    echo "$JSON" > "$JSON_FILE.tmp"
    mv "$JSON_FILE.tmp" "$JSON_FILE"

    sleep "$INTERVALO_CICLO"
done