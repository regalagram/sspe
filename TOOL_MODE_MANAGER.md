# ToolModeManager - Sistema de Modos Exclusivos

## Descripción

El `ToolModeManager` es un sistema centralizado que resuelve el problema de múltiples herramientas activas simultáneamente en el editor SVG. Garantiza que solo un modo de herramienta esté activo a la vez, coordinando la activación y desactivación de diferentes modos de manera limpia y predecible.

## Problema Resuelto

**Antes:** Múltiples modos podían estar activos al mismo tiempo:
- `select` + `curves` + `pencil` + `shapes` + `creation`
- Esto causaba conflictos en el manejo de eventos
- Comportamiento impredecible del usuario
- Estados inconsistentes entre herramientas

**Después:** Solo un modo puede estar activo a la vez:
- Cambio automático de modos con desactivación del anterior
- Comportamiento predecible y consistente
- Estados limpios entre herramientas

## Arquitectura

### Jerarquía de Modos
Los modos están organizados de más específico a más general:

1. **SHAPES** - Creación de formas predefinidas (círculos, rectángulos, etc.)
2. **CURVES** - Herramienta de curvas Bézier avanzada
3. **PENCIL** - Herramienta de dibujo libre
4. **CREATION** - Comandos básicos SVG (M, L, C, Z)
5. **SELECT** - Modo de selección (por defecto)

### Componentes Integrados

#### 1. ToolModeManager (Core)
```typescript
// Ubicación: /src/managers/ToolModeManager.ts
export class ToolModeManager {
  setMode(mode: ToolMode, options?: ToolModeOptions): void
  isActive(mode: ToolMode): boolean
  getActiveMode(): ToolMode
  getState(): ToolModeState
}
```

#### 2. Managers Integrados

**CurvesManager**
- Métodos: `activateCurveTool()`, `deactivateExternally()`
- Coordinación con ToolModeManager para curves mode

**ShapeManager**  
- Métodos: `startShapeCreation()`, `stopShapeCreation()`, `deactivateExternally()`
- Coordinación con ToolModeManager para shapes mode

**PencilManager**
- Métodos: `activatePencil()`, `deactivateExternally()`
- Coordinación con ToolModeManager para pencil mode

**CreationManager**
- Métodos: `activateCreation()`, `deactivateExternally()`
- Coordinación con ToolModeManager para creation mode

### Flujo de Activación/Desactivación

```
Usuario presiona shortcut (ej: 'c' para curves)
        ↓
ToolModeManager.setMode('curves')
        ↓
Desactivar modo actual (ej: shapes)
        ↓
shapeManager.deactivateExternally()
        ↓
Activar nuevo modo (curves)
        ↓
curvesManager.activateCurveTool()
        ↓
Notificar listeners del cambio
```

## Uso

### Cambio de Modos Programático
```typescript
import { toolModeManager } from './managers/ToolModeManager';

// Cambiar a curves
toolModeManager.setMode('curves');

// Cambiar a shapes con forma específica
toolModeManager.setMode('shapes', { shapeId: 'circle' });

// Cambiar a creation con comando específico
toolModeManager.setMode('creation', { commandType: 'L' });

// Volver a select
toolModeManager.setMode('select');
```

### Shortcuts Integrados
Los shortcuts ahora usan el ToolModeManager:

- **c, b** → `toolModeManager.setMode('curves')`
- **p** → `toolModeManager.setMode('pencil')`
- **m** → `toolModeManager.setMode('creation', { commandType: 'M' })`
- **l** → `toolModeManager.setMode('creation', { commandType: 'L' })`
- **v** → `toolModeManager.setMode('select')`
- **Escape** → `toolModeManager.setMode('select')`

### Verificación de Estado
```typescript
// Verificar modo activo
const isInCurves = toolModeManager.isActive('curves');
const currentMode = toolModeManager.getActiveMode();

// Obtener estado completo
const state = toolModeManager.getState();
// { activeMode: 'curves', createSubMode?: 'M', shapeId?: 'circle' }
```

## Beneficios

### 1. Exclusividad Garantizada
- Solo un modo puede estar activo a la vez
- Eliminación de conflictos entre herramientas
- Estado predecible en todo momento

### 2. Transiciones Limpias
- Desactivación automática del modo anterior
- Activación coordinada del nuevo modo
- Sin estados intermedios inconsistentes

### 3. Centralización
- Un solo punto de control para todos los modos
- Fácil debugging y mantenimiento
- Logging centralizado de cambios de modo

### 4. Extensibilidad
- Fácil agregar nuevos modos
- Patrón consistente para integración
- Coordinación automática con managers existentes

## Testing

### En Consola del Navegador
```javascript
// El toolModeManager está disponible globalmente
testToolModeManager(); // Ejecuta suite de pruebas
testShortcuts();       // Información sobre shortcuts
```

### Suite de Pruebas Incluida
```javascript
// Verificar modo inicial
toolModeManager.getActiveMode(); // 'select'

// Cambiar modos y verificar exclusividad
toolModeManager.setMode('curves');
toolModeManager.getActiveMode(); // 'curves'

toolModeManager.setMode('shapes', { shapeId: 'circle' });
toolModeManager.getActiveMode(); // 'shapes'
// curves fue desactivado automáticamente
```

## Archivos Modificados

### Core
- `/src/managers/ToolModeManager.ts` - Manager principal (nuevo)
- `/src/index.tsx` - Exposición global para testing

### Plugins Integrados
- `/src/plugins/curves/CurvesManager.ts` - Integración curves
- `/src/plugins/curves/Curves.tsx` - Shortcuts actualizados
- `/src/plugins/shapes/ShapeManager.ts` - Integración shapes  
- `/src/plugins/pencil/PencilManager.ts` - Integración pencil
- `/src/plugins/pencil/Pencil.tsx` - Shortcuts actualizados
- `/src/plugins/creation/CreationManager.ts` - Integración creation
- `/src/plugins/creation/Creation.tsx` - Shortcuts actualizados
- `/src/plugins/selection/Selection.tsx` - Shortcuts actualizados
- `/src/plugins/global-keyboard/GlobalKeyboard.tsx` - Escape centralizado

## Compatibilidad

- ✅ **Backwards Compatible**: Los managers existentes siguen funcionando
- ✅ **Graceful Fallback**: Si no hay manager registrado, usa comportamiento anterior
- ✅ **No Breaking Changes**: La API externa no cambió
- ✅ **Incremental**: Puede implementarse manager por manager

## Próximos Pasos

1. **Testing Extensivo**: Probar todas las combinaciones de modos
2. **UI Indicators**: Agregar indicadores visuales del modo activo
3. **Persistence**: Recordar último modo usado entre sesiones
4. **Analytics**: Tracking de uso de modos para UX insights
5. **Documentation**: Agregar ejemplos interactivos

---

**Estado**: ✅ **IMPLEMENTADO Y FUNCIONAL**
**Última actualización**: Julio 2025
