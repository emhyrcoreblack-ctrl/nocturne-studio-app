# Paquete de transferencia para Claude — investigación de Onshape

Fecha de consolidación: 2026-11-26
Repositorio de trabajo: https://github.com/emhyrcoreblack-ctrl/nocturne-studio-app
Rama: main
Aplicación: NOCTURNE STUDIO

## 1. Propósito

Este documento reúne la información de ingeniería inversa de Onshape que está efectivamente conservada en el repositorio y establece cómo debe utilizarla Claude para continuar el trabajo sin confundir indicios estáticos con comportamiento demostrado.

**Advertencia de integridad:** esto NO es el volcado completo de la ingeniería inversa histórica. En la rama main revisada el 2026-11-26 no existen los APK, los 9 archivos DEX, volcados de cadenas, informes de JADX/apktool, capturas, trazas de ejecución ni bases de datos de clases. El inventario de abajo es la evidencia textual que sí está guardada. No inventar resultados que no estén aquí.

## 2. Fuente y método registrados

El documento original `REA_ONSHAPE.md` declara que se inspeccionó estáticamente un APK de referencia de Onshape aportado por el usuario. El paquete inspeccionado contenía 9 archivos DEX, bibliotecas nativas y recursos gráficos. Los nombres de clases y cadenas encontrados se utilizaron como indicios de familias funcionales.

La inspección estática de nombres de clases NO demuestra por sí sola:
- el flujo exacto de interacción;
- los parámetros, valores por defecto o unidades;
- los algoritmos geométricos;
- las reglas de restricciones y resolución;
- los gestos multitáctiles;
- el comportamiento visual en ejecución;
- la equivalencia con una implementación propia.

No copiar ni reutilizar código, recursos gráficos, marcas ni otros activos propietarios de Onshape. Implementar comportamientos CAD propios a partir de requisitos observables y evidencia legítima.

## 3. Inventario de herramientas de croquis detectadas

| Función | Identificadores encontrados |
|---|---|
| Línea | `BTLineTool` |
| Rectángulo por esquina / por centro | `BTRectangleTool`, `BTCenterRectangleTool` |
| Círculo por centro / por perímetro | `BTCircleTool`, `BTPerimeterCircleTool` |
| Polígono regular / inscrito / circunscrito | `BTPolygonTool`, `BTInscribedPolygonTool`, `BTCircumscribedPolygonTool` |
| Elipse | `BTEllipseTool` |
| Arco / arco por centro / arco tangente | `BTArcTool`, `BTCenterpointArcTool`, `BTTangentArcTool` |
| Bézier / spline / punto de spline | `BTBezierTool`, `BTSplineTool`, `BTSplinePointTool` |
| Punto / ranura | `BTPointTool`, `BTSlotTool` |
| Texto / cotas | `BTTextTool`, `BTDimensionTool` |
| Recortar / extender / dividir / desfase | `BTTrimTool`, `BTExtendTool`, `BTSplitEntityTool`, `BTOffsetTool` |
| Redondeo / chaflán de croquis | `BTFilletTool`, `BTChamferTool` |
| Patrón lineal / circular, simetría, transformar | `BTSketchLinearPatternTool`, `BTSketchCircularPatternTool`, `BTSketchMirrorTool`, `BTSketchTransformTool` |
| Usar geometría / intersección | `BTSketchUseTool`, `BTSketchIntersectTool` |
| Importación DXF/DWG / imagen | `BTSketchImportDXFDWGTool`, `BTSketchImportImageTool` |

## 4. Referencias de modelado 3D y selección detectadas

Se registraron tipos/estructuras relacionados con:
- entidades de cara, arista y vértice;
- selección permitida;
- entidades de croquis;
- patrones de ensamblaje;
- operaciones booleanas geométricas;
- análisis de desmoldeo;
- descripciones de barrido.

Ejemplos exactos de identificadores:
- `BTEntityFace`
- `BTEntityEdge`
- `BTAllowedSelection`
- `BTGLAllowedSelection`
- `BTGLSketchEntity`
- `BTAssemblyPattern`
- `BTBSGeometricBoolean`
- `BTDraftAnalysis`
- `BTSweepDescription`

**Límite expresamente registrado:** en esa pasada no se encontraron nombres inequívocos para todas las operaciones 3D habituales (por ejemplo Extrude, Revolve, Loft o Shell). La presencia de botones en NOCTURNE no demuestra que el APK exponga clases con esos nombres.

## 5. Auditoría funcional de NOCTURNE (estado registrado el 2026-11-24)

### Rutas de ejecución identificadas
- Línea continua (`line`), con segmentos, inferencias y snaps.
- Rectángulo por esquina (`rect`).
- Círculo por centro (`circle`).
- Selección de objetos existentes.
- Deshacer/rehacer de estados serializados.
- Vistas de cámara y selección de plano de trabajo.
- Restricciones con lógica parcial: horizontal, vertical, paralela, perpendicular, coincidente y fijar/desbloquear. Requieren pruebas geométricas específicas; no se consideran certificadas.

