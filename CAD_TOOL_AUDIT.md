# Auditoría funcional de NOCTURNE STUDIO

Fecha: 2026-11-24
Rama auditada: main

## Resultado de la inspección del código

La interfaz contiene un catálogo más amplio que el motor geométrico implementado. No se deben habilitar controles por quitarles el atributo disabled: cada herramienta necesita creación/edición geométrica, previsualización, persistencia, selección e historial.

### Operaciones de croquis que sí tienen ruta de ejecución
- Línea continua: `line`, con segmentos, inferencias y snaps.
- Rectángulo por esquina: `rect`.
- Círculo por centro: `circle`.
- Selección de objetos existentes.
- Deshacer/rehacer de estados serializados.
- Vistas de cámara y selección de plano de trabajo.
- Restricciones: horizontal, vertical, paralela, perpendicular, coincidente y fijar/desbloquear; requieren pruebas geométricas específicas antes de considerarlas certificadas.

### Herramientas visibles pero no implementadas
Rectángulo por centro, círculo por tres puntos, elipse, polígonos inscrito/circunscrito, texto, usar geometría, intersección, redondeo/chaflán de croquis, importación DXF/DWG e imagen, cotas, arcos, spline, punto, recortar, extender, partir, equidistancia, ranura, patrones, simetría y transformar.

### Operaciones de sólido todavía pendientes
Extruir, revolución, barrido, loft, redondeo y chaflán 3D. La interfaz las presenta deshabilitadas y el motor actual no contiene una representación B-rep ni operaciones booleanas de sólidos.

## Referencia de ingeniería inversa

`REA_ONSHAPE.md` registra nombres de clases encontrados en los DEX de la APK aportada. Eso confirma familias de herramientas (por ejemplo `BTLineTool`, `BTRectangleTool`, `BTCircleTool`, `BTTrimTool`, `BTSketchMirrorTool`), pero no revela por sí solo sus algoritmos, parámetros ni reglas de interacción. No se extraerá ni reutilizará código propietario.

## Orden de desarrollo y aceptación

1. Completar herramientas 2D básicas y multi-paso: rectángulo por centro, círculo por perímetro/tres puntos, elipse, polígonos, punto y arcos.
2. Edición de perfiles: recortar, extender, partir, desfase, ranura, redondeo y chaflán.
3. Restricciones y cotas paramétricas con resolución estable y persistencia.
4. Usar/intersecar geometría, texto e importación.
5. Patrones, simetría y transformación.
6. Núcleo de sólidos y operaciones 3D; no fingir extrusión/booleanas con trazos de pantalla.

Cada herramienta se habilitará únicamente después de superar pruebas en móvil y escritorio: creación, cancelación, previsualización, selección, guardado/recarga, deshacer/rehacer y tolerancia a gestos multitáctiles.
