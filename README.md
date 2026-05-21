# Savr App

Aplicación móvil de control de finanzas personales construida con Expo y Firebase.

## Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) v18 o superior
- [Git](https://git-scm.com/)
- [Expo Go](https://expo.dev/go) en tu dispositivo móvil (Android o iOS) para probar sin emulador

Opcional (para emuladores):
- [Android Studio](https://developer.android.com/studio) para emulador Android
- Xcode (solo macOS) para simulador iOS

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd savr-app
```

### 2. Instalar Expo CLI

```bash
npm install -g expo-cli
```

### 3. Instalar dependencias del proyecto

```bash
npm install
```

### 4. Instalar Firebase

```bash
npx expo install firebase@^11.0.0
```

> Usar `expo install` en lugar de `npm install` garantiza una versión de Firebase compatible con Expo SDK 54.

---

## Configuración de Firebase

### 1. Crear proyecto en Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita **Firestore Database** en modo de prueba

### 2. Registrar la app

1. En la consola de Firebase, agrega una app de tipo **Web** (`</>`)
2. Copia el objeto `firebaseConfig` que te genera

### 3. Actualizar las credenciales

Edita el archivo `src/services/firebase.ts` y reemplaza el `firebaseConfig` con el tuyo:

```ts
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 4. Reglas de Firestore

En la consola de Firebase → Firestore → Reglas, usa esto para desarrollo:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> Recuerda restringir estas reglas antes de lanzar a producción.

---

## Ejecutar el proyecto

```bash
npx expo start
```

Luego escanea el QR con la app **Expo Go** en tu dispositivo, o presiona:

- `a` para abrir en emulador Android
- `i` para abrir en simulador iOS (solo macOS)

Si el bundler tiene caché desactualizada:

```bash
npx expo start --clear
```

---

## Estructura del proyecto

```
savr-app/
├── app/                  # Rutas de expo-router
│   ├── _layout.tsx       # Layout raíz
│   └── (tabs)/
│       ├── _layout.tsx   # Layout de tabs
│       └── index.tsx     # Entrada principal (maneja auth state)
├── src/
│   ├── screens/
│   │   ├── AuthScreen.tsx    # Pantalla de inicio de sesión
│   │   └── HomeScreen.tsx    # Pantalla principal
│   ├── services/
│   │   ├── auth.ts           # Servicio de autenticación
│   │   ├── firebase.ts       # Inicialización de Firebase
│   │   └── firebaseUsers.ts  # Operaciones de usuario en Firestore
│   └── types/
│       └── index.ts          # Tipos TypeScript
└── package.json
```

---

## Tecnologías utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| Expo | ~54.0.33 | Framework principal |
| Expo Router | ~6.0.23 | Navegación basada en archivos |
| React Native | 0.81.5 | UI nativa |
| Firebase | ^11.0.0 | Backend y base de datos |
| TypeScript | ~5.9.2 | Tipado estático |
