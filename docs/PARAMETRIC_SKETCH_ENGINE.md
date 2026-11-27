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
