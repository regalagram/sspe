import React, { useState } from 'react';
import { useEditorStore } from '../store/editorStore';

export const SimpleHistoryTest: React.FC = () => {
  const [testValue, setTestValue] = useState(0);
  const editorStore = useEditorStore();

  const handlePushToHistory = () => {
    console.log('🧪 Test: Calling pushToHistory manually');
    editorStore.pushToHistory();
    setTestValue(prev => prev + 1);
  };

  const handleModifyState = () => {
    console.log('🧪 Test: Modifying state without pushToHistory');
    editorStore.setPrecision(Math.floor(Math.random() * 5) + 1);
    setTestValue(prev => prev + 1);
  };

  const handleUndo = () => {
    console.log('🧪 Test: Calling undo');
    editorStore.undo();
  };

  const handleRedo = () => {
    console.log('🧪 Test: Calling redo');
    editorStore.redo();
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px', 
      borderRadius: '5px',
      zIndex: 10000
    }}>
      <h4>History Test Panel</h4>
      <div style={{ marginBottom: '10px' }}>
        <p>Test Value: {testValue}</p>
        <p>Current Precision: {editorStore.precision}</p>
        <p>Can Undo: {editorStore.canUndo ? 'Yes' : 'No'}</p>
        <p>Can Redo: {editorStore.canRedo ? 'Yes' : 'No'}</p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button onClick={handlePushToHistory}>
          Push to History (Manual)
        </button>
        <button onClick={handleModifyState}>
          Modify State (calls pushToHistory)
        </button>
        <button onClick={handleUndo} disabled={!editorStore.canUndo}>
          Undo
        </button>
        <button onClick={handleRedo} disabled={!editorStore.canRedo}>
          Redo
        </button>
      </div>
    </div>
  );
};
