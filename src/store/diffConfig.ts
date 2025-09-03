import { useEditorStore } from './editorStore';

/**
 * Configuraciones para el sistema de diff storage de Zundo
 * 
 * ZUNDO v2 SOPORTA ALMACENAMIENTO DE DIFFS de manera nativa.
 * Esta configuración controla si se almacenan estados completos o solo diferencias.
 * El almacenamiento de diffs reduce significativamente el uso de memoria.
 */
export interface ZundoDiffConfig {
  enabled: boolean;
  mode: 'full' | 'diff';
}

// Estado global para configuración de diff storage
let diffConfig: ZundoDiffConfig = {
  enabled: true,
  mode: 'diff' // Controla si Zundo almacena diffs o estados completos
};


/**
 * Función para calcular diferencias entre estados
 * Utilizada por Zundo para almacenar solo los campos que cambiaron
 */
export function calculateStateDiff(
  currentState: any, 
  pastState: any
): any | null {
  if (!currentState || !pastState) return currentState;
  
  const diff: any = {};
  let hasChanges = false;
  let changedFields: string[] = [];
  
  // Comparar campos del nivel superior
  for (const key in currentState) {
    // Excluir campos que no deben ser trackeados
    if (key === 'debugPanel' || key === 'renderVersion' || 
        key === 'floatingToolbarUpdateTimestamp') {
      continue; 
    }
    
    const currentValue = currentState[key];
    const pastValue = pastState[key];
    
    // Comparación para detectar cambios
    if (JSON.stringify(currentValue) !== JSON.stringify(pastValue)) {
      diff[key] = currentValue;
      hasChanges = true;
      changedFields.push(key);
    }
  }
  
  // Debug logging en development
  if (process.env.NODE_ENV === 'development' && hasChanges) {
    const fullSize = JSON.stringify(currentState).length;
    const diffSize = JSON.stringify(diff).length;
    const savings = Math.round(((fullSize - diffSize) / fullSize) * 100);
    
    console.log(`📦 Zundo Diff: ${diffSize} bytes (${savings}% smaller than full state)`);
    console.log(`🔍 Changed fields: [${changedFields.join(', ')}]`);
  }
  
  
  // Retorna los campos que cambiaron - null significa no guardar este cambio
  return hasChanges ? diff : null;
}

/**
 * Hook para controlar la configuración de diff storage
 * Esta configuración afecta directamente cómo Zundo almacena los estados
 */
export function useDiffConfig() {
  return {
    config: diffConfig,
    setDiffMode: (mode: 'full' | 'diff') => {
      diffConfig.mode = mode;
      diffConfig.enabled = mode === 'diff';
      
      // Notificar cambio para debug
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Zundo diff storage changed to: ${mode}`);
        console.log('💡 Note: This affects how states are stored in memory');
        if (mode === 'diff') {
          console.log('📉 Memory usage should decrease - storing only changes');
        } else {
          console.log('📈 Memory usage will increase - storing full states');
        }
      }
    },
    toggleDiffMode: () => {
      const newMode = diffConfig.mode === 'full' ? 'diff' : 'full';
      diffConfig.mode = newMode;
      diffConfig.enabled = newMode === 'diff';
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Zundo diff storage toggled to: ${newMode}`);
        console.log('💡 Note: This affects real memory usage');
        if (newMode === 'diff') {
          console.log('📉 Now storing only differences between states');
        } else {
          console.log('📈 Now storing complete states');
        }
      }
      
      return newMode;
    }
  };
}

/**
 * Obtener configuración actual de diff storage (usado por Zundo)
 */
export function getCurrentDiffConfig() {
  return diffConfig;
}

/**
 * Calcular diferencia entre dos estados específicos
 * Usado para mostrar solo los campos que cambiaron
 */
export function calculateInlineDiff(currentState: any, previousState: any) {
  if (!currentState || !previousState) return null;
  return calculateStateDiff(currentState, previousState);
}
