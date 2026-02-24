#!/bin/bash

CSV_FILE="hosts.csv"
JSON_FILE="public/json/status.json"
TMP_DIR=$(mktemp -d -p /dev/shm)

declare -A missed_count
declare -A host_name
declare -A host_group
declare -A last_seen # Nuevo diccionario para el timestamp

while IFS=',' read -r ip name group || [ -n "$ip" ]; do
    [[ -z "$ip" || "$ip" == \#* ]] && continue

    ip=$(echo "$ip" | tr -d '\r')
    name=$(echo "$name" | tr -d '\r')
    group=$(echo "$group" | tr -d '\r')

    missed_count["$ip"]=0
    host_name["$ip"]="$name"
    host_group["$ip"]="$group"
    last_seen["$ip"]=0 # Inicializamos en 0 (nunca)
done < "$CSV_FILE"

cleanup() {
    rm -rf "$TMP_DIR"
    echo -e "\nMonitor detenido."
    exit 0
}
trap cleanup EXIT INT TERM

echo "Iniciando monitor con registro de tiempo..."

while true; do
    # Lanzar pings
    for ip in "${!host_name[@]}"; do
        (
            if ping -c 1 -W 1 "$ip" > /dev/null 2>&1; then
                echo 0 > "$TMP_DIR/$ip"
            else
                echo 1 > "$TMP_DIR/$ip"
            fi
        ) &
    done

    wait

    # Construir JSON
    JSON="["
    FIRST=1

    for ip in "${!host_name[@]}"; do
        if [ -f "$TMP_DIR/$ip" ]; then
            res=$(cat "$TMP_DIR/$ip")
            if [ "$res" -eq 0 ]; then
                missed_count["$ip"]=0
                last_seen["$ip"]=$(date +%s) # Guardamos el timestamp actual
            else
                missed_count["$ip"]=$((missed_count["$ip"] + 1))
            fi
        fi

        name="${host_name[$ip]}"
        group="${host_group[$ip]}"
        missed=${missed_count[$ip]}
        seen=${last_seen[$ip]}

        if [ $FIRST -eq 0 ]; then
            JSON+=","
        fi
        # Agregamos "last_seen" al JSON
        JSON+="{\"ip\":\"$ip\", \"nombre\":\"$name\", \"grupo\":\"$group\", \"missed\":$missed, \"last_seen\":$seen}"
        FIRST=0
    done

    JSON+="]"

    echo "$JSON" > "$JSON_FILE.tmp"
    mv "$JSON_FILE.tmp" "$JSON_FILE"

    sleep 4
done