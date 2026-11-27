# NOCTURNE STUDIO — especificación del motor de croquis paramétrico

## Objetivo y referencia de comportamiento

La experiencia de croquis toma como referencia funcional los flujos documentados de Onshape: geometría creada sobre un plano, entidades paramétricas editables, inferencias automáticas, restricciones explícitas, cotas, edición por arrastre y estado de definición del croquis. Esta especificación describe una implementación propia; no copia código ni componentes internos propietarios.

Referencias funcionales:
- Onshape, Sketch Basics: https://cad.onshape.com/help/Content/Sketch/sketch_basics.htm
- Onshape, Sketch Tools: https://cad.onshape.com/help/Content/Sketch/sketch_tools.htm
- Onshape, Working with Constraints: https://cad.onshape.com/help/Content/Sketch/working_with_constraints.htm

## Principios no negociables

1. **Geometría paramétrica, no solo trazos.** Cada entidad conserva tipo, parámetros, puntos de control, plano, croquis propietario, restricciones y cotas. La malla u objeto Three.js es una representación derivada, nunca la fuente de verdad.
2. **Coordenadas locales del plano.** Toda construcción y solución se calcula en coordenadas 2D (u,v) del plano activo. Solo al renderizar se transforma a XYZ con la base ortonormal del plano. No proyectar todo al plano XY ni inferir el eje por la cámara.
3. **Restricciones persistentes.** Coincidente, horizontal, vertical, paralela, perpendicular, tangente, concéntrica, igual, punto medio, simétrica, fija y las demás visibles deben almacenarse como relaciones entre IDs de entidades/puntos, no aplicarse como deformaciones de una sola vez.
4. **Inferencias al dibujar.** Detectar puntos finales, centros, puntos medios, cuadrantes, intersecciones, horizontal/vertical, tangencia y alineaciones dentro de tolerancias en unidades de pantalla convertidas a unidades del modelo. Mostrar previsualización y añadir la restricción inferida al confirmar.
5. **Solver determinista.** Toda edición, cota o restricción actualiza el sistema paramétrico y resuelve antes de confirmar. No aceptar silenciosamente geometría imposible ni restricciones contradictorias.
6. **Historial transaccional.** Cada operación confirmada debe ser una transacción única para Undo/Redo y guardado. Los previews y movimientos intermedios no deben llenar el historial.
7. **Misma semántica en ratón, touch y stylus.** El objetivo geométrico se calcula desde el punto CAD compensado, con tolerancia en píxeles independiente de la escala del modelo.

## Modelo matemático

### Variables

El croquis se representa mediante un vector de parámetros libres:
- Línea: coordenadas de dos extremos.
- Círculo: centro (u,v) y radio.
- Arco: centro, radio, ángulo inicial y final, con sentido.
- Elipse: centro, semiejes y rotación.
- Polilínea/polígono: vértices ordenados.
- Spline: grado, puntos de control y nodos; conservar representación NURBS cuando se implemente, no sustituirla por una polilínea como geometría maestra.
- Bézier: puntos de control.
- Entidades derivadas: referencia a entidad fuente y parámetros de operación.

### Restricciones como residuos

Cada restricción aporta una o más ecuaciones f_i(x)=0. El sistema resuelve min 1/2 Σ w_i f_i(x)^2, respetando cotas y restricciones duras. Ejemplos:

- Coincidente A,B: A.u-B.u=0, A.v-B.v=0.
- Horizontal A,B: A.v-B.v=0.
- Vertical A,B: A.u-B.u=0.
- Paralela d1,d2: cross(d1,d2)=0.
- Perpendicular d1,d2: dot(d1,d2)=0.
- Igual longitud: |d1|²-|d2|²=0.
- Concéntrica: C1.u-C2.u=0, C1.v-C2.v=0.
- Punto medio P de AB: P-(A+B)/2=0 en u y v.
- Tangencia línea-círculo: distancia firmada del centro a la recta igual al radio, más condición de contacto válida en el segmento/arco.
- Tangencia curva-curva: coincidencia del punto de contacto y paralelismo de tangentes.
- Simetría respecto a eje: los puntos correspondientes comparten proyección sobre el eje y tienen distancias firmadas opuestas.
- Fija: conservar coordenadas iniciales del elemento/punto.

Implementar primero Jacobiano analítico donde sea sencillo; diferencias finitas centrales como respaldo. Solver iterativo amortiguado (Gauss-Newton/Levenberg-Marquardt), escalado de variables/residuos, límites de iteración y criterio de convergencia. Debe detectar jacobiano singular, redundancia y conflicto; nunca marcar totalmente restringido solo por no poder mover el objeto.

