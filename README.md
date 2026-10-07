# Orden Colegio

Aplicación para recibir y devolver salas y otros espacios del evento en Hualqui. Inventario, estado, fotos y videos organizados por espacio y por recepción/devolución.

**Aplicación en [app-orden-colegio.vercel.app](https://app-orden-colegio.vercel.app).** Vercel sirve la aplicación y su API; Neon Free guarda usuarios, registros y archivos privados. La migración se publicó y verificó el 7 de octubre de 2026. El acceso funciona con el correo y contraseña del evento, independientemente de la cuenta usada para programar.

## Uso

Cada encargado puede abrir la aplicación y pulsar **Crear cuenta** con nombre, correo y contraseña. No necesita clave de instalación ni invitación. Las cuentas nuevas comparten el evento y entran con Solo lectura; un administrador les da permiso para editar. La primera cuenta de una instalación vacía es administradora principal. Las cuentas existentes conservan su acceso.

1. Crear 18 salas con un botón, o añadir espacios individualmente. Editar nombre, tipo, recinto, sector y encargado; archivar y restaurar sin borrar registros.
2. Abrir un espacio y registrar **Recepción**: cantidades, revisión del estado, fotos, videos y observaciones. Confirmar cuando esté completo.
3. Revisar **Respaldo** hasta que indique que no hay pendientes en ese teléfono.
4. Antes del recorrido, pulsar **Preparar uso sin señal**. Esto guarda la aplicación y las fotografías de recepción en el dispositivo.
5. Al devolver, completar **Devolución**, comparar con la recepción y revisar las diferencias de inventario.
6. Desde **Informes**, elegir si el PDF lleva fotos individuales, comparación visual o ninguna imagen. Seleccionar las fotos y parejas de esta descarga. También se puede descargar texto o ZIP con originales; las versiones archivadas del texto quedan disponibles para el equipo.

En **Ajustes → Administración del equipo**, un administrador puede buscar cuentas, elegir Administrador o Solo lectura (también Coordinador y Encargado) y pulsar **Guardar permiso**. Puede desactivar o reactivar accesos. La cuenta que antes era coordinadora se conserva como administradora. La cuenta marcada como administradora principal no se puede desactivar ni cambiar de rol, incluso si hay otros administradores. Tampoco se puede quitar al último administrador activo. La desactivación bloquea el servidor y conserva los registros; no borra las copias que ya estaban guardadas en un teléfono.

| Rol | Permisos |
| --- | --- |
| Administrador | Gestionar equipo y permisos, datos del evento, espacios y evidencias. |
| Coordinador | Gestionar datos del evento, archivar/restaurar espacios y editar notas de evidencias del equipo. |
| Encargado | Crear y registrar espacios, subir fotos/videos, editar notas propias y generar informes. |
| Solo lectura | Consultar espacios, originales, historial e informes; descargar sin modificar registros. |

En **Ajustes → Equipo** está el enlace para compartir el registro. La aplicación no envía invitaciones ni correos de confirmación. El correo sirve para iniciar sesión; no se verifica su propiedad durante el registro.

En celular, el menú inferior tiene **Espacios, Archivos y Más**. En **Más** están Informes, Respaldo, Ajustes y, para coordinación/administración, Auditoría. El inicio muestra la lista de espacios, búsqueda y un resumen desplegable del avance; los filtros se abren cuando se necesitan.

Dentro de cada espacio, primero se elige **Recepción o Devolución** y luego **Fotos, Inventario o Revisión**. En computador se mantienen los paneles juntos. **Opciones** permite editar el espacio o abrir su historial. Editar y Quitar siguen visibles bajo cada evidencia.

En **Revisión → Para terminar**, **Ver qué falta** lleva a las cantidades, estados, observaciones o evidencias pendientes. La confirmación se habilita cuando está completo, también sin señal; el respaldo pendiente se indica por separado. Las revisiones confirmadas muestran **Editar esta recepción** o **Editar esta devolución** junto a las etapas. La corrección conserva cantidades, notas, evidencias e historial y exige confirmar de nuevo. Añadir evidencias y corregir el inventario también reabre la revisión afectada.

En **Ajustes → Cómo quieres ver la app** hay ocho temas planos: Bosque, Azul, Naranjo, Ciruela, Océano, Arena, Noche y Contraste. Texto Grande por defecto o Muy grande; ambas preferencias se conservan por dispositivo. Los botones principales miden al menos 56 px de alto y los controles de cámara están separados en celular.

El botón **Atrás** de la aplicación y el del navegador recorren las pantallas visitadas. Desde una foto, video, edición o historial, vuelven a la pantalla que lo abrió. También funcionan Adelante y recargar un espacio. Al agotar el historial interno, el navegador conserva su funcionamiento normal para salir del sitio.

En cada espacio, **Editar inventario** permite agregar, renombrar, copiar y quitar elementos. **Copiar de otro espacio** trae los nombres que faltan; deja las cantidades vacías para contarlas de nuevo. Estas herramientas permanecen cerradas mientras se hace el conteo. **Estado del espacio** también comienza plegado y muestra el avance; tocar una opción seleccionada vuelve a dejarla pendiente.

Debajo de cada foto o video aparecen **Editar** y **Quitar**, tanto dentro del espacio como en **Archivos**. Editar una foto abre directamente el giro y recorte; se guarda una copia JPEG de hasta 2048 px conservando el original intacto. En videos abre la edición de nombre, nota y categoría. El visor también permite copiar archivos y muestra las acciones principales arriba de la imagen. El autor, coordinadores y administradores pueden editar; los demás ven una explicación del permiso. **Quitar** envía a **Papelera**, accesible desde Archivos: permite restaurar y excluye los archivos quitados de los informes. No elimina físicamente los originales ni libera espacio en Storage.

**Archivos** muestra álbumes por espacio, con recepción y devolución separadas. Las fotos se muestran grandes por defecto; se puede pasar a una cuadrícula compacta, buscar por nombre, nota o persona y filtrar por tipo/categoría. Se cargan doce archivos cada vez. Las vistas previas se recuperan desde el original cuando es posible y tienen un botón Reintentar si falla la carga.

El visor permite Anterior/Siguiente, deslizar al 100%, ampliar con dos dedos o botones, arrastrar la foto ampliada y abrir pantalla completa. En **Comparar**, se elige una foto de recepción y otra de devolución del mismo espacio y se guarda la pareja. Se ven juntas en computador; en celular se alterna entre ambas. La pareja se comparte con el equipo al sincronizarse y su cambio aparece en auditoría. Vincular fotos no confirma la revisión del espacio.

La comparación visual del PDF comienza desactivada. En **Informes → Imágenes del PDF** se eligen las fotos y parejas; «Ninguna» no incluye imágenes de ese tipo. El índice escrito conserva todas las evidencias del alcance elegido y el ZIP conserva los originales. Las imágenes del PDF se ajustan sin recortarlas; si falta un original o no puede mostrarse, queda indicado. Los videos figuran en el índice y se entregan como archivos.

**Auditoría**, junto a Ajustes, está disponible para administración y coordinación. Incluye espacios, inventario, revisión, archivos, cuentas y permisos, datos del evento e informes archivados. Muestra persona, fecha y valores anteriores y posteriores, con filtros por categoría, nombre/persona y fechas, paginación y descarga CSV. Los cambios sin señal aparecen al respaldarse. Se recuperó el historial anterior disponible de espacios; los demás tipos de cambios se registran desde esta actualización. Los registros se generan en la base de datos y no se pueden editar o borrar desde la app.

## Archivos y trabajo sin señal

- Cada foto o video se guarda primero en IndexedDB en el teléfono. Se distingue **En este teléfono**, progreso de carga y **Respaldado**.
- Los originales se suben directamente al almacenamiento privado de Neon mediante cargas multipartes, en bloques de 6 MB; no atraviesan el límite de cuerpo de las funciones de Vercel.
- **Máximo actual: 50 MB por archivo.** Grabar clips cortos. ZIP de hasta 300 MB por exportación; para un registro mayor, exportar por espacio.
- El navegador debe permanecer abierto para subir. Una interrupción conserva el original local y la carga se retoma al volver a abrir y conectar.
- Las cantidades, observaciones y nuevas capturas funcionan sin señal después del primer ingreso y la preparación. Los videos grabados en ese dispositivo permanecen locales. Para fotos o videos de otro dispositivo, abrir el visor y pulsar **Guardar para usar sin señal** mientras hay conexión; esperar **Disponible sin señal en este equipo**. Se descarga el original completo y se comprueba su tamaño antes de guardarlo. Sin esa descarga previa, el original remoto requiere conexión.
- No borrar los datos del navegador mientras haya pendientes. La cuota local depende del teléfono; la app solicita almacenamiento persistente, pero el navegador puede rechazarlo.
- HEIC/HEVC depende del navegador. Se conserva el original aunque el dispositivo no permita previsualizarlo.
- Si dos encargados modifican el mismo espacio, se conservan ambas versiones y se solicita compararlas antes de resolver el conflicto.
- Cambiar la estructura del inventario o corregir la recepción exige volver a confirmar las revisiones afectadas; conserva las cantidades y observaciones existentes. Quitar o restaurar una evidencia también reabre la revisión correspondiente.

Los informes son borradores para revisar y firmar; la confirmación del encargado no representa aceptación del colegio.

## Desarrollo

Node.js 24. Copiar `.env.example` como `.env.local` y completar las variables de Neon PostgreSQL y su almacenamiento privado. Nunca guardar claves privadas en Git.

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

`test:integration` conserva las pruebas del backend Supabase anterior y requiere su configuración. Las pruebas de Neon se ejecutan por separado contra una base local desechable, como se indica más abajo.

## Infraestructura

La app usa Vercel `app-orden-colegio` y Neon Free `calm-brook-14164647`, región Ohio, PostgreSQL 18 y el bucket privado `evidence`. Las variables de producción están configuradas en Vercel: claves privadas como Secret y `VITE_BACKEND_PROVIDER=neon` como Config. No se contrató un plan de pago. El backend Supabase anterior se conserva para una reversión explícita mediante las dos variables de proveedor; esa reversión necesita revisar los cambios posteriores a la migración y que Supabase esté disponible.

1. Completar las variables de `.env.example`. `DATABASE_URL`, `BETTER_AUTH_SECRET` y las claves S3 son exclusivamente del servidor. En producción usar `APP_ORIGIN=https://app-orden-colegio.vercel.app`.
2. Aplicar el esquema con `node --env-file=.env.local --import=tsx scripts/neon-schema.ts`. Las migraciones conservan los procedimientos de inventario, auditoría, permisos y conflictos; no exponen una API de base de datos al navegador.
3. Configurar CORS del bucket privado para el origen de la app, GET/HEAD/PUT y cabeceras necesarias. Las claves S3 nunca se entregan al navegador. Las URL de archivos y de partes de carga duran 15 minutos.
4. Registrar la primera cuenta solo en instalaciones vacías: recibe administración de forma atómica. Las siguientes reciben el rol Encargado. En una migración se importan los administradores antes de abrir el registro público.

Better Auth funciona dentro de la API existente de Vercel, con sesiones en cookies HttpOnly y límites de intentos almacenados en PostgreSQL. Cada petición consulta nuevamente el rol y estado del miembro. Las cuentas anteriores conservan UUID, correo y hash bcrypt; las cuentas nuevas usan el hash de Better Auth. Esto mantiene los vínculos con las bases locales de los teléfonos. Tras el cambio de proveedor puede ser necesario ingresar una vez con el mismo correo y contraseña.

Neon Free incluye cuotas: no es almacenamiento ilimitado. Esta instalación reserva un máximo de 4,8 GB para originales y miniaturas para dejar margen dentro de los 5 GB gratuitos de objetos. La transferencia, la base y el cómputo también tienen límites del proveedor. Si una cuota impide respaldar, la app muestra el error y conserva el original local; no cambia automáticamente a un plan de pago. Al quedar inactiva, la base puede suspender el cómputo y despertar con la siguiente conexión. Esto es distinto de la pausa administrativa de Supabase.

La copia de Supabase se descargó antes de migrar. `scripts/backup-data.ts` interpreta únicamente bloques COPY de tablas permitidas: nunca ejecuta el SQL completo del respaldo. `scripts/migrate-neon.ts` exige un destino vacío, importa en una transacción, conserva el historial y verifica SHA-256 de cada original y miniatura. `scripts/verify-neon.ts` compara el contenido completo de las ocho tablas y los identificadores/hashes de cuentas. Respaldos, manifestaciones y credenciales permanecen en `work/migration` y archivos `.env.*.local` ignorados por Git.

## Verificación de Neon

La comprobación pública del 7 de octubre verificó registro, ingreso, cierre de sesión, rechazo de acceso anónimo, 19 espacios y los cinco originales migrados (tres fotos y dos videos). Cada original coincidió en tamaño y SHA-256 con el respaldo. Los cinco objetos rechazaron descarga sin firma; los dos videos respondieron a rangos HTTP. En Brave se abrió un video de 1080 × 1920 con duración de 5,23 segundos y sin error. Esto no sustituye una prueba en Android o iPhone reales.

La prueba `tests/integration/neon.test.ts` exige una base local vacía llamada `orden_neon_tests`. Comprueba registro concurrente, contraseñas bcrypt heredadas, sesión, cierre de sesión, administrador único, permisos, revocación inmediata, idempotencia y conflictos. No ejecutarla en producción.

La prueba de almacenamiento `tests/integration/neon-storage.test.ts` requiere además `RUN_NEON_STORAGE_QA=1` y las credenciales S3. Usa un archivo temporal con un UUID nuevo y una base local; verifica carga mayor a 6 MB, CORS, reanudación, tamaño, hash, descarga privada y rangos para adelantar videos. Elimina únicamente ese objeto temporal al terminar. Las pruebas Supabase se conservan para el backend anterior y requieren su configuración específica.

## Código

- `app/colegio-app.tsx`, `app/globals.css` y `app/mobile-layout.css`: interfaz, temas y distribución móvil.
- `app/app-navigation.tsx`: navegación móvil y pantalla Más.
- `app/review-completion.tsx`, `lib/review-readiness.ts`: requisitos pendientes de cada revisión y accesos para completarlos.
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
