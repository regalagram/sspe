import React, { useRef } from 'react';
import { ArrowDownUp, Trash2, Upload, Download } from 'lucide-react';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useToolbarStore } from '../store/toolbarStore';
import { useEditorStore } from '../store/editorStore';
import { generateSVGCode } from '../utils/svg-export';
import { parseCompleteSVG } from '../utils/svg-parser';
import { generateId } from '../utils/id-utils';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { UI_CONSTANTS } from '../config/constants';

export const FileActionsButton: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const { 
    isFileActionsSubmenuOpen, 
    setFileActionsSubmenuOpen 
  } = useToolbarStore();
  
  const { 
    paths, 
    texts, 
    textPaths, 
    groups, 
    gradients, 
    images, 
    symbols, 
    markers, 
    clipPaths, 
    masks, 
    filters, 
    uses,
    animations,
    replacePaths,
    replaceTexts,
    replaceTextPaths,
    replaceGroups,
    replaceImages,
    clearAllTexts,
    clearAllTextPaths,
    clearGradients,
    clearAllSVGElements,
    resetViewportCompletely,
    calculateChainDelays,
    setGradients,
    addText,
    addGradient,
    addImage,
    addSymbol,
    addMarker,
    addClipPath,
    addMask,
    addFilter,
    addUse,
    addAnimation,
    removeAnimation,
    createAnimationChain
  } = useEditorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear All functionality - matches SVGEditor.tsx
  const handleClearAll = () => {
    replacePaths([]);
    clearAllTexts();
    clearAllTextPaths(); // Also clear textPaths to prevent orphaned references
    clearGradients();
    replaceGroups([]);
    clearAllSVGElements();
    resetViewportCompletely();
    
    // Close submenu after action
    setFileActionsSubmenuOpen(false);
  };

  // Upload functionality - matches SVGEditor.tsx
  const handleUpload = () => {
    fileInputRef.current?.click();
    setFileActionsSubmenuOpen(false);
  };

  // Complete SVG import functionality from svg-editor plugin
  const handleSVGImport = (svgCode: string) => {
    try {
      // Validate SVG before parsing
      if (!svgCode.trim()) {
        alert('SVG code is empty.');
        return;
      }
      
      if (!svgCode.includes('<svg')) {
        alert('Invalid SVG: Missing <svg> tag.');
        return;
      }

      // Parse the complete SVG including paths, texts, textPaths, images, gradients, patterns, filters, groups, and animations
      const { 
        paths: newPaths, 
        texts: newTexts, 
        textPaths: newTextPaths, 
        images: newImages, 
        gradients: newGradients, 
        filters: newFilters, 
        groups: newGroups, 
        animations: newAnimations, 
        animationChains: newAnimationChains 
      } = parseCompleteSVG(svgCode);
      
      // Create a mapping of original filter IDs to new IDs for reference updates
      const filterIdMapping: Record<string, string> = {};
      
      // Helper function to update filter references in elements
      const updateFilterReferences = <T extends { style?: { filter?: string } }>(elements: T[]): T[] => {
        return elements.map(element => {
          if (element.style?.filter) {
            // Extract filter ID from url(#filterId) format
            const match = element.style.filter.match(/^url\(#(.+)\)$/);
            if (match && match[1]) {
              const originalId = match[1];
              const newId = filterIdMapping[originalId];
              if (newId) {
                return {
                  ...element,
                  style: {
                    ...element.style,
                    filter: `url(#${newId})`
                  }
                };
              }
            }
          }
          return element;
        });
      };
      
      const totalElements = newPaths.length + newTexts.length + newTextPaths.length + newGradients.length + newFilters.length + newGroups.length + newAnimations.length;
      
      if (totalElements === 0) {
        alert('No valid elements found in the SVG code. Make sure your SVG contains paths, text, textPaths, gradients, patterns, or groups.');
        return;
      }

      // Clear existing content (replace mode)
      replacePaths([]);
      clearAllTexts();
      clearAllTextPaths(); // Also clear textPaths to prevent orphaned references
      clearGradients();
      replaceGroups([]);
      replaceImages([]);
      clearAllSVGElements();

      // Import all elements
      if (newPaths.length > 0) {
        replacePaths(newPaths);
      }

      if (newTexts.length > 0) {
        // Replace all texts with the imported ones (since we cleared before)
        replaceTexts(newTexts);
      }

      if (newTextPaths.length > 0) {
        replaceTextPaths(newTextPaths);
      }

      if (newImages.length > 0) {
        replaceImages(newImages);
      }

      if (newGradients.length > 0) {
        setGradients(newGradients);
      }

      if (newFilters.length > 0) {
        newFilters.forEach(filter => {
          const newFilterId = generateId();
          filterIdMapping[filter.id] = newFilterId;
          const { id, ...filterWithoutId } = filter;
          addFilter(filterWithoutId);
        });
      }

      if (newGroups.length > 0) {
        replaceGroups(newGroups);
      }

      // Import animations
      if (newAnimations.length > 0) {
        newAnimations.forEach(animation => addAnimation(animation));
      }

      // Create animation chains if they exist
      if (newAnimationChains && newAnimationChains.length > 0) {
        newAnimationChains.forEach(chain => {
          createAnimationChain(chain.animations, chain.delay);
        });
      }

      // Update filter references in all elements
      const updatedPaths = updateFilterReferences(newPaths);
      const updatedTexts = updateFilterReferences(newTexts);
      const updatedTextPaths = updateFilterReferences(newTextPaths);
      const updatedImages = updateFilterReferences(newImages);

      if (updatedPaths !== newPaths) replacePaths(updatedPaths);
      
    } catch (error) {
      console.error('Error parsing SVG:', error);
      alert(`Error parsing SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
      alert('Please select a valid SVG file.');
      return;
    }

    try {
      const svgContent = await file.text();
      handleSVGImport(svgContent);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading the file.');
    }

    // Clear the input so the same file can be selected again
    event.target.value = '';
  };

  // Download functionality - matches SVGEditor.tsx
  const handleDownload = () => {
    // Check if there's content to download
    const hasContent = paths.length > 0 || texts.length > 0 || groups.length > 0 || images.length > 0;
    
    if (!hasContent) {
      return;
    }

    // Use the unified SVG export function
    const editorState = { 
      paths, 
      texts, 
      textPaths, 
      groups, 
      gradients, 
      images, 
      symbols, 
      markers, 
      clipPaths, 
      masks, 
      filters, 
      uses,
      animations,
      calculateChainDelays
    };
    
    const svgContent = generateSVGCode(editorState);

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drawing.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setFileActionsSubmenuOpen(false);
  };

  // Check if download should be disabled
  const hasContent = paths.length > 0 || texts.length > 0 || groups.length > 0 || images.length > 0;

  // Match other toolbar buttons sizing
  const buttonSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_BUTTON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_BUTTON_SIZE;
  const iconSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_SIZE;
  const strokeWidth = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_STROKE_WIDTH : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_STROKE_WIDTH;

  return (
    <>
      <style>
        {`
          .file-actions-button:hover {
            background: ${isFileActionsSubmenuOpen ? '#f3f4f6' : '#f3f4f6'} !important;
          }
        `}
      </style>
      <ToolbarSubmenu
        trigger={
          <div 
            className="file-actions-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${buttonSize}px`,
              height: `${buttonSize}px`,
              background: isFileActionsSubmenuOpen ? '#f3f4f6' : 'white',
              fontSize: '12px',
              fontWeight: 600,
              color: '#374151',
              border: 'none',
              borderRadius: '0px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              position: 'relative',
              opacity: 1,
              touchAction: 'manipulation'
            }}
            title="File Actions"
          >
            <ArrowDownUp size={iconSize} strokeWidth={strokeWidth} />
          </div>
        }
        isOpen={isFileActionsSubmenuOpen}
        onToggle={() => setFileActionsSubmenuOpen(!isFileActionsSubmenuOpen)}
        position="top"
      >
        <SubmenuItem
          icon={<Upload size={16} strokeWidth={strokeWidth} />}
          label="Upload"
          onClick={handleUpload}
        />
        <SubmenuItem
          icon={<Download size={16} strokeWidth={strokeWidth} />}
          label="Download"
          onClick={handleDownload}
          disabled={!hasContent}
        />
        <SubmenuItem
          icon={<Trash2 size={16} strokeWidth={strokeWidth} />}
          label="Clear All"
          onClick={handleClearAll}
        />
      </ToolbarSubmenu>
      
      {/* Hidden file input for upload functionality */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </>
  );
};