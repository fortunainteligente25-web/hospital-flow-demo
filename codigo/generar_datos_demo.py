#!/usr/bin/env python3
"""
Genera demo/data.js a partir de datos_limpios/. Sin claves, sin red.

Creador: Flavio Durán (con ayuda de Claude)
Día: 20/11/2026
Problemas vistos:
  1. Los CSV de origen no traen ubicación de los hospitales: las coordenadas vienen
     de codigo/limpieza.py y son aproximadas.
  2. No hay datos de esperas de urgencias ni de ocupación: la demo los marca como simulados.
  3. No hay datos por especialidad: la lista de espera es la del hospital en general.
  4. No tengo los datos oficiales de taxis: los teléfonos de ejemplo van marcados como sin verificar.

Uso:  python3 codigo/generar_datos_demo.py
"""
import json
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
LIMPIOS = RAIZ / "datos_limpios"
SALIDA = RAIZ / "demo" / "data.js"

# Números de ejemplo: NO verificados. Confirmarlos en el listado oficial antes de usarlos.
TAXIS = [
    {"nombre": "Tele Taxi", "telefono": "+34913712131", "verificado": False},
    {"nombre": "pidetaxi", "telefono": "+34915478200", "verificado": False},
]


def ultimo(df: pd.DataFrame, hospital_id: str):
    """Último año con dato de demora media para un hospital (o None)."""
    sub = df[(df["hospital_id"] == hospital_id) & df["demora_media_dias"].notna()]
    if sub.empty:
        return None
    fila = sub.sort_values("anio").iloc[-1]
    pacientes = fila["pacientes"]
    return {
        "anio": int(fila["anio"]),
        "pacientes": None if pd.isna(pacientes) else int(pacientes),
        "demora_dias": round(float(fila["demora_media_dias"]), 1),
    }


def main() -> None:
    hosp = pd.read_csv(LIMPIOS / "hospitales.csv")
    quir = pd.read_csv(LIMPIOS / "lista_espera_quirurgica.csv")
    pru = pd.read_csv(LIMPIOS / "lista_espera_pruebas.csv")

    hospitales = []
    for _, h in hosp.iterrows():
        hospitales.append({
            "id": str(h["hospital_id"]),
            "nombre": str(h["hospital"]),
            "municipio": str(h["municipio"]),
            "lat": float(h["lat"]),
            "lon": float(h["lon"]),
            "solo_ninos": bool(h["solo_ninos"]),
            "quirurgica": ultimo(quir, h["hospital_id"]),
            "pruebas": ultimo(pru, h["hospital_id"]),
        })

    datos = {
        "fuente": "Comunidad de Madrid · datos abiertos (limpiados con codigo/limpieza.py)",
        "generado": "2026-11-20",
        "hospitales": hospitales,
        "taxis": TAXIS,
    }
    cuerpo = json.dumps(datos, ensure_ascii=False, indent=1)
    SALIDA.parent.mkdir(exist_ok=True)
    SALIDA.write_text(
        "/* Generado por codigo/generar_datos_demo.py. No editar a mano. */\n"
        "window.HF_DATOS = " + cuerpo + ";\n",
        encoding="utf-8",
    )
    print(f"OK  {SALIDA.relative_to(RAIZ)} · {len(hospitales)} hospitales")


if __name__ == "__main__":
    main()