### Grados de libertad y estado

Calcular rango del Jacobiano respecto a variables independientes:
- Infrarrestringido: quedan grados de libertad.
- Totalmente restringido: cero grados de libertad efectivos.
- Conflicto/sobrerrestricción: residuos incompatibles o sistema inconsistente.
- Redundante: una restricción no añade rango, aunque no genere conflicto.

La UI puede usar colores inspirados en Onshape (azul, negro, rojo), pero el estado debe venir del solver, no de heurísticas visuales.

## Comportamiento de herramientas

### Creación
- Línea: dos puntos; cadena continua opcional; inferencias y restricciones automáticas.
- Rectángulo por esquinas: dos esquinas opuestas; cuatro segmentos con coincidencia y horizontal/vertical automáticas.
- Rectángulo por centro: centro y esquina; simétrico respecto al centro; cuatro lados coincidentes y ortogonales.
- Círculo centro-radio: centro y punto/radio.
- Círculo por 3 puntos: tres puntos no colineales; circuncentro mediante determinante; cancelar si el determinante cae bajo tolerancia.
- Círculo por perímetro/diámetro: dos extremos del diámetro; centro en el punto medio.
- Polígono inscrito/circunscrito: centro, radio y número de lados; radio circunscrito o apotema según modo.
- Elipse: centro, eje mayor y semieje menor; conservar orientación.
- Arcos: definir con los puntos exigidos por el método (3 puntos, centro-inicio-fin, tangente); normalizar sentido y evitar saltos angulares.
- Spline: curva interpolante o NURBS con puntos de control explícitos; tangentes editables.
- Bézier: curva de grado según número de puntos de control; mantener controles.
- Punto: entidad puntual seleccionable y restringible.
- Ranura: dos centros/extremos y radio; dos líneas paralelas más dos semicírculos tangentes, topología cerrada.
- Texto: geometría vectorial de texto editable como entidad paramétrica; fuente/contorno separados del render.
- Usar/Intersección: referencias proyectadas/derivadas de geometría existente, con dependencia rastreable; no duplicar como trazo sin vínculo.

### Edición
- Recortar/Extender/Partir: calcular intersecciones exactas de curvas; dividir o ajustar dominios paramétricos, preservar referencias y restricciones válidas. No operar por proximidad visual únicamente.
- Equidistancia: offset firmado de curvas; resolver uniones (miter/round/bevel según selección), detectar auto-intersecciones y ramas degeneradas.
- Redondeo/Chaflán: construir transiciones geométricas tangentes o biseladas y recortar entidades adyacentes con continuidad y tolerancia.
- Transformar: traslación, rotación y escala respecto a pivote; mantener o transformar relaciones de forma explícita.
- Simetría: reflejar respecto a eje y crear relaciones simétricas paramétricas, no copias independientes.
- Patrón lineal/circular: instancias derivadas vinculadas a origen, cantidad y parámetros; editar el patrón actualiza todas las instancias.

### Cotas y restricciones
- Cota lineal, horizontal, vertical, radio, diámetro, ángulo y distancia punto-línea. Una cota es un parámetro del solver y debe poder editarse.
- Restricciones visibles se aplican a selecciones compatibles, muestran previsualización, validan cardinalidad y reportan por qué no se pueden aplicar.
- No simular restricciones con movimientos directos ni aceptar selecciones inválidas.

## Tolerancias y robustez

- Mantener tolerancias geométricas en unidades del modelo y tolerancias de selección en píxeles por separado.
- Convertir tolerancia de pantalla a unidades del plano con la escala actual de cámara.
- Usar predicados robustos para colinealidad, intersección, orientación y tangencia; evitar comparaciones exactas de floats.
- Tratar degeneraciones: radio cero, segmentos nulos, tres puntos colineales, spline con puntos repetidos, offsets que colapsan, arcos con barrido cero o múltiplos ambiguos de 2π.
- Toda función geométrica debe ser pura, testeable y no mutar entradas.

## Persistencia y compatibilidad

- Persistir parámetros maestros, IDs estables, restricciones, cotas, dependencias, plano y versión del esquema.
- Renderizar objetos desde el modelo paramétrico al cargar; no depender de la malla serializada.
- Mantener compatibilidad de lectura de croquis antiguos mediante migraciones versionadas.
- Guardar cambios confirmados, visibilidad, selección necesaria y estado del croquis sin perder entidades.
- Undo/Redo revierte una operación completa y sus dependencias.

## Secuencia de implementación y aceptación

