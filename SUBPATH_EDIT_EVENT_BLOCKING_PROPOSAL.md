# Propuesta: Event Blocking Completo para Modo Subpath-Edit

## 🎯 OBJETIVO

**Bloquear COMPLETAMENTE en modo `subpath-edit`:**
- ❌ **Click en elementos** (subpaths, groups, images, text, use)
- ❌ **Drag de elementos** (movimiento de cualquier tipo)
- ❌ **Doble click en textos** (edición de texto)
- ❌ **Cualquier interacción** con elementos que no sean command/control points
- ✅ **Solo permitir** command/control points + selection box
- ✅ **Mantener cursor actual** (sin cambios visuales)

## 💡 ESTRATEGIA: "Complete Element + Double Click Blocking"

### **Interceptación en Múltiples Capas:**
1. **Early Blocking** en PluginSystem (primera línea de defensa)
2. **Plugin-Level Blocking** en plugins específicos (redundancia)
3. **UI-Level Blocking** en UnifiedRenderer (elementos SVG)

## 🔧 ARQUITECTURA DE LA SOLUCIÓN

### **Utility Function Centralizada**
```typescript
// src/utils/subpath-edit-blocking.ts
export const isSubpathEditModeBlocked = (
  e: PointerEvent, 
  context?: { isDoubleClick?: boolean }
): boolean => {
  const state = useEditorStore.getState();
  if (state.mode?.current !== 'subpath-edit') return false;
  
  const target = e.target as Element;
  
  // ✅ PERMITIR: Command points y control points
  if (target.hasAttribute('data-command-id') || 
      target.hasAttribute('data-control-point') ||
      target.closest('[data-command-id]') ||
      target.closest('[data-control-point]')) {
    return false;
  }
  
  // ✅ PERMITIR: Selection box (SVG background)
  if (target.tagName.toLowerCase() === 'svg' && 
      !target.hasAttribute('data-element-type') &&
      !target.closest('[data-element-type]')) {
    return false;
  }
  
  // ✅ PERMITIR: UI controls
  if (target.closest('[data-zoom-control]') || 
      target.closest('[data-pan-control]') ||
      target.closest('.toolbar') ||
      target.closest('.sidebar')) {
    return false;
  }
  
  // ❌ BLOQUEAR ESPECIAL: Double clicks en textos
  if (context?.isDoubleClick) {
    const elementType = target.getAttribute('data-element-type');
    if (elementType === 'text' || 
        elementType === 'multiline-text' || 
        elementType === 'textPath') {
      console.log('[SubpathEdit] Blocked double-click on text:', target);
      e.preventDefault();
      e.stopImmediatePropagation();
      return true;
    }
  }
  
  // ❌ BLOQUEAR: Todo lo demás
  const elementType = target.getAttribute('data-element-type');
  if (elementType) {
    console.log('[SubpathEdit] Blocked interaction:', elementType);
    e.preventDefault();
    e.stopImmediatePropagation();
    return true;
  }
  
  return false;
};
```

## 📋 PUNTOS DE IMPLEMENTACIÓN

### **1. Early Blocking en PluginSystem**
- **Archivo**: `src/core/PluginSystem.ts`
- **Línea**: ~234 (en detectDoubleClick)
- **Acción**: Añadir verificación antes de procesar cualquier plugin

### **2. Plugin-Level Blocking**
- **TextEditPlugin**: `src/plugins/text-edit/index.ts`
- **PointerInteraction**: `src/plugins/pointer-interaction/PointerInteraction.tsx`
- **Acción**: Añadir verificación al inicio de handlers

### **3. UI-Level Blocking en UnifiedRenderer**
- **Archivo**: `src/core/UnifiedRenderer.tsx`
- **Elementos**: SubPath, TextElement, ImageElement, UseElement, PathOverlay
- **Acción**: Añadir verificación en onPointerDown handlers

## ✅ COMPORTAMIENTO RESULTANTE

### **❌ BLOQUEADO:**
```
• Click/Double-click en subpaths
• Click/Double-click en grupos  
• Click/Double-click en imágenes
• Click/Double-click en textos (NO text editing)
• Click/Double-click en use elements
• Drag operations de cualquier elemento
• Transform handles
```

### **✅ PERMITIDO:**
```
• Click/Drag en command points
• Click/Drag en control points
• Selection box en SVG background
• UI controls (zoom, pan, toolbars)
```

## 🚀 VENTAJAS DE LA IMPLEMENTACIÓN

