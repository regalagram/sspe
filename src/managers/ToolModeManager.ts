import { useEditorStore } from '../store/editorStore';
import { EditorCommandType } from '../types';

export type ToolMode = 'select' | 'pencil' | 'curves' | 'shapes' | 'text' | 'text-edit' | 'creation' | 'subpath-edit';

export interface ToolModeState {
  activeMode: ToolMode;
  createSubMode?: EditorCommandType; // Para M, L, C, Z
  shapeId?: string; // Para shapes
  textType?: 'single' | 'multiline'; // Para text
  editingTextId?: string; // Para text-edit
  metadata?: Record<string, any>; // Datos adicionales del modo
}

export interface ToolModeOptions {
  commandType?: EditorCommandType;
  shapeId?: string;
  textType?: 'single' | 'multiline';
  editingTextId?: string;
  metadata?: Record<string, any>;
}

/**
 * ToolModeManager - Sistema centralizado para coordinar modos de herramientas
 * 
 * Resuelve el problema de múltiples herramientas activas simultáneamente
 * asegurando que solo una herramienta esté activa a la vez.
 * 
 * Jerarquía de modos (de más específico a más general):
 * 1. SHAPES - Creación de formas predefinidas
 * 2. CURVES - Herramienta de curvas Bézier
 * 3. PENCIL - Herramienta de dibujo libre
 * 4. CREATION - Comandos básicos SVG (M, L, C, Z)
 * 5. SELECT - Modo de selección (por defecto)
 */
export class ToolModeManager {
  private state: ToolModeState = { activeMode: 'select' };
  private listeners: Array<(state: ToolModeState) => void> = [];

  // Referencias a managers externos (se setean dinámicamente)
  private shapeManager: any = null;
  private curvesManager: any = null;
  private pencilManager: any = null;
  private textManager: any = null;
  private textEditManager: any = null;
  private creationManager: any = null;

  constructor() {
  }

  /**
   * Registrar managers externos para coordinación
   */
  setShapeManager(manager: any) {
    this.shapeManager = manager;
  }

  setCurvesManager(manager: any) {
    this.curvesManager = manager;
  }

  setPencilManager(manager: any) {
    this.pencilManager = manager;
  }

  setTextManager(manager: any) {
    this.textManager = manager;
  }

  setTextEditManager(manager: any) {
    this.textEditManager = manager;
  }

  setCreationManager(manager: any) {
    this.creationManager = manager;
  }

  /**
   * Obtener el estado actual del modo
   */
  getState(): ToolModeState {
    return { ...this.state };
  }

  getActiveMode(): ToolMode {
    return this.state.activeMode;
  }

  /**
   * Verificar si un modo específico está activo
   */
  isActive(mode: ToolMode): boolean {
    return this.state.activeMode === mode;
  }

  /**
   * Sync internal state with editor store state to prevent desync
   */
  private syncWithEditorState(): void {
    const editorState = useEditorStore.getState();
    
    // Sync creation mode state
    if (editorState.mode.current === 'create' && editorState.mode.createMode?.commandType) {
      if (this.state.activeMode === 'creation' && 
          this.state.createSubMode !== editorState.mode.createMode.commandType) {
        this.state.createSubMode = editorState.mode.createMode.commandType;
      }
    }
  }

  /**
   * Cambiar modo con desactivación automática del anterior
   */
  setMode(mode: ToolMode, options?: ToolModeOptions): void {
    const previousMode = this.state.activeMode;

    // Sync with editor state before making any decisions
    this.syncWithEditorState();

    // Si ya estamos en el modo solicitado, no hacer nada
    if (previousMode === mode && this.isModeConfigurationSame(options)) {
      return;
    }

    // Desactivar modo anterior
    this.deactivateCurrentMode();

    // Activar nuevo modo
    this.activateNewMode(mode, options);

    // Notificar cambio
    this.notifyListeners();

  }

  /**
   * Verificar si la configuración del modo es la misma
   */
  private isModeConfigurationSame(options?: ToolModeOptions): boolean {
    if (!options) {
      return false; // If no options provided, assume configuration is different
    }

    // Always allow changes within creation mode when commandType differs
    if (options.commandType && this.state.createSubMode !== options.commandType) {
      return false;
    }

    return this.state.createSubMode === options.commandType &&
      this.state.shapeId === options.shapeId &&
      this.state.textType === options.textType &&
      this.state.editingTextId === options.editingTextId;
  }

