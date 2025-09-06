# Undo-Redo History Fix - JSON Serialization Issue

## Problema Identificado
Error: `SyntaxError: "undefined" is not valid JSON at JSON.parse()`

### Causa del Error
- El estado `deepSelection` puede ser `undefined`
- `JSON.stringify(undefined)` retorna `undefined` (no la string `"undefined"`)
- `JSON.parse(undefined)` falla con SyntaxError

### Traces de Error
```
history-utils.ts:40 Failed to clone state property deepSelection: SyntaxError: "undefined" is not valid JSON
    at JSON.parse (<anonymous>)
    at cleanStateForHistory (history-utils.ts:38:32)
```

## Solución Implementada

### 1. Función `safeClone` Mejorada
```typescript
export function safeClone(value: any): any {
  // Manejo explícito de undefined - fix principal para deepSelection
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  
  try {
    const stringified = JSON.stringify(value);
    // JSON.stringify puede retornar undefined para funciones, symbols
    if (stringified === undefined) {
      return null; // Fallback seguro
    }
    return JSON.parse(stringified);
  } catch (error) {
    // Referencias circulares, etc.
    return null;
  }
}
```

### 2. Actualización de `cleanStateForHistory`
- Reemplaza lógica compleja con llamada a `safeClone`
- Elimina try-catch anidados
- Mejora logging para debugging

### 3. Actualización de `HistoryModal`
- Importa y usa `safeClone` en lugar de JSON.parse(JSON.stringify())
- Mayor robustez en comparaciones de estado

## Casos Manejados
- ✅ `deepSelection: undefined` (caso principal)
- ✅ Propiedades `null`
- ✅ Funciones y contenido no-serializable
- ✅ Referencias circulares
- ✅ Valores complejos anidados

## Testing
- ✅ Compilación TypeScript sin errores
- ✅ Test manual con estado problemático
- ✅ Verificación de preservación de `undefined` vs `null`

## Impacto
- **Elimina crashes** durante operaciones de undo-redo
- **Mantiene integridad** del estado durante push/pop del historial
- **Robustez mejorada** para serialización de estado complejo
- **Logging mejorado** para debugging futuro