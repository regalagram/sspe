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
  // Referencias a elementos SVG adicionales
  clipPath?: string; // Referencia a SVGClipPath.id (e.g., "url(#clip1)")
  mask?: string; // Referencia a SVGMask.id (e.g., "url(#mask1)")
  filter?: string; // Referencia a SVGFilter.id (e.g., "url(#filter1)")
  markerStart?: string; // Referencia a SVGMarker.id (e.g., "url(#arrowStart)")
  markerMid?: string; // Para vértices intermedios
  markerEnd?: string; // Referencia a SVGMarker.id (e.g., "url(#arrowEnd)")
  opacity?: number; // Opacidad general del elemento
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
  selectedTextPaths: string[];
  selectedGroups: string[]; // Selected group IDs
  selectedImages: string[]; // Selected image IDs
  selectedClipPaths: string[]; // Selected clip path IDs
  selectedMasks: string[]; // Selected mask IDs
  selectedFilters: string[]; // Selected filter IDs
  selectedMarkers: string[]; // Selected marker IDs
  selectedSymbols: string[]; // Selected symbol IDs
  selectedUses: string[]; // Selected use element IDs
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
  textPaths: SVGTextPath[];
  groups: SVGGroup[]; // SVG group elements
  gradients: GradientOrPattern[]; // Imported gradients and patterns
  images: SVGImage[]; // Imágenes embebidas
  clipPaths: SVGClipPath[]; // Clip paths
  masks: SVGMask[]; // Masks
  filters: SVGFilter[]; // Filtros y efectos
  markers: SVGMarker[]; // Marcadores para paths
  symbols: SVGSymbol[]; // Símbolos reutilizables
  uses: SVGUse[]; // Instancias de use
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
    showGroupsFrame: boolean;
    guidelinesEnabled: boolean;
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
  filter?: string;
  clipPath?: string;
  mask?: string;
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

// TextPath Element Types
export interface SVGTextPath {
  id: string;
  type: 'textPath';
  content: string;
  pathRef: string; // Reference to path ID for text to follow
  startOffset?: number | string; // Start position along the path (number or percentage)
  method?: 'align' | 'stretch'; // How text is positioned on path
  spacing?: 'auto' | 'exact'; // Letter spacing method
  side?: 'left' | 'right'; // Which side of the path to place text
  textLength?: number; // Desired length of text
  lengthAdjust?: 'spacing' | 'spacingAndGlyphs'; // How to adjust text to fit textLength
  style: TextStyle;
  transform?: string;
  locked?: boolean;
}

export type TextElementType = TextElement | MultilineTextElement;

// SVG Group Types
export type GroupLockLevel = 'none' | 'selection' | 'editing' | 'movement-sync' | 'full';

export interface SVGGroup {
  id: string;
  name?: string; // Optional name for the group
  transform?: string; // Group-level transformations
  style?: Partial<PathStyle>; // Inherited styles for group children
  children: SVGGroupChild[]; // Child elements
  locked?: boolean; // Legacy: If true, group is locked and unselectable
  lockLevel?: GroupLockLevel; // New: More granular lock control
  visible?: boolean; // Group visibility
}

export interface SVGGroupChild {
  type: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use';
  id: string; // Reference to the actual element ID
}

// Update existing types to include all new elements
export type ElementType = 'path' | 'text' | 'multiline-text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'filter' | 'marker' | 'symbol' | 'use';

// Guidelines and Snapping Types
export interface GuidelinePoint {
  x: number;
  y: number;
  type: 'static' | 'dynamic' | 'grid';
  elementId?: string; // Reference to source element for dynamic guides
  elementType?: 'path' | 'text' | 'group';
  description?: string; // For debugging/tooltips
}

export interface GuideLine {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number; // x for vertical, y for horizontal
  points: GuidelinePoint[]; // Points that align with this guideline
  color?: string;
  visible: boolean;
}

export interface DistanceGuideLine {
  id: string;
  type: 'horizontal' | 'vertical';
  startPosition: number; // Start of the distance segment
  endPosition: number; // End of the distance segment
  distance: number; // The actual distance value
  elements: string[]; // IDs of elements that create this distance pattern
  color?: string;
  visible: boolean;
  dashArray?: string; // For styling (continuous line for distance)
}

