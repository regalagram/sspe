import { SVGSubPath, SVGPath } from '../../types';

export class ReorderManager {
  private editorStore: any = null;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  private getSelectedSubPaths(): SVGSubPath[] {
    if (!this.editorStore) return [];

    const { paths, selection } = this.editorStore;
    const selectedSubPaths: SVGSubPath[] = [];

    // Get selected subpaths
    for (const subPathId of selection.selectedSubPaths) {
      for (const path of paths) {
        const subPath = path.subPaths.find((sp: SVGSubPath) => sp.id === subPathId);
        if (subPath) {
          selectedSubPaths.push(subPath);
          break;
        }
      }
    }

    return selectedSubPaths;
  }

  private getParentPathForSubPath(subPathId: string): SVGPath | null {
    if (!this.editorStore) return null;

    const { paths } = this.editorStore;
    
    for (const path of paths) {
      if (path.subPaths.some((sp: SVGSubPath) => sp.id === subPathId)) {
        return path;
      }
    }
    
    return null;
  }

  private moveSubPathInArray(path: SVGPath, subPathId: string, newIndex: number): SVGSubPath[] {
    const subPaths = [...path.subPaths];
    const currentIndex = subPaths.findIndex(sp => sp.id === subPathId);
    
    if (currentIndex === -1) return subPaths;
    
    // Remove from current position
    const [movedSubPath] = subPaths.splice(currentIndex, 1);
    
    // Insert at new position
    subPaths.splice(newIndex, 0, movedSubPath);
    
    return subPaths;
  }

  private updatePathSubPaths(pathId: string, newSubPaths: SVGSubPath[]): void {
    if (!this.editorStore) return;

    const { paths } = this.editorStore;
    const updatedPaths = paths.map((path: SVGPath) => {
      if (path.id === pathId) {
        return {
          ...path,
          subPaths: newSubPaths
        };
      }
      return path;
    });

    this.editorStore.replacePaths(updatedPaths);
  }

  private movePathInArray(paths: SVGPath[], pathId: string, newIndex: number): SVGPath[] {
    const pathsArray = [...paths];
    const currentIndex = pathsArray.findIndex(p => p.id === pathId);
    
    if (currentIndex === -1) return pathsArray;
    
    // Remove from current position
    const [movedPath] = pathsArray.splice(currentIndex, 1);
    
    // Insert at new position
    pathsArray.splice(newIndex, 0, movedPath);
    
    return pathsArray;
  }

  private getPathIndex(pathId: string): number {
    if (!this.editorStore) return -1;
    return this.editorStore.paths.findIndex((p: SVGPath) => p.id === pathId);
  }

  private getSubPathIndex(pathId: string, subPathId: string): number {
    if (!this.editorStore) return -1;
    const path = this.editorStore.paths.find((p: SVGPath) => p.id === pathId);
    if (!path) return -1;
    return path.subPaths.findIndex((sp: SVGSubPath) => sp.id === subPathId);
  }

