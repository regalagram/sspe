# Plugin SubPath Transform

Este plugin permite transformar subpaths seleccionados con tres tipos de transformaciones: escalado, rotación y traslación.

## Características

### 1. Escalado (Scale)
- **Función**: Agranda o achica un subpath
- **Opciones**:
  - Escalado uniforme (X e Y iguales) o independiente
  - Rango: 0.1x a 10x
  - Paso recomendado: 0.1
- **Centro**: Si no se especifica, usa el centro geométrico del subpath

### 2. Rotación (Rotate)
- **Función**: Gira un subpath alrededor de su centro
- **Opciones**:
  - Ángulo en grados
  - Botones rápidos para 0°, 90°, 180°, 270°
  - Paso recomendado: 15°
- **Centro**: Si no se especifica, usa el centro geométrico del subpath

### 3. Traslación (Translate)
- **Función**: Mueve un subpath en las coordenadas X e Y
- **Opciones**:
  - Desplazamiento independiente en X e Y
  - Botones rápidos para movimientos de 10 unidades
  - Direcciones: ←, ↑, →, ↓

## Interfaz de Usuario

El plugin se presenta como un panel draggable llamado "SubPath Transform" que incluye:

1. **Indicador de selección**: Muestra si hay subpaths seleccionados
2. **Sección Scale**: Controles de escalado con checkbox para escalado uniforme
3. **Sección Rotate**: Control de rotación con botones de ángulos predefinidos
4. **Sección Translate**: Controles de traslación con botones direccionales
5. **Botón Reset**: Restaura todos los valores a sus defaults
6. **Contador de selección**: Muestra cuántos subpaths están seleccionados

## Atajos de Teclado

- `Ctrl+Shift+S`: Enfoca el campo de escala
- `Ctrl+Shift+R`: Enfoca el campo de rotación  
- `Ctrl+Shift+T`: Enfoca el campo de traslación X

## Uso

1. **Seleccionar subpaths**: Usa las herramientas de selección para elegir uno o más subpaths
2. **Configurar transformación**: Ajusta los valores en el panel de SubPath Transform
3. **Aplicar**: Presiona el botón correspondiente (Apply Scale, Apply Rotation, Apply Translation)
4. **Reset**: Usa "Reset Values" para volver a los valores por defecto

## Comportamiento

- **Múltiple selección**: Todas las transformaciones se aplican a todos los subpaths seleccionados
- **Centro automático**: Si no se especifica un centro, se calcula automáticamente como el centro geométrico del subpath
- **Persistencia**: Los valores ingresados persisten hasta que se reseteen manualmente
- **Escalado uniforme**: Cuando está activado, cambiar Scale X también cambia Scale Y automáticamente

## Implementación Técnica

### Arquitectura
- Sigue los lineamientos de plugins modulares
- Usa `DraggablePanel` para la interfaz
- Acciones puras en el store para las transformaciones
- Funciones utilitarias separadas para los cálculos matemáticos

### Funciones del Store
- `scaleSubPath(subPathId, scaleX, scaleY, center?)`: Escala un subpath
- `rotateSubPath(subPathId, angle, center?)`: Rota un subpath  
- `translateSubPath(subPathId, delta)`: Traslada un subpath

### Utilidades
- `scaleSubPath()`: Aplica escalado a todos los comandos del subpath
- `rotateSubPath()`: Aplica rotación a todos los comandos del subpath
- `translateSubPath()`: Aplica traslación a todos los comandos del subpath
- `getSubPathCenter()`: Calcula el centro geométrico de un subpath

## Casos de Uso

1. **Redimensionar elementos**: Usar Scale para hacer elementos más grandes o pequeños
2. **Orientar elementos**: Usar Rotate para cambiar la orientación de formas
3. **Posicionar elementos**: Usar Translate para mover elementos a nuevas ubicaciones
4. **Transformaciones complejas**: Combinar múltiples transformaciones para efectos avanzados

## Limitaciones

- Las transformaciones son inmediatas (no hay preview en tiempo real)
- No incluye transformaciones de sesgo (skew)
- El centro de rotación/escalado se calcula automáticamente (no es interactivo)
- No hay deshacer específico del plugin (usar Ctrl+Z global)

## Futuras Mejoras

- Preview en tiempo real de las transformaciones
- Centro de transformación interactivo
- Transformaciones de sesgo (skew)
- Presets de transformaciones comunes
- Historial de transformaciones aplicadas
