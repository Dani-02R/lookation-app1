# Lookation

Lookation es una aplicación móvil desarrollada con **React Native** que utiliza **Firebase** como backend para autenticación y almacenamiento de datos.

---

## Tecnologías utilizadas

- React Native
- Firebase
- JavaScript / TypeScript
- React Navigation

---

## Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/Gamer-Sm/LookationApp.git
```

2. Entrar al directorio del proyecto:

```bash
cd frontend
```

3. Instalar todas las dependencias:

```bash
npm install
```

> Esto instalará automáticamente todas las librerías necesarias según el archivo `package.json`.

---

### Dependencias adicionales a instalar manualmente

Algunas dependencias pueden requerir instalación manual si no están en el `package.json` o para asegurar compatibilidad:

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
npm install react-native-vector-icons
npm install axios
npm install react-native-flash-message
npm install --save dev @react-native/typescript-config
```

> Si usas iOS, ejecuta también:
>
> ```bash
> npx pod-install
> ```

---

## Ejecución

Para ejecutar la aplicación en un dispositivo o emulador Android:

```bash
npx react-native run-android
```

Esto abrirá la aplicación en el emulador o dispositivo conectado.

---

## Estructura del proyecto

- `frontend/`  
  Contiene todo el código de la aplicación React Native:
  - `src/screens/` → Pantallas de Login y Registro
  - `src/assets/` → Imágenes y logos
  - `App.tsx` → Configuración principal y navegación

---

## Configuración de Firebase

1. Crea un proyecto en [Firebase](https://firebase.google.com/).
2. Configura la autenticación que necesites (correo, Google, Facebook, etc.).
3. Descarga el archivo `google-services.json` para Android y colócalo en `android/app/`.
4. Instala las dependencias de Firebase:

```bash
npm install @react-native-firebase/app @react-native-firebase/auth
```

5. Configura Firebase en tu proyecto según la [documentación oficial](https://rnfirebase.io/).

---

## Notas importantes

- Asegúrate de tener instalado **Node.js**, **npm** y el entorno de **React Native** configurado para Android.
- Todas las dependencias del proyecto se encuentran en `package.json`.
- El proyecto utiliza **React Navigation** para el flujo de pantallas.
- Se recomienda ejecutar la app en un dispositivo o emulador con versión Android reciente para evitar problemas de compatibilidad.

---

## Contacto

Para más información o soporte sobre el proyecto, puedes

adb temporal
$env:PATH += ";C:\Users\Aprendiz\AppData\Local\Android\Sdk\platform-tools"
npm install react-native-safe-area-context