  // Bring selected subpaths to front (last in array = rendered on top)
  bringToFront() {
    const selectedSubPaths = this.getSelectedSubPaths();
    if (selectedSubPaths.length === 0) return;

    // Group by parent path
    const pathGroups = new Map<string, string[]>();
    
    for (const subPath of selectedSubPaths) {
      const parentPath = this.getParentPathForSubPath(subPath.id);
      if (parentPath) {
        if (!pathGroups.has(parentPath.id)) {
          pathGroups.set(parentPath.id, []);
        }
        pathGroups.get(parentPath.id)!.push(subPath.id);
      }
    }

    let pathsUpdated = [...this.editorStore.paths];
    const pathsToMoveToFront: string[] = [];

    // Process each path
    for (const [pathId, subPathIds] of pathGroups) {
      const parentPath = pathsUpdated.find((p: SVGPath) => p.id === pathId);
      if (!parentPath) continue;

      let newSubPaths = [...parentPath.subPaths];
      
      // Remove selected subpaths from their current positions
      const selectedSubPathsData = subPathIds.map(id => 
        newSubPaths.find(sp => sp.id === id)
      ).filter(Boolean);
      
      newSubPaths = newSubPaths.filter(sp => !subPathIds.includes(sp.id));
      
      // Add them to the end (front in rendering order)
      newSubPaths.push(...selectedSubPathsData);
      
      // Update the path in our working array
      pathsUpdated = pathsUpdated.map(path => 
        path.id === pathId ? { ...path, subPaths: newSubPaths } : path
      );

      // If all subpaths in this path are selected, move the entire path to front
      if (subPathIds.length === parentPath.subPaths.length) {
        pathsToMoveToFront.push(pathId);
      }
    }

    // Move entire paths to front if all their subpaths were selected
    for (const pathId of pathsToMoveToFront) {
      pathsUpdated = this.movePathInArray(pathsUpdated, pathId, pathsUpdated.length - 1);
    }

    this.editorStore.replacePaths(pathsUpdated);
    this.editorStore.pushToHistory();
  }

  // Bring selected subpaths forward one level
  bringForward() {
    const selectedSubPaths = this.getSelectedSubPaths();
    if (selectedSubPaths.length === 0) return;

    // Group by parent path
    const pathGroups = new Map<string, string[]>();
    
    for (const subPath of selectedSubPaths) {
      const parentPath = this.getParentPathForSubPath(subPath.id);
      if (parentPath) {
        if (!pathGroups.has(parentPath.id)) {
          pathGroups.set(parentPath.id, []);
        }
        pathGroups.get(parentPath.id)!.push(subPath.id);
      }
    }

    let pathsUpdated = [...this.editorStore.paths];

    // Process each path
    for (const [pathId, subPathIds] of pathGroups) {
      const parentPath = pathsUpdated.find((p: SVGPath) => p.id === pathId);
      if (!parentPath) continue;

      let newSubPaths = [...parentPath.subPaths];
      let pathMoved = false;
      
      // Check if any subpath is already at the front of its path
      const anyAtFront = subPathIds.some(id => {
        const index = newSubPaths.findIndex(sp => sp.id === id);
        return index === newSubPaths.length - 1;
      });

      // If any subpath is at the front and can't move forward within the path,
      // try to move the entire path forward
      if (anyAtFront) {
        const pathIndex = this.getPathIndex(pathId);
        if (pathIndex < pathsUpdated.length - 1) {
          pathsUpdated = this.movePathInArray(pathsUpdated, pathId, pathIndex + 1);
          pathMoved = true;
        }
      }

      // Move subpaths forward within the path (if path wasn't moved)
      if (!pathMoved) {
        // Move each selected subpath forward by one position
        // Start from the end to avoid index conflicts
        for (let i = newSubPaths.length - 2; i >= 0; i--) {
          if (subPathIds.includes(newSubPaths[i].id)) {
            // Swap with next element (move forward)
            [newSubPaths[i], newSubPaths[i + 1]] = [newSubPaths[i + 1], newSubPaths[i]];
          }
        }
        
        // Update the path in our working array
        pathsUpdated = pathsUpdated.map(path => 
          path.id === pathId ? { ...path, subPaths: newSubPaths } : path
        );
      }
    }

    this.editorStore.replacePaths(pathsUpdated);
    this.editorStore.pushToHistory();
  }