1. Núcleo paramétrico + sistema de coordenadas + tipos geométricos + tolerancias.
2. Restricciones básicas + solver + análisis de grados de libertad + cotas.
3. Herramientas de creación y detección de inferencias.
4. Edición exacta (trim/extend/split/offset/fillet/chamfer).
5. Transformaciones, simetrías y patrones paramétricos.
6. Referencias, intersecciones, texto e importación DXF/DWG/imagen.
7. Persistencia, migraciones, Undo/Redo y pruebas de regresión.
8. Matriz de aceptación escritorio, Android táctil y stylus.

Una herramienta solo se considera habilitada cuando tiene: interacción completa, matemática validada, entidad paramétrica persistente, cancelación/confirmación, Undo/Redo, guardado/recarga y pruebas. La validación del módulo por sí sola no acredita interacción real en navegador.


## Estado del prototipo implementado

El módulo inicial `parametric-sketch.mjs` ya contiene entidades de punto, línea, círculo y arco; serialización versionada; y un solver amortiguado con Jacobiano numérico central y análisis de rango. El conjunto actual de restricciones cubre coincidente, horizontal, vertical, paralela, perpendicular, igual, concéntrica, punto medio, fija, distancia, radio, diámetro, distancias horizontal/vertical, ángulo, punto sobre línea y tangencia línea-círculo mediante distancia firmada.

La integración de `index.html` genera y guarda modelos paramétricos para geometría nueva de línea/polilínea, rectángulo, círculo y arco. El solver ya se usa al aplicar restricciones a polilíneas y rectángulos, y sincroniza sus coordenadas resueltas de vuelta a la geometría Three.js. Los estados de solver se conservan en los metadatos del croquis. La paleta de restricciones ya expone también la relación de igual longitud entre los dos primeros segmentos de una polilínea o rectángulo; en rectángulos, igualar los dos lados adyacentes convierte paramétricamente el perfil en un cuadrado. La relación se persiste y se resuelve junto con las relaciones paralela y perpendicular.

La integración actual ya permite aplicar cotas de radio y diámetro a círculos y arcos seleccionados desde los controles R y Ø. Las cotas se guardan en `meta.dimensions`, se traducen a restricciones del solver con IDs estables y, tras resolver, reconstruyen la curva Three.js conservando el plano local y los parámetros del arco. Los controles solo se habilitan para círculos/arcos no fijados; los valores se validan como positivos y se guardan con el historial del croquis. La interfaz de entrada numérica usa por ahora el diálogo nativo del navegador.

La selección múltiple del lienzo está diseñada para Android táctil: un toque sobre una geometría la añade a la selección sin perder las anteriores; un segundo toque sobre una geometría ya seleccionada la quita; tocar el espacio vacío limpia la selección. Un gesto multitáctil de cámara (dos dedos) cancela la selección pendiente para no convertir zoom/rotación en una selección accidental. La lista de entidades refleja todas las geometrías seleccionadas. No requiere Ctrl, Shift, teclado ni ratón. La relación **Concéntrico** está disponible al seleccionar exactamente dos círculos del mismo plano: el solver alinea sus centros, conserva sus radios y persiste el modelo combinado y la relación en ambos croquis. Se rechazan selecciones de tipos incompatibles, planos distintos, círculos fijados y relaciones duplicadas.

**Limitaciones actuales:** la relación concéntrica de la interfaz está limitada a círculos (el núcleo matemático aún tipa esa relación para círculos, no arcos). La tangencia línea-círculo aún no valida contacto dentro del dominio finito del segmento; faltan cotas lineales/angulares editables y una UI visual completa de restricciones/estados. La reconstrucción paramétrica no es todavía universal para todos los tipos geométricos. La validación automatizada actual no sustituye pruebas E2E en escritorio, Android y stylus.

## Herramientas táctiles de curva y perfil (iteración actual)

La paleta de Croquis incorpora dos construcciones de tres puntos adicionales:

- **Ranura:** el primer y segundo toque fijan los centros de los extremos; el tercero define la distancia perpendicular al eje y, por tanto, el radio de los extremos. La geometría se genera con `createSlotPath`, que construye dos semicircunferencias unidas por dos segmentos paralelos. Se rechazan ejes degenerados y anchos nulos. El contorno se guarda como perfil cerrado, con los centros y el radio en metadatos.
- **Bézier cuadrática:** tres toques fijan inicio, punto de control y final. `sampleBezier` evalúa la curva cuadrática (B(t)=(1-t)^2P_0+2(1-t)tP_1+t^2P_2), con muestreo uniforme y extremos exactos. El punto de control dirige la curvatura, pero no tiene por qué pertenecer a la curva.

