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

  constructor() {
    this.setupKeyboardListeners();
  }

  setEditorStore(store: any) {
    this.editorStore = store;
    
    // Suscribirse a cambios en la selección para actualizar automáticamente
    this.setupSelectionListener();
  }

  private setupSelectionListener() {
    if (!this.editorStore) return;
    
    // Escuchar cambios en la selección para actualizar automáticamente los puntos de control
    let lastSelectedCommands: string[] = [];
    
    const checkSelectionChanges = () => {
      if (!this.editorStore) return;
      
      const currentSelectedCommands = this.editorStore.selection.selectedCommands || [];
      
      // Verificar si la selección ha cambiado
      if (JSON.stringify(lastSelectedCommands) !== JSON.stringify(currentSelectedCommands)) {
        lastSelectedCommands = [...currentSelectedCommands];
        this.updateControlPointsForSelection(currentSelectedCommands);
      }
    };
    
    // Usar requestAnimationFrame para verificar cambios sin impacto en performance
    const checkLoop = () => {
      checkSelectionChanges();
      requestAnimationFrame(checkLoop);
    };
    
    requestAnimationFrame(checkLoop);
  }

  private updateControlPointsForSelection(selectedCommands: string[]) {
    // Limpiar puntos de control anteriores
    this.state.controlPoints.clear();
    
    // Analizar cada comando seleccionado
    selectedCommands.forEach(commandId => {
      const controlPointInfo = this.analyzeControlPoint(commandId);
      if (controlPointInfo) {
        this.state.controlPoints.set(commandId, controlPointInfo);
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

  // Public methods for testing
  public simulateKeyDown(e: KeyboardEvent) {
    this.handleKeyDown(e);
  }

  public simulateKeyUp(e: KeyboardEvent) {
    this.handleKeyUp(e);
  }

  /**
   * Analiza un comando para determinar el tipo de punto de control
   */
  analyzeControlPoint(commandId: string): ControlPointInfo | null {
    if (!this.editorStore) return null;

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
    
    // Determinar handles entrante y saliente
    const incomingHandle = this.getIncomingHandle(command, prevCommand);
    const outgoingHandle = this.getOutgoingHandle(command, nextCommand);
    
    // Determinar tipo de punto de control
    const type = this.determineControlPointType(command, incomingHandle, outgoingHandle);
    
    // Determinar si se puede separar
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
    
    // El handle entrante viene del x2,y2 del comando anterior (si es curva)
    if (prevCommand.command === 'C' && prevCommand.x2 !== undefined && prevCommand.y2 !== undefined) {
      return { x: prevCommand.x2, y: prevCommand.y2 };
    }
    
    return null;
  }

  private getOutgoingHandle(command: SVGCommand, nextCommand: SVGCommand | null): Point | null {
    if (!nextCommand) return null;
    
    // El handle saliente viene del x1,y1 del comando siguiente (si es curva)
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
    
    // Calcular vectores desde el anchor hacia cada handle
    const incomingVector = {
      x: incomingHandle.x - anchor.x,
      y: incomingHandle.y - anchor.y
    };
    
    const outgoingVector = {
      x: outgoingHandle.x - anchor.x,
      y: outgoingHandle.y - anchor.y
    };

    // Calcular magnitudes
    const incomingMagnitude = Math.sqrt(incomingVector.x * incomingVector.x + incomingVector.y * incomingVector.y);
    const outgoingMagnitude = Math.sqrt(outgoingVector.x * outgoingVector.x + outgoingVector.y * outgoingVector.y);

    if (incomingMagnitude === 0 || outgoingMagnitude === 0) {
      return 'independent';
    }

    // Normalizar vectores
    const incomingUnit = {
      x: incomingVector.x / incomingMagnitude,
      y: incomingVector.y / incomingMagnitude
    };
    
    const outgoingUnit = {
      x: outgoingVector.x / outgoingMagnitude,
      y: outgoingVector.y / outgoingMagnitude
    };

    // Calcular el producto punto para determinar alineación
    const dotProduct = incomingUnit.x * (-outgoingUnit.x) + incomingUnit.y * (-outgoingUnit.y);
    
    // Tolerancia para determinar alineación (cos(10°) ≈ 0.985)
    const alignmentThreshold = 0.985;
    
    if (dotProduct > alignmentThreshold) {
      // Verificar si las magnitudes son similares (dentro del 10%)
      const magnitudeRatio = Math.min(incomingMagnitude, outgoingMagnitude) / Math.max(incomingMagnitude, outgoingMagnitude);
      
      if (magnitudeRatio > 0.9) {
        return 'mirrored'; // Mismo largo y alineados
      } else {
        return 'aligned'; // Alineados pero diferentes largos
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
    
    // Actualizar todos los puntos de control seleccionados
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
    const controlPointInfo = this.state.controlPoints.get(commandId);
    if (!controlPointInfo) return;

    this.state.dragState = {
      isDragging: true,
      commandId,
      handleType,
      originalType: controlPointInfo.type,
      startPoint
    };

    this.notifyListeners();
  }

  /**
   * Actualiza la posición del handle durante el arrastre
   */
  updateDragHandle(newPoint: Point) {
    console.log('🔧 updateDragHandle called with:', newPoint);
    
    const { dragState } = this.state;
    if (!dragState.isDragging || !dragState.commandId || !dragState.handleType) {
      console.log('❌ Drag state invalid:', dragState);
      return;
    }

    const controlPointInfo = this.state.controlPoints.get(dragState.commandId);
    if (!controlPointInfo) {
      console.log('❌ No control point info for command:', dragState.commandId);
      return;
    }

    console.log('✅ Applying Figma handle logic for:', dragState.commandId, dragState.handleType);

    // Aplicar la lógica de Figma según el tipo y estado de Option
    this.applyFigmaHandleLogic(dragState.commandId, dragState.handleType, newPoint, controlPointInfo);
  }

  /**
   * Aplica la lógica de manejo de handles tipo Figma
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
      // Con Option presionada: mover solo el handle seleccionado (modo independiente)
      this.updateSingleHandle(commandId, handleType, newPoint);
      
      // Actualizar el tipo a independiente
      const updatedInfo = { ...controlPointInfo, type: 'independent' as ControlPointType };
      this.state.controlPoints.set(commandId, updatedInfo);
    } else {
      // Sin Option: aplicar lógica de acoplamiento según el tipo
      switch (type) {
        case 'mirrored':
          this.updateMirroredHandles(commandId, handleType, newPoint, anchor);
          break;
        case 'aligned':
          this.updateAlignedHandles(commandId, handleType, newPoint, anchor);
          break;
        case 'independent':
          this.updateSingleHandle(commandId, handleType, newPoint);
          break;
      }
    }

    this.notifyListeners();
  }

  /**
   * Actualiza un solo handle (modo independiente)
   */
  private updateSingleHandle(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point) {
    console.log('🔧 updateSingleHandle called:', { commandId, handleType, newPoint });
    
    const { updateCommand } = this.editorStore;
    
    if (handleType === 'outgoing') {
      // x1y1 es el handle saliente del comando actual
      console.log('✅ Updating outgoing handle (x1y1) for command:', commandId, 'with point:', newPoint);
      updateCommand(commandId, { x1: newPoint.x, y1: newPoint.y });
    } else {
      // x2y2 es el handle entrante del comando actual
      console.log('✅ Updating incoming handle (x2y2) for command:', commandId, 'with point:', newPoint);
      updateCommand(commandId, { x2: newPoint.x, y2: newPoint.y });
    }
  }

  /**
   * Actualiza handles en modo mirrored (mismo largo, direcciones opuestas)
   */
  private updateMirroredHandles(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point, anchor: Point) {
    const { updateCommand } = this.editorStore;
    
    // Calcular vector desde anchor al nuevo punto
    const vector = {
      x: newPoint.x - anchor.x,
      y: newPoint.y - anchor.y
    };
    
    // Calcular el punto opuesto (mismo largo, dirección opuesta)
    const oppositePoint = {
      x: anchor.x - vector.x,
      y: anchor.y - vector.y
    };
    
    if (handleType === 'outgoing') {
      // Actualizar x1y1 del comando actual
      updateCommand(commandId, { x1: newPoint.x, y1: newPoint.y });
      
      // Actualizar x2y2 del comando actual (punto opuesto)
      updateCommand(commandId, { x2: oppositePoint.x, y2: oppositePoint.y });
    } else {
      // Actualizar x2y2 del comando actual
      updateCommand(commandId, { x2: newPoint.x, y2: newPoint.y });
      
      // Actualizar x1y1 del comando actual (punto opuesto)
      updateCommand(commandId, { x1: oppositePoint.x, y1: oppositePoint.y });
    }
  }

  /**
   * Actualiza handles en modo aligned (alineados pero pueden tener diferentes largos)
   */
  private updateAlignedHandles(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point, anchor: Point) {
    const { updateCommand } = this.editorStore;
    
    // Calcular vector desde anchor al nuevo punto
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
    
    // Obtener el largo actual del handle opuesto
    const controlPointInfo = this.state.controlPoints.get(commandId);
    if (!controlPointInfo) return;
    
    const oppositeHandle = handleType === 'incoming' ? controlPointInfo.outgoingHandle : controlPointInfo.incomingHandle;
    let oppositeMagnitude = magnitude; // Por defecto, usar el mismo largo
    
    if (oppositeHandle) {
      const oppositeVector = {
        x: oppositeHandle.x - anchor.x,
        y: oppositeHandle.y - anchor.y
      };
      oppositeMagnitude = Math.sqrt(oppositeVector.x * oppositeVector.x + oppositeVector.y * oppositeVector.y);
    }
    
    // Calcular el punto opuesto (misma dirección, largo preservado)
    const oppositePoint = {
      x: anchor.x - unitVector.x * oppositeMagnitude,
      y: anchor.y - unitVector.y * oppositeMagnitude
    };
    
    if (handleType === 'outgoing') {
      // Actualizar x1y1 del comando actual
      updateCommand(commandId, { x1: newPoint.x, y1: newPoint.y });
      
      // Actualizar x2y2 del comando actual (alineado)
      updateCommand(commandId, { x2: oppositePoint.x, y2: oppositePoint.y });
    } else {
      // Actualizar x2y2 del comando actual
      updateCommand(commandId, { x2: newPoint.x, y2: newPoint.y });
      
      // Actualizar x1y1 del comando actual (alineado)
      updateCommand(commandId, { x1: oppositePoint.x, y1: oppositePoint.y });
    }
  }

  /**
   * Termina el arrastre de un handle
   */
  endDragHandle() {
    this.state.dragState = {
      isDragging: false,
      commandId: null,
      handleType: null,
      originalType: null,
      startPoint: null
    };

    this.notifyListeners();
  }

  /**
   * Convierte un punto de control independiente a acoplado
   */
  convertToMirrored(commandId: string) {
    const controlPointInfo = this.state.controlPoints.get(commandId);
    if (!controlPointInfo || !controlPointInfo.isBreakable) return;

    const { anchor, incomingHandle, outgoingHandle } = controlPointInfo;
    const { updateCommand } = this.editorStore;

    if (!incomingHandle || !outgoingHandle) return;

    // Usar el handle con mayor magnitud como referencia
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

    // Usar el vector con mayor magnitud
    const referenceVector = incomingMagnitude > outgoingMagnitude ? incomingVector : outgoingVector;
    const referenceMagnitude = Math.max(incomingMagnitude, outgoingMagnitude);

    if (referenceMagnitude === 0) return;

    // Normalizar y crear handles simétricos
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

    // Actualizar comandos - usando la lógica directa del comando
    // x2y2 es el handle entrante, x1y1 es el handle saliente
    updateCommand(commandId, { 
      x2: newIncomingHandle.x, 
      y2: newIncomingHandle.y,
      x1: newOutgoingHandle.x,
      y1: newOutgoingHandle.y
    });

    // Actualizar el tipo
    const updatedInfo = { ...controlPointInfo, type: 'mirrored' as ControlPointType };
    this.state.controlPoints.set(commandId, updatedInfo);
    
    this.notifyListeners();
  }

  // Métodos auxiliares
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
}

export const figmaHandleManager = new FigmaHandleManager();
