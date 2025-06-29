import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { PointTransformControls } from './PointTransformControls';

export const PointTransformPlugin: Plugin = {
  id: 'point-transform',
  name: 'Point Transform',
  version: '1.0.0',
  enabled: true,
  dependencies: ['selection-tools'],
  ui: [
    {
      id: 'point-transform-controls',
      component: PointTransformControls,
      position: 'sidebar',
      order: 16
    }
  ],
  shortcuts: [
    {
      key: 'l',
      modifiers: ['ctrl', 'shift'],
      description: 'Convert selected commands to Line To (L)',
      action: () => {
        const event = new CustomEvent('point-transform-to-line');
        document.dispatchEvent(event);
      },
    },
    {
      key: 'c',
      modifiers: ['ctrl', 'shift'],
      description: 'Convert selected commands to Cubic Bézier (C)',
      action: () => {
        const event = new CustomEvent('point-transform-to-curve');
        document.dispatchEvent(event);
      },
    },
  ],
};
