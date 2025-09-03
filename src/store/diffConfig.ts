import { useEditorStore } from './editorStore';
import microdiff from 'microdiff';

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
 * Helper function for MINIMAL storage - only stores the specific changed values
 * This is memory-efficient for Zundo storage (e.g., only "fill": "#ff0000")
 */
function applyMinimalChanges(changes: any[], currentState: any): any {
  const diff: any = {};
  
  changes.forEach((change: any) => {
    const path = change.path;
    let current = diff;
    let source = currentState;
    
    // Navigate to the correct position, creating minimal structure
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      const isLastKey = i === path.length - 1;
      
      if (isLastKey) {
        // This is the final key - set only the changed value
        current[key] = source[key];
      } else {
        // Create minimal intermediate structure
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
        source = source[key];
      }
    }
  });
  
  return diff;
}

/**
 * Helper function for DISPLAY reconstruction - creates complete elements for context
 * Used by the modal to show full context while highlighting specific changes
 */
function applyMicrodiffChanges(changes: any[], currentState: any): any {
  const diff: any = {};
  
  // Track which array elements need to be included completely
  const arrayElementsToInclude = new Map<string, Set<number>>();
  
  // First pass: identify array elements that have changes
  changes.forEach((change: any) => {
    const path = change.path;
    
    // Look for array indices in the path
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      const nextKey = path[i + 1];
      
      // If next key is numeric, this key represents an array
      if (!isNaN(parseInt(nextKey))) {
        const arrayPath = path.slice(0, i + 1).join('.');
        const arrayIndex = parseInt(nextKey);
        
        if (!arrayElementsToInclude.has(arrayPath)) {
          arrayElementsToInclude.set(arrayPath, new Set());
        }
        arrayElementsToInclude.get(arrayPath)!.add(arrayIndex);
      }
    }
  });
  
  // Second pass: build the sparse structure with complete elements
  changes.forEach((change: any) => {
    const path = change.path;
    let current = diff;
    let source = currentState;
    
    // Navigate to the correct position, creating sparse structure as we go
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      const isLastKey = i === path.length - 1;
      const currentPath = path.slice(0, i + 1).join('.');
      
      if (isLastKey) {
        // This is the final key - set the actual changed value
        current[key] = source[key];
      } else {
        // This is an intermediate key - we need to continue navigating
        const nextKey = path[i + 1];
        
        // Initialize the intermediate structure if it doesn't exist
        if (!current[key]) {
          // Check if the next level is an array index (numeric) or object property
          const isNextLevelArray = !isNaN(parseInt(nextKey)) && source[key] && Array.isArray(source[key]);
          current[key] = isNextLevelArray ? [] : {};
        }
        
        // If this is an array and we know which elements to include completely
        if (Array.isArray(source[key]) && arrayElementsToInclude.has(currentPath)) {
          const indicesToInclude = arrayElementsToInclude.get(currentPath)!;
          
          // Include complete elements for all indices that have changes
          indicesToInclude.forEach(index => {
            if (source[key][index] !== undefined) {
              current[key][index] = source[key][index]; // Complete element
            }
          });
        }
        
        current = current[key];
        source = source[key];
      }
    }
  });
  
  return diff;
}

/**
 * Calculate diff size threshold - if changes are too extensive, fallback to full diff
 */
function shouldUseMicrodiff(changes: any[], currentState: any): boolean {
  const changeCount = changes.length;
  const stateSize = Object.keys(currentState).length;
  
  // If more than 50% of top-level fields changed, use full diff
  const topLevelChanges = new Set(changes.map((c: any) => c.path[0])).size;
  if (topLevelChanges / stateSize > 0.5) {
    return false;
  }
  
  // If too many granular changes, use full diff
  if (changeCount > 100) {
    return false;
  }
  
  return true;
}

/**
 * Función para calcular diferencias granulares entre estados usando microdiff
 * Utilizada por Zundo para almacenar solo los campos que cambiaron
 */
