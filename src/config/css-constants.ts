/**
 * CSS Custom Properties for SSPE Constants
 * 
 * This file exposes our TypeScript constants as CSS custom properties
 * for use in CSS files and styled components.
 */

import { CONFIG } from './constants';

/**
 * Generates CSS custom properties from our configuration
 */
export const generateCSSCustomProperties = (): Record<string, string> => {
  return {
    // Z-Index Values
    '--z-index-paths': CONFIG.UI.Z_INDEX.PATHS.toString(),
    '--z-index-texts': CONFIG.UI.Z_INDEX.TEXTS.toString(),
    '--z-index-images': CONFIG.UI.Z_INDEX.IMAGES.toString(),
    '--z-index-symbols': CONFIG.UI.Z_INDEX.SYMBOLS.toString(),
    '--z-index-groups': CONFIG.UI.Z_INDEX.GROUPS.toString(),
    '--z-index-handles': CONFIG.UI.Z_INDEX.HANDLES.toString(),
    '--z-index-floating-toolbar': CONFIG.UI.Z_INDEX.FLOATING_TOOLBAR.toString(),
    '--z-index-overlays': CONFIG.UI.Z_INDEX.OVERLAYS.toString(),
    '--z-index-modals': CONFIG.UI.Z_INDEX.MODALS.toString(),

    // Toolbar Sizing
    '--toolbar-button-size-desktop': `${CONFIG.UI.TOOLBAR.DESKTOP_BUTTON_SIZE}px`,
    '--toolbar-button-size-mobile': `${CONFIG.UI.TOOLBAR.MOBILE_BUTTON_SIZE}px`,
    '--toolbar-icon-size': `${CONFIG.UI.TOOLBAR.ICON_SIZE}px`,
    '--toolbar-padding': `${CONFIG.UI.TOOLBAR.PADDING}px`,
    '--toolbar-border-radius': `${CONFIG.UI.TOOLBAR.BORDER_RADIUS}px`,

    // Icon Sizing
    '--icon-size-desktop': `${CONFIG.UI.ICONS.DESKTOP_SIZE}px`,
    '--icon-size-mobile': `${CONFIG.UI.ICONS.MOBILE_SIZE}px`,
    '--icon-stroke-width-desktop': CONFIG.UI.ICONS.DESKTOP_STROKE_WIDTH.toString(),
    '--icon-stroke-width-mobile': CONFIG.UI.ICONS.MOBILE_STROKE_WIDTH.toString(),

    // Touch Targets
    '--touch-target-min-size': `${CONFIG.UI.TOUCH_TARGET.MIN_SIZE}px`,
    '--touch-target-recommended-size': `${CONFIG.UI.TOUCH_TARGET.RECOMMENDED_SIZE}px`,
    '--touch-target-min-spacing': `${CONFIG.UI.TOUCH_TARGET.MIN_SPACING}px`,

    // Layout
    '--layout-base-offset': `${CONFIG.UI.LAYOUT.BASE_OFFSET}px`,
    '--layout-sidebar-width': `${CONFIG.UI.LAYOUT.SIDEBAR_WIDTH}px`,
    '--layout-toolbar-height': `${CONFIG.UI.LAYOUT.TOOLBAR_HEIGHT}px`,
    '--layout-panel-padding': `${CONFIG.UI.LAYOUT.PANEL_PADDING}px`,
    '--layout-section-spacing': `${CONFIG.UI.LAYOUT.SECTION_SPACING}px`,

    // Animation Durations
    '--animation-duration-fast': `${CONFIG.UI.ANIMATION.DURATION.FAST}ms`,
    '--animation-duration-normal': `${CONFIG.UI.ANIMATION.DURATION.NORMAL}ms`,
    '--animation-duration-slow': `${CONFIG.UI.ANIMATION.DURATION.SLOW}ms`,

    // Colors
    '--color-primary': CONFIG.COLORS.PRIMARY,
    '--color-secondary': CONFIG.COLORS.SECONDARY,
    '--color-accent': CONFIG.COLORS.ACCENT,
    '--color-success': CONFIG.COLORS.SUCCESS,
    '--color-warning': CONFIG.COLORS.WARNING,
    '--color-error': CONFIG.COLORS.ERROR,
    '--color-info': CONFIG.COLORS.INFO,
    '--color-background': CONFIG.COLORS.BACKGROUND,
    '--color-surface': CONFIG.COLORS.SURFACE,
    '--color-border': CONFIG.COLORS.BORDER,
    '--color-text-primary': CONFIG.COLORS.TEXT_PRIMARY,
    '--color-text-secondary': CONFIG.COLORS.TEXT_SECONDARY,
    '--color-text-tertiary': CONFIG.COLORS.TEXT_TERTIARY,
    '--color-selection': CONFIG.COLORS.SELECTION,
    '--color-hover': CONFIG.COLORS.HOVER,
    '--color-active': CONFIG.COLORS.ACTIVE,
    '--color-focus': CONFIG.COLORS.FOCUS,

    // Canvas
    '--canvas-default-width': `${CONFIG.UI.CANVAS.DEFAULT_WIDTH}px`,
    '--canvas-default-height': `${CONFIG.UI.CANVAS.DEFAULT_HEIGHT}px`,
    '--canvas-grid-size': `${CONFIG.UI.CANVAS.GRID_SIZE}px`,

    // Editor
    '--path-default-stroke-width': `${CONFIG.EDITOR.PATH.DEFAULT_STROKE_WIDTH}px`,
    '--path-handle-size': `${CONFIG.EDITOR.PATH.HANDLE_SIZE}px`,
    '--text-default-font-size': `${CONFIG.EDITOR.TEXT.DEFAULT_FONT_SIZE}px`,
    '--selection-handle-size': `${CONFIG.EDITOR.SELECTION.HANDLE_SIZE}px`,
    '--selection-bounding-box-padding': `${CONFIG.EDITOR.SELECTION.BOUNDING_BOX_PADDING}px`,

    // Mobile Safe Areas
    '--mobile-safe-area-top': `${CONFIG.MOBILE.SAFE_AREA.TOP}px`,
    '--mobile-safe-area-bottom': `${CONFIG.MOBILE.SAFE_AREA.BOTTOM}px`,
    '--mobile-safe-area-sides': `${CONFIG.MOBILE.SAFE_AREA.SIDES}px`,

    // Mobile Breakpoints
    '--breakpoint-mobile': `${CONFIG.MOBILE.BREAKPOINTS.MOBILE}px`,
    '--breakpoint-tablet': `${CONFIG.MOBILE.BREAKPOINTS.TABLET}px`,
    '--breakpoint-desktop': `${CONFIG.MOBILE.BREAKPOINTS.DESKTOP}px`
  };
};

/**
 * CSS string with all custom properties
 */
export const getCSSCustomPropertiesString = (): string => {
  const properties = generateCSSCustomProperties();
  const cssProperties = Object.entries(properties)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  
  return `:root {\n${cssProperties}\n}`;
};

/**
 * Hook to inject CSS custom properties into the document
 */
export const useCSSCustomProperties = (): void => {
  if (typeof document === 'undefined') return;

  // Check if already injected
  if (document.getElementById('sspe-css-constants')) return;

  const style = document.createElement('style');
  style.id = 'sspe-css-constants';
  style.textContent = getCSSCustomPropertiesString();
  document.head.appendChild(style);
};

/**
 * Utility to get CSS variable reference
 */
export const cssVar = (name: string): string => `var(--${name})`;

/**
 * Utility for responsive CSS values
 */
export const responsiveValue = (mobile: string, desktop: string): string => {
  return `clamp(${mobile}, 3vw, ${desktop})`;
};
