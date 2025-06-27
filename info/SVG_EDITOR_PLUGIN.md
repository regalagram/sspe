# Plugin SVG Editor

## Descripción
El plugin SVG Editor proporciona una interfaz para visualizar y editar directamente el código SVG generado por el editor visual. Permite a los usuarios avanzados hacer ajustes precisos al código SVG o copiar el resultado para uso externo.

## Características

### 📝 **Editor de Código**
- **Textarea con syntax highlighting básico**: Fuente monospace para mejor legibilidad
- **Generación automática**: El código SVG se actualiza automáticamente cuando se modifican los paths
- **Edición manual**: Permite modificar el código SVG directamente
- **Validación**: Verifica que el SVG sea válido antes de aplicar cambios

### ⌨️ **Atajos de Teclado**
- **Ctrl + Enter**: Aplicar cambios del código SVG editado
- **Escape**: Revertir cambios y volver al código original
- **Ctrl + Shift + S**: Enfocar el editor SVG (acceso rápido)

### 🎨 **Indicadores Visuales**
- **Fondo amarillo claro**: Indica cuando hay cambios pendientes sin aplicar
- **Borde naranja**: Resalta el textarea cuando está en modo edición
- **Botones Apply/Revert**: Aparecen solo cuando hay cambios pendientes

### ⚡ **Funcionalidades**
- **Sincronización en tiempo real**: El código se actualiza automáticamente con cambios visuales
- **Preservación de estilos**: Mantiene todos los atributos de estilo (fill, stroke, opacity, etc.)
- **Formato limpio**: Genera SVG bien formateado y legible
- **ViewBox automático**: Incluye el viewBox basado en el viewport actual

## Uso

### Para Ver el Código
1. El panel SVG muestra automáticamente el código SVG generado
2. Se actualiza en tiempo real cuando se modifican los paths visualmente
3. Útil para copiar el SVG resultante para uso externo

### Para Editar Manualmente
1. Hacer clic en el textarea para empezar a editar
2. El fondo cambia a amarillo para indicar cambios pendientes
3. Usar **Ctrl + Enter** para aplicar los cambios
4. Usar **Escape** para cancelar y revertir

### Consejos
- Asegurarse de que el SVG sea válido XML antes de aplicar
- Los cambios complejos podrían requerir reconfiguración del editor visual
- Usar para ajustes finos o exportación del código final

## Implementación Técnica

### Archivos
- `/src/plugins/svg-editor/SVGEditor.tsx` - Plugin principal
- Integrado en `/src/core/SvgEditor.tsx`

### Dependencias
- Usa `pathToString` para generar las rutas SVG
- Se integra con el store de Zustand para obtener los paths y estilos
- Utiliza DOMParser para validación básica de SVG

### Futuras Mejoras Posibles
- Parser completo SVG → paths para edición bidireccional completa
- Syntax highlighting avanzado
- Autocompletado de atributos SVG
- Exportación directa a archivo
- Validación más robusta
