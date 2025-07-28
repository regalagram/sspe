export type SVGCommandType = 'M' | 'L' | 'C' | 'Z';

// Extended command types for editor modes (not actual SVG commands)
export type EditorCommandType = SVGCommandType | 'PENCIL' | 'NEW_PATH';

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
  // Additional animatable properties
  stopColor?: string; // Alternative to color for animations
  stopOpacity?: number; // Alternative to opacity for animations
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
  gradientTransform?: string; // Animatable transform
  spreadMethod?: 'pad' | 'reflect' | 'repeat';
  href?: string; // Reference to another gradient
}

export interface RadialGradient {
  type: 'radial';
  id: string;
  cx: number;
  cy: number;
  r: number;
  fx?: number;
  fy?: number;
  fr?: number; // Focal radius
  stops: GradientStop[];
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  gradientTransform?: string; // Animatable transform
  spreadMethod?: 'pad' | 'reflect' | 'repeat';
  href?: string; // Reference to another gradient
}

export interface Pattern {
  type: 'pattern';
  id: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
  patternUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  patternContentUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  patternTransform?: string; // Animatable transform
  preserveAspectRatio?: string;
  viewBox?: string; // Animatable viewBox
  content: string; // SVG content inside the pattern
  href?: string; // Reference to another pattern
}

export type GradientOrPattern = LinearGradient | RadialGradient | Pattern;

export interface PathStyle {
  // Fill properties
  fill?: string | GradientOrPattern;
  fillOpacity?: number;
  fillRule?: 'nonzero' | 'evenodd';
  
  // Stroke properties
  stroke?: string | GradientOrPattern;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeDasharray?: string;
  strokeDashoffset?: number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  strokeMiterlimit?: number;
  
  // Opacity and visibility
  opacity?: number;
  visibility?: 'visible' | 'hidden' | 'collapse';
  
  // Color and rendering
  color?: string;
  colorInterpolation?: 'auto' | 'sRGB' | 'linearRGB';
  colorInterpolationFilters?: 'auto' | 'sRGB' | 'linearRGB';
  colorProfile?: string;
  colorRendering?: 'auto' | 'optimizeSpeed' | 'optimizeQuality';
  
  // Text and font properties
  fontFamily?: string;
  fontSize?: number | string;
  fontSizeAdjust?: number | 'none';
  fontStretch?: 'normal' | 'ultra-condensed' | 'extra-condensed' | 'condensed' | 'semi-condensed' | 'semi-expanded' | 'expanded' | 'extra-expanded' | 'ultra-expanded';
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontVariant?: 'normal' | 'small-caps';
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  
  // Text layout and spacing
  direction?: 'ltr' | 'rtl';
  letterSpacing?: number | 'normal';
  textDecoration?: 'none' | 'underline' | 'overline' | 'line-through';
  textRendering?: 'auto' | 'optimizeSpeed' | 'optimizeLegibility' | 'geometricPrecision';
  unicodeBidi?: 'normal' | 'embed' | 'bidi-override';
  wordSpacing?: number | 'normal';
  writingMode?: 'lr-tb' | 'rl-tb' | 'tb-rl' | 'lr' | 'rl' | 'tb';
  
  // Baseline and alignment
  alignmentBaseline?: 'auto' | 'baseline' | 'before-edge' | 'text-before-edge' | 'middle' | 'central' | 'after-edge' | 'text-after-edge' | 'ideographic' | 'alphabetic' | 'hanging' | 'mathematical';
  baselineShift?: 'baseline' | 'sub' | 'super' | number | string;
  dominantBaseline?: 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top';
  
  // Shape rendering
  shapeRendering?: 'auto' | 'optimizeSpeed' | 'crispEdges' | 'geometricPrecision';
  imageRendering?: 'auto' | 'optimizeSpeed' | 'optimizeQuality';
  
  // Pointer events and interaction
  pointerEvents?: 'auto' | 'none' | 'visiblePainted' | 'visibleFill' | 'visibleStroke' | 'visible' | 'painted' | 'fill' | 'stroke' | 'all';
  cursor?: 'auto' | 'crosshair' | 'default' | 'hand' | 'move' | 'pointer' | 'text' | 'wait' | string;
  
  // Display and overflow
  display?: 'inline' | 'block' | 'list-item' | 'run-in' | 'compact' | 'marker' | 'table' | 'inline-table' | 'table-row-group' | 'table-header-group' | 'table-footer-group' | 'table-row' | 'table-column-group' | 'table-column' | 'table-cell' | 'table-caption' | 'none';
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  
  // Lighting and flood (for filters)
  lightingColor?: string;
  floodColor?: string;
  floodOpacity?: number;
  
