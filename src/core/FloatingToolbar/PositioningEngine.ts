import { ToolbarPosition, BoundingRect } from '../../types/floatingToolbar';
import { SelectionState, ViewportState } from '../../types';

export class PositioningEngine {
  private static instance: PositioningEngine;
  
  static getInstance(): PositioningEngine {
    if (!PositioningEngine.instance) {
      PositioningEngine.instance = new PositioningEngine();
    }
    return PositioningEngine.instance;
  }

  calculatePosition(
    selection: SelectionState, 
    viewport: ViewportState,
    toolbarSize: { width: number; height: number }
  ): ToolbarPosition | null {
    const selectionBounds = this.getSelectionBounds(selection, viewport);
    if (!selectionBounds) return null;

    const canvasElement = document.querySelector('.svg-editor');
    if (!canvasElement) return null;

    const canvasRect = canvasElement.getBoundingClientRect();
    const margin = 12; // Minimum distance from selection

    // Convert SVG coordinates to screen coordinates
    const screenBounds = this.svgToScreen(selectionBounds, viewport, canvasRect);
    
    // Try different positions in order of preference
    const positions = [
      this.tryPositionTop(screenBounds, toolbarSize, canvasRect, margin),
      this.tryPositionBottom(screenBounds, toolbarSize, canvasRect, margin),
      this.tryPositionRight(screenBounds, toolbarSize, canvasRect, margin),
      this.tryPositionLeft(screenBounds, toolbarSize, canvasRect, margin),
    ];

    // Return the first valid position
    for (const position of positions) {
      if (position && this.isPositionValid(position, toolbarSize, canvasRect)) {
        return position;
      }
    }

    // Improved fallback: try multiple fallback positions that are guaranteed to be visible
    const fallbackPositions = [
      // Try center top of selection
      {
        x: screenBounds.x + screenBounds.width / 2 - toolbarSize.width / 2,
        y: screenBounds.y - toolbarSize.height - margin,
        placement: 'top' as const
      },
      // Try center bottom of selection
      {
        x: screenBounds.x + screenBounds.width / 2 - toolbarSize.width / 2,
        y: screenBounds.y + screenBounds.height + margin,
        placement: 'bottom' as const
      },
      // Try top-left of canvas with some padding
      {
        x: canvasRect.left + 16,
        y: canvasRect.top + 16,
        placement: 'top' as const
      },
      // Try top-right of canvas with some padding
      {
        x: canvasRect.right - toolbarSize.width - 16,
        y: canvasRect.top + 16,
        placement: 'top' as const
      },
      // Try center of canvas
      {
        x: canvasRect.left + canvasRect.width / 2 - toolbarSize.width / 2,
        y: canvasRect.top + 16,
        placement: 'top' as const
      }
    ];

    // Return the first valid fallback position
    for (const fallback of fallbackPositions) {
      if (this.isPositionValid(fallback, toolbarSize, canvasRect)) {
        return fallback;
      }
    }

    // Last resort: force position inside canvas (clamp to bounds)
    const clampedX = Math.max(
      canvasRect.left + 8,
      Math.min(screenBounds.x + screenBounds.width / 2 - toolbarSize.width / 2, canvasRect.right - toolbarSize.width - 8)
    );
    const clampedY = Math.max(
      canvasRect.top + 8,
      Math.min(screenBounds.y - toolbarSize.height - margin, canvasRect.bottom - toolbarSize.height - 8)
    );

    return {
      x: clampedX,
      y: clampedY,
      placement: 'top'
    };
  }

