import React from 'react';
import { useEditorStore } from '../store/editorStore';
import { loadPreferences, clearPreferences } from '../utils/persistence';

/**
 * Debug component to test and display persistence functionality
 * Only for development purposes
 */
export const PersistenceDebug: React.FC = () => {
  const { viewport, grid, enabledFeatures } = useEditorStore();
  
  const handleClearPreferences = () => {
    clearPreferences();
    console.log('Preferences cleared. Reload the page to see defaults.');
  };
  
  const handleShowPreferences = () => {
    const prefs = loadPreferences();
    console.log('Current preferences:', prefs);
  };
  
  const currentPrefs = {
    zoom: viewport.zoom,
    gridEnabled: grid.enabled,
    gridSize: grid.size,
    snapToGrid: grid.snapToGrid,
    showControlPoints: enabledFeatures.has('control-points'),
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      padding: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      fontSize: '12px',
      fontFamily: 'monospace',
      borderRadius: '4px',
      zIndex: 10000,
      maxWidth: '300px'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        Persistence Debug
      </div>
      <div style={{ marginBottom: '4px' }}>
        Zoom: {currentPrefs.zoom.toFixed(2)}
      </div>
      <div style={{ marginBottom: '4px' }}>
        Grid: {currentPrefs.gridEnabled ? 'ON' : 'OFF'} (Size: {currentPrefs.gridSize})
      </div>
      <div style={{ marginBottom: '4px' }}>
        Snap to Grid: {currentPrefs.snapToGrid ? 'ON' : 'OFF'}
      </div>
      <div style={{ marginBottom: '8px' }}>
        Control Points: {currentPrefs.showControlPoints ? 'ON' : 'OFF'}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button 
          onClick={handleShowPreferences}
          style={{ 
            fontSize: '10px', 
            padding: '2px 6px',
            background: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          Log Prefs
        </button>
        <button 
          onClick={handleClearPreferences}
          style={{ 
            fontSize: '10px', 
            padding: '2px 6px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};
