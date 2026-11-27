# Investigación de referencia Onshape para NOCTURNE STUDIO

**Fecha de consolidación:** 2026-11-27  
**Rama documental:** `research/onshape-reverse-engineering`  
**Repositorio:** `emhyrcoreblack-ctrl/nocturne-studio-app`

> Este documento conserva los hallazgos disponibles en las conversaciones y archivos de investigación. Distingue expresamente entre observaciones documentadas, indicios de análisis estático e hipótesis de implementación. No representa una copia del código ni de los recursos propietarios de Onshape.

## 1. Alcance y calidad de la evidencia

Hay dos grupos de fuentes:

1. **Análisis estático de un APK de referencia aportado por el usuario.** El inventario previo indica que el paquete contenía nueve archivos DEX, bibliotecas nativas y recursos. Los nombres de clases/cadenas detectados sirven para identificar familias funcionales, pero no prueban el algoritmo, los parámetros, las unidades ni el flujo de interacción.
2. **Documentación pública de ayuda de Onshape y observaciones funcionales registradas.** Se descargaron/consultaron páginas de ayuda de croquis, restricciones, cotas, campos numéricos e inferencias automáticas. Las notas de abajo son una síntesis de lo que se observó en esas páginas; no son una transcripción íntegra de los HTML.

No se dispone dentro de este repositorio de los APK, los nueve DEX, volcados completos, informes JADX/apktool, capturas o grabaciones originales. Tampoco se deben presentar como recuperados los HTML que permanecen en el dispositivo del usuario. Si se incorporan posteriormente, conservarlos como evidencia primaria junto con origen, fecha y hash.

### Niveles de confianza usados

- **Documentado:** comportamiento descrito en la ayuda pública de Onshape.
- **Indicio estático:** nombre de clase o cadena visto en el inventario del APK; no demuestra comportamiento.
- **Observación de implementación NOCTURNE:** comportamiento/código propio inspeccionado en este repositorio.
- **Pendiente:** no hay evidencia suficiente; requiere prueba directa o fuente primaria.

## 2. Inventario estático del APK: familias de herramientas

Los siguientes identificadores se registraron en la inspección estática anterior. Son indicios de familias, no especificaciones de funcionamiento.

| Familia | Identificadores registrados |
|---|---|
| Línea | `BTLineTool` |
| Rectángulo por esquina / centro | `BTRectangleTool`, `BTCenterRectangleTool` |
| Círculo por centro / perímetro | `BTCircleTool`, `BTPerimeterCircleTool` |
| Polígono regular / inscrito / circunscrito | `BTPolygonTool`, `BTInscribedPolygonTool`, `BTCircumscribedPolygonTool` |
| Elipse | `BTEllipseTool` |
| Arco / arco por centro / arco tangente | `BTArcTool`, `BTCenterpointArcTool`, `BTTangentArcTool` |
| Bézier / spline / punto spline | `BTBezierTool`, `BTSplineTool`, `BTSplinePointTool` |
| Punto / ranura | `BTPointTool`, `BTSlotTool` |
| Texto / cotas | `BTTextTool`, `BTDimensionTool` |
| Recortar / extender / dividir / desfase | `BTTrimTool`, `BTExtendTool`, `BTSplitEntityTool`, `BTOffsetTool` |
| Redondeo / chaflán de croquis | `BTFilletTool`, `BTChamferTool` |
| Patrón lineal / circular, simetría, transformar | `BTSketchLinearPatternTool`, `BTSketchCircularPatternTool`, `BTSketchMirrorTool`, `BTSketchTransformTool` |
| Usar geometría / intersección | `BTSketchUseTool`, `BTSketchIntersectTool` |
| Importar DXF/DWG / imagen | `BTSketchImportDXFDWGTool`, `BTSketchImportImageTool` |

### Referencias de selección y modelado 3D

Identificadores registrados: `BTEntityFace`, `BTEntityEdge`, `BTAllowedSelection`, `BTGLAllowedSelection`, `BTGLSketchEntity`, `BTAssemblyPattern`, `BTBSGeometricBoolean`, `BTDraftAnalysis`, `BTSweepDescription`.

Se relacionaron con entidades de cara/arista/vértice, selección permitida, entidades de croquis, patrones de ensamblaje, booleanas geométricas, análisis de desmoldeo y descripciones de barrido. En esa pasada no se identificaron nombres inequívocos para todas las operaciones habituales como Extrude, Revolve, Loft o Shell.

## 3. Cotas (Dimension) — comportamiento documentado

### Flujo de creación

- La herramienta de cota se inicia y luego se selecciona la geometría o las entidades relevantes.
- Se coloca la cota en la posición deseada; aparece un campo/cuadro de edición.
- Se introduce el valor y se confirma con Enter.
- El comportamiento predeterminado es una cota conductora (*driving*): modifica la geometría.
- Una cota de referencia (*driven/reference*) mide e informa el valor, pero no conduce cambios geométricos.
- Si una cota nueva sobredefine el croquis, Onshape puede convertirla automáticamente en una cota de referencia.
- Cambiar una cota de referencia a conductora puede modificar la geometría o producir sobre-restricción.
- En ciertos casos, al introducir una cota lineal, las entidades seleccionadas se trasladan aproximadamente por mitades para repartir el cambio; las restricciones existentes pueden impedir esa traslación. No aplicar esta regla ciegamente a radios/diámetros.

