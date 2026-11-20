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
- Los archivos HTML, CSS y JavaScript de NOCTURNE se sirven desde assets mediante AndroidX WebKit AssetLoader.
- DOM Storage permanece habilitado para que el guardado local del editor use el mismo origen estable de la aplicación.
- Aceleración por hardware habilitada para WebGL.
- El APK requiere Android 8.0 (API 26) o posterior.

## Dependencia de red pendiente
En esta primera base, Three.js 0.160.0 y sus módulos de ejemplo todavía se importan desde jsDelivr, como en la versión web. Por ello, la primera apertura del editor requiere conexión a Internet. El siguiente paso es empaquetar esas dependencias localmente y comprobar WebGL en dispositivos Android reales.

## Alcance
Este APK es un contenedor Android funcional del editor web; no es todavía una migración del motor CAD a Kotlin nativo ni una certificación de funcionamiento en todos los teléfonos.
