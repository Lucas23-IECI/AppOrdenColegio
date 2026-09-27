# Orden Colegio

Aplicación para recibir y devolver salas y otros espacios, con inventario, fotos, videos y observaciones. Preparada para el Liceo San Juan Bautista de Hualqui y los recintos del evento.

**Funciona con su propio servidor y sus propios usuarios.** Cambiar la cuenta usada para programar no afecta el acceso de los encargados ni los archivos. GitHub contiene el código; los datos están en el servidor de la organización.

## Funciones

- Crear, renombrar, archivar y recuperar salas, baños, biblioteca, estacionamiento y otros espacios; creación opcional de 18 salas.
- Recepción y devolución separadas: cantidades, estado, observaciones, fotos y videos.
- Captura desde cámara o galería y reproducción dentro de la aplicación.
- Guardado primero en el teléfono y respaldo posterior; videos en bloques de 8 MB con reanudación.
- Detección de cambios simultáneos y conservación de ambas versiones.
- PDF con fotografías e índice de videos, texto y ZIP con originales.
- Temas azul, naranjo y noche, sin degradados.
- Usuarios personales, invitaciones de un uso y revocación de acceso.

## Probar desde el celular

En Windows ejecutar **INICIAR-PRUEBA.cmd**. Inicia el servidor y obtiene un enlace HTTPS temporal mediante Cloudflare Tunnel, sin crear ni conectar cuentas. El acceso y el QR se guardan en `data/primer-acceso.html`.

La primera persona autorizada usa la clave local de instalación para crear su usuario y contraseña. La clave está en `data/setup-key.txt` y se elimina al completar la instalación. El enlace personal del QR la incorpora automáticamente. Después se entra con usuario y contraseña.

En **Ajustes → Equipo**, el coordinador genera invitaciones de un solo uso, válidas durante 48 horas. La aplicación no envía mensajes por ti.

**El computador debe permanecer encendido y conectado durante esta prueba.** El enlace puede cambiar al reiniciar el túnel. Los archivos y la base permanecen en `data/`. Este enlace temporal no es el alojamiento definitivo para el evento.

1. Abrir en Safari (iPhone) o Chrome (Android).
2. Crear un espacio **Prueba**, registrar cantidades, una foto y un video corto.
3. Abrir los archivos y comprobar **Respaldo → Sin pendientes en este teléfono**.
4. Pulsar **Preparar uso sin señal** y añadir la app a la pantalla de inicio.
5. Activar modo avión, cambiar una cantidad y tomar otra foto. Cerrar y abrir para comprobar el guardado.
6. Reconectar, comprobar el respaldo y descargar un PDF en **Informes**.

## Desarrollo

Node.js 22.13 o posterior; probado con Node 24. No requiere base de datos externa.

```sh
npm ci
npm run dev
```

Abrir `http://127.0.0.1:3000`. Para compilar y ejecutar:

```sh
npm run typecheck
npm test
npm run build
npm start
```

Variables opcionales: `PORT` (3000), `HOST` (127.0.0.1), `DATA_DIR` (carpeta `data`). La base SQLite se inicializa automáticamente.

## Alojamiento permanente

Se incluyen `Dockerfile` y `compose.yaml` para un servidor propio o un proveedor elegido por la organización. No se crea ni contrata un alojamiento automáticamente.

```sh
docker compose up -d --build
```

El contenedor conserva datos en el volumen `colegio-data` y expone el puerto solo en localhost. Configurar un proxy HTTPS hacia el puerto 3000 que establezca `X-Forwarded-Proto: https`. La clave inicial está en `/app/data/setup-key.txt` dentro del contenedor. El acceso con Docker usa una base separada de la carpeta local, a menos que se migren los datos.

Mantener copias de **todo el directorio de datos**, incluida la base SQLite y los originales. Para una copia simple y consistente, detener el servidor durante la copia. No borrar el volumen al actualizar.

## Estructura

- `app/colegio-app.tsx`: inventario, galería, reportes y respaldo.
- `app/auth-panel.tsx`: ingreso e invitaciones.
- `app/api/[...path]/route.ts`: reglas de registros y archivos.
- `server/index.ts`: servidor HTTP y aplicación.
- `server/auth.ts`: contraseñas scrypt, sesiones e invitaciones.
- `server/storage.ts`: SQLite, archivos persistentes y streaming de videos.
- `lib/local-store.ts` y `lib/sync.ts`: guardado local y sincronización.
- `lib/reports.ts`: exportaciones.
- `public/sw.js`: apertura sin conexión.

## Límites actuales

- Comprobada en navegador automatizado. Falta verificar cámara y almacenamiento en Android/iPhone físicos.
- Subida en primer plano; puede pausarse al cerrar la app y reanudarse al abrirla.
- Hasta 2 GB por archivo, sujeto al espacio disponible. ZIP de hasta 300 MB por exportación.
- La preparación offline descarga fotos de recepción. Los videos de otros teléfonos necesitan señal; los grabados en el propio teléfono quedan locales.
- HEIC/HEVC depende del navegador; el original se conserva aunque no se pueda previsualizar.
- Los informes son borradores hasta su revisión y firma.
- No limpiar los datos del navegador mientras haya pendientes de respaldo.

[Pruebas realizadas](docs/PRUEBAS.md).
