import React, { useEffect } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { Maximize, Minimize } from 'lucide-react';

interface FullscreenControlProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export const FullscreenControl: React.FC<FullscreenControlProps> = ({
  isFullscreen,
  onToggle,
}) => {
  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: isFullscreen ? '#dc3545' : '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    width: '100%',
  };

  return (
    <button
      className="fullscreen-control"
      onClick={onToggle}
      title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Enter Fullscreen (F11)'}
      style={buttonStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isFullscreen ? '#c82333' : '#218838';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isFullscreen ? '#dc3545' : '#28a745';
      }}
    >
      {isFullscreen ? <><Minimize size={16} /> Exit Fullscreen</> : <><Maximize size={16} /> Enter Fullscreen</>}
    </button>
  );
};

export const FullscreenComponent: React.FC = () => {
  const { isFullscreen, toggleFullscreen } = useEditorStore();

  // Handle fullscreen API
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(document.fullscreenElement);
      const storeState = useEditorStore.getState();
      
      if (isCurrentlyFullscreen !== storeState.isFullscreen) {
        storeState.toggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggle = async () => {
    try {
      if (!isFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen API not supported or failed:', error);
      // Fallback: just toggle the store state for CSS-based fullscreen
      toggleFullscreen();
    }
  };

  return (
    <DraggablePanel 
      title="Fullscreen"
      initialPosition={{ x: 980, y: 180 }}
      id="fullscreen-control"
    >
      <FullscreenControl
        isFullscreen={isFullscreen}
        onToggle={handleToggle}
      />
    </DraggablePanel>
  );
};

export const FullscreenPlugin: Plugin = {
  id: 'fullscreen',
  name: 'Fullscreen',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'F11',
      description: 'Toggle Fullscreen',
      action: () => {
        const component = document.querySelector('.fullscreen-control') as HTMLButtonElement;
        component?.click();
      }
    },
    {
      key: 'f',
      modifiers: ['ctrl'],
      description: 'Toggle Fullscreen (Alternative)',
      action: () => {
        const component = document.querySelector('.fullscreen-control') as HTMLButtonElement;
        component?.click();
      }
    }
  ],
  
  ui: [
    {
      id: 'fullscreen-control',
      component: FullscreenComponent,
      position: 'toolbar',
      order: 4
    }
  ]
};
