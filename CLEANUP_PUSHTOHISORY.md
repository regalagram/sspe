# Plan de Limpieza: Eliminar pushToHistory()

## Estado Actual
- ✅ Zundo configurado correctamente con middleware `temporal`
- ✅ `pushToHistory()` ya es no-op en historyActions.ts
- ❌ 205 llamadas a `pushToHistory()` aún presentes en el código

## Por qué eliminarlo
1. **Redundante**: Zundo maneja el historial automáticamente
2. **Confuso**: Sugiere que es necesario cuando no lo es
3. **Mantenimiento**: Código muerto que puede confundir a desarrolladores
4. **Performance**: Aunque es no-op, sigue siendo una llamada de función innecesaria

## Plan de Eliminación

### Fase 1: Verificar que todo funciona sin pushToHistory()
```bash
# Buscar todos los archivos con pushToHistory()
grep -r 'pushToHistory()' src/ --include="*.ts" --include="*.tsx" | wc -l

# Verificar que historyActions.ts tiene el no-op
grep -A 5 "pushToHistory:" src/store/historyActions.ts
```

### Fase 2: Eliminar llamadas gradualmente por categoría

#### A. Archivos del store (más críticos)
```bash
grep -l 'pushToHistory()' src/store/*.ts
```

#### B. Plugins (funcionalidad específica)
```bash
grep -l 'pushToHistory()' src/plugins/**/*.ts src/plugins/**/*.tsx
```

#### C. Componentes y utils
```bash
grep -l 'pushToHistory()' src/components/*.ts* src/utils/*.ts src/hooks/*.ts
```

### Fase 3: Script automatizado de limpieza
Crear script que:
1. Elimine líneas que solo contengan `pushToHistory();` o `store.pushToHistory();`
2. Elimine comentarios relacionados como "Push to history before..."
3. Mantenga líneas con lógica adicional para revisión manual

### Fase 4: Actualizar tipos (opcional)
Considerar eliminar `pushToHistory` de `HistoryActions` interface después de limpiar todas las llamadas.

## Archivos con más llamadas (prioridad alta)
1. `src/plugins/selection/actions/useActions.ts` - 25 llamadas
2. `src/plugins/selection/actions/subPathActions.ts` - 19 llamadas  
3. `src/plugins/arrange/ArrangeManager.ts` - 23 llamadas
4. `src/plugins/selection/actions/imageActions.ts` - 16 llamadas

## Beneficios esperados
- ✅ Código más limpio y menos confuso
- ✅ Eliminar ~205 llamadas de función innecesarias
- ✅ Mejor entendimiento de que Zundo maneja el historial
- ✅ Menos líneas de código para mantener
