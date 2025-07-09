import React, { MouseEvent, WheelEvent } from 'react';
import { getSVGPoint } from '../utils/transform-utils';

export interface SVGPoint {
  x: number;
  y: number;
}

export interface MouseEventHandler {
  onMouseDown?: (e: MouseEvent<SVGElement>, context: MouseEventContext) => boolean;
  onMouseMove?: (e: MouseEvent<SVGElement>, context: MouseEventContext) => boolean;
  onMouseUp?: (e: MouseEvent<SVGElement>, context: MouseEventContext) => boolean;
  onWheel?: (e: WheelEvent<SVGElement>, context: MouseEventContext) => boolean;
}

export interface MouseEventContext {
  svgPoint: SVGPoint;
  svgRef: React.RefObject<SVGSVGElement | null>;
  commandId?: string;
  controlPoint?: 'x1y1' | 'x2y2';
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  dependencies?: string[];
  initialize?: (editor: any) => void;
  destroy?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  tools?: ToolDefinition[];
  shortcuts?: ShortcutDefinition[];
  ui?: UIComponentDefinition[];
  mouseHandlers?: MouseEventHandler;
  handleKeyDown?: (e: KeyboardEvent) => boolean;
  handleKeyUp?: (e: KeyboardEvent) => boolean;
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
  component: React.ComponentType<any>;
  position: 'toolbar' | 'sidebar' | 'statusbar' | 'contextmenu' | 'svg-content';
  order?: number;
}

export class PluginManager {

  private plugins: Map<string, Plugin> = new Map();
  private activeTools: Set<string> = new Set();
  private shortcuts: Map<string, ShortcutDefinition[]> = new Map();
  private svgRef: React.RefObject<SVGSVGElement | null> | null = null;
  private editorStore: any = null;
  public isShapeCreationMode: boolean = false;
  
  setSVGRef(ref: React.RefObject<SVGSVGElement | null>): void {
    this.svgRef = ref;
  }

  setEditorStore(store: any): void {
    this.editorStore = store;
  }

  getEditorStore(): any {
    return this.editorStore;
  }

  setShapeCreationMode(isCreating: boolean): void {
    this.isShapeCreationMode = isCreating;
  }

  getShapeCreationMode(): boolean {
    return this.isShapeCreationMode;
  }

  getSVGPoint(e: MouseEvent<SVGElement>): SVGPoint {
    if (!this.svgRef || !this.editorStore) return { x: 0, y: 0 };
    return getSVGPoint(e, this.svgRef, this.editorStore.viewport);
  }

  handleMouseEvent(
    eventType: 'mouseDown' | 'mouseMove' | 'mouseUp' | 'wheel',
    e: MouseEvent<SVGElement> | WheelEvent<SVGElement>,
    commandId?: string,
    controlPoint?: 'x1y1' | 'x2y2'
  ): boolean {
    const context: MouseEventContext = {
      svgPoint: this.getSVGPoint(e as MouseEvent<SVGElement>),
      svgRef: this.svgRef!,
      commandId,
      controlPoint
    };

    const target = e.target as SVGElement;
    
    const handleType = target && typeof target.getAttribute === 'function' 
      ? target.getAttribute('data-handle-type') 
      : null;
    const handleId = target && typeof target.getAttribute === 'function' 
      ? target.getAttribute('data-handle-id') 
      : null;
    
    // Process plugins in order, stop if any plugin handles the event
    let pluginsToProcess = this.getEnabledPlugins();
    
    if ((handleType === 'transform' || handleType === 'rotation') && eventType === 'mouseDown') {
      // When clicking on a transform or rotation handle, prioritize Transform plugin
      const transformPlugin = pluginsToProcess.find(p => p.id === 'transform');
      const otherPlugins = pluginsToProcess.filter(p => p.id !== 'transform');
      
      if (transformPlugin) {
        pluginsToProcess = [transformPlugin, ...otherPlugins];
      }
    } else if (commandId && eventType === 'mouseDown') {
      // When clicking on a command, process MouseInteraction first, then others
      const mouseInteractionPlugin = pluginsToProcess.find(p => p.id === 'mouse-interaction');
      const otherPlugins = pluginsToProcess.filter(p => p.id !== 'mouse-interaction');
      
      if (mouseInteractionPlugin) {
        pluginsToProcess = [mouseInteractionPlugin, ...otherPlugins];
      }
    } else if (!commandId && eventType === 'mouseDown') {
      // When clicking on empty canvas, prioritize shapes plugin if it's in creation mode
      const shapesPlugin = pluginsToProcess.find(p => p.id === 'shapes');
      if (shapesPlugin && this.isShapeCreationMode) {
        const otherPlugins = pluginsToProcess.filter(p => p.id !== 'shapes');
        pluginsToProcess = [shapesPlugin, ...otherPlugins];
      }
    }
    
    for (const plugin of pluginsToProcess) {
      if (!plugin.mouseHandlers) continue;

      let handled = false;
      switch (eventType) {
        case 'mouseDown':
          handled = plugin.mouseHandlers.onMouseDown?.(e as MouseEvent<SVGElement>, context) || false;
          break;
        case 'mouseMove':
          handled = plugin.mouseHandlers.onMouseMove?.(e as MouseEvent<SVGElement>, context) || false;
          break;
        case 'mouseUp':
          handled = plugin.mouseHandlers.onMouseUp?.(e as MouseEvent<SVGElement>, context) || false;
          break;
        case 'wheel':
          handled = plugin.mouseHandlers.onWheel?.(e as WheelEvent<SVGElement>, context) || false;
          break;
      }

      if (handled) {
        return true;
      }
    }

    return false;
  }
  
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    
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
        const depPlugin = this.plugins.get(dep);
        if (!depPlugin || !depPlugin.enabled) {
          console.warn(`Plugin ${pluginId} requires dependency ${dep} to be enabled`);
          return;
        }
      }
    }
    
    plugin.enabled = true;
    plugin.onActivate?.();
    
    // Register shortcuts (permitir múltiples por combinación)
    plugin.shortcuts?.forEach(shortcut => {
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
    plugin.shortcuts?.forEach(shortcut => {
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

    // Log para debug de teclas
    console.log('[PluginSystem] keydown:', {
      key: event.key,
      code: event.code,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
      target: event.target
    });

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

    if (shortcuts && shortcuts.length > 0) {
      // Si hay varios shortcuts para la misma combinación, priorizar el del modo activo
      let mode: string | undefined = undefined;
      try {
        // @ts-ignore
        mode = window.toolModeManager ? window.toolModeManager.getActiveMode() : undefined;
      } catch (e) {
        // fallback: no hay toolModeManager
      }
      let found = false;
      if (mode) {
        // Prioridad exacta: plugin === mode
        for (const s of shortcuts) {
          if (s.plugin && s.plugin.toLowerCase() === mode.toLowerCase()) {
            event.preventDefault();
            console.log('[PluginSystem] shortcut triggered (by mode):', key, s);
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
              console.log('[PluginSystem] shortcut triggered (by mode-heuristic):', key, s);
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
        console.log('[PluginSystem] shortcut triggered (default):', key, shortcuts[0]);
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
