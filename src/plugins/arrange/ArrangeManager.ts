import { SVGSubPath, TextElementType, SVGImage, SVGUse, SVGGroup, SVGCommand } from '../../types';
import { getSubPathBounds } from '../../utils/path-utils';
import { calculateTextBoundsDOM } from '../../utils/text-utils';
import { getElementBounds } from '../../utils/svg-elements-utils';
import { getCommandPointPosition, isCommandArrangeable, getUniqueCommandPositions } from '../../utils/command-point-utils';
import { useEditorStore } from '../../store/editorStore';

interface ArrangeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface ArrangeElement {
  id: string;
  type: 'subpath' | 'text' | 'image' | 'use' | 'group' | 'command';
  element: SVGSubPath | TextElementType | SVGImage | SVGUse | SVGGroup | SVGCommand;
  bounds: ArrangeBounds;
}

export class ArrangeManager {
  private editorStore: any = null;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  private getSelectedElements(): ArrangeElement[] {
    const { paths, texts, images, uses, groups, selection } = useEditorStore.getState();
    const elements: ArrangeElement[] = [];

    // Get selected command points
    for (const commandId of selection.selectedCommands) {
      for (const path of paths) {
        for (const subPath of path.subPaths) {
          const command = subPath.commands.find((cmd: SVGCommand) => cmd.id === commandId);
          if (command && isCommandArrangeable(command)) {
            const position = getCommandPointPosition(command);
            if (position) {
              elements.push({
                id: commandId,
                type: 'command',
                element: command,
                bounds: {
                  x: position.x,
                  y: position.y,
                  width: 0, // Command points have no area
                  height: 0,
                  centerX: position.x,
                  centerY: position.y,
                }
              });
            }
          }
          break;
        }
      }
    }

    // Get selected subpaths
    for (const subPathId of selection.selectedSubPaths) {
      for (const path of paths) {
        const subPath = path.subPaths.find((sp: SVGSubPath) => sp.id === subPathId);
        if (subPath) {
          const subPathBounds = getSubPathBounds(subPath);
          if (subPathBounds) {
            elements.push({
              id: subPathId,
              type: 'subpath',
              element: subPath,
              bounds: {
                ...subPathBounds,
                centerX: subPathBounds.x + subPathBounds.width / 2,
                centerY: subPathBounds.y + subPathBounds.height / 2,
              }
            });
          }
          break;
        }
      }
    }

    // Get selected texts
    for (const textId of selection.selectedTexts) {
      const text = texts.find((t: TextElementType) => t.id === textId);
      if (text) {
        const textBounds = calculateTextBoundsDOM(text);
        if (textBounds) {
          elements.push({
            id: textId,
            type: 'text',
            element: text,
            bounds: {
              x: textBounds.x,
              y: textBounds.y,
              width: textBounds.width,
              height: textBounds.height,
              centerX: textBounds.x + textBounds.width / 2,
              centerY: textBounds.y + textBounds.height / 2,
            }
          });
        }
      }
    }

    // Get selected images
    for (const imageId of selection.selectedImages) {
      const image = images.find((img: SVGImage) => img.id === imageId);
      if (image) {
        const imageBounds = getElementBounds(image);
        elements.push({
          id: imageId,
          type: 'image',
          element: image,
          bounds: {
            x: imageBounds.x,
            y: imageBounds.y,
            width: imageBounds.width,
            height: imageBounds.height,
            centerX: imageBounds.x + imageBounds.width / 2,
            centerY: imageBounds.y + imageBounds.height / 2,
          }
        });
      }
    }

    // Get selected uses
    for (const useId of selection.selectedUses) {
      const use = uses.find((u: SVGUse) => u.id === useId);
      if (use) {
        const useBounds = getElementBounds(use);
        elements.push({
          id: useId,
          type: 'use',
          element: use,
          bounds: {
            x: useBounds.x,
            y: useBounds.y,
            width: useBounds.width,
            height: useBounds.height,
            centerX: useBounds.x + useBounds.width / 2,
            centerY: useBounds.y + useBounds.height / 2,
          }
        });
      }
    }

    // TODO: Get selected groups (currently skipped due to bounds calculation complexity)

    return elements;
  }