  private getSelectionBounds(selection: SelectionState, viewport: ViewportState): BoundingRect | null {
    console.log('🎯 [PositioningEngine] Selection analysis:', {
      selectionBox: selection.selectionBox,
      selectedTexts: selection.selectedTexts,
      selectedPaths: selection.selectedPaths,
      selectedCommands: selection.selectedCommands,
      viewport: viewport
    });

    // Try to get bounds from selected elements using DOM first (more reliable)
    const bounds = this.getElementBoundsFromDOM(selection);
    if (bounds) {
      console.log('✅ [PositioningEngine] Using DOM bounds:', bounds);
      return bounds;
    }

    // Fallback to selection box if available
    if (selection.selectionBox) {
      console.log('📦 [PositioningEngine] Using selectionBox:', selection.selectionBox);
      return selection.selectionBox;
    }

    // Last resort: return a default around the center
    const fallbackBounds = {
      x: viewport.pan.x + viewport.viewBox.width / 2 - 50,
      y: viewport.pan.y + viewport.viewBox.height / 2 - 25,
      width: 100,
      height: 50
    };
    console.log('⚠️ [PositioningEngine] Using fallback bounds:', fallbackBounds);
    return fallbackBounds;
  }

  private getElementBoundsFromDOM(selection: SelectionState): BoundingRect | null {
    console.log('🔍 [PositioningEngine] Starting DOM element search...');
    
    const svgElement = document.querySelector('svg');
    if (!svgElement) {
      console.log('❌ [PositioningEngine] No SVG element found');
      return null;
    }

    // Get all possible selectors for the selection
    const selectors: string[] = [];
    
    // Build selectors for selected elements - prioritize for SubPath-based system
    
    // 1. SubPaths (HIGHEST priority - primary elements in our system)
    if (selection.selectedSubPaths.length > 0) {
      console.log('🔍 [PositioningEngine] Searching for subpath elements:', selection.selectedSubPaths);
      selection.selectedSubPaths.forEach(id => {
        selectors.push(`[data-subpath-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
        selectors.push(`#${id}`);
      });
    }
    
    // 2. Text elements (second priority - most visually distinct)
    if (selection.selectedTexts.length > 0) {
      console.log('🔍 [PositioningEngine] Searching for text elements:', selection.selectedTexts);
      selection.selectedTexts.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`text[id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }
    
    // 3. Commands (third priority - part of subpaths)
    if (selection.selectedCommands.length > 0) {
      console.log('🔍 [PositioningEngine] Searching for command elements:', selection.selectedCommands);
      selection.selectedCommands.forEach(id => {
        selectors.push(`[data-command-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
        selectors.push(`#${id}`);
      });
    }
    
    // 4. Images (fourth priority - visually prominent)
    if (selection.selectedImages.length > 0) {
      console.log('🔍 [PositioningEngine] Searching for image elements:', selection.selectedImages);
      selection.selectedImages.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`image[id="${id}"]`);
        selectors.push(`[data-image-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }
    
    // 5. Groups (fifth priority - contain multiple elements)
    if (selection.selectedGroups.length > 0) {
      console.log('🔍 [PositioningEngine] Searching for group elements:', selection.selectedGroups);
      selection.selectedGroups.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`g[id="${id}"]`);
        selectors.push(`[data-group-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }
    
    // 6. Use elements (sixth priority)
    if (selection.selectedUses.length > 0) {
      console.log('🔍 [PositioningEngine] Searching for use elements:', selection.selectedUses);
      selection.selectedUses.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`use[id="${id}"]`);
        selectors.push(`[data-use-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }
    
    // 7. Paths (lowest priority - mainly for legacy support)
    if (selection.selectedPaths.length > 0) {
      console.log('🔍 [PositioningEngine] Searching for path elements:', selection.selectedPaths);
      selection.selectedPaths.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`path[id="${id}"]`);
        selectors.push(`[data-path-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }

    console.log('📋 [PositioningEngine] Generated selectors:', selectors);

    // Try to find elements and calculate combined bounds for multiple selections
    const foundElements: { element: Element; rect: DOMRect; selector: string }[] = [];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            foundElements.push({ element, rect, selector });
            console.log(`✓ [PositioningEngine] Found element "${selector}":`, {
              tagName: element.tagName,
              id: element.id,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            });
          }
        });
      } catch (e) {
        console.warn(`❌ [PositioningEngine] Selector "${selector}" failed:`, e);
      }
    }

    if (foundElements.length === 0) {
      console.log('❌ [PositioningEngine] No valid elements found');
      return null;
    }

    // Calculate combined bounding box for all found elements
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    foundElements.forEach(({ rect }) => {
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });

    const combinedRect = {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY
    };

    console.log(`📐 [PositioningEngine] Combined bounds for ${foundElements.length} elements:`, combinedRect);

    // For floating toolbar positioning, we actually want to work with screen coordinates
    // Don't convert to SVG coordinates since the toolbar positioning works in screen space
    const result = {
      x: combinedRect.left,
      y: combinedRect.top,
      width: combinedRect.width,
      height: combinedRect.height
    };
    
    console.log('✅ [PositioningEngine] Using combined screen bounds for toolbar positioning:', result);
    return result;
  }

  private svgToScreen(
    bounds: BoundingRect, 
    viewport: ViewportState, 
    canvasRect: DOMRect
  ): BoundingRect {
    // If bounds are already in screen coordinates (from DOM element), return as-is
    // We can detect this by checking if coordinates are already in viewport range
    if (bounds.x >= 0 && bounds.x < window.innerWidth && bounds.y >= 0 && bounds.y < window.innerHeight) {
      console.log('📐 [PositioningEngine] Bounds already in screen coordinates:', bounds);
      return bounds;
    }
    
    // Otherwise, convert SVG coordinates to screen coordinates
    const scale = viewport.zoom;
    const result = {
      x: canvasRect.left + (bounds.x - viewport.pan.x) * scale,
      y: canvasRect.top + (bounds.y - viewport.pan.y) * scale,
      width: bounds.width * scale,
      height: bounds.height * scale
    };
    
    console.log('📐 [PositioningEngine] SVG to Screen conversion:', {
      svgBounds: bounds,
      viewport: { zoom: viewport.zoom, pan: viewport.pan },
      canvasRect: { left: canvasRect.left, top: canvasRect.top },
      result
    });
    
    return result;
  }

  private tryPositionTop(
    bounds: BoundingRect, 
    toolbarSize: { width: number; height: number },
    canvasRect: DOMRect,
    margin: number
  ): ToolbarPosition | null {
    const x = bounds.x + bounds.width / 2 - toolbarSize.width / 2;
    const y = bounds.y - toolbarSize.height - margin;
    
    return { x, y, placement: 'top' };
  }

  private tryPositionBottom(
    bounds: BoundingRect, 
    toolbarSize: { width: number; height: number },
    canvasRect: DOMRect,
    margin: number
  ): ToolbarPosition | null {
    const x = bounds.x + bounds.width / 2 - toolbarSize.width / 2;
    const y = bounds.y + bounds.height + margin;
    
    return { x, y, placement: 'bottom' };
  }

  private tryPositionRight(
    bounds: BoundingRect, 
    toolbarSize: { width: number; height: number },
    canvasRect: DOMRect,
    margin: number
  ): ToolbarPosition | null {
    const x = bounds.x + bounds.width + margin;
    const y = bounds.y + bounds.height / 2 - toolbarSize.height / 2;
    
    return { x, y, placement: 'right' };
  }

  private tryPositionLeft(
    bounds: BoundingRect, 
    toolbarSize: { width: number; height: number },
    canvasRect: DOMRect,
    margin: number
  ): ToolbarPosition | null {
    const x = bounds.x - toolbarSize.width - margin;
    const y = bounds.y + bounds.height / 2 - toolbarSize.height / 2;
    
    return { x, y, placement: 'left' };
  }

  private isPositionValid(
    position: ToolbarPosition, 
    toolbarSize: { width: number; height: number },
    canvasRect: DOMRect
  ): boolean {
    const margin = 8; // Minimum distance from canvas edges
    
    return (
      position.x >= canvasRect.left + margin &&
      position.y >= canvasRect.top + margin &&
      position.x + toolbarSize.width <= canvasRect.right - margin &&
      position.y + toolbarSize.height <= canvasRect.bottom - margin
    );
  }
}