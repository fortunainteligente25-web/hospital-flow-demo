# Informe de limpieza

Generado por `codigo/limpieza.py` el 20/11/2026. Los originales no se tocan.

## Lista de espera qirúrgica → `datos_limpios/lista_espera_quirurgica.csv`

- 638 filas leídas; 1652 caracteres rotos reparados (tildes y eñes).
- Columnas eliminadas por estar vacías o sin información: Tipo territorio, Código territorio, Territorio, Estado dato.
- Formato ancho: una fila por hospital y año (319 filas, 29 hospitales, 2015–2025).

## Lista de espera para pruebas → `datos_limpios/lista_espera_pruebas.csv`

- 464 filas leídas; 1202 caracteres rotos reparados (tildes y eñes).
- Columnas eliminadas por estar vacías o sin información: Tipo territorio, Código territorio, Territorio, Estado dato.
- 4 valores «-» (sin dato) convertidos a vacío.
- Formato ancho: una fila por hospital y año (230 filas, 29 hospitales, 2017–2024).

## Hospitales y Datos Asistencia → `datos_limpios/asistencia_madrid.csv`

- 243 filas leídas; 461 caracteres rotos reparados (tildes y eñes).
- Columnas eliminadas por estar vacías o sin información: Tipo territorio, Código territorio, Territorio, Estado dato.

## Indicadores Hospitalarios → `datos_limpios/indicadores_hospitalarios.csv`

- 528 filas leídas; 893 caracteres rotos reparados (tildes y eñes).
- Columnas eliminadas por estar vacías o sin información: Tipo territorio, Código territorio, Territorio, Estado dato.
- 80 valores «-» (sin dato) convertidos a vacío.

## Indicadores Hospitalarios Servicios Madrileños → `datos_limpios/indicadores_sermas.csv`

- 510 filas leídas; 1712 caracteres rotos reparados (tildes y eñes).
- Columnas eliminadas por estar vacías o sin información: Tipo territorio, Código territorio, Territorio, Estado dato.
- 57 valores «-» (sin dato) convertidos a vacío.

## Catálogo de hospitales → `datos_limpios/hospitales.csv`

- 29 hospitales públicos con lista de espera.
- Coordenadas **aproximadas** (±1 km) añadidas a mano: los datos originales no traen ubicación. Verificar antes de usarlas para algo más que una demo.
