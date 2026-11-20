# NOCTURNE STUDIO 3D — Android

Este módulo empaqueta la versión web existente dentro de una aplicación Android instalable.

## Compilación
Con JDK 17, Android SDK y Gradle 8.9:

```bash
cd android
bash scripts/vendor-three.sh
gradle assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

## Arquitectura
- Actividad Android nativa con WebView.
- HTML, CSS y JavaScript del editor se sirven desde assets mediante AndroidX WebKit AssetLoader.
- DOM Storage permanece habilitado para guardar proyectos localmente bajo un origen estable.
- Aceleración por hardware habilitada para WebGL.
- Three.js 0.160.0 y los módulos requeridos se descargan durante la compilación y se empaquetan dentro del APK. La aplicación no necesita conexión a Internet para cargar el motor 3D.
- El APK requiere Android 8.0 (API 26) o posterior.
- La clave de firma de depuración se conserva mediante caché de GitHub Actions para permitir instalar builds posteriores encima del anterior mientras se mantenga esa caché.

## Alcance
Esta primera base es un contenedor Android instalable del editor web; no es todavía una migración del motor CAD a Kotlin nativo ni una certificación de funcionamiento en todos los teléfonos. WebGL, gestos táctiles y persistencia deben validarse en dispositivos Android reales.
