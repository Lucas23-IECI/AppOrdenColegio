# Verificación de Vercel + Supabase

Pruebas del 27 de septiembre de 2026 en Windows, Node 24 y Edge/Chromium. Fixtures y credenciales temporales excluidos de Git.

## Automatizadas

Actualización de inventario, evidencias y auditoría:

- Inventario: agregar, renombrar conservando cantidades, copiar elementos y nombres de otro espacio sin copiar cantidades, quitar y volver a confirmar las revisiones afectadas.
- Estado plegado por defecto; tocar de nuevo Bien, Observación o No aplica elimina esa selección sin borrar las observaciones.
- Brave con perfil aislado y Supabase real: foto subida, nombre y nota editados, giro y recorte cuadrados, copia JPEG y original descargado idéntico byte a byte al archivo de entrada.
- Papelera y restauración desde la interfaz; se reabre la recepción confirmada. Un reintento de miniatura no deshace la eliminación ni la nota.
- Cambio de nombre sin conexión y posterior sincronización; la fusión conserva metadatos locales pendientes.
- Auditoría con datos reales, búsqueda, vista de diferencias, contexto de espacio/etapa y CSV. Las celdas exportadas neutralizan fórmulas de hojas de cálculo.
- Acceso a auditoría limitado a coordinación/administración; lectura anónima e inserción directa de usuarios rechazadas. Los cambios hechos por coordinación se atribuyen a quien los hizo, no al propietario del archivo.
- Prueba de carrera: si llega una edición mientras se lee el inventario local, se descarta la lectura anterior antes de actualizar la pantalla.
- Navegación y menú de seis pestañas comprobados a 320, 390, 768 y 1440 px sin desbordamiento horizontal. Se conserva la prueba de ocho temas y texto Muy grande.
- Se eliminan únicamente las cuentas, salas, informes y archivos temporales de las pruebas. Sus acciones quedan en auditoría; los datos reales del equipo no se modifican.

Actualización de lectura y navegación:

- Rutas de espacios, recepción/devolución, archivos, informes, respaldo y ajustes; enlaces desconocidos normalizados sin conservar parámetros de acceso.
- Atrás/Adelante del navegador y Atrás dentro de la app: visor de foto, editor, historial, cambio de fase e informe por espacio.
- Volver conserva las cantidades guardadas y los filtros del recorrido; recargar conserva la pantalla actual.
- Un enlace directo a un espacio crea una entrada del recorrido para poder volver dentro de la aplicación.
- Prueba de interfaz con datos simulados: ocho temas, persistencia de Muy grande/Contraste y ausencia de desbordamiento horizontal en páginas móviles a 320 px y en revisión/edición a 320, 360, 390, 768 y 1440 px.
- Controles principales de al menos 56 px y texto de al menos 18 px; botones de cámara apilados, filtros visibles y botón Atrás fijo al desplazarse por una pantalla interna.

Actualización de registro abierto y administración:

- Registro sin códigos, validación de datos, correo normalizado, duplicados e inicio de sesión posterior.
- Dos altas concurrentes respetan los roles existentes; el cuerpo de la petición no puede otorgar permisos.
- Administrador, coordinador y encargado: cambio de roles, bloqueo de autoascenso y comprobación de permisos con el token ya emitido.
- Listado administrativo incluye cuentas desactivadas. Desactivar y reactivar modifica el acceso real a API/Storage; no elimina los registros.
- La función SQL serializa altas y cambios de permisos con el mismo bloqueo; rechaza quitar al último administrador activo. Esta condición se revisó en el código, sin desactivar al administrador real para probarla.
- Brave con perfil aislado: registro desde el formulario, ingreso posterior, ojito, cambio de roles, desactivación/reactivación, cuatro temas y vistas de 390/1440 px, sin errores JavaScript ni desbordamiento horizontal.
- Las cuentas de estas pruebas se eliminan por sus identificadores exactos. Los espacios y archivos existentes no se modifican.

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

## Compatibilidad del ingreso con Brave

Se diagnosticaron dos cierres del proceso principal de Brave 1.96.59 al escribir el correo. Ambos registraron `autofill-suggestions-shown-on-typing: 1,10,46,63`. En Chromium 154, ese registro corresponde a una comprobación que rechaza mezclar sugerencias de direcciones normales con sugerencias al escribir. Referencia: [BrowserAutofillManager](https://chromium.googlesource.com/chromium/src/+/refs/tags/154.0.8037.58/components/autofill/core/browser/foundations/browser_autofill_manager.cc).

El formulario desactiva el autocompletado de nombre y correo para evitar la ruta de sugerencias al escribir, que está condicionada a `should_autocomplete()`. La contraseña mantiene su semántica de contraseña. El formulario actual ya no solicita códigos de instalación ni invitación. No se cambian las preferencias ni los datos del navegador del usuario.

En la versión anterior, el enlace de instalación/invitación se conservaba en sessionStorage hasta ingresar. La utilidad y su prueba se conservan por compatibilidad; el formulario actual elimina cualquier enlace antiguo almacenado y permite crear cuenta directamente.

La corrección publicada se comprobó en Brave 1.96.59 con un perfil aislado y una dirección ficticia guardada: 12 correos escritos tecla por tecla, recarga con conservación del enlace, envío interceptado sin crear usuarios y manejo de un enlace de instalación antiguo. No hubo cierres, errores JavaScript ni desbordamiento a 390 px. Esta prueba no reproduce las extensiones ni la configuración completa del perfil personal del usuario; queda pendiente su confirmación allí.
