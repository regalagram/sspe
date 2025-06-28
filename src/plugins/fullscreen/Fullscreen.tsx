import React, { useEffect } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';

interface FullscreenControlProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export const FullscreenControl: React.FC<FullscreenControlProps> = ({
  isFullscreen,
  onToggle,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isFullscreen}
          onChange={onToggle}
          style={{ accentColor: '#2196f3', marginRight: 4, cursor: 'pointer' }}
        />
        Fullscreen
      </label>
    </div>
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
