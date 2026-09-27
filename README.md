# Orden Colegio

Aplicación para recibir y devolver salas y otros espacios del evento en Hualqui. Inventario, estado, fotos y videos organizados por espacio y por recepción/devolución.

**Publicada en [app-orden-colegio.vercel.app](https://app-orden-colegio.vercel.app).** Vercel sirve la aplicación y su API; Supabase guarda usuarios, registros y archivos privados. El acceso funciona con el correo y contraseña del evento, independientemente de la cuenta usada para programar.

## Uso

El primer coordinador recibe un enlace personal `/#setup=CLAVE` para crear su cuenta. Ese enlace solo permite la instalación mientras no exista coordinador. Después se ingresa con correo y contraseña.

1. Crear 18 salas con un botón, o añadir espacios individualmente. Editar nombre, tipo, recinto, sector y encargado; archivar y restaurar sin borrar registros.
2. Abrir un espacio y registrar **Recepción**: cantidades, revisión del estado, fotos, videos y observaciones. Confirmar cuando esté completo.
3. Revisar **Respaldo** hasta que indique que no hay pendientes en ese teléfono.
4. Antes del recorrido, pulsar **Preparar uso sin señal**. Esto guarda la aplicación y las fotografías de recepción en el dispositivo.
5. Al devolver, completar **Devolución**, comparar con la recepción y revisar las diferencias de inventario.
6. Generar PDF con fotografías, texto o ZIP con originales desde **Informes**. Las versiones archivadas del texto quedan disponibles para el equipo.

En **Ajustes → Equipo**, el coordinador genera invitaciones personales de un uso, válidas durante 48 horas. Los encargados pueden registrar espacios; solo el coordinador administra accesos, datos del evento y archivo/restauración de espacios. La aplicación no envía invitaciones automáticamente.

Temas Bosque, Azul, Naranjo y Noche, todos con colores planos. El tema se conserva por dispositivo.

## Archivos y trabajo sin señal

- Cada foto o video se guarda primero en IndexedDB en el teléfono. Se distingue **En este teléfono**, progreso de carga y **Respaldado**.
- Los originales se suben directamente a Supabase Storage mediante TUS, en bloques de 6 MB; no atraviesan el límite de cuerpo de las funciones de Vercel.
- **Máximo actual: 50 MB por archivo.** Grabar clips cortos. ZIP de hasta 300 MB por exportación; para un registro mayor, exportar por espacio.
- El navegador debe permanecer abierto para subir. Una interrupción conserva el original local y la carga se retoma al volver a abrir y conectar.
- Las cantidades, observaciones y nuevas capturas funcionan sin señal después del primer ingreso y la preparación. Los videos grabados en ese dispositivo permanecen locales; reproducir videos de otros encargados necesita conexión.
- No borrar los datos del navegador mientras haya pendientes. La cuota local depende del teléfono; la app solicita almacenamiento persistente, pero el navegador puede rechazarlo.
- HEIC/HEVC depende del navegador. Se conserva el original aunque el dispositivo no permita previsualizarlo.
- Si dos encargados modifican el mismo espacio, se conservan ambas versiones y se solicita compararlas antes de resolver el conflicto.
- Añadir un elemento o corregir la recepción exige volver a confirmar las revisiones afectadas; conserva las cantidades y observaciones existentes.

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

La prueba de integración requiere las variables de `.env.local`. Crea usuarios, un espacio y un archivo temporales en Supabase, comprueba sus permisos y los elimina en su bloque de limpieza. Usar preferentemente un proyecto de pruebas.

## Infraestructura

La instalación de este repositorio usa el proyecto Vercel `app-orden-colegio` y Supabase `wxulrvbhyjtfyqkqsehc`, región São Paulo. Las claves están en las variables de entorno de Vercel y archivos locales ignorados por Git.

Para reproducir el despliegue en otra instalación:

1. Crear el proyecto Supabase y aplicar las migraciones de `supabase/migrations` mediante `supabase link --project-ref REF` y `supabase db push`.
2. Configurar en Vercel las seis variables de `.env.example`. `INITIAL_SETUP_KEY` debe ser aleatoria y privada. `SUPABASE_SECRET_KEY` solo se usa en el servidor. Las dos variables `VITE_` y la clave publicable son configuración pública, protegida por las reglas de acceso.
3. Desplegar con `vercel --prod`. `vercel.json` configura Vite, la API y el enrutamiento de la PWA. Puede vincularse el repositorio con Vercel para despliegues al publicar cambios.
4. Crear el coordinador mediante el enlace de instalación. Conservar la clave fuera del repositorio; no compartirla como enlace de ingreso del equipo.

Auth verifica los tokens; la API comprueba que el miembro siga activo. Las tablas tienen RLS y solo son accesibles desde el servidor. Storage permite a cada miembro activo subir únicamente la ruta de un archivo previamente registrado a su nombre. El bucket `evidence` es privado; las descargas utilizan enlaces firmados de 15 minutos. Las revisiones se guardan mediante una transacción con control de versión e idempotencia.

Revisar consumo y cuotas en Supabase/Vercel según el volumen real. Respaldar la base y los objetos del bucket; la exportación ZIP permite conservar una copia de los originales junto al registro y al informe.

## Código

- `app/colegio-app.tsx` y `app/globals.css`: interfaz y temas.
- `app/auth-panel.tsx`: acceso y equipo.
- `api/index.ts` y `server/cloud.ts`: API desplegada en Vercel.
- `supabase/migrations`: tablas, transacciones y permisos.
- `lib/local-store.ts`, `lib/sync.ts`: guardado local y sincronización.
- `lib/inspection.ts`: reglas para corregir revisiones e inventario.
- `lib/reports.ts`: PDF, texto y ZIP.
- `public/sw.js`, `lib/offline.ts`: apertura sin conexión.

[Pruebas y límites verificados](docs/PRUEBAS.md). La cámara y la instalación deben comprobarse también en Android/iPhone físicos.
