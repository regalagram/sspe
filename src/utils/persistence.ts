const EDITOR_STATE_KEY = 'sspe-editor-state';

// Simple debounce util (per key)
const debounceMap: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
export function debounce<T extends (...args: any[]) => void>(key: string, fn: T, delay = 500): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>) => {
    if (debounceMap[key]) clearTimeout(debounceMap[key]);
    debounceMap[key] = setTimeout(() => {
      fn(...args);
      debounceMap[key] = undefined;
    }, delay);
  };
}

// Save editor state (except SVG) to localStorage
export function saveEditorState(state: any): void {
  try {
    localStorage.setItem(EDITOR_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save editor state to localStorage:', error);
  }
}

// Load editor state from localStorage
export function loadEditorState(): any | null {
  try {
    const stored = localStorage.getItem(EDITOR_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load editor state from localStorage:', error);
    return null;
  }
}