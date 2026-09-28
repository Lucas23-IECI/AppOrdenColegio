# Orden Colegio

Aplicación para recibir y devolver salas y otros espacios del evento en Hualqui. Inventario, estado, fotos y videos organizados por espacio y por recepción/devolución.

**Publicada en [app-orden-colegio.vercel.app](https://app-orden-colegio.vercel.app).** Vercel sirve la aplicación y su API; Supabase guarda usuarios, registros y archivos privados. El acceso funciona con el correo y contraseña del evento, independientemente de la cuenta usada para programar.

## Uso

Cada encargado puede abrir la aplicación y pulsar **Crear cuenta** con nombre, correo y contraseña. No necesita clave de instalación ni invitación. Las cuentas nuevas comparten el evento y entran como encargados; la primera cuenta de una instalación vacía es administradora. Las cuentas existentes conservan su acceso.

1. Crear 18 salas con un botón, o añadir espacios individualmente. Editar nombre, tipo, recinto, sector y encargado; archivar y restaurar sin borrar registros.
2. Abrir un espacio y registrar **Recepción**: cantidades, revisión del estado, fotos, videos y observaciones. Confirmar cuando esté completo.
3. Revisar **Respaldo** hasta que indique que no hay pendientes en ese teléfono.
4. Antes del recorrido, pulsar **Preparar uso sin señal**. Esto guarda la aplicación y las fotografías de recepción en el dispositivo.
5. Al devolver, completar **Devolución**, comparar con la recepción y revisar las diferencias de inventario.
6. Desde **Informes**, elegir si el PDF lleva fotos individuales, comparación visual o ninguna imagen. Seleccionar las fotos y parejas de esta descarga. También se puede descargar texto o ZIP con originales; las versiones archivadas del texto quedan disponibles para el equipo.

En **Ajustes → Administración del equipo**, un administrador puede buscar cuentas, cambiar su rol y desactivar o reactivar accesos. La cuenta que antes era coordinadora se conserva como administradora. No se puede quitar ni desactivar al último administrador activo. La desactivación bloquea el servidor y conserva los registros; no borra las copias que ya estaban guardadas en un teléfono.

| Rol | Permisos |
| --- | --- |
| Administrador | Gestionar equipo y permisos, datos del evento, espacios y evidencias. |
| Coordinador | Gestionar datos del evento, archivar/restaurar espacios y editar notas de evidencias del equipo. |
| Encargado | Crear y registrar espacios, subir fotos/videos, editar notas propias y generar informes. |

En **Ajustes → Equipo** está el enlace para compartir el registro. La aplicación no envía invitaciones ni correos de confirmación. El correo sirve para iniciar sesión; no se verifica su propiedad durante el registro.

En **Ajustes → Cómo quieres ver la app** hay ocho temas planos: Bosque, Azul, Naranjo, Ciruela, Océano, Arena, Noche y Contraste. Texto Grande por defecto o Muy grande; ambas preferencias se conservan por dispositivo. Los botones principales miden al menos 56 px de alto, los controles de cámara están separados en celular y los filtros se muestran completos.

El botón **Atrás** de la aplicación y el del navegador recorren las pantallas visitadas. Desde una foto, video, edición o historial, vuelven a la pantalla que lo abrió. También funcionan Adelante y recargar un espacio. Al agotar el historial interno, el navegador conserva su funcionamiento normal para salir del sitio.

En cada espacio, **Editar inventario** permite agregar, renombrar, copiar y quitar elementos. **Copiar de otro espacio** trae los nombres que faltan; deja las cantidades vacías para contarlas de nuevo. Estas herramientas permanecen cerradas mientras se hace el conteo. **Estado del espacio** también comienza plegado y muestra el avance; tocar una opción seleccionada vuelve a dejarla pendiente.

Debajo de cada foto o video aparecen **Editar** y **Quitar**, tanto dentro del espacio como en **Archivos**. Editar una foto abre directamente el giro y recorte; se guarda una copia JPEG de hasta 2048 px conservando el original intacto. En videos abre la edición de nombre, nota y categoría. El visor también permite copiar archivos y muestra las acciones principales arriba de la imagen. El autor, coordinadores y administradores pueden editar; los demás ven una explicación del permiso. **Quitar** envía a **Papelera**, accesible desde Archivos: permite restaurar y excluye los archivos quitados de los informes. No elimina físicamente los originales ni libera espacio en Storage.

**Archivos** muestra álbumes por espacio, con recepción y devolución separadas. Las fotos se muestran grandes por defecto; se puede pasar a una cuadrícula compacta, buscar por nombre, nota o persona y filtrar por tipo/categoría. Se cargan doce archivos cada vez. Las vistas previas se recuperan desde el original cuando es posible y tienen un botón Reintentar si falla la carga.

El visor permite Anterior/Siguiente, deslizar al 100%, ampliar con dos dedos o botones, arrastrar la foto ampliada y abrir pantalla completa. En **Comparar**, se elige una foto de recepción y otra de devolución del mismo espacio y se guarda la pareja. Se ven juntas en computador; en celular se alterna entre ambas. La pareja se comparte con el equipo al sincronizarse y su cambio aparece en auditoría. Vincular fotos no confirma la revisión del espacio.

La comparación visual del PDF comienza desactivada. En **Informes → Imágenes del PDF** se eligen las fotos y parejas; «Ninguna» no incluye imágenes de ese tipo. El índice escrito conserva todas las evidencias del alcance elegido y el ZIP conserva los originales. Las imágenes del PDF se ajustan sin recortarlas; si falta un original o no puede mostrarse, queda indicado. Los videos figuran en el índice y se entregan como archivos.

**Auditoría**, junto a Ajustes, está disponible para administración y coordinación. Incluye espacios, inventario, revisión, archivos, cuentas y permisos, datos del evento e informes archivados. Muestra persona, fecha y valores anteriores y posteriores, con filtros por categoría, nombre/persona y fechas, paginación y descarga CSV. Los cambios sin señal aparecen al respaldarse. Se recuperó el historial anterior disponible de espacios; los demás tipos de cambios se registran desde esta actualización. Los registros se generan en la base de datos y no se pueden editar o borrar desde la app.

## Archivos y trabajo sin señal

- Cada foto o video se guarda primero en IndexedDB en el teléfono. Se distingue **En este teléfono**, progreso de carga y **Respaldado**.
- Los originales se suben directamente a Supabase Storage mediante TUS, en bloques de 6 MB; no atraviesan el límite de cuerpo de las funciones de Vercel.
- **Máximo actual: 50 MB por archivo.** Grabar clips cortos. ZIP de hasta 300 MB por exportación; para un registro mayor, exportar por espacio.
- El navegador debe permanecer abierto para subir. Una interrupción conserva el original local y la carga se retoma al volver a abrir y conectar.
- Las cantidades, observaciones y nuevas capturas funcionan sin señal después del primer ingreso y la preparación. Los videos grabados en ese dispositivo permanecen locales. Para fotos o videos de otro dispositivo, abrir el visor y pulsar **Guardar para usar sin señal** mientras hay conexión; esperar **Disponible sin señal en este equipo**. Se descarga el original completo y se comprueba su tamaño antes de guardarlo. Sin esa descarga previa, el original remoto requiere conexión.
- No borrar los datos del navegador mientras haya pendientes. La cuota local depende del teléfono; la app solicita almacenamiento persistente, pero el navegador puede rechazarlo.
- HEIC/HEVC depende del navegador. Se conserva el original aunque el dispositivo no permita previsualizarlo.
- Si dos encargados modifican el mismo espacio, se conservan ambas versiones y se solicita compararlas antes de resolver el conflicto.
- Cambiar la estructura del inventario o corregir la recepción exige volver a confirmar las revisiones afectadas; conserva las cantidades y observaciones existentes. Quitar o restaurar una evidencia también reabre la revisión correspondiente.

Los informes son borradores para revisar y firmar; la confirmación del encargado no representa aceptación del colegio.

## Desarrollo

Node.js 24. Copiar `.env.example` como `.env.local` y completar las variables de un proyecto Supabase. Nunca guardar claves privadas en Git.

```sh
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173`. El servidor de desarrollo atiende Vite y la misma API que se despliega en Vercel.

```sh
npm run typecheck
npm test
npm run test:integration
npm run build
```

La prueba de integración requiere las variables de `.env.local`. Crea usuarios, un espacio y un archivo temporales en Supabase, comprueba sus permisos y los elimina en su bloque de limpieza. Sus acciones quedan en auditoría. Usar preferentemente un proyecto de pruebas.

## Infraestructura

La instalación de este repositorio usa el proyecto Vercel `app-orden-colegio` y Supabase `wxulrvbhyjtfyqkqsehc`, región São Paulo. Las claves están en las variables de entorno de Vercel y archivos locales ignorados por Git.

Para reproducir el despliegue en otra instalación:

1. Crear el proyecto Supabase y aplicar las migraciones de `supabase/migrations` mediante `supabase link --project-ref REF` y `supabase db push`.
2. Configurar en Vercel las variables de `.env.example`. `SUPABASE_SECRET_KEY` solo se usa en el servidor. Las dos variables `VITE_` y la clave publicable son configuración pública, protegida por las reglas de acceso. `INITIAL_SETUP_KEY` es opcional y solo conserva compatibilidad con el antiguo endpoint de instalación.
3. Desplegar con `vercel --prod`. `vercel.json` configura Vite, la API y el enrutamiento de la PWA. Puede vincularse el repositorio con Vercel para despliegues al publicar cambios.
4. Crear la primera cuenta desde el formulario público; recibirá el rol de administrador. Compartir el enlace normal de la aplicación con el equipo.

Auth verifica los tokens; la API comprueba que el miembro siga activo. Las tablas tienen RLS y solo son accesibles desde el servidor. Storage permite a cada miembro activo subir únicamente la ruta de un archivo previamente registrado a su nombre. El bucket `evidence` es privado; las descargas utilizan enlaces firmados de 15 minutos. Las revisiones se guardan mediante una transacción con control de versión e idempotencia.

Revisar consumo y cuotas en Supabase/Vercel según el volumen real. Respaldar la base y los objetos del bucket; la exportación ZIP permite conservar una copia de los originales junto al registro y al informe.

## Código

- `app/colegio-app.tsx` y `app/globals.css`: interfaz y temas.
- `app/auth-panel.tsx`, `app/admin-panel.tsx`: registro, ingreso y administración del equipo.
- `app/space-overview.tsx`: avance de recepción/devolución, filtros y evidencia por espacio.
- `app/appearance-panel.tsx`: colores y tamaño de lectura.
- `app/inventory-panel.tsx`, `app/condition-panel.tsx`: edición de inventario y revisión plegable.
- `app/media-viewer.tsx`, `app/photo-editor.tsx`: evidencias, copias, recorte, giro y papelera.
- `app/media-album.tsx`, `app/evidence-preview.tsx`, `app/zoom-image.tsx`, `app/evidence-comparison.tsx`: álbumes, recuperación de vistas previas, visor y parejas.
- `app/report-evidence-options.tsx`, `lib/report-options.ts`: selección opcional de fotos y comparaciones para cada PDF.
- `app/audit-panel.tsx`, `lib/audit.ts`: auditoría, filtros y CSV.
- `hooks/use-app-navigation.ts`, `lib/navigation.ts`: historial, enlaces a pantallas y regreso desde visores/formularios.
- `api/index.ts` y `server/cloud.ts`: API desplegada en Vercel.
- `supabase/migrations`: tablas, transacciones y permisos.
- `lib/local-store.ts`, `lib/sync.ts`: guardado local y sincronización.
- `lib/inspection.ts`: reglas para corregir revisiones e inventario.
- `lib/reports.ts`: PDF, texto y ZIP.
- `public/sw.js`, `lib/offline.ts`: apertura sin conexión.

[Pruebas y límites verificados](docs/PRUEBAS.md). La cámara y la instalación deben comprobarse también en Android/iPhone físicos.
