#!/bin/bash
# =============================================
# CONFIGURACIÓN CENTRAL DEL MONITOR DE RED
# Editá estos valores para ajustar el comportamiento
# =============================================

TIMEOUT_SEGUNDOS=2      # Tiempo máximo de espera por ping individual (segundos)
INTERVALO_CICLO=15      # Segundos entre rondas de pings

PINGS_PARA_WARNING=3    # Pings consecutivos perdidos para estado amarillo
PINGS_PARA_ERROR=7      # Pings consecutivos perdidos para estado rojo

HISTORY_SIZE=20         # Cantidad de resultados a recordar por host