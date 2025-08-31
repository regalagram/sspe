import { SVGCommand, Point, ControlPointType, ControlPointInfo, BezierHandleState } from '../../types';
import { ResourceManager, Disposable } from '../../core/ResourceManager';

export class HandleManager implements Disposable {
  private editorStore: any;
  private resourceManager = new ResourceManager();
  private state: BezierHandleState = {
    controlPoints: new Map(),
    isOptionPressed: false,
    dragState: {
      isDragging: false,
      commandId: null,
      handleType: null,
      originalType: null,
      startPoint: null,
    }
  };
  private listeners: (() => void)[] = [];
  private dragHistory: Array<{ point: Point; timestamp: number }> = [];
  private lastDragTime: number = 0;
  private velocityThreshold: number = 800;
  private snapToGridActive: boolean = false;
  private alignmentDebounceTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    this.setupKeyboardListeners();
  }
  setEditorStore(store: any) {
    if (this.editorStore === store) {
      return;
    }
    this.editorStore = store;
    this.setupSelectionListener();
  }
  
  private setupSelectionListener() {
    if (!this.editorStore) return;
    // Setup will be handled manually through onSelectionChanged calls
  }
  private updateControlPointsForSelection(selectedCommands: string[]) {
    
    this.state.controlPoints.clear();
    
    // Get all commands that should show control points (selected + next commands)
    const commandsToShow = this.getCommandsToShowControlPoints(selectedCommands);
    
    commandsToShow.forEach(commandId => {
      const controlPointInfo = this.analyzeControlPoint(commandId);
      if (controlPointInfo) {
        this.state.controlPoints.set(commandId, controlPointInfo);
        
      } else {
        
      }
    });
    
    
    this.notifyListeners();
  }
  addListener(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
  private setupKeyboardListeners() {
    this.resourceManager.addEventListener(document, 'keydown', this.handleKeyDown);
    this.resourceManager.addEventListener(document, 'keyup', this.handleKeyUp);
  }
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Alt' || e.key === 'Option') {
      this.state.isOptionPressed = true;
      this.updateControlPointsForOptionState();
      this.notifyListeners();
    }
  };
  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Alt' || e.key === 'Option') {
      this.state.isOptionPressed = false;
      this.updateControlPointsForOptionState();
      this.notifyListeners();
    }
  };
  public simulateKeyDown(e: KeyboardEvent) {
    this.handleKeyDown(e);
  }
  public simulateKeyUp(e: KeyboardEvent) {
    this.handleKeyUp(e);
  }
  public forceUpdateControlPoints() {
    if (!this.editorStore) {
      return;
    }
    const currentSelectedCommands = this.editorStore.selection.selectedCommands || [];
    const currentSelectedSubPaths = this.editorStore.selection.selectedSubPaths || [];
    
    // Filter commands to only show those that belong to currently selected sub-paths
    const validCommands = this.filterCommandsBySelectedSubPaths(currentSelectedCommands, currentSelectedSubPaths);
    this.updateControlPointsForSelection(validCommands);
  }
  /**
   * Método público para que otros plugins puedan notificar cambios de selección
   */
  public onSelectionChanged() {
    if (this.editorStore) {
      // Use a small timeout to ensure the store state has been updated
      setTimeout(() => {
        if (this.editorStore) {
          const selectedCommands = this.editorStore.selection.selectedCommands || [];
          const selectedSubPaths = this.editorStore.selection.selectedSubPaths || [];
          
          // If we have selected commands, show their control points
          if (selectedCommands.length > 0) {
            // Filter commands to only show those that belong to currently selected sub-paths
            const validCommands = this.filterCommandsBySelectedSubPaths(selectedCommands, selectedSubPaths);
            this.updateControlPointsForSelection(validCommands);
          } else {
            // No commands selected, clear all control points
            this.state.controlPoints.clear();
            this.notifyListeners();
          }
        }
      }, 1); // Very small delay to ensure store update
    }
  }

  /**
   * Filter commands to only include those that belong to the currently selected sub-paths.
   * This prevents showing control points for commands from previously selected sub-paths
   * when switching to a different sub-path selection.
   */
  private filterCommandsBySelectedSubPaths(selectedCommands: string[], selectedSubPaths: string[]): string[] {
    if (!this.editorStore || selectedSubPaths.length === 0) {
      return selectedCommands;
    }

    const { paths } = this.editorStore;
    const validCommands: string[] = [];

    selectedCommands.forEach(commandId => {
      // Find which sub-path this command belongs to
      for (const path of paths) {
        for (const subPath of path.subPaths) {
          if (selectedSubPaths.includes(subPath.id)) {
            const commandExists = subPath.commands.some((cmd: SVGCommand) => cmd.id === commandId);
            if (commandExists) {
              validCommands.push(commandId);
              return; // Found the command in a selected sub-path, move to next command
            }
          }
        }
      }
    });

    return validCommands;
  }

  /**
   * Analiza un comando para determinar el tipo de punto de control
   */
  analyzeControlPoint(commandId: string): ControlPointInfo | null {
        
    if (!this.editorStore) {
            return null;
    }
    const { paths } = this.editorStore;
    
        
    for (const path of paths) {
            for (const subPath of path.subPaths) {
                const commandIndex = subPath.commands.findIndex((cmd: SVGCommand) => cmd.id === commandId);
        if (commandIndex !== -1) {
                    const command = subPath.commands[commandIndex];
          const prevCommand = commandIndex > 0 ? subPath.commands[commandIndex - 1] : null;
          const nextCommand = commandIndex < subPath.commands.length - 1 ? subPath.commands[commandIndex + 1] : null;
          const result = this.createControlPointInfo(command, prevCommand, nextCommand, subPath, commandIndex);
                    return result;
        }
      }
    }
        return null;
  }
  private createControlPointInfo(
    command: SVGCommand,
    prevCommand: SVGCommand | null,
    nextCommand: SVGCommand | null,
    subPath?: any,
    commandIndex?: number
  ): ControlPointInfo {
    const anchor = { x: command.x || 0, y: command.y || 0 };
    const incomingHandle = this.getIncomingHandle(command, prevCommand, subPath, commandIndex);
    const outgoingHandle = this.getOutgoingHandle(command, nextCommand, subPath, commandIndex);
    const type = this.determineControlPointType(command, incomingHandle, outgoingHandle);
    const isBreakable = incomingHandle !== null && outgoingHandle !== null;
    const isNextCommandDisplay = this.isNextCommandDisplay(command.id);
    
    return {
      commandId: command.id,
      type,
      incomingHandle,
      outgoingHandle,
      anchor,
      isBreakable,
      isNextCommandDisplay
    };
  }
  private getIncomingHandle(
    command: SVGCommand, 
    prevCommand: SVGCommand | null, 
    subPath?: any, 
    commandIndex?: number
  ): Point | null {
    if (!prevCommand) {
      // Caso especial: si es el primer comando de curva en un path cerrado,
      // buscar el handle del último comando
      if (subPath && commandIndex !== undefined && command.command === 'C' && this.isSubPathClosed(subPath)) {
        // Verificar si este es realmente el primer comando de curva (después de M)
        let isFirstCurveCommand = true;
        for (let i = 1; i < commandIndex; i++) {
          if (subPath.commands[i].command === 'C') {
            isFirstCurveCommand = false;
            break;
          }
        }
        
        if (isFirstCurveCommand) {
          // Buscar el último comando de tipo C
          for (let i = subPath.commands.length - 1; i >= 1; i--) {
            const lastCurveCommand = subPath.commands[i];
            if (lastCurveCommand.command === 'C' && lastCurveCommand.x2 !== undefined && lastCurveCommand.y2 !== undefined) {
              return { x: lastCurveCommand.x2, y: lastCurveCommand.y2 };
            }
          }
        }
      }
      return null;
    }
    
    if (prevCommand.command === 'C' && prevCommand.x2 !== undefined && prevCommand.y2 !== undefined) {
      return { x: prevCommand.x2, y: prevCommand.y2 };
    }
    return null;
  }
  private getOutgoingHandle(
    command: SVGCommand, 
    nextCommand: SVGCommand | null, 
    subPath?: any, 
    commandIndex?: number
  ): Point | null {
    if (!nextCommand) {
      // Caso especial: si es el último comando en un path cerrado,
      // buscar el handle del primer comando de curva
      if (subPath && commandIndex !== undefined && this.isSubPathClosed(subPath)) {
        // Verificar si este es realmente el último comando de curva
        let isLastCurveCommand = true;
        for (let i = commandIndex + 1; i < subPath.commands.length; i++) {
          if (subPath.commands[i].command === 'C') {
            isLastCurveCommand = false;
            break;
          }
        }
        
        if (isLastCurveCommand) {
          // Buscar el primer comando de tipo C (después del M inicial)
          for (let i = 1; i < subPath.commands.length; i++) {
            const firstCurveCommand = subPath.commands[i];
            if (firstCurveCommand.command === 'C' && firstCurveCommand.x1 !== undefined && firstCurveCommand.y1 !== undefined) {
              return { x: firstCurveCommand.x1, y: firstCurveCommand.y1 };
            }
          }
        }
      }
      return null;
    }
    
    if (nextCommand.command === 'C' && nextCommand.x1 !== undefined && nextCommand.y1 !== undefined) {
      return { x: nextCommand.x1, y: nextCommand.y1 };
    }
    return null;
  }
  private determineControlPointType(
    command: SVGCommand,
    incomingHandle: Point | null,
    outgoingHandle: Point | null
  ): ControlPointType {
    if (!incomingHandle || !outgoingHandle) {
      return 'independent';
    }
    const anchor = { x: command.x || 0, y: command.y || 0 };
    const incomingVector = {
      x: incomingHandle.x - anchor.x,
      y: incomingHandle.y - anchor.y
    };
    const outgoingVector = {
      x: outgoingHandle.x - anchor.x,
      y: outgoingHandle.y - anchor.y
    };
    const incomingMagnitude = Math.sqrt(incomingVector.x * incomingVector.x + incomingVector.y * incomingVector.y);
    const outgoingMagnitude = Math.sqrt(outgoingVector.x * outgoingVector.x + outgoingVector.y * outgoingVector.y);
    if (incomingMagnitude === 0 || outgoingMagnitude === 0) {
      return 'independent';
    }
    const incomingUnit = {
      x: incomingVector.x / incomingMagnitude,
      y: incomingVector.y / incomingMagnitude
    };
    const outgoingUnit = {
      x: outgoingVector.x / outgoingMagnitude,
      y: outgoingVector.y / outgoingMagnitude
    };
    const dotProduct = incomingUnit.x * (-outgoingUnit.x) + incomingUnit.y * (-outgoingUnit.y);
    const alignmentThreshold = 0.985;
    if (dotProduct > alignmentThreshold) {
      const magnitudeRatio = Math.min(incomingMagnitude, outgoingMagnitude) / Math.max(incomingMagnitude, outgoingMagnitude);
      if (magnitudeRatio > 0.9) {
        return 'mirrored';
      } else {
        return 'aligned';
      }
    }
    return 'independent';
  }
  /**
   * Actualiza todos los puntos de control para reflejar el estado de la tecla Option
   */
  updateControlPointsForOptionState() {
    if (!this.editorStore) return;
    const { selection } = this.editorStore;
    selection.selectedCommands.forEach((commandId: string) => {
      const controlPointInfo = this.analyzeControlPoint(commandId);
      if (controlPointInfo) {
        this.state.controlPoints.set(commandId, controlPointInfo);
      }
    });
  }
  /**
   * Inicia el arrastre de un handle de control
   */
  startDragHandle(commandId: string, handleType: 'incoming' | 'outgoing', startPoint: Point) {
        
    this.dragHistory = [];
    this.lastDragTime = Date.now();
    const controlPointInfo = this.analyzeControlPoint(commandId);
    
        
    if (!controlPointInfo) {
            return;
    }
    const pairInfo = this.detectInitialPairAlignment(commandId, handleType, controlPointInfo);
    
        
    this.state.controlPoints.set(commandId, {
      ...controlPointInfo,
      type: pairInfo.type
    });
    this.state.dragState = {
      isDragging: true,
      commandId,
      handleType,
      originalType: pairInfo.type,
      startPoint,
      pairInfo: pairInfo
    };
    
        
    this.notifyListeners();
  }
  /**
   * Actualiza la posición del handle durante el arrastre
   */
  updateDragHandle(newPoint: Point) {
    const { dragState } = this.state;
    if (!dragState.isDragging || !dragState.commandId || !dragState.handleType) {
      return;
    }
    const controlPointInfo = this.state.controlPoints.get(dragState.commandId);
    if (!controlPointInfo) {
      return;
    }
    this.applyNewHandleLogic(dragState.commandId, dragState.handleType, newPoint, dragState.pairInfo);
  }
  /**
   * Aplica la nueva lógica de manejo de handles
   */
  private applyNewHandleLogic(
    commandId: string,
    handleType: 'incoming' | 'outgoing',
    newPoint: Point,
    pairInfo?: {
      type: ControlPointType;
      pairedHandle: {
        commandId: string;
        handleType: 'incoming' | 'outgoing';
        anchor: Point;
        controlPoint: 'x1y1' | 'x2y2';
      } | null;
    }
  ) {
    if (this.state.isOptionPressed) {
      this.handleOptionPressedLogic(commandId, handleType, newPoint, pairInfo);
    } else {
      this.handleNormalDragLogic(commandId, handleType, newPoint, pairInfo);
    }
    this.notifyListeners();
  }
  /**
   * Maneja la lógica cuando Option está presionada
   */
  private handleOptionPressedLogic(
    commandId: string,
    handleType: 'incoming' | 'outgoing',
    newPoint: Point,
    pairInfo?: {
      type: ControlPointType;
      pairedHandle: {
        commandId: string;
        handleType: 'incoming' | 'outgoing';
        anchor: Point;
        controlPoint: 'x1y1' | 'x2y2';
      } | null;
    }
  ) {
    this.updateSingleHandle(commandId, handleType, newPoint);
    if (pairInfo?.pairedHandle) {
      this.checkRealTimeAlignment(commandId, handleType, newPoint, pairInfo.pairedHandle);
    }
  }
  /**
   * Maneja la lógica sin Option presionada
   */
  private handleNormalDragLogic(
    commandId: string,
    handleType: 'incoming' | 'outgoing',
    newPoint: Point,
    pairInfo?: {
      type: ControlPointType;
      pairedHandle: {
        commandId: string;
        handleType: 'incoming' | 'outgoing';
        anchor: Point;
        controlPoint: 'x1y1' | 'x2y2';
      } | null;
    }
  ) {
    this.updateSingleHandle(commandId, handleType, newPoint);
    if (pairInfo?.pairedHandle && (pairInfo.type === 'aligned' || pairInfo.type === 'mirrored')) {
      this.synchronizePairedHandle(commandId, handleType, newPoint, pairInfo.pairedHandle, pairInfo.type);
    }
  }
  /**
   * Sincroniza el handle pareja según el tipo
   */
  private synchronizePairedHandle(
    commandId: string,
    handleType: 'incoming' | 'outgoing',
    newPoint: Point,
    pairedHandle: {
      commandId: string;
      handleType: 'incoming' | 'outgoing';
      anchor: Point;
      controlPoint: 'x1y1' | 'x2y2';
    },
    pairType: ControlPointType
  ) {
    const sharedAnchor = pairedHandle.anchor;
    const currentVector = {
      x: newPoint.x - sharedAnchor.x,
      y: newPoint.y - sharedAnchor.y
    };
    const magnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);
    if (magnitude === 0) return;
    const unitVector = {
      x: currentVector.x / magnitude,
      y: currentVector.y / magnitude
    };
    if (pairType === 'mirrored') {
      const oppositePoint = {
        x: sharedAnchor.x + (-unitVector.x * magnitude),
        y: sharedAnchor.y + (-unitVector.y * magnitude)
      };
      this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    } else if (pairType === 'aligned') {
      const originalMagnitude = this.getHandleMagnitude(pairedHandle);
      const oppositePoint = {
        x: sharedAnchor.x + (-unitVector.x * originalMagnitude),
        y: sharedAnchor.y + (-unitVector.y * originalMagnitude)
      };
      this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    }
  }
  /**
   * Verifica alineación en tiempo real cuando Option está presionada
   */
  private checkRealTimeAlignment(
    commandId: string,
    handleType: 'incoming' | 'outgoing',
    newPoint: Point,
    pairedHandle: {
      commandId: string;
      handleType: 'incoming' | 'outgoing';
      anchor: Point;
      controlPoint: 'x1y1' | 'x2y2';
    }
  ) {
    const pairedHandlePosition = this.getHandlePosition(pairedHandle);
    if (!pairedHandlePosition) return;
    const sharedAnchor = pairedHandle.anchor;
    const currentVector = {
      x: newPoint.x - sharedAnchor.x,
      y: newPoint.y - sharedAnchor.y
    };
    const pairedVector = {
      x: pairedHandlePosition.x - sharedAnchor.x,
      y: pairedHandlePosition.y - sharedAnchor.y
    };
    const newType = this.determinePairType(currentVector, pairedVector);
    if (newType === 'aligned' || newType === 'mirrored') {
      this.synchronizePairedHandle(commandId, handleType, newPoint, pairedHandle, newType);
      const controlPointInfo = this.state.controlPoints.get(commandId);
      if (controlPointInfo) {
        this.state.controlPoints.set(commandId, {
          ...controlPointInfo,
          type: newType
        });
      }
    }
  }
  /**
   * Aplica la lógica de manejo de handles
   * @deprecated - Usar applyNewHandleLogic en su lugar
   */
  private applyHandleLogic(
    commandId: string,
    handleType: 'incoming' | 'outgoing',
    newPoint: Point,
    controlPointInfo: ControlPointInfo
  ) {
    const { updateCommand } = this.editorStore;
    const { anchor, type } = controlPointInfo;
    if (this.state.isOptionPressed) {
      this.updateSingleHandle(commandId, handleType, newPoint);
      const updatedInfo = { ...controlPointInfo, type: 'independent' as ControlPointType };
      this.state.controlPoints.set(commandId, updatedInfo);
    } else {
      this.updateHandleWithAutoAlignment(commandId, handleType, newPoint, anchor, type);
    }
    this.notifyListeners();
  }
  private updateHandleWithAutoAlignment(
    commandId: string,
    handleType: 'incoming' | 'outgoing',
    newPoint: Point,
    anchor: Point,
    originalType: ControlPointType
  ) {
    this.updateSingleHandle(commandId, handleType, newPoint);
    const pairedHandle = this.findPairedHandle(commandId, handleType);
    if (!pairedHandle) {
      return;
    }
    const pairedHandlePosition = this.getHandlePosition(pairedHandle);
    if (!pairedHandlePosition) {
      return;
    }
    const sharedAnchor = pairedHandle.anchor;
    const currentVector = {
      x: newPoint.x - sharedAnchor.x,
      y: newPoint.y - sharedAnchor.y
    };
    const pairedVector = {
      x: pairedHandlePosition.x - sharedAnchor.x,
      y: pairedHandlePosition.y - sharedAnchor.y
    };
    const velocity = this.calculateDragVelocity(newPoint);
    const shouldApply = this.shouldApplyAlignment(velocity, currentVector, pairedVector);
    if (shouldApply) {
      const currentMagnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);
      const pairedMagnitude = Math.sqrt(pairedVector.x * pairedVector.x + pairedVector.y * pairedVector.y);
      const magnitudeRatio = Math.min(currentMagnitude, pairedMagnitude) / Math.max(currentMagnitude, pairedMagnitude);
      const shouldBeMirrored = magnitudeRatio > 0.9;
      if (shouldBeMirrored) {
        this.updatePairedHandleMirrored(pairedHandle, currentVector, sharedAnchor);
      } else {
        this.updatePairedHandleAligned(pairedHandle, currentVector, sharedAnchor);
      }
    } else {
    }
  }
  private debounceAlignment(callback: () => void, delay: number = 100) {
    if (this.alignmentDebounceTimer) {
      this.resourceManager.clearTimer(this.alignmentDebounceTimer);
      this.alignmentDebounceTimer = null;
    }
    this.alignmentDebounceTimer = this.resourceManager.registerTimer(setTimeout(callback, delay));
  }
  private shouldApplyAlignment(velocity: number, currentVector: Point, pairedVector: Point): boolean {
    if (this.isDragTooFast(velocity)) {
      return false;
    }
    if (this.snapToGridActive) {
      const gridState = this.editorStore?.grid || {};
      const gridSize = gridState.size || 20;
      if (gridSize > 50) {
        return false;
      }
    }
    const isAligned = this.snapToGridActive
      ? this.areHandlesAlignedWithGridTolerance(currentVector, pairedVector)
      : this.areHandlesAligned(currentVector, pairedVector);
    return isAligned;
  }
  private calculateDragVelocity(currentPoint: Point): number {
    const now = Date.now();
    const currentEntry = { point: currentPoint, timestamp: now };
    this.dragHistory.push(currentEntry);
    if (this.dragHistory.length > 5) {
      this.dragHistory.shift();
    }
    if (this.dragHistory.length < 2) {
      return 0;
    }
    const firstEntry = this.dragHistory[0];
    const lastEntry = this.dragHistory[this.dragHistory.length - 1];
    const deltaTime = lastEntry.timestamp - firstEntry.timestamp;
    if (deltaTime === 0) return 0;
    const deltaX = lastEntry.point.x - firstEntry.point.x;
    const deltaY = lastEntry.point.y - firstEntry.point.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = (distance / deltaTime) * 1000;
    return velocity;
  }
  private isDragTooFast(velocity: number): boolean {
    return velocity > this.velocityThreshold;
  }
  setVelocityThreshold(threshold: number) {
    this.velocityThreshold = threshold;
  }
  getVelocityThreshold(): number {
    return this.velocityThreshold;
  }
  getVelocityStats(): { current: number; threshold: number; isActive: boolean } {
    const currentVelocity = this.dragHistory.length >= 2 ? this.calculateDragVelocity(this.dragHistory[this.dragHistory.length - 1].point) : 0;
    return {
      current: currentVelocity,
      threshold: this.velocityThreshold,
      isActive: this.isDragTooFast(currentVelocity)
    };
  }
  private isSnapToGridInterfering(originalPoint: Point, snappedPoint: Point): boolean {
    const snapDistance = Math.sqrt(
      Math.pow(snappedPoint.x - originalPoint.x, 2) +
      Math.pow(snappedPoint.y - originalPoint.y, 2)
    );
    return snapDistance > 5;
  }
  private areHandlesAligned(vector1: Point, vector2: Point): boolean {
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    if (magnitude1 === 0 || magnitude2 === 0) {
      return false;
    }
    const unit1 = { x: vector1.x / magnitude1, y: vector1.y / magnitude1 };
    const unit2 = { x: vector2.x / magnitude2, y: vector2.y / magnitude2 };
    const dotProduct = unit1.x * (-unit2.x) + unit1.y * (-unit2.y);
    const isAligned = dotProduct > 0.966;
    return isAligned;
  }
  private areHandlesAlignedWithGridTolerance(vector1: Point, vector2: Point): boolean {
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    if (magnitude1 === 0 || magnitude2 === 0) {
      return false;
    }
    const unit1 = { x: vector1.x / magnitude1, y: vector1.y / magnitude1 };
    const unit2 = { x: vector2.x / magnitude2, y: vector2.y / magnitude2 };
    const dotProduct = unit1.x * (-unit2.x) + unit1.y * (-unit2.y);
    const isAligned = dotProduct > 0.85;
    return isAligned;
  }
  private updatePairedHandleMirrored(pairedHandle: any, currentVector: Point, sharedAnchor: Point) {
    const magnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);
    if (magnitude === 0) {
      return;
    }
    const unitVector = {
      x: currentVector.x / magnitude,
      y: currentVector.y / magnitude
    };
    const oppositePoint = {
      x: sharedAnchor.x + (-unitVector.x * magnitude),
      y: sharedAnchor.y + (-unitVector.y * magnitude)
    };
    this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    if (this.editorStore && this.editorStore.forceRender) {
      this.editorStore.forceRender();
    }
  }
  private updatePairedHandleAligned(pairedHandle: any, currentVector: Point, sharedAnchor: Point) {
    const magnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);
    if (magnitude === 0) {
      return;
    }
    const unitVector = {
      x: currentVector.x / magnitude,
      y: currentVector.y / magnitude
    };
    const pairedHandlePosition = this.getHandlePosition(pairedHandle);
    if (!pairedHandlePosition) {
      return;
    }
    const originalPairedVector = {
      x: pairedHandlePosition.x - sharedAnchor.x,
      y: pairedHandlePosition.y - sharedAnchor.y
    };
    const originalMagnitude = Math.sqrt(originalPairedVector.x * originalPairedVector.x + originalPairedVector.y * originalPairedVector.y);
    const oppositePoint = {
      x: sharedAnchor.x + (-unitVector.x * originalMagnitude),
      y: sharedAnchor.y + (-unitVector.y * originalMagnitude)
    };
    this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    if (this.editorStore && this.editorStore.forceRender) {
      this.editorStore.forceRender();
    }
  }
  private getHandlePosition(handleInfo: {
    commandId: string;
    handleType: 'incoming' | 'outgoing';
    anchor: Point;
    controlPoint: 'x1y1' | 'x2y2';
  }): Point | null {
    if (!this.editorStore) {
      return null;
    }
    const { paths } = this.editorStore;
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const command = subPath.commands.find((cmd: SVGCommand) => cmd.id === handleInfo.commandId);
        if (command && command.command === 'C') {
          if (handleInfo.controlPoint === 'x1y1') {
            if (command.x1 !== undefined && command.y1 !== undefined) {
              const position = { x: command.x1, y: command.y1 };
              return position;
            } else {
            }
          } else {
            if (command.x2 !== undefined && command.y2 !== undefined) {
              const position = { x: command.x2, y: command.y2 };
              return position;
            } else {
            }
          }
        }
      }
    }
    return null;
  }
  private updateSingleHandle(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point) {
    const { updateCommand } = this.editorStore;
    const controlPointInfo = this.state.controlPoints.get(commandId);
    const anchorPoint = controlPointInfo?.anchor || { x: 0, y: 0 };
    const finalPoint = this.smartSnapToGrid(newPoint, anchorPoint);
    if (handleType === 'outgoing') {
      updateCommand(commandId, { x1: finalPoint.x, y1: finalPoint.y });
    } else {
      updateCommand(commandId, { x2: finalPoint.x, y2: finalPoint.y });
    }
    
    // Force floating toolbar to reposition after command update
    if (this.editorStore?.forceFloatingToolbarUpdate) {
      this.editorStore.forceFloatingToolbarUpdate();
    }
  }
  private updateSingleHandleByControlPoint(commandId: string, controlPoint: 'x1y1' | 'x2y2', newPoint: Point) {
    if (!this.editorStore) {
      return;
    }
    const { updateCommand } = this.editorStore;
    if (!updateCommand) {
      return;
    }
    const controlPointInfo = this.state.controlPoints.get(commandId);
    const anchorPoint = controlPointInfo?.anchor || { x: 0, y: 0 };
    const finalPoint = this.smartSnapToGrid(newPoint, anchorPoint);
    if (controlPoint === 'x1y1') {
      updateCommand(commandId, { x1: finalPoint.x, y1: finalPoint.y });
    } else {
      updateCommand(commandId, { x2: finalPoint.x, y2: finalPoint.y });
    }
    
    // Force floating toolbar to reposition after command update
    if (this.editorStore?.forceFloatingToolbarUpdate) {
      this.editorStore.forceFloatingToolbarUpdate();
    }
  }
  private updateMirroredHandles(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point, anchor: Point) {
    const { updateCommand } = this.editorStore;
    this.updateSingleHandle(commandId, handleType, newPoint);
    const vector = {
      x: newPoint.x - anchor.x,
      y: newPoint.y - anchor.y
    };
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (magnitude === 0) return;
    const unitVector = {
      x: vector.x / magnitude,
      y: vector.y / magnitude
    };
    const pairedHandle = this.findPairedHandle(commandId, handleType);
    if (pairedHandle) {
      const oppositePoint = {
        x: pairedHandle.anchor.x - unitVector.x * magnitude,
        y: pairedHandle.anchor.y - unitVector.y * magnitude
      };
      this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    }
  }
  private updateAlignedHandles(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point, anchor: Point) {
    const { updateCommand } = this.editorStore;
    this.updateSingleHandle(commandId, handleType, newPoint);
    const vector = {
      x: newPoint.x - anchor.x,
      y: newPoint.y - anchor.y
    };
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (magnitude === 0) return;
    const unitVector = {
      x: vector.x / magnitude,
      y: vector.y / magnitude
    };
    const pairedHandle = this.findPairedHandle(commandId, handleType);
    if (pairedHandle) {
      const originalPairedMagnitude = this.getHandleMagnitude(pairedHandle);
      const oppositePoint = {
        x: pairedHandle.anchor.x - unitVector.x * originalPairedMagnitude,
        y: pairedHandle.anchor.y - unitVector.y * originalPairedMagnitude
      };
      this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    }
  }
  /**
   * Check if a subpath is closed (has Z command or ends where it starts)
   */
  private isSubPathClosed(subPath: any): boolean {
    if (!subPath.commands || subPath.commands.length === 0) return false;
    
    // Check for explicit Z command
    const lastCommand = subPath.commands[subPath.commands.length - 1];
    if (lastCommand.command.toLowerCase() === 'z') {
      return true;
    }
    
    // Check if the path ends where it starts
    const firstCommand = subPath.commands[0];
    const lastPosition = { x: lastCommand.x || 0, y: lastCommand.y || 0 };
    const firstPosition = { x: firstCommand.x || 0, y: firstCommand.y || 0 };
    
    const threshold = 1; // Allow small tolerance for floating point errors
    const distance = Math.sqrt(
      Math.pow(lastPosition.x - firstPosition.x, 2) + 
      Math.pow(lastPosition.y - firstPosition.y, 2)
    );
    
    return distance < threshold;
  }

  public findPairedHandle(commandId: string, handleType: 'incoming' | 'outgoing'): {
    commandId: string;
    handleType: 'incoming' | 'outgoing';
    anchor: Point;
    controlPoint: 'x1y1' | 'x2y2';
  } | null {
    if (!this.editorStore) return null;
    const { paths } = this.editorStore;
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const commandIndex = subPath.commands.findIndex((cmd: SVGCommand) => cmd.id === commandId);
        if (commandIndex !== -1) {
          const commands = subPath.commands;
          const currentCommand = commands[commandIndex];
          const isClosedPath = this.isSubPathClosed(subPath);
          
          // Debug logs para entender qué está pasando
          
          if (handleType === 'incoming') {
            // Buscar el siguiente comando
            if (commandIndex < commands.length - 1) {
              const nextCommand = commands[commandIndex + 1];
              if (nextCommand.command === 'C' && nextCommand.x1 !== undefined && nextCommand.y1 !== undefined) {
                const anchor = { x: currentCommand.x || 0, y: currentCommand.y || 0 };
                return {
                  commandId: nextCommand.id,
                  handleType: 'outgoing',
                  anchor: anchor,
                  controlPoint: 'x1y1'
                };
              }
            } else if (isClosedPath) {
              // Caso especial: último comando en path cerrado, buscar el primer comando de curva
              // Solo aplicar si este es realmente el último comando de curva
              let isLastCurveCommand = true;
              for (let i = commandIndex + 1; i < commands.length; i++) {
                if (commands[i].command === 'C') {
                  isLastCurveCommand = false;
                  break;
                }
              }
              
              if (isLastCurveCommand) {
                // Buscar el primer comando que sea tipo C (después del M inicial)
                for (let i = 1; i < commands.length; i++) {
                  const firstCurveCommand = commands[i];
                  if (firstCurveCommand.command === 'C' && firstCurveCommand.x1 !== undefined && firstCurveCommand.y1 !== undefined) {
                    const anchor = { x: currentCommand.x || 0, y: currentCommand.y || 0 };
                    return {
                      commandId: firstCurveCommand.id,
                      handleType: 'outgoing',
                      anchor: anchor,
                      controlPoint: 'x1y1'
                    };
                  }
                }
              }
            }
          } else {
            // handleType === 'outgoing'
            // Buscar el comando anterior
            if (commandIndex > 0) {
              const prevCommand = commands[commandIndex - 1];
              if (prevCommand.command === 'C' && prevCommand.x2 !== undefined && prevCommand.y2 !== undefined) {
                const anchor = { x: prevCommand.x || 0, y: prevCommand.y || 0 };
                return {
                  commandId: prevCommand.id,
                  handleType: 'incoming',
                  anchor: anchor,
                  controlPoint: 'x2y2'
                };
              }
              // Si el comando anterior no es tipo C, verificar si es caso especial de path cerrado
              else if (isClosedPath && currentCommand.command === 'C') {
                // Verificar si este es realmente el primer comando de curva (después de M)
                let isFirstCurveCommand = true;
                for (let i = 1; i < commandIndex; i++) {
                  if (commands[i].command === 'C') {
                    isFirstCurveCommand = false;
                    break;
                  }
                }
                
                if (isFirstCurveCommand) {
                  // Buscar el último comando que sea tipo C
                  for (let i = commands.length - 1; i >= 1; i--) {
                    const lastCurveCommand = commands[i];
                    if (lastCurveCommand.command === 'C' && lastCurveCommand.x2 !== undefined && lastCurveCommand.y2 !== undefined) {
                      // El anchor debe ser el punto del primer comando (M) que es donde ambos handles se conectan
                      const firstCommand = commands[0];
                      const anchor = { x: firstCommand.x || 0, y: firstCommand.y || 0 };
                      return {
                        commandId: lastCurveCommand.id,
                        handleType: 'incoming',
                        anchor: anchor,
                        controlPoint: 'x2y2'
                      };
                    }
                  }
                }
              }
            } else if (isClosedPath && currentCommand.command === 'C') {
              // Caso especial: primer comando de curva en path cerrado, buscar el último comando
              // Solo aplicar si este es realmente el primer comando de curva (después de M)
              let isFirstCurveCommand = true;
              for (let i = 1; i < commandIndex; i++) {
                if (commands[i].command === 'C') {
                  isFirstCurveCommand = false;
                  break;
                }
              }
              
              if (isFirstCurveCommand) {
                // Buscar el último comando que sea tipo C
                for (let i = commands.length - 1; i >= 1; i--) {
                  const lastCurveCommand = commands[i];
                  if (lastCurveCommand.command === 'C' && lastCurveCommand.x2 !== undefined && lastCurveCommand.y2 !== undefined) {
                    // El anchor debe ser el punto del primer comando (M) que es donde ambos handles se conectan
                    const firstCommand = commands[0];
                    const anchor = { x: firstCommand.x || 0, y: firstCommand.y || 0 };
                    return {
                      commandId: lastCurveCommand.id,
                      handleType: 'incoming',
                      anchor: anchor,
                      controlPoint: 'x2y2'
                    };
                  }
                }
              }
            }
          }
          
        }
      }
    }
    return null;
  }
  private getHandleMagnitude(handleInfo: {
    commandId: string;
    handleType: 'incoming' | 'outgoing';
    anchor: Point;
    controlPoint: 'x1y1' | 'x2y2';
  }): number {
    if (!this.editorStore) return 0;
    const { paths } = this.editorStore;
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const command = subPath.commands.find((cmd: SVGCommand) => cmd.id === handleInfo.commandId);
        if (command && command.command === 'C') {
          let handlePoint: Point;
          if (handleInfo.controlPoint === 'x1y1') {
            if (command.x1 !== undefined && command.y1 !== undefined) {
              handlePoint = { x: command.x1, y: command.y1 };
            } else {
              return 0;
            }
          } else {
            if (command.x2 !== undefined && command.y2 !== undefined) {
              handlePoint = { x: command.x2, y: command.y2 };
            } else {
              return 0;
            }
          }
          const vector = {
            x: handlePoint.x - handleInfo.anchor.x,
            y: handlePoint.y - handleInfo.anchor.y
          };
          return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        }
      }
    }
    return 0;
  }
  endDragHandle() {
    this.dragHistory = [];
    this.lastDragTime = 0;
    if (this.alignmentDebounceTimer) {
      clearTimeout(this.alignmentDebounceTimer);
      this.alignmentDebounceTimer = null;
    }
    this.state.dragState = {
      isDragging: false,
      commandId: null,
      handleType: null,
      originalType: null,
      startPoint: null,
      pairInfo: undefined
    };
    this.notifyListeners();
  }
  convertToMirrored(commandId: string) {
    const controlPointInfo = this.state.controlPoints.get(commandId);
    if (!controlPointInfo || !controlPointInfo.isBreakable) return;
    const { anchor, incomingHandle, outgoingHandle } = controlPointInfo;
    const { updateCommand } = this.editorStore;
    if (!incomingHandle || !outgoingHandle) return;
    const incomingVector = {
      x: incomingHandle.x - anchor.x,
      y: incomingHandle.y - anchor.y
    };
    const outgoingVector = {
      x: outgoingHandle.x - anchor.x,
      y: outgoingHandle.y - anchor.y
    };
    const incomingMagnitude = Math.sqrt(incomingVector.x * incomingVector.x + incomingVector.y * incomingVector.y);
    const outgoingMagnitude = Math.sqrt(outgoingVector.x * outgoingVector.x + outgoingVector.y * outgoingVector.y);
    const referenceVector = incomingMagnitude > outgoingMagnitude ? incomingVector : outgoingVector;
    const referenceMagnitude = Math.max(incomingMagnitude, outgoingMagnitude);
    if (referenceMagnitude === 0) return;
    const unitVector = {
      x: referenceVector.x / referenceMagnitude,
      y: referenceVector.y / referenceMagnitude
    };
    const newIncomingHandle = {
      x: anchor.x + unitVector.x * referenceMagnitude,
      y: anchor.y + unitVector.y * referenceMagnitude
    };
    const newOutgoingHandle = {
      x: anchor.x - unitVector.x * referenceMagnitude,
      y: anchor.y - unitVector.y * referenceMagnitude
    };
    updateCommand(commandId, {
      x2: newIncomingHandle.x,
      y2: newIncomingHandle.y,
      x1: newOutgoingHandle.x,
      y1: newOutgoingHandle.y
    });
    
    // Force floating toolbar to reposition after command update
    if (this.editorStore?.forceFloatingToolbarUpdate) {
      this.editorStore.forceFloatingToolbarUpdate();
    }
    const updatedInfo = { ...controlPointInfo, type: 'mirrored' as ControlPointType };
    this.state.controlPoints.set(commandId, updatedInfo);
    this.notifyListeners();
  }
  private findPreviousCommand(commandId: string): SVGCommand | null {
    if (!this.editorStore) return null;
    const { paths } = this.editorStore;
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const commandIndex = subPath.commands.findIndex((cmd: SVGCommand) => cmd.id === commandId);
        if (commandIndex > 0) {
          return subPath.commands[commandIndex - 1];
        }
      }
    }
    return null;
  }
  private findNextCommand(commandId: string): SVGCommand | null {
    if (!this.editorStore) return null;
    const { paths } = this.editorStore;
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const commandIndex = subPath.commands.findIndex((cmd: SVGCommand) => cmd.id === commandId);
        if (commandIndex !== -1 && commandIndex < subPath.commands.length - 1) {
          return subPath.commands[commandIndex + 1];
        }
      }
    }
    return null;
  }
  getState(): BezierHandleState {
    return this.state;
  }
  cleanup() {
    this.dispose();
  }

  dispose() {
    // Clear alignment debounce timer
    if (this.alignmentDebounceTimer) {
      clearTimeout(this.alignmentDebounceTimer);
      this.alignmentDebounceTimer = null;
    }
    
    // Dispose all managed resources
    this.resourceManager.dispose();
    
    // Clear internal state
    this.listeners = [];
    this.dragHistory = [];
    this.state.controlPoints.clear();
  }
  private smartSnapToGrid(point: Point, anchorPoint: Point): Point {
    if (!this.snapToGridActive || !this.editorStore?.grid) {
      return point;
    }
    const gridState = this.editorStore.grid;
    const gridSize = gridState.size || 20;
    const snappedPoint = {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
    const originalVector = {
      x: point.x - anchorPoint.x,
      y: point.y - anchorPoint.y
    };
    const snappedVector = {
      x: snappedPoint.x - anchorPoint.x,
      y: snappedPoint.y - anchorPoint.y
    };
    const originalAngle = Math.atan2(originalVector.y, originalVector.x);
    const snappedAngle = Math.atan2(snappedVector.y, snappedVector.x);
    const angleDiff = Math.abs(originalAngle - snappedAngle);
    if (angleDiff > Math.PI / 18) {
      return point;
    }
    return snappedPoint;
  }
  private detectInitialPairAlignment(
    commandId: string,
    handleType: 'incoming' | 'outgoing',
    controlPointInfo: ControlPointInfo
  ): {
    type: ControlPointType;
    pairedHandle: {
      commandId: string;
      handleType: 'incoming' | 'outgoing';
      anchor: Point;
      controlPoint: 'x1y1' | 'x2y2';
    } | null;
  } {
    const pairedHandle = this.findPairedHandle(commandId, handleType);
    if (!pairedHandle) {
      return {
        type: 'independent',
        pairedHandle: null
      };
    }
    const currentHandlePosition = this.getCurrentHandlePosition(commandId, handleType);
    const pairedHandlePosition = this.getHandlePosition(pairedHandle);
    if (!currentHandlePosition || !pairedHandlePosition) {
      return {
        type: 'independent',
        pairedHandle: null
      };
    }
    const sharedAnchor = pairedHandle.anchor;
    const currentVector = {
      x: currentHandlePosition.x - sharedAnchor.x,
      y: currentHandlePosition.y - sharedAnchor.y
    };
    const pairedVector = {
      x: pairedHandlePosition.x - sharedAnchor.x,
      y: pairedHandlePosition.y - sharedAnchor.y
    };
    const type = this.determinePairType(currentVector, pairedVector);
    return {
      type,
      pairedHandle
    };
  }
  private getCurrentHandlePosition(commandId: string, handleType: 'incoming' | 'outgoing'): Point | null {
    if (!this.editorStore) return null;
    const { paths } = this.editorStore;
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const command = subPath.commands.find((cmd: SVGCommand) => cmd.id === commandId);
        if (command && command.command === 'C') {
          if (handleType === 'outgoing') {
            if (command.x1 !== undefined && command.y1 !== undefined) {
              return { x: command.x1, y: command.y1 };
            }
          } else {
            if (command.x2 !== undefined && command.y2 !== undefined) {
              return { x: command.x2, y: command.y2 };
            }
          }
        }
      }
    }
    return null;
  }
  private determinePairType(vector1: Point, vector2: Point): ControlPointType {
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 'independent';
    }
    const unit1 = { x: vector1.x / magnitude1, y: vector1.y / magnitude1 };
    const unit2 = { x: vector2.x / magnitude2, y: vector2.y / magnitude2 };
    const dotProduct = unit1.x * (-unit2.x) + unit1.y * (-unit2.y);
    const alignmentThreshold = 0.966;
    if (dotProduct > alignmentThreshold) {
      const magnitudeRatio = Math.min(magnitude1, magnitude2) / Math.max(magnitude1, magnitude2);
      if (magnitudeRatio > 0.9) {
        return 'mirrored';
      } else {
        return 'aligned';
      }
    }
    return 'independent';
  }
  /**
   * Get all commands that should show control points (selected + next commands)
   */
  private getCommandsToShowControlPoints(selectedCommands: string[]): string[] {
    if (!this.editorStore) {
      return selectedCommands;
    }

    const commandsToShow = new Set<string>();
    
    // Add all selected commands
    selectedCommands.forEach(commandId => {
      commandsToShow.add(commandId);
    });

    // For each selected command, also add the next command if it exists
    selectedCommands.forEach(commandId => {
      const nextCommandId = this.getNextCommandId(commandId);
      if (nextCommandId) {
        commandsToShow.add(nextCommandId);
        
      }
    });

    const result = Array.from(commandsToShow);
    
    return result;
  }

  /**
   * Get the ID of the next command after the given command
   */
  private getNextCommandId(commandId: string): string | null {
    if (!this.editorStore) {
      return null;
    }

    const { paths } = this.editorStore;
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const commandIndex = subPath.commands.findIndex((cmd: SVGCommand) => cmd.id === commandId);
        if (commandIndex !== -1) {
          // Check if there's a next command in the same subPath
          if (commandIndex < subPath.commands.length - 1) {
            return subPath.commands[commandIndex + 1].id;
          }
          // If it's the last command in the subPath, return null
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Check if a command is being shown as the "next" command (not directly selected)
   */
  private isNextCommandDisplay(commandId: string): boolean {
    if (!this.editorStore) {
      return false;
    }
    
    const selectedCommands = this.editorStore.selection.selectedCommands || [];
    
    // If the command is directly selected, it's not a "next" command display
    if (selectedCommands.includes(commandId)) {
      return false;
    }
    
    // Check if this command is the next command of any selected command
    return selectedCommands.some((selectedId: string) => {
      const nextId = this.getNextCommandId(selectedId);
      return nextId === commandId;
    });
  }
}
export const handleManager = new HandleManager();
