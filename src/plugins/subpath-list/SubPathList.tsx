import React, { useEffect, useState, useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getAllSubPaths } from '../../utils/subpath-utils';
import { subPathToString } from '../../utils/path-utils';
import { Lock, Unlock, Edit3, Plus, Trash2, X, Check } from 'lucide-react';
import { SVGPath, SVGSubPath, SVGCommand, SVGCommandType } from '../../types';
import { generateId } from '../../utils/id-utils';

interface CommandEditorProps {
  command: SVGCommand;
  onSave: (updatedCommand: SVGCommand) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const CommandEditor: React.FC<CommandEditorProps> = ({ command, onSave, onCancel, onDelete }) => {
  const [editCommand, setEditCommand] = useState<SVGCommand>({ ...command });

  const handleSave = () => {
    onSave(editCommand);
  };

  const inputStyle = {
    width: '50px',
    padding: '1px 3px',
    fontSize: '9px',
    border: '1px solid #ccc',
    borderRadius: '2px',
    fontFamily: 'monospace'
  };

  return (
    <div style={{
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '3px',
      padding: '4px',
      margin: '1px 0',
      fontSize: '9px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <select
          value={editCommand.command}
          onChange={(e) => setEditCommand({ ...editCommand, command: e.target.value as SVGCommandType })}
          style={{ fontSize: '9px', padding: '1px' }}
        >
          <option value="M">M - Move To</option>
          <option value="L">L - Line To</option>
          <option value="C">C - Curve To</option>
          <option value="Z">Z - Close Path</option>
        </select>
        <button onClick={handleSave} style={{ padding: '2px', fontSize: '8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '2px' }}>
          <Check size={10} />
        </button>
        <button onClick={onCancel} style={{ padding: '2px', fontSize: '8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '2px' }}>
          <X size={10} />
        </button>
        <button onClick={onDelete} style={{ padding: '2px', fontSize: '8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '2px' }}>
          <Trash2 size={10} />
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {(editCommand.command === 'M' || editCommand.command === 'L' || editCommand.command === 'C') && (
          <>
            <label style={{ fontSize: '8px' }}>x:</label>
            <input
              type="number"
              value={editCommand.x || 0}
              onChange={(e) => setEditCommand({ ...editCommand, x: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
            <label style={{ fontSize: '8px' }}>y:</label>
            <input
              type="number"
              value={editCommand.y || 0}
              onChange={(e) => setEditCommand({ ...editCommand, y: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
          </>
        )}
        {editCommand.command === 'C' && (
          <>
            <label style={{ fontSize: '8px' }}>x1:</label>
            <input
              type="number"
              value={editCommand.x1 || 0}
              onChange={(e) => setEditCommand({ ...editCommand, x1: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
            <label style={{ fontSize: '8px' }}>y1:</label>
            <input
              type="number"
              value={editCommand.y1 || 0}
              onChange={(e) => setEditCommand({ ...editCommand, y1: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
            <label style={{ fontSize: '8px' }}>x2:</label>
            <input
              type="number"
              value={editCommand.x2 || 0}
              onChange={(e) => setEditCommand({ ...editCommand, x2: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
            <label style={{ fontSize: '8px' }}>y2:</label>
            <input
              type="number"
              value={editCommand.y2 || 0}
              onChange={(e) => setEditCommand({ ...editCommand, y2: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
          </>
        )}
      </div>
    </div>
  );
};

interface NewCommandCreatorProps {
  onSave: (newCommand: Omit<SVGCommand, 'id'>) => void;
  onCancel: () => void;
}

const NewCommandCreator: React.FC<NewCommandCreatorProps> = ({ onSave, onCancel }) => {
  const [newCommand, setNewCommand] = useState<Omit<SVGCommand, 'id'>>({
    command: 'L',
    x: 0,
    y: 0
  });

  const handleSave = () => {
    onSave(newCommand);
  };

  const inputStyle = {
    width: '50px',
    padding: '1px 3px',
    fontSize: '9px',
    border: '1px solid #ccc',
    borderRadius: '2px',
    fontFamily: 'monospace'
  };

  return (
    <div style={{
      backgroundColor: '#d1ecf1',
      border: '1px solid #bee5eb',
      borderRadius: '3px',
      padding: '4px',
      margin: '1px 0',
      fontSize: '9px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <select
          value={newCommand.command}
          onChange={(e) => setNewCommand({ ...newCommand, command: e.target.value as SVGCommandType })}
          style={{ fontSize: '9px', padding: '1px' }}
        >
          <option value="M">M - Move To</option>
          <option value="L">L - Line To</option>
          <option value="C">C - Curve To</option>
          <option value="Z">Z - Close Path</option>
        </select>
        <button onClick={handleSave} style={{ padding: '2px', fontSize: '8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '2px' }}>
          <Check size={10} />
        </button>
        <button onClick={onCancel} style={{ padding: '2px', fontSize: '8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '2px' }}>
          <X size={10} />
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {(newCommand.command === 'M' || newCommand.command === 'L' || newCommand.command === 'C') && (
          <>
            <label style={{ fontSize: '8px' }}>x:</label>
            <input
              type="number"
              value={newCommand.x || 0}
              onChange={(e) => setNewCommand({ ...newCommand, x: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
            <label style={{ fontSize: '8px' }}>y:</label>
            <input
              type="number"
              value={newCommand.y || 0}
              onChange={(e) => setNewCommand({ ...newCommand, y: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
          </>
        )}
        {newCommand.command === 'C' && (
          <>
            <label style={{ fontSize: '8px' }}>x1:</label>
            <input
              type="number"
              value={newCommand.x1 || 0}
              onChange={(e) => setNewCommand({ ...newCommand, x1: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
            <label style={{ fontSize: '8px' }}>y1:</label>
            <input
              type="number"
              value={newCommand.y1 || 0}
              onChange={(e) => setNewCommand({ ...newCommand, y1: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
            <label style={{ fontSize: '8px' }}>x2:</label>
            <input
              type="number"
              value={newCommand.x2 || 0}
              onChange={(e) => setNewCommand({ ...newCommand, x2: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
            <label style={{ fontSize: '8px' }}>y2:</label>
            <input
              type="number"
              value={newCommand.y2 || 0}
              onChange={(e) => setNewCommand({ ...newCommand, y2: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
          </>
        )}
      </div>
    </div>
  );
};

interface SubPathWireframeProps {
  subPath: SVGSubPath;
  isSelected: boolean;
}

const SubPathWireframe: React.FC<SubPathWireframeProps> = ({ subPath, isSelected }) => {
  const pathData = subPathToString(subPath);
  
  if (!pathData || subPath.commands.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '50px',
        border: '1px solid #ddd',
        borderRadius: '2px',
        backgroundColor: '#f9f9f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: '#999',
        flexShrink: 0
      }}>
        Empty
      </div>
    );
  }

  // Calculate rough bounds for scaling
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  subPath.commands.forEach(cmd => {
    // Main coordinates
    if (cmd.x !== undefined) {
      minX = Math.min(minX, cmd.x);
      maxX = Math.max(maxX, cmd.x);
    }
    if (cmd.y !== undefined) {
      minY = Math.min(minY, cmd.y);
      maxY = Math.max(maxY, cmd.y);
    }
    
    // Control points for curves
    if (cmd.x1 !== undefined) {
      minX = Math.min(minX, cmd.x1);
      maxX = Math.max(maxX, cmd.x1);
    }
    if (cmd.y1 !== undefined) {
      minY = Math.min(minY, cmd.y1);
      maxY = Math.max(maxY, cmd.y1);
    }
    if (cmd.x2 !== undefined) {
      minX = Math.min(minX, cmd.x2);
      maxX = Math.max(maxX, cmd.x2);
    }
    if (cmd.y2 !== undefined) {
      minY = Math.min(minY, cmd.y2);
      maxY = Math.max(maxY, cmd.y2);
    }
    
  });

  // Fallback if bounds couldn't be calculated
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return (
      <div style={{
        width: '100%',
        height: '50px',
        border: '1px solid #ddd',
        borderRadius: '2px',
        backgroundColor: '#f9f9f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: '#999',
        flexShrink: 0
      }}>
        Path
      </div>
    );
  }

  const width = Math.max(maxX - minX, 5); // Minimum width
  const height = Math.max(maxY - minY, 5); // Minimum height
  const padding = Math.max(width * 0.15, height * 0.15, 2); // Increased padding for better visibility
  
  // Calculate aspect ratio and dynamic height
  const aspectRatio = height / width;
  const maxPreviewHeight = 120; // Maximum height limit
  const minPreviewHeight = 30;  // Minimum height limit
  const baseWidth = 200; // Approximate container width for calculation
  
  // Calculate proportional height based on aspect ratio
  let previewHeight = Math.round(baseWidth * aspectRatio);
  
  // Apply height constraints
  previewHeight = Math.max(minPreviewHeight, Math.min(maxPreviewHeight, previewHeight));

  const viewBoxWidth = width + padding * 2;
  const viewBoxHeight = height + padding * 2;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;

  // Calculate stroke width based on the size of the path
  const avgDimension = (width + height) / 2;
  const strokeWidth = Math.max(avgDimension * 0.02, 0.5);

  return (
    <div style={{
      width: '100%',
      height: `${previewHeight}px`,
      border: isSelected ? '1px solid #2196f3' : '1px solid #ddd',
      borderRadius: '2px',
      backgroundColor: isSelected ? '#f3f9ff' : '#fafafa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        style={{ display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={pathData}
          fill="none"
          stroke={isSelected ? '#2196f3' : '#666'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

interface SubPathListItemProps {
  path: SVGPath;
  subPath: SVGSubPath;
  isSelected: boolean;
  onSelect: (e: React.PointerEvent) => void;
}

const SubPathListItem: React.FC<SubPathListItemProps> = ({
  path,
  subPath,
  isSelected,
  onSelect,
}) => {
  const { updateSubPath, replaceSubPathCommands, removeSubPath, pushToHistory } = useEditorStore();
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null);
  const [addingCommandAfter, setAddingCommandAfter] = useState<number | null>(null);
  
  // Get first command for display info
  const firstCommand = subPath.commands[0];
  const commandCount = subPath.commands.length;

  const handleLockToggle = (e: React.PointerEvent) => {
    e.stopPropagation();
    updateSubPath(subPath.id, { locked: !subPath.locked });
  };

  const handleDeleteSubPath = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete sub-path ${subPath.id.slice(-6)}?`)) {
      pushToHistory();
      removeSubPath(subPath.id);
    }
  };

  const handleCommandEdit = (commandId: string) => {
    setEditingCommandId(commandId);
  };

  const handleCommandSave = (updatedCommand: SVGCommand) => {
    pushToHistory();
    const updatedCommands = subPath.commands.map(cmd => 
      cmd.id === updatedCommand.id ? updatedCommand : cmd
    );
    replaceSubPathCommands(subPath.id, updatedCommands);
    setEditingCommandId(null);
  };

  const handleCommandDelete = (commandId: string) => {
    if (window.confirm('Are you sure you want to delete this command?')) {
      pushToHistory();
      const updatedCommands = subPath.commands.filter(cmd => cmd.id !== commandId);
      if (updatedCommands.length === 0) {
        // If no commands left, delete the entire subpath
        removeSubPath(subPath.id);
      } else {
        replaceSubPathCommands(subPath.id, updatedCommands);
      }
    }
    setEditingCommandId(null);
  };

  const handleAddCommand = (afterIndex: number) => {
    setAddingCommandAfter(afterIndex);
  };

  const handleNewCommandSave = (newCommand: Omit<SVGCommand, 'id'>) => {
    pushToHistory();
    const commandWithId: SVGCommand = { ...newCommand, id: generateId() };
    const updatedCommands = [...subPath.commands];
    updatedCommands.splice(addingCommandAfter! + 1, 0, commandWithId);
    replaceSubPathCommands(subPath.id, updatedCommands);
    setAddingCommandAfter(null);
  };

  const handleNewCommandCancel = () => {
    setAddingCommandAfter(null);
  };

  return (
    <div
      onPointerDown={onSelect}
      style={{
        padding: '6px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
        border: isSelected ? '1px solid #2196f3' : '1px solid transparent',
        marginBottom: '3px',
        fontSize: '12px',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
      onPointerEnter={(e) => {
        if (!isSelected) {
          (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
        }
      }}
      onPointerLeave={(e) => {
        if (!isSelected) {
          (e.target as HTMLElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <SubPathWireframe subPath={subPath} isSelected={isSelected} />
          <div style={{ width: '100%', textAlign: 'center' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{
                fontWeight: '500',
                color: isSelected ? '#2196f3' : '#333',
                fontSize: '11px',
              }}>
                Sub-Path {subPath.id.slice(-6)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
              <button
                onPointerDown={handleLockToggle}
                title={subPath.locked ? 'Unlock subpath' : 'Lock subpath'}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                tabIndex={-1}
              >
                {subPath.locked
                  ? <Lock size={16} strokeWidth={3.2} color="#111" style={{ filter: 'drop-shadow(0 1px 0 #888)' }} />
                  : <Unlock size={16} strokeWidth={2.2} color="#bbb" />}
              </button>
              <button
                onPointerDown={handleDeleteSubPath}
                title="Delete subpath"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                tabIndex={-1}
              >
                <Trash2 size={16} strokeWidth={2.2} color="#dc3545" />
              </button>
            </div>
            <div style={{ color: '#666', fontSize: '10px', lineHeight: '1.3' }}>
              <div>{commandCount} command{commandCount !== 1 ? 's' : ''}</div>
              <div style={{ color: '#999', marginBottom: '6px' }}>Path: {path.id.slice(-6)}</div>
              
              {/* Commands List */}
              <div style={{ 
                marginTop: '6px', 
                padding: '4px 6px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '3px',
                border: '1px solid #e9ecef',
                maxHeight: '120px',
                overflowY: 'auto',
                fontSize: '9px',
                fontFamily: 'monospace'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '2px', color: '#555' }}>Commands:</div>
                {subPath.commands.map((cmd, index) => {
                  const isEditing = editingCommandId === cmd.id;
                  
                  if (isEditing) {
                    return (
                      <CommandEditor
                        key={cmd.id}
                        command={cmd}
                        onSave={handleCommandSave}
                        onCancel={() => setEditingCommandId(null)}
                        onDelete={() => handleCommandDelete(cmd.id)}
                      />
                    );
                  }

                  const cmdString = (() => {
                    switch (cmd.command) {
                      case 'M':
                      case 'L':
                        return `${cmd.command} ${cmd.x?.toFixed(1)} ${cmd.y?.toFixed(1)}`;
                      case 'C':
                        return `${cmd.command} ${cmd.x1?.toFixed(1)} ${cmd.y1?.toFixed(1)} ${cmd.x2?.toFixed(1)} ${cmd.y2?.toFixed(1)} ${cmd.x?.toFixed(1)} ${cmd.y?.toFixed(1)}`;
                      case 'Z':
                        return cmd.command;
                      default:
                        return '';
                    }
                  })();
                  
                  return (
                    <div key={cmd.id}>
                      <div 
                        style={{ 
                          marginBottom: '1px',
                          color: index === 0 ? '#22c55e' : index === subPath.commands.length - 1 ? '#ef4444' : '#333',
                          fontWeight: index === 0 || index === subPath.commands.length - 1 ? '600' : '400',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '4px'
                        }}
                      >
                        <span>{index + 1}. {cmdString}</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommandEdit(cmd.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '1px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Edit command"
                          >
                            <Edit3 size={10} color="#007acc" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddCommand(index);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '1px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Add command after this"
                          >
                            <Plus size={10} color="#28a745" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Show new command creator after this command */}
                      {addingCommandAfter === index && (
                        <NewCommandCreator
                          onSave={handleNewCommandSave}
                          onCancel={handleNewCommandCancel}
                        />
                      )}
                    </div>
                  );
                })}
                
                {/* Add command at the end */}
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e9ecef' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddCommand(subPath.commands.length - 1);
                    }}
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '2px 4px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                    title="Add command at the end"
                  >
                    <Plus size={8} />
                    Add Command
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SubPathListComponent: React.FC = () => {
  // All hooks must be at the top level, before any return or condition
  const { 
    paths, 
    selection, 
    selectSubPath, 
    selectSubPathMultiple,
    clearSelection, 
    zoomToSubPath,
    lockAllSubPaths,
    unlockAllSubPaths,
    invertAllSubPaths,
    lockSelectedSubPaths
  } = useEditorStore();
  // Estado local para mantener la lista de sub-paths
  const [subPathsList, setSubPathsList] = useState<Array<{ path: SVGPath; subPath: SVGSubPath }>>([]);
  // Estado local para el toggle de auto-zoom
  const [autoZoom, setAutoZoom] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sspe-auto-zoom');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });
  // Ref para evitar doble zoom en doble click
  const zoomTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs para los elementos de la lista de sub-paths
  const subPathRefs = useRef<{ [subPathId: string]: HTMLDivElement | null }>({});

  // Actualizar la lista de sub-paths cuando cambian los paths
  useEffect(() => {
    if (paths && paths.length > 0) {
      const allSubPaths = getAllSubPaths(paths);
      setSubPathsList(allSubPaths);
    } else {
      setSubPathsList([]);
    }
  }, [paths]);

  // Hacer scroll automático al sub-path seleccionado
  useEffect(() => {
    if (selection.selectedSubPaths.length === 1) {
      const selectedId = selection.selectedSubPaths[0];
      const el = subPathRefs.current[selectedId];
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selection.selectedSubPaths, subPathsList]);

  const handleSubPathSelect = (subPathId: string, isShiftPressed = false) => {
    if (isShiftPressed) {
      // Use the new multiple selection logic
      selectSubPathMultiple(subPathId, true);
    } else if (selection.selectedSubPaths.includes(subPathId) && selection.selectedSubPaths.length === 1) {
      // Solo desmarcar si es el único seleccionado y no se mantiene shift
      clearSelection();
    } else {
      // Comportamiento normal de selección
      selectSubPathMultiple(subPathId, false);
    }
    
    if (autoZoom && !isShiftPressed) {
      // Timeout para asegurar que el estado de selección se actualice antes del zoom
      if (zoomTimeout.current) clearTimeout(zoomTimeout.current);
      zoomTimeout.current = setTimeout(() => {
        zoomToSubPath();
      }, 50);
    }
  };

  if (subPathsList.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#999',
        fontSize: '12px'
      }}>
        No sub-paths available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <button
          onPointerDown={lockAllSubPaths}
          style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '3px',
            border: '1px solid #bbb',
            background: '#f5f5f5',
            cursor: 'pointer',
            color: '#333',
            fontWeight: 500
          }}
        >
          Lock All
        </button>
        <button
          onPointerDown={unlockAllSubPaths}
          style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '3px',
            border: '1px solid #bbb',
            background: '#f5f5f5',
            cursor: 'pointer',
            color: '#333',
            fontWeight: 500
          }}
        >
          Unlock All
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          onPointerDown={lockSelectedSubPaths}
          style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '3px',
            border: '1px solid #bbb',
            background: '#f5f5f5',
            cursor: 'pointer',
            color: '#333',
            fontWeight: 500
          }}
        >
          Lock Selection
        </button>
        <button
          onPointerDown={invertAllSubPaths}
          style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '3px',
            border: '1px solid #bbb',
            background: '#f5f5f5',
            cursor: 'pointer',
            color: '#333',
            fontWeight: 500
          }}
        >
          Invert Lock
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: '11px', color: '#666', fontWeight: 500 }}>
          {subPathsList.length} Sub-Path{subPathsList.length !== 1 ? 's' : ''} Available
        </span>
        {selection.selectedSubPaths.length > 1 && (
          <span style={{ 
            fontSize: '10px', 
            color: '#2196f3', 
            backgroundColor: '#e3f2fd',
            padding: '2px 6px',
            borderRadius: '3px',
            fontWeight: 500
          }}>
            {selection.selectedSubPaths.length} selected
          </span>
        )}
      </div>
      <div style={{ 
        fontSize: '10px', 
        color: '#999', 
        fontStyle: 'italic',
        marginBottom: '4px'
      }}>
        Hold Shift + Click to select multiple sub-paths
      </div>
      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {subPathsList.map(({ path, subPath }) => (
          <div
            key={subPath.id}
            ref={el => { subPathRefs.current[subPath.id] = el; }}
          >
            <SubPathListItem
              path={path}
              subPath={subPath}
              isSelected={selection.selectedSubPaths.includes(subPath.id)}
              onSelect={(e) => handleSubPathSelect(subPath.id, e.shiftKey)}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, marginBottom: 0, justifyContent: 'flex-start' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoZoom}
            onChange={e => {
              setAutoZoom(e.target.checked);
              try {
                localStorage.setItem('sspe-auto-zoom', JSON.stringify(e.target.checked));
              } catch {}
            }}
            style={{ accentColor: '#2196f3', marginRight: 4 }}
          />
          Auto-Zoom
        </label>
      </div>
    </div>
  );
};

export const SubPathListPlugin: Plugin = {
  id: 'subpath-list',
  name: 'Sub-Path List',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'p',
      modifiers: ['ctrl', 'shift'],
      description: 'Focus Sub-Path List',
      action: () => {
        // Focus the sub-path list panel
        const panel = document.querySelector('#subpath-list');
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    {
      key: 'a',
      modifiers: ['ctrl', 'shift'],
      description: 'Select All Sub-Paths',
      action: () => {
        const store = useEditorStore.getState();
        const allSubPathIds = getAllSubPaths(store.paths).map(({ subPath }) => subPath.id);
        if (allSubPathIds.length > 0) {
          store.selectMultiple(allSubPathIds, 'subpaths');
        }
      }
    }
  ],
  
  ui: [
    {
      id: 'subpath-list',
      component: () => (
        <div>
          <SubPathListComponent />
        </div>
      ),
      position: 'sidebar',
      order: 0
    }
  ]
};