Ambas herramientas comparten el flujo táctil de tres pasos con previsualización, cancelación al cambiar de herramienta, persistencia de puntos parciales, guardado de geometría final e historial. La geometría se crea en las coordenadas locales del plano activo; no depende de teclado ni de selección con modificadores.

**Estado de aceptación:** las comprobaciones automáticas verifican integración de paleta, activación, generación, previsualización y persistencia. La matriz mantiene ambas herramientas como `not_verified` hasta registrar pruebas de interacción reales en navegador Android y con stylus. No se declaran certificadas por pasar CI.

## Edición táctil: Partir

La herramienta **Partir** opera sobre una geometría abierta seleccionada en el plano activo. En Android usa dos toques deliberados: el primero selecciona la entidad y el segundo indica el punto interior del tramo que se va a dividir. La detección se realiza en espacio de pantalla con una tolerancia táctil de 18 px; se rechazan puntos demasiado próximos a los extremos para evitar fragmentos degenerados.

La posición de división se calcula con el parámetro (t) del segmento más próximo y se delega en `splitPolylineAt`. Se generan dos entidades independientes que comparten el mismo punto 3D de división, conservan el color original y la pertenencia al croquis. La operación sustituye la entidad original como una única transacción de historial, por lo que puede deshacerse y rehacerse; el proyecto se guarda después de la sustitución.

**Alcance actual:** solo geometrías abiertas. Los perfiles cerrados se rechazan sin modificarlos. Las curvas representadas por polilíneas muestreadas se dividen sobre su aproximación poligonal actual; no se reconstruye todavía una curva analítica exacta ni se transfieren todas sus restricciones paramétricas. La matriz de aceptación mantiene Partir como `not_verified` hasta las pruebas E2E en Android y stylus.

## Edición táctil: Equidistancia

La herramienta **Equidistancia** crea una copia desplazada de la geometría que el usuario toca en el plano activo. Acepta polilíneas abiertas y perfiles cerrados; el desplazamiento firmado permite elegir el lado. La distancia se introduce en centímetros y se convierte en un desplazamiento local del plano mediante `offsetPolyline`. El perfil original no se modifica.

Antes de añadir la copia se comprueba coplanaridad, número de vértices, longitud mínima de los tramos y cruces interiores del contorno resultante. En perfiles cerrados se elimina un vértice final duplicado antes de calcular el offset. La nueva entidad conserva el grupo de croquis y registra la distancia, el origen y el tipo de la entidad fuente; la creación se guarda como una sola operación de historial.

**Alcance actual:** el offset de curvas se calcula sobre la polilínea muestreada visible, no como offset analítico exacto. La herramienta no resuelve automáticamente colisiones locales complejas ni reconstruye restricciones paramétricas de la fuente. Su aceptación permanece como `not_verified` hasta pruebas E2E Android/stylus.



## Edición de esquinas: Redondeo y Chaflán

Las funciones filletPolylineVertex y chamferPolylineVertex trabajan en coordenadas 2D del plano del croquis y no mutan la fuente. Redondeo calcula la distancia de tangencia d = r / tan(θ/2), el centro sobre la bisectriz y un arco circular muestreado con radio constante. Chaflán calcula dos puntos sobre los segmentos adyacentes a una distancia igual. Ambas admiten vértices de perfiles cerrados y vértices interiores de polilíneas abiertas; rechazan extremos abiertos, segmentos degenerados, esquinas rectas o invertidas y medidas que excedan los tramos.

La integración táctil requiere tocar la geometría y acercarse al vértice objetivo; después solicita radio o distancia en centímetros. La operación sustituye la entidad por una nueva polilínea, conserva plano, grupo de croquis y color, y se registra en historial y persistencia. El redondeo de curvas y perfiles usa la polilínea muestreada disponible: no equivale todavía a un kernel B-rep ni reconstruye restricciones paramétricas analíticas. La matriz mantiene ambas herramientas como not_verified hasta E2E Android/stylus.


## Simetría y patrones de croquis

La paleta integra tres transformaciones no destructivas: Simetría solicita una geometría y dos puntos de eje; Patrón lineal solicita geometría, dirección, separación y número total de instancias; Patrón circular solicita geometría, centro y número total de instancias. Las copias se generan en el plano activo mediante mirrorPolyline, linearPattern y circularPattern, conservan el croquis de origen y el original permanece intacto. El número total de instancias incluye la original y se limita a 100 para mantener controlado el rendimiento móvil. Cada operación se guarda como una transacción de historial. La aceptación continúa not_verified hasta pruebas E2E Android/stylus.