  private moveElement(element: ArrangeElement, delta: { x: number; y: number }) {
    if (Math.abs(delta.x) < 0.01 && Math.abs(delta.y) < 0.01) return;

    const editorState = useEditorStore.getState();
    switch (element.type) {
      case 'command':
        const command = element.element as SVGCommand;
        const newPosition = {
          x: command.x! + delta.x,
          y: command.y! + delta.y
        };
        editorState.moveCommand(element.id, newPosition);
        break;
      case 'subpath':
        editorState.translateSubPath(element.id, delta);
        break;
      case 'text':
        editorState.moveText(element.id, delta);
        break;
      case 'image':
        editorState.moveImage(element.id, delta);
        break;
      case 'use':
        editorState.moveUse(element.id, delta);
        break;
      case 'group':
        editorState.moveGroup(element.id, delta);
        break;
    }
  }

  private getOverallBounds(elements: ArrangeElement[]): ArrangeBounds | null {
    if (elements.length === 0) return null;

    const bounds = elements.map(el => el.bounds);
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

  // Check if we're dealing with pure command selection
  private isPureCommandSelection(): boolean {
    const { selection } = useEditorStore.getState();
    return selection.selectedCommands.length > 0 && 
           selection.selectedSubPaths.length === 0 &&
           selection.selectedTexts.length === 0 &&
           selection.selectedImages.length === 0 &&
           selection.selectedUses.length === 0 &&
           selection.selectedGroups.length === 0;
  }

  // Alignment operations
  alignLeft() {
    console.log('⬅️ ArrangeManager.alignLeft() called');
    
    // Use unified element handling for all types including commands
    const elements = this.getSelectedElements();
    console.log('⬅️ Selected elements:', elements.length);
    
    // Special handling for pure command selections - use unique positions
    if (this.isPureCommandSelection()) {
      const { paths, selection } = useEditorStore.getState();
      const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
      
      selection.selectedCommands.forEach(id => {
        for (const path of paths) {
          for (const subPath of path.subPaths) {
            const cmd = subPath.commands.find(c => c.id === id);
            if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
              commandsWithContext.push({
                command: cmd,
                subPathCommands: subPath.commands
              });
              return;
            }
          }
        }
      });

      const uniquePositions = getUniqueCommandPositions(commandsWithContext);
      if (uniquePositions.length < 2) return;

      // IMPORTANT: Push to history BEFORE making changes
      const editorState = useEditorStore.getState();
      editorState.pushToHistory();

      const leftmostX = Math.min(...uniquePositions.map(pos => pos.position.x));

      uniquePositions.forEach(posGroup => {
        posGroup.commands.forEach(cmd => {
          editorState.updateCommand(cmd.id, { x: leftmostX });
        });
      });
      return;
    }

    if (elements.length < 2) {
      console.log('⬅️ Less than 2 elements selected, returning');
      return;
    }

    // IMPORTANT: Push to history BEFORE making changes
    const editorState = useEditorStore.getState();
    editorState.pushToHistory();

    const leftmostX = Math.min(...elements.map(el => el.bounds.x));
    
    elements.forEach((element) => {
      const deltaX = leftmostX - element.bounds.x;
      this.moveElement(element, { x: deltaX, y: 0 });
    });
  }

  alignCenter() {
    // Special handling for pure command selections - use unique positions
    if (this.isPureCommandSelection()) {
      const { paths, selection } = useEditorStore.getState();
      const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
      
      selection.selectedCommands.forEach(id => {
        for (const path of paths) {
          for (const subPath of path.subPaths) {
            const cmd = subPath.commands.find(c => c.id === id);
            if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
              commandsWithContext.push({
                command: cmd,
                subPathCommands: subPath.commands
              });
              return;
            }
          }
        }
      });

      const uniquePositions = getUniqueCommandPositions(commandsWithContext);
      if (uniquePositions.length < 2) return;

      // IMPORTANT: Push to history BEFORE making changes
      const editorState = useEditorStore.getState();
      editorState.pushToHistory();

      const allX = uniquePositions.map(pos => pos.position.x);
      const centerX = (Math.min(...allX) + Math.max(...allX)) / 2;

      uniquePositions.forEach(posGroup => {
        posGroup.commands.forEach(cmd => {
          editorState.updateCommand(cmd.id, { x: centerX });
        });
      });
      return;
    }

    const elements = this.getSelectedElements();
    if (elements.length < 2) return;

    const overallBounds = this.getOverallBounds(elements);
    if (!overallBounds) return;

