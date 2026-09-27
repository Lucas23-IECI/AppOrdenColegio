# AppOrdenColegio

Aplicación móvil web para recibir y devolver los espacios del Liceo San Juan Bautista de Hualqui y el gimnasio del evento.

## Funciones

- Espacios editables, tipos de recinto, sectores y encargados; creación inicial opcional de 18 salas.
- Inventario con cantidades separadas de recepción y devolución.
- Revisión de estado, observaciones, confirmación y correcciones con historial.
- Fotos y videos capturados o seleccionados desde el teléfono, con reproducción dentro de la aplicación.
- Miniaturas ligeras y originales conservados.
- IndexedDB para el trabajo sin conexión; service worker para volver a abrir la aplicación.
- Respaldo compartido D1 + R2, subida de videos en partes de 8 MB y reanudación.
- Detección de conflictos entre dispositivos mediante revisiones y operaciones idempotentes.
- PDF con fotografías e índice de videos, texto y ZIP con originales.
- Temas azul, naranjo y noche, seleccionables en Ajustes.

## Probar desde el celular

La primera publicación utiliza acceso privado de Sites. Abrir la dirección publicada con la misma cuenta propietaria. Para probar entre dos celulares puede usarse esa cuenta en ambos. No se han habilitado otras cuentas ni acceso público.

En iPhone usar Safari → Compartir → Añadir a pantalla de inicio. En Android usar Chrome → Instalar aplicación / Añadir a pantalla de inicio.

Antes de salir sin señal, abrir **Respaldo → Preparar uso sin señal**. Las capturas propias se conservan en el teléfono; las fotos de recepción de otros dispositivos deben descargarse antes. Revisar siempre los pendientes de cada encargado.

## Desarrollo

Requisitos: Node.js 22.13 o posterior.

```sh
npm ci
npm run dev
```

Abrir la dirección local impresa. En el entorno portátil, la ruta `/signin-with-chatgpt?return_to=/` habilita la identidad de prueba local; esta simulación no se incorpora a producción.

```sh
npm run typecheck
npm run db:generate
npm run build
```

Después de generar una migración nueva, aplicar una sola vez a la base local:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flawless_blade.sql
```

Para probar el Worker compilado:

```sh
npm start
```

La publicación se realiza mediante Sites y el manifiesto `.openai/hosting.json`. Los recursos DB/BUCKET son lógicos; la plataforma administra los recursos remotos. Las credenciales de publicación no se guardan en este repositorio.

## Estructura

- `app/colegio-app.tsx`: experiencia móvil, inventario, galería y flujos.
- `app/api/[...path]/route.ts`: API autenticada, revisiones y archivos.
- `lib/local-store.ts`: persistencia local de datos y archivos.
- `lib/sync.ts`: cola de respaldo y reanudación de videos.
- `lib/reports.ts`: PDF, texto y paquete de evidencias.
- `db/schema.ts` y `drizzle/`: esquema y migraciones.
- `public/sw.js`: caché de la aplicación sin conexión.

## Datos y acceso

Los registros del colegio y los archivos no se incluyen en Git. `.wrangler`, `work`, `.env*`, dependencias y archivos de prueba están ignorados. El almacenamiento remoto es privado; todas las rutas de datos requieren identidad y pertenencia al equipo.

El primer propietario autenticado inicializa el equipo. La primera publicación está restringida al propietario desde la plataforma. Agregar otra cuenta requiere habilitarla tanto en el acceso del sitio como en el equipo de la aplicación; no alcanza con conocer la URL.

Las eliminaciones de espacios son archivos recuperables. Las revisiones previas quedan en el servidor. Los informes exportados son borradores hasta que las personas responsables los revisen y firmen.

Consultar [pruebas realizadas y límites](docs/PRUEBAS.md).
