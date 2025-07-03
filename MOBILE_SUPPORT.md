# Soporte para Dispositivos Móviles

## Funcionalidades Implementadas

### 1. Detección Automática de Dispositivos Móviles
- **Hook `useMobileDetection`**: Detecta automáticamente dispositivos móviles y tablets
- **Breakpoints**: 
  - Móvil: ≤ 768px con capacidades táctiles
  - Tablet: 769px - 1024px con capacidades táctiles
  - Desktop: > 1024px o sin capacidades táctiles

### 2. Modo Accordion Automático
- **Activación automática**: En dispositivos móviles, la aplicación cambia automáticamente al modo accordion
- **Interface responsive**: Los paneles se muestran en una lista vertical colapsable
- **Mejor usabilidad**: Optimizado para pantallas pequeñas y navegación táctil

### 3. Puntos de Control y Comando Más Grandes
- **Puntos de comando**:
  - Móvil: 20px de radio base
  - Tablet: 16px de radio base  
  - Desktop: 12px de radio base
- **Puntos de control**: 
  - Móvil: 6px de radio base
  - Tablet: 5px de radio base
  - Desktop: 4px de radio base
- **Handles de transformación**:
  - Móvil: 24px × 24px
  - Tablet: 20px × 20px
  - Desktop: 16px × 16px

### 4. Gestos Táctiles Avanzados

#### Hook `useTouchGestures`
- **Pan con dos dedos**: Navegación por el canvas
- **Pinch-to-zoom**: Zoom con dos dedos
- **Mapeo táctil a mouse**: Los eventos de un solo dedo se mapean a eventos de mouse para mantener compatibilidad

#### Hook `useGlobalTouchSupport` (NUEVO)
- **Mapeo global de eventos**: Intercepta todos los eventos táctiles y los convierte a eventos de mouse
- **Soporte completo para drag & drop**: Maneja correctamente el inicio, movimiento y finalización de operaciones de arrastre
- **Detección inteligente de drag**: Usa un threshold de movimiento para distinguir entre clicks y drags
- **Propagación correcta**: Asegura que los eventos se propaguen correctamente por todo el DOM
- **Prevención de interferencias**: Evita que los gestos del navegador interfieran con las operaciones de drag

#### Plugin `TouchSupport`
- **Gestos multi-touch**: Se enfoca únicamente en gestos de múltiples dedos (pan y zoom)
- **Coordinación con soporte global**: Trabaja en conjunto con el sistema global sin interferir
- **Optimización de rendimiento**: Solo se activa para gestos específicos

### 5. Solución para Drag & Drop en Móviles

#### Problema Original
Los eventos táctiles no se mapeaban correctamente a eventos de mouse, causando que las operaciones de drag & drop no funcionaran en dispositivos móviles.

#### Solución Implementada
1. **Sistema global de mapeo**: `useGlobalTouchSupport` intercepta todos los eventos táctiles a nivel de document
2. **Mapeo inteligente**: Convierte touch events a mouse events con todas las propiedades necesarias
3. **Detección de drag**: Usa un threshold de 10 pixels para determinar si es un click o un drag
4. **Propagación dual**: Los eventos se disparan tanto en el elemento target como en document para asegurar captura
5. **Gestión de estado**: Mantiene un mapa de toques activos para manejar correctamente múltiples interacciones

#### Características Técnicas
- **Threshold de drag**: 10 pixels de movimiento para activar modo drag
- **Eventos sintéticos**: Crea eventos de mouse con todas las propiedades necesarias (clientX, clientY, buttons, etc.)
- **Capture phase**: Usa event listeners con capture para interceptar antes que otros handlers
- **Cleanup automático**: Limpia el estado cuando los toques terminan o se cancelan

### 6. Interfaz Optimizada para Móviles

#### Botones y Controles
- **PluginButton**: Tamaños adaptativos según el dispositivo
- **Touch targets**: Mínimo 48px en móviles (siguiendo guidelines de accesibilidad)
- **Espaciado**: Más padding y márgenes en dispositivos móviles

#### Panels y Accordion
- **Headers más grandes**: 56px mínimo en móviles vs 40px en desktop
- **Texto más grande**: 16px en móviles vs 14px en desktop
- **Iconos adaptativos**: 20px en móviles vs 16px en desktop

### 7. Estilos CSS Responsivos

#### Media Queries
```css
/* Móviles */
@media (max-width: 768px) {
  /* Estilos específicos para móviles */
}

/* Tablets */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Estilos específicos para tablets */
}
```

#### Prevención de Comportamientos No Deseados
- `touch-action: none` - Previene gestos del navegador
- `user-select: none` - Previene selección de texto
- `-webkit-tap-highlight-color: transparent` - Elimina highlights en iOS

## Archivos Creados/Modificados

### Nuevos Archivos
- `src/hooks/useMobileDetection.ts` - Detección de dispositivos móviles
- `src/hooks/useTouchGestures.ts` - Manejo de gestos táctiles
- `src/plugins/touch-support/TouchSupport.tsx` - Plugin de soporte táctil

### Archivos Modificados
- `src/plugins/panelmode/PanelManager.ts` - Modo accordion automático en móviles
- `src/plugins/panelmode/AccordionSidebar.tsx` - Interfaz responsive
- `src/components/PluginButton.tsx` - Botones adaptativos
- `src/plugins/visual-debug/VisualDebug.tsx` - Puntos de control adaptativos
- `src/plugins/transform/TransformHandles.tsx` - Handles adaptativos
- `src/core/SvgEditor.tsx` - Registro del plugin touch support
- `src/styles/editor.css` - Estilos responsivos

## Uso

La funcionalidad se activa automáticamente al detectar un dispositivo móvil. No requiere configuración adicional.

### Gestos Soportados
1. **Un dedo**: Interacciones normales (click, drag, etc.)
2. **Dos dedos - Pan**: Mover el canvas
3. **Dos dedos - Pinch**: Zoom in/out
4. **Toques en paneles**: Expandir/colapsar en modo accordion

### Características Automáticas
- Cambio automático a modo accordion en móviles
- Puntos de control más grandes automáticamente
- Botones con tamaño mínimo para touch
- Prevención de gestos del navegador

## Compatibilidad

- **iOS Safari**: ✅ Completamente soportado
- **Android Chrome**: ✅ Completamente soportado  
- **Navegadores móviles**: ✅ Soportado en navegadores modernos
- **Desktop**: ✅ Sin impacto en funcionalidad existente
- **Tablets**: ✅ Tamaños intermedios adaptativos
