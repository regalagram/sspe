import React from 'react';
import ReactDOM from 'react-dom/client';
import { SvgEditor } from './core/SvgEditor';
import './styles/editor.css';
import { toolModeManager } from './managers/ToolModeManager';
import { shapeManager } from './plugins/shapes/ShapeManager';

// Hacer toolModeManager y shapeManager disponibles globalmente para debugging
(window as any).toolModeManager = toolModeManager;
(window as any).shapeManager = shapeManager;

const App = () => {
  return <SvgEditor />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
