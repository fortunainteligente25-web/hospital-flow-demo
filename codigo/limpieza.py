"""
Limpieza de datos · Hospital Flow (DataMad 2026, Black Bulls)
=============================================================

Creador: Flavio Durán (con ayuda de Claude)
Día: 20/11/2026
Problemas encontrados:
  1. Las tildes y eñes llegan rotas en los cinco archivos: se ven como «�»
     (carácter U+FFFD), así que el texto original no se puede recuperar
     automáticamente. Se reparan con un diccionario de las 38 palabras dañadas.
  2. Los archivos no tienen extensión, aunque son CSV separados por «;».
  3. «Valor» usa «-» cuando no hay dato: se convierte en vacío, no se inventa.
  4. El hospital va dentro del texto de «Concepto»: se extrae a su propia columna.
  5. Las columnas «Código territorio», «Territorio» y «Estado dato» están vacías
     o casi: se eliminan.
  6. Los datos no traen la ubicación de los hospitales: se añaden coordenadas
     APROXIMADAS (ver HOSPITALES) para poder calcular distancias en la demo.

Uso:  python codigo/limpieza.py
Salida: datos_limpios/*.csv y datos_limpios/informe_limpieza.md
Los originales de datos_originales/ no se tocan.
"""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "datos_originales"
DESTINO = RAIZ / "datos_limpios"

# Palabras dañadas -> palabra correcta (todas las que aparecen en los cinco archivos)
REPARACIONES = {
    "telef\ufffdnicas": "telefónicas",
    "Alcorc�n": "Alcorcón", "A�o": "Año", "Cirug�a": "Cirugía", "Cl�nico": "Clínico",
    "C�digo": "Código", "D�as": "Días", "D�az": "Díaz", "Fundaci�n": "Fundación",
    "G�mez": "Gómez", "Jes�s": "Jesús", "Jim�nez": "Jiménez", "Jos�": "José",
    "Madrile�o": "Madrileño", "Mara��n": "Marañón", "M�stoles": "Móstoles",
    "Ni�o": "Niño", "N�mero": "Número", "Pr�ncipe": "Príncipe", "Quir�fanos": "Quirófanos",
    "Ram�n": "Ramón", "Sof�a": "Sofía", "Torrej�n": "Torrejón", "atenci�n": "atención",
    "ces�reas": "cesáreas", "cirug�a": "cirugía", "diagn�sticas": "diagnósticas", "d�a": "día",
    "hospitalizaci�n": "hospitalización", "m�s": "más", "ocupaci�n": "ocupación",
    "p�blicos": "públicos", "quir�fano": "quirófano", "quir�rgica": "quirúrgica",
    "quir�rgicas": "quirúrgicas", "rotaci�n": "rotación", "r�gimen": "régimen", "�ndice": "índice",
}