export function calculateStateDiff(
  currentState: any, 
  pastState: any
): any | null {
  if (!currentState || !pastState) return currentState;
  
  // Create filtered states excluding fields that shouldn't be tracked
  const excludedFields = new Set(['debugPanel', 'renderVersion', 'floatingToolbarUpdateTimestamp']);
  
  const filteredCurrent = Object.fromEntries(
    Object.entries(currentState).filter(([key]) => !excludedFields.has(key))
  );
  const filteredPast = Object.fromEntries(
    Object.entries(pastState).filter(([key]) => !excludedFields.has(key))
  );
  
  // Use microdiff to get granular changes
  const changes = microdiff(filteredPast, filteredCurrent);
  
  if (changes.length === 0) {
    return null; // No changes
  }
  
  // Decide whether to use granular diff or fallback to full diff
  const useGranular = shouldUseMicrodiff(changes, filteredCurrent);
  
  let finalDiff: any;
  let diffType: string;
  
  if (useGranular) {
    // For storage: only store the minimal changed values (memory efficient)
    finalDiff = applyMinimalChanges(changes, filteredCurrent);
    diffType = 'granular';
    
    // Add metadata for display reconstruction and highlighting
    finalDiff.__diffMetadata = {
      type: 'granular',
      changes: changes.map((change: any) => ({
        path: change.path.join('.'),
        type: change.type,
        oldValue: change.oldValue,
        value: change.value
      })),
      // Flag to indicate this needs reconstruction in the display layer
      needsReconstruction: true
    };
  } else {
    // Fallback to field-level diff (current behavior)
    finalDiff = {};
    for (const change of changes) {
      const topLevelField = change.path[0];
      finalDiff[topLevelField] = filteredCurrent[topLevelField];
    }
    diffType = 'field-level';
    
    // Add metadata for field-level changes too
    finalDiff.__diffMetadata = {
      type: 'field-level',
      changes: Array.from(new Set(changes.map((c: any) => c.path[0]))).map(field => ({
        path: field,
        type: 'CHANGE',
        oldValue: filteredPast[field],
        value: filteredCurrent[field]
      }))
    };
  }
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    const fullSize = JSON.stringify(filteredCurrent).length;
    const diffSize = JSON.stringify(finalDiff).length;
    const savings = Math.round(((fullSize - diffSize) / fullSize) * 100);
    const changedFields = Array.from(new Set(changes.map((c: any) => c.path[0])));
    
    console.log(`📦 Zundo ${diffType} diff: ${diffSize} bytes (${savings}% smaller than full state)`);
    console.log(`🔍 Changed fields: [${changedFields.join(', ')}] (${changes.length} granular changes)`);
    
    if (diffType === 'granular' && changes.length <= 10) {
      console.log(`🔬 Granular changes:`, changes.map((c: any) => `${c.path.join('.')}: ${c.type}`));
    }
  }
  
  return finalDiff;
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

/**
 * Reconstruct display data from minimal diff for rich context in UI
 * Combines minimal stored changes with current state to show complete elements
 */
export function reconstructDisplayData(minimalDiff: any, currentState: any): any {
  if (!minimalDiff?.__diffMetadata?.needsReconstruction || !currentState) {
    return minimalDiff;
  }
  
  const { changes } = minimalDiff.__diffMetadata;
  
  // Filter current state excluding fields that shouldn't be tracked
  const excludedFields = new Set(['debugPanel', 'renderVersion', 'floatingToolbarUpdateTimestamp']);
  const filteredCurrent = Object.fromEntries(
    Object.entries(currentState).filter(([key]) => !excludedFields.has(key))
  );
  
  // Use the existing display reconstruction function
  const displayData = applyMicrodiffChanges(
    changes.map((change: any) => ({
      path: change.path.split('.'),
      type: change.type,
      oldValue: change.oldValue,
      value: change.value
    })), 
    filteredCurrent
  );
  
  // Preserve metadata for highlighting
  displayData.__diffMetadata = minimalDiff.__diffMetadata;
  
  return displayData;
}
