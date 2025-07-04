import { SVGCommand, Point, ControlPointType, ControlPointInfo, BezierHandleState } from '../../types';

/**
 * FigmaHandleManager - Gestiona el comportamiento de handles tipo Figma
 * 
 * NUEVA LÓGICA (v2.0):
 * - Detección de alineación al INICIO del drag (no durante el movimiento)
 * - Estado de par persistente durante todo el drag
 * - Mejor handling de movimientos rápidos
 * - Lógica más predecible y estable
 * 
 * MÉTODOS PRINCIPALES:
 * - detectInitialPairAlignment: Detecta el tipo de par al inicio
 * - applyNewFigmaHandleLogic: Aplica la nueva lógica de sincronización
 * - synchronizePairedHandle: Sincroniza handles según su tipo
 * 
 * MÉTODOS DEPRECADOS:
 * - applyFigmaHandleLogic: Lógica antigua con problemas de velocidad
 * - updateHandleWithAutoAlignment: Detección durante el drag (problemática)
 */

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
  
  // Propiedades para rastrear velocidad y snap
  private dragHistory: Array<{ point: Point; timestamp: number }> = [];
  private lastDragTime: number = 0;
  private velocityThreshold: number = 800; // píxeles por segundo
  private snapToGridActive: boolean = false;
  private alignmentDebounceTimer: any = null;

  constructor() {
    this.setupKeyboardListeners();
  }

  setEditorStore(store: any) {
    // Evitar reinicializaciones innecesarias 
    if (this.editorStore === store) {
      return;
    }
    
    console.log('🔗 FigmaHandleManager: Setting editor store (one time setup)');
    this.editorStore = store;
    
    // Suscribirse a cambios en la selección para actualizar automáticamente
    this.setupSelectionListener();
  }

  private setupSelectionListener() {
    if (!this.editorStore) return;
    
    // Remover el polling constante, ya que ahora manejamos el drag on-demand
    console.log('� FigmaHandleManager: Selection listener set up (on-demand mode)');
  }

  private updateControlPointsForSelection(selectedCommands: string[]) {
    console.log('🔄 FigmaHandleManager: Updating control points for selection:', selectedCommands);
    
    // Limpiar puntos de control anteriores
    this.state.controlPoints.clear();
    
    // Analizar cada comando seleccionado
    selectedCommands.forEach(commandId => {
      const controlPointInfo = this.analyzeControlPoint(commandId);
      if (controlPointInfo) {
        console.log('✅ FigmaHandleManager: Added control point for command', commandId);
        this.state.controlPoints.set(commandId, controlPointInfo);
      } else {
        console.log('❌ FigmaHandleManager: Could not analyze control point for command', commandId);
      }
    });
    
    console.log('📊 FigmaHandleManager: Control points map size:', this.state.controlPoints.size);
    
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

  public forceUpdateControlPoints() {
    if (!this.editorStore) {
      console.log('❌ FigmaHandleManager: Cannot force update - no editor store');
      return;
    }
    
    const currentSelectedCommands = this.editorStore.selection.selectedCommands || [];
    console.log('🔄 FigmaHandleManager: Force updating control points for:', currentSelectedCommands);
    
    this.updateControlPointsForSelection(currentSelectedCommands);
  }

  /**
   * Método público para que otros plugins puedan notificar cambios de selección
   */
  public onSelectionChanged() {
    if (this.editorStore) {
      const selectedCommands = this.editorStore.selection.selectedCommands || [];
      if (selectedCommands.length > 0) {
        console.log('🔄 FigmaHandleManager: Selection changed to:', selectedCommands);
        this.updateControlPointsForSelection(selectedCommands);
      } else {
        console.log('🔄 FigmaHandleManager: Selection cleared');
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
      console.log('❌ FigmaHandleManager: No editor store available');
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

          console.log('✅ FigmaHandleManager: Found command:', command.command, 'with handles');

          return this.createControlPointInfo(command, prevCommand, nextCommand);
        }
      }
    }
    
    console.log('❌ FigmaHandleManager: Command not found in any path:', commandId);
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
    // En Figma, los handles están alineados cuando apuntan en direcciones opuestas
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
    console.log('🚀 FigmaHandleManager: startDragHandle called with:', { commandId, handleType, startPoint });
    
    // Limpiar historial de arrastre anterior
    this.dragHistory = [];
    this.lastDragTime = Date.now();
    
    // Asegurar que tenemos los control points para este comando ANTES del drag
    const controlPointInfo = this.analyzeControlPoint(commandId);
    if (!controlPointInfo) {
      console.log('❌ FigmaHandleManager: Could not analyze control point for command:', commandId);
      return;
    }
    
    // PASO 1: Detectar alineamiento al principio del drag
    const pairInfo = this.detectInitialPairAlignment(commandId, handleType, controlPointInfo);
    
    // Actualizar el mapa de control points para incluir este comando con el tipo correcto
    this.state.controlPoints.set(commandId, {
      ...controlPointInfo,
      type: pairInfo.type
    });
    
    console.log('✅ FigmaHandleManager: Initial pair detection result:', pairInfo);
    console.log('✅ FigmaHandleManager: Added control point info for drag operation');

    console.log('✅ FigmaHandleManager: Setting drag state for:', commandId);
    this.state.dragState = {
      isDragging: true,
      commandId,
      handleType,
      originalType: pairInfo.type,
      startPoint,
      pairInfo: pairInfo // Guardar información del par para uso durante el drag
    };

    console.log('✅ FigmaHandleManager: Drag state set:', this.state.dragState);
    this.notifyListeners();
  }

  /**
   * Actualiza la posición del handle durante el arrastre
   */
  updateDragHandle(newPoint: Point) {
    console.log('🔧 FigmaHandleManager: updateDragHandle called with:', newPoint);
    
    const { dragState } = this.state;
    if (!dragState.isDragging || !dragState.commandId || !dragState.handleType) {
      console.log('❌ FigmaHandleManager: Drag state invalid:', dragState);
      return;
    }

    const controlPointInfo = this.state.controlPoints.get(dragState.commandId);
    if (!controlPointInfo) {
      console.log('❌ FigmaHandleManager: No control point info for command:', dragState.commandId);
      return;
    }

    console.log('✅ FigmaHandleManager: Applying new Figma handle logic for:', dragState.commandId, dragState.handleType);
    console.log('🎯 Current pair info:', dragState.pairInfo);
    console.log('🎯 Option pressed:', this.state.isOptionPressed);

    // PASO 2: Aplicar lógica basada en el estado inicial y tecla Option
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
    console.log('🔧 applyNewFigmaHandleLogic called with:', {
      commandId,
      handleType,
      newPoint,
      pairInfo,
      isOptionPressed: this.state.isOptionPressed
    });

    if (this.state.isOptionPressed) {
      // PASO 3: Con Option presionada - modo independiente o búsqueda de alineación
      this.handleOptionPressedLogic(commandId, handleType, newPoint, pairInfo);
    } else {
      // PASO 4: Sin Option - usar tipo detectado al inicio
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
    console.log('🎯 Option pressed logic - independent mode with alignment search');
    
    // Siempre actualizar solo el handle que se está moviendo
    this.updateSingleHandle(commandId, handleType, newPoint);
    
    // Si hay un par, verificar si se está alineando en tiempo real
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
    console.log('🎯 Normal drag logic - using initial pair type:', pairInfo?.type);
    
    // Actualizar el handle que se está moviendo
    this.updateSingleHandle(commandId, handleType, newPoint);
    
    // Si hay un par y está alineado/mirrored, sincronizar
    if (pairInfo?.pairedHandle && (pairInfo.type === 'aligned' || pairInfo.type === 'mirrored')) {
      console.log('✅ Synchronizing paired handle - type:', pairInfo.type);
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
    console.log('🔄 synchronizePairedHandle called:', { pairType, pairedHandle });
    
    const sharedAnchor = pairedHandle.anchor;
    
    // Calcular vector desde el anchor compartido al nuevo punto
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
      // Misma magnitud, dirección opuesta
      const oppositePoint = {
        x: sharedAnchor.x + (-unitVector.x * magnitude),
        y: sharedAnchor.y + (-unitVector.y * magnitude)
      };
      
      console.log('🔄 Mirrored sync - opposite point:', oppositePoint);
      this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
      
    } else if (pairType === 'aligned') {
      // Magnitud original del par, dirección opuesta
      const originalMagnitude = this.getHandleMagnitude(pairedHandle);
      const oppositePoint = {
        x: sharedAnchor.x + (-unitVector.x * originalMagnitude),
        y: sharedAnchor.y + (-unitVector.y * originalMagnitude)
      };
      
      console.log('🔄 Aligned sync - opposite point with original magnitude:', oppositePoint);
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
    console.log('🔍 checkRealTimeAlignment called');
    
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
    
    console.log('🔍 Real-time alignment check - detected type:', newType);
    
    // Si se detecta alineación, actualizar el tipo y sincronizar
    if (newType === 'aligned' || newType === 'mirrored') {
      console.log('✅ Real-time alignment detected! Synchronizing...');
      this.synchronizePairedHandle(commandId, handleType, newPoint, pairedHandle, newType);
      
      // Actualizar el tipo en el estado
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
    console.log('⚠️ Using deprecated applyFigmaHandleLogic - should use applyNewFigmaHandleLogic');
    // Método deprecado - mantenido para compatibilidad
    const { updateCommand } = this.editorStore;
    const { anchor, type } = controlPointInfo;

    if (this.state.isOptionPressed) {
      // Con Option presionada: mover solo el handle seleccionado (modo independiente)
      this.updateSingleHandle(commandId, handleType, newPoint);
      
      // Actualizar el tipo a independiente
      const updatedInfo = { ...controlPointInfo, type: 'independent' as ControlPointType };
      this.state.controlPoints.set(commandId, updatedInfo);
    } else {
      // Sin Option: siempre verificar si hay handle pareja y si está alineado
      this.updateHandleWithAutoAlignment(commandId, handleType, newPoint, anchor, type);
    }

    this.notifyListeners();
  }

  /**
   * Actualiza un handle verificando automáticamente la alineación con su pareja
   * @deprecated - Lógica problemática con movimientos rápidos. Usar nueva lógica en applyNewFigmaHandleLogic.
   */
  private updateHandleWithAutoAlignment(
    commandId: string,
    handleType: 'incoming' | 'outgoing',
    newPoint: Point,
    anchor: Point,
    originalType: ControlPointType
  ) {
    console.log('🔍 updateHandleWithAutoAlignment:', {
      commandId,
      handleType,
      newPoint,
      anchor,
      originalType
    });

    // Primero actualizar el handle que se está moviendo
    this.updateSingleHandle(commandId, handleType, newPoint);

    // Buscar el handle pareja
    const pairedHandle = this.findPairedHandle(commandId, handleType);
    
    if (!pairedHandle) {
      console.log('❌ No paired handle found for:', commandId, handleType);
      return;
    }

    console.log('✅ Found paired handle:', pairedHandle);

    // Obtener la posición actual del handle pareja
    const pairedHandlePosition = this.getHandlePosition(pairedHandle);
    if (!pairedHandlePosition) {
      console.log('❌ Could not get paired handle position');
      return;
    }

    console.log('📍 Paired handle position:', pairedHandlePosition);

    // Calcular vectores desde el anchor COMPARTIDO
    // El anchor correcto está en pairedHandle.anchor (calculado en findPairedHandle)
    const sharedAnchor = pairedHandle.anchor;
    
    const currentVector = {
      x: newPoint.x - sharedAnchor.x,
      y: newPoint.y - sharedAnchor.y
    };

    // IMPORTANTE: El vector pareja debe calcularse desde el MISMO anchor point
    // ya que ambos handles se conectan al mismo punto
    const pairedVector = {
      x: pairedHandlePosition.x - sharedAnchor.x,
      y: pairedHandlePosition.y - sharedAnchor.y
    };

    console.log('📏 Current vector (from SHARED anchor to dragged handle):', currentVector);
    console.log('📏 Paired vector (from SHARED anchor to paired handle):', pairedVector);
    console.log('📍 SHARED anchor point (from pairedHandle.anchor):', sharedAnchor);
    console.log('📍 Original anchor (command anchor):', anchor);

    // Verificar si están alineados (apuntan en direcciones opuestas)
    // Calcular velocidad actual (necesitamos esto para shouldApplyAlignment)
    const velocity = this.calculateDragVelocity(newPoint);
    
    const shouldApply = this.shouldApplyAlignment(velocity, currentVector, pairedVector);
    
    console.log('🎯 Should apply alignment?', shouldApply, this.snapToGridActive ? '(with grid tolerance)' : '(normal tolerance)');
    
    if (shouldApply) {
      console.log('✅ Handles are aligned! Applying coupling logic for type:', originalType);
      
      // Verificar si deberían ser tratados como 'mirrored' basado en longitudes actuales
      const currentMagnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);
      const pairedMagnitude = Math.sqrt(pairedVector.x * pairedVector.x + pairedVector.y * pairedVector.y);
      const magnitudeRatio = Math.min(currentMagnitude, pairedMagnitude) / Math.max(currentMagnitude, pairedMagnitude);
      
      console.log('� Current magnitude:', currentMagnitude);
      console.log('📏 Paired magnitude:', pairedMagnitude);
      console.log('📏 Magnitude ratio:', magnitudeRatio);
      
      // Si las magnitudes son similares (dentro del 10%), aplicar lógica 'mirrored'
      const shouldBeMirrored = magnitudeRatio > 0.9;
      console.log('🔄 Should be mirrored?', shouldBeMirrored);
      
      if (shouldBeMirrored) {
        console.log('🔄 Applying mirrored coupling (same length scaling)');
        this.updatePairedHandleMirrored(pairedHandle, currentVector, sharedAnchor);
      } else {
        console.log('🔄 Applying aligned coupling (preserve original length)');
        this.updatePairedHandleAligned(pairedHandle, currentVector, sharedAnchor);
      }
    } else {
      console.log('❌ Handles are not aligned, no coupling applied');
    }
  }

  /**
   * Debounce para evitar emparejamiento en movimientos rápidos
   */
  private debounceAlignment(callback: () => void, delay: number = 100) {
    if (this.alignmentDebounceTimer) {
      clearTimeout(this.alignmentDebounceTimer);
    }
    
    this.alignmentDebounceTimer = setTimeout(callback, delay);
  }

  /**
   * Verifica si debería aplicar emparejamiento basado en múltiples factores
   */
  private shouldApplyAlignment(velocity: number, currentVector: Point, pairedVector: Point): boolean {
    // No aplicar si el arrastre es muy rápido
    if (this.isDragTooFast(velocity)) {
      console.log('❌ Drag too fast, skipping alignment');
      return false;
    }
    
    // No aplicar si snap to grid está causando desvíos significativos
    if (this.snapToGridActive) {
      const gridState = this.editorStore?.grid || {};
      const gridSize = gridState.size || 20;
      
      // Si el grid es muy grande, ser más permisivo
      if (gridSize > 50) {
        console.log('❌ Grid size too large, skipping alignment');
        return false;
      }
    }
    
    // Verificar alineación con tolerancia apropiada
    const isAligned = this.snapToGridActive 
      ? this.areHandlesAlignedWithGridTolerance(currentVector, pairedVector)
      : this.areHandlesAligned(currentVector, pairedVector);
    
    return isAligned;
  }

  /**
   * Calcula la velocidad del arrastre para detectar movimientos rápidos
   */
  private calculateDragVelocity(currentPoint: Point): number {
    const now = Date.now();
    const currentEntry = { point: currentPoint, timestamp: now };
    
    // Agregar entrada actual
    this.dragHistory.push(currentEntry);
    
    // Mantener solo las últimas 5 entradas (últimos ~100ms)
    if (this.dragHistory.length > 5) {
      this.dragHistory.shift();
    }
    
    // Necesitamos al menos 2 puntos para calcular velocidad
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
    
    // Velocidad en píxeles por segundo
    const velocity = (distance / deltaTime) * 1000;
    
    console.log('📊 Drag velocity:', velocity, 'px/s');
    return velocity;
  }

  /**
   * Detecta si el movimiento es demasiado rápido para emparejamiento automático
   */
  private isDragTooFast(velocity: number): boolean {
    return velocity > this.velocityThreshold;
  }

  /**
   * Configura el threshold de velocidad para desactivar emparejamiento
   */
  setVelocityThreshold(threshold: number) {
    this.velocityThreshold = threshold;
    console.log('🎛️ Velocity threshold set to:', threshold, 'px/s');
  }

  /**
   * Obtiene el threshold de velocidad actual
   */
  getVelocityThreshold(): number {
    return this.velocityThreshold;
  }

  /**
   * Obtiene estadísticas de velocidad actuales
   */
  getVelocityStats(): { current: number; threshold: number; isActive: boolean } {
    const currentVelocity = this.dragHistory.length >= 2 ? this.calculateDragVelocity(this.dragHistory[this.dragHistory.length - 1].point) : 0;
    return {
      current: currentVelocity,
      threshold: this.velocityThreshold,
      isActive: this.isDragTooFast(currentVelocity)
    };
  }

  /**
   * Calcula si el snap to grid está interfiriendo con la alineación
   */
  private isSnapToGridInterfering(originalPoint: Point, snappedPoint: Point): boolean {
    const snapDistance = Math.sqrt(
      Math.pow(snappedPoint.x - originalPoint.x, 2) + 
      Math.pow(snappedPoint.y - originalPoint.y, 2)
    );
    
    // Si el snap movió el punto más de 5 píxeles, consideramos que interfiere
    return snapDistance > 5;
  }

  /**
   * Verifica si dos vectores están alineados (apuntan en direcciones opuestas)
   */
  private areHandlesAligned(vector1: Point, vector2: Point): boolean {
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    
    console.log('🔢 Vector magnitudes:', { magnitude1, magnitude2 });
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      console.log('❌ One of the vectors has zero magnitude');
      return false;
    }
    
    // Normalizar vectores
    const unit1 = { x: vector1.x / magnitude1, y: vector1.y / magnitude1 };
    const unit2 = { x: vector2.x / magnitude2, y: vector2.y / magnitude2 };
    
    console.log('📐 Normalized vectors:', { unit1, unit2 });
    
    // Calcular producto punto con el vector opuesto
    const dotProduct = unit1.x * (-unit2.x) + unit1.y * (-unit2.y);
    
    console.log('🎯 Dot product (should be close to 1 for alignment):', dotProduct);
    console.log('🎯 Alignment threshold: 0.966 (cos 15°)');
    
    // Tolerancia para alineación (cos(15°) ≈ 0.966)
    const isAligned = dotProduct > 0.966;
    console.log('✅ Result - handles aligned?', isAligned);
    
    return isAligned;
  }

  /**
   * Verifica si dos vectores están alineados con tolerancia más alta para snap to grid
   */
  private areHandlesAlignedWithGridTolerance(vector1: Point, vector2: Point): boolean {
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    
    console.log('🔢 [GRID] Vector magnitudes:', { magnitude1, magnitude2 });
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      console.log('❌ [GRID] One of the vectors has zero magnitude');
      return false;
    }
    
    // Normalizar vectores
    const unit1 = { x: vector1.x / magnitude1, y: vector1.y / magnitude1 };
    const unit2 = { x: vector2.x / magnitude2, y: vector2.y / magnitude2 };
    
    console.log('📐 [GRID] Normalized vectors:', { unit1, unit2 });
    
    // Calcular producto punto con el vector opuesto
    const dotProduct = unit1.x * (-unit2.x) + unit1.y * (-unit2.y);
    
    console.log('🎯 [GRID] Dot product (should be close to 1 for alignment):', dotProduct);
    console.log('🎯 [GRID] Grid-tolerant threshold: 0.85 (cos 32°)');
    
    // Tolerancia más alta para snap to grid (cos(32°) ≈ 0.85)
    const isAligned = dotProduct > 0.85;
    console.log('✅ [GRID] Result - handles aligned with grid tolerance?', isAligned);
    
    return isAligned;
  }

  /**
   * Actualiza el handle pareja en modo mirrored (misma longitud)
   */
  private updatePairedHandleMirrored(pairedHandle: any, currentVector: Point, sharedAnchor: Point) {
    console.log('🔄 updatePairedHandleMirrored called with:', { pairedHandle, currentVector, sharedAnchor });
    
    const magnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);
    if (magnitude === 0) {
      console.log('❌ Current vector has zero magnitude');
      return;
    }
    
    const unitVector = {
      x: currentVector.x / magnitude,
      y: currentVector.y / magnitude
    };
    
    console.log('📐 Unit vector:', unitVector);
    console.log('📏 Magnitude (will be used for paired handle):', magnitude);
    
    // Para mirrored: el handle pareja va en la dirección OPUESTA con la MISMA magnitud
    // Dirección opuesta = vector unitario * -1
    const oppositePoint = {
      x: sharedAnchor.x + (-unitVector.x * magnitude),
      y: sharedAnchor.y + (-unitVector.y * magnitude)
    };
    
    console.log('🎯 Calculated opposite point:', oppositePoint);
    console.log('📍 Shared anchor:', sharedAnchor);
    console.log('📏 Current vector from anchor:', currentVector);
    console.log('📏 Opposite vector (should be):', { x: -unitVector.x * magnitude, y: -unitVector.y * magnitude });
    console.log('🔧 About to update paired handle:', pairedHandle.commandId, pairedHandle.controlPoint);
    
    // FORZAR la actualización
    console.log('🚀 FORCING UPDATE of paired handle...');
    this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    console.log('✅ FORCED UPDATE completed');
    
    // Forzar re-render
    if (this.editorStore && this.editorStore.forceRender) {
      console.log('🔄 Forcing render after mirrored update');
      this.editorStore.forceRender();
    }
  }

  /**
   * Actualiza el handle pareja en modo aligned (preserva longitud original)
   */
  private updatePairedHandleAligned(pairedHandle: any, currentVector: Point, sharedAnchor: Point) {
    console.log('🔄 updatePairedHandleAligned called with:', { pairedHandle, currentVector, sharedAnchor });
    
    const magnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);
    if (magnitude === 0) {
      console.log('❌ Current vector has zero magnitude');
      return;
    }
    
    const unitVector = {
      x: currentVector.x / magnitude,
      y: currentVector.y / magnitude
    };
    
    console.log('📐 Unit vector:', unitVector);
    
    // Obtener la posición actual del handle pareja
    const pairedHandlePosition = this.getHandlePosition(pairedHandle);
    if (!pairedHandlePosition) {
      console.log('❌ Could not get paired handle position for magnitude calculation');
      return;
    }
    
    // Calcular longitud original del handle pareja desde el anchor COMPARTIDO
    const originalPairedVector = {
      x: pairedHandlePosition.x - sharedAnchor.x,
      y: pairedHandlePosition.y - sharedAnchor.y
    };
    const originalMagnitude = Math.sqrt(originalPairedVector.x * originalPairedVector.x + originalPairedVector.y * originalPairedVector.y);
    
    console.log('📏 Original magnitude of paired handle (from shared anchor):', originalMagnitude);
    
    // Para aligned: el handle pareja va en la dirección OPUESTA con su MAGNITUD ORIGINAL
    // Dirección opuesta = vector unitario * -1
    const oppositePoint = {
      x: sharedAnchor.x + (-unitVector.x * originalMagnitude),
      y: sharedAnchor.y + (-unitVector.y * originalMagnitude)
    };
    
    console.log('🎯 Calculated opposite point (with original magnitude):', oppositePoint);
    console.log('📍 Shared anchor:', sharedAnchor);
    console.log('📏 Current vector from anchor:', currentVector);
    console.log('📏 Opposite vector (should be):', { x: -unitVector.x * originalMagnitude, y: -unitVector.y * originalMagnitude });
    console.log('🔧 About to update paired handle:', pairedHandle.commandId, pairedHandle.controlPoint);
    
    // FORZAR la actualización
    console.log('🚀 FORCING UPDATE of paired handle...');
    this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    console.log('✅ FORCED UPDATE completed');
    
    // Forzar re-render
    if (this.editorStore && this.editorStore.forceRender) {
      console.log('🔄 Forcing render after aligned update');
      this.editorStore.forceRender();
    }
  }

  /**
   * Obtiene la posición actual de un handle
   */
  private getHandlePosition(handleInfo: {
    commandId: string;
    handleType: 'incoming' | 'outgoing';
    anchor: Point;
    controlPoint: 'x1y1' | 'x2y2';
  }): Point | null {
    console.log('📍 getHandlePosition called for:', handleInfo);
    
    if (!this.editorStore) {
      console.log('❌ No editor store available');
      return null;
    }

    const { paths } = this.editorStore;
    
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const command = subPath.commands.find((cmd: SVGCommand) => cmd.id === handleInfo.commandId);
        if (command && command.command === 'C') {
          console.log('✅ Found command:', command);
          
          if (handleInfo.controlPoint === 'x1y1') {
            if (command.x1 !== undefined && command.y1 !== undefined) {
              const position = { x: command.x1, y: command.y1 };
              console.log('📍 Returning x1y1 position:', position);
              return position;
            } else {
              console.log('❌ x1y1 coordinates are undefined');
            }
          } else {
            if (command.x2 !== undefined && command.y2 !== undefined) {
              const position = { x: command.x2, y: command.y2 };
              console.log('📍 Returning x2y2 position:', position);
              return position;
            } else {
              console.log('❌ x2y2 coordinates are undefined');
            }
          }
        }
      }
    }
    
    console.log('❌ Command not found or not a curve command');
    return null;
  }

  /**
   * Actualiza un solo handle (modo independiente)
   */
  private updateSingleHandle(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point) {
    console.log('🔧 updateSingleHandle called:', { commandId, handleType, newPoint });
    
    const { updateCommand } = this.editorStore;
    
    // Obtener el anchor point para el snap inteligente
    const controlPointInfo = this.state.controlPoints.get(commandId);
    const anchorPoint = controlPointInfo?.anchor || { x: 0, y: 0 };
    
    // Aplicar snap inteligente si está activo
    const finalPoint = this.smartSnapToGrid(newPoint, anchorPoint);
    
    if (handleType === 'outgoing') {
      // x1y1 es el handle saliente del comando actual
      console.log('✅ Updating outgoing handle (x1y1) for command:', commandId, 'with point:', finalPoint);
      updateCommand(commandId, { x1: finalPoint.x, y1: finalPoint.y });
    } else {
      // x2y2 es el handle entrante del comando actual
      console.log('✅ Updating incoming handle (x2y2) for command:', commandId, 'with point:', finalPoint);
      updateCommand(commandId, { x2: finalPoint.x, y2: finalPoint.y });
    }
  }

  /**
   * Actualiza un handle específico por su control point
   */
  private updateSingleHandleByControlPoint(commandId: string, controlPoint: 'x1y1' | 'x2y2', newPoint: Point) {
    console.log('🔧 updateSingleHandleByControlPoint called:', { commandId, controlPoint, newPoint });
    
    if (!this.editorStore) {
      console.log('❌ No editor store available in updateSingleHandleByControlPoint');
      return;
    }

    const { updateCommand } = this.editorStore;
    
    if (!updateCommand) {
      console.log('❌ No updateCommand function available');
      return;
    }
    
    // Obtener el anchor point para el snap inteligente
    const controlPointInfo = this.state.controlPoints.get(commandId);
    const anchorPoint = controlPointInfo?.anchor || { x: 0, y: 0 };
    
    // Aplicar snap inteligente si está activo
    const finalPoint = this.smartSnapToGrid(newPoint, anchorPoint);
    
    if (controlPoint === 'x1y1') {
      console.log('✅ Updating x1y1 for command:', commandId, 'with point:', finalPoint);
      console.log('🔄 Calling updateCommand with:', { commandId, updates: { x1: finalPoint.x, y1: finalPoint.y } });
      updateCommand(commandId, { x1: finalPoint.x, y1: finalPoint.y });
      console.log('✅ updateCommand called successfully for x1y1');
    } else {
      console.log('✅ Updating x2y2 for command:', commandId, 'with point:', finalPoint);
      console.log('🔄 Calling updateCommand with:', { commandId, updates: { x2: finalPoint.x, y2: finalPoint.y } });
      updateCommand(commandId, { x2: finalPoint.x, y2: finalPoint.y });
      console.log('✅ updateCommand called successfully for x2y2');
    }
  }

  /**
   * Actualiza handles en modo mirrored estilo Figma (mismo largo, direcciones opuestas)
   * En Figma, cuando un handle está acoplado, al mover uno, el otro se mueve manteniendo
   * la alineación pero preservando su longitud original
   */
  private updateMirroredHandlesFigma(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point, anchor: Point) {
    console.log('🔧 updateMirroredHandlesFigma called:', { commandId, handleType, newPoint, anchor });
    
    const { updateCommand } = this.editorStore;
    
    // Actualizar el handle que se está moviendo
    this.updateSingleHandle(commandId, handleType, newPoint);
    
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
    
    // Encontrar y actualizar el handle pareja
    const pairedHandle = this.findPairedHandle(commandId, handleType);
    if (pairedHandle) {
      console.log('🔗 Found paired handle:', pairedHandle);
      
      // Calcular el punto opuesto usando la misma magnitud
      const oppositePoint = {
        x: pairedHandle.anchor.x - unitVector.x * magnitude,
        y: pairedHandle.anchor.y - unitVector.y * magnitude
      };
      
      // Actualizar el handle pareja
      this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    }
  }

  /**
   * Actualiza handles en modo aligned estilo Figma (alineados pero diferentes largos)
   * En Figma, cuando están alineados, al mover uno, el otro se mueve manteniendo
   * la alineación pero preservando su longitud original
   */
  private updateAlignedHandlesFigma(commandId: string, handleType: 'incoming' | 'outgoing', newPoint: Point, anchor: Point) {
    console.log('🔧 updateAlignedHandlesFigma called:', { commandId, handleType, newPoint, anchor });
    
    const { updateCommand } = this.editorStore;
    
    // Actualizar el handle que se está moviendo
    this.updateSingleHandle(commandId, handleType, newPoint);
    
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
    
    // Encontrar y actualizar el handle pareja
    const pairedHandle = this.findPairedHandle(commandId, handleType);
    if (pairedHandle) {
      console.log('🔗 Found paired handle:', pairedHandle);
      
      // Obtener la longitud original del handle pareja
      const originalPairedMagnitude = this.getHandleMagnitude(pairedHandle);
      
      // Calcular el punto opuesto usando la longitud original del handle pareja
      const oppositePoint = {
        x: pairedHandle.anchor.x - unitVector.x * originalPairedMagnitude,
        y: pairedHandle.anchor.y - unitVector.y * originalPairedMagnitude
      };
      
      // Actualizar el handle pareja
      this.updateSingleHandleByControlPoint(pairedHandle.commandId, pairedHandle.controlPoint, oppositePoint);
    }
  }

  /**
   * Detecta el handle pareja según la lógica correcta de Figma:
   * Los handles se emparejan cuando se conectan al mismo punto anchor pero pertenecen a comandos diferentes:
   * - x2y2 del comando N se empareja con x1y1 del comando N+1 (ambos se conectan al anchor del comando N)
   * - x1y1 del comando N+1 se empareja con x2y2 del comando N (ambos se conectan al anchor del comando N)
   */
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
            // x2y2 del comando actual busca x1y1 del comando siguiente
            // Ambos se conectan al anchor del comando actual
            if (commandIndex < commands.length - 1) {
              const nextCommand = commands[commandIndex + 1];
              if (nextCommand.command === 'C' && nextCommand.x1 !== undefined && nextCommand.y1 !== undefined) {
                const anchor = { x: currentCommand.x || 0, y: currentCommand.y || 0 };
                return {
                  commandId: nextCommand.id,
                  handleType: 'outgoing',
                  anchor: anchor, // Mismo anchor (punto final del comando actual)
                  controlPoint: 'x1y1'
                };
              }
            }
          } else {
            // x1y1 del comando actual busca x2y2 del comando anterior
            // Ambos se conectan al anchor del comando anterior
            if (commandIndex > 0) {
              const prevCommand = commands[commandIndex - 1];
              if (prevCommand.command === 'C' && prevCommand.x2 !== undefined && prevCommand.y2 !== undefined) {
                const anchor = { x: prevCommand.x || 0, y: prevCommand.y || 0 };
                return {
                  commandId: prevCommand.id,
                  handleType: 'incoming',
                  anchor: anchor, // Mismo anchor (punto final del comando anterior)
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

  /**
   * Obtiene la magnitud actual de un handle
   */
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

  /**
   * Termina el arrastre de un handle
   */
  endDragHandle() {
    // Limpiar historial de arrastre
    this.dragHistory = [];
    this.lastDragTime = 0;
    
    // Limpiar timer de debounce
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

  /**
   * Aplica snap to grid inteligente para handles, considerando la alineación
   */
  private smartSnapToGrid(point: Point, anchorPoint: Point): Point {
    if (!this.snapToGridActive || !this.editorStore?.grid) {
      return point;
    }

    const gridState = this.editorStore.grid;
    const gridSize = gridState.size || 20;
    
    // Snap básico
    const snappedPoint = {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
    
    // Verificar si el snap está interfiriendo con la alineación
    const originalVector = {
      x: point.x - anchorPoint.x,
      y: point.y - anchorPoint.y
    };
    
    const snappedVector = {
      x: snappedPoint.x - anchorPoint.x,
      y: snappedPoint.y - anchorPoint.y
    };
    
    // Si el snap cambió significativamente la dirección, usar el punto original
    const originalAngle = Math.atan2(originalVector.y, originalVector.x);
    const snappedAngle = Math.atan2(snappedVector.y, snappedVector.x);
    const angleDiff = Math.abs(originalAngle - snappedAngle);
    
    // Si la diferencia de ángulo es mayor a 10 grados, usar el punto original
    if (angleDiff > Math.PI / 18) { // 10 grados
      console.log('🎯 Snap to grid interfering with alignment, using original point');
      return point;
    }
    
    return snappedPoint;
  }

  /**
   * Detecta la alineación inicial del par de handles al comenzar el drag
   * PASO 1: Analizar si existe un par y determinar su tipo (aligned/mirrored/independent)
   */
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
    console.log('🔍 detectInitialPairAlignment called for:', { commandId, handleType });
    
    // Buscar el handle pareja
    const pairedHandle = this.findPairedHandle(commandId, handleType);
    
    if (!pairedHandle) {
      console.log('❌ No paired handle found, type: independent');
      return {
        type: 'independent',
        pairedHandle: null
      };
    }
    
    console.log('✅ Found paired handle:', pairedHandle);
    
    // Obtener posiciones actuales de ambos handles
    const currentHandlePosition = this.getCurrentHandlePosition(commandId, handleType);
    const pairedHandlePosition = this.getHandlePosition(pairedHandle);
    
    if (!currentHandlePosition || !pairedHandlePosition) {
      console.log('❌ Could not get handle positions, type: independent');
      return {
        type: 'independent',
        pairedHandle: null
      };
    }
    
    console.log('📍 Current handle position:', currentHandlePosition);
    console.log('📍 Paired handle position:', pairedHandlePosition);
    
    // Usar el anchor compartido (calculado en findPairedHandle)
    const sharedAnchor = pairedHandle.anchor;
    
    // Calcular vectores desde el anchor compartido
    const currentVector = {
      x: currentHandlePosition.x - sharedAnchor.x,
      y: currentHandlePosition.y - sharedAnchor.y
    };
    
    const pairedVector = {
      x: pairedHandlePosition.x - sharedAnchor.x,
      y: pairedHandlePosition.y - sharedAnchor.y
    };
    
    console.log('📏 Current vector:', currentVector);
    console.log('📏 Paired vector:', pairedVector);
    console.log('📍 Shared anchor:', sharedAnchor);
    
    // Determinar tipo basado en alineación y magnitudes
    const type = this.determinePairType(currentVector, pairedVector);
    
    console.log('✅ Initial pair type determined:', type);
    
    return {
      type,
      pairedHandle
    };
  }

  /**
   * Obtiene la posición actual de un handle del comando especificado
   */
  private getCurrentHandlePosition(commandId: string, handleType: 'incoming' | 'outgoing'): Point | null {
    if (!this.editorStore) return null;

    const { paths } = this.editorStore;
    
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const command = subPath.commands.find((cmd: SVGCommand) => cmd.id === commandId);
        if (command && command.command === 'C') {
          if (handleType === 'outgoing') {
            // Handle saliente: x1, y1
            if (command.x1 !== undefined && command.y1 !== undefined) {
              return { x: command.x1, y: command.y1 };
            }
          } else {
            // Handle entrante: x2, y2
            if (command.x2 !== undefined && command.y2 !== undefined) {
              return { x: command.x2, y: command.y2 };
            }
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Determina el tipo de par basado en vectores
   */
  private determinePairType(vector1: Point, vector2: Point): ControlPointType {
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 'independent';
    }
    
    // Normalizar vectores
    const unit1 = { x: vector1.x / magnitude1, y: vector1.y / magnitude1 };
    const unit2 = { x: vector2.x / magnitude2, y: vector2.y / magnitude2 };
    
    // Calcular producto punto con el vector opuesto (para alineación)
    const dotProduct = unit1.x * (-unit2.x) + unit1.y * (-unit2.y);
    
    // Tolerancia para alineación (cos(15°) ≈ 0.966)
    const alignmentThreshold = 0.966;
    
    if (dotProduct > alignmentThreshold) {
      // Están alineados, verificar si son mirrored (magnitudes similares)
      const magnitudeRatio = Math.min(magnitude1, magnitude2) / Math.max(magnitude1, magnitude2);
      
      if (magnitudeRatio > 0.9) {
        return 'mirrored'; // Mismo largo y alineados
      } else {
        return 'aligned'; // Alineados pero diferentes largos
      }
    }
    
    return 'independent';
  }
}

export const figmaHandleManager = new FigmaHandleManager();
