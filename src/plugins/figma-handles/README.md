# Sistema de Puntos de Control tipo Figma

Este sistema implementa el comportamiento de manejo de puntos de control tipo Figma, donde los handles de las curvas Bézier pueden estar acoplados o ser independientes.

## Características Principales

### Reemplazo del Sistema Básico

- **Reemplaza el control points renderer básico**: Cuando este plugin está activo, desactiva automáticamente el renderizador básico de control points del visual-debug
- **Funcionalidad mejorada**: Proporciona funcionalidad tipo Figma en lugar de los control points básicos
- **Compatibilidad**: Mantiene la misma interfaz de usuario y shortcuts

### Tipos de Puntos de Control

1. **Mirrored (Simétrico)** 🟢
   - Los handles tienen la misma longitud
   - Se mueven en direcciones exactamente opuestas
   - Mantienen perfecta simetría para curvas suaves

2. **Aligned (Alineado)** 🔵
   - Los handles están alineados en direcciones opuestas
   - Pueden tener diferentes longitudes
   - Mantienen continuidad de tangente pero no de curvatura

3. **Independent (Independiente)** 🟡
   - Los handles se mueven completamente independientes
   - Permite crear esquinas y transiciones abruptas
   - Control total sobre la forma de la curva

### Interacción con Tecla Option

- **Sin Option**: Los handles se mueven acoplados según su tipo
- **Con Option (⌥)**: Los handles se separan temporalmente y se mueven independientemente
- **Cambio visual**: Cuando Option está presionado, todos los handles se vuelven amarillos

### Indicadores Visuales

- **Color de handles**: Indica el tipo de acoplamiento
- **Durante el drag**: Solo se muestran el handle arrastrado y su pareja (si existe)
- **Resto oculto**: Todos los demás handles se ocultan durante el drag para mayor claridad
- **Anchor point**: Pequeño círculo indicador cuando un comando está seleccionado

## Uso

### Interacción Básica

1. **Seleccionar un punto de curva Bézier**
2. **Observar el tipo de punto** en el panel "Puntos de Control (Figma)"
3. **Arrastrar handles** para modificar la curva
4. **Mantener Option** para separar handles temporalmente

### Conversiones

- **Botón "Convertir a Simétrico"**: Convierte handles independientes a simétricos
- **Shortcut Alt+H**: Convierte rápidamente el punto seleccionado

### Estados del Sistema

El panel muestra información en tiempo real:
- Tipo actual del punto de control
- Estado de la tecla Option
- Disponibilidad de handles (entrante/saliente)
- Capacidad de separación

## Integración Técnica

### Componentes Principales

1. **FigmaHandleManager**: Lógica central del sistema
2. **FigmaHandleRenderer**: Renderizado visual mejorado
3. **FigmaHandleControls**: Interface de usuario
4. **MouseInteraction**: Integración con el sistema de arrastre

### Arquitectura

- **Detección automática**: El sistema analiza automáticamente los puntos seleccionados
- **Actualización en tiempo real**: Los cambios se reflejan inmediatamente
- **Preservación de tipos**: Los tipos se mantienen entre operaciones
- **Memoria de estado**: Recuerda el estado durante el arrastre

## Comportamiento tipo Figma

El sistema replica fielmente el comportamiento de Figma:

1. **Auto-detección de tipo**: Determina automáticamente si los handles están alineados
2. **Preservación inteligente**: Mantiene el tipo durante las modificaciones
3. **Separación con Option**: Permite separar handles temporalmente
4. **Reconversión automática**: Puede reconvertir handles separados a acoplados

## Instrucciones de Uso

1. **Crear una curva Bézier**: Usa las herramientas de creación
2. **Seleccionar un punto**: Haz clic en un punto de comando de la curva
3. **Observar el panel**: Verifica el tipo de punto de control detectado
4. **Mover handles**: Arrastra los handles para ver el comportamiento
5. **Experimentar con Option**: Mantén presionado Option y arrastra
6. **Convertir tipos**: Usa el botón para cambiar a simétrico

## Beneficios

- **Flujo de trabajo familiar**: Comportamiento idéntico a Figma
- **Control preciso**: Tres niveles de control sobre las curvas
- **Feedback visual claro**: Indicadores de color y forma
- **Operación intuitiva**: Separación natural con Option
- **Integración completa**: Funciona con todo el sistema de edición
