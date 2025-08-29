import React, { useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { getSafeTransform } from '../utils/transform-utils';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';
import { initializePlugins } from './PluginInitializer';
import { useCombinedCursor } from '../hooks/useCombinedCursor';
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard';
import { useGlobalPointerEvents } from '../hooks/useGlobalPointerEvents';
import { useEditorStyles } from '../hooks/useEditorStyles';
import { usePluginInitialization } from '../hooks/usePluginInitialization';
import { usePointerEventHandlers } from '../hooks/usePointerEventHandlers';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { usePreventNavGestures } from '../hooks/usePreventNavGestures';
import { pluginManager } from './PluginSystem';
import { AccordionSidebar } from '../plugins/panelmode/AccordionSidebar';
import { SVGDefinitions } from '../components/SVGDefinitions';
import { MobileContainer } from '../components/MobileContainer';
import { Toolbar } from '../components/Toolbar';
import { FloatingToolbarRenderer } from '../components/FloatingToolbar/FloatingToolbarRenderer';
import { PencilFloatingToolbar, CurveFloatingToolbar } from '../components/DrawingFloatingToolbar';
import { MobileTextEditModal } from '../components/MobileTextEditModal';
import { useMobileTextEdit } from '../hooks/useMobileTextEdit';
import { extractGradientsFromPaths, extractGradientsFromImages } from '../utils/gradient-utils';

// Register plugins immediately during module loading

// Initialize plugins during module load
initializePlugins();

export const SvgEditor: React.FC = () => {
  const editorStore = useEditorStore();
  const { isFullscreen, paths, images, gradients: storeGradients, enabledFeatures } = editorStore;
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Mobile text editing
  const { isMobile: isMobileForText, editData, startMobileEdit, handleSave, handleCancel, isModalOpen } = useMobileTextEdit();
  
  // Get panel mode from store
  const { accordionVisible, toggleAccordionVisible, getVisiblePanels } = usePanelModeStore();
  
  // Mobile detection
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;
  
  // Prevent mobile navigation gestures
  usePreventNavGestures();
  
  // State for mobile bottom sheet
  const [mobileBottomSheetOpen, setMobileBottomSheetOpen] = React.useState(false);
  const [mobileToggleFunction, setMobileToggleFunction] = React.useState<(() => void) | null>(null);
  const [mobilePluginSelectFunction, setMobilePluginSelectFunction] = React.useState<((pluginId: string) => void) | null>(null);
  
  // Listen for mobile text edit events
  React.useEffect(() => {
    const handleMobileTextEdit = (event: CustomEvent<{ textId: string }>) => {
      startMobileEdit(event.detail.textId);
    };
    
    window.addEventListener('openMobileTextEdit', handleMobileTextEdit as EventListener);
    return () => {
      window.removeEventListener('openMobileTextEdit', handleMobileTextEdit as EventListener);
    };
  }, [startMobileEdit]);

  // Use refs to prevent callback recreation causing infinite loops
  const mobileToggleFunctionRef = React.useRef<(() => void) | null>(null);
  const mobilePluginSelectFunctionRef = React.useRef<((pluginId: string) => void) | null>(null);

  // Callbacks for mobile bottom sheet - stabilized with refs
  const handleBottomSheetStateChange = React.useCallback((isOpen: boolean) => {
    setMobileBottomSheetOpen(isOpen);
  }, []);

  const handleToggleBottomSheetRef = React.useCallback((toggleFn: () => void) => {
    mobileToggleFunctionRef.current = toggleFn;
    setMobileToggleFunction(() => toggleFn);
  }, []);

  const handlePluginSelectRef = React.useCallback((selectFn: (pluginId: string) => void) => {
    mobilePluginSelectFunctionRef.current = selectFn;
    setMobilePluginSelectFunction(() => selectFn);
  }, []);

  // Function to open Visual Debug panel
  const handleOpenVisualDebugPanel = React.useCallback(() => {
    if (isMobileDevice) {
      // Mobile: Open bottom sheet and select Visual Debug plugin
      if (mobileToggleFunctionRef.current && !mobileBottomSheetOpen) {
        mobileToggleFunctionRef.current();
      }
      if (mobilePluginSelectFunctionRef.current) {
        // Use timeout to ensure bottom sheet is open first
        setTimeout(() => {
          mobilePluginSelectFunctionRef.current?.('visual-debug-controls');
        }, 100);
      }
    } else {
      // Desktop: Open accordion sidebar and expand Visual Debug panel
      if (!accordionVisible) {
        toggleAccordionVisible();
      }
      // Expand the Visual Debug panel specifically
      const { setAccordionExpanded } = usePanelModeStore.getState();
      setAccordionExpanded('visual-debug-controls');
    }
  }, [isMobileDevice, mobileBottomSheetOpen, accordionVisible, toggleAccordionVisible]);

  // Function to open Filter panel
  const handleOpenFilterPanel = React.useCallback(() => {
    if (isMobileDevice) {
      // Mobile: Open bottom sheet and select Filter plugin
      if (mobileToggleFunctionRef.current && !mobileBottomSheetOpen) {
        mobileToggleFunctionRef.current();
      }
      if (mobilePluginSelectFunctionRef.current) {
        // Use timeout to ensure bottom sheet is open first
        setTimeout(() => {
          mobilePluginSelectFunctionRef.current?.('filter-controls');
        }, 100);
      }
    } else {
      // Desktop: Open accordion sidebar and expand Filter panel
      if (!accordionVisible) {
        toggleAccordionVisible();
      }
      // Expand the Filter panel specifically
      const { setAccordionExpanded } = usePanelModeStore.getState();
      setAccordionExpanded('filter-controls');
    }
  }, [isMobileDevice, mobileBottomSheetOpen, accordionVisible, toggleAccordionVisible]);

  // Function to open Animation panel
  const handleOpenAnimationPanel = React.useCallback(() => {
    if (isMobileDevice) {
      // Mobile: Open bottom sheet and select Animation plugin
      if (mobileToggleFunctionRef.current && !mobileBottomSheetOpen) {
        mobileToggleFunctionRef.current();
      }
      if (mobilePluginSelectFunctionRef.current) {
        // Use timeout to ensure bottom sheet is open first
        setTimeout(() => {
          mobilePluginSelectFunctionRef.current?.('animation-controls');
        }, 100);
      }
    } else {
      // Desktop: Open accordion sidebar and expand Animation panel
      if (!accordionVisible) {
        toggleAccordionVisible();
      }
      // Expand the Animation panel specifically
      const { setAccordionExpanded } = usePanelModeStore.getState();
      setAccordionExpanded('animation-controls');
    }
  }, [isMobileDevice, mobileBottomSheetOpen, accordionVisible, toggleAccordionVisible]);

  // Register panel openers with pluginManager
  React.useEffect(() => {
    pluginManager.setPanelOpeners({
      openVisualDebugPanel: handleOpenVisualDebugPanel,
      openFilterPanel: handleOpenFilterPanel,
      openAnimationPanel: handleOpenAnimationPanel,
    });
  }, [handleOpenVisualDebugPanel, handleOpenFilterPanel, handleOpenAnimationPanel]);

  
  // Use custom hooks for cleaner separation of concerns
  const { getCursor } = useCombinedCursor();
  const { editorStyle, svgStyle } = useEditorStyles({ isFullscreen, accordionVisible });

  // Get svg-content plugins - memoize to prevent unnecessary re-renders
  const svgContentPlugins = React.useMemo(() => 
    pluginManager.getEnabledPlugins()
      .flatMap(plugin => plugin.ui || [])
      .filter(ui => ui.position === 'svg-content')
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  , []);

  // Get sidebar panels for mobile/accordion - memoize to prevent unnecessary re-renders
  const sidebarPanels = React.useMemo(() => 
    pluginManager.getEnabledPlugins()
      .flatMap(plugin => plugin.ui || [])
      .filter(ui => ui.position === 'sidebar')
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  , []);

  // Get toolbar panels - memoize to prevent unnecessary re-renders
  const toolbarPanels = React.useMemo(() => 
    pluginManager.getEnabledPlugins()
      .flatMap(plugin => plugin.ui || [])
      .filter(ui => ui.position === 'toolbar')
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  , []);

  // Get all panels for accordion (sidebar + toolbar) - for desktop
  const allPanels = React.useMemo(() => [...sidebarPanels, ...toolbarPanels], [sidebarPanels, toolbarPanels]);
  
  // Initialize global event handlers
  useGlobalKeyboard();
  useGlobalPointerEvents();
  
  // Initialize plugins
  usePluginInitialization(editorStore, svgRef);
  
  // Mouse event handlers
  const { handlePointerDown, handlePointerMove, handlePointerUp, handleWheel } = usePointerEventHandlers();

  // Extract gradients and patterns from paths and images
  const pathGradients = extractGradientsFromPaths(paths);
  const imageGradients = extractGradientsFromImages(images);
  
  // Add predefined gradients for text styling with proper normalized coordinates
  const predefinedGradients = [
    {
      id: 'text-gradient-1',
      type: 'linear' as const,
      x1: 0, y1: 0, x2: 1, y2: 0,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ff6b6b', opacity: 1 },
        { id: 'stop-2', offset: 100, color: '#4ecdc4', opacity: 1 }
      ]
    },
    {
      id: 'text-gradient-2',
      type: 'linear' as const,
      x1: 0, y1: 0, x2: 1, y2: 1,
      stops: [
        { id: 'stop-3', offset: 0, color: '#667eea', opacity: 1 },
        { id: 'stop-4', offset: 100, color: '#764ba2', opacity: 1 }
      ]
    },
    {
      id: 'text-gradient-3',
      type: 'radial' as const,
      cx: 0.5, cy: 0.5, r: 0.5,
      stops: [
        { id: 'stop-5', offset: 0, color: '#ffeaa7', opacity: 1 },
        { id: 'stop-6', offset: 100, color: '#fab1a0', opacity: 1 }
      ]
    }
  ];
  
  // Deduplicate gradients by id to avoid React key conflicts
  const allGradientsArray = [...pathGradients, ...imageGradients, ...predefinedGradients, ...storeGradients];
  const gradients = allGradientsArray.filter((gradient, index, array) => 
    array.findIndex(g => g.id === gradient.id) === index
  );

  // SVG Canvas component
  const svgCanvas = (
    <svg
      key={enabledFeatures?.stickyGuidelinesEnabled ? 'sticky-on' : 'sticky-off'}
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ 
        cursor: getCursor(),
        ...svgStyle
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* SVG Definitions for gradients and patterns */}
      <SVGDefinitions gradients={gradients} />
      
      <g transform={getSafeTransform(editorStore.viewport)}>
        {/* Render SVG content plugins */}
        {svgContentPlugins.map(ui => (
          <ui.component key={ui.id} />
        ))}
      </g>
    </svg>
  );

  // Mobile version with bottom sheet and consolidated toolbar
  if (isMobileDevice) {
    return (
      <div className="svg-editor" style={editorStyle}>
        <MobileContainer
          sidebarPlugins={allPanels} // Use all panels like desktop
          toolbarPlugins={toolbarPanels}
          onBottomSheetStateChange={handleBottomSheetStateChange}
          onToggleBottomSheet={handleToggleBottomSheetRef}
          onPluginSelect={handlePluginSelectRef}
          onOpenVisualDebugPanel={handleOpenVisualDebugPanel}
        >
          {svgCanvas}
        </MobileContainer>
        
        {/* Floating toolbar for contextual actions */}
        <FloatingToolbarRenderer />
        
        {/* Pencil floating toolbar for drawing tools */}
        <PencilFloatingToolbar />
        
        {/* Curve floating toolbar for curve drawing tools */}
        <CurveFloatingToolbar />
        
        {/* Mobile text edit modal */}
        {editData && (
          <MobileTextEditModal
            textId={editData.textId}
            initialContent={editData.content}
            isMultiline={editData.isMultiline}
            onSave={handleSave}
            onCancel={handleCancel}
            isVisible={isModalOpen}
          />
        )}
      </div>
    );
  }

  // Desktop version with accordion sidebar and consolidated toolbar
  return (
    <div className="svg-editor" style={editorStyle}>
      
      {/* Controls toolbar at bottom */}
      <Toolbar 
        toolbarPlugins={toolbarPanels} 
        onOpenVisualDebugPanel={handleOpenVisualDebugPanel}
      />
      
      {svgCanvas}
      
      {/* Floating toolbar for contextual actions */}
      <FloatingToolbarRenderer />
      
      {/* Pencil floating toolbar for drawing tools */}
      <PencilFloatingToolbar />
      
      {/* Curve floating toolbar for curve drawing tools */}
      <CurveFloatingToolbar />
      
      {/* Mobile text edit modal - also available on desktop for consistency */}
      {editData && (
        <MobileTextEditModal
          textId={editData.textId}
          initialContent={editData.content}
          isMultiline={editData.isMultiline}
          onSave={handleSave}
          onCancel={handleCancel}
          isVisible={isModalOpen}
        />
      )}
      
      {/* Render sidebar as accordion */}
      {accordionVisible && <AccordionSidebar plugins={allPanels} />}
    </div>
  );
};
