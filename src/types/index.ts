export type SVGCommandType = 'M' | 'L' | 'C' | 'Z';

// Extended command types for editor modes (not actual SVG commands)
export type EditorCommandType = SVGCommandType | 'PENCIL';

export interface SVGCommand {
  id: string;
  command: SVGCommandType;
  x?: number;
  y?: number;
  x1?: number;  // Control point 1 x for curves
  y1?: number;  // Control point 1 y for curves
  x2?: number;  // Control point 2 x for curves
  y2?: number;  // Control point 2 y for curves
}

export interface SVGSubPath {
  id: string;
  commands: SVGCommand[];
}

export interface SVGPath {
  id: string;
  subPaths: SVGSubPath[];
  style: PathStyle;
}

export interface PathStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeDasharray?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  fillRule?: 'nonzero' | 'evenodd';
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  zoom: number;
  pan: Point;
  viewBox: BoundingBox;
}

export interface SelectionState {
  selectedPaths: string[];
  selectedSubPaths: string[];
  selectedCommands: string[];
  selectedControlPoints: string[];
  selectionBox?: BoundingBox;
}

export interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface GridState {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
  snapToGrid: boolean;
  showLabels: boolean;
}

export interface EditorMode {
  current: 'select' | 'create' | 'edit' | 'pan' | 'zoom';
  createMode?: {
    commandType: EditorCommandType;
    isDrawing: boolean;
    previewCommand?: SVGCommand;
  };
}

export interface EditorState {
  paths: SVGPath[];
  selection: SelectionState;
  viewport: ViewportState;
  grid: GridState;
  mode: EditorMode;
  history: HistoryState;
  isFullscreen: boolean;
  enabledFeatures: Set<string>;
  renderVersion: number; // For forcing re-renders after coordinate conversions
  precision: number; // Nuevo campo: precisión de puntos (decimales)
  visualDebugSizes: {
    globalFactor: number; // Factor global que afecta a todos los puntos
    commandPointsFactor: number; // Factor específico para command points
    controlPointsFactor: number; // Factor específico para control points
    transformResizeFactor: number; // Factor específico para puntos de resize (transform)
    transformRotateFactor: number; // Factor específico para puntos de rotate (transform)
  };
}

// Nuevos tipos para el sistema de puntos de control tipo Figma
export type ControlPointType = 'aligned' | 'mirrored' | 'independent';

export interface ControlPointInfo {
  commandId: string;
  type: ControlPointType;
  incomingHandle: Point | null;
  outgoingHandle: Point | null;
  anchor: Point;
  isBreakable: boolean; // Si se puede separar con Option
  isNextCommandDisplay?: boolean; // Si se está mostrando como "siguiente comando"
}

export interface BezierHandleState {
  controlPoints: Map<string, ControlPointInfo>;
  isOptionPressed: boolean;
  dragState: {
    isDragging: boolean;
    commandId: string | null;
    handleType: 'incoming' | 'outgoing' | null;
    originalType: ControlPointType | null;
    startPoint: Point | null;
    pairInfo?: {
      type: ControlPointType;
      pairedHandle: {
        commandId: string;
        handleType: 'incoming' | 'outgoing';
        anchor: Point;
        controlPoint: 'x1y1' | 'x2y2';
      } | null;
    };
  };
}