export interface DistanceMarker {
  id: string;
  x: number;
  y: number;
  type: 'cross' | 'measurement'; // Visual marker type
  distance: number; // Distance value to display
  color?: string;
}

export interface SnappingConfig {
  enabled: boolean;
  detectionRadius: number; // pixels
  snapDuration: number; // milliseconds
  guidelineColor: string;
  showStaticGuides: boolean;
  showDynamicGuides: boolean;
  showGridGuides: boolean;
  showDistanceGuides: boolean; // Enable distance snapping
  gridSize: number; // pixels
  distanceGuideColor: string; // Color for distance guidelines
  distanceTolerance: number; // pixels - tolerance for distance matching
}

export interface ActiveSnap {
  guidelines: GuideLine[];
  distanceGuidelines: DistanceGuideLine[];
  distanceMarkers: DistanceMarker[];
  snapPoint: Point;
  targetPoint: Point;
  snapTime: number; // timestamp when snap started
}

// ============================================
// Nuevos tipos para elementos SVG adicionales
// ============================================

// Imágenes embebidas (SVG <image>)
export interface SVGImage {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  href: string; // URL o data URI (e.g., "image.png" o "data:image/png;base64,...")
  preserveAspectRatio?: 'none' | 'xMinYMin' | 'xMidYMid' | 'xMaxYMax' | string;
  transform?: string; // Transformaciones (rotate, scale, etc.)
  style?: Partial<PathStyle>; // Estilos como opacity, filter, etc.
  locked?: boolean; // Si está bloqueado para edición
}

// Clip paths (SVG <clipPath>)
export interface SVGClipPath {
  id: string;
  type: 'clipPath';
  clipPathUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  transform?: string; // Transformaciones en el clipPath
  children: SVGGroupChild[]; // Referencias a paths, groups, etc., que forman el clip
  style?: Partial<PathStyle>; // Estilos heredados, aunque clipPath ignora la mayoría
  locked?: boolean;
}

// Masks (SVG <mask>)
export interface SVGMask {
  id: string;
  type: 'mask';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  maskUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  maskContentUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  transform?: string;
  children: SVGGroupChild[]; // Contenido de la máscara (paths, texts, etc.)
  style?: Partial<PathStyle>; // Estilos para el contenido de la máscara
  locked?: boolean;
}

