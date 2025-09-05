import React, { useState } from 'react';
import { useEditorHistory } from '../store/useEditorHistory';
import { SimpleHistoryDebugPanel } from './SimpleHistoryDebugPanel';

interface ZundoDebugPanelProps {
  onClose?: () => void;
}

export const ZundoDebugPanel: React.FC<ZundoDebugPanelProps> = ({ onClose }) => {
  const { canUndo, canRedo, undo, redo } = useEditorHistory();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="zundo-debug-panel bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">History Debug Panel</h3>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          className={`px-3 py-1 rounded ${
            canUndo
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Undo
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo}
          className={`px-3 py-1 rounded ${
            canRedo
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Redo
        </button>
      </div>

      <SimpleHistoryDebugPanel isOpen={isOpen} onClose={handleClose} />
    </div>
  );
};
