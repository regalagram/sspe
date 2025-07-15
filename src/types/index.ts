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
  locked?: boolean; // If true, subpath is locked and unselectable
}

export interface SVGPath {
  id: string;
  subPaths: SVGSubPath[];
  style: PathStyle;
}

export interface GradientStop {
  id: string;
  offset: number; // 0-1
  color: string;
  opacity?: number;
}

export interface LinearGradient {
  type: 'linear';
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: GradientStop[];
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
}

export interface RadialGradient {
  type: 'radial';
  id: string;
  cx: number;
  cy: number;
  r: number;
  fx?: number;
  fy?: number;
  stops: GradientStop[];
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
}

export interface Pattern {
  type: 'pattern';
  id: string;
  width: number;
  height: number;
  patternUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  patternContentUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  patternTransform?: string;
  content: string; // SVG content inside the pattern
}

export type GradientOrPattern = LinearGradient | RadialGradient | Pattern;

export interface PathStyle {
  fill?: string | GradientOrPattern;
  fillOpacity?: number;
  stroke?: string | GradientOrPattern;
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
  selectedTexts: string[];
  selectedTextSpans: string[];
  selectedGroups: string[]; // Selected group IDs
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
  current: 'select' | 'create' | 'edit' | 'pan' | 'zoom' | 'curves';
  createMode?: {
    commandType: EditorCommandType;
    isDrawing: boolean;
    previewCommand?: SVGCommand;
  };
}

export interface EditorState {
  shapeSize?: number;
  paths: SVGPath[];
  texts: TextElementType[];
  groups: SVGGroup[]; // SVG group elements
  gradients: GradientOrPattern[]; // Imported gradients and patterns
  selection: SelectionState;
  viewport: ViewportState;
  grid: GridState;
  mode: EditorMode;
  history: HistoryState;
  isFullscreen: boolean; 
  enabledFeatures: {
    commandPointsEnabled: boolean;
    controlPointsEnabled: boolean;
    wireframeEnabled: boolean;
    hidePointsInSelect: boolean;
  };
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

// Text Element Types
export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textDecoration?: 'none' | 'underline' | 'overline' | 'line-through';
  textAnchor?: 'start' | 'middle' | 'end';
  dominantBaseline?: 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top';
  fill?: string | GradientOrPattern;
  fillOpacity?: number;
  stroke?: string | GradientOrPattern;
  strokeWidth?: number;
  strokeOpacity?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  lineHeight?: number;
}

export interface TextElement {
  id: string;
  type: 'text';
  content: string;
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
  transform?: string;
  style: TextStyle;
  locked?: boolean;
}

// Multi-line text support
export interface TextSpan {
  id: string;
  content: string;
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
  style?: Partial<TextStyle>;
}

export interface MultilineTextElement {
  id: string;
  type: 'multiline-text';
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
  transform?: string;
  spans: TextSpan[];
  style: TextStyle;
  locked?: boolean;
}

export type TextElementType = TextElement | MultilineTextElement;

// SVG Group Types
export interface SVGGroup {
  id: string;
  name?: string; // Optional name for the group
  transform?: string; // Group-level transformations
  style?: Partial<PathStyle>; // Inherited styles for group children
  children: SVGGroupChild[]; // Child elements
  locked?: boolean; // If true, group is locked and unselectable
  visible?: boolean; // Group visibility
}

export interface SVGGroupChild {
  type: 'path' | 'text' | 'group';
  id: string; // Reference to the actual element ID
}

// Update existing types to include groups
export type ElementType = 'path' | 'text' | 'multiline-text' | 'group';
