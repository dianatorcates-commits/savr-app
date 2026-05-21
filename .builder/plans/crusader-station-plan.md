# Plan: Rediseño Moderno y Minimalista - AuthScreen

## Resumen Ejecutivo
Crear una pantalla de autenticación moderna y minimalista con login mediante Google. La pantalla usará una paleta oscura limpia con acentos en púrpura, manteniendo consistencia con el sistema de temas existente del proyecto.

## Contexto Actual
- **Estado**: `AuthScreen.tsx` está importado en navegación pero no tiene implementación visual
- **Stack Tech**: React Native + Expo, con soporte para tema claro/oscuro
- **Componentes Disponibles**: `ThemedText`, `ThemedView` para temas automáticos
- **Patrón Existente**: `HomeScreen.tsx` usa estilos inline con `StyleSheet`
- **Autenticación**: Servicio `authService.signInWithGoogle()` ya implementado

## Requisitos del Usuario
- ✅ Diseño moderno y minimalista
- ✅ Paleta de colores: Oscuro limpio
- ✅ Color de acento: Púrpura
- ✅ Elemento único: Botón "Login con Google"

## Enfoque Recomendado

### 1. Crear `AuthScreen.tsx` con Diseño Minimalista
**Objetivo**: Pantalla limpia con foco en la acción de login

**Estructura Visual**:
- Encabezado con logo/branding (centrado, espacioso)
- Título descriptivo ("Bienvenido a Savr")
- Subtítulo explicativo
- Botón principal "Login con Google" con ícono
- Espacios en blanco generosos (diseño minimalista)
- Fondo oscuro (#151718 del tema existente)

**Colores**:
- Fondo: #151718 (oscuro del tema)
- Texto principal: #ECEDEE (blanco del tema)
- Acento: #9D4EDD (púrpura)
- Acento secundario: #6A0DAD (púrpura más oscuro para hover)

**Componentes**:
- Usar `ThemedView` para fondo automático
- Usar `ThemedText` para textos con tipo "title" y "default"
- Botón personalizado con ícono de Google y efecto hover
- Estado de carga mientras se procesa el login

### 2. Actualizar Sistema de Tema
**Archivo**: `constants/theme.ts`

**Cambios**:
- Agregar colores púrpura a la paleta (primario: #9D4EDD, secundario: #6A0DAD)
- Mantener compatibilidad con tema claro y oscuro
- Agregar tokens de espaciado para mantener consistencia

### 3. Integración con Servicios Existentes
- Conectar botón con `authService.signInWithGoogle()`
- Manejar estados: cargando, éxito, error
- Mantener flujo de navegación existente (redirect a `HomeScreen` después del login)

### 4. Características de UX
- Spinner/indicador de carga durante autenticación
- Feedback visual en botones (Pressable con opacidad)
- Mensajes de error claros si falla el login
- Respuesta a diferentes tamaños de pantalla

## Archivos a Modificar
1. **Crear**: `src/screens/AuthScreen.tsx` (pantalla de autenticación)
2. **Editar**: `constants/theme.ts` (agregar colores púrpura)

## Consideraciones Técnicas
- Usar `Pressable` de React Native para mejor accesibilidad
- Mantener patrón de estilos inline con `StyleSheet` (consistente con proyecto)
- Reutilizar componentes temados existentes
- Considerar SafeAreaView para pantallas con notch
- Usar `expo-vector-icons` para ícono de Google (@expo/vector-icons ya en dependencies)

## Resultado Esperado
Una pantalla de autenticación limpia, moderna y accesible que:
- Guía al usuario hacia el login con Google de forma clara
- Mantiene consistencia con el sistema de diseño del proyecto
- Funciona bien en tema claro y oscuro
- Se adapta a diferentes tamaños de pantalla
