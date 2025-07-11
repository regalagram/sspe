import { SVGSubPath } from '../../types';
import { getSubPathBounds } from '../../utils/path-utils';

interface ArrangeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export class ArrangeManager {
  private editorStore: any = null;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  private getSelectedElements(): { subPaths: SVGSubPath[]; bounds: ArrangeBounds[] } {
    if (!this.editorStore) return { subPaths: [], bounds: [] };

    const { paths, selection } = this.editorStore;
    const selectedSubPaths: SVGSubPath[] = [];
    const bounds: ArrangeBounds[] = [];

    // Get selected subpaths
    for (const subPathId of selection.selectedSubPaths) {
      for (const path of paths) {
        const subPath = path.subPaths.find((sp: SVGSubPath) => sp.id === subPathId);
        if (subPath) {
          selectedSubPaths.push(subPath);
          const subPathBounds = getSubPathBounds(subPath);
          if (subPathBounds) {
            bounds.push({
              ...subPathBounds,
              centerX: subPathBounds.x + subPathBounds.width / 2,
              centerY: subPathBounds.y + subPathBounds.height / 2,
            });
          }
          break;
        }
      }
    }

    return { subPaths: selectedSubPaths, bounds };
  }

  private getOverallBounds(bounds: ArrangeBounds[]): ArrangeBounds | null {
    if (bounds.length === 0) return null;

    const minX = Math.min(...bounds.map(b => b.x));
    const minY = Math.min(...bounds.map(b => b.y));
    const maxX = Math.max(...bounds.map(b => b.x + b.width));
    const maxY = Math.max(...bounds.map(b => b.y + b.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  // Alignment operations
  alignLeft() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    const leftmostX = Math.min(...bounds.map(b => b.x));
    
    subPaths.forEach((subPath, index) => {
      const currentBounds = bounds[index];
      const deltaX = leftmostX - currentBounds.x;
      if (deltaX !== 0) {
        this.editorStore.translateSubPath(subPath.id, { x: deltaX, y: 0 });
      }
    });

    this.editorStore.pushToHistory();
  }

  alignCenter() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    const overallBounds = this.getOverallBounds(bounds);
    if (!overallBounds) return;

    subPaths.forEach((subPath, index) => {
      const currentBounds = bounds[index];
      const deltaX = overallBounds.centerX - currentBounds.centerX;
      if (deltaX !== 0) {
        this.editorStore.translateSubPath(subPath.id, { x: deltaX, y: 0 });
      }
    });

    this.editorStore.pushToHistory();
  }

  alignRight() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    const rightmostX = Math.max(...bounds.map(b => b.x + b.width));
    
    subPaths.forEach((subPath, index) => {
      const currentBounds = bounds[index];
      const deltaX = rightmostX - (currentBounds.x + currentBounds.width);
      if (deltaX !== 0) {
        this.editorStore.translateSubPath(subPath.id, { x: deltaX, y: 0 });
      }
    });

    this.editorStore.pushToHistory();
  }

  alignTop() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    const topmostY = Math.min(...bounds.map(b => b.y));
    
    subPaths.forEach((subPath, index) => {
      const currentBounds = bounds[index];
      const deltaY = topmostY - currentBounds.y;
      if (deltaY !== 0) {
        this.editorStore.translateSubPath(subPath.id, { x: 0, y: deltaY });
      }
    });