  // Send selected subpaths backward one level
  sendBackward() {
    const selectedSubPaths = this.getSelectedSubPaths();
    if (selectedSubPaths.length === 0) return;

    // Group by parent path
    const pathGroups = new Map<string, string[]>();
    
    for (const subPath of selectedSubPaths) {
      const parentPath = this.getParentPathForSubPath(subPath.id);
      if (parentPath) {
        if (!pathGroups.has(parentPath.id)) {
          pathGroups.set(parentPath.id, []);
        }
        pathGroups.get(parentPath.id)!.push(subPath.id);
      }
    }

    let pathsUpdated = [...this.editorStore.paths];

    // Process each path
    for (const [pathId, subPathIds] of pathGroups) {
      const parentPath = pathsUpdated.find((p: SVGPath) => p.id === pathId);
      if (!parentPath) continue;

      let newSubPaths = [...parentPath.subPaths];
      let pathMoved = false;
      
      // Check if any subpath is already at the back of its path
      const anyAtBack = subPathIds.some(id => {
        const index = newSubPaths.findIndex(sp => sp.id === id);
        return index === 0;
      });

      // If any subpath is at the back and can't move backward within the path,
      // try to move the entire path backward
      if (anyAtBack) {
        const pathIndex = this.getPathIndex(pathId);
        if (pathIndex > 0) {
          pathsUpdated = this.movePathInArray(pathsUpdated, pathId, pathIndex - 1);
          pathMoved = true;
        }
      }

      // Move subpaths backward within the path (if path wasn't moved)
      if (!pathMoved) {
        // Move each selected subpath backward by one position
        // Start from the beginning to avoid index conflicts
        for (let i = 1; i < newSubPaths.length; i++) {
          if (subPathIds.includes(newSubPaths[i].id)) {
            // Swap with previous element (move backward)
            [newSubPaths[i], newSubPaths[i - 1]] = [newSubPaths[i - 1], newSubPaths[i]];
          }
        }
        
        // Update the path in our working array
        pathsUpdated = pathsUpdated.map(path => 
          path.id === pathId ? { ...path, subPaths: newSubPaths } : path
        );
      }
    }

    this.editorStore.replacePaths(pathsUpdated);
    this.editorStore.pushToHistory();
  }

  // Send selected subpaths to back (first in array = rendered behind)
  sendToBack() {
    const selectedSubPaths = this.getSelectedSubPaths();
    if (selectedSubPaths.length === 0) return;

    // Group by parent path
    const pathGroups = new Map<string, string[]>();
    
    for (const subPath of selectedSubPaths) {
      const parentPath = this.getParentPathForSubPath(subPath.id);
      if (parentPath) {
        if (!pathGroups.has(parentPath.id)) {
          pathGroups.set(parentPath.id, []);
        }
        pathGroups.get(parentPath.id)!.push(subPath.id);
      }
    }

    let pathsUpdated = [...this.editorStore.paths];
    const pathsToMoveToBack: string[] = [];

    // Process each path
    for (const [pathId, subPathIds] of pathGroups) {
      const parentPath = pathsUpdated.find((p: SVGPath) => p.id === pathId);
      if (!parentPath) continue;

      let newSubPaths = [...parentPath.subPaths];
      
      // Remove selected subpaths from their current positions
      const selectedSubPathsData = subPathIds.map(id => 
        newSubPaths.find(sp => sp.id === id)
      ).filter(Boolean);
      
      newSubPaths = newSubPaths.filter(sp => !subPathIds.includes(sp.id));
      
      // Add them to the beginning (back in rendering order)
      newSubPaths.unshift(...selectedSubPathsData);
      
      // Update the path in our working array
      pathsUpdated = pathsUpdated.map(path => 
        path.id === pathId ? { ...path, subPaths: newSubPaths } : path
      );

      // If all subpaths in this path are selected, move the entire path to back
      if (subPathIds.length === parentPath.subPaths.length) {
        pathsToMoveToBack.push(pathId);
      }
    }

    // Move entire paths to back if all their subpaths were selected
    for (const pathId of pathsToMoveToBack) {
      pathsUpdated = this.movePathInArray(pathsUpdated, pathId, 0);
    }

    this.editorStore.replacePaths(pathsUpdated);
    this.editorStore.pushToHistory();
  }

  hasValidSelection(): boolean {
    if (!this.editorStore) return false;
    return this.editorStore.selection.selectedSubPaths.length > 0;
  }
}

export const reorderManager = new ReorderManager();