### Herramientas visibles pero registradas como no implementadas
Rectángulo por centro, círculo por tres puntos, elipse, polígonos inscrito/circunscrito, texto, usar geometría, intersección, redondeo/chaflán de croquis, importación DXF/DWG e imagen, cotas, arcos, spline, punto, recortar, extender, partir, equidistancia, ranura, patrones, simetría y transformar.

### Operaciones de sólido registradas como pendientes
Extruir, revolución, barrido, loft, redondeo y chaflán 3D. La auditoría afirma que el motor entonces inspeccionado no contenía representación B-rep ni operaciones booleanas de sólidos.

Este estado es una fotografía de la auditoría del 2026-11-24, no una garantía del estado actual. Verificar el código de la rama main antes de cambiarlo.

## 6. Orden de desarrollo recomendado en la auditoría

1. Herramientas 2D básicas y multipaso: rectángulo por centro, círculo por perímetro/tres puntos, elipse, polígonos, punto y arcos.
2. Edición de perfiles: recortar, extender, partir, desfase, ranura, redondeo y chaflán.
3. Restricciones y cotas paramétricas con resolución estable y persistencia.
4. Usar/intersecar geometría, texto e importación.
5. Patrones, simetría y transformación.
6. Núcleo de sólidos y operaciones 3D reales; no simular extrusión o booleanas con trazos de pantalla.

Cada herramienta solo debe habilitarse tras pruebas en móvil y escritorio: creación, cancelación, previsualización, selección, guardado/recarga, deshacer/rehacer y tolerancia a gestos multitáctiles.

## 7. Precauciones de integración ya registradas

- No modificar el sistema de cámara/táctil aprobado salvo petición expresa.
- Mantener cursor, punto de inicio, snap y coordenadas bajo la misma transformación.
- Toda operación geométrica nueva debe actualizar escena, árbol/inspector, persistencia e historial.
- No habilitar herramientas pendientes quitando simplemente `disabled`.
- Preservar las funciones existentes y probar antes de publicar.

## 8. Archivos de evidencia que existen en el repositorio

- `REA_ONSHAPE.md` — inventario estático de clases y familias de herramientas.
- `CAD_TOOL_AUDIT.md` — auditoría funcional de NOCTURNE y brechas de implementación.
- `studio-3d.html` — aplicación actual; fuente para auditar la implementación, no fuente primaria de la ingeniería inversa.
- `index.html` — entrada de la aplicación.
- `.github/workflows/deploy-pages.yml` — publicación.

En el árbol main revisado no se encontraron otros archivos de investigación, APK o volcados DEX.

## 9. Qué falta recuperar para poder afirmar que tenemos la investigación completa

1. El APK original utilizado, o una copia legalmente disponible para repetir el análisis.
2. Los 9 DEX originales o sus hashes y volcados de clases/cadenas.
3. Informes de herramientas de análisis estático (por ejemplo listado de clases, paquetes, referencias cruzadas y recursos), si se conservaron.
4. Capturas y grabaciones de las pruebas funcionales que se hicieron en Onshape.
5. Notas de observación por herramienta: secuencia de pasos, estados, parámetros, restricciones, errores y resultados.
6. Cualquier conversación, documento o archivo externo donde se anotaran hallazgos que no se subieron a este repositorio.

Si estos materiales están en el dispositivo o en otra conversación, deben exportarse y añadirse al repositorio con nombre, fecha, origen y hash. No reconstruir datos ausentes como si fueran hallazgos originales.

## 10. Instrucciones para Claude

Trabaja exclusivamente sobre `emhyrcoreblack-ctrl/nocturne-studio-app`, rama `main`, salvo autorización expresa.

Antes de programar:
1. Lee este documento, `REA_ONSHAPE.md` y `CAD_TOOL_AUDIT.md`.
2. Inspecciona `studio-3d.html` y verifica si el estado funcional de 2026-11-24 sigue vigente.
3. Separa cada conclusión en: **evidencia observada**, **inferencia** o **pendiente de verificar**.
4. No afirmes que se hizo ingeniería inversa de algoritmos si solo se conocen nombres de clases.
5. No reemplaces la aplicación por otro proyecto ni elimines herramientas ya funcionales.
6. Mantén una versión web de prueba antes de cualquier APK.
7. Añade al repositorio cada hallazgo nuevo con fuente, método, fecha, nivel de confianza y evidencia reproducible.

Objetivo: construir un CAD paramétrico propio, robusto y táctil, tomando como referencia funcional lo aprendido de Onshape, sin copiar su código ni sus activos propietarios.
