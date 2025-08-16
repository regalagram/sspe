export interface PencilStorageData {
  strokeStyle: {
    stroke: string;
    strokeWidth: number;
    fill: string;
    strokeLinecap: 'round';
    strokeLinejoin: 'round';
  };
  smootherParams: {
    simplifyTolerance: number;
    smoothingFactor: number;
    minDistance: number;
    pressureDecay: number;
    lowPassAlpha: number;
  };
  rawDrawingMode: boolean;
}

const STORAGE_KEY = 'pencil-tool-settings';

export class PencilStorage {
  static save(data: PencilStorageData): void {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, json);
    } catch (error) {
      console.warn('Failed to save pencil settings to localStorage:', error);
    }
  }

  static load(): PencilStorageData | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return null;
      
      const data = JSON.parse(json) as PencilStorageData;
      
      // Validate the loaded data structure
      if (this.isValidData(data)) {
        return data;
      } else {
        console.warn('Invalid pencil settings data in localStorage, ignoring');
        return null;
      }
    } catch (error) {
      console.warn('Failed to load pencil settings from localStorage:', error);
      return null;
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear pencil settings from localStorage:', error);
    }
  }

  static getDefaults(): PencilStorageData {
    return {
      strokeStyle: {
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      smootherParams: {
        simplifyTolerance: 2.0,
        smoothingFactor: 0.85,
        minDistance: 1.5,
        pressureDecay: 0.7,
        lowPassAlpha: 0.3,
      },
      rawDrawingMode: true
    };
  }

  private static isValidData(data: any): data is PencilStorageData {
    if (!data || typeof data !== 'object') return false;

    // Check strokeStyle
    const strokeStyle = data.strokeStyle;
    if (!strokeStyle || typeof strokeStyle !== 'object') return false;
    if (typeof strokeStyle.stroke !== 'string') return false;
    if (typeof strokeStyle.strokeWidth !== 'number') return false;
    if (typeof strokeStyle.fill !== 'string') return false;
    if (strokeStyle.strokeLinecap !== 'round') return false;
    if (strokeStyle.strokeLinejoin !== 'round') return false;

    // Check smootherParams
    const smootherParams = data.smootherParams;
    if (!smootherParams || typeof smootherParams !== 'object') return false;
    if (typeof smootherParams.simplifyTolerance !== 'number') return false;
    if (typeof smootherParams.smoothingFactor !== 'number') return false;
    if (typeof smootherParams.minDistance !== 'number') return false;
    if (typeof smootherParams.pressureDecay !== 'number') return false;
    if (typeof smootherParams.lowPassAlpha !== 'number') return false;

    // Check rawDrawingMode
    if (typeof data.rawDrawingMode !== 'boolean') return false;

    // Validate ranges
    if (smootherParams.simplifyTolerance < 0.1 || smootherParams.simplifyTolerance > 10) return false;
    if (smootherParams.smoothingFactor < 0 || smootherParams.smoothingFactor > 1) return false;
    if (smootherParams.minDistance < 0.5 || smootherParams.minDistance > 5) return false;
    if (smootherParams.pressureDecay < 0.1 || smootherParams.pressureDecay > 1) return false;
    if (smootherParams.lowPassAlpha < 0.1 || smootherParams.lowPassAlpha > 1) return false;

    return true;
  }

  static createSnapshot(strokeStyle: any, smootherParams: any, rawDrawingMode: boolean = false): PencilStorageData {
    return {
      strokeStyle: { ...strokeStyle },
      smootherParams: { ...smootherParams },
      rawDrawingMode
    };
  }
}