  /**
   * Desactivar el modo actual
   */
  private deactivateCurrentMode(): void {
    const currentMode = this.state.activeMode;

    switch (currentMode) {
      case 'shapes':
        if (this.shapeManager) {
          this.shapeManager.stopShapeCreation();
        }
        break;

      case 'curves':
        if (this.curvesManager) {
          this.curvesManager.deactivateExternally();
        }
        break;

      case 'pencil':
                if (this.pencilManager) {
          this.pencilManager.deactivateExternally();
        } 
        break;

      case 'text':
        if (this.textManager) {
          this.textManager.stopTextCreation();
        }
        break;

      case 'text-edit':
        if (this.textEditManager) {
          this.textEditManager.deactivateExternally();
        }
        break;

      case 'creation':
        if (this.creationManager) {
          this.creationManager.deactivateExternally();
        }
        break;

      case 'subpath-edit':
        // Cambiar el editor store de subpath-edit de vuelta a select
        useEditorStore.getState().setMode('select');
        break;

      case 'select':
        // Select mode no necesita desactivación especial
        break;
    }

    // Limpiar estado anterior
    this.state.createSubMode = undefined;
    this.state.shapeId = undefined;
    this.state.textType = undefined;
    this.state.editingTextId = undefined;
    this.state.metadata = undefined;
  }

  /**
   * Activar el nuevo modo
   */
  private activateNewMode(mode: ToolMode, options?: ToolModeOptions): void {

    this.state.activeMode = mode;

    switch (mode) {
      case 'shapes':
        // Clear selection when entering shapes mode
        useEditorStore.getState().clearSelection();
        
        if (options?.shapeId && this.shapeManager) {
          this.state.shapeId = options.shapeId;
          this.state.metadata = options.metadata;
          this.shapeManager.startShapeCreation(options.shapeId);
        }
        break;

      case 'curves':
        // Clear selection when entering curves mode
        useEditorStore.getState().clearSelection();
        
        if (this.curvesManager) {
          this.curvesManager.activateExternally();
        } else {
          // Fallback si no hay manager
          useEditorStore.getState().setMode('curves');
        }
        break;

      case 'pencil':
        // Clear selection when entering pencil mode
        useEditorStore.getState().clearSelection();
        
        if (this.pencilManager) {
          this.pencilManager.activateExternally();
        } else {
          // Fallback si no hay manager
          useEditorStore.getState().setCreateMode('PENCIL');
        }
        break;

      case 'text':
        // Clear selection when entering text mode
        useEditorStore.getState().clearSelection();
        
        if (options?.textType && this.textManager) {
          this.state.textType = options.textType;
          this.state.metadata = options.metadata;
          this.textManager.startTextCreation(options.textType);
        }
        break;

      case 'text-edit':
        if (options?.editingTextId) {
          this.state.editingTextId = options.editingTextId;
          this.state.metadata = options.metadata;
          // Text edit manager handles its own activation
        }
        break;

      case 'creation':
        if (options?.commandType) {
          this.state.createSubMode = options.commandType;
          
          if (this.creationManager) {
            this.creationManager.activateExternally(options.commandType);
          } else {
            // Fallback si no hay manager
            useEditorStore.getState().setCreateMode(options.commandType);
          }
        }
        break;

      case 'subpath-edit':
        useEditorStore.getState().setMode('subpath-edit');
        break;

      case 'select':
        useEditorStore.getState().setMode('select');
        break;
    }
  }

  /**
   * Agregar listener para cambios de estado
   */
  addListener(listener: (state: ToolModeState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notificar a todos los listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('🔧 ToolModeManager: Error in listener:', error);
      }
    });
  }

  /**
   * Método para casos especiales donde un manager necesita notificar
   * que ha sido desactivado externamente (ej: Escape key)
   */
  notifyModeDeactivated(mode: ToolMode): void {
    if (this.state.activeMode === mode) {
      this.setMode('select');
    }
  }

  /**
   * Obtener información del modo para debugging
   */
  getDebugInfo(): string {
    return JSON.stringify({
      activeMode: this.state.activeMode,
      createSubMode: this.state.createSubMode,
      shapeId: this.state.shapeId,
      hasShapeManager: !!this.shapeManager,
      hasCurvesManager: !!this.curvesManager,
    }, null, 2);
  }
}

// Instancia singleton
export const toolModeManager = new ToolModeManager();

// Make it globally accessible for debugging and plugin system
if (typeof window !== 'undefined') {
  (window as any).toolModeManager = toolModeManager;
}

// Helper functions para uso en componentes
export const useToolMode = () => {
  return {
    getActiveMode: () => toolModeManager.getActiveMode(),
    setMode: (mode: ToolMode, options?: ToolModeOptions) => toolModeManager.setMode(mode, options),
    isActive: (mode: ToolMode) => toolModeManager.isActive(mode),
    getState: () => toolModeManager.getState()
  };
};

export default toolModeManager;