### Tipos y selección descritos

- **Distancia/longitud:** seleccionar una línea o dos puntos.
- **Distancia entre entidades:** seleccionar dos líneas/entidades compatibles.
- **Distancia diagonal/directa:** seleccionar dos puntos.
- **Diámetro:** seleccionar un círculo.
- **Radio:** seleccionar un arco.
- **Ángulo:** seleccionar dos líneas.
- **Longitud de arco:** seleccionar el arco y sus extremos según el flujo descrito.
- **Cota a plano:** seleccionar la entidad y el plano de referencia aplicable.
- **Centerline:** opción que cambia la interpretación de la línea para cotas aplicables.

Los tipos exactos disponibles dependen de la geometría seleccionada; no mostrar opciones inválidas para la selección actual.

### Variables y expresiones de cotas

- Durante el dibujo se puede usar una expresión/variable con sintaxis `=#d`.
- Después de crear la cota, se referencia con `#d`.
- Los nombres de variable deben resolverse en un ámbito de croquis/documento coherente.
- Los valores negativos se permiten para distancias, ángulos, longitudes de línea y spline según el campo/tipo.
- No se permiten negativos para radio, diámetro o arco en los casos descritos.

### Estados visuales documentados

- Cota conductora: texto/representación oscura (negra).
- Cota de referencia (*driven*): representación gris clara.
- Geometría sub-restringida: azul.
- Geometría completamente restringida: negra.
- Error/sobre-restricción: rojo.

Los colores son una referencia de estado, no deben ser el único medio de comunicarlo; incluir mensajes/indicadores accesibles.

## 4. Restricciones geométricas — catálogo documentado

Restricciones identificadas en la ayuda:

- Coincident (coincidente)
- Concentric (concéntrica)
- Parallel (paralela)
- Tangent (tangente)
- Horizontal
- Vertical
- Perpendicular
- Equal (igual)
- Midpoint (punto medio)
- Normal
- Pierce
- Symmetric (simétrica)
- Fix (fijar)
- Curvature (curvatura)
- Flow

También se describen inferencias/restricciones automáticas como Quadrant, Use e Intersection.

### Inferencias durante el dibujo

Se observaron referencias de inferencia para:

- horizontal/vertical;
- punto medio;
- paralelo;
- coincidente.

La interfaz puede mostrar resaltado de entidades y líneas auxiliares punteadas para indicar la inferencia antes de confirmar. La inferencia debe poder distinguirse de una restricción persistida.

### Selección y conflictos

- Cuando hay puntos superpuestos, priorizar el punto que todavía no esté completamente restringido.
- Las restricciones pueden impedir que una entidad se traslade al aplicar una cota.
- La detección de sobre-restricción debe identificar qué conjunto de restricciones entra en conflicto; no basta con rechazar cualquier cota que no cambie el dibujo.
- No confundir geometría fijada con geometría simplemente seleccionada.

### Administrador de restricciones

La ayuda describe un administrador/listado que permite filtrar por:

- tipo;
- modo;
- estado (incluyendo Driven/Solved/Errors).

La lista permite identificar entidades/restricciones, seleccionarlas, hacer zoom y eliminarlas. Para NOCTURNE esto es un requisito funcional de referencia, no evidencia de que ya esté implementado.

## 5. Campos numéricos y calculadora

Las páginas de campos numéricos describen entrada de enteros, decimales, coma decimal, expresiones y funciones trigonométricas.

### Unidades

Longitud: `mm`, `cm`, `m`, `in`, `ft`, `yd`.

Ángulo: `deg`, `rad`.

No mezclar magnitudes dimensionalmente incompatibles en una suma/resta. Las conversiones deben normalizarse internamente y mostrarse con unidades explícitas.

### Operadores, constantes y funciones descritas

- Operadores: `+`, `-`, `*`, `/`, `^`.
- Constantes: `pi`, `PI`, `Pi`.
- Funciones: `ceil`, `floor`, `round`, `exp`, `sqrt`, `abs`, `max`, `min`, `log`, `log10`, trigonométricas.
- Ejemplos de funciones trigonométricas: seno, coseno y tangente; la ayuda también contempla expresiones con grados/radianes.
- Variables de cota: `#nombre`.

El parser propio de NOCTURNE debe ser seguro (sin `eval` ni ejecución dinámica), validar finitud, división por cero, sintaxis y compatibilidad dimensional. La sintaxis exacta de cada función debe probarse con casos automatizados.

## 6. Referencias de ayuda pública consultadas

Páginas descargadas/consultadas por el usuario en el directorio local `~/onshape-investigacion/cota`:

- `dimension.html` — cotas.
- `constraints.html` — restricciones.
- `sketch-basics.html` — fundamentos de croquis.
- `sketch-tools.html` — herramientas de croquis.
- `numeric-fields.html` — campos numéricos.
- `automatic-inferencing.html` — inferencias automáticas.
- `troubleshooting.html` — resolución de problemas.

