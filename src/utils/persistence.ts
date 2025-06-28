/**
 * Utilities for persisting user preferences to localStorage
 */

export interface UserPreferences {
  // Viewport preferences
  zoom: number;
  
  // Grid preferences
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showLabels: boolean;
  
  // Feature preferences
  showControlPoints: boolean;
  showCommandPoints: boolean;
  wireframeMode: boolean;
  
  // Creation tools preferences
  useRelativeCommands: boolean;

  // Precision of points (optional)
  precision?: number;
}

const STORAGE_KEY = 'svg-editor-preferences';

const defaultPreferences: UserPreferences = {
  zoom: 1,
  gridEnabled: false,
  gridSize: 10,
  snapToGrid: false,
  showLabels: true,
  showControlPoints: true,
  showCommandPoints: true,
  wireframeMode: false,
  useRelativeCommands: false,
  precision: 2,
};

/**
 * Load user preferences from localStorage
 */
export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultPreferences;
    }
    
    const parsed = JSON.parse(stored);
    
    // Validate and merge with defaults to handle missing fields
    return {
      zoom: typeof parsed.zoom === 'number' ? Math.max(0.1, Math.min(10, parsed.zoom)) : defaultPreferences.zoom,
      gridEnabled: typeof parsed.gridEnabled === 'boolean' ? parsed.gridEnabled : defaultPreferences.gridEnabled,
      gridSize: typeof parsed.gridSize === 'number' ? Math.max(1, Math.min(100, parsed.gridSize)) : defaultPreferences.gridSize,
      snapToGrid: typeof parsed.snapToGrid === 'boolean' ? parsed.snapToGrid : defaultPreferences.snapToGrid,
      showLabels: typeof parsed.showLabels === 'boolean' ? parsed.showLabels : defaultPreferences.showLabels,
      showControlPoints: typeof parsed.showControlPoints === 'boolean' ? parsed.showControlPoints : defaultPreferences.showControlPoints,
      showCommandPoints: typeof parsed.showCommandPoints === 'boolean' ? parsed.showCommandPoints : defaultPreferences.showCommandPoints,
      wireframeMode: typeof parsed.wireframeMode === 'boolean' ? parsed.wireframeMode : defaultPreferences.wireframeMode,
      useRelativeCommands: typeof parsed.useRelativeCommands === 'boolean' ? parsed.useRelativeCommands : defaultPreferences.useRelativeCommands,
      precision: typeof parsed.precision === 'number' ? Math.max(0, Math.min(8, parsed.precision)) : defaultPreferences.precision,
    };
  } catch (error) {
    console.warn('Failed to load preferences from localStorage:', error);
    return defaultPreferences;
  }
}

/**
 * Save user preferences to localStorage
 */
export function savePreferences(preferences: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save preferences to localStorage:', error);
  }
}

/**
 * Clear all saved preferences
 */
export function clearPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear preferences from localStorage:', error);
  }
}