  // Stop properties (for gradients)
  stopColor?: string;
  stopOpacity?: number;
  
  // Kerning and glyph orientation
  kerning?: 'auto' | number;
  glyphOrientationHorizontal?: number | 'auto';
  glyphOrientationVertical?: number | 'auto';
  
  // Enable background (for filters)
  enableBackground?: 'accumulate' | 'new' | string;
  
  // Referencias a elementos SVG adicionales
  clipPath?: string; // Referencia a SVGClipPath.id (e.g., "url(#clip1)")
  clipRule?: 'nonzero' | 'evenodd';
  mask?: string; // Referencia a SVGMask.id (e.g., "url(#mask1)")
  filter?: string; // Referencia a SVGFilter.id (e.g., "url(#filter1)")
  markerStart?: string; // Referencia a SVGMarker.id (e.g., "url(#arrowStart)")
  markerMid?: string; // Para vértices intermedios
  markerEnd?: string; // Referencia a SVGMarker.id (e.g., "url(#arrowEnd)")
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
  selectedFilterPrimitives: string[]; // Selected filter primitive IDs
  selectedMarkers: string[]; // Selected marker IDs
  selectedSymbols: string[]; // Selected symbol IDs
  selectedUses: string[]; // Selected use element IDs
  selectedAnimations: string[]; // Selected animation IDs
  selectedGradients: string[]; // Selected gradient IDs
  selectedGradientStops: string[]; // Selected gradient stop IDs
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
  animations: SVGAnimation[]; // Animaciones SVG
  animationState: AnimationState; // Estado de reproducción de animaciones
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
  // Animation synchronization support
  animationSync: {
    chains: AnimationChain[]; // Synchronized animation chains
    events: AnimationEvent[]; // Custom animation events
  };
}

// Animation synchronization types
export interface AnimationChain {
  id: string;
  name?: string;
  animations: {
    animationId: string;
    delay?: number; // Delay relative to chain start
    trigger?: 'start' | 'end' | 'repeat'; // What triggers this animation
    dependsOn?: string; // ID of animation this depends on
  }[];
}

