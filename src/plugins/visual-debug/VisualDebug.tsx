import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getAbsoluteCommandPosition } from '../../utils/path-utils';
import { useMobileDetection, getControlPointSize } from '../../hooks/useMobileDetection';

interface VisualDebugControlsProps {
  commandPointsEnabled: boolean;
  controlPointsEnabled: boolean;
  wireframeEnabled: boolean;
  hidePointsInSelect: boolean;
  showGroupsFrame: boolean;
  onToggleCommandPoints: () => void;
  onToggleControlPoints: () => void;
  onToggleWireframe: () => void;
  onToggleHidePointsInSelect: () => void;
  onToggleShowGroupsFrame: () => void;
}

// Size Controls Component
interface SizeControlsProps {
  globalFactor: number;
  commandPointsFactor: number;
  controlPointsFactor: number;
  transformResizeFactor: number;
  transformRotateFactor: number;
  onGlobalFactorChange: (factor: number) => void;
  onCommandPointsFactorChange: (factor: number) => void;
  onControlPointsFactorChange: (factor: number) => void;
  onTransformResizeFactorChange: (factor: number) => void;
  onTransformRotateFactorChange: (factor: number) => void;
}

export const SizeControls: React.FC<SizeControlsProps> = ({
  globalFactor,
  commandPointsFactor,
  controlPointsFactor,
  transformResizeFactor,
  transformRotateFactor,
  onGlobalFactorChange,
  onCommandPointsFactorChange,
  onControlPointsFactorChange,
  onTransformResizeFactorChange,
  onTransformRotateFactorChange,
}) => {
  const sliderStyle = {
    width: '100%',
    marginTop: '4px',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 'bold' as const,
    marginBottom: '2px',
    color: '#333',
  };

  const valueStyle = {
    fontSize: '10px',
    color: '#666',
    float: 'right' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
        Size Controls
      </div>
      
      {/* Global Factor */}
      <div>
        <div style={labelStyle}>
          Global Factor
          <span style={valueStyle}>{globalFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={globalFactor}
          onChange={(e) => onGlobalFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {/* Command Points Factor */}
      <div>
        <div style={labelStyle}>
          Command Points
          <span style={valueStyle}>{commandPointsFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={commandPointsFactor}
          onChange={(e) => onCommandPointsFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {/* Control Points Factor */}
      <div>
        <div style={labelStyle}>
          Control Points
          <span style={valueStyle}>{controlPointsFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={controlPointsFactor}
          onChange={(e) => onControlPointsFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {/* Transform Resize Factor */}
      <div>
        <div style={labelStyle}>
          Transform Resize
          <span style={valueStyle}>{transformResizeFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={transformResizeFactor}
          onChange={(e) => onTransformResizeFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {/* Transform Rotate Factor */}
      <div>
        <div style={labelStyle}>
          Transform Rotate
          <span style={valueStyle}>{transformRotateFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={transformRotateFactor}
          onChange={(e) => onTransformRotateFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>
    </div>
  );
};

export const VisualDebugControls: React.FC<VisualDebugControlsProps> = ({
  commandPointsEnabled,
  controlPointsEnabled,
  wireframeEnabled,
  hidePointsInSelect,
  showGroupsFrame,
  onToggleCommandPoints,
  onToggleControlPoints,
  onToggleWireframe,
  onToggleHidePointsInSelect,
  onToggleShowGroupsFrame,
}) => {
  const checkboxStyle = {
    cursor: 'pointer',
    accentColor: '#2196f3',
    marginRight: 4
  };

  const labelStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    fontSize: 11,
    cursor: 'pointer' as const
  };

  return (
    <div className="visual-debug-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={commandPointsEnabled}
          onChange={onToggleCommandPoints}
          style={checkboxStyle}
        />
        Show Command Points
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={controlPointsEnabled}
          onChange={onToggleControlPoints}
          style={checkboxStyle}
        />
        Show Control Points
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={wireframeEnabled}
          onChange={onToggleWireframe}
          style={checkboxStyle}
        />
        View Wireframe
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={hidePointsInSelect}
          onChange={onToggleHidePointsInSelect}
          style={checkboxStyle}
        />
        Hide Points In Select
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={showGroupsFrame}
          onChange={onToggleShowGroupsFrame}
          style={checkboxStyle}
        />
        Show Groups Frame
      </label>
    </div>
  );
};

// Command Points Renderer Component
export const CommandPointsRenderer: React.FC = () => {
  const { paths, selection, viewport, enabledFeatures, renderVersion, visualDebugSizes } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();

  if (!paths || paths.length === 0) {
    return null;
  }

  // Check if any sub-path is selected or any command is selected
  const hasSelectedSubPath = selection.selectedSubPaths.length > 0;
  const hasSelectedCommand = selection.selectedCommands.length > 0;

  // Show if feature is enabled OR if any sub-path is selected OR if any command is selected
  const shouldShow = enabledFeatures.commandPointsEnabled || hasSelectedSubPath || hasSelectedCommand;

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {paths.map((path) => 
        path.subPaths.map((subPath) => {
          // No mostrar puntos para subpaths bloqueados
          if (subPath.locked) return null;
          const isSubPathSelected = selection.selectedSubPaths.includes(subPath.id);
          // Si hidePointsInSelect está activo y el subpath está seleccionado, no mostrar puntos
          if (enabledFeatures.hidePointsInSelect && isSubPathSelected) return null;
          const shouldShowSubPath = enabledFeatures.commandPointsEnabled || isSubPathSelected;
          return subPath.commands.map((command) => {
            const position = getAbsoluteCommandPosition(command, subPath, path.subPaths);
            if (!position) return null;
            const isCommandSelected = selection.selectedCommands.includes(command.id);
            // Si hidePointsInSelect está activo y el comando está seleccionado, no mostrar punto
            if (enabledFeatures.hidePointsInSelect && isCommandSelected) return null;
            const shouldShowCommand = shouldShowSubPath || isCommandSelected;
            if (!shouldShowCommand) return null;
            const baseRadius = getControlPointSize(isMobile, isTablet);
            const radius = (baseRadius * visualDebugSizes.globalFactor * visualDebugSizes.commandPointsFactor) / viewport.zoom;
            return (
              <circle
                key={`command-${command.id}-v${renderVersion}`}
                cx={position.x}
                cy={position.y}
                r={radius}
                fill={isCommandSelected ? '#007acc' : '#ff4444'}
                stroke={isCommandSelected ? '#005299' : '#cc0000'}
                strokeWidth={1 / viewport.zoom}
                style={{ 
                  cursor: 'grab',
                  pointerEvents: 'all',
                  opacity: 0.9
                }}
                data-command-id={command.id}
              />
            );
          });
        })
      )}
    </>
  );
};



// Main Visual Debug Component
export const VisualDebugComponent: React.FC = () => {
  const { 
    enabledFeatures, 
    toggleFeature, 
    visualDebugSizes,
    setVisualDebugGlobalFactor,
    setVisualDebugCommandPointsFactor,
    setVisualDebugControlPointsFactor,
    setVisualDebugTransformResizeFactor,
    setVisualDebugTransformRotateFactor
  } = useEditorStore();
  const handleClearLocalStorage = () => {
    if (window.confirm('¿Seguro que quieres borrar todos los datos locales de la app?')) {
      localStorage.clear();
      window.location.reload();
    }
  };
  return (
    <div>
      <VisualDebugControls
        commandPointsEnabled={enabledFeatures.commandPointsEnabled}
        controlPointsEnabled={enabledFeatures.controlPointsEnabled}
        wireframeEnabled={enabledFeatures.wireframeEnabled}
        hidePointsInSelect={enabledFeatures.hidePointsInSelect ?? false}
        showGroupsFrame={enabledFeatures.showGroupsFrame ?? false}
        onToggleCommandPoints={() => toggleFeature('commandPointsEnabled')}
        onToggleControlPoints={() => toggleFeature('controlPointsEnabled')}
        onToggleWireframe={() => toggleFeature('wireframeEnabled')}
        onToggleHidePointsInSelect={() => toggleFeature('hidePointsInSelect')}
        onToggleShowGroupsFrame={() => toggleFeature('showGroupsFrame')}
      />
      <SizeControls
        globalFactor={visualDebugSizes.globalFactor}
        commandPointsFactor={visualDebugSizes.commandPointsFactor}
        controlPointsFactor={visualDebugSizes.controlPointsFactor}
        transformResizeFactor={visualDebugSizes.transformResizeFactor}
        transformRotateFactor={visualDebugSizes.transformRotateFactor}
        onGlobalFactorChange={setVisualDebugGlobalFactor}
        onCommandPointsFactorChange={setVisualDebugCommandPointsFactor}
        onControlPointsFactorChange={setVisualDebugControlPointsFactor}
        onTransformResizeFactorChange={setVisualDebugTransformResizeFactor}
        onTransformRotateFactorChange={setVisualDebugTransformRotateFactor}
      />
      <button
        style={{
          marginTop: '24px',
          padding: '8px 12px',
          background: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer',
          width: '100%'
        }}
        onClick={handleClearLocalStorage}
      >
        Borrar LocalStorage
      </button>
    </div>
  );
};

export const VisualDebugPlugin: Plugin = {
  id: 'visual-debug',
  name: 'Visual Debug',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'c',
      modifiers: ['ctrl'],
      description: 'Toggle Command Points',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('command-points');
      }
    },
    {
      key: 'p',
      modifiers: ['ctrl'],
      description: 'Toggle Control Points',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('control-points');
      }
    },
    {
      key: 'w',
      modifiers: ['ctrl'],
      description: 'Toggle Wireframe Mode',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('wireframeEnabled');
      }
    }
  ],
  
  ui: [
    {
      id: 'visual-debug-controls',
      component: VisualDebugComponent,
      position: 'sidebar',
      order: 3
    },
    {
      id: 'command-points-renderer',
      component: CommandPointsRenderer,
      position: 'svg-content',
      order: 30, // Render on top of paths but below control points
    }
  ]
};
