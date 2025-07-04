import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { bezierNormalizeManager } from './BezierNormalizeManager';
import { BezierNormalizeControls } from './BezierNormalizeUI';

// Plugin component wrapper
const BezierNormalizeComponent: React.FC = () => {
  return <BezierNormalizeControls />;
};

// Plugin definition
export const BezierNormalizePlugin: Plugin = {
  id: 'bezier-normalize',
  name: 'Normalizar Curvas Bézier',
  version: '1.0.0',
  enabled: true,
  
  initialize: (editor) => {
    bezierNormalizeManager.setEditorStore(editor);
  },
  
  ui: [
    {
      id: 'bezier-normalize-controls',
      component: BezierNormalizeComponent,
      position: 'sidebar',
      order: 400
    }
  ],
  
  shortcuts: [
    {
      key: 'n',
      modifiers: ['shift'],
      description: 'Normalizar curvas Bézier',
      action: () => {
        // Get current analysis
        const pointInfo = bezierNormalizeManager.analyzeSelectedPoint();
        if (!pointInfo) return;
        
        const actions = bezierNormalizeManager.getAvailableActions(pointInfo);
        if (actions.length === 0) return;
        
        // Execute first available action
        bezierNormalizeManager.executeAction(actions[0]);
      }
    }
  ],
  
  handleKeyDown: (e: KeyboardEvent) => {
    bezierNormalizeManager.handleKeyDown(e);
    return false; // Let other plugins handle the event too
  },
  
  handleKeyUp: (e: KeyboardEvent) => {
    bezierNormalizeManager.handleKeyUp(e);
    return false; // Let other plugins handle the event too
  }
};
