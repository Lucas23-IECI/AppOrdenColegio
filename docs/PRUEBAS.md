# Pruebas de la primera versión

Comprobadas en Edge/Chromium automatizado en Windows, con servidor local de desarrollo y Worker de producción local. Los teléfonos físicos Android/iPhone todavía requieren la prueba del usuario.

## Resultados

- Creación de espacios, nombres y responsables: correcto.
- Cantidades guardadas, sincronizadas y recuperadas al recargar: correcto.
- Foto PNG y video MP4 de 11,85 MB guardados en IndexedDB: correcto.
- Video subido a R2 local en dos partes: correcto.
- Reproducción del video local y desde el servidor; adelantar hasta el segundo 5: correcto.
- Petición de rango HTTP: 206, 1024 bytes correctos, Content-Range correcto.
- Reanudar una carga después de subir solo la primera parte: el servidor recordó la parte completada.
- Archivo descargado después de reanudación idéntico byte por byte al original: correcto.
- Escritura concurrente con revisión antigua: rechazada con 409; reintento de la misma operación: 200 sin crear otra revisión.
- API sin sesión: 401. Escritura desde otro origen: 403. Rango inválido: 416.
- Worker de producción + service worker: recarga sin conexión recuperó cantidades y observaciones.
- Añadir foto sin conexión, recargar y abrirla desde IndexedDB: correcto.
- Reconectar y respaldar los pendientes: correcto.
- PDF A4 y texto exportados; PDF renderizado y revisado visualmente.
- Temas azul, naranjo y noche; vista móvil de 390 px sin desbordamiento horizontal.
- TypeScript sin errores y compilación de Worker completada.

## Prueba sugerida desde un celular real

1. Abrir la URL publicada en Safari (iPhone) o Chrome (Android), con la misma cuenta propietaria.
2. Crear un espacio llamado “Prueba” para no mezclarlo con el registro del colegio.
3. Registrar dos cantidades, tomar una foto y grabar un video corto. Abrir ambos desde la app.
4. Revisar Respaldo hasta que se confirme que no quedan pendientes.
5. Preparar el uso sin señal; añadir la app a la pantalla de inicio.
6. Activar modo avión. Modificar una cantidad y una nota; capturar otra foto.
7. Cerrar y abrir la app. Comprobar que siguen disponibles.
8. Desactivar modo avión y respaldar. Abrir desde otro dispositivo con la misma cuenta.
9. Descargar un PDF, el texto y un respaldo ZIP.

No eliminar datos del navegador ni desinstalar la app mientras existan archivos pendientes de respaldo. La cámara, los formatos HEIC/HEVC y las restricciones de almacenamiento pueden variar según el teléfono y navegador; el original descargable se conserva aunque no se pueda previsualizar un formato.

## Límites actuales

- Primera publicación privada para la cuenta propietaria. El acceso de otras cuentas necesita una habilitación explícita en Sites y su incorporación al equipo.
- El respaldo local no sustituye al remoto; la app identifica cada estado.
- Carga en primer plano, reanudable al volver a abrir. No se promete que un video termine de subir con la app cerrada.
- Hasta 2 GB por archivo; disponibilidad local sujeta al espacio que conceda el navegador.
- ZIP hasta 300 MB por exportación. Para más volumen, seleccionar un espacio o descargar videos individuales.
- Los informes se emiten como borradores para revisión y firma. No se inventa aceptación del colegio.
- WebMCP se registra solo si el navegador lo admite. No se dispuso de un contexto WebMCP compatible para validarlo.
