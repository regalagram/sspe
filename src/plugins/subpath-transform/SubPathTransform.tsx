import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { SubPathTransformControls } from './SubPathTransformControls';

export const SubPathTransformPlugin: Plugin = {
  id: 'subpath-transform',
  name: 'SubPath Transform',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'subpath-transform-controls',
      component: SubPathTransformControls,
      position: 'sidebar',
      order: 20
    }
  ],
  shortcuts: [
    {
      key: 's',
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
    }
  ]
};

export { SubPathTransformControls } from './SubPathTransformControls';