# Coordenadas APROXIMADAS (±1 km) de cada hospital, para calcular distancias en la demo.
# id, nombre, municipio, lat, lon, solo_ninos
HOSPITALES = [
    ("cruz-roja", "Hospital Central de la Cruz Roja San José y Santa Adela", "Madrid", 40.4458, -3.7065, False),
    ("gomez-ulla", "Hospital Central de la Defensa Gómez Ulla", "Madrid", 40.3938, -3.7368, False),
    ("clinico", "Hospital Clínico San Carlos", "Madrid", 40.4410, -3.7191, False),
    ("fjd", "Hospital Fundación Jiménez Díaz", "Madrid", 40.4376, -3.7203, False),
    ("gregorio-maranon", "Hospital General Universitario Gregorio Marañón", "Madrid", 40.4189, -3.6706, False),
    ("villalba", "Hospital General de Villalba", "Collado Villalba", 40.6290, -4.0110, False),
    ("nino-jesus", "Hospital Infantil Universitario Niño Jesús", "Madrid", 40.4176, -3.6773, True),
    ("rey-juan-carlos", "Hospital Rey Juan Carlos", "Móstoles", 40.3375, -3.8730, False),
    ("12-octubre", "Hospital Universitario 12 de Octubre", "Madrid", 40.3752, -3.6975, False),
    ("alcorcon", "Hospital Universitario Fundación Alcorcón", "Alcorcón", 40.3500, -3.8350, False),
    ("infanta-cristina", "Hospital Universitario Infanta Cristina", "Parla", 40.2245, -3.7660, False),
    ("infanta-elena", "Hospital Universitario Infanta Elena", "Valdemoro", 40.1970, -3.6630, False),
    ("infanta-leonor", "Hospital Universitario Infanta Leonor", "Madrid", 40.3860, -3.6050, False),
    ("infanta-sofia", "Hospital Universitario Infanta Sofía", "San Sebastián de los Reyes", 40.5590, -3.6110, False),
    ("la-paz", "Hospital Universitario La Paz", "Madrid", 40.4806, -3.6872, False),
    ("principe-asturias", "Hospital Universitario Príncipe de Asturias", "Alcalá de Henares", 40.5127, -3.3498, False),
    ("puerta-hierro", "Hospital Universitario Puerta de Hierro Majadahonda", "Majadahonda", 40.4470, -3.8740, False),
    ("ramon-y-cajal", "Hospital Universitario Ramón y Cajal", "Madrid", 40.4887, -3.6900, False),
    ("santa-cristina", "Hospital Universitario Santa Cristina", "Madrid", 40.4210, -3.6720, False),
    ("severo-ochoa", "Hospital Universitario Severo Ochoa", "Leganés", 40.3270, -3.7660, False),
    ("fuenlabrada", "Hospital Universitario de Fuenlabrada", "Fuenlabrada", 40.2960, -3.8000, False),
    ("getafe", "Hospital Universitario de Getafe", "Getafe", 40.3010, -3.7140, False),
    ("mostoles", "Hospital Universitario de Móstoles", "Móstoles", 40.3260, -3.8600, False),
    ("torrejon", "Hospital Universitario de Torrejón", "Torrejón de Ardoz", 40.4570, -3.4690, False),
    ("la-princesa", "Hospital Universitario de la Princesa", "Madrid", 40.4350, -3.6720, False),
    ("henares", "Hospital Universitario del Henares", "Coslada", 40.4280, -3.5480, False),
    ("sureste", "Hospital Universitario del Sureste", "Arganda del Rey", 40.3000, -3.4400, False),
    ("tajo", "Hospital Universitario del Tajo", "Aranjuez", 40.0300, -3.6000, False),
    ("el-escorial", "Hospital de El Escorial", "San Lorenzo de El Escorial", 40.5870, -4.1300, False),
]
ID_POR_NOMBRE = {nombre: hid for hid, nombre, *_ in HOSPITALES}

ARCHIVOS = {
    "Lista de espera qirúrgica": "lista_espera_quirurgica.csv",
    "Lista de espera para pruebas": "lista_espera_pruebas.csv",
    "Hospitales y Datos Asistencia": "asistencia_madrid.csv",
    "Indicadores Hospitalarios": "indicadores_hospitalarios.csv",
    "Indicadores Hospitalarios Servicios Madrileños": "indicadores_sermas.csv",
}


def reparar(texto: str) -> str:
    for roto, bien in REPARACIONES.items():
        texto = texto.replace(roto, bien)
    return texto


def leer(nombre: str) -> tuple[pd.DataFrame, int]:
    bruto = (ORIGEN / nombre).read_text(encoding="utf-8")
    rotos = bruto.count("�")
    limpio = reparar(bruto)
    restantes = limpio.count("�")
    if restantes:
        raise ValueError(f"{nombre}: quedan {restantes} caracteres rotos sin reparar")
    from io import StringIO
    return pd.read_csv(StringIO(limpio), sep=";", dtype=str), rotos


