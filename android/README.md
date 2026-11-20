# NOCTURNE STUDIO 3D — Android

Este módulo empaqueta la versión web existente dentro de una aplicación Android instalable.

## Compilación
Desde esta carpeta, con JDK 17 y Android SDK instalado:

```bash
gradle assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

## Arquitectura de esta primera integración
- Actividad Android nativa con WebView.
- HTML, CSS y JavaScript del editor se sirven desde assets mediante AndroidX WebKit AssetLoader.
- DOM Storage permanece habilitado para guardar los proyectos localmente bajo un origen estable.
- Aceleración por hardware habilitada para WebGL.
- El APK requiere Android 8.0 (API 26) o posterior.
- La clave de firma de depuración se conserva mediante caché de GitHub Actions para permitir instalar builds posteriores encima del anterior mientras se mantenga esa caché.

## Dependencia de red pendiente
Three.js 0.160.0 y sus módulos de ejemplo todavía se importan desde jsDelivr, igual que en la versión web. Por ello, la primera apertura del editor requiere conexión a Internet. El siguiente paso es empaquetar esas dependencias localmente y comprobar WebGL en dispositivos Android reales.

## Alcance
Esta primera base es un contenedor Android instalable del editor web; no es todavía una migración del motor CAD a Kotlin nativo ni una certificación de funcionamiento en todos los teléfonos.
