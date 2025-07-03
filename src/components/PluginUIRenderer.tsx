import React from 'react';
import { usePluginUI } from '../hooks/usePluginUI';
import { AccordionSidebar } from '../plugins/panelmode/AccordionSidebar';

interface PluginUIRendererProps {
  position: string;
}

/**
 * Component for rendering plugin UI based on position and mode
 * Following the position-based UI system principle from README.md
 */
export const PluginUIRenderer: React.FC<PluginUIRendererProps> = ({ position }) => {
  const { getPluginUIConfig } = usePluginUI();
  const config = getPluginUIConfig(position);

  if (config.type === 'hidden') {
    return null;
  }

  if (config.type === 'accordion') {
    return <AccordionSidebar plugins={config.plugins} />;
  }

  // Default plugins rendering
  return (
    <>
      {config.plugins.map(ui => (
        <ui.component key={ui.id} />
      ))}
    </>
  );
};
