import { SVGCommand, SVGPath } from '../../types';

export interface BezierPointInfo {
  command: SVGCommand;
  prevCommand: SVGCommand | null;
  nextCommand: SVGCommand | null;
  prevSegmentType: 'line' | 'curve' | null;
  nextSegmentType: 'line' | 'curve' | null;
}

export interface BezierNormalizeAction {
  type: 'normalize-from-current' | 'normalize-from-other' | 'convert-and-normalize' | 'break-control-points';
  label: string;
  description: string;
}

export interface BezierNormalizeState {
  pointInfo: BezierPointInfo | null;
  availableActions: BezierNormalizeAction[];
  isOptionPressed: boolean;
}

export class BezierNormalizeManager {
  private editorStore: any;
  private state: BezierNormalizeState = {
    pointInfo: null,
    availableActions: [],
    isOptionPressed: false
  };
  private listeners: (() => void)[] = [];

  setEditorStore(store: any) {
    this.editorStore = store;
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

  analyzeSelectedPoint(): BezierPointInfo | null {
    if (!this.editorStore) return null;

    const { selection, paths } = this.editorStore;
    
    if (selection.selectedCommands.length !== 1) return null;

    const commandId = selection.selectedCommands[0];
    return this.analyzeBezierPoint(commandId);
  }

  private analyzeBezierPoint(commandId: string): BezierPointInfo | null {
    const { paths } = this.editorStore;

    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const commandIndex = subPath.commands.findIndex((cmd: SVGCommand) => cmd.id === commandId);
        if (commandIndex !== -1) {
          const command = subPath.commands[commandIndex];
          const prevCommand = commandIndex > 0 ? subPath.commands[commandIndex - 1] : null;
          const nextCommand = commandIndex < subPath.commands.length - 1 ? subPath.commands[commandIndex + 1] : null;

          return {
            command,
            prevCommand,
            nextCommand,
            prevSegmentType: this.getSegmentType(prevCommand),
            nextSegmentType: this.getSegmentType(nextCommand)
          };
        }
      }
    }
    return null;
  }

  getAvailableActions(pointInfo: BezierPointInfo): BezierNormalizeAction[] {
    const { prevSegmentType, nextSegmentType, command } = pointInfo;
    const actions: BezierNormalizeAction[] = [];

    // Caso feliz: punto entre dos curvas
    if (prevSegmentType === 'curve' && nextSegmentType === 'curve') {
      // If Option is pressed, prioritize break action
      if (this.state.isOptionPressed) {
        actions.push({
          type: 'break-control-points',
          label: '⌥ Quebrar puntos de control',
          description: 'Separa los puntos de control para edición independiente'
        });
      }
      
      actions.push({
        type: 'normalize-from-current',
        label: 'Normalizar (Figma-style)',
        description: 'Alinea los puntos de control a 180° para suavidad'
      });
      actions.push({
        type: 'normalize-from-other',
        label: 'Normalizar desde el otro lado',
        description: 'Normaliza usando el punto de control de la curva siguiente como referencia'
      });
      
      // Add break action if Option is not pressed
      if (!this.state.isOptionPressed) {
        actions.push({
          type: 'break-control-points',
          label: 'Quebrar puntos (⌥ Option)',
          description: 'Permite mover puntos de control independientemente'
        });
      }
    }
    // Caso no feliz: punto es línea Y tiene línea siguiente
    // (No importa si el anterior es M, L, o C - solo necesitamos L->L)
    else if (command.command === 'L' && nextSegmentType === 'line') {
      actions.push({
        type: 'convert-and-normalize',
        label: 'Convertir a curvas (Figma-style)',
        description: 'Convierte las líneas a curvas con puntos alineados'
      });
    }
    // Caso híbrido: mezcla de líneas y curvas
    else if ((command.command === 'L' && nextSegmentType === 'curve') || 
             (prevSegmentType === 'curve' && command.command === 'L')) {
      actions.push({
        type: 'convert-and-normalize',
        label: 'Convertir recta a curva (Figma-style)',
        description: 'Convierte la recta en curva y normaliza ambos puntos de control'
      });
    }

    return actions;
  }

  executeAction(action: BezierNormalizeAction): void {
    const pointInfo = this.analyzeSelectedPoint();
    if (!pointInfo) return;
    
    this.editorStore.pushToHistory();

    switch (action.type) {
      case 'normalize-from-current':
        this.normalizeFromCurrent(pointInfo);
        break;
      case 'normalize-from-other':
        this.normalizeFromOther(pointInfo);
        break;
      case 'convert-and-normalize':
        this.convertAndNormalize(pointInfo);
        break;
      case 'break-control-points':
        this.breakControlPoints(pointInfo);
        break;
    }
  }

  private normalizeFromCurrent(pointInfo: BezierPointInfo): void {
    const { command } = pointInfo;
    
    if (!command.x || !command.y || command.command !== 'C' || !command.x1 || !command.y1) return;

    const incomingVector = {
      x: command.x1 - command.x,
      y: command.y1 - command.y
    };

    const outgoingCP = {
      x: command.x - incomingVector.x,
      y: command.y - incomingVector.y
    };

    this.editorStore.updateCommand(command.id, {
      x2: outgoingCP.x,
      y2: outgoingCP.y
    });
  }

  private normalizeFromOther(pointInfo: BezierPointInfo): void {
    const { command, nextCommand } = pointInfo;
    
    if (!command.x || !command.y || !nextCommand || 
        nextCommand.command !== 'C' || !nextCommand.x1 || !nextCommand.y1) return;

    const otherVector = {
      x: nextCommand.x1 - command.x,
      y: nextCommand.y1 - command.y
    };

    const outgoingCP = {
      x: command.x - otherVector.x,
      y: command.y - otherVector.y
    };

    const incomingCP = {
      x: command.x + otherVector.x,
      y: command.y + otherVector.y
    };

    this.editorStore.updateCommand(command.id, {
      x1: incomingCP.x,
      y1: incomingCP.y,
      x2: outgoingCP.x,
      y2: outgoingCP.y
    });
  }

  private convertAndNormalize(pointInfo: BezierPointInfo): void {
    const { command, prevCommand, nextCommand } = pointInfo;
    
    if (!command.x || !command.y) return;

    const { updateCommand } = this.editorStore;
    
    // Función para convertir línea a curva con puntos de control simples
    const convertLineToCurve = (targetCommand: SVGCommand, fromPoint: { x: number, y: number }, toPoint: { x: number, y: number }) => {
      if (targetCommand.command === 'L') {
        // Usar una distancia fija simple para los puntos de control
        const distance = Math.sqrt(
          Math.pow(toPoint.x - fromPoint.x, 2) + 
          Math.pow(toPoint.y - fromPoint.y, 2)
        );
        
        // Usar una fracción más pequeña y fija para que sea más predecible
        const controlDistance = Math.min(distance * 0.25, 30); // Máximo 30 unidades
        
        const dx = toPoint.x - fromPoint.x;
        const dy = toPoint.y - fromPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 0) {
          const unitX = dx / length;
          const unitY = dy / length;
          
          const x1 = fromPoint.x + unitX * controlDistance;
          const y1 = fromPoint.y + unitY * controlDistance;
          const x2 = toPoint.x - unitX * controlDistance;
          const y2 = toPoint.y - unitY * controlDistance;
          
          updateCommand(targetCommand.id, {
            command: 'C',
            x1,
            y1,
            x2,
            y2
          });
        }
      }
    };

    // Convertir el comando actual si es una línea (caso principal)
    if (command.command === 'L' && prevCommand && prevCommand.x !== undefined && prevCommand.y !== undefined) {
      convertLineToCurve(command, { x: prevCommand.x, y: prevCommand.y }, { x: command.x, y: command.y });
    }

    // Convertir el comando siguiente si es una línea
    if (nextCommand && nextCommand.command === 'L' && nextCommand.x !== undefined && nextCommand.y !== undefined) {
      convertLineToCurve(nextCommand, { x: command.x, y: command.y }, { x: nextCommand.x, y: nextCommand.y });
    }

    // Esperar a que se actualicen los comandos y luego normalizar correctamente
    setTimeout(() => {
      const updatedPointInfo = this.analyzeBezierPoint(command.id);
      if (updatedPointInfo) {
        // Verificar si ahora tenemos al menos una curva para normalizar
        if (updatedPointInfo.command.command === 'C' || 
            (updatedPointInfo.nextCommand && updatedPointInfo.nextCommand.command === 'C')) {
          this.normalizeForUnhappyCase(updatedPointInfo);
        }
      }
    }, 0);
  }

  private normalizeForUnhappyCase(pointInfo: BezierPointInfo): void {
    const { command, prevCommand, nextCommand } = pointInfo;
    
    if (!command.x || !command.y || !prevCommand || !nextCommand ||
        command.command !== 'C' || nextCommand.command !== 'C' ||
        prevCommand.x === undefined || prevCommand.y === undefined ||
        nextCommand.x === undefined || nextCommand.y === undefined) return;

    const { updateCommand } = this.editorStore;
    
    // Calcular las direcciones de las líneas entrante y saliente
    const incomingDirection = {
      x: command.x - prevCommand.x,
      y: command.y - prevCommand.y
    };
    
    const outgoingDirection = {
      x: nextCommand.x - command.x,
      y: nextCommand.y - command.y
    };
    
    // Normalizar las direcciones para obtener vectores unitarios
    const incomingLength = Math.sqrt(incomingDirection.x * incomingDirection.x + incomingDirection.y * incomingDirection.y);
    const outgoingLength = Math.sqrt(outgoingDirection.x * outgoingDirection.x + outgoingDirection.y * outgoingDirection.y);
    
    if (incomingLength === 0 || outgoingLength === 0) return;
    
    const incomingUnit = {
      x: incomingDirection.x / incomingLength,
      y: incomingDirection.y / incomingLength
    };
    
    const outgoingUnit = {
      x: outgoingDirection.x / outgoingLength,
      y: outgoingDirection.y / outgoingLength
    };
    
    // COMPORTAMIENTO COMO FIGMA: Puntos de control perfectamente alineados (180°)
    // Calcular la tangente promedio que biseca el ángulo entre las dos líneas
    const tangentVector = {
      x: incomingUnit.x + outgoingUnit.x,
      y: incomingUnit.y + outgoingUnit.y
    };
    
    // Normalizar la tangente promedio
    const tangentLength = Math.sqrt(tangentVector.x * tangentVector.x + tangentVector.y * tangentVector.y);
    
    let tangentUnit = { x: 0, y: 0 };
    if (tangentLength > 0) {
      tangentUnit = {
        x: tangentVector.x / tangentLength,
        y: tangentVector.y / tangentLength
      };
    } else {
      // Si las líneas son exactamente opuestas (180°), usar la perpendicular
      tangentUnit = {
        x: -incomingUnit.y,
        y: incomingUnit.x
      };
    }
    
    // Usar distancias proporcionales para un resultado natural
    const incomingControlDistance = Math.min(incomingLength * 0.3, 30);
    const outgoingControlDistance = Math.min(outgoingLength * 0.3, 30);
    
    // FIGMA-style: Los puntos de control están perfectamente alineados (180°)
    // Esto crea una curva suave sin quiebres, como en Figma por defecto
    const incomingControlPoint = {
      x: command.x - tangentUnit.x * incomingControlDistance,
      y: command.y - tangentUnit.y * incomingControlDistance
    };
    
    const outgoingControlPoint = {
      x: command.x + tangentUnit.x * outgoingControlDistance,
      y: command.y + tangentUnit.y * outgoingControlDistance
    };
    
    // Actualizar el comando actual
    updateCommand(command.id, {
      x1: incomingControlPoint.x,
      y1: incomingControlPoint.y,
      x2: outgoingControlPoint.x,
      y2: outgoingControlPoint.y
    });
    
    // Actualizar el comando siguiente
    updateCommand(nextCommand.id, {
      x1: outgoingControlPoint.x,
      y1: outgoingControlPoint.y
    });
  }

  private breakControlPoints(pointInfo: BezierPointInfo): void {
    const { command, prevCommand, nextCommand } = pointInfo;
    
    // This action only makes sense when we have curves on both sides
    if (!prevCommand || !nextCommand) return;
    if (prevCommand.command !== 'C' || nextCommand.command !== 'C') return;
    
    // The "breaking" is achieved by making the control points NOT aligned
    // We'll offset them slightly to create a visible break while maintaining smoothness
    const currentPoint = { x: command.x!, y: command.y! };
    
    // Get the current control points
    const incomingControl = { x: prevCommand.x2!, y: prevCommand.y2! };
    const outgoingControl = { x: nextCommand.x1!, y: nextCommand.y1! };
    
    // Calculate the current alignment vector
    const incomingVector = {
      x: currentPoint.x - incomingControl.x,
      y: currentPoint.y - incomingControl.y
    };
    
    const outgoingVector = {
      x: outgoingControl.x - currentPoint.x,
      y: outgoingControl.y - currentPoint.y
    };
    
    // Calculate distances
    const incomingDistance = Math.sqrt(incomingVector.x * incomingVector.x + incomingVector.y * incomingVector.y);
    const outgoingDistance = Math.sqrt(outgoingVector.x * outgoingVector.x + outgoingVector.y * outgoingVector.y);
    
    if (incomingDistance === 0 || outgoingDistance === 0) return;
    
    // Create a slight angular offset (15 degrees) to break the alignment
    const breakAngle = Math.PI / 12; // 15 degrees
    
    // Normalize the incoming vector and rotate it slightly
    const incomingNormalized = {
      x: incomingVector.x / incomingDistance,
      y: incomingVector.y / incomingDistance
    };
    
    const rotatedIncoming = {
      x: incomingNormalized.x * Math.cos(breakAngle) - incomingNormalized.y * Math.sin(breakAngle),
      y: incomingNormalized.x * Math.sin(breakAngle) + incomingNormalized.y * Math.cos(breakAngle)
    };
    
    // Normalize the outgoing vector and rotate it in the opposite direction
    const outgoingNormalized = {
      x: outgoingVector.x / outgoingDistance,
      y: outgoingVector.y / outgoingDistance
    };
    
    const rotatedOutgoing = {
      x: outgoingNormalized.x * Math.cos(-breakAngle) - outgoingNormalized.y * Math.sin(-breakAngle),
      y: outgoingNormalized.x * Math.sin(-breakAngle) + outgoingNormalized.y * Math.cos(-breakAngle)
    };
    
    // Update the control points with the rotated vectors
    const newIncomingControl = {
      x: currentPoint.x - rotatedIncoming.x * incomingDistance,
      y: currentPoint.y - rotatedIncoming.y * incomingDistance
    };
    
    const newOutgoingControl = {
      x: currentPoint.x + rotatedOutgoing.x * outgoingDistance,
      y: currentPoint.y + rotatedOutgoing.y * outgoingDistance
    };
    
    // Update the commands with the new control points
    this.editorStore.updateCommand(prevCommand.id, {
      x2: newIncomingControl.x,
      y2: newIncomingControl.y
    });
    
    this.editorStore.updateCommand(nextCommand.id, {
      x1: newOutgoingControl.x,
      y1: newOutgoingControl.y
    });
  }

  private getSegmentType(command: SVGCommand | null): 'line' | 'curve' | null {
    if (!command) return null;
    
    switch (command.command) {
      case 'L':
        return 'line';
      case 'C':
        return 'curve';
      case 'M':
        // M no es ni línea ni curva - es un punto de inicio
        return null;
      default:
        return null;
    }
  }

  getState(): BezierNormalizeState {
    return this.state;
  }

  updateState(): void {
    const pointInfo = this.analyzeSelectedPoint();
    const availableActions = pointInfo ? this.getAvailableActions(pointInfo) : [];
    
    this.state = {
      pointInfo,
      availableActions,
      isOptionPressed: this.state.isOptionPressed // Mantener el estado actual de la tecla Option
    };
    
    this.notifyListeners();
  }

  // Método para establecer el estado de la tecla Option
  setOptionPressed(pressed: boolean) {
    if (this.state.isOptionPressed !== pressed) {
      this.state.isOptionPressed = pressed;
      // Update the available actions when Option state changes
      this.updateState();
    }
  }

  // Handle keyboard events
  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Alt' || e.key === 'Option') {
      this.setOptionPressed(true);
    }
  }

  handleKeyUp(e: KeyboardEvent) {
    if (e.key === 'Alt' || e.key === 'Option') {
      this.setOptionPressed(false);
    }
  }
}

export const bezierNormalizeManager = new BezierNormalizeManager();
