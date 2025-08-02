import React from 'react';
import { Menu } from 'lucide-react';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';

interface SandwichButtonProps {
  // For mobile - pass the bottom sheet toggle function
  onMobileToggle?: () => void;
  isMobileBottomSheetOpen?: boolean;
}

export const SandwichButton: React.FC<SandwichButtonProps> = ({
  onMobileToggle,
  isMobileBottomSheetOpen = false
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;
  
  // Desktop accordion state
  const { accordionVisible, toggleAccordionVisible } = usePanelModeStore();

  const handleClick = () => {
    if (isMobileDevice && onMobileToggle) {
      // Mobile: toggle bottom sheet
      onMobileToggle();
    } else {
      // Desktop: toggle accordion
      toggleAccordionVisible();
    }
  };


  return (
    <>
      <div
        onPointerDown={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          background: 'white',
          fontSize: '12px',
          fontWeight: 600,
          color: '#007acc',
          border: 'none',
          gap: '4px',
          padding: '0 4px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          position: 'relative'
        }}
        title={
          isMobileDevice
            ? (isMobileBottomSheetOpen ? 'Close tools panel' : 'Open tools panel')
            : (accordionVisible ? 'Close sidebar' : 'Open sidebar')
        }
        onPointerEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = '#f3f4f6';
        }}
        onPointerLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'white';
        }}
      >
        <Menu size={16} />
      </div>
    </>
  );
};