export interface AnimationEvent {
  id: string;
  type: 'beginEvent' | 'endEvent' | 'repeatEvent';
  sourceAnimationId: string;
  timestamp: number;
  handled: boolean;
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
  fontVariant?: 'normal' | 'small-caps';
  fontStretch?: 'normal' | 'ultra-condensed' | 'extra-condensed' | 'condensed' | 'semi-condensed' | 'semi-expanded' | 'expanded' | 'extra-expanded' | 'ultra-expanded';
  textDecoration?: 'none' | 'underline' | 'overline' | 'line-through';
  textAnchor?: 'start' | 'middle' | 'end';
  dominantBaseline?: 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top';
  alignmentBaseline?: 'auto' | 'baseline' | 'before-edge' | 'text-before-edge' | 'middle' | 'central' | 'after-edge' | 'text-after-edge' | 'ideographic' | 'alphabetic' | 'hanging' | 'mathematical';
  baselineShift?: 'baseline' | 'sub' | 'super' | string | number;
  direction?: 'ltr' | 'rtl';
  writingMode?: 'lr-tb' | 'rl-tb' | 'tb-rl' | 'lr' | 'rl' | 'tb';
  textRendering?: 'auto' | 'optimizeSpeed' | 'optimizeLegibility' | 'geometricPrecision';
  fill?: string | GradientOrPattern;
  fillOpacity?: number;
  stroke?: string | GradientOrPattern;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeDasharray?: string | number[];
  strokeDashoffset?: number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  strokeMiterlimit?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  lineHeight?: number;
  textLength?: number;
  lengthAdjust?: 'spacing' | 'spacingAndGlyphs';
  opacity?: number;
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

// Primitivas de filtro completas (todos los filtros estándar SVG) - Ahora con soporte completo de animación
export type FilterPrimitiveType =
  // Filtros básicos
  | { 
      type: 'feGaussianBlur'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      stdDeviation: number; 
      in?: string; 
      result?: string; 
    }
  | { 
      type: 'feOffset'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      dx: number; 
      dy: number; 
      in?: string; 
      result?: string; 
    }
  | { 
      type: 'feFlood'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      floodColor: string; 
      floodOpacity?: number; 
      result?: string; 
    }
  | { 
      type: 'feComposite'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      operator: 'over' | 'in' | 'out' | 'atop' | 'xor' | 'arithmetic'; 
      k1?: number; k2?: number; k3?: number; k4?: number; 
      in?: string; in2?: string; result?: string; 
    }
  | { 
      type: 'feColorMatrix'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      colorMatrixType?: 'matrix' | 'saturate' | 'hueRotate' | 'luminanceToAlpha'; 
      values?: string; 
      result?: string; 
      in?: string; 
    }
  | { 
      type: 'feDropShadow'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      dx: number; dy: number; 
      stdDeviation: number; 
      floodColor: string; 
      floodOpacity?: number; 
      result?: string; 
    }
  | { 
      type: 'feBlend'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      mode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion'; 
      in?: string; in2?: string; result?: string; 
    }
  | { 
      type: 'feMorphology'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      operator: 'erode' | 'dilate'; 
      radius: number; 
      in?: string; result?: string; 
    }
  // Filtros de convolución y efectos especiales
  | { 
      type: 'feConvolveMatrix'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      order: string; 
      kernelMatrix: string; 
      divisor?: number; bias?: number; 
      targetX?: number; targetY?: number; 
      edgeMode?: 'duplicate' | 'wrap' | 'none'; 
      preserveAlpha?: boolean; 
      in?: string; result?: string; 
    }
  | { 
      type: 'feComponentTransfer'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      in?: string; result?: string; 
      funcR?: ComponentTransferFunction; 
      funcG?: ComponentTransferFunction; 
      funcB?: ComponentTransferFunction; 
      funcA?: ComponentTransferFunction; 
    }
  | { 
      type: 'feDiffuseLighting'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      surfaceScale?: number; 
      diffuseConstant?: number; 
      lightingColor?: string; 
      in?: string; result?: string; 
      lightSource: LightSource; 
    }
  | { 
      type: 'feSpecularLighting'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      surfaceScale?: number; 
      specularConstant?: number; 
      specularExponent?: number; 
      lightingColor?: string; 
      in?: string; result?: string; 
      lightSource: LightSource; 
    }
  | { 
      type: 'feDisplacementMap'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      scale?: number; 
      xChannelSelector?: 'R' | 'G' | 'B' | 'A'; 
      yChannelSelector?: 'R' | 'G' | 'B' | 'A'; 
      in?: string; in2?: string; result?: string; 
    }
  | { 
      type: 'feTurbulence'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      baseFrequency: string; 
      numOctaves?: number; 
      seed?: number; 
      stitchTiles?: 'stitch' | 'noStitch'; 
      turbulenceType?: 'fractalNoise' | 'turbulence'; 
      result?: string; 
    }
  | { 
      type: 'feImage'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      href?: string; 
      preserveAspectRatio?: string; 
      crossorigin?: 'anonymous' | 'use-credentials'; 
      result?: string; 
    }
  | { 
      type: 'feTile'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      in?: string; 
      result?: string; 
    }
  | { 
      type: 'feMerge'; 
      id?: string;
      x?: number; y?: number; width?: number; height?: number;
      result?: string; 
      feMergeNodes?: { in: string }[]; 
    }
  // Component transfer function primitives
  | {
      type: 'feFuncR';
      id?: string;
      funcType?: 'identity' | 'table' | 'discrete' | 'linear' | 'gamma';
      tableValues?: string;
      slope?: number;
      intercept?: number;
      amplitude?: number;
      exponent?: number;
      offset?: number;
    }
  | {
      type: 'feFuncG';
      id?: string;
      funcType?: 'identity' | 'table' | 'discrete' | 'linear' | 'gamma';
      tableValues?: string;
      slope?: number;
      intercept?: number;
      amplitude?: number;
      exponent?: number;
      offset?: number;
    }
  | {
      type: 'feFuncB';
      id?: string;
      funcType?: 'identity' | 'table' | 'discrete' | 'linear' | 'gamma';
      tableValues?: string;
      slope?: number;
      intercept?: number;
      amplitude?: number;
      exponent?: number;
      offset?: number;
    }
  | {
      type: 'feFuncA';
      id?: string;
      funcType?: 'identity' | 'table' | 'discrete' | 'linear' | 'gamma';
      tableValues?: string;
      slope?: number;
      intercept?: number;
      amplitude?: number;
      exponent?: number;
      offset?: number;
    };

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
  colorInterpolationFilters?: 'auto' | 'sRGB' | 'linearRGB';
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

// ============================================
// Animation Types
// ============================================

export interface SVGAnimate {
  id: string;
  type: 'animate';
  targetElementId: string; // ID of the element being animated
  attributeName: string; // e.g., 'fill', 'stroke-width', 'opacity'
  attributeType?: 'CSS' | 'XML' | 'auto'; // Type of attribute being animated
  values?: string; // "red;blue;green" or from/to
  from?: string;
  to?: string;
  by?: string; // Relative change value
  dur: string; // "2s", "1000ms"
  begin?: string; // "0s", "click", "mouseover", "element.event+offset"
  end?: string;
  min?: string; // Minimum active duration
  max?: string; // Maximum active duration
  restart?: 'always' | 'whenNotActive' | 'never';
  fill?: 'freeze' | 'remove'; // Final state behavior
  repeatCount?: number | 'indefinite';
  repeatDur?: string; // Total duration for all repetitions
  calcMode?: 'linear' | 'discrete' | 'paced' | 'spline';
  keyTimes?: string; // "0;0.5;1"
  keySplines?: string; // Bezier curves for spline interpolation
  additive?: 'replace' | 'sum'; // Whether animation is additive
  accumulate?: 'none' | 'sum'; // Whether values accumulate
  locked?: boolean;
}

export interface SVGAnimateMotion {
  id: string;
  type: 'animateMotion';
  targetElementId: string; // ID of the element being animated
  path?: string; // SVG path data
  mpath?: string; // Reference to existing path element
  keyPoints?: string; // Progress values along path (0-1 range)
  dur: string;
  begin?: string;
  end?: string;
  min?: string;
  max?: string;
  restart?: 'always' | 'whenNotActive' | 'never';
  fill?: 'freeze' | 'remove';
  repeatCount?: number | 'indefinite';
  repeatDur?: string;
  rotate?: 'auto' | 'auto-reverse' | number; // Rotation along path
  calcMode?: 'linear' | 'discrete' | 'paced' | 'spline';
  keyTimes?: string;
  keySplines?: string;
  additive?: 'replace' | 'sum';
  accumulate?: 'none' | 'sum';
  locked?: boolean;
}

export interface SVGAnimateTransform {
  id: string;
  type: 'animateTransform';
  targetElementId: string; // ID of the element being animated
  attributeName: 'transform';
  attributeType?: 'CSS' | 'XML' | 'auto';
  transformType: 'translate' | 'scale' | 'rotate' | 'skewX' | 'skewY';
  values?: string; // "0;360" for rotation
  from?: string;
  to?: string;
  by?: string;
  dur: string;
  begin?: string;
  end?: string;
  min?: string;
  max?: string;
  restart?: 'always' | 'whenNotActive' | 'never';
  fill?: 'freeze' | 'remove';
  repeatCount?: number | 'indefinite';
  repeatDur?: string;
  additive?: 'replace' | 'sum'; // How to combine with existing transforms
  accumulate?: 'none' | 'sum'; // How to handle repeated animations
  calcMode?: 'linear' | 'discrete' | 'paced' | 'spline';
  keyTimes?: string;
  keySplines?: string;
  locked?: boolean;
}

// Set element for discrete value changes
export interface SVGSet {
  id: string;
  type: 'set';
  targetElementId: string;
  attributeName: string;
  attributeType?: 'CSS' | 'XML' | 'auto';
  to: string; // Single target value
  dur?: string; // Duration (usually not used for set, but for consistency)
  begin?: string;
  end?: string;
  min?: string;
  max?: string;
  restart?: 'always' | 'whenNotActive' | 'never';
  fill?: 'freeze' | 'remove';
  repeatCount?: number | 'indefinite'; // For consistency with other animation types
  calcMode?: 'linear' | 'discrete' | 'paced' | 'spline'; // For consistency
  keyTimes?: string; // For consistency
  keySplines?: string; // For consistency
  locked?: boolean;
}

export type SVGAnimation = SVGAnimate | SVGAnimateMotion | SVGAnimateTransform | SVGSet;

export interface AnimationState {
  isPlaying: boolean;
  currentTime: number; // Current playback time in seconds
  duration: number; // Total duration of all animations
  playbackRate: number; // Playback speed multiplier
  loop: boolean; // Whether to loop animations
  startTime?: number; // Timestamp when playback started (for timer calculations)
  
