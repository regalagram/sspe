import React, { PointerEvent, WheelEvent } from 'react';
import { useEditorStore } from '../store/editorStore';
import { getSVGPoint } from '../utils/transform-utils';
import type { EditorState } from '../types';
import { FloatingActionDefinition } from '../types/floatingToolbar';
import { FloatingToolbarManager } from './FloatingToolbar/FloatingToolbarManager';

export interface SVGPoint {
  x: number;
  y: number;
}

export interface PointerEventHandler {
  onPointerDown?: (e: PointerEvent<SVGElement>, context: PointerEventContext) => boolean;
  onPointerMove?: (e: PointerEvent<SVGElement>, context: PointerEventContext) => boolean;
  onPointerUp?: (e: PointerEvent<SVGElement>, context: PointerEventContext) => boolean;
  onWheel?: (e: WheelEvent<SVGElement>, context: PointerEventContext) => boolean;
}

export interface PointerEventContext {
  svgPoint: SVGPoint;
  svgRef: React.RefObject<SVGSVGElement | null>;
  commandId?: string;
  controlPoint?: 'x1y1' | 'x2y2';
  isDoubleClick?: boolean;
  clickCount?: number;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  dependencies?: string[];
  initialize?: (editor: ReturnType<typeof useEditorStore>) => void;
  destroy?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  tools?: ToolDefinition[];
  shortcuts?: ShortcutDefinition[];
  ui?: UIComponentDefinition[];
  pointerHandlers?: PointerEventHandler;
  handleKeyDown?: (e: KeyboardEvent) => boolean;
  handleKeyUp?: (e: KeyboardEvent) => boolean;
  floatingActions?: FloatingActionDefinition[];
}

export interface ToolDefinition {
  id: string;
  name: string;
  icon?: string;
  category: 'create' | 'edit' | 'select' | 'transform' | 'view';
  shortcut?: string;
  onActivate: () => void;
  onDeactivate?: () => void;
  render?: () => React.ReactNode;
}

export interface ShortcutDefinition {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: () => void;
  description: string;
  plugin?: string; // The plugin id or name this shortcut belongs to (assigned automatically)
}


export interface UIComponentDefinition {
  id: string;
  component: React.ComponentType<{}>;
  position: 'toolbar' | 'sidebar' | 'statusbar' | 'contextmenu' | 'svg-content';
  order?: number;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private activeTools: Set<string> = new Set();
  private shortcuts: Map<string, ShortcutDefinition[]> = new Map();
  private svgRef: React.RefObject<SVGSVGElement | null> | null = null;
  private editorStore: ReturnType<typeof useEditorStore> | null = null;
  public isShapeCreationMode: boolean = false;
  public isTextCreationMode: boolean = false;
  
  // Double-click detection state
  private lastClickTime: number = 0;
  private lastClickTarget: EventTarget | null = null;
  private clickCount: number = 0;
  private doubleClickDelay: number = 400; // ms - increased for easier double-click detection

  setSVGRef(ref: React.RefObject<SVGSVGElement | null>): void {
    this.svgRef = ref;
  }

  setEditorStore(store: ReturnType<typeof useEditorStore>): void {
    this.editorStore = store;
  }

  getEditorStore(): ReturnType<typeof useEditorStore> | null {
    return this.editorStore;
  }

  setShapeCreationMode(isCreating: boolean): void {
    this.isShapeCreationMode = isCreating;
  }

  getShapeCreationMode(): boolean {
    return this.isShapeCreationMode;
  }

  setTextCreationMode(isCreating: boolean): void {
    this.isTextCreationMode = isCreating;
  }

  getTextCreationMode(): boolean {
    return this.isTextCreationMode;
  }

  /**
   * Detect if this is a double-click event
   */
  private detectDoubleClick(e: PointerEvent<SVGElement>): { isDoubleClick: boolean; clickCount: number } {
    const now = Date.now();
    const currentTarget = e.target;
    
    // Check if this is a potential double-click
    const timeDiff = now - this.lastClickTime;
    
    // Enhanced same target detection for text elements and their selection borders
    let sameTarget = this.lastClickTarget === currentTarget;
    if (!sameTarget) {
      // Check if both targets are related to the same text element
      const getTextElementId = (target: EventTarget | null): string | null => {
        const element = target as SVGElement;
        if (!element || !element.dataset) return null;
        
        // Direct text element
        if (element.tagName === 'text' && element.id) return element.id;
        
        // Element with data-element-id (like selection borders)
        if (element.dataset.elementId) return element.dataset.elementId;
        
        return null;
      };
      
      const currentTextId = getTextElementId(currentTarget);
      const lastTextId = getTextElementId(this.lastClickTarget);
      
      if (currentTextId && lastTextId && currentTextId === lastTextId) {
        sameTarget = true;
              }
    }
    
        
    if (timeDiff <= this.doubleClickDelay && sameTarget) {
      this.clickCount++;
    } else {
      this.clickCount = 1;
    }
    
    this.lastClickTime = now;
    this.lastClickTarget = currentTarget;
    
    const isDoubleClick = this.clickCount === 2;
    
        
    // Reset count after double-click to prevent triple-click issues
    if (isDoubleClick) {
      this.clickCount = 0;
    }
    
    return {
      isDoubleClick,
      clickCount: this.clickCount
    };
  }

