# Capturas de la app del estudiante

Capturas reales tomadas el 23 de octubre de 2026 en un iPhone 17 Pro simulado con Expo Go, la API local y una base temporal de prueba. No corresponden al despliegue de produccion ni a un APK de Android. La cuenta `estudiante.demo@example.com` es ficticia; ninguna captura muestra una contrasena.

| Archivo | Como llegar a la pantalla |
| --- | --- |
| `01-acceso.png` | Abrir AeroPark Vision en Expo Go sin una sesion iniciada. |
| `02-registro.png` | Desde el acceso, elegir la opcion de crear cuenta. |
| `03-inicio-zonas.png` | Iniciar sesion con la cuenta de prueba para ver la disponibilidad de ambas zonas. |
| `04-plano-zona-a.png` | Tocar Espacios en la barra inferior y seleccionar A; la leyenda aparece sobre el plano. |
| `05-plano-zona-b.png` | En Espacios, seleccionar B; la leyenda aparece sobre el plano. |
| `06-detalle-espacio-libre.png` | En el plano A, tocar la plaza libre A-032. |
| `07-seleccionar-tiempo-ocupacion.png` | En el detalle de A-032, escoger el tiempo estimado antes de marcarla. |
| `08-mi-espacio-ocupado.png` | Tocar Estoy estacionado aqui y abrir Mi espacio en la barra inferior. |
| `09-accion-liberar.png` | Volver a Espacios y tocar la propia plaza A-032 ya ocupada. |
| `10-espacio-liberado.png` | Tocar Liberar espacio y abrir Mi espacio para comprobar que no hay ocupacion activa. |
| `11-perfil-ultimas-revisiones.png` | Abrir Perfil en la barra inferior para consultar las ultimas revisiones registradas. |

Los planos son desplazables y la captura inicial solo muestra la parte superior; la leyenda completa si esta visible. Durante esta prueba se confirmo el registro, la ocupacion y la liberacion de A-032. Las cifras de disponibilidad provienen de analisis reales sobre imagenes de prueba, no de datos simulados.

`07-seleccionar-tiempo-ocupacion.png` muestra una primera prueba de 4 h. La captura `08-mi-espacio-ocupado.png` corresponde a una segunda prueba de la misma plaza, de 1 h, despues de habilitar las notificaciones; ambas ocupaciones se liberaron.

No se incluye una captura de recordatorio recibido: el permiso de notificaciones esta habilitado en el simulador y la app programa el aviso al marcar el espacio, pero su hora de entrega no ocurrio durante esta sesion. No debe describirse como una notificacion visualmente comprobada.
