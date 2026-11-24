# REA — Inventario técnico de referencia CAD

## Fuente y método
Se inspeccionó estáticamente el APK de referencia Onshape aportado por el usuario. El paquete contiene 9 archivos DEX, bibliotecas nativas y recursos gráficos. El inventario siguiente procede de nombres de clases/cadenas encontrados en los DEX; estos nombres prueban que existen referencias compiladas, pero por sí solos no describen todos los parámetros, gestos ni reglas geométricas. No se copió código, recursos gráficos ni marca de Onshape.

## Herramientas de croquis detectadas
- Línea — `BTLineTool`
- Rectángulo por esquina y por centro — `BTRectangleTool`, `BTCenterRectangleTool`
- Círculo por centro y por perímetro — `BTCircleTool`, `BTPerimeterCircleTool`
- Polígono regular, inscrito y circunscrito — `BTPolygonTool`, `BTInscribedPolygonTool`, `BTCircumscribedPolygonTool`
- Elipse — `BTEllipseTool`
- Arco, arco por centro y arco tangente — `BTArcTool`, `BTCenterpointArcTool`, `BTTangentArcTool`
- Bézier y spline — `BTBezierTool`, `BTSplineTool`, `BTSplinePointTool`
- Punto y ranura — `BTPointTool`, `BTSlotTool`
- Texto y cotas — `BTTextTool`, `BTDimensionTool`
- Recortar, extender, dividir y desfase — `BTTrimTool`, `BTExtendTool`, `BTSplitEntityTool`, `BTOffsetTool`
- Redondeo y chaflán de croquis — `BTFilletTool`, `BTChamferTool`
- Patrón lineal/circular, simetría y transformar — `BTSketchLinearPatternTool`, `BTSketchCircularPatternTool`, `BTSketchMirrorTool`, `BTSketchTransformTool`
- Usar geometría e intersección — `BTSketchUseTool`, `BTSketchIntersectTool`
- Importación DXF/DWG e imagen — `BTSketchImportDXFDWGTool`, `BTSketchImportImageTool`

## Referencias de modelado y selección 3D detectadas
Se localizaron tipos y estructuras relacionadas con entidades de cara, arista y vértice; selección permitida; entidades de croquis; patrones de ensamblaje; operaciones booleanas geométricas; análisis de desmoldeo; y descripciones de barrido. Ejemplos: `BTEntityFace`, `BTEntityEdge`, `BTAllowedSelection`, `BTGLAllowedSelection`, `BTGLSketchEntity`, `BTAssemblyPattern`, `BTBSGeometricBoolean`, `BTDraftAnalysis`, `BTSweepDescription`.

**Límite de evidencia:** no se encontraron en esta pasada nombres inequívocos de clases para todas las operaciones 3D habituales (por ejemplo, Extrude, Revolve, Loft o Shell). Sus botones en NOCTURNE se consideran referencias de interfaz, no prueba de que el APK exponga clases con esos nombres.

## Estado aplicado en NOCTURNE
- Se conserva la implementación propia existente para Línea, Rectángulo por esquina, Círculo por centro, Polígono regular, Elipse, Arco de 3 puntos, Recortar y Extender.
- La paleta ahora evita duplicar visualmente los accesos de Recortar, Extender y Arco de 3 puntos: los espacios de inventario correspondientes muestran Bézier, Círculo por perímetro y Arco por punto central como herramientas pendientes.
- La barra de operaciones muestra Vaciado/Shell, Desmoldeo/Draft, Booleanas y Patrón 3D como pendientes.
- Las herramientas pendientes permanecen deshabilitadas; no se presentan como funcionales.

## Siguiente orden de implementación recomendado
1. Terminar herramientas de croquis que reutilizan el plano y el sistema de puntos actual: rectángulo por centro, círculo por perímetro/3 puntos, polígonos inscrito/circunscrito y punto.
2. Implementar geometría de curva y edición: Bézier, spline, ranura, dividir y desfase.
3. Resolver restricciones paramétricas y cotas con un modelo geométrico consistente.
4. Desarrollar selección real de caras/aristas/vértices y operaciones de sólido.
5. Validar cada herramienta en navegador móvil y escritorio, incluyendo guardar, deshacer y rehacer.

## Precauciones de integración
- No modificar el sistema de cámara/táctil ya aprobado salvo petición expresa.
- Mantener cursor, punto de inicio, snap y coordenadas bajo la misma transformación.
- Toda operación geométrica nueva debe actualizar escena, árbol/inspector, persistencia e historial.
- No habilitar un botón hasta que la operación esté implementada y probada en ejecución.


## Auditoría funcional del código (2026-11-24)
El inventario de clases DEX es una referencia de familias de herramientas, no una especificación ejecutable. La inspección de `studio-3d.html` muestra rutas de ejecución para Línea, Rectángulo por esquina y Círculo por centro; las demás herramientas de croquis y las operaciones de sólido continúan deshabilitadas o sin motor geométrico. Las restricciones visibles tienen lógica parcial y necesitan pruebas específicas. El estado detallado, los huecos de implementación y los criterios de aceptación están en `CAD_TOOL_AUDIT.md`. No habilitar herramientas pendientes solo quitando `disabled`.
