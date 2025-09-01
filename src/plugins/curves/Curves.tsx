import { Plugin } from '../../core/PluginSystem';
import { curvesManager } from './CurvesManager';
import { CurvesRenderer } from './CurvesRenderer';
import { CurvesUI } from './CurvesUI';
import { toolModeManager } from '../../core/ToolModeManager';

export const CurvesPlugin: Plugin = {
  id: 'curves',
  name: 'Curves',
  version: '1.0.0',
  enabled: true,
  dependencies: ['pointer-interaction'],
  
  initialize: (editor) => {
    curvesManager.setEditorStore(editor);
  },
  
  pointerHandlers: {
    onPointerDown: curvesManager.handlePointerDown,
    onPointerMove: curvesManager.handlePointerMove,
    onPointerUp: curvesManager.handlePointerUp,
  },
  
  shortcuts: [
    {
      key: 'Escape',
      description: 'Exit Curve Tool',
      action: () => {
        toolModeManager.setMode('select');
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
