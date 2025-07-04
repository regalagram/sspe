# Mejoras en el Sistema de Emparejamiento de Handles

## Problemas Identificados

1. **Sensibilidad al drag rápido**: El sistema de alineación se activaba incluso con movimientos muy rápidos donde el usuario no tenía intención de emparejamiento.

2. **Incompatibilidad con snap to grid**: El snap to grid interfería con la detección de alineación al cambiar las posiciones exactas de los handles.

## Soluciones Implementadas

### 1. Detección de Velocidad de Arrastre

- **Nuevo sistema de tracking**: Se implementó un historial de movimientos (`dragHistory`) que rastrea los últimos 5 puntos de arrastre.
- **Cálculo de velocidad**: Se calcula la velocidad en píxeles por segundo basado en la distancia y tiempo transcurrido.
- **Threshold configurable**: Por defecto 800 px/s, pero se puede ajustar via `setVelocityThreshold()`.
- **Desactivación automática**: Si la velocidad excede el threshold, se desactiva el emparejamiento automático.

### 2. Snap to Grid Inteligente

- **Detección de interferencia**: Se analiza si el snap to grid está cambiando significativamente la dirección del handle.
- **Tolerancia aumentada**: Cuando snap to grid está activo, se usa una tolerancia más alta para detectar alineación (cos 32° vs cos 15°).
- **Snap inteligente**: Si el snap cambiaría el ángulo más de 10 grados, se usa el punto original.
- **Preservación de dirección**: Se prioriza mantener la dirección de alineación sobre el snap exacto.

### 3. Mejoras en la Lógica de Alineación

- **Verificación múltiple**: Se considera velocidad, snap to grid y tamaño de grid antes de aplicar emparejamiento.
- **Grid grande**: Si el grid es muy grande (>50px), se desactiva el emparejamiento para evitar saltos bruscos.
- **Debounce**: Se implementó un sistema de debounce para evitar activaciones erróneas.

## Configuración

### Threshold de Velocidad
```typescript
figmaHandleManager.setVelocityThreshold(600); // px/s
```

### Estadísticas de Velocidad
```typescript
const stats = figmaHandleManager.getVelocityStats();
console.log('Velocidad actual:', stats.current);
console.log('Threshold:', stats.threshold);
console.log('Emparejamiento desactivado:', stats.isActive);
```

## Comportamiento Esperado

1. **Movimientos lentos**: Emparejamiento funciona normalmente con tolerancias apropiadas.
2. **Movimientos rápidos**: Emparejamiento se desactiva automáticamente.
3. **Con snap to grid**: Tolerancia aumentada y snap inteligente preserva alineación.
4. **Grid grande**: Emparejamiento desactivado para evitar saltos.

## Logging y Debug

El sistema incluye logging detallado para debug:
- `📊 Drag velocity`: Velocidad calculada
- `⚡ Fast drag detected`: Velocidad excede threshold
- `🎯 [GRID]`: Operaciones relacionadas con snap to grid
- `🎛️ Velocity threshold`: Cambios en configuración

## Tolerancias Utilizadas

- **Normal**: cos(15°) ≈ 0.966
- **Con snap to grid**: cos(32°) ≈ 0.85
- **Snap angle**: 10 grados máximo de desvío
- **Grid size**: 50px máximo para emparejamiento activo
