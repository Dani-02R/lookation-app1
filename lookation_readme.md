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
npm install --save-dev @react-native/typescript-config
npm install react-native-safe-area-context
npm i @react-native-firebase/app@23.1.2 @react-native-firebase/auth@23.1.2 @react-native-firebase/firestore@23.1.2


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
$env:PATH += ";C:\Users\Aprendiz\AppData\Local\Android\Sdk\platform-tools" archivo para activacion temporal de abd 
de android y el sdk



Certificados y huellas Sha para login con google
Antes de esto deberas instalar el debug.keystore que les envie a whatsapp
Debes ir a tu explorador de archivos y poner C:\Users\tu-usuario\.android
dar enter, entraras y veras un archivo llamado debug.keystore lo remplazas por el que te envie en whatsapp


Entraremos a la carpeta frontend, despues a la carpeta android y en android ejecutaremos el comando:
keytool -list -v -keystore C:\Users\tu-usuario\.android\debug.keystore -alias androiddebugkey

Te pedira una contraseña la cual es: android 

verifica que las sha1 sea: 34:45:78:69:1E:09:18:98:11:3E:C3:ED:41:97:04:A0:B4:08:68:25
Verifica que la sh2 sea: 4C:AE:75:B4:B8:6A:84:FE:1A:31:18:90:6E:E4:1B:EB:11:34:42:AD:BD:B1:0B:68:5B:BC:


si te salen estos tal cual como estan ahi, es porque quedo correctamente configurado