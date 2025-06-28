import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { convertSubPathCoordinates, convertPathCoordinates, convertSubPathCoordinatesInContext, getSubPathFinalPosition, isRelativeCommand } from '../../utils/relative-utils';
import { SVGSubPath, SVGCommand, Point } from '../../types';
import { MapPin, Link } from 'lucide-react';

interface RelativeToolsProps {
  selectedSubPaths: string[];
  onConvertToAbsolute: (subPathIds: string[]) => void;
  onConvertToRelative: (subPathIds: string[]) => void;
}

export const RelativeTools: React.FC<RelativeToolsProps> = ({
  selectedSubPaths,
  onConvertToAbsolute,
  onConvertToRelative,
}) => {
  const hasSelection = selectedSubPaths.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {!hasSelection && (
        <div style={{ 
          fontSize: '12px', 
          color: '#999',
          fontStyle: 'italic',
          padding: '8px',
          background: '#f8f9fa',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          Select a sub-path
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => onConvertToAbsolute(selectedSubPaths)}
          disabled={!hasSelection}
          style={{
            padding: '10px 16px',
            background: hasSelection ? '#28a745' : '#e9ecef',
            color: hasSelection ? 'white' : '#6c757d',
            border: 'none',
            borderRadius: '6px',
            cursor: hasSelection ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            if (hasSelection) {
              e.currentTarget.style.background = '#218838';
            }
          }}
          onMouseLeave={(e) => {
            if (hasSelection) {
              e.currentTarget.style.background = '#28a745';
            }
          }}
        >
          <MapPin size={16} />
          Absolute
        </button>
        
        <button
          onClick={() => onConvertToRelative(selectedSubPaths)}
          disabled={!hasSelection}
          style={{
            padding: '10px 16px',
            background: hasSelection ? '#007bff' : '#e9ecef',
            color: hasSelection ? 'white' : '#6c757d',
            border: 'none',
            borderRadius: '6px',
            cursor: hasSelection ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            if (hasSelection) {
              e.currentTarget.style.background = '#0056b3';
            }
          }}
          onMouseLeave={(e) => {
            if (hasSelection) {
              e.currentTarget.style.background = '#007bff';
            }
          }}
        >
          <Link size={16} />
          Relative
        </button>
      </div>
    </div>
  );
};

export const RelativeToolsComponent: React.FC = () => {
  const { 
    paths, 
    selection, 
    pushToHistory,
    forceRender
  } = useEditorStore();

  const updateSubPathCommands = (pathId: string, subPathId: string, newCommands: SVGCommand[]) => {
    const state = useEditorStore.getState();
    
    // Update the paths state directly
    useEditorStore.setState({
      paths: state.paths.map(path => 
        path.id === pathId 
          ? {
              ...path,
              subPaths: path.subPaths.map(subPath =>
                subPath.id === subPathId
                  ? { ...subPath, commands: newCommands }
                  : subPath
              )
            }
          : path
      )
    });
  };

  const handleConvertToAbsolute = (subPathIds: string[]) => {
    if (subPathIds.length === 0) return;

    pushToHistory();

    // Group subpaths by path to handle conversion in context
    const pathGroups = new Map<string, string[]>();
    
    subPathIds.forEach(subPathId => {
      for (const path of paths) {
        const subPath = path.subPaths.find(sp => sp.id === subPathId);
        if (subPath) {
          if (!pathGroups.has(path.id)) {
            pathGroups.set(path.id, []);
          }
          pathGroups.get(path.id)!.push(subPathId);
          break;
        }
      }
    });

    // Convert each path group
    pathGroups.forEach((subPathIdsInPath, pathId) => {
      const path = paths.find(p => p.id === pathId);
      if (!path) return;

      // Check if we're converting all subpaths in this path
      const allSubPathIds = path.subPaths.map(sp => sp.id);
      const convertingAllSubPaths = allSubPathIds.every(id => subPathIdsInPath.includes(id));

      if (convertingAllSubPaths) {
        const convertedSubPaths = convertPathCoordinates(path.subPaths, false);
        
        // Update all subpaths at once
        const state = useEditorStore.getState();
        useEditorStore.setState({
          paths: state.paths.map(p => 
            p.id === pathId 
              ? { ...p, subPaths: convertedSubPaths }
              : p
          )
        });
      } else {
        // Even for individual subpaths, we need to calculate their context within the full path
        subPathIdsInPath.forEach(subPathId => {
          const subPathIndex = path.subPaths.findIndex(sp => sp.id === subPathId);
          if (subPathIndex === -1) return;
          
          const subPath = path.subPaths[subPathIndex];
          
          // Check if this subpath has relative commands that need conversion
          const hasRelativeCommands = subPath.commands.some(cmd => isRelativeCommand(cmd));
          
          if (!hasRelativeCommands) return;
          
          // Calculate the starting position for this subpath based on previous subpaths
          let startingPosition: Point = { x: 0, y: 0 };
          for (let i = 0; i < subPathIndex; i++) {
            startingPosition = getSubPathFinalPosition(path.subPaths[i], startingPosition);
          }
          
          // Convert this subpath with its correct context
          const convertedSubPath = convertSubPathCoordinatesInContext(
            subPath,
            false, // toRelative
            startingPosition,
            subPathIndex === 0 // isFirstSubPath
          );
          
          updateSubPathCommands(pathId, subPath.id, convertedSubPath.commands);
        });
      }
    });
    
    // Force re-render of visual elements
    forceRender();
  };

  const handleConvertToRelative = (subPathIds: string[]) => {
    if (subPathIds.length === 0) return;

    pushToHistory();

    // Group subpaths by path to handle conversion in context
    const pathGroups = new Map<string, string[]>();
    
    subPathIds.forEach(subPathId => {
      for (const path of paths) {
        const subPath = path.subPaths.find(sp => sp.id === subPathId);
        if (subPath) {
          if (!pathGroups.has(path.id)) {
            pathGroups.set(path.id, []);
          }
          pathGroups.get(path.id)!.push(subPathId);
          break;
        }
      }
    });

    // Convert each path group
    pathGroups.forEach((subPathIdsInPath, pathId) => {
      const path = paths.find(p => p.id === pathId);
      if (!path) return;

      // Check if we're converting all subpaths in this path
      const allSubPathIds = path.subPaths.map(sp => sp.id);
      const convertingAllSubPaths = allSubPathIds.every(id => subPathIdsInPath.includes(id));

      if (convertingAllSubPaths) {
        const convertedSubPaths = convertPathCoordinates(path.subPaths, true);
        
        // Update all subpaths at once
        const state = useEditorStore.getState();
        useEditorStore.setState({
          paths: state.paths.map(p => 
            p.id === pathId 
              ? { ...p, subPaths: convertedSubPaths }
              : p
          )
        });
      } else {
        // Even for individual subpaths, we need to calculate their context within the full path
        subPathIdsInPath.forEach(subPathId => {
          const subPathIndex = path.subPaths.findIndex(sp => sp.id === subPathId);
          if (subPathIndex === -1) return;
          
          const subPath = path.subPaths[subPathIndex];
          
          // Check if this subpath has absolute commands that need conversion
          const hasAbsoluteCommands = subPath.commands.some(cmd => 
            !isRelativeCommand(cmd) && cmd.command !== 'Z' && cmd.command !== 'z'
          );
          
          if (!hasAbsoluteCommands) return;
          
          // Calculate the starting position for this subpath based on previous subpaths
          let startingPosition: Point = { x: 0, y: 0 };
          for (let i = 0; i < subPathIndex; i++) {
            startingPosition = getSubPathFinalPosition(path.subPaths[i], startingPosition);
          }
          
          // Convert this subpath with its correct context
          const convertedSubPath = convertSubPathCoordinatesInContext(
            subPath,
            true, // toRelative
            startingPosition,
            subPathIndex === 0 // isFirstSubPath
          );
          
          updateSubPathCommands(pathId, subPath.id, convertedSubPath.commands);
        });
      }
    });
    
    // Force re-render of visual elements
    forceRender();
  };

  return (
    <DraggablePanel 
      title="Relative/Absolute"
      initialPosition={{ x: 980, y: 600 }}
      id="relative-tools"
    >
      <RelativeTools
        selectedSubPaths={selection.selectedSubPaths}
        onConvertToAbsolute={handleConvertToAbsolute}
        onConvertToRelative={handleConvertToRelative}
      />
    </DraggablePanel>
  );
};

export const RelativeToolsPlugin: Plugin = {
  id: 'relative-tools',
  name: 'Relative/Absolute Tools',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'ctrl+shift+a',
      description: 'Convert selected sub-paths to absolute coordinates',
      action: () => {
        const store = useEditorStore.getState();
        const selectedSubPaths = store.selection.selectedSubPaths;
        if (selectedSubPaths.length > 0) {
          store.pushToHistory();
          
          // Group subpaths by path to handle conversion in context
          const pathGroups = new Map<string, string[]>();
          
          selectedSubPaths.forEach(subPathId => {
            for (const path of store.paths) {
              const subPath = path.subPaths.find(sp => sp.id === subPathId);
              if (subPath) {
                if (!pathGroups.has(path.id)) {
                  pathGroups.set(path.id, []);
                }
                pathGroups.get(path.id)!.push(subPathId);
                break;
              }
            }
          });

          // Convert each path group
          pathGroups.forEach((subPathIdsInPath, pathId) => {
            const path = store.paths.find(p => p.id === pathId);
            if (!path) return;

            // Convert individual subpaths with context
            subPathIdsInPath.forEach(subPathId => {
              const subPathIndex = path.subPaths.findIndex(sp => sp.id === subPathId);
              if (subPathIndex === -1) return;
              
              const subPath = path.subPaths[subPathIndex];
              
              // Check if this subpath has relative commands that need conversion
              const hasRelativeCommands = subPath.commands.some(cmd => isRelativeCommand(cmd));
              
              if (!hasRelativeCommands) return;
              
              // Calculate the starting position for this subpath based on previous subpaths
              let startingPosition = { x: 0, y: 0 };
              for (let i = 0; i < subPathIndex; i++) {
                startingPosition = getSubPathFinalPosition(path.subPaths[i], startingPosition);
              }
              
              // Convert this subpath with its correct context
              const convertedSubPath = convertSubPathCoordinatesInContext(
                subPath,
                false, // toRelative
                startingPosition,
                subPathIndex === 0 // isFirstSubPath
              );
              
              // Update the paths state directly
              useEditorStore.setState({
                paths: store.paths.map(p => 
                  p.id === path.id 
                    ? {
                        ...p,
                        subPaths: p.subPaths.map(sp =>
                          sp.id === subPathId
                            ? { ...sp, commands: convertedSubPath.commands }
                            : sp
                        )
                      }
                    : p
                )
              });
            });
          });
          
          // Force re-render of visual elements
          store.forceRender();
        }
      }
    },
    {
      key: 'ctrl+shift+r',
      description: 'Convert selected sub-paths to relative coordinates',
      action: () => {
        const store = useEditorStore.getState();
        const selectedSubPaths = store.selection.selectedSubPaths;
        if (selectedSubPaths.length > 0) {
          store.pushToHistory();
          
          // Group subpaths by path to handle conversion in context
          const pathGroups = new Map<string, string[]>();
          
          selectedSubPaths.forEach(subPathId => {
            for (const path of store.paths) {
              const subPath = path.subPaths.find(sp => sp.id === subPathId);
              if (subPath) {
                if (!pathGroups.has(path.id)) {
                  pathGroups.set(path.id, []);
                }
                pathGroups.get(path.id)!.push(subPathId);
                break;
              }
            }
          });

          // Convert each path group
          pathGroups.forEach((subPathIdsInPath, pathId) => {
            const path = store.paths.find(p => p.id === pathId);
            if (!path) return;

            // Convert individual subpaths with context
            subPathIdsInPath.forEach(subPathId => {
              const subPathIndex = path.subPaths.findIndex(sp => sp.id === subPathId);
              if (subPathIndex === -1) return;
              
              const subPath = path.subPaths[subPathIndex];
              
              // Check if this subpath has absolute commands that need conversion
              const hasAbsoluteCommands = subPath.commands.some(cmd => !isRelativeCommand(cmd) && cmd.command !== 'Z' && cmd.command !== 'z');
              
              if (!hasAbsoluteCommands) return;
              
              // Calculate the starting position for this subpath based on previous subpaths
              let startingPosition = { x: 0, y: 0 };
              for (let i = 0; i < subPathIndex; i++) {
                startingPosition = getSubPathFinalPosition(path.subPaths[i], startingPosition);
              }
              
              // Convert this subpath with its correct context
              const convertedSubPath = convertSubPathCoordinatesInContext(
                subPath,
                true, // toRelative
                startingPosition,
                subPathIndex === 0 // isFirstSubPath
              );
              
              // Update the paths state directly
              useEditorStore.setState({
                paths: store.paths.map(p => 
                  p.id === path.id 
                    ? {
                        ...p,
                        subPaths: p.subPaths.map(sp =>
                          sp.id === subPathId
                            ? { ...sp, commands: convertedSubPath.commands }
                            : sp
                        )
                      }
                    : p
                )
              });
            });
          });
          
          // Force re-render of visual elements
          store.forceRender();
        }
      }
    }
  ],
  
  ui: [
    {
      id: 'relative-tools',
      component: RelativeToolsComponent,
      position: 'toolbar',
      order: 7
    }
  ]
};
