import React from 'react';

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
  position: 'toolbar' | 'sidebar' | 'statusbar' | 'contextmenu';
  order?: number;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private activeTools: Set<string> = new Set();
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  
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
}

export const pluginManager = new PluginManager();