  getSVGPoint(e: PointerEvent<SVGElement>): SVGPoint {
    if (!this.svgRef || !this.editorStore) return { x: 0, y: 0 };
    const store = this.editorStore as { viewport: EditorState['viewport'] };
    const viewport = store.viewport ?? { x: 0, y: 0, width: 0, height: 0, zoom: 1, pan: { x: 0, y: 0 } };
    return getSVGPoint(e, this.svgRef, viewport);
  }

  handlePointerEvent(
    eventType: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'wheel',
    e: PointerEvent<SVGElement> | WheelEvent<SVGElement>,
    commandId?: string,
    controlPoint?: 'x1y1' | 'x2y2'
  ): boolean {
    // Get target and elementType once for the whole method
    const target = e.target as SVGElement;
    const elementType = target && typeof target.getAttribute === 'function'
      ? target.getAttribute('data-element-type')
      : null;

    // DEBUG: Log all pointer events for debugging
    if (eventType === 'pointerDown') {
      console.log('🔍 PluginSystem handlePointerEvent:', {
        eventType,
        commandId,
        controlPoint,
        elementType,
        targetTag: target.tagName,
        targetId: target.id
      });
    }
    // Detect double-click for pointerDown events
    let isDoubleClick = false;
    let clickCount = 1;
    
    if (eventType === 'pointerDown') {
      const doubleClickInfo = this.detectDoubleClick(e as PointerEvent<SVGElement>);
      isDoubleClick = doubleClickInfo.isDoubleClick;
      clickCount = doubleClickInfo.clickCount;
      
          }

    const context: PointerEventContext = {
      svgPoint: this.getSVGPoint(e as PointerEvent<SVGElement>),
      svgRef: this.svgRef!,
      commandId,
      controlPoint,
      isDoubleClick,
      clickCount
    };

    const handleType = target && typeof target.getAttribute === 'function'
      ? target.getAttribute('data-handle-type')
      : null;
    const handleId = target && typeof target.getAttribute === 'function'
      ? target.getAttribute('data-handle-id')
      : null;

    // Process plugins in order, stop if any plugin handles the event
    let pluginsToProcess: Plugin[] = this.getEnabledPlugins();
    let contextMenuPrioritized = false;
    
    // CRITICAL: Para eventos touch, dar prioridad absoluta al GesturesPlugin
    // Esto debe estar ANTES de cualquier otra priorización
    if ((e as PointerEvent<SVGElement>).pointerType === 'touch') {
      const gesturesPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'gestures');
      if (gesturesPlugin) {
        const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'gestures');
        pluginsToProcess = [gesturesPlugin, ...otherPlugins];
        console.log('🔧 PluginSystem: Prioritizing gestures plugin for touch event');
      }
    }
    
    // Special priority for text-edit plugin on double-clicks
    if (isDoubleClick && eventType === 'pointerDown') {
            const textEditPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'text-edit');
      if (textEditPlugin) {
        const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'text-edit');
        pluginsToProcess = [textEditPlugin, ...otherPlugins];
              } else {
              }
    }
    
    if (eventType === 'pointerDown' && (e as PointerEvent<SVGElement>).button === 2) {
      // For right-clicks, prioritize context menu plugin above all others
      const contextMenuPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'context-menu');
      const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'context-menu');
      if (contextMenuPlugin) {
        pluginsToProcess = [contextMenuPlugin, ...otherPlugins];
        contextMenuPrioritized = true;
      }
    }

    if ((handleType === 'transform' || handleType === 'rotation') && eventType === 'pointerDown' && !contextMenuPrioritized) {
      // When clicking on a transform or rotation handle, prioritize Transform plugin
      const transformPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'transform');
      const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'transform');
      if (transformPlugin) {
        pluginsToProcess = [transformPlugin, ...otherPlugins];
      }
    } else if (eventType === 'pointerDown' && !contextMenuPrioritized) {
      // Check if this is a text or textPath element
      const target = e.target as SVGElement;
      const elementType = target && typeof target.getAttribute === 'function'
        ? target.getAttribute('data-element-type')
        : null;
      
      // Check if we're clicking on a text-related element (including tspan within text)
      const isTextRelated = elementType === 'text' || elementType === 'multiline-text' || 
                          (target.tagName === 'tspan' && target.parentElement?.tagName === 'text');
      
      if (isTextRelated && !isDoubleClick) {
        // When single-clicking on text, prioritize pointer-interaction plugin for selection logic
        // But for double-clicks, let text-edit plugin handle it first (already prioritized above)
        const pointerInteractionPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'pointer-interaction');
        const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'pointer-interaction');
        if (pointerInteractionPlugin) {
          pluginsToProcess = [pointerInteractionPlugin, ...otherPlugins];
        }
      } else if (elementType === 'textPath') {
        // When clicking on textPath, prioritize pointer-interaction plugin for selection logic
        const pointerInteractionPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'pointer-interaction');
        const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'pointer-interaction');
        if (pointerInteractionPlugin) {
          pluginsToProcess = [pointerInteractionPlugin, ...otherPlugins];
        }
      } else if (commandId && !elementType) {
        // When clicking on a command (path commands), process PointerInteraction first
        const pointerInteractionPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'pointer-interaction');
        const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'pointer-interaction');
        if (pointerInteractionPlugin) {
          pluginsToProcess = [pointerInteractionPlugin, ...otherPlugins];
        }
      } else if (!commandId && !elementType) {
        // DEBUG: Log empty space click detection
        console.log('🔍 PluginSystem: Empty space click detected', {
          commandId,
          elementType,
          isTextCreationMode: this.isTextCreationMode,
          isShapeCreationMode: this.isShapeCreationMode,
          target: (e.target as SVGElement).tagName
        });
        
        // Check current tool mode to prioritize the right plugin
        let currentMode: string | null = null;
        try {
          // @ts-ignore
          const toolModeManager = window.toolModeManager;
          if (toolModeManager && typeof toolModeManager.getActiveMode === 'function') {
            currentMode = toolModeManager.getActiveMode();
          }
        } catch (e) {
          console.warn('[PluginSystem] Error checking tool mode:', e);
        }

        console.log('🔧 [PluginSystem] Current mode detected:', currentMode);

        // Find all creation plugins
        const creationPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'creation');
        const pencilPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'pencil');
        const curvesPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'curves');
        const shapesPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'shapes');
        const textPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'text-placement');
        const pointerInteractionPlugin = pluginsToProcess.find((p: Plugin) => p.id === 'pointer-interaction');
        
        // Prioritize creation plugins based on current mode
        if (currentMode === 'creation' && creationPlugin) {
          const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'creation');
          pluginsToProcess = [creationPlugin, ...otherPlugins];
          console.log('🔍 PluginSystem: Prioritizing CREATION plugin for creation mode');
        } else if (currentMode === 'pencil' && pencilPlugin) {
          const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'pencil');
          pluginsToProcess = [pencilPlugin, ...otherPlugins];
          console.log('🔍 PluginSystem: Prioritizing PENCIL plugin for pencil mode');
        } else if (currentMode === 'curves' && curvesPlugin) {
          const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'curves');
          pluginsToProcess = [curvesPlugin, ...otherPlugins];
          console.log('🔍 PluginSystem: Prioritizing CURVES plugin for curves mode');
        } else if (textPlugin && (this.isTextCreationMode || currentMode === 'text')) {
          const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'text-placement');
          pluginsToProcess = [textPlugin, ...otherPlugins];
          console.log('🔍 PluginSystem: Prioritizing TEXT plugin for text creation mode');
        } else if (shapesPlugin && (this.isShapeCreationMode || currentMode === 'shapes')) {
          const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'shapes');
          pluginsToProcess = [shapesPlugin, ...otherPlugins];
          console.log('🔍 PluginSystem: Prioritizing SHAPES plugin for shape creation mode');
        } else if (pointerInteractionPlugin) {
          // When NOT in creation mode, prioritize pointer-interaction for empty space clicks (deselection/area selection)
          const otherPlugins = pluginsToProcess.filter((p: Plugin) => p.id !== 'pointer-interaction');
          pluginsToProcess = [pointerInteractionPlugin, ...otherPlugins];
          console.log('🔍 PluginSystem: Prioritizing pointer-interaction plugin for empty space click');
        }
      }
    }

    for (const plugin of pluginsToProcess) {
      if (!plugin.pointerHandlers) continue;
      
      // Log for double-clicks specifically
      if (isDoubleClick && eventType === 'pointerDown') {
              }
      
      let handled = false;
      
      // DEBUG: Log which plugin is being processed for empty space clicks (disabled by default)
      // if (eventType === 'pointerDown' && !commandId && !elementType) {
      //   console.log(`🔍 PluginSystem: Processing plugin "${plugin.id}" for empty space click`);
      // }
      
      switch (eventType) {
        case 'pointerDown':
          handled = plugin.pointerHandlers.onPointerDown?.(e as PointerEvent<SVGElement>, context) || false;
          break;
        case 'pointerMove':
          handled = plugin.pointerHandlers.onPointerMove?.(e as PointerEvent<SVGElement>, context) || false;
          break;
        case 'pointerUp':
          handled = plugin.pointerHandlers.onPointerUp?.(e as PointerEvent<SVGElement>, context) || false;
          break;
        case 'wheel':
          handled = plugin.pointerHandlers.onWheel?.(e as WheelEvent<SVGElement>, context) || false;
          break;
      }
      
      // DEBUG: Log if plugin handled the event for empty space clicks
      if (eventType === 'pointerDown' && !commandId && !elementType && handled) {
        console.log(`🚨 PluginSystem: Plugin "${plugin.id}" HANDLED the empty space click event!`);
      }
      
      if (isDoubleClick && eventType === 'pointerDown') {
              }
      
      if (handled) {
                return true;
      }
    }
    return false;
  }
  
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    
    // Register floating actions with FloatingToolbarManager
    if (plugin.floatingActions) {
      try {
        FloatingToolbarManager.getInstance().registerPlugin(plugin);
      } catch (e) {
        console.warn('FloatingToolbarManager not available:', e);
      }
    }
    
    if (plugin.enabled) {
      this.enablePlugin(plugin.id);
    }
  }

  enablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        const depPlugin = this.plugins.get(dep as string);
        if (!depPlugin || !depPlugin.enabled) {
          console.warn(`Plugin ${pluginId} requires dependency ${dep} to be enabled`);
          return;
        }
      }
    }
    plugin.enabled = true;
    plugin.onActivate?.();
    // Register shortcuts (permitir múltiples por combinación)
    plugin.shortcuts?.forEach((shortcut: ShortcutDefinition) => {
      // Assign plugin id automatically if not set
      if (!shortcut.plugin) shortcut.plugin = plugin.id;
      const key = this.getShortcutKey(shortcut);
      if (!this.shortcuts.has(key)) this.shortcuts.set(key, [] as ShortcutDefinition[]);
      this.shortcuts.get(key)!.push(shortcut);
    });
  }
  
  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    plugin.enabled = false;
    plugin.onDeactivate?.();
    // Unregister shortcuts (solo los de este plugin)
    plugin.shortcuts?.forEach((shortcut: ShortcutDefinition) => {
      const key = this.getShortcutKey(shortcut);
      if (this.shortcuts.has(key)) {
        const arr = (this.shortcuts.get(key) as ShortcutDefinition[]).filter(s => s !== shortcut);
        if (arr.length > 0) {
          this.shortcuts.set(key, arr);
        } else {
          this.shortcuts.delete(key);
        }
      }
    });
  }
  
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }
  
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  private getShortcutKey(shortcut: ShortcutDefinition): string {
    const modifiers = shortcut.modifiers?.sort().join('+') || '';
    return modifiers ? `${modifiers}+${shortcut.key}` : shortcut.key;
  }
  
  handleKeyDown(event: KeyboardEvent): boolean {
    // --- SVG/canvas focus logic (strict TypeScript) ---
    const active = document.activeElement as HTMLElement | null;
    let isSVGCanvasFocused = false;
    let isInput = false;
    let isBody = false;
    if (active) {
      const tag = typeof active.tagName === 'string' ? active.tagName.toUpperCase() : '';
      isSVGCanvasFocused =
        tag === 'SVG' ||
        (typeof active.closest === 'function' && !!active.closest('svg'));
      isInput =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (typeof (active as HTMLElement).isContentEditable === 'boolean' && (active as HTMLElement).isContentEditable === true);
      isBody = active === document.body;
    }
    // Si el foco está en un input, textarea o contentEditable, nunca ejecutar shortcuts
    if (isInput) {
      return false;
    }
    // Solo ejecutar shortcuts si el foco está en el SVG/canvas o en el body
    if (!isSVGCanvasFocused && !isBody) {
      return false;
    }

    // Check if we're in text-edit mode - if so, let text editing handle ALL keys except escape
    let isInTextEditMode = false;
    let toolModeManagerMode = 'unknown';
    try {
      // @ts-ignore
      const toolModeManager = window.toolModeManager;
      if (toolModeManager) {
        toolModeManagerMode = toolModeManager.getActiveMode();
        isInTextEditMode = toolModeManagerMode === 'text-edit';
      }
    } catch (e) {
      console.warn('[PluginSystem] Error checking tool mode:', e);
    }
    
        
    if (isInTextEditMode) {
            // Only allow Escape to be handled by shortcuts in text-edit mode
      if (event.key !== 'Escape') {
                return false; // Let the text input handle the key
      }
    }
    
    // Log para debug de teclas (temporarily enabled for debugging)
    if (event.key === 'Enter' || event.key === 'F2' || event.key.length === 1) {
          }

    // First, let plugins handle the event
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && typeof plugin.handleKeyDown === 'function') {
        const handled = plugin.handleKeyDown(event);
        if (handled) return true;
      }
    }

    // If no plugin handled it, check shortcuts
    const modifiers: Array<'ctrl' | 'alt' | 'shift' | 'meta'> = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');

    const key = modifiers.length > 0 ? `${modifiers.sort().join('+')}+${event.key}` : event.key;
    const shortcuts = this.shortcuts.get(key);

    // Debug shortcut lookup
    if (event.key === 'Enter' || event.key === 'F2') {
      console.log('[PluginSystem] Shortcut lookup:', {
        searchKey: key,
        availableShortcuts: Array.from(this.shortcuts.keys()),
        foundShortcuts: shortcuts ? shortcuts.length : 0,
        shortcuts: shortcuts?.map(s => ({ key: s.key, plugin: s.plugin, description: s.description }))
      });
    }

    if (shortcuts && shortcuts.length > 0) {
      // Debug shortcut execution
      if (event.key === 'Enter' || event.key === 'F2') {
              }
      
      // Si hay varios shortcuts para la misma combinación, priorizar el del modo activo
      let mode: string | undefined = undefined;
      try {
        // @ts-ignore
        mode = window.toolModeManager ? window.toolModeManager.getActiveMode() : undefined;
      } catch (e) {
        // fallback: no hay toolModeManager
      }
      
      // Special priority for text-edit plugin when text is selected
      if (event.key === 'Enter' || event.key === 'F2') {
        const textEditShortcut = shortcuts.find(s => s.plugin === 'text-edit');
        if (textEditShortcut) {
          // Check if there are selected texts
          try {
            const editorStore = this.editorStore as any;
            const hasSelectedText = editorStore && editorStore.selection?.selectedTexts?.length > 0;
            if (hasSelectedText || mode === 'text-edit') {
              event.preventDefault();
                            textEditShortcut.action();
              return true;
            }
          } catch (e) {
            console.warn('[PluginSystem] Error checking text selection:', e);
          }
        }
      }
      
      let found = false;
      if (mode) {
        // Prioridad exacta: plugin === mode
        for (const s of shortcuts) {
          if (s.plugin && s.plugin.toLowerCase() === mode.toLowerCase()) {
            event.preventDefault();
                        s.action();
            found = true;
            break;
          }
        }
        // Si no hay coincidencia exacta, buscar por includes (fallback heurístico)
        if (!found) {
          for (const s of shortcuts) {
            if ((s.description && s.description.toLowerCase().includes(mode.toLowerCase())) ||
                (s.plugin && s.plugin.toLowerCase().includes(mode.toLowerCase()))) {
              event.preventDefault();
                            s.action();
              found = true;
              break;
            }
          }
        }
      }
      if (!found) {
        // Si no se encontró por modo, ejecuta el primero
        event.preventDefault();
                shortcuts[0].action();
      }
      return true;
    }

    return false;
  }
  
  handleKeyUp(event: KeyboardEvent): boolean {
    // Let plugins handle the event
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.handleKeyUp) {
        const handled = plugin.handleKeyUp(event);
        if (handled) return true;
      }
    }
    
    return false;
  }

  /**
   * Returns a flat array of all registered shortcuts from enabled plugins.
   */
  getAllShortcuts(): ShortcutDefinition[] {
    const all: ShortcutDefinition[] = [];
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.shortcuts) {
        all.push(...plugin.shortcuts);
      }
    }
    return all;
  }
}

export const pluginManager = new PluginManager();
