/**
 * Centralized Configuration System for SSPE
 * 
 * Replaces magic numbers scattered throughout the codebase with
 * a type-safe, centralized configuration system.
 */

/**
 * UI Layout and Sizing Constants
 */
export const UI_CONSTANTS = {
  // Z-Index Management
  Z_INDEX: {
    PATHS: 1000,
    TEXTS: 2000,
    IMAGES: 3000,
    SYMBOLS: 4000,
    GROUPS: 5000,
    HANDLES: 6000,
    FLOATING_TOOLBAR: 9000,
    OVERLAYS: 9500,
    MODALS: 10000,
    STEP: 100
  },

  // Toolbar Configuration
  TOOLBAR: {
    DESKTOP_BUTTON_SIZE: 32,
    MOBILE_BUTTON_SIZE: 28,
    ICON_SIZE: 20,
    PADDING: 8,
    BORDER_RADIUS: 6,
    MAX_VISIBLE_BUTTONS: {
      DESKTOP: 10,
      MOBILE: 9
    }
  },

  // Touch Targets (WCAG Compliance)
  TOUCH_TARGET: {
    MIN_SIZE: 44, // WCAG AA minimum
    RECOMMENDED_SIZE: 48,
    MIN_SPACING: 8
  },

  // Viewport and Canvas
  CANVAS: {
    DEFAULT_WIDTH: 800,
    DEFAULT_HEIGHT: 600,
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 10,
    ZOOM_STEP: 0.1,
    PAN_SENSITIVITY: 1,
    GRID_SIZE: 20
  },

  // Animation and Timing
  ANIMATION: {
    DURATION: {
      FAST: 150,
      NORMAL: 250,
      SLOW: 500
    },
    EASING: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)'
    }
  },

  // Layout Offsets
  LAYOUT: {
    BASE_OFFSET: 32,
    SIDEBAR_WIDTH: 280,
    TOOLBAR_HEIGHT: 48,
    PANEL_PADDING: 16,
    SECTION_SPACING: 24
  }
} as const;

/**
 * Performance and Memory Constants
 */
export const PERFORMANCE_CONSTANTS = {
  // RAF and Rendering
  RAF_THROTTLE_MS: 16, // 60fps
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,

  // Memory Management
  SELECTION_CACHE_SIZE: 1000,
  ANIMATION_BUFFER_SIZE: 100,
  UNDO_HISTORY_LIMIT: 50,

  // Chunking and Pagination
  CHUNK_SIZE_WARNING_LIMIT: 1500,
  VIRTUAL_LIST_BUFFER: 10,
  LAZY_LOAD_THRESHOLD: 20,

  // Network and File Operations
  MAX_FILE_SIZE_MB: 50,
  REQUEST_TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3
} as const;

/**
 * Color Palette and Theming
 */
export const COLOR_CONSTANTS = {
  // Brand Colors
  PRIMARY: '#007AFF',
  SECONDARY: '#5856D6',
  ACCENT: '#FF9500',
  
  // Status Colors
  SUCCESS: '#34C759',
  WARNING: '#FF9500',
  ERROR: '#FF3B30',
  INFO: '#007AFF',

  // Neutral Colors
  BACKGROUND: '#FFFFFF',
  SURFACE: '#F2F2F7',
  BORDER: '#C7C7CC',
  TEXT_PRIMARY: '#000000',
  TEXT_SECONDARY: '#8E8E93',
  TEXT_TERTIARY: '#C7C7CC',

  // Selection and Interaction
  SELECTION: '#007AFF',
  HOVER: 'rgba(0, 122, 255, 0.1)',
  ACTIVE: 'rgba(0, 122, 255, 0.2)',
  FOCUS: 'rgba(0, 122, 255, 0.3)'
} as const;

/**
 * Editor-Specific Constants
 */