  // Advanced animation state
  activeAnimations: string[]; // Currently running animation IDs
  pausedAnimations: string[]; // Paused animation IDs
  completedAnimations: string[]; // Completed animation IDs
  
  // Event system
  pendingEvents: AnimationEvent[]; // Events waiting to be processed
  eventListeners: Map<string, ((event: AnimationEvent) => void)[]>; // Event listeners by animation ID
  
  // Synchronization
  syncGroups: Map<string, string[]>; // Groups of synchronized animations
  timeline: AnimationTimelineEntry[]; // Timeline of all animation events
}

export interface AnimationTimelineEntry {
  id: string;
  animationId: string;
  type: 'start' | 'end' | 'repeat';
  time: number; // Time in seconds from timeline start
  processed: boolean;
}

// Geometric attributes for different SVG elements (animatable)
export interface GeometricAttributes {
  // Basic shapes
  cx?: number; // circle, ellipse center x
  cy?: number; // circle, ellipse center y
  r?: number; // circle radius
  rx?: number; // ellipse, rect radius x
  ry?: number; // ellipse, rect radius y
  x?: number; // rect, image, text x position
  y?: number; // rect, image, text y position
  width?: number; // rect, image width
  height?: number; // rect, image height
  
  // Line coordinates
  x1?: number; // line start x
  y1?: number; // line start y
  x2?: number; // line end x
  y2?: number; // line end y
  
