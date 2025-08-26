import { SVGSubPath, SVGPath } from '../../types';
import { useEditorStore } from '../../store/editorStore';
import { bringElementsToFront, sendElementsToBack, sendElementsForward, sendElementsBackward } from '../../utils/z-index-manager';

export class ReorderManager {
  private editorStore: any = null;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  private getSelectedSubPaths(): SVGSubPath[] {
    const { paths, selection } = useEditorStore.getState();
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
    const { paths } = useEditorStore.getState();
    
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
    const editorState = useEditorStore.getState();
    const { paths } = editorState;
    const updatedPaths = paths.map((path: SVGPath) => {
      if (path.id === pathId) {
        return {
          ...path,
          subPaths: newSubPaths
        };
      }
      return path;
    });

    editorState.replacePaths(updatedPaths);
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
    const editorState = useEditorStore.getState();
    return editorState.paths.findIndex((p: SVGPath) => p.id === pathId);
  }

  private getSubPathIndex(pathId: string, subPathId: string): number {
    const editorState = useEditorStore.getState();
    const path = editorState.paths.find((p: SVGPath) => p.id === pathId);
    if (!path) return -1;
    return path.subPaths.findIndex((sp: SVGSubPath) => sp.id === subPathId);
  }

  // Bring selected subpaths to front (last in array = rendered on top)
  bringToFront() {
    const selectedSubPaths = this.getSelectedSubPaths();
    if (selectedSubPaths.length === 0) {
      return;
    }

    // Get editor state
    const editorState = useEditorStore.getState();
    
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

    let pathsUpdated = [...editorState.paths];
    const pathsToMoveToFront: string[] = [];

    // Process each path
    for (const [pathId, subPathIds] of pathGroups) {
      const parentPath = pathsUpdated.find((p: SVGPath) => p.id === pathId);
      if (!parentPath) continue;

      let newSubPaths = [...parentPath.subPaths];
      
      // Remove selected subpaths from their current positions
      const selectedSubPathsData = subPathIds.map(id => 
        newSubPaths.find(sp => sp.id === id)
      ).filter((sp): sp is SVGSubPath => sp !== undefined);
      
      newSubPaths = newSubPaths.filter(sp => !subPathIds.includes(sp.id));
      
      // Add them to the end (front in rendering order)
      newSubPaths.push(...selectedSubPathsData);
      
      // Update the path in our working array
      pathsUpdated = pathsUpdated.map(path => 
        path.id === pathId ? { ...path, subPaths: newSubPaths } : path
      );

      // If all subpaths in this path are selected, move the entire path to front using global z-index
      if (subPathIds.length === parentPath.subPaths.length) {
        pathsToMoveToFront.push(pathId);
      }
    }

    // First update the subpath order within paths
    editorState.replacePaths(pathsUpdated);

    // Then move entire paths to front using global z-index system if needed
    if (pathsToMoveToFront.length > 0) {
      bringElementsToFront(pathsToMoveToFront);
    } else {
      // If we only moved subpaths within paths, we need to save history
      editorState.pushToHistory();
    }
  }

  // Bring selected subpaths forward one level
  bringForward() {
    const selectedSubPaths = this.getSelectedSubPaths();
    if (selectedSubPaths.length === 0) return;

    // Get editor state
    const editorState = useEditorStore.getState();

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

    let pathsUpdated = [...editorState.paths];

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
      // try to move the entire path forward using global z-index
      if (anyAtFront) {
        sendElementsForward([pathId]);
        pathMoved = true;
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

    editorState.replacePaths(pathsUpdated);
    editorState.pushToHistory();
  }

  // Send selected subpaths backward one level
  sendBackward() {
    const selectedSubPaths = this.getSelectedSubPaths();
    if (selectedSubPaths.length === 0) return;

    // Get editor state
    const editorState = useEditorStore.getState();

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

    let pathsUpdated = [...editorState.paths];

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
      // try to move the entire path backward using global z-index
      if (anyAtBack) {
        sendElementsBackward([pathId]);
        pathMoved = true;
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

    editorState.replacePaths(pathsUpdated);
    editorState.pushToHistory();
  }

  // Send selected subpaths to back (first in array = rendered behind)
  sendToBack() {
    const selectedSubPaths = this.getSelectedSubPaths();
    if (selectedSubPaths.length === 0) return;

    // Get editor state
    const editorState = useEditorStore.getState();

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

    let pathsUpdated = [...editorState.paths];
    const pathsToMoveToBack: string[] = [];

    // Process each path
    for (const [pathId, subPathIds] of pathGroups) {
      const parentPath = pathsUpdated.find((p: SVGPath) => p.id === pathId);
      if (!parentPath) continue;

      let newSubPaths = [...parentPath.subPaths];
      
      // Remove selected subpaths from their current positions
      const selectedSubPathsData = subPathIds.map(id => 
        newSubPaths.find(sp => sp.id === id)
      ).filter((sp): sp is SVGSubPath => sp !== undefined);
      
      newSubPaths = newSubPaths.filter(sp => !subPathIds.includes(sp.id));
      
      // Add them to the beginning (back in rendering order)
      newSubPaths.unshift(...selectedSubPathsData);
      
      // Update the path in our working array
      pathsUpdated = pathsUpdated.map(path => 
        path.id === pathId ? { ...path, subPaths: newSubPaths } : path
      );

      // If all subpaths in this path are selected, move the entire path to back using global z-index
      if (subPathIds.length === parentPath.subPaths.length) {
        pathsToMoveToBack.push(pathId);
      }
    }

    // First update the subpath order within paths
    editorState.replacePaths(pathsUpdated);

    // Then move entire paths to back using global z-index system if needed
    if (pathsToMoveToBack.length > 0) {
      sendElementsToBack(pathsToMoveToBack);
    } else {
      // If we only moved subpaths within paths, we need to save history
      editorState.pushToHistory();
    }
  }

  hasValidSelection(): boolean {
    const editorState = useEditorStore.getState();
    return editorState.selection.selectedSubPaths.length > 0;
  }
}

export const reorderManager = new ReorderManager();
