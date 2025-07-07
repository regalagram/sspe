import { Plugin } from '../../core/PluginSystem';
import { curvesManager } from './CurvesManager';
import { CurvesRenderer } from './CurvesRenderer';
import { CurvesUI } from './CurvesUI';
import { toolModeManager } from '../../managers/ToolModeManager';

export const CurvesPlugin: Plugin = {
  id: 'curves',
  name: 'Curves',
  version: '1.0.0',
  enabled: true,
  dependencies: ['mouse-interaction'],
  
  initialize: (editor) => {
    curvesManager.setEditorStore(editor);
  },
  
  mouseHandlers: {
    onMouseDown: curvesManager.handleMouseDown,
    onMouseMove: curvesManager.handleMouseMove,
    onMouseUp: curvesManager.handleMouseUp,
  },
  
  shortcuts: [
    {
      key: 'c',
      description: 'Curve Tool',
      action: () => {
        toolModeManager.setMode('curves');
      }
    },
    {
      key: 'b',
      description: 'Bézier Curve Tool',
      action: () => {
        toolModeManager.setMode('curves');
      }
    },
    {
      key: 'Escape',
      description: 'Exit Curve Tool',
      action: () => {
        if (toolModeManager.isActive('curves')) {
          toolModeManager.setMode('select');
        }
      }
    },
    {
      key: 'Enter',
      description: 'Finish Path',
      action: () => {
        curvesManager.manualFinishPath();
      }
    }
  ],
  
  ui: [
    {
      id: 'curves-ui',
      component: CurvesUI,
      position: 'sidebar',
      order: 1,
    },
    {
      id: 'curves-renderer',
      component: CurvesRenderer,
      position: 'svg-content',
      order: 0,
    }
  ],
};
