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
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
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
    console.log('🔌 PluginSystem: handleMouseEvent called with:', eventType);
    
    const context: MouseEventContext = {
      svgPoint: this.getSVGPoint(e as MouseEvent<SVGElement>),
      svgRef: this.svgRef!,
      commandId,
      controlPoint
    };

    console.log('🔌 PluginSystem: SVG point:', context.svgPoint);

    // Check if clicking on a transform handle
    const target = e.target as SVGElement;
    
    // Safety check: ensure target is a valid DOM element with getAttribute method
    const handleType = target && typeof target.getAttribute === 'function' 
      ? target.getAttribute('data-handle-type') 
      : null;
    const handleId = target && typeof target.getAttribute === 'function' 
      ? target.getAttribute('data-handle-id') 
      : null;
    
    // Process plugins in order, stop if any plugin handles the event
    let pluginsToProcess = this.getEnabledPlugins();
    
    console.log('🔌 PluginSystem: Processing', pluginsToProcess.length, 'enabled plugins');
    
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
        console.log('🔌 PluginSystem: Prioritizing shapes plugin - in creation mode');
      }
    }
    
    for (const plugin of pluginsToProcess) {
      if (!plugin.mouseHandlers) continue;

      console.log('🔌 PluginSystem: Trying plugin:', plugin.id);
      
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

      console.log('🔌 PluginSystem: Plugin', plugin.id, 'handled:', handled);

      if (handled) {
        return true;
      }
    }

    console.log('🔌 PluginSystem: No plugin handled the event');
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
    
    // Register shortcuts
    plugin.shortcuts?.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    });
  }
  
  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    
    plugin.enabled = false;
    plugin.onDeactivate?.();
    
    // Unregister shortcuts
    plugin.shortcuts?.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.delete(key);
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
    // First, let plugins handle the event
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.handleKeyDown) {
        const handled = plugin.handleKeyDown(event);
        if (handled) return true;
      }
    }
    
    // If no plugin handled it, check shortcuts
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');
    
    const key = modifiers.length > 0 ? `${modifiers.sort().join('+')}+${event.key}` : event.key;
    const shortcut = this.shortcuts.get(key);
    
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
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
}

export const pluginManager = new PluginManager();
