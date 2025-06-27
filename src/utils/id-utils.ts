let idCounter = 0;

/**
 * Generates a unique ID using timestamp and counter
 */
export function generateId(): string {
  return `${Date.now()}-${++idCounter}`;
}

/**
 * Generates a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Parses a point ID into subPath and command IDs
 */
export function parsePointId(pointId: string): { subPathId: string; commandId: string } | null {
  const parts = pointId.split(':');
  if (parts.length !== 2) return null;
  return { subPathId: parts[0], commandId: parts[1] };
}

/**
 * Creates a point ID from subPath and command IDs
 */
export function createPointId(subPathId: string, commandId: string): string {
  return `${subPathId}:${commandId}`;
}
