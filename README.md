# Hospital Flow · demo con datos abiertos

## Portada

- **Equipo:** Black Bulls · DATAMAD 2026 (URJC, Campus de Vicálvaro)
- **Creador de esta parte:** Flavio Durán 
- **Día:** 20/11/2026
- **Problemas que hemos visto en los datos y en la demo:**
  1. Tildes y eñes rotas en los cinco archivos originales (carácter U+FFFD). No se pueden recuperar automáticamente: se reparan con un diccionario de palabras. Si queda alguna sin reparar, el script falla a propósito.
  2. Los archivos no tienen extensión, aunque son CSV separados por `;`.
  3. El valor «-» significa «sin dato»: se convierte en vacío, no se inventa.
  4. El hospital va dentro del texto de «Concepto»: se extrae a su propia columna.
  5. Los datos no traen la ubicación de los hospitales: las coordenadas son **aproximadas** (±1 km) y se añadieron a mano.
  6. No hay datos de esperas de urgencias, de ocupación ni por especialidad. La demo marca como **simulado** todo lo que no es real.
  7. No hay datos oficiales de taxis (la descarga estaba bloqueada). Los teléfonos de ejemplo están marcados como **sin verificar**.

## Estructura

| Carpeta | Contenido |
|---|---|
| `datos_originales/` | Los cinco archivos tal cual llegaron. No se modifican. |
| `datos_limpios/` | Resultado de `codigo/limpieza.py`, con `informe_limpieza.md`. |
| `codigo/` | `limpieza.py` (originales → limpios) y `generar_datos_demo.py` (limpios → `demo/data.js`). |
| `demo/` | La web: `index.html`, `styles.css`, `app.js`, `data.js`, `fonts/`, `_headers`. |
| `analisis/` | Notas de análisis (pendiente). |
| `resultados/` | Capturas y resultados (pendiente). |

## Cómo se ejecuta

```bash
pip install pandas
python3 codigo/limpieza.py             # genera datos_limpios/
python3 codigo/generar_datos_demo.py   # genera demo/data.js
```

Después, abre `demo/index.html` en el navegador: funciona sin servidor y sin conexión. Para usar la ubicación del móvil hace falta HTTPS (por ejemplo GitHub Pages) o `localhost`.

**Publicar en GitHub Pages:** Settings → Pages → *Deploy from a branch* → `main` / `(root)`. La demo queda en `https://<usuario>.github.io/<repositorio>/demo/`.

## Seguridad

Resumen; el detalle está en [SECURITY.md](SECURITY.md).

- Sin claves de API, tokens ni archivos `.env` en el repositorio. `.gitignore` los excluye por si aparecen.
- Sin backend y sin llamadas de red desde la página. Nada de lo que escribe el usuario sale del móvil.
- Solo se guardan contactos de confianza, en el propio navegador, y se pueden borrar.

> La demo es orientativa. No sustituye a un profesional sanitario. Ante la duda, **llama al 112**.
