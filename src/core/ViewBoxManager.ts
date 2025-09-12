import { EditorState, BoundingBox } from '../types';
import { calculateGlobalViewBox } from '../utils/viewbox-utils';
import { getAllPathsBounds } from '../utils/path-utils';

export interface ViewBoxOptions {
  padding?: number;
  minWidth?: number;
  minHeight?: number;
  maintainAspectRatio?: boolean;
  useContentBounds?: boolean;
  useContainerBounds?: boolean;
}

export interface ViewBoxUpdateResult {
  viewBox: BoundingBox;
  changed: boolean;
  source: 'content' | 'container' | 'resize' | 'manual';
}

class ViewBoxManagerClass {
  private updateCallback: ((viewBox: BoundingBox, source: string) => void) | null = null;
  private lastViewBox: BoundingBox | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private svgElement: SVGSVGElement | null = null;
  private containerElement: HTMLElement | null = null;

  /**
   * Set callback for viewBox updates
   */
  setUpdateCallback(callback: (viewBox: BoundingBox, source: string) => void) {
    this.updateCallback = callback;
  }

  /**
   * Initialize the ViewBoxManager with SVG and container references
   */
  initialize(svgElement?: SVGSVGElement, containerElement?: HTMLElement) {
    if (svgElement) {
      this.svgElement = svgElement;
    } else {
      // Auto-detect SVG element
      this.svgElement = document.querySelector('#svg-editor svg') as SVGSVGElement;
    }

    if (containerElement) {
      this.containerElement = containerElement;
    } else {
      // Auto-detect container
      this.containerElement = document.querySelector('#svg-editor') as HTMLElement ||
                             document.querySelector('.editor-container') as HTMLElement ||
                             document.querySelector('[data-editor-container]') as HTMLElement;
    }

    this.setupResizeObserver();
  }

