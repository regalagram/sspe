import React from 'react';

export type ElementType = 'text' | 'textPath' | 'path' | 'subpath' | 'group' | 'use' | 'image' | 'command' | 'symbol' | 'mixed';
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
  strokeOptions?: {
    getCurrentStrokeWidth: () => number;
    getCurrentStrokeDash: () => string;
    getCurrentStrokeLinecap: () => string;
    getCurrentStrokeLinejoin: () => string;
    onStrokeWidthChange: (width: number) => void;
    onStrokeDashChange: (dash: string) => void;
    onStrokeLinecapChange: (linecap: string) => void;
    onStrokeLinejoinChange: (linejoin: string) => void;
  };
  
  // Metadata
  priority?: number;
  destructive?: boolean;
  disabled?: boolean;
  visible?: boolean | (() => boolean);
  tooltip?: string;
  shortcut?: string;
}

export interface DropdownOption {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  action: () => void;
  disabled?: boolean | (() => boolean);
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