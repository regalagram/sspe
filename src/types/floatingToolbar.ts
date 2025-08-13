import React from 'react';

export type ElementType = 'text' | 'path' | 'subpath' | 'group' | 'use' | 'image' | 'command' | 'mixed';
export type SelectionType = 'single' | 'multiple';

export interface ToolbarAction {
  id: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  type: 'button' | 'toggle' | 'dropdown' | 'color' | 'input';
  
  // Action handlers
  action?: () => void;
  toggle?: {
    isActive: () => boolean;
    onToggle: () => void;
  };
  dropdown?: {
    options: DropdownOption[];
    currentValue?: string;
  };
  color?: {
    currentColor: string;
    onChange: (color: string) => void;
  };
  input?: {
    currentValue: string | number;
    onChange: (value: string | number) => void;
    type: 'text' | 'number';
    placeholder?: string;
  };
  
  // Metadata
  priority?: number;
  destructive?: boolean;
  disabled?: boolean;
  tooltip?: string;
  shortcut?: string;
}

export interface DropdownOption {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  action: () => void;
  disabled?: boolean;
}

export interface FloatingActionDefinition {
  elementTypes: ElementType[];
  selectionTypes: SelectionType[];
  actions: ToolbarAction[];
  priority?: number;
}

export interface FloatingToolbarConfig {
  desktop: {
    maxVisibleButtons: number;
    buttonSize: number;
    layout: 'horizontal' | 'vertical';
    spacing: number;
  };
  mobile: {
    maxVisibleButtons: number;
    buttonSize: number;
    layout: 'horizontal' | 'vertical' | 'adaptive';
    spacing: number;
  };
}

export interface ToolbarPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}