  /**
   * Setup ResizeObserver to monitor container size changes
   */
  private setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined' && this.containerElement) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.handleContainerResize(entry.contentRect);
        }
      });
      this.resizeObserver.observe(this.containerElement);
    }
  }

  /**
   * Handle container resize events
   */
  private handleContainerResize(rect: DOMRectReadOnly) {
    const newViewBox = this.calculateViewBoxFromContainer(rect, {
      padding: 20,
      maintainAspectRatio: true
    });

    if (newViewBox && this.hasViewBoxChanged(newViewBox)) {
      this.updateViewBox(newViewBox, 'resize');
    }
  }

  /**
   * Calculate viewBox from content bounds
   */
  calculateViewBoxFromContent(state: EditorState, options: ViewBoxOptions = {}): BoundingBox | null {
    const {
      padding = 20,
      minWidth = 100,
      minHeight = 100,
      maintainAspectRatio = false
    } = options;

    // Try to get bounds from actual SVG element first
    if (this.svgElement) {
      const viewBoxResult = calculateGlobalViewBox(this.svgElement, 2);
      if (viewBoxResult && viewBoxResult.width > 0 && viewBoxResult.height > 0) {
        // Parse the viewBox string "x y width height"
        const [x, y, width, height] = viewBoxResult.viewBox.split(' ').map(Number);
        return { x, y, width, height };
      }
    }

    // Fallback to calculating from state
    const bounds = getAllPathsBounds(state.paths);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }

    let viewBoxWidth = Math.max(bounds.width + padding * 2, minWidth);
    let viewBoxHeight = Math.max(bounds.height + padding * 2, minHeight);

    if (maintainAspectRatio && this.containerElement) {
      const containerRect = this.containerElement.getBoundingClientRect();
      const containerAspect = containerRect.width / containerRect.height;
      const contentAspect = viewBoxWidth / viewBoxHeight;

      if (contentAspect > containerAspect) {
        // Content is wider, adjust height
        viewBoxHeight = viewBoxWidth / containerAspect;
      } else {
        // Content is taller, adjust width
        viewBoxWidth = viewBoxHeight * containerAspect;
      }
    }

    return {
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: viewBoxWidth,
      height: viewBoxHeight
    };
  }

  /**
   * Calculate viewBox from container dimensions
   */
  calculateViewBoxFromContainer(rect: DOMRectReadOnly, options: ViewBoxOptions = {}): BoundingBox | null {
    const {
      padding = 20,
      minWidth = 100,
      minHeight = 100
    } = options;

    if (rect.width < minWidth || rect.height < minHeight) {
      return null;
    }

    // Calculate viewBox that matches container aspect ratio
    const aspectRatio = rect.width / rect.height;
    let viewBoxWidth = Math.max(rect.width, minWidth);
    let viewBoxHeight = Math.max(rect.height, minHeight);

    // Adjust for aspect ratio
    if (viewBoxWidth / viewBoxHeight !== aspectRatio) {
      if (viewBoxWidth / viewBoxHeight > aspectRatio) {
        viewBoxHeight = viewBoxWidth / aspectRatio;
      } else {
        viewBoxWidth = viewBoxHeight * aspectRatio;
      }
    }

    // Center the viewBox
    const centerX = 0;
    const centerY = 0;

    return {
      x: centerX - viewBoxWidth / 2,
      y: centerY - viewBoxHeight / 2,
      width: viewBoxWidth,
      height: viewBoxHeight
    };
  }

  /**
   * Update viewBox from content with intelligent sizing
   */
  updateViewBoxFromContent(state: EditorState, options: ViewBoxOptions = {}): ViewBoxUpdateResult | null {
    const newViewBox = this.calculateViewBoxFromContent(state, {
      padding: 20,
      minWidth: 200,
      minHeight: 150,
      maintainAspectRatio: true,
      ...options
    });

    if (!newViewBox) {
      return null;
    }

    const changed = this.hasViewBoxChanged(newViewBox);
    if (changed) {
      this.updateViewBox(newViewBox, 'content');
    }

    return {
      viewBox: newViewBox,
      changed,
      source: 'content'
    };
  }

  /**
   * Update viewBox from container dimensions
   */
  updateViewBoxFromContainer(options: ViewBoxOptions = {}): ViewBoxUpdateResult | null {
    if (!this.containerElement) {
      return null;
    }

    const rect = this.containerElement.getBoundingClientRect();
    const newViewBox = this.calculateViewBoxFromContainer(rect, {
      padding: 20,
      minWidth: 200,
      minHeight: 150,
      ...options
    });

    if (!newViewBox) {
      return null;
    }

    const changed = this.hasViewBoxChanged(newViewBox);
    if (changed) {
      this.updateViewBox(newViewBox, 'container');
    }

    return {
      viewBox: newViewBox,
      changed,
      source: 'container'
    };
  }

  /**
   * Force recalculate viewBox with hybrid approach
   */
  recalculateViewBox(state: EditorState, options: ViewBoxOptions = {}): ViewBoxUpdateResult | null {
    const {
      useContentBounds = true,
      useContainerBounds = true,
      ...otherOptions
    } = options;

    let newViewBox: BoundingBox | null = null;

    // Try content-based calculation first
    if (useContentBounds) {
      newViewBox = this.calculateViewBoxFromContent(state, otherOptions);
    }

    // If no content bounds or requested, try container-based
    if ((!newViewBox || !useContentBounds) && useContainerBounds) {
      const containerViewBox = this.calculateViewBoxFromContainer(
        this.containerElement?.getBoundingClientRect() || new DOMRect(),
        otherOptions
      );

      if (containerViewBox) {
        if (!newViewBox) {
          newViewBox = containerViewBox;
        } else {
          // Merge content and container bounds intelligently
          const contentArea = newViewBox.width * newViewBox.height;
          const containerArea = containerViewBox.width * containerViewBox.height;

          // Use the larger viewBox but maintain content positioning
          if (containerArea > contentArea) {
            newViewBox = {
              x: Math.min(newViewBox.x, containerViewBox.x),
              y: Math.min(newViewBox.y, containerViewBox.y),
              width: Math.max(newViewBox.width, containerViewBox.width),
              height: Math.max(newViewBox.height, containerViewBox.height)
            };
          }
        }
      }
    }

    if (!newViewBox) {
      return null;
    }

    const changed = this.hasViewBoxChanged(newViewBox);
    if (changed) {
      this.updateViewBox(newViewBox, 'manual');
    }

    return {
      viewBox: newViewBox,
      changed,
      source: 'manual'
    };
  }

  /**
   * Check if viewBox has changed significantly
   */
  private hasViewBoxChanged(newViewBox: BoundingBox): boolean {
    if (!this.lastViewBox) {
      return true;
    }

    const threshold = 1; // 1 unit threshold
    return (
      Math.abs(newViewBox.x - this.lastViewBox.x) > threshold ||
      Math.abs(newViewBox.y - this.lastViewBox.y) > threshold ||
      Math.abs(newViewBox.width - this.lastViewBox.width) > threshold ||
      Math.abs(newViewBox.height - this.lastViewBox.height) > threshold
    );
  }

  /**
   * Update viewBox and notify callback
   */
  private updateViewBox(viewBox: BoundingBox, source: string) {
    this.lastViewBox = { ...viewBox };
    
    if (this.updateCallback) {
      this.updateCallback(viewBox, source);
    }
  }

  /**
   * Handle window resize (called externally)
   */
  handleWindowResize() {
    if (this.containerElement) {
      const rect = this.containerElement.getBoundingClientRect();
      this.handleContainerResize(rect);
    }
  }

  /**
   * Handle orientation change (called externally)
   */
  handleOrientationChange() {
    // Small delay to ensure DOM has updated
    setTimeout(() => {
      this.handleWindowResize();
    }, 100);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.updateCallback = null;
    this.lastViewBox = null;
    this.svgElement = null;
    this.containerElement = null;
  }
}

export const viewBoxManager = new ViewBoxManagerClass();