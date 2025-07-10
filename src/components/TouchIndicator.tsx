import React from 'react';
import { useEditorStore } from '../store/editorStore';

export const TouchIndicator: React.FC = () => {
  const { enabledFeatures } = useEditorStore();
  const isTouchEnabled = enabledFeatures.has('touch-adapter');
  
  if (!isTouchEnabled) return null;
  
  return (
    <div className="touch-indicator">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74c-3.6-.76-3.54-.75-3.67-.75-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.8 0 1.46-.66 1.46-1.46v-7.17c0-.57-.33-1.09-.84-1.34z"/>
      </svg>
      <span>Touch Mode</span>
    </div>
  );
};