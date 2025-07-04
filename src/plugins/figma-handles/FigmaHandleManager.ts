import { SVGCommand, Point, ControlPointType, ControlPointInfo, BezierHandleState } from '../../types';
export class FigmaHandleManager {
  private editorStore: any;
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
  private alignmentDebounceTimer: any = null;
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
  }
  private updateControlPointsForSelection(selectedCommands: string[]) {
    this.state.controlPoints.clear();
    selectedCommands.forEach(commandId => {
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
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
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
    this.updateControlPointsForSelection(currentSelectedCommands);
  }
  /**
   * Método público para que otros plugins puedan notificar cambios de selección
   */
  public onSelectionChanged() {
    if (this.editorStore) {
      const selectedCommands = this.editorStore.selection.selectedCommands || [];
      if (selectedCommands.length > 0) {
        this.updateControlPointsForSelection(selectedCommands);
      } else {
        this.state.controlPoints.clear();
        this.notifyListeners();
      }
    }
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
          return this.createControlPointInfo(command, prevCommand, nextCommand);
        }
      }
    }
    return null;
  }
  private createControlPointInfo(
    command: SVGCommand,
    prevCommand: SVGCommand | null,
    nextCommand: SVGCommand | null
  ): ControlPointInfo {
    const anchor = { x: command.x || 0, y: command.y || 0 };
    const incomingHandle = this.getIncomingHandle(command, prevCommand);
    const outgoingHandle = this.getOutgoingHandle(command, nextCommand);
    const type = this.determineControlPointType(command, incomingHandle, outgoingHandle);
    const isBreakable = incomingHandle !== null && outgoingHandle !== null;
    return {
      commandId: command.id,
      type,
      incomingHandle,
      outgoingHandle,
      anchor,
      isBreakable
    };
  }
  private getIncomingHandle(command: SVGCommand, prevCommand: SVGCommand | null): Point | null {
    if (!prevCommand) return null;
    if (prevCommand.command === 'C' && prevCommand.x2 !== undefined && prevCommand.y2 !== undefined) {
      return { x: prevCommand.x2, y: prevCommand.y2 };
    }
    return null;
  }
  private getOutgoingHandle(command: SVGCommand, nextCommand: SVGCommand | null): Point | null {
    if (!nextCommand) return null;
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
    this.applyNewFigmaHandleLogic(dragState.commandId, dragState.handleType, newPoint, dragState.pairInfo);
  }
  /**
   * Aplica la nueva lógica de manejo de handles tipo Figma
   */
  private applyNewFigmaHandleLogic(
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
   * Aplica la lógica de manejo de handles tipo Figma
   * @deprecated - Usar applyNewFigmaHandleLogic en su lugar
   */
  private applyFigmaHandleLogic(
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
      clearTimeout(this.alignmentDebounceTimer);
    }
    this.alignmentDebounceTimer = setTimeout(callback, delay);
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
  }
  private updateMirroredHandlesFigma(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point, anchor: Point) {
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
  private updateAlignedHandlesFigma(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point, anchor: Point) {
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
          if (handleType === 'incoming') {
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
            }
          } else {
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
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
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
}
export const figmaHandleManager = new FigmaHandleManager();
