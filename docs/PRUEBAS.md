# Pruebas de la aplicación independiente

Ejecutadas en Windows, Node 24 y Edge/Chromium. Los datos de prueba están separados de la instalación real y fuera de Git.

## Automatizadas: npm test

- Instalación con clave local y rechazo de una segunda instalación.
- Contraseña incorrecta rechazada; cookies HttpOnly, SameSite y Secure para HTTPS.
- Invitaciones de un uso; encargados sin permisos para invitar ni cambiar el evento.
- Revocación invalida las sesiones del encargado.
- API y archivos sin sesión: 401. Escrituras desde otro origen: 403.
- Conflictos de revisión: 409; reintento idempotente sin duplicar historial.
- Video de más de 9 MB en partes: reanudación, rechazo de finalización incompleta y descarga idéntica al original.
- Rangos HTTP: 206 con los bytes correctos; rango inválido: 416.
- Cierre de sesión invalida su cookie.

## Interfaz del servidor compilado

- Instalación desde la pantalla real y creación de usuario propio.
- Sala, encargado y cantidades guardadas.
- Foto y video MP4 de 11,85 MB respaldados en el servidor independiente.
- Preparación offline confirmada por el service worker.
- Cambio de cantidad sin señal, recarga y recuperación del valor.
- Foto nueva sin señal, recarga y respaldo posterior sin pendientes.
- PDF exportado y renderizado para comprobar texto, fotografías y paginación.
- Tema naranjo; móvil de 390 px sin desbordamiento horizontal ni errores JavaScript.
- TypeScript y compilación de cliente/servidor.
- Enlace HTTPS temporal: app 200; datos privados 401 sin sesión.

## Pendientes en dispositivos reales

Cámara Android/iPhone, HEIC/HEVC, instalación en pantalla de inicio y cuotas de almacenamiento. La prueba automatizada no sustituye estas comprobaciones.

El túnel temporal requiere mantener encendido el computador. Para el evento falta elegir un alojamiento permanente con HTTPS y respaldo del volumen. Docker se incluye como opción de despliegue; no ha sido desplegado en un proveedor externo.
