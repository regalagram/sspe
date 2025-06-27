# Persistencia de Preferencias del Usuario

## Funcionalidad Implementada

El editor SVG ahora guarda automáticamente las siguientes preferencias del usuario en el localStorage del navegador:

### Preferencias Guardadas:

1. **Nivel de Zoom** (`zoom`)
   - Se guarda automáticamente cuando el usuario cambia el zoom
   - Rango válido: 0.1 - 10.0
   - Se restaura al cargar la aplicación

2. **Estado de la Grilla** (`gridEnabled`)
   - Se guarda cuando el usuario activa/desactiva la grilla
   - Se restaura al cargar la aplicación

3. **Tamaño de la Grilla** (`gridSize`)
   - Se guarda cuando el usuario cambia el tamaño de la grilla
   - Rango válido: 1 - 100
   - Se restaura al cargar la aplicación

4. **Ajuste a la Grilla** (`snapToGrid`)
   - Se guarda cuando el usuario activa/desactiva el ajuste a la grilla
   - Se restaura al cargar la aplicación

5. **Mostrar Puntos de Control** (`showControlPoints`)
   - Se guarda cuando el usuario activa/desactiva los puntos de control
   - Se restaura al cargar la aplicación

## Archivos Modificados:

### `/src/utils/persistence.ts`
- Nuevo archivo que maneja la carga y guardado de preferencias
- Funciones: `loadPreferences()`, `savePreferences()`, `clearPreferences()`
- Validación de datos y valores por defecto

### `/src/store/editorStore.ts`
- Carga las preferencias al inicializar el estado
- Guarda automáticamente las preferencias cuando cambian
- Funciones actualizadas: `setZoom`, `toggleGrid`, `setGridSize`, `toggleSnapToGrid`, `toggleFeature`

### `/src/components/PersistenceDebug.tsx`
- Componente de debug para probar la funcionalidad (temporal)
- Muestra las preferencias actuales
- Botones para limpiar preferencias y mostrar logs

## Cómo Probar:

1. Cambiar cualquiera de las preferencias mencionadas
2. Recargar la página
3. Verificar que las preferencias se mantienen
4. Usar el componente de debug para inspeccionar valores

## Implementación Técnica:

- Las preferencias se guardan con `setTimeout(..., 0)` para evitar bloquear la UI
- Se usa validación de tipos y rangos al cargar
- Manejo de errores para casos donde localStorage no está disponible
- Clave de almacenamiento: `svg-editor-preferences`

## Uso en Producción:

El componente `PersistenceDebug` debe ser removido antes de producción. Las preferencias funcionarán automáticamente sin intervención del usuario.