URLs públicas registradas:
- https://cad.onshape.com/help/Content/Home/numeric_fields.htm
- https://cad.onshape.com/help/Content/Sketch/automatic_inferencing.htm

No se incorporan aquí los HTML binarios/originales porque no están disponibles en el árbol Git inspeccionado en esta consolidación. Las otras páginas se identifican por sus nombres locales; si se suben al repositorio, registrar también su URL exacta, fecha de descarga y hash.

## 7. Estado y límites de NOCTURNE conocidos durante la investigación

Las auditorías históricas de 2026-11-24 registraron rutas funcionales para línea continua, rectángulo por esquina, círculo por centro, selección, undo/redo serializado, cámara y plano de trabajo. Algunas restricciones tenían lógica parcial (horizontal, vertical, paralela, perpendicular, coincidente y fijar/desbloquear), aún no certificada.

La auditoría histórica registró como pendientes varias herramientas de croquis y operaciones de sólido. Es una fotografía de aquel momento; no usarla como estado actual sin inspeccionar la rama de desarrollo vigente.

### Implementación propia relacionada con cotas (no atribuir a Onshape)

- `dimension-expression.mjs`: parser de expresiones propio, sin `eval`, con aritmética, potencias, unidades, trigonometría, funciones matemáticas, pi y variables `#name`. Normaliza longitudes a centímetros y ángulos a grados en el estado inspeccionado.
- `parametric-sketch.mjs`: modelo geométrico 2D en coordenadas locales `(u,v)`, con puntos, líneas, círculos, arcos y restricciones. Incluye solver de mínimos cuadrados amortiguados (*damped least squares*).
- Tipos de restricción que aparecen en el módulo propio: coincidente, horizontal, vertical, paralela, perpendicular, igual, concéntrica, punto medio, fija, distancia, radio, diámetro, distancia horizontal/vertical, ángulo, punto sobre línea y tangencia línea-círculo.
- Estos son detalles de la implementación propia de NOCTURNE, no afirmaciones sobre el algoritmo interno de Onshape.
- La conexión completa de la herramienta visual Cota con la selección táctil, el solver, persistencia y edición debe validarse en la rama de trabajo; no asumir que está resuelta por la existencia de los módulos.

## 8. Traducción de requisitos para NOCTURNE

1. Cota debe ser una herramienta real integrada en la interfaz CAD Android vigente, no un botón decorativo ni una paleta paralela inventada.
2. La selección debe depender del tipo de cota: punto, segmento, círculo, arco o pareja de entidades compatibles.
3. Separar cotas conductoras y de referencia; una cota de referencia no modifica geometría.
4. Resolver restricciones de manera consistente y mantener persistencia, undo/redo y edición.
5. Mostrar estados sub-restringido, completamente restringido y conflicto con texto/indicadores además del color.
6. Añadir calculadora/expresiones con unidades, variables y validación dimensional segura.
7. Detectar sobre-restricción y explicar el conflicto; no ocultarlo con un cambio de estado.
8. Mantener cursor, snaps, inferencias y coordenadas táctiles en el mismo sistema de transformación.
9. No habilitar herramientas pendientes por quitar `disabled`; implementar y probar cada flujo completo.
10. Validar en Android: activación, selección, colocación, edición, confirmación, cancelación, zoom/pan, multitáctil, guardar/recargar y undo/redo.

## 9. Orden de trabajo recomendado

1. Cotas lineales y distancia entre puntos/segmentos.
2. Radio y diámetro para círculos/arcos.
3. Calculadora numérica y variables.
4. Restricciones geométricas y estado del solver.
5. Administrador de restricciones y cotas de referencia.
6. Inferencias y selección contextual.
7. Equidistancia dependiente de cotas y resto de edición de perfiles.
8. Herramientas de croquis restantes y, más adelante, núcleo B-rep/operaciones 3D reales.

## 10. Integridad, derechos y pendientes

- No copiar ni reutilizar código, recursos gráficos, marca ni activos propietarios de Onshape.
- No inferir algoritmos internos a partir de nombres de clases.
- Marcar cada hallazgo futuro con fuente, método, fecha, nivel de confianza y evidencia reproducible.
- Pendiente de recuperar desde el dispositivo: HTML originales completos de ayuda; APK/DEX y hashes; informes estáticos; capturas/trazas de ejecución; notas de pruebas funcionales por herramienta.
- Cuando se añadan fuentes primarias, mantenerlas sin alteración y acompañarlas de un índice/resumen separado.

## 11. Documentos relacionados

- `REA_ONSHAPE.md` — inventario estático previo de clases/herramientas.
- `CAD_TOOL_AUDIT.md` — auditoría funcional histórica de NOCTURNE.
- `CLAUDE_ONSHAPE_HANDOFF.md` — paquete de transferencia y límites de evidencia.
- `parametric-sketch.mjs`, `dimension-expression.mjs` — implementación propia relacionada con restricciones y expresiones; no son fuentes de Onshape.