- **🎯 Quirúrgica**: Bloqueo específico por modo
- **⚡ Performance**: Early blocking evita procesamiento innecesario  
- **🛡️ Robusta**: Múltiples capas de protección
- **🔄 Mantenible**: Una utility function centralizada
- **📱 Compatible**: Funciona igual en touch y desktop
- **🐛 Debuggable**: Logs específicos para troubleshooting

## 🧪 TESTING STRATEGY

### **Casos Críticos:**
- ✅ Command point interactions → Deben funcionar
- ✅ Control point interactions → Deben funcionar
- ✅ Selection box → Debe funcionar
- ❌ Text double-click → Debe estar bloqueado
- ❌ Element single-click → Debe estar bloqueado
- ❌ Element drag → Debe estar bloqueado

---

## TODO DE IMPLEMENTACIÓN

### **Fase 1: Infraestructura ⚡**
- [ ] **Crear utility function centralizada**
  - Archivo: `src/utils/subpath-edit-blocking.ts`
  - Función: `isSubpathEditModeBlocked()`
  - Testing: Unit tests para diferentes scenarios

### **Fase 2: Early Blocking 🛡️**
- [ ] **Modificar PluginSystem.ts**
  - Ubicación: Línea ~234 en `detectDoubleClick()`
  - Acción: Añadir early blocking antes de plugin processing
  - Testing: Verificar que double-clicks se bloquean temprano

### **Fase 3: Plugin-Level Protection 🔌**
- [ ] **Actualizar TextEditPlugin**
  - Archivo: `src/plugins/text-edit/index.ts`
  - Acción: Añadir blocking al inicio de `onPointerDown`
  - Testing: Verificar que text editing no se inicia
  
- [ ] **Actualizar PointerInteraction**
  - Archivo: `src/plugins/pointer-interaction/PointerInteraction.tsx`  
  - Línea: ~1733 (double-click text handling)
  - Acción: Añadir blocking verification
  - Testing: Verificar que no hay text editing en double-click

### **Fase 4: UI-Level Blocking 🎨**
- [ ] **Modificar SubPath elements**
  - Archivo: `src/core/UnifiedRenderer.tsx`
  - Línea: ~666 (SubPath onPointerDown)
  - Acción: Extender lógica existente con blocking completo
  - Testing: Verificar que subpaths no son seleccionables/draggables

- [ ] **Modificar TextElement**
  - Archivo: `src/core/UnifiedRenderer.tsx`
  - Línea: ~1018 (TextElement onPointerDown)
  - Acción: Añadir blocking al inicio
  - Testing: Verificar que textos no son clickeables

- [ ] **Añadir handlers a elementos sin onPointerDown**
  - ImageElement (~1200)
  - UseElement (~1240)
  - Acción: Crear onPointerDown handlers con blocking
  - Testing: Verificar que imágenes/uses no son interactuables

- [ ] **Modificar PathOverlay**
  - Línea: ~485 (PathOverlay onPointerDown)
  - Acción: Añadir blocking al inicio
  - Testing: Verificar que path overlays no son draggables

### **Fase 5: Integration Testing 🧪**
- [ ] **Casos de prueba completos**
  - Command point selection/dragging
  - Control point dragging
  - Selection box functionality
  - Text double-click blocking
  - Element interaction blocking
  - Mode switching (enter/exit subpath-edit)

- [ ] **Edge cases**
  - Keyboard modifiers (Shift+Click, Ctrl+Click)
  - Touch gestures
  - Multi-pointer scenarios
  - Rapid click sequences

### **Fase 6: Documentation & Cleanup 📝**
- [ ] **Actualizar documentación**
  - Comportamiento de subpath-edit mode
  - Testing guidelines
  - Debugging tips

- [ ] **Performance verification**
  - Verificar que no hay regression en performance
  - Profiling de event handling
  - Memory leak verification

---

## 🎯 CRITERIOS DE ÉXITO

### **Funcional:**
- ✅ Solo command/control points son interactuables
- ✅ Selection box funciona en SVG background
- ❌ Ningún elemento es clickeable/draggeable  
- ❌ Double-click en texto NO inicia editing

### **Performance:**
- ✅ Sin degradación measurable en event handling
- ✅ Early blocking reduce procesamiento innecesario
- ✅ Sin memory leaks introducidos

### **UX:**
- ✅ Cursor behavior mantenido (sin cambios)
- ✅ Transiciones suaves entre modos
- ✅ Visual feedback consistente

### **Mantenibilidad:**
- ✅ Código centralizado y reutilizable
- ✅ Logs informativos para debugging
- ✅ Testing comprehensivo implementado

---

*Este documento sirve como referencia completa para la implementación del event blocking en modo subpath-edit. Cada fase debe completarse y testearse antes de proceder a la siguiente.*