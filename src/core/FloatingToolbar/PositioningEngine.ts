import { ToolbarPosition, BoundingRect } from '../../types/floatingToolbar';
import { SelectionState, ViewportState } from '../../types';
import { useEditorStore } from '../../store/editorStore';

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
    
    // Get rotation handler bounds to avoid overlap
    const rotationHandlerBounds = this.getRotationHandlerBounds(selection, viewport, canvasRect);
    
    // Try different positions in order of preference
    const positions = [
      this.tryPositionTop(screenBounds, toolbarSize, canvasRect, margin, rotationHandlerBounds),
      this.tryPositionBottom(screenBounds, toolbarSize, canvasRect, margin, rotationHandlerBounds),
      this.tryPositionRight(screenBounds, toolbarSize, canvasRect, margin, rotationHandlerBounds),
      this.tryPositionLeft(screenBounds, toolbarSize, canvasRect, margin, rotationHandlerBounds),
    ];

    // Return the first valid position
    for (const position of positions) {
      if (position && this.isPositionValid(position, toolbarSize, canvasRect)) {
        return position;
      }
    }

    // Improved fallback: try multiple fallback positions that are guaranteed to be visible
    const fallbackPositions = [
      // Try center top of selection (considering rotation handler)
      {
        x: screenBounds.x + screenBounds.width / 2 - toolbarSize.width / 2,
        y: rotationHandlerBounds ? 
           Math.min(screenBounds.y - toolbarSize.height - margin, rotationHandlerBounds.y - toolbarSize.height - margin) :
           screenBounds.y - toolbarSize.height - margin,
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
    
    // Try to get bounds from selected elements using DOM first (more reliable)
    const bounds = this.getElementBoundsFromDOM(selection);
    if (bounds) {
            return bounds;
    }

    // Fallback to selection box if available
    if (selection.selectionBox) {
            return selection.selectionBox;
    }

    // Last resort: return a default around the center
    const fallbackBounds = {
      x: viewport.pan.x + viewport.viewBox.width / 2 - 50,
      y: viewport.pan.y + viewport.viewBox.height / 2 - 25,
      width: 100,
      height: 50
    };
        return fallbackBounds;
  }

  private getElementBoundsFromDOM(selection: SelectionState): BoundingRect | null {
        
    const svgElement = document.querySelector('svg');
    if (!svgElement) {
            return null;
    }

    // Get all possible selectors for the selection
    const selectors: string[] = [];
    
    // Build selectors for selected elements - prioritize for SubPath-based system
    
    // 1. SubPaths (HIGHEST priority - primary elements in our system)
    if (selection.selectedSubPaths.length > 0) {
            selection.selectedSubPaths.forEach(id => {
        selectors.push(`[data-subpath-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
        selectors.push(`#${id}`);
      });
    }
    
    // 2. Text elements (second priority - most visually distinct)
    if (selection.selectedTexts.length > 0) {
            selection.selectedTexts.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`text[id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }
    
    // 3. Commands (third priority - part of subpaths)
    if (selection.selectedCommands.length > 0) {
            selection.selectedCommands.forEach(id => {
        selectors.push(`[data-command-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
        selectors.push(`#${id}`);
      });
    }
    
    // 4. Images (fourth priority - visually prominent)
    if (selection.selectedImages.length > 0) {
            selection.selectedImages.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`image[id="${id}"]`);
        selectors.push(`[data-image-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }
    
    // 5. Groups (fifth priority - contain multiple elements)
    if (selection.selectedGroups.length > 0) {
            selection.selectedGroups.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`g[id="${id}"]`);
        selectors.push(`[data-group-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }
    
    // 6. Use elements (sixth priority)
    if (selection.selectedUses.length > 0) {
            selection.selectedUses.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`use[id="${id}"]`);
        selectors.push(`[data-use-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }
    
    // 7. Paths (lowest priority - mainly for legacy support)
    if (selection.selectedPaths.length > 0) {
            selection.selectedPaths.forEach(id => {
        selectors.push(`#${id}`);
        selectors.push(`path[id="${id}"]`);
        selectors.push(`[data-path-id="${id}"]`);
        selectors.push(`[data-element-id="${id}"]`);
      });
    }

    
    // Try to find elements and calculate combined bounds for multiple selections
    const foundElements: { element: Element; rect: DOMRect; selector: string }[] = [];

    for (const selector of selectors) {
      try {
        // Skip invalid selectors that start with numbers when using ID selector
        if (selector.startsWith('#') && /^#\d/.test(selector)) {
          // Use escaped selector or skip
          const escapedId = selector.slice(1); // Remove #
          const elements = document.querySelectorAll(`[id="${escapedId}"]`);
          elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              foundElements.push({ element, rect, selector: `[id="${escapedId}"]` });
            }
          });
        } else {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              foundElements.push({ element, rect, selector });
            }
          });
        }
      } catch (e) {
        // Silently skip invalid selectors instead of logging warnings
        // since ID validation issues are common and not critical
      }
    }

    if (foundElements.length === 0) {
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

    
    // For floating toolbar positioning, we actually want to work with screen coordinates
    // Don't convert to SVG coordinates since the toolbar positioning works in screen space
    const result = {
      x: combinedRect.left,
      y: combinedRect.top,
      width: combinedRect.width,
      height: combinedRect.height
    };
    
        return result;
  }

  private getRotationHandlerBounds(
    selection: SelectionState, 
    viewport: ViewportState, 
    canvasRect: DOMRect
  ): BoundingRect | null {
    // Only calculate rotation handler bounds if we have a valid selection that would show transform handles
    const hasValidSelection = (
      selection.selectedSubPaths.length > 0 || 
      selection.selectedCommands.length > 1 ||
      selection.selectedTexts?.length > 0 ||
      selection.selectedTextPaths?.length > 0 ||
      selection.selectedImages?.length > 0 ||
      selection.selectedUses?.length > 0
    );
    
    if (!hasValidSelection) return null;

    // Get the selection bounds to calculate where the rotation handler would be
    const selectionBounds = this.getSelectionBounds(selection, viewport);
    if (!selectionBounds) return null;

    // Convert to screen coordinates
    const screenBounds = this.svgToScreen(selectionBounds, viewport, canvasRect);
    
    // Calculate rotation handler position using the same logic as TransformManager
    // Import mobile detection values (simplified calculation)
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
    
    // Base handle size calculation (from useMobileDetection hook)
    const baseHandleSize = isMobile ? 44 : isTablet ? 36 : 28;
    
    // Get visual debug size factors from store
    const store = useEditorStore.getState();
    const visualDebugSizes = store.visualDebugSizes || {
      globalFactor: 1,
      transformRotateFactor: 1,
      transformResizeFactor: 1
    };
    
    // Calculate rotation handle size
    const rotateHandleSize = (baseHandleSize * visualDebugSizes.globalFactor * visualDebugSizes.transformRotateFactor) / viewport.zoom;
    
    // Calculate rotation handle offset (same calculation as TransformManager)
    const cornerHandleMargin = (baseHandleSize * visualDebugSizes.globalFactor * visualDebugSizes.transformResizeFactor) / viewport.zoom;
    const baseOffset = 15 / viewport.zoom;
    const resizeHandleRadius = (baseHandleSize * visualDebugSizes.globalFactor * visualDebugSizes.transformResizeFactor) / (2 * viewport.zoom);
    const padding = 8 / viewport.zoom;
    const rotationHandleOffset = baseOffset + cornerHandleMargin + resizeHandleRadius + padding;
    
    // Position of rotation handler (centered above the selection, same as TransformManager)
    const rotationHandlerX = screenBounds.x + screenBounds.width / 2 - rotateHandleSize / 2;
    const rotationHandlerY = screenBounds.y - rotationHandleOffset - rotateHandleSize / 2;
    
    return {
      x: rotationHandlerX,
      y: rotationHandlerY,
      width: rotateHandleSize,
      height: rotateHandleSize
    };
  }

  private svgToScreen(
    bounds: BoundingRect, 
    viewport: ViewportState, 
    canvasRect: DOMRect
  ): BoundingRect {
    // If bounds are already in screen coordinates (from DOM element), return as-is
    // We can detect this by checking if coordinates are already in viewport range
    if (bounds.x >= 0 && bounds.x < window.innerWidth && bounds.y >= 0 && bounds.y < window.innerHeight) {
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
    
        
    return result;
  }

  private tryPositionTop(
    bounds: BoundingRect, 
    toolbarSize: { width: number; height: number },
    canvasRect: DOMRect,
    margin: number,
    rotationHandlerBounds?: BoundingRect | null
  ): ToolbarPosition | null {
    let x = bounds.x + bounds.width / 2 - toolbarSize.width / 2;
    let y = bounds.y - toolbarSize.height - margin;
    
    // Check if rotation handler exists and would overlap
    if (rotationHandlerBounds) {
      const toolbarRect = { x, y, width: toolbarSize.width, height: toolbarSize.height };
      
      // Check for overlap with rotation handler
      if (this.rectsOverlap(toolbarRect, rotationHandlerBounds)) {
        // Position toolbar above the rotation handler with additional margin
        y = rotationHandlerBounds.y - toolbarSize.height - margin;
      }
    }
    
    return { x, y, placement: 'top' };
  }

  private tryPositionBottom(
    bounds: BoundingRect, 
    toolbarSize: { width: number; height: number },
    canvasRect: DOMRect,
    margin: number,
    rotationHandlerBounds?: BoundingRect | null
  ): ToolbarPosition | null {
    const x = bounds.x + bounds.width / 2 - toolbarSize.width / 2;
    const y = bounds.y + bounds.height + margin;
    
    // Bottom position is usually safe from rotation handler overlap since 
    // rotation handler is positioned above the selection
    return { x, y, placement: 'bottom' };
  }

  private tryPositionRight(
    bounds: BoundingRect, 
    toolbarSize: { width: number; height: number },
    canvasRect: DOMRect,
    margin: number,
    rotationHandlerBounds?: BoundingRect | null
  ): ToolbarPosition | null {
    const x = bounds.x + bounds.width + margin;
    let y = bounds.y + bounds.height / 2 - toolbarSize.height / 2;
    
    // Check if rotation handler exists and would overlap vertically
    if (rotationHandlerBounds) {
      const toolbarRect = { x, y, width: toolbarSize.width, height: toolbarSize.height };
      
      // Check for overlap with rotation handler
      if (this.rectsOverlap(toolbarRect, rotationHandlerBounds)) {
        // Shift toolbar down to avoid rotation handler
        y = rotationHandlerBounds.y + rotationHandlerBounds.height + margin;
      }
    }
    
    return { x, y, placement: 'right' };
  }

  private tryPositionLeft(
    bounds: BoundingRect, 
    toolbarSize: { width: number; height: number },
    canvasRect: DOMRect,
    margin: number,
    rotationHandlerBounds?: BoundingRect | null
  ): ToolbarPosition | null {
    const x = bounds.x - toolbarSize.width - margin;
    let y = bounds.y + bounds.height / 2 - toolbarSize.height / 2;
    
    // Check if rotation handler exists and would overlap vertically
    if (rotationHandlerBounds) {
      const toolbarRect = { x, y, width: toolbarSize.width, height: toolbarSize.height };
      
      // Check for overlap with rotation handler
      if (this.rectsOverlap(toolbarRect, rotationHandlerBounds)) {
        // Shift toolbar down to avoid rotation handler
        y = rotationHandlerBounds.y + rotationHandlerBounds.height + margin;
      }
    }
    
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

  private rectsOverlap(rect1: BoundingRect, rect2: BoundingRect): boolean {
    return !(
      rect1.x + rect1.width <= rect2.x ||   // rect1 is to the left of rect2
      rect2.x + rect2.width <= rect1.x ||   // rect2 is to the left of rect1
      rect1.y + rect1.height <= rect2.y ||  // rect1 is above rect2
      rect2.y + rect2.height <= rect1.y     // rect2 is above rect1
    );
  }
}