    this.editorStore.pushToHistory();
  }

  alignMiddle() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    const overallBounds = this.getOverallBounds(bounds);
    if (!overallBounds) return;

    subPaths.forEach((subPath, index) => {
      const currentBounds = bounds[index];
      const deltaY = overallBounds.centerY - currentBounds.centerY;
      if (deltaY !== 0) {
        this.editorStore.translateSubPath(subPath.id, { x: 0, y: deltaY });
      }
    });

    this.editorStore.pushToHistory();
  }

  alignBottom() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    const bottommostY = Math.max(...bounds.map(b => b.y + b.height));
    
    subPaths.forEach((subPath, index) => {
      const currentBounds = bounds[index];
      const deltaY = bottommostY - (currentBounds.y + currentBounds.height);
      if (deltaY !== 0) {
        this.editorStore.translateSubPath(subPath.id, { x: 0, y: deltaY });
      }
    });

    this.editorStore.pushToHistory();
  }

  // Distribution operations
  distributeHorizontally() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 3) return;

    // Sort by current X position
    const sortedIndices = Array.from(Array(subPaths.length).keys())
      .sort((a, b) => bounds[a].centerX - bounds[b].centerX);

    const leftmostX = bounds[sortedIndices[0]].centerX;
    const rightmostX = bounds[sortedIndices[sortedIndices.length - 1]].centerX;
    const totalDistance = rightmostX - leftmostX;
    const spacing = totalDistance / (sortedIndices.length - 1);

    sortedIndices.forEach((originalIndex, sortedPosition) => {
      if (sortedPosition === 0 || sortedPosition === sortedIndices.length - 1) return; // Skip first and last
      
      const targetX = leftmostX + (spacing * sortedPosition);
      const currentBounds = bounds[originalIndex];
      const deltaX = targetX - currentBounds.centerX;
      
      if (Math.abs(deltaX) > 0.01) {
        this.editorStore.translateSubPath(subPaths[originalIndex].id, { x: deltaX, y: 0 });
      }
    });

    this.editorStore.pushToHistory();
  }

  distributeVertically() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 3) return;

    // Sort by current Y position
    const sortedIndices = Array.from(Array(subPaths.length).keys())
      .sort((a, b) => bounds[a].centerY - bounds[b].centerY);

    const topmostY = bounds[sortedIndices[0]].centerY;
    const bottommostY = bounds[sortedIndices[sortedIndices.length - 1]].centerY;
    const totalDistance = bottommostY - topmostY;
    const spacing = totalDistance / (sortedIndices.length - 1);

    sortedIndices.forEach((originalIndex, sortedPosition) => {
      if (sortedPosition === 0 || sortedPosition === sortedIndices.length - 1) return; // Skip first and last
      
      const targetY = topmostY + (spacing * sortedPosition);
      const currentBounds = bounds[originalIndex];
      const deltaY = targetY - currentBounds.centerY;
      
      if (Math.abs(deltaY) > 0.01) {
        this.editorStore.translateSubPath(subPaths[originalIndex].id, { x: 0, y: deltaY });
      }
    });

    this.editorStore.pushToHistory();
  }

  // Stretch operations
  stretchHorizontally() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    const overallBounds = this.getOverallBounds(bounds);
    if (!overallBounds) return;

    subPaths.forEach((subPath, index) => {
      const currentBounds = bounds[index];
      
      // Calculate scale factor to match overall width
      const scaleX = overallBounds.width / currentBounds.width;
      
      // Calculate new position to maintain relative position within overall bounds
      const relativePosition = (currentBounds.x - overallBounds.x) / overallBounds.width;
      const newX = overallBounds.x + (relativePosition * overallBounds.width);
      const deltaX = newX - currentBounds.x;
      
      // Apply scaling and translation
      this.editorStore.scaleSubPath(subPath.id, scaleX, 1, { x: currentBounds.centerX, y: currentBounds.centerY });
      if (Math.abs(deltaX) > 0.01) {
        this.editorStore.translateSubPath(subPath.id, { x: deltaX, y: 0 });
      }
    });

    this.editorStore.pushToHistory();
  }

  stretchVertically() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    const overallBounds = this.getOverallBounds(bounds);
    if (!overallBounds) return;

    subPaths.forEach((subPath, index) => {
      const currentBounds = bounds[index];
      
      // Calculate scale factor to match overall height
      const scaleY = overallBounds.height / currentBounds.height;
      
      // Calculate new position to maintain relative position within overall bounds
      const relativePosition = (currentBounds.y - overallBounds.y) / overallBounds.height;
      const newY = overallBounds.y + (relativePosition * overallBounds.height);
      const deltaY = newY - currentBounds.y;
      
      // Apply scaling and translation
      this.editorStore.scaleSubPath(subPath.id, 1, scaleY, { x: currentBounds.centerX, y: currentBounds.centerY });
      if (Math.abs(deltaY) > 0.01) {
        this.editorStore.translateSubPath(subPath.id, { x: 0, y: deltaY });
      }
    });

    this.editorStore.pushToHistory();
  }

  // Flip operations
  flipHorizontally() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length === 0) return;

    const overallBounds = this.getOverallBounds(bounds);
    if (!overallBounds) return;

    subPaths.forEach((subPath) => {
      this.editorStore.mirrorSubPathHorizontal(subPath.id, { x: overallBounds.centerX, y: overallBounds.centerY });
    });

    this.editorStore.pushToHistory();
  }

  flipVertically() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length === 0) return;

    const overallBounds = this.getOverallBounds(bounds);
    if (!overallBounds) return;

    subPaths.forEach((subPath) => {
      this.editorStore.mirrorSubPathVertical(subPath.id, { x: overallBounds.centerX, y: overallBounds.centerY });
    });

    this.editorStore.pushToHistory();
  }

  pack() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    // Sort by X position
    const sortedIndices = Array.from(Array(subPaths.length).keys())
      .sort((a, b) => bounds[a].x - bounds[b].x);

    let currentX = bounds[sortedIndices[0]].x;

    sortedIndices.forEach((originalIndex, sortedPosition) => {
      if (sortedPosition === 0) {
        currentX = bounds[originalIndex].x + bounds[originalIndex].width;
        return;
      }

      const currentBounds = bounds[originalIndex];
      const deltaX = currentX - currentBounds.x;
      
      if (Math.abs(deltaX) > 0.01) {
        this.editorStore.translateSubPath(subPaths[originalIndex].id, { x: deltaX, y: 0 });
      }
      
      currentX += bounds[originalIndex].width;
    });

    this.editorStore.pushToHistory();
  }

  // Stack operations
  stackHorizontally() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    // Sort by X position and align their Y positions
    const sortedIndices = Array.from(Array(subPaths.length).keys())
      .sort((a, b) => bounds[a].x - bounds[b].x);

    const baseY = bounds[sortedIndices[0]].y;
    let currentX = bounds[sortedIndices[0]].x + bounds[sortedIndices[0]].width;

    sortedIndices.forEach((originalIndex, sortedPosition) => {
      if (sortedPosition === 0) return;

      const currentBounds = bounds[originalIndex];
      const deltaX = currentX - currentBounds.x;
      const deltaY = baseY - currentBounds.y;
      
      if (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01) {
        this.editorStore.translateSubPath(subPaths[originalIndex].id, { x: deltaX, y: deltaY });
      }
      
      currentX += bounds[originalIndex].width;
    });

    this.editorStore.pushToHistory();
  }

  stackVertically() {
    const { subPaths, bounds } = this.getSelectedElements();
    if (subPaths.length < 2) return;

    // Sort by Y position and align their X positions
    const sortedIndices = Array.from(Array(subPaths.length).keys())
      .sort((a, b) => bounds[a].y - bounds[b].y);

    const baseX = bounds[sortedIndices[0]].x;
    let currentY = bounds[sortedIndices[0]].y + bounds[sortedIndices[0]].height;

    sortedIndices.forEach((originalIndex, sortedPosition) => {
      if (sortedPosition === 0) return;

      const currentBounds = bounds[originalIndex];
      const deltaX = baseX - currentBounds.x;
      const deltaY = currentY - currentBounds.y;
      
      if (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01) {
        this.editorStore.translateSubPath(subPaths[originalIndex].id, { x: deltaX, y: deltaY });
      }
      
      currentY += bounds[originalIndex].height;
    });

    this.editorStore.pushToHistory();
  }

  hasValidSelection(): boolean {
    if (!this.editorStore) return false;
    return this.editorStore.selection.selectedSubPaths.length > 0;
  }
}

export const arrangeManager = new ArrangeManager();
