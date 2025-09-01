import { useEditorStore } from './editorStore';

/**
 * Configuraciones para el sistema de optimización de Zundo
 * 
 * NOTA IMPORTANTE: Zundo no soporta almacenamiento de diffs parciales de manera nativa.
 * Esta configuración se usa principalmente para análisis y debugging.
 * La optimización real se hace a través de 'partialize' para excluir campos innecesarios.
 */
export interface ZundoDiffConfig {
  enabled: boolean;
  mode: 'full' | 'diff';
}

// Estado global para configuración de análisis
let diffConfig: ZundoDiffConfig = {
  enabled: true,
  mode: 'diff' // Solo para logging/análisis, no afecta el almacenamiento real
};

/**
 * Función para calcular diferencias entre estados
 * Utilizada para análisis y debugging - NO para almacenamiento
 */
export function calculateStateDiff(
  currentState: any, 
  pastState: any
): any | null {
  if (!currentState || !pastState) return currentState;
  
  const diff: any = {};
  let hasChanges = false;
  
  // Comparar campos del nivel superior
  for (const key in currentState) {
    if (key === 'debugPanel') continue; // Siempre excluir debugPanel
    
    const currentValue = currentState[key];
    const pastValue = pastState[key];
    
    // Comparación simple para detectar cambios
    if (JSON.stringify(currentValue) !== JSON.stringify(pastValue)) {
      diff[key] = currentValue;
      hasChanges = true;
    }
  }
  
  // Retorna los campos que cambiaron (solo para análisis)
  return hasChanges ? diff : null;
}

/**
 * Hook para controlar la configuración de análisis
 * NOTA: Esta configuración ya no afecta el almacenamiento real, solo el análisis/logging
 */
export function useDiffConfig() {
  return {
    config: diffConfig,
    setDiffMode: (mode: 'full' | 'diff') => {
      diffConfig.mode = mode;
      diffConfig.enabled = mode === 'diff';
      
      // Notificar cambio para debug
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Zundo analysis mode changed to: ${mode}`);
        console.log('💡 Note: This only affects logging, not actual storage');
      }
    },
    toggleDiffMode: () => {
      const newMode = diffConfig.mode === 'full' ? 'diff' : 'full';
      diffConfig.mode = newMode;
      diffConfig.enabled = newMode === 'diff';
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Zundo analysis mode toggled to: ${newMode}`);
        console.log('💡 Note: This only affects logging, not actual storage');
      }
      
      return newMode;
    }
  };
}

/**
 * Obtener configuración actual de diffs (para usar en el store)
 */
export function getCurrentDiffConfig() {
  return diffConfig;
}
