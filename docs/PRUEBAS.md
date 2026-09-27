# Verificación de Vercel + Supabase

Pruebas del 27 de septiembre de 2026 en Windows, Node 24 y Edge/Chromium. Fixtures y credenciales temporales excluidos de Git.

## Automatizadas

`npm run typecheck` y `npm test`:

- Corregir recepción invalida la confirmación posterior conservando notas y cantidades.
- Añadir inventario exige nueva confirmación y rechaza nombres duplicados.
- Vacío no equivale a cero; negativos y decimales rechazados.
- API privada sin sesión: 401. Escritura desde otro origen: 403.

`npm run test:integration`, contra Supabase real:

- Tablas y funciones privadas inaccesibles al usuario anónimo.
- Invitación de un uso, permisos de coordinador y encargado.
- Dos escrituras simultáneas: una aceptada, otra con conflicto 409.
- Reintento idempotente sin duplicar historial.
- Storage rechaza rutas no registradas y cargas a nombre de otro encargado.
- Original privado descargado mediante enlace firmado, idéntico byte a byte.
- Revocación rechaza API y acceso directo a Storage usando la sesión anterior.
- Limpieza de los usuarios, registros y archivos específicos de la prueba.

## Interfaz y servicios publicados

- Alta inicial y sesión real de Supabase; creación de 18 salas.
- Cantidades, revisión del estado y confirmación de recepción.
- Foto y video MP4 de 11,85 MB enviados desde la interfaz mediante carga reanudable a Storage.
- PDF y versión archivada del texto. PDF renderizado para revisar legibilidad y paginación.
- Sitio Vercel 200; estado de instalación 200; datos privados 401 sin sesión.
- Video reproducido y adelantado al segundo 5 desde un navegador sin copia local.
- Supabase respondió 206 a una petición parcial y entregó exactamente los bytes esperados del video.
- Preparación offline en el sitio publicado; edición de cantidades y notas, nueva fotografía, recarga sin señal y recuperación del contenido local.
- Reconexión con respaldo de los cambios y fotografía sin pendientes.
- PDF y ZIP descargados desde producción; reproducción remota y selector de temas comprobados.
- Pantalla de 390 px sin desbordamiento horizontal ni errores JavaScript durante el recorrido.

## Comprobación en teléfonos reales

Pendientes de realizar con el equipo: cámara Android/iPhone, formatos HEIC/HEVC, instalación en pantalla de inicio, comportamiento al bloquear el teléfono y cuota local. Una prueba automatizada con tamaño de pantalla móvil no sustituye estas comprobaciones.

Límite actual de Storage: 50 MB por archivo. Las subidas necesitan la aplicación abierta y conexión; las capturas locales se conservan ante una interrupción. Los videos de otros dispositivos requieren señal.
