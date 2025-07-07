import { useEditorStore } from '../store/editorStore';
import { EditorCommandType } from '../types';

export type ToolMode = 'select' | 'pencil' | 'curves' | 'shapes' | 'creation';

export interface ToolModeState {
  activeMode: ToolMode;
  createSubMode?: EditorCommandType; // Para M, L, C, Z
  shapeId?: string; // Para shapes
  metadata?: Record<string, any>; // Datos adicionales del modo
}

export interface ToolModeOptions {
  commandType?: EditorCommandType;
  shapeId?: string;
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
  private creationManager: any = null;
  
  constructor() {
    console.log('🔧 ToolModeManager: Initialized');
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
   * Cambiar modo con desactivación automática del anterior
   */
  setMode(mode: ToolMode, options?: ToolModeOptions): void {
    const previousMode = this.state.activeMode;
    
    console.log(`🔧 ToolModeManager: Changing mode from '${previousMode}' to '${mode}'`, options);
    
    // Si ya estamos en el modo solicitado, no hacer nada
    if (previousMode === mode && this.isModeConfigurationSame(options)) {
      console.log(`🔧 ToolModeManager: Already in mode '${mode}', skipping`);
      return;
    }
    
    // Desactivar modo anterior
    this.deactivateCurrentMode();
    
    // Activar nuevo modo
    this.activateNewMode(mode, options);
    
    // Notificar cambio
    this.notifyListeners();
    
    console.log(`🔧 ToolModeManager: Mode changed successfully to '${mode}'`);
  }
  
  /**
   * Verificar si la configuración del modo es la misma
   */
  private isModeConfigurationSame(options?: ToolModeOptions): boolean {
    if (!options) return true;
    
    return this.state.createSubMode === options.commandType && 
           this.state.shapeId === options.shapeId;
  }
  
  /**
   * Desactivar el modo actual
   */
  private deactivateCurrentMode(): void {
    const currentMode = this.state.activeMode;
    
    console.log(`🔧 ToolModeManager: Deactivating mode '${currentMode}'`);
    
    switch (currentMode) {
      case 'shapes':
        if (this.shapeManager) {
          console.log('🔧 ToolModeManager: Stopping shape creation');
          this.shapeManager.stopShapeCreation();
        }
        break;
        
      case 'curves':
        if (this.curvesManager) {
          console.log('🔧 ToolModeManager: Exiting curve tool');
          this.curvesManager.deactivateExternally();
        }
        break;
        
      case 'pencil':
        console.log('🔧 ToolModeManager: Exiting pencil mode');
        if (this.pencilManager) {
          this.pencilManager.deactivateExternally();
        } else {
          // Fallback si no hay manager
          const store = useEditorStore.getState();
          if (store.mode.current === 'create' && store.mode.createMode?.commandType === 'PENCIL') {
            store.exitCreateMode();
          }
        }
        break;
        
      case 'creation':
        console.log('🔧 ToolModeManager: Exiting creation mode');
        if (this.creationManager) {
          this.creationManager.deactivateExternally();
        } else {
          // Fallback si no hay manager
          const editorStore = useEditorStore.getState();
          if (editorStore.mode.current === 'create') {
            editorStore.exitCreateMode();
          }
        }
        break;
        
      case 'select':
        // Select mode no necesita desactivación especial
        break;
    }
    
    // Limpiar estado anterior
    this.state.createSubMode = undefined;
    this.state.shapeId = undefined;
    this.state.metadata = undefined;
  }
  
  /**
   * Activar el nuevo modo
   */
  private activateNewMode(mode: ToolMode, options?: ToolModeOptions): void {
    console.log(`🔧 ToolModeManager: Activating mode '${mode}'`, options);
    
    this.state.activeMode = mode;
    
    switch (mode) {
      case 'shapes':
        if (options?.shapeId && this.shapeManager) {
          this.state.shapeId = options.shapeId;
          this.state.metadata = options.metadata;
          console.log(`🔧 ToolModeManager: Starting shape creation with '${options.shapeId}'`);
          this.shapeManager.startShapeCreation(options.shapeId);
        }
        break;
        
      case 'curves':
        if (this.curvesManager) {
          console.log('🔧 ToolModeManager: Activating curve tool');
          this.curvesManager.activateCurveTool();
        }
        break;
        
      case 'pencil':
        console.log('🔧 ToolModeManager: Activating pencil mode');
        if (this.pencilManager) {
          this.pencilManager.activatePencil();
        } else {
          // Fallback si no hay manager
          useEditorStore.getState().setCreateMode('PENCIL');
        }
        break;
        
      case 'creation':
        if (options?.commandType) {
          this.state.createSubMode = options.commandType;
          console.log(`🔧 ToolModeManager: Activating creation mode with '${options.commandType}'`);
          if (this.creationManager) {
            this.creationManager.activateCreation(options.commandType);
          } else {
            // Fallback si no hay manager
            useEditorStore.getState().setCreateMode(options.commandType);
          }
        }
        break;
        
      case 'select':
        console.log('🔧 ToolModeManager: Activating select mode');
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
      console.log(`🔧 ToolModeManager: Mode '${mode}' was deactivated externally`);
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
