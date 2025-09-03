import { useEditorStore } from './editorStore';
import microdiff from 'microdiff';

/**
 * Fields and paths that should be excluded from diff tracking and storage
 * These are typically UI-only states that don't need to be preserved in undo/redo
 */
const EXCLUDED_FIELDS = new Set([
  'debugPanel',                    // Debug UI state
  'renderVersion',                 // Internal render counter
  'floatingToolbarUpdateTimestamp', // UI update timestamp
  'history',                       // Zundo history state - don't track its changes
  'deepSelection',                 // Deep selection state - UI only
  '__diffMetadata'                 // CRITICAL: Prevent recursive metadata inclusion
]);

const EXCLUDED_PATHS = new Set([
  'selection.selectionBox'         // Selection box coordinates - UI state only
]);

/**
 * Check if a change path should be excluded from diff tracking
 */
function shouldExcludeChange(changePath: string): boolean {
  // Check if this change path should be excluded
  for (const excludedPath of EXCLUDED_PATHS) {
    if (changePath.startsWith(excludedPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Filter state object to exclude non-trackable fields
 */
function filterStateForDiff(state: any): any {
  return Object.fromEntries(
    Object.entries(state).filter(([key, value]) => {
      // Exclude predefined fields
      if (EXCLUDED_FIELDS.has(key)) return false;
      
      // CRITICAL: Exclude all functions from diff tracking
      // Zustand stores include action functions that should never be diffed
      if (typeof value === 'function') return false;
      
      // CRITICAL: Additional safety check for metadata recursion
      // Prevent any metadata-related fields from being included
      if (key.includes('diffMetadata') || key.includes('__diff')) return false;
      
      return true;
    })
  );
}

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


// Removed complex diff functions - using simple field-level diff approach now

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
  const filteredCurrent = filterStateForDiff(currentState);
  const filteredPast = filterStateForDiff(pastState);
  
  // Use microdiff to get granular changes
  const changes = microdiff(filteredPast, filteredCurrent);
  
  // Filter out changes to excluded nested paths
  const filteredChanges = changes.filter((change: any) => {
    const changePath = change.path.join('.');
    return !shouldExcludeChange(changePath);
  });
  
  if (filteredChanges.length === 0) {
    return null; // No changes after filtering - Zundo won't store this
  }
  
  // CRITICAL: If too many fields changed, return null to prevent corruption
  const affectedTopLevelFields = new Set(filteredChanges.map((c: any) => c.path[0])).size;
  const totalStateFields = Object.keys(filteredCurrent).length;
  
  if (affectedTopLevelFields > totalStateFields * 0.8) {
    console.warn(`🚨 WARNING: ${affectedTopLevelFields}/${totalStateFields} top-level fields changed - skipping this state`);
    return null; // Skip storing this state to prevent corruption
  }
  
  // Simple implementation: return only the top-level fields that changed
  // This is what Zundo expects - a simple object with only the changed fields
  const diff: any = {};
  const changedTopLevelFields = new Set(filteredChanges.map((c: any) => c.path[0]));
  
  for (const field of changedTopLevelFields) {
    diff[field] = filteredCurrent[field];
  }
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    const fullSize = JSON.stringify(filteredCurrent).length;
    const diffSize = JSON.stringify(diff).length;
    const savings = fullSize > 0 ? Math.max(0, Math.round(((fullSize - diffSize) / fullSize) * 100)) : 0;
    
    // Safety check - if diff is larger than original, return null to skip
    if (diffSize > fullSize) {
      console.error(`🚨 EMERGENCY: Diff size (${diffSize}) larger than original (${fullSize}) - skipping state`);
      return null;
    }
    
    console.log(`📦 Zundo field-level diff: ${diffSize} bytes (${savings}% smaller than full state)`);
    console.log(`🔍 Changed fields: [${Array.from(changedTopLevelFields).join(', ')}] (${filteredChanges.length} granular changes)`);
    
    if (filteredChanges.length <= 10) {
      console.log(`🔬 Granular changes:`, filteredChanges.map((c: any) => `${c.path.join('.')}: ${c.type}`));
    }
  }
  
  return diff;
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
 * Add additional fields to exclude from diff tracking
 * Useful for dynamically excluding UI-only states
 */
export function addExcludedField(fieldName: string) {
  EXCLUDED_FIELDS.add(fieldName);
}

/**
 * Add additional paths to exclude from diff tracking  
 * Useful for excluding nested properties like 'selection.selectionBox'
 */
export function addExcludedPath(pathPattern: string) {
  EXCLUDED_PATHS.add(pathPattern);
}

/**
 * Get current list of excluded fields and paths (for debugging)
 */
export function getExclusionConfig() {
  return {
    excludedFields: Array.from(EXCLUDED_FIELDS),
    excludedPaths: Array.from(EXCLUDED_PATHS)
  };
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
 * Reconstruct display data from field-level diff for rich context in UI  
 * Since we're now using simple field-level diffs, this just returns the diff as-is
 */
export function reconstructDisplayData(diffData: any, currentState: any): any {
  // With the simplified implementation, diffData is already in the right format
  // It contains only the top-level fields that changed, with their complete values
  return diffData || {};
}
