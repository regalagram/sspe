import { useEditorStore } from './editorStore';
import { getCurrentDiffConfig } from './diffConfig';

/**
 * Hook que proporciona acciones para debugging del sistema de historial
 */
export const useHistoryDebugActions = () => {
  const clearHistory = () => {
    const temporal = useEditorStore.temporal.getState();
    temporal.clear();
    console.log('🧹 History cleared');
  };

  const toggleTracking = () => {
    const temporal = useEditorStore.temporal.getState();
    if (temporal.isTracking) {
      temporal.pause();
      console.log('⏸️ History tracking paused');
    } else {
      temporal.resume();
      console.log('▶️ History tracking resumed');
    }
  };

  const forceHistoryEntry = () => {
    // Trigger a minimal state change to force a history entry
    useEditorStore.setState((state) => ({
      ...state,
      renderVersion: (state.renderVersion || 0) + 1
    }));
    console.log('🔄 Forced history entry');
  };

  const simulateHeavyOperation = () => {
    console.log('🔥 Simulating heavy operation...');
    
    // Create a large temporary array to simulate memory usage
    const heavyData = new Array(100000).fill(0).map((_, i) => ({
      id: i,
      data: `Heavy data item ${i}`,
      metadata: {
        timestamp: Date.now(),
        processed: Math.random() > 0.5,
        values: new Array(10).fill(0).map(() => Math.random())
      }
    }));

    // Add to state temporarily
    useEditorStore.setState((state) => ({
      ...state,
      // @ts-ignore - Adding temporary heavy data for testing
      tempHeavyData: heavyData,
      renderVersion: (state.renderVersion || 0) + 1
    }));

    // Remove after a short delay
    setTimeout(() => {
      useEditorStore.setState((state) => {
        const { tempHeavyData, ...rest } = state as any;
        return {
          ...rest,
          renderVersion: (rest.renderVersion || 0) + 1
        };
      });
      console.log('🧹 Heavy operation completed, data cleaned');
    }, 2000);
  };

  const inspectDiffMode = () => {
    const diffConfig = getCurrentDiffConfig();
    const temporal = useEditorStore.temporal.getState();
    
    console.group('🔍 Zundo Diff Mode Inspection');
    console.log('📦 Current diff config:', diffConfig);
    console.log('📊 History stats:', {
      pastStates: temporal.pastStates.length,
      futureStates: temporal.futureStates.length,
      isTracking: temporal.isTracking
    });
    
    // Analyze recent states to show diff effectiveness
    if (temporal.pastStates.length > 0) {
      const recentStates = temporal.pastStates.slice(-3);
      console.log('🔍 Recent states analysis:');
      
      recentStates.forEach((state, index) => {
        const stateSize = JSON.stringify(state).length;
        console.log(`  State ${index}: ${(stateSize / 1024).toFixed(2)} KB`);
        
        if (diffConfig.mode === 'diff' && Object.keys(state).length < 10) {
          console.log(`    🎯 Diff mode: only ${Object.keys(state).length} fields stored`);
          console.log(`    📝 Changed fields:`, Object.keys(state));
        }
      });
    }
    
    console.groupEnd();
  };

  return {
    clearHistory,
    toggleTracking,
    forceHistoryEntry,
    simulateHeavyOperation,
    inspectDiffMode
  };
};
