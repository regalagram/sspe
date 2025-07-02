import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { SubPathTransformControls } from './SubPathTransformControls';

export const SubPathTransformPlugin: Plugin = {
  id: 'subpath-transform',
  name: 'Transform & Modify',
  version: '1.0.0',
  enabled: true,
  dependencies: ['selection'],
  ui: [
    {
      id: 'subpath-transform-controls',
      component: SubPathTransformControls,
      position: 'sidebar',
      order: 15
    }
  ],
  shortcuts: [
    {
      key: 's',
      modifiers: ['ctrl', 'shift'],
      description: 'Apply smoothing to selected commands/subpaths',
      action: () => {
        // Trigger smoothing
        const event = new CustomEvent('path-smoothing-trigger');
        document.dispatchEvent(event);
      },
    },
    {
      key: 'i',
      modifiers: ['ctrl'],
      description: 'Apply simplification to selected commands/subpaths',
      action: () => {
        // Trigger simplification
        const event = new CustomEvent('path-simplification-trigger');
        document.dispatchEvent(event);
      },
    },
    {
      key: 't',
      modifiers: ['ctrl', 'shift'],
      description: 'Focus translate input',
      action: () => {
        // Focus on the first translate input field
        const translateInputs = document.querySelectorAll('#subpath-transform input[type="number"]');
        const translateInput = Array.from(translateInputs).find(input => {
          const label = input.previousElementSibling;
          return label?.textContent?.includes('Translate X');
        }) as HTMLInputElement;
        if (translateInput) {
          translateInput.focus();
          translateInput.select();
        }
      }
    },
    {
      key: 'r',
      modifiers: ['ctrl', 'shift'],
      description: 'Focus rotation input',
      action: () => {
        // Focus on the rotation input field
        const rotationInputs = document.querySelectorAll('#subpath-transform input[type="number"]');
        const rotationInput = Array.from(rotationInputs).find(input => {
          const label = input.previousElementSibling;
          return label?.textContent?.includes('Angle');
        }) as HTMLInputElement;
        if (rotationInput) {
          rotationInput.focus();
          rotationInput.select();
        }
      }
    },
    {
      key: 'e',
      modifiers: ['ctrl', 'shift'],
      description: 'Focus scale input',
      action: () => {
        // Focus on the first scale input field
        const scaleInput = document.querySelector('#subpath-transform input[type="number"]') as HTMLInputElement;
        if (scaleInput) {
          scaleInput.focus();
          scaleInput.select();
        }
      }
    },
    {
      key: 'h',
      modifiers: ['ctrl', 'shift'],
      description: 'Mirror horizontally',
      action: () => {
        // Trigger horizontal mirror
        const event = new CustomEvent('mirror-horizontal-trigger');
        document.dispatchEvent(event);
      }
    },
    {
      key: 'v',
      modifiers: ['ctrl', 'shift'],
      description: 'Mirror vertically',
      action: () => {
        // Trigger vertical mirror
        const event = new CustomEvent('mirror-vertical-trigger');
        document.dispatchEvent(event);
      }
    }
  ]
};

export { SubPathTransformControls } from './SubPathTransformControls';
