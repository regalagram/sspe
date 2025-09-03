import React, { useState } from 'react';
import { useTemporalStore } from '../store/useEditorHistory';
import { useEditorStore } from '../store/editorStore';
import { Eye, History } from 'lucide-react';
import { ZundoStateModal } from './ZundoStateModal';
import { UI_CONSTANTS } from '../config/constants';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { useDiffConfig } from '../store/diffConfig';

export const ZundoDebugPanel: React.FC = () => {
  const temporal = useTemporalStore();
  const { config, toggleDiffMode } = useDiffConfig();
  const [selectedStateIndex, setSelectedStateIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(config.mode === 'diff');
  const isMobile = useMobileDetection();
  const iconSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_SIZE;
  const strokeWidth = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_STROKE_WIDTH : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_STROKE_WIDTH;

  const handleToggleDiffMode = () => {
    const newMode = toggleDiffMode();
    setIsDiffMode(newMode === 'diff');
  };

  // Sync with config changes from other sources
  React.useEffect(() => {
    setIsDiffMode(config.mode === 'diff');
  }, [config.mode]);

  const allStates = [
    {
      state: useEditorStore.getState(),
      index: temporal.pastStates.length,
      type: 'present' as const,
      label: 'Present'
    },
    ...temporal.pastStates.map((state: any, index: number) => ({
      state,
      index: temporal.pastStates.length - 1 - index,
      type: 'past' as const,
      label: `Past ${index + 1}`
    })),
    ...temporal.futureStates.map((state: any, index: number) => ({
      state,
      index: temporal.pastStates.length + 1 + index,
      type: 'future' as const,
      label: `Future ${index + 1}`
    }))
  ];

  const handleStateClick = (index: number) => {
    setSelectedStateIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStateIndex(null);
  };

  const selectedState = selectedStateIndex !== null ? allStates[selectedStateIndex] : null;

  return (
    <div className="zundo-debug-panel">
      {/* Summary Table */}
      <div className="p-2 border-b border-gray-200">
        <table className="w-full text-xs">
          <tbody>
            <tr>
              <td className="font-medium text-gray-600 py-1">Past:</td>
              <td className="text-gray-800 py-1">{temporal.pastStates.length}</td>
            </tr>
            <tr>
              <td className="font-medium text-gray-600 py-1">Future:</td>
              <td className="text-gray-800 py-1">{temporal.futureStates.length}</td>
            </tr>
            <tr>
              <td className="font-medium text-gray-600 py-1">Tracking:</td>
              <td className="text-gray-800 py-1">{temporal.isTracking ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="font-medium text-gray-600 py-1">Storage:</td>
              <td className="text-gray-800 py-1">
                <button
                  onPointerDown={handleToggleDiffMode}
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border transition-all duration-150 hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-offset-1 ${
                    isDiffMode 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 focus:ring-emerald-500' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 focus:ring-slate-500'
                  }`}
                  title={`Currently storing ${isDiffMode ? 'only changes (optimized)' : 'full states'}. Click to switch.`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    isDiffMode ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />
                  {isDiffMode ? 'Diff Mode' : 'Full Mode'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* States Table */}
      <div className="p-1 max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1 px-2 font-medium text-gray-600">Type</th>
              <th className="text-left py-1 px-2 font-medium text-gray-600">State</th>
              <th className="text-center py-1 px-2 font-medium text-gray-600">View</th>
            </tr>
          </thead>
          <tbody>
            {allStates.map((stateInfo, index) => (
              <tr
                key={index}
                className={`
                  hover:bg-gray-50 cursor-pointer border-b border-gray-100
                  ${stateInfo.type === 'past' 
                    ? 'bg-blue-50' 
                    : stateInfo.type === 'present'
                    ? 'bg-green-50 font-medium'
                    : 'bg-gray-25'
                  }
                `}
                onPointerDown={() => handleStateClick(index)}
              >
                <td className={`py-1 px-2 ${
                  stateInfo.type === 'past' 
                    ? 'text-blue-700' 
                    : stateInfo.type === 'present'
                    ? 'text-green-700'
                    : 'text-gray-500'
                }`}>
                  {stateInfo.type.charAt(0).toUpperCase() + stateInfo.type.slice(1)}
                </td>
                <td className={`py-1 px-2 ${
                  stateInfo.type === 'past' 
                    ? 'text-blue-700' 
                    : stateInfo.type === 'present'
                    ? 'text-green-700'
                    : 'text-gray-500'
                }`}>
                  {stateInfo.label}
                </td>
                <td className="py-1 px-2 text-center">
                  <Eye size={iconSize * 0.6} strokeWidth={strokeWidth} className="opacity-60" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedState && (
        <ZundoStateModal
          state={selectedState.state}
          stateInfo={selectedState}
          onClose={closeModal}
        />
      )}
    </div>
  );
};