  // Path data
  d?: string; // path data
  pathLength?: number; // path length for animations
  
  // Text-specific
  textLength?: number; // desired text length
  lengthAdjust?: 'spacing' | 'spacingAndGlyphs'; // how to adjust text
  startOffset?: number | string; // textPath start offset
  
  // Transform
  transform?: string; // transformation matrix
  
  // ViewBox (for SVG root, symbols, etc.)
  viewBox?: string; // "x y width height"
}

// Comprehensive list of all SVG animatable attributes
export const ANIMATABLE_ATTRIBUTES = {
  // Presentation attributes
  PRESENTATION: [
    'alignment-baseline', 'baseline-shift', 'clip', 'clip-path', 'clip-rule',
    'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering',
    'cursor', 'direction', 'display', 'dominant-baseline', 'enable-background',
    'fill', 'fill-opacity', 'fill-rule', 'filter',
    'flood-color', 'flood-opacity',
    'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight',
    'glyph-orientation-horizontal', 'glyph-orientation-vertical',
    'image-rendering', 'kerning', 'letter-spacing', 'lighting-color',
    'marker-end', 'marker-mid', 'marker-start', 'mask',
    'opacity', 'overflow', 'pointer-events',
    'shape-rendering', 'stop-color', 'stop-opacity',
    'stroke', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width',
    'text-anchor', 'text-decoration', 'text-rendering',
    'unicode-bidi', 'visibility', 'word-spacing', 'writing-mode'
  ],
  
  // Geometric attributes
  GEOMETRIC: [
    'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height',
    'x1', 'y1', 'x2', 'y2', 'd', 'pathLength',
    'textLength', 'lengthAdjust', 'startOffset', 'transform', 'viewBox'
  ],
  
  // Filter-specific attributes
  FILTER: [
    // feGaussianBlur
    'stdDeviation',
    // feOffset
    'dx', 'dy',
    // feFlood
    'flood-color', 'flood-opacity',
    // feTurbulence
    'baseFrequency', 'numOctaves', 'seed',
    // feColorMatrix
    'values',
    // feConvolveMatrix
    'kernelMatrix', 'divisor', 'bias',
    // feBlend
    'mode',
    // feComposite
    'operator', 'k1', 'k2', 'k3', 'k4',
    // feMorphology
    'radius',
    // feDisplacementMap
    'scale', 'xChannelSelector', 'yChannelSelector',
    // feDiffuseLighting, feSpecularLighting
    'surfaceScale', 'diffuseConstant', 'specularConstant', 'specularExponent', 'lighting-color'
  ],
  
  // Gradient and pattern attributes
  GRADIENT: [
    'x1', 'y1', 'x2', 'y2', // linearGradient
    'cx', 'cy', 'r', 'fx', 'fy', // radialGradient
    'offset', 'stop-color', 'stop-opacity', // stop
    'patternTransform', 'patternUnits' // pattern
  ]
};

// Tipo unión para todos los elementos SVG
export type SVGElement = SVGPath | TextElementType | SVGGroup | SVGImage | SVGClipPath | SVGMask | SVGFilter | SVGMarker | SVGSymbol | SVGUse;
