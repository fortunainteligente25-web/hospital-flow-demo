# Seguridad · Hospital Flow (demo)

Revisión hecha el 20/11/2026 por Flavio Durán (con ayuda de Claude).

## Qué protege la demo

| Riesgo | Medida |
|---|---|
| Filtración de claves de API | No hay claves en el repositorio. Escaneo de patrones (claves de Anthropic, AWS, GitHub, Google, claves privadas) sin coincidencias. `.gitignore` excluye `.env`, `*.key` y `*.pem`. |
| Datos de salud enviados a terceros | No hay backend ni llamadas de red. No hay cookies, analítica ni scripts de terceros. |
| Datos de salud almacenados | El texto que escribe el usuario no se guarda. Lo único en `localStorage` son contactos de confianza (nombre y teléfono), y se pueden borrar con un botón. |
| XSS (inyección de scripts) | Todo el texto se escribe con `textContent`; no hay `innerHTML` con datos del usuario. La CSP no permite scripts en línea ni `eval`. |
| Recursos externos | La fuente (Plus Jakarta Sans, licencia OFL) está en `demo/fonts/`. No se carga nada de otros dominios. |
| Clickjacking | `frame-ancestors 'none'` y `X-Frame-Options: DENY` en `demo/_headers` (Netlify y Cloudflare Pages). En GitHub Pages no se pueden poner cabeceras; ahí solo se aplica la meta CSP. |
| Fuga de dirección por cabecera Referer | `Referrer-Policy: no-referrer` (meta y cabecera). |
| Ubicación | Solo se pide si el usuario pulsa «Usar mi ubicación». No se envía a ningún sitio; si el usuario comparte un aviso, la ubicación va dentro de ese mensaje. |
| Enlaces externos | `rel="noopener noreferrer"` en todos los enlaces que abren otra pestaña. |
| Mensajes con datos de salud | Los avisos a contactos solo dicen el hospital y la ubicación, nunca los síntomas. |
| Emergencias | El triaje por reglas va antes que cualquier ranking. Con señales de gravedad se muestra el 112 al instante. |

## Cabeceras de la API (proyecto principal)

`api.py` añade a todas las respuestas: `Content-Security-Policy` (sin scripts en línea ni de terceros), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (sin cámara ni micrófono; geolocalización solo del propio sitio) y `Cross-Origin-Opener-Policy: same-origin`. La documentación Swagger queda **desactivada** salvo con `HF_DOCS=1` en el `.env` de desarrollo.

## Limitaciones honestas

- **Las reglas de triaje son una demo.** Pueden fallar con frases que no contengan las palabras previstas. Ante la duda, 112.
- **Urgencias y ocupación son simuladas.** No existen datos reales en los archivos.
- **Los teléfonos de taxi no están verificados.** Antes de usarlos, confírmalos en el listado oficial.
- **Las coordenadas son aproximadas.** Sirven para estimar distancias, no para navegar sin comprobar.
- **GitHub Pages no admite cabeceras propias.** Para la máxima protección, usar Netlify o Cloudflare Pages, que leen `demo/_headers`.

## Si se añade una API de IA o datos personales reales

1. La clave va solo en una variable de entorno del servidor (`ANTHROPIC_API_KEY`), nunca en el frontend ni en el repositorio.
2. Si una clave se ha pegado en un chat, en un archivo subido o en un commit, **revócala y crea otra**.
3. Limitar la longitud de los textos (ya hay 1000 caracteres en `api.py`) y aplicar límite de peticiones por IP.
4. No guardar el texto de los pacientes en logs.
5. Los datos de salud son categoría especial del RGPD (art. 9). Antes de usarlos con personas reales hace falta base legal, evaluación de impacto y revisión por la organización responsable.