def ordenar(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    cambios = []
    vacias = [c for c in df.columns if df[c].isna().all() or df[c].nunique() <= 1 and c != "Concepto"]
    vacias = [c for c in vacias if c in ("Tipo territorio", "Código territorio", "Territorio", "Estado dato")]
    df = df.drop(columns=vacias)
    if vacias:
        cambios.append(f"Columnas eliminadas por estar vacías o sin información: {', '.join(vacias)}.")
    df = df.rename(columns={"Año": "anio", "Concepto": "concepto", "Medida": "medida", "Valor": "valor", "Unidad": "unidad"})
    guiones = int((df["valor"] == "-").sum())
    df["valor"] = pd.to_numeric(df["valor"].replace("-", pd.NA), errors="coerce")
    if guiones:
        cambios.append(f"{guiones} valores «-» (sin dato) convertidos a vacío.")
    df["anio"] = df["anio"].astype(int)
    antes = len(df)
    df = df.drop_duplicates()
    if antes - len(df):
        cambios.append(f"{antes - len(df)} filas duplicadas eliminadas.")
    return df, cambios


def lista_espera(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Pasa a una fila por hospital y año, con pacientes y demora media en columnas."""
    df = df.copy()
    df["hospital"] = df["concepto"].str.split(" en el ").str[-1].str.strip()
    desconocidos = sorted(set(df["hospital"]) - set(ID_POR_NOMBRE))
    if desconocidos:
        raise ValueError(f"Hospitales sin coordenadas: {desconocidos}")
    df["hospital_id"] = df["hospital"].map(ID_POR_NOMBRE)
    ancho = df.pivot_table(index=["anio", "hospital_id", "hospital"], columns="medida", values="valor", aggfunc="first").reset_index()
    ancho.columns.name = None
    ancho = ancho.rename(columns={"Pacientes": "pacientes", "Demora media": "demora_media_dias"})
    ancho = ancho[["anio", "hospital_id", "hospital", "pacientes", "demora_media_dias"]].sort_values(["anio", "hospital"])
    return ancho, [f"Formato ancho: una fila por hospital y año ({len(ancho)} filas, {ancho['hospital_id'].nunique()} hospitales, {ancho['anio'].min()}–{ancho['anio'].max()})."]


def main() -> None:
    DESTINO.mkdir(exist_ok=True)
    informe = [
        "# Informe de limpieza", "",
        f"Generado por `codigo/limpieza.py` el {date.today():%d/%m/%Y}. Los originales no se tocan.", "",
    ]
    for origen, destino in ARCHIVOS.items():
        df, rotos = leer(origen)
        filas = len(df)
        df, cambios = ordenar(df)
        if "lista_espera" in destino:
            df, mas = lista_espera(df)
            cambios += mas
        df.to_csv(DESTINO / destino, index=False)
        informe += [f"## {origen} → `datos_limpios/{destino}`", "",
                    f"- {filas} filas leídas; {rotos} caracteres rotos reparados (tildes y eñes).",
                    *[f"- {c}" for c in cambios], ""]
        print(f"OK  {destino:32} {len(df):5} filas · {rotos} caracteres reparados")

    hosp = pd.DataFrame(HOSPITALES, columns=["hospital_id", "hospital", "municipio", "lat", "lon", "solo_ninos"])
    hosp.to_csv(DESTINO / "hospitales.csv", index=False)
    informe += ["## Catálogo de hospitales → `datos_limpios/hospitales.csv`", "",
                f"- {len(hosp)} hospitales públicos con lista de espera.",
                "- Coordenadas **aproximadas** (±1 km) añadidas a mano: los datos originales no traen ubicación. Verificar antes de usarlas para algo más que una demo.", ""]
    print(f"OK  {'hospitales.csv':32} {len(hosp):5} filas")
    (DESTINO / "informe_limpieza.md").write_text("\n".join(informe), encoding="utf-8")
    print("Informe: datos_limpios/informe_limpieza.md")


if __name__ == "__main__":
    main()