export const EDITOR_CONSTANTS = {
  // Path and Shape Settings
  PATH: {
    DEFAULT_STROKE_WIDTH: 2,
    MIN_STROKE_WIDTH: 0.5,
    MAX_STROKE_WIDTH: 100,
    HANDLE_SIZE: 8,
    CONTROL_POINT_SIZE: 6
  },

  // Text Settings
  TEXT: {
    DEFAULT_FONT_SIZE: 16,
    MIN_FONT_SIZE: 8,
    MAX_FONT_SIZE: 144,
    LINE_HEIGHT_RATIO: 1.2,
    DEFAULT_FONT_FAMILY: 'Arial, sans-serif'
  },

  // Selection and Handles
  SELECTION: {
    HANDLE_SIZE: 8,
    HANDLE_BORDER_WIDTH: 2,
    BOUNDING_BOX_PADDING: 4,
    MULTI_SELECT_THRESHOLD: 3
  },

  // Snapping and Guidelines
  SNAP: {
    DISTANCE_THRESHOLD: 10,
    GUIDELINE_OPACITY: 0.5,
    STICKY_DISTANCE: 5
  }
} as const;

/**
 * Mobile and Responsive Constants
 */
export const MOBILE_CONSTANTS = {
  // Breakpoints
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1200
  },

  // iOS Safe Areas
  SAFE_AREA: {
    TOP: 44,
    BOTTOM: 34,
    SIDES: 0
  },

  // Touch Gestures
  GESTURES: {
    TAP_TIMEOUT: 300,
    DOUBLE_TAP_DELAY: 300,
    LONG_PRESS_DELAY: 500,
    PINCH_THRESHOLD: 10,
    PAN_THRESHOLD: 10
  }
} as const;

/**
 * Development and Debugging Constants
 */
export const DEBUG_CONSTANTS = {
  // Logging Levels
  LOG_LEVEL: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    VERBOSE: 4
  },

  // Performance Monitoring
  PERFORMANCE_MARKS: {
    RENDER_START: 'render-start',
    RENDER_END: 'render-end',
    INTERACTION_START: 'interaction-start',
    INTERACTION_END: 'interaction-end'
  }
} as const;

/**
 * Type-safe configuration accessor
 */
export type UIConstants = typeof UI_CONSTANTS;
export type PerformanceConstants = typeof PERFORMANCE_CONSTANTS;
export type ColorConstants = typeof COLOR_CONSTANTS;
export type EditorConstants = typeof EDITOR_CONSTANTS;
export type MobileConstants = typeof MOBILE_CONSTANTS;
export type DebugConstants = typeof DEBUG_CONSTANTS;

/**
 * Utility functions for working with constants
 */
export const ConfigUtils = {
  /**
   * Get responsive value based on screen width
   */
  getResponsiveValue<T>(mobile: T, tablet: T, desktop: T): T {
    if (typeof window === 'undefined') return desktop;
    
    const width = window.innerWidth;
    if (width < MOBILE_CONSTANTS.BREAKPOINTS.MOBILE) return mobile;
    if (width < MOBILE_CONSTANTS.BREAKPOINTS.TABLET) return tablet;
    return desktop;
  },

  /**
   * Calculate touch-safe size
   */
  getTouchSafeSize(size: number): number {
    return Math.max(size, UI_CONSTANTS.TOUCH_TARGET.MIN_SIZE);
  },

  /**
   * Get z-index for element type
   */
  getZIndex(type: keyof typeof UI_CONSTANTS.Z_INDEX, offset = 0): number {
    return UI_CONSTANTS.Z_INDEX[type] + offset;
  },

  /**
   * Check if current environment is mobile
   */
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_CONSTANTS.BREAKPOINTS.MOBILE;
  }
};

// Export all constants as a single object for convenience
export const CONFIG = {
  UI: UI_CONSTANTS,
  PERFORMANCE: PERFORMANCE_CONSTANTS,
  COLORS: COLOR_CONSTANTS,
  EDITOR: EDITOR_CONSTANTS,
  MOBILE: MOBILE_CONSTANTS,
  DEBUG: DEBUG_CONSTANTS,
  UTILS: ConfigUtils
} as const;
