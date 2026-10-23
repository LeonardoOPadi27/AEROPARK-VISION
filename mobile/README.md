# AeroPark Vision Mobile

App Expo para estudiantes. Consume la API desplegada por defecto;
`EXPO_PUBLIC_API_URL` permite apuntar a un backend local.

## Funciones

- Registro e inicio de sesion de estudiante.
- Disponibilidad por zonas A y B con leyenda de colores.
- Ocupacion, confirmacion y liberacion manual de un espacio.
- Recordatorios locales si el administrador los habilita y el dispositivo
  permite notificaciones.
- Perfil con ultimas revisiones.

## Como ejecutarlo

```bash
cd mobile
npm start
```

Abre el codigo QR en Expo Go. Si vas a probar un backend local desde un
telefono fisico, define una IP accesible desde la misma red:

```bash
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000 npm start
```

Tambien puedes usar:

```bash
npm run ios
npm run android
npm run web
```

## APK de prueba

El perfil `preview` de `eas.json` genera un APK instalable. Requiere iniciar
sesion en Expo y configurar el proyecto EAS una vez:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

El perfil `production` genera un AAB para Google Play. El APK aun no se ha
generado ni probado en dispositivo; valida registro, avisos y ocupacion antes
de distribuirlo. En Android, Expo Go permite probar notificaciones locales,
pero no se usan notificaciones push remotas.
