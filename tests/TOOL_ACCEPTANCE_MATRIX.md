# Matriz de aceptación funcional — NOCTURNE STUDIO

**Rama de validación:** `fix/touch-aim-cursor`  
**Estado global:** NO APROBADO — pruebas manuales y de integración pendientes.

## Regla de aprobación

Una herramienta solo puede pasar a **APROBADA** cuando:
1. Sus pruebas automatizadas aplicables pasan en CI.
2. Todos sus escenarios manuales obligatorios se ejecutan y documentan.
3. Se verifica en navegador de escritorio y en Android táctil; cuando exista lápiz/stylus disponible, también se prueba.
4. No quedan defectos bloqueantes ni regresiones abiertas.
5. Se registra commit probado, navegador/dispositivo, resultado y evidencia reproducible.

No se considera evidencia suficiente que el botón aparezca, que la herramienta no lance una excepción o que compile.

## Criterios comunes

- Exactitud geométrica y dimensional.
- Snap e inferencias correctas.
- Respeto al plano de trabajo activo.
- Aislamiento de selección y edición.
- Deshacer/rehacer fiel.
- Guardado y reapertura sin pérdida.
- Interacción coherente con ratón, dedo y lápiz táctil.
- Sin errores de consola, estados de puntero bloqueados ni latencia anormal.
- Sin regresiones en otras herramientas.

## Inventario y pruebas

| Herramienta | Escenarios mínimos |
|---|---|
| Seleccionar | Selección/deselección, mover, eliminar solo el objeto elegido, ratón/táctil/stylus |
| Línea | Horizontal, vertical, diagonal, longitud/ángulo, snap, ratón/táctil/stylus |
| Rectángulo | Cuatro sentidos de arrastre, cierre, dimensiones, cuatro restricciones, undo |
| Círculo | Centro/radio, distintos tamaños, selección, guardado, intersecciones |
| Polígono | Número de lados, cierre, vértices, selección, guardado, recorte |
| Elipse | Centro, ejes, orientación, extremos, selección, guardado, recorte |
| Arco | Tres puntos, extremos, sentido, curvatura, casos límite, táctil |
| Recortar | Líneas abiertas/cruzadas, vértices, perfiles cerrados, conservación del complemento, undo/redo, táctil |
| Extender | Ambos extremos, dirección, múltiples/sin intersecciones, plano activo, undo/redo, táctil |

## Estado inicial

Todas las herramientas están en **NO VERIFICADO**. La suite geométrica existente cubre funciones auxiliares de intersección y selección de límites de Trim, pero no sustituye pruebas integrales de la aplicación. La operación Extender requiere una auditoría y cobertura propias.

## Registro de ejecución

Añadir una fila por ejecución real:

| Fecha | Commit | Herramienta | Entorno | Resultado | Evidencia / incidencia |
|---|---|---|---|---|---|
| Pendiente | — | — | — | — | — |

## Fuera del inventario activo

El botón **Punto** está deshabilitado en la interfaz y marcado como «próximamente». No se considera una herramienta disponible ni aprobada.
