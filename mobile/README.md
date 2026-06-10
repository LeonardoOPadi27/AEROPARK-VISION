# AeroPark Vision Mobile

Base mobile creada con Expo para el usuario final de Tecsup.

## Que incluye ahora

- Inicio centrado en disponibilidad por 3 zonas.
- Pantalla de espacios con codigos `A-001`, `B-001`, `C-001`.
- Flujo real para marcar `Estoy estacionado aqui` y `Liberar espacio`.
- Historial y perfil como primeras bases.
- Consumo del backend en `/mobile/parking-overview`.

## Como ejecutarlo

```bash
cd mobile
npm start
```

Si vas a probarlo en telefono fisico, define la URL del backend antes de iniciar:

```bash
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000 npm start
```

## Credenciales de prueba

```txt
Correo: alexis@test.com
Contraseña: 123456
```

Tambien puedes usar:

```bash
npm run ios
npm run android
npm run web
```

## Siguiente paso recomendado

Conectar autenticacion real y notificaciones para recordar al usuario confirmar si el espacio sigue ocupado o ya fue liberado.
