export type SVGCommandType = 'M' | 'L' | 'H' | 'V' | 'C' | 'S' | 'Q' | 'T' | 'A' | 'Z' | 
                             'm' | 'l' | 'h' | 'v' | 'c' | 's' | 'q' | 't' | 'a' | 'z';

export interface SVGCommand {
  id: string;
  command: SVGCommandType;
  x?: number;
  y?: number;
  x1?: number;  // Control point 1 x for curves
  y1?: number;  // Control point 1 y for curves
  x2?: number;  // Control point 2 x for curves
  y2?: number;  // Control point 2 y for curves
  rx?: number;  // X radius for arcs
  ry?: number;  // Y radius for arcs
  xAxisRotation?: number;  // X-axis rotation for arcs
  largeArcFlag?: number;   // Large arc flag for arcs
  sweepFlag?: number;      // Sweep flag for arcs
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
    commandType: SVGCommandType;
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
}