// Primitivas de filtro completas (todos los filtros estándar SVG)
export type FilterPrimitiveType =
  // Filtros básicos
  | { type: 'feGaussianBlur'; stdDeviation: number; in?: string; result?: string; }
  | { type: 'feOffset'; dx: number; dy: number; in?: string; result?: string; }
  | { type: 'feFlood'; floodColor: string; floodOpacity?: number; result?: string; }
  | { type: 'feComposite'; operator: 'over' | 'in' | 'out' | 'atop' | 'xor' | 'arithmetic'; k1?: number; k2?: number; k3?: number; k4?: number; in?: string; in2?: string; result?: string; }
  | { type: 'feColorMatrix'; colorMatrixType?: 'matrix' | 'saturate' | 'hueRotate' | 'luminanceToAlpha'; values?: string; result?: string; in?: string; }
  | { type: 'feDropShadow'; dx: number; dy: number; stdDeviation: number; floodColor: string; floodOpacity?: number; result?: string; }
  | { type: 'feBlend'; mode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion'; in?: string; in2?: string; result?: string; }
  | { type: 'feMorphology'; operator: 'erode' | 'dilate'; radius: number; in?: string; result?: string; }
  // Filtros de convolución y efectos especiales
  | { type: 'feConvolveMatrix'; order: string; kernelMatrix: string; divisor?: number; bias?: number; targetX?: number; targetY?: number; edgeMode?: 'duplicate' | 'wrap' | 'none'; preserveAlpha?: boolean; in?: string; result?: string; }
  | { type: 'feComponentTransfer'; in?: string; result?: string; funcR?: ComponentTransferFunction; funcG?: ComponentTransferFunction; funcB?: ComponentTransferFunction; funcA?: ComponentTransferFunction; }
  | { type: 'feDiffuseLighting'; surfaceScale?: number; diffuseConstant?: number; lightColor?: string; in?: string; result?: string; lightSource: LightSource; }
  | { type: 'feSpecularLighting'; surfaceScale?: number; specularConstant?: number; specularExponent?: number; lightColor?: string; in?: string; result?: string; lightSource: LightSource; }
  | { type: 'feDisplacementMap'; scale?: number; xChannelSelector?: 'R' | 'G' | 'B' | 'A'; yChannelSelector?: 'R' | 'G' | 'B' | 'A'; in?: string; in2?: string; result?: string; }
  | { type: 'feTurbulence'; baseFrequency: string; numOctaves?: number; seed?: number; stitchTiles?: 'stitch' | 'noStitch'; turbulenceType?: 'fractalNoise' | 'turbulence'; result?: string; }
  | { type: 'feImage'; href?: string; preserveAspectRatio?: string; crossorigin?: 'anonymous' | 'use-credentials'; result?: string; }
  | { type: 'feTile'; in?: string; result?: string; }
  // Filtro de transferencia de componentes
  | { type: 'feFuncR'; funcType?: 'identity' | 'table' | 'discrete' | 'linear' | 'gamma'; tableValues?: string; slope?: number; intercept?: number; amplitude?: number; exponent?: number; offset?: number; }
  | { type: 'feFuncG'; funcType?: 'identity' | 'table' | 'discrete' | 'linear' | 'gamma'; tableValues?: string; slope?: number; intercept?: number; amplitude?: number; exponent?: number; offset?: number; }
  | { type: 'feFuncB'; funcType?: 'identity' | 'table' | 'discrete' | 'linear' | 'gamma'; tableValues?: string; slope?: number; intercept?: number; amplitude?: number; exponent?: number; offset?: number; }
  | { type: 'feFuncA'; funcType?: 'identity' | 'table' | 'discrete' | 'linear' | 'gamma'; tableValues?: string; slope?: number; intercept?: number; amplitude?: number; exponent?: number; offset?: number; };

// Tipos auxiliares para filtros complejos
export interface ComponentTransferFunction {
  funcType?: 'identity' | 'table' | 'discrete' | 'linear' | 'gamma';
  tableValues?: string;
  slope?: number;
  intercept?: number;
  amplitude?: number;
  exponent?: number;
  offset?: number;
}

export type LightSource = 
  | { type: 'feDistantLight'; azimuth?: number; elevation?: number; }
  | { type: 'fePointLight'; x?: number; y?: number; z?: number; }
  | { type: 'feSpotLight'; x?: number; y?: number; z?: number; pointsAtX?: number; pointsAtY?: number; pointsAtZ?: number; specularExponent?: number; limitingConeAngle?: number; };

// Filtros (SVG <filter>)
export interface SVGFilter {
  id: string;
  type: 'filter';
  x?: number; // Coordenadas del filter region
  y?: number;
  width?: number;
  height?: number;
  filterUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  primitiveUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  primitives: FilterPrimitiveType[]; // Array de primitivas en orden
  locked?: boolean; // Opcional, si filters son editables
}

// Markers (SVG <marker>)
export interface SVGMarker {
  id: string;
  type: 'marker';
  markerUnits?: 'strokeWidth' | 'userSpaceOnUse';
  refX?: number;
  refY?: number;
  markerWidth?: number;
  markerHeight?: number;
  orient?: 'auto' | 'auto-start-reverse' | number; // Ángulo en grados o 'auto'
  viewBox?: string; // e.g., "0 0 10 10"
  preserveAspectRatio?: string; // Similar a image
  children: SVGGroupChild[]; // Contenido (paths, etc.)
  style?: Partial<PathStyle>; // Estilos para el contenido
  locked?: boolean;
}

// Symbols (SVG <symbol>)
export interface SVGSymbol {
  id: string;
  type: 'symbol';
  viewBox?: string; // e.g., "0 0 100 100"
  preserveAspectRatio?: string;
  children: SVGGroupChild[]; // Contenido reutilizable
  style?: Partial<PathStyle>; // Estilos heredados
  locked?: boolean;
}

// Use elements (SVG <use>)
export interface SVGUse {
  id: string;
  type: 'use';
  href: string; // e.g., "#starSymbol" o "#marker1"
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  transform?: string;
  style?: Partial<PathStyle>; // Overrides locales
  locked?: boolean;
}

// Tipo unión para todos los elementos SVG
export type SVGElement = SVGPath | TextElementType | SVGGroup | SVGImage | SVGClipPath | SVGMask | SVGFilter | SVGMarker | SVGSymbol | SVGUse;
