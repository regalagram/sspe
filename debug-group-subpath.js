// Debug script to understand group subpath drag behavior
// Run this in browser console to understand the issue

function debugGroupSubpathDrag() {
  console.log('=== DEBUG: Group Subpath Drag Issue ===');
  
  // Get current editor state
  const store = window.useEditorStore?.getState?.();
  if (!store) {
    console.log('Error: Cannot access editor store');
    return;
  }
  
  console.log('Current selection:', {
    selectedGroups: store.selection.selectedGroups,
    selectedSubPaths: store.selection.selectedSubPaths,
    selectedImages: store.selection.selectedImages,
    selectedTexts: store.selection.selectedTexts,
    selectedUses: store.selection.selectedUses
  });
  
  console.log('Grid settings:', {
    snapToGrid: store.grid.snapToGrid,
    gridSize: store.grid.size
  });
  
  // Check if there are groups with mixed content
  store.groups.forEach(group => {
    console.log(`Group ${group.id}:`, {
      children: group.children,
      transform: group.transform,
      isSelected: store.selection.selectedGroups.includes(group.id)
    });
    
    // Check which paths belong to this group
    const groupPaths = group.children.filter(child => child.type === 'path');
    groupPaths.forEach(pathChild => {
      const path = store.paths.find(p => p.id === pathChild.id);
      if (path) {
        console.log(`  Path ${path.id} in group:`, {
          subPaths: path.subPaths.map(sp => ({
            id: sp.id,
            isSelected: store.selection.selectedSubPaths.includes(sp.id),
            commandCount: sp.commands.length
          }))
        });
      }
    });
  });
  
  // Function to test drag capture
  window.testDragCapture = () => {
    const captureAll = window.captureAllSelectedElementsPositions;
    if (captureAll) {
      const captured = captureAll();
      console.log('Captured elements for drag:', captured);
      return captured;
    } else {
      console.log('Error: captureAllSelectedElementsPositions not available');
    }
  };
  
  console.log('Run testDragCapture() to see what elements would be captured for dragging');
}

// Make it available globally
window.debugGroupSubpathDrag = debugGroupSubpathDrag;

console.log('Debug script loaded. Run debugGroupSubpathDrag() to analyze the issue.');