    // IMPORTANT: Push to history BEFORE making changes
    const editorState = useEditorStore.getState();
    editorState.pushToHistory();

    elements.forEach((element) => {
      const deltaX = overallBounds.centerX - element.bounds.centerX;
      this.moveElement(element, { x: deltaX, y: 0 });
    });
  }

  alignRight() {
    // Special handling for pure command selections - use unique positions
    if (this.isPureCommandSelection()) {
      const { paths, selection } = useEditorStore.getState();
      const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
      
      selection.selectedCommands.forEach(id => {
        for (const path of paths) {
          for (const subPath of path.subPaths) {
            const cmd = subPath.commands.find(c => c.id === id);
            if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
              commandsWithContext.push({
                command: cmd,
                subPathCommands: subPath.commands
              });
              return;
            }
          }
        }
      });

      const uniquePositions = getUniqueCommandPositions(commandsWithContext);
      if (uniquePositions.length < 2) return;

      // IMPORTANT: Push to history BEFORE making changes
      const editorState = useEditorStore.getState();
      editorState.pushToHistory();

      const rightmostX = Math.max(...uniquePositions.map(pos => pos.position.x));

      uniquePositions.forEach(posGroup => {
        posGroup.commands.forEach(cmd => {
          editorState.updateCommand(cmd.id, { x: rightmostX });
        });
      });
      return;
    }

    const elements = this.getSelectedElements();
    if (elements.length < 2) return;

    // IMPORTANT: Push to history BEFORE making changes
    const editorState = useEditorStore.getState();
    editorState.pushToHistory();

    const rightmostX = Math.max(...elements.map(el => el.bounds.x + el.bounds.width));
    
    elements.forEach((element) => {
      const deltaX = rightmostX - (element.bounds.x + element.bounds.width);
      this.moveElement(element, { x: deltaX, y: 0 });
    });
  }

  alignTop() {
    // Special handling for pure command selections - use unique positions
    if (this.isPureCommandSelection()) {
      const { paths, selection } = useEditorStore.getState();
      const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
      
      selection.selectedCommands.forEach(id => {
        for (const path of paths) {
          for (const subPath of path.subPaths) {
            const cmd = subPath.commands.find(c => c.id === id);
            if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
              commandsWithContext.push({
                command: cmd,
                subPathCommands: subPath.commands
              });
              return;
            }
          }
        }
      });

      const uniquePositions = getUniqueCommandPositions(commandsWithContext);
      if (uniquePositions.length < 2) return;

      // IMPORTANT: Push to history BEFORE making changes
      const editorState = useEditorStore.getState();
      editorState.pushToHistory();

      const topmostY = Math.min(...uniquePositions.map(pos => pos.position.y));

      uniquePositions.forEach(posGroup => {
        posGroup.commands.forEach(cmd => {
          editorState.updateCommand(cmd.id, { y: topmostY });
        });
      });
      return;
    }

    const elements = this.getSelectedElements();
    if (elements.length < 2) return;

    // IMPORTANT: Push to history BEFORE making changes
    const editorState = useEditorStore.getState();
    editorState.pushToHistory();

    const topmostY = Math.min(...elements.map(el => el.bounds.y));
    
    elements.forEach((element) => {
      const deltaY = topmostY - element.bounds.y;
      this.moveElement(element, { x: 0, y: deltaY });
    });
  }

  alignMiddle() {
    // Special handling for pure command selections - use unique positions
    if (this.isPureCommandSelection()) {
      const { paths, selection } = useEditorStore.getState();
      const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
      
      selection.selectedCommands.forEach(id => {
        for (const path of paths) {
          for (const subPath of path.subPaths) {
            const cmd = subPath.commands.find(c => c.id === id);
            if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
              commandsWithContext.push({
                command: cmd,
                subPathCommands: subPath.commands
              });
              return;
            }
          }
        }
      });

      const uniquePositions = getUniqueCommandPositions(commandsWithContext);
      if (uniquePositions.length < 2) return;

      // IMPORTANT: Push to history BEFORE making changes
      const editorState = useEditorStore.getState();
      editorState.pushToHistory();

      const allY = uniquePositions.map(pos => pos.position.y);
      const centerY = (Math.min(...allY) + Math.max(...allY)) / 2;

      uniquePositions.forEach(posGroup => {
        posGroup.commands.forEach(cmd => {
          editorState.updateCommand(cmd.id, { y: centerY });
        });
      });
      return;
    }

    const elements = this.getSelectedElements();
    if (elements.length < 2) return;

    const overallBounds = this.getOverallBounds(elements);
    if (!overallBounds) return;

    // IMPORTANT: Push to history BEFORE making changes
    const editorState = useEditorStore.getState();
    editorState.pushToHistory();

    elements.forEach((element) => {
      const deltaY = overallBounds.centerY - element.bounds.centerY;
      this.moveElement(element, { x: 0, y: deltaY });
    });
  }

  alignBottom() {
    // Special handling for pure command selections - use unique positions
    if (this.isPureCommandSelection()) {
      const { paths, selection } = useEditorStore.getState();
      const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
      
      selection.selectedCommands.forEach(id => {
        for (const path of paths) {
          for (const subPath of path.subPaths) {
            const cmd = subPath.commands.find(c => c.id === id);
            if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
              commandsWithContext.push({
                command: cmd,
                subPathCommands: subPath.commands
              });
              return;
            }
          }
        }
      });

      const uniquePositions = getUniqueCommandPositions(commandsWithContext);
      if (uniquePositions.length < 2) return;

      // IMPORTANT: Push to history BEFORE making changes
      const editorState = useEditorStore.getState();
      editorState.pushToHistory();

      const bottommostY = Math.max(...uniquePositions.map(pos => pos.position.y));

      uniquePositions.forEach(posGroup => {
        posGroup.commands.forEach(cmd => {
          editorState.updateCommand(cmd.id, { y: bottommostY });
        });
      });
      return;
    }

    const elements = this.getSelectedElements();
    if (elements.length < 2) return;

    // IMPORTANT: Push to history BEFORE making changes
    const editorState = useEditorStore.getState();
    editorState.pushToHistory();

    const bottommostY = Math.max(...elements.map(el => el.bounds.y + el.bounds.height));
    
    elements.forEach((element) => {
      const deltaY = bottommostY - (element.bounds.y + element.bounds.height);
      this.moveElement(element, { x: 0, y: deltaY });
    });
  }

  // Distribution operations
  distributeHorizontally() {
    // Special handling for pure command selections - use unique positions
    // Note: This handles coincident points (e.g., first/last point overlap)
    if (this.isPureCommandSelection()) {
      const { paths, selection } = useEditorStore.getState();
      const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
      
      selection.selectedCommands.forEach(id => {
        for (const path of paths) {
          for (const subPath of path.subPaths) {
            const cmd = subPath.commands.find(c => c.id === id);
            if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
              commandsWithContext.push({
                command: cmd,
                subPathCommands: subPath.commands
              });
              return;
            }
          }
        }
      });

      const uniquePositions = getUniqueCommandPositions(commandsWithContext);
      if (uniquePositions.length < 3) return;

      // IMPORTANT: Push to history BEFORE making changes
      const editorState = useEditorStore.getState();
      editorState.pushToHistory();

      // Sort by current X position
      const sortedPositions = [...uniquePositions].sort((a, b) => a.position.x - b.position.x);

      const leftmostX = sortedPositions[0].position.x;
      const rightmostX = sortedPositions[sortedPositions.length - 1].position.x;
      const totalDistance = rightmostX - leftmostX;
      const spacing = totalDistance / (sortedPositions.length - 1);

      sortedPositions.forEach((posGroup, index) => {
        if (index === 0 || index === sortedPositions.length - 1) return; // Skip first and last
        
        const targetX = leftmostX + (spacing * index);
        
        // Move all commands in this position group to the new X position
        posGroup.commands.forEach(cmd => {
          editorState.updateCommand(cmd.id, { x: targetX });
        });
      });
      return;
    }

    const elements = this.getSelectedElements();
    if (elements.length < 3) return;

    // IMPORTANT: Push to history BEFORE making changes
    const editorState = useEditorStore.getState();
    editorState.pushToHistory();

    // Sort by current X position
    const sortedElements = [...elements].sort((a, b) => a.bounds.centerX - b.bounds.centerX);

    const leftmostX = sortedElements[0].bounds.centerX;
    const rightmostX = sortedElements[sortedElements.length - 1].bounds.centerX;
    const totalDistance = rightmostX - leftmostX;
    const spacing = totalDistance / (sortedElements.length - 1);

    sortedElements.forEach((element, sortedPosition) => {
      if (sortedPosition === 0 || sortedPosition === sortedElements.length - 1) return; // Skip first and last
      
      const targetX = leftmostX + (spacing * sortedPosition);
      const deltaX = targetX - element.bounds.centerX;
      
      this.moveElement(element, { x: deltaX, y: 0 });
    });
  }

  distributeVertically() {
    // Special handling for pure command selections - use unique positions
    // Note: This handles coincident points (e.g., first/last point overlap)
    if (this.isPureCommandSelection()) {
      const { paths, selection } = useEditorStore.getState();
      const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
      
      selection.selectedCommands.forEach(id => {
        for (const path of paths) {
          for (const subPath of path.subPaths) {
            const cmd = subPath.commands.find(c => c.id === id);
            if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
              commandsWithContext.push({
                command: cmd,
                subPathCommands: subPath.commands
              });
              return;
            }
          }
        }
      });

      const uniquePositions = getUniqueCommandPositions(commandsWithContext);
      if (uniquePositions.length < 3) return;

      // IMPORTANT: Push to history BEFORE making changes
      const editorState = useEditorStore.getState();
      editorState.pushToHistory();

      // Sort by current Y position
      const sortedPositions = [...uniquePositions].sort((a, b) => a.position.y - b.position.y);

      const topmostY = sortedPositions[0].position.y;
      const bottommostY = sortedPositions[sortedPositions.length - 1].position.y;
      const totalDistance = bottommostY - topmostY;
      const spacing = totalDistance / (sortedPositions.length - 1);

      sortedPositions.forEach((posGroup, index) => {
        if (index === 0 || index === sortedPositions.length - 1) return; // Skip first and last
        
        const targetY = topmostY + (spacing * index);
        
        // Move all commands in this position group to the new Y position
        posGroup.commands.forEach(cmd => {
          editorState.updateCommand(cmd.id, { y: targetY });
        });
      });
      return;
    }

    const elements = this.getSelectedElements();
    if (elements.length < 3) return;

    // IMPORTANT: Push to history BEFORE making changes
    const editorState = useEditorStore.getState();
    editorState.pushToHistory();

    // Sort by current Y position
    const sortedElements = [...elements].sort((a, b) => a.bounds.centerY - b.bounds.centerY);

    const topmostY = sortedElements[0].bounds.centerY;
    const bottommostY = sortedElements[sortedElements.length - 1].bounds.centerY;
    const totalDistance = bottommostY - topmostY;
    const spacing = totalDistance / (sortedElements.length - 1);

    sortedElements.forEach((element, sortedPosition) => {
      if (sortedPosition === 0 || sortedPosition === sortedElements.length - 1) return; // Skip first and last
      
      const targetY = topmostY + (spacing * sortedPosition);
      const deltaY = targetY - element.bounds.centerY;
      
      this.moveElement(element, { x: 0, y: deltaY });
    });
  }

  // Stretch operations - Only available for subpaths as other elements don't support scaling
  stretchHorizontally() {
    const elements = this.getSelectedElements().filter(el => el.type === 'subpath');
    if (elements.length < 2) return;

    const overallBounds = this.getOverallBounds(elements);
    if (!overallBounds) return;

    elements.forEach((element) => {
      const currentBounds = element.bounds;
      
      // Calculate scale factor to match overall width
      const scaleX = overallBounds.width / currentBounds.width;
      
      // Calculate new position to maintain relative position within overall bounds
      const relativePosition = (currentBounds.x - overallBounds.x) / overallBounds.width;
      const newX = overallBounds.x + (relativePosition * overallBounds.width);
      const deltaX = newX - currentBounds.x;
      
      // Apply scaling and translation
      const editorState = useEditorStore.getState();
      editorState.scaleSubPath(element.id, scaleX, 1, { x: currentBounds.centerX, y: currentBounds.centerY });
      this.moveElement(element, { x: deltaX, y: 0 });
    });

    const editorState = useEditorStore.getState();
    editorState.pushToHistory();
  }

  stretchVertically() {
    const elements = this.getSelectedElements().filter(el => el.type === 'subpath');
    if (elements.length < 2) return;

    const overallBounds = this.getOverallBounds(elements);
    if (!overallBounds) return;

    elements.forEach((element) => {
      const currentBounds = element.bounds;
      
      // Calculate scale factor to match overall height
      const scaleY = overallBounds.height / currentBounds.height;
      
      // Calculate new position to maintain relative position within overall bounds
      const relativePosition = (currentBounds.y - overallBounds.y) / overallBounds.height;
      const newY = overallBounds.y + (relativePosition * overallBounds.height);
      const deltaY = newY - currentBounds.y;
      
      // Apply scaling and translation
      const editorState = useEditorStore.getState();
      editorState.scaleSubPath(element.id, 1, scaleY, { x: currentBounds.centerX, y: currentBounds.centerY });
      this.moveElement(element, { x: 0, y: deltaY });
    });

    const editorState = useEditorStore.getState();
    editorState.pushToHistory();
  }

  // Flip operations - Only available for subpaths as other elements don't support mirroring
  flipHorizontally() {
    const elements = this.getSelectedElements().filter(el => el.type === 'subpath');
    if (elements.length === 0) return;

    const overallBounds = this.getOverallBounds(elements);
    if (!overallBounds) return;

    elements.forEach((element) => {
      const editorState = useEditorStore.getState();
      editorState.mirrorSubPathHorizontal(element.id, { x: overallBounds.centerX, y: overallBounds.centerY });
    });

    const editorState = useEditorStore.getState();
    editorState.pushToHistory();
  }

  flipVertically() {
    const elements = this.getSelectedElements().filter(el => el.type === 'subpath');
    if (elements.length === 0) return;

    const overallBounds = this.getOverallBounds(elements);
    if (!overallBounds) return;

    elements.forEach((element) => {
      const editorState = useEditorStore.getState();
      editorState.mirrorSubPathVertical(element.id, { x: overallBounds.centerX, y: overallBounds.centerY });
    });

    const editorState = useEditorStore.getState();
    editorState.pushToHistory();
  }

  pack() {
    const elements = this.getSelectedElements();
    if (elements.length < 2) return;

    // Sort by X position
    const sortedElements = [...elements].sort((a, b) => a.bounds.x - b.bounds.x);

    let currentX = sortedElements[0].bounds.x;

    sortedElements.forEach((element, sortedPosition) => {
      if (sortedPosition === 0) {
        currentX = element.bounds.x + element.bounds.width;
        return;
      }

      const deltaX = currentX - element.bounds.x;
      
      this.moveElement(element, { x: deltaX, y: 0 });
      
      currentX += element.bounds.width;
    });

    const editorState = useEditorStore.getState();
    editorState.pushToHistory();
  }

  // Stack operations
  stackHorizontally() {
    const elements = this.getSelectedElements();
    if (elements.length < 2) return;

    // Sort by X position and align their Y positions
    const sortedElements = [...elements].sort((a, b) => a.bounds.x - b.bounds.x);

    const baseY = sortedElements[0].bounds.y;
    let currentX = sortedElements[0].bounds.x + sortedElements[0].bounds.width;

    sortedElements.forEach((element, sortedPosition) => {
      if (sortedPosition === 0) return;

      const deltaX = currentX - element.bounds.x;
      const deltaY = baseY - element.bounds.y;
      
      this.moveElement(element, { x: deltaX, y: deltaY });
      
      currentX += element.bounds.width;
    });

    const editorState = useEditorStore.getState();
    editorState.pushToHistory();
  }

  stackVertically() {
    const elements = this.getSelectedElements();
    if (elements.length < 2) return;

    // Sort by Y position and align their X positions
    const sortedElements = [...elements].sort((a, b) => a.bounds.y - b.bounds.y);

    const baseX = sortedElements[0].bounds.x;
    let currentY = sortedElements[0].bounds.y + sortedElements[0].bounds.height;

    sortedElements.forEach((element, sortedPosition) => {
      if (sortedPosition === 0) return;

      const deltaX = baseX - element.bounds.x;
      const deltaY = currentY - element.bounds.y;
      
      this.moveElement(element, { x: deltaX, y: deltaY });
      
      currentY += element.bounds.height;
    });

    const editorState = useEditorStore.getState();
    editorState.pushToHistory();
  }

  hasValidSelection(): boolean {
    const editorState = useEditorStore.getState();
    const selection = editorState.selection;
    return (
      selection.selectedCommands.length > 0 ||
      selection.selectedSubPaths.length > 0 ||
      selection.selectedTexts.length > 0 ||
      selection.selectedImages.length > 0 ||
      selection.selectedUses.length > 0 ||
      selection.selectedGroups.length > 0
    );
  }
}

export const arrangeManager = new ArrangeManager();
