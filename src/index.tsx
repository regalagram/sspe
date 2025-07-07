import React from 'react';
import ReactDOM from 'react-dom/client';
import { SvgEditor } from './core/SvgEditor';
import './styles/editor.css';
import { toolModeManager } from './managers/ToolModeManager';

// Hacer toolModeManager disponible globalmente para debugging
(window as any).toolModeManager = toolModeManager;

const App = () => {
  return <SvgEditor />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
