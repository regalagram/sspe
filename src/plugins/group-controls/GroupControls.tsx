import React, { useState, useRef, useEffect } from 'react';
import { useSvgTextBBox } from '../../utils/SvgTextBBox';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';
import { 
  Group, 
  Ungroup, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2,
  Plus,
  Edit3,
  Download
} from 'lucide-react';

export const GroupControls: React.FC = () => {
  const {
    groups,
    selection,
    createGroupFromSelection,
    ungroupElements,
    toggleGroupVisibility,
    lockGroup,
    deleteGroup,
    updateGroup,
    createGroup,
    getGroupChildrenDetails,
    removeChildFromGroup,
    moveChildInGroup,
    addChildToGroup,
    paths,
    texts,
    exportGroupSVG
  } = useEditorStore();

  // Medir todos los textos de todos los grupos después de obtener texts
  const textBBoxes: Record<string, any> = {};
  (texts ?? []).forEach((text: any) => {
    const fontSize = typeof text.fontSize === 'number' ? text.fontSize : 14;
    const fontFamily = typeof text.fontFamily === 'string' ? text.fontFamily : 'sans-serif';
    let content = '';
    if (text.type === 'text') {
      content = text.content || '';
    } else if (text.type === 'multiline-text') {
      content = (text.spans && text.spans.length > 0)
        ? text.spans.map((span: any) => span.content).join(' ')
        : '';
    }
    textBBoxes[text.id] = useSvgTextBBox(content, fontSize, fontFamily).bbox;
  });

  // Helper para dibujar texto como rectángulo en el preview (NO HOOK)
  function getTextRectAndSVG(text: any, bbox: any) {
    const fontSize = typeof text?.fontSize === 'number' ? text.fontSize : 14;
    const fontFamily = typeof text?.fontFamily === 'string' ? text.fontFamily : 'sans-serif';
    let content = '';
    if (!text || typeof text.x !== 'number' || typeof text.y !== 'number') return { rect: null, svg: null };
    if (text.type === 'text') {
      content = text.content || '';
    } else if (text.type === 'multiline-text') {
      content = (text.spans && text.spans.length > 0)
        ? text.spans.map((span: any) => span.content).join(' ')
        : '';
    }
    const transform = text.transform ? text.transform : '';
    const svg = content ? (
      <text
        x={text.x}
        y={text.y}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fill="#222"
        textAnchor="start"
        alignmentBaseline="hanging"
        dominantBaseline="hanging"
        transform={transform}
        style={{ userSelect: 'none' }}
      >
        {content}
      </text>
    ) : null;
    return bbox
      ? { rect: { x: text.x, y: text.y, width: bbox.width, height: bbox.height }, svg }
      : { rect: null, svg };
  }
  // Helper para generar el d de un path SVG
  function getPathD(path: any): string {
    if (!path || !path.subPaths) return '';
    let d = '';
    path.subPaths.forEach((sp: any) => {
      sp.commands.forEach((cmd: any, i: number) => {
        const type = cmd.command;
        if (type === 'M') {
          d += `M${cmd.x},${cmd.y} `;
        } else if (type === 'L') {
          d += `L${cmd.x},${cmd.y} `;
        } else if (type === 'C') {
          d += `C${cmd.x1},${cmd.y1} ${cmd.x2},${cmd.y2} ${cmd.x},${cmd.y} `;
        } else if (type === 'Q') {
          d += `Q${cmd.x1},${cmd.y1} ${cmd.x},${cmd.y} `;
        } else if (type === 'Z') {
          d += 'Z ';
        }
      });
    });
    return d.trim();
  }
  // Helper para calcular el bbox de un grupo
  function getGroupBBox(group: any): { x: number, y: number, width: number, height: number } | null {
    if (!group || !paths) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    group.children.forEach((child: any) => {
      if (child.type === 'path') {
        const path = paths.find((p: any) => p.id === child.id);
        if (path && path.subPaths) {
          path.subPaths.forEach((sp: any) => {
            sp.commands.forEach((cmd: any) => {
              if (typeof cmd.x === 'number' && typeof cmd.y === 'number') {
                minX = Math.min(minX, cmd.x);
                minY = Math.min(minY, cmd.y);
                maxX = Math.max(maxX, cmd.x);
                maxY = Math.max(maxY, cmd.y);
              }
              if (typeof cmd.x1 === 'number' && typeof cmd.y1 === 'number') {
                minX = Math.min(minX, cmd.x1);
                minY = Math.min(minY, cmd.y1);
                maxX = Math.max(maxX, cmd.x1);
                maxY = Math.max(maxY, cmd.y1);
              }
              if (typeof cmd.x2 === 'number' && typeof cmd.y2 === 'number') {
                minX = Math.min(minX, cmd.x2);
                minY = Math.min(minY, cmd.y2);
                maxX = Math.max(maxX, cmd.x2);
                maxY = Math.max(maxY, cmd.y2);
              }
            });
          });
        }
      }
      if (child.type === 'text' || child.type === 'multiline-text') {
        const textObj = (texts ?? []).find((t: any) => t.id === child.id);
        // Usar el bbox medido si existe
        if (textObj) {
          const fontSize = typeof textObj.fontSize === 'number' ? textObj.fontSize : 14;
          const fontFamily = typeof textObj.fontFamily === 'string' ? textObj.fontFamily : 'sans-serif';
          let content = '';
          if (textObj.type === 'text') {
            content = textObj.content || '';
          } else if (textObj.type === 'multiline-text') {
            content = (textObj.spans && textObj.spans.length > 0)
              ? textObj.spans.map((span: any) => span.content).join(' ')
              : '';
          }
          // Usar el bbox real si está disponible
          const bboxText = textBBoxes[textObj.id];
          let width = bboxText?.width ?? Math.max(16, content.length * fontSize * 0.6);
          let height = bboxText?.height ?? fontSize * 1.2;
          minX = Math.min(minX, textObj.x);
          minY = Math.min(minY, textObj.y);
          maxX = Math.max(maxX, textObj.x + width);
          maxY = Math.max(maxY, textObj.y + height);
        }
      }
      if (child.type === 'group') {
        const groupObj = groups.find((g: any) => g.id === child.id);
        const groupBBox = getGroupBBox(groupObj);
        if (groupBBox) {
          minX = Math.min(minX, groupBBox.x);
          minY = Math.min(minY, groupBBox.y);
          maxX = Math.max(maxX, groupBBox.x + groupBBox.width);
          maxY = Math.max(maxY, groupBBox.y + groupBBox.height);
        }
      }
    });
    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  // ...existing code...
  
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Check if there's a selection that can be grouped
  const canCreateGroup = (selection.selectedPaths ?? []).length > 0 || 
                        (selection.selectedTexts ?? []).length > 0 || 
                        (selection.selectedGroups ?? []).length > 0 ||
                        (selection.selectedSubPaths ?? []).length > 0;

  // Check if there are selected groups that can be ungrouped
  const canUngroup = (selection.selectedGroups ?? []).length > 0;

  const handleCreateGroup = () => {
    const groupId = createGroupFromSelection();
    if (groupId) {
      console.log('Created group:', groupId);
    }
  };

  const handleUngroupSelected = () => {
    selection.selectedGroups.forEach(groupId => {
      ungroupElements(groupId);
    });
  };

  const handleCreateEmptyGroup = () => {
    createGroup('New Group');
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('Delete group? (Elements will remain ungrooted)')) {
      deleteGroup(groupId, false);
    }
  };

  const handleDeleteGroupWithChildren = (groupId: string) => {
    if (confirm('Delete group and all its elements? This cannot be undone.')) {
      deleteGroup(groupId, true);
    }
  };

  const handleExportGroup = (groupId: string) => {
    exportGroupSVG(groupId, true);
  };

  const handleSelectGroupElements = (group: any) => {
    // Recolectar todos los elementos del grupo
    const pathIds: string[] = [];
    const textIds: string[] = [];
    const groupIds: string[] = [];
    const subPathIds: string[] = [];
    
    group.children.forEach((child: any) => {
      if (child.type === 'path') {
        pathIds.push(child.id);
        // Encontrar todos los subpaths del path
        const path = paths.find(p => p.id === child.id);
        if (path && path.subPaths) {
          path.subPaths.forEach(subPath => {
            subPathIds.push(subPath.id);
          });
        }
      } else if (child.type === 'text') {
        textIds.push(child.id);
      } else if (child.type === 'group') {
        groupIds.push(child.id);
      }
    });
    
    // Actualizar la selección directamente en el store
    useEditorStore.setState(state => ({
      ...state,
      selection: {
        ...state.selection,
        selectedPaths: pathIds,
        selectedTexts: textIds,
        selectedGroups: groupIds,
        selectedSubPaths: subPathIds,
        selectedCommands: [],
        selectedControlPoints: [],
        selectedTextSpans: []
      }
    }));
  };

  const startEditingName = (group: any) => {
    setEditingGroupId(group.id);
    setEditingName(group.name || '');
  };

  const saveGroupName = () => {
    if (editingGroupId) {
      updateGroup(editingGroupId, { name: editingName.trim() || 'Unnamed Group' });
    }
    setEditingGroupId(null);
    setEditingName('');
  };

  const cancelEditingName = () => {
    setEditingGroupId(null);
    setEditingName('');
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
    background: 'white'
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Crear nuevo grupo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          style={canCreateGroup ? buttonStyle : disabledButtonStyle}
          onClick={handleCreateGroup}
          disabled={!canCreateGroup}
          title={canCreateGroup ? "Crear grupo con elementos seleccionados" : "Selecciona elementos para crear un grupo"}
        >
          <Group size={16} /> Agrupar Selección
        </button>
        <button
          style={buttonStyle}
          onClick={handleCreateEmptyGroup}
          title="Crear nuevo grupo vacío"
        >
          <Plus size={16} /> Nuevo Grupo
        </button>
      </div>

      {/* Groups List */}
      {groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333' }}>
            Groups ({groups.length})
          </h4>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: '4px'
          }}>
            {groups.map(group => {
              // Depuración: mostrar IDs de paths disponibles y seleccionados
              const availablePathIds = (paths ?? []).map(p => p.id);
              const selectedPathIds = selection.selectedPaths ?? [];
              const isSelected = selection.selectedGroups.includes(group.id);
              const childrenDetails = getGroupChildrenDetails(group.id);
              // Elementos seleccionados que no están en el grupo
              const selectedToAdd: { id: string, type: 'path' | 'text' | 'group' }[] = [];
              (selection.selectedPaths ?? []).forEach(id => {
                if (!childrenDetails.some(child => child.id === id && child.type === 'path')) {
                  selectedToAdd.push({ id, type: 'path' });
                }
              });
              (selection.selectedTexts ?? []).forEach(id => {
                if (!childrenDetails.some(child => child.id === id && child.type === 'text')) {
                  selectedToAdd.push({ id, type: 'text' });
                }
              });
              (selection.selectedGroups ?? []).forEach(id => {
                // No permitir agregar el mismo grupo a sí mismo (evitar bucles)
                if (id !== group.id && !childrenDetails.some(child => child.id === id && child.type === 'group')) {
                  selectedToAdd.push({ id, type: 'group' });
                }
              });

              // Si hay sub-paths seleccionados, buscar el path subyacente y permitir agregarlo
              let subPathToAdd: { id: string, type: 'path' } | null = null;
              if (selection.selectedSubPaths && selection.selectedSubPaths.length > 0) {
                // Buscar el path que contiene ese sub-path
                const subPathId = selection.selectedSubPaths[0];
                const foundPath = (paths ?? []).find(p => p.subPaths.some(sp => sp.id === subPathId));
                if (foundPath && !childrenDetails.some(child => child.id === foundPath.id && child.type === 'path')) {
                  subPathToAdd = { id: foundPath.id, type: 'path' };
                }
              }

              // Calcular bbox y mostrar preview SVG
              const bbox = getGroupBBox(group);
              return (
                <div
                  key={group.id}
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: isSelected ? '#e3f2fd' : 'white'
                  }}
                >
                  {/* Group header with name and ID */}
                  <div style={{ marginBottom: '8px' }}>
                    {editingGroupId === group.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveGroupName();
                            } else if (e.key === 'Escape') {
                              cancelEditingName();
                            }
                          }}
                          onBlur={saveGroupName}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '2px 4px',
                            border: '1px solid #1976d2',
                            borderRadius: '2px',
                            fontSize: '13px',
                            fontWeight: 600
                          }}
                        />
                        <button
                          onClick={saveGroupName}
                          style={{
                            padding: '2px 6px',
                            border: 'none',
                            background: '#1976d2',
                            color: 'white',
                            borderRadius: '2px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditingName}
                          style={{
                            padding: '2px 6px',
                            border: 'none',
                            background: '#666',
                            color: 'white',
                            borderRadius: '2px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div 
                          onClick={() => handleSelectGroupElements(group)}
                          style={{ 
                            cursor: 'pointer',
                            flex: 1,
                            padding: '2px 4px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="Clic para seleccionar todos los elementos del grupo"
                        >
                          <div style={{ 
                            fontSize: '13px', 
                            fontWeight: 600, 
                            color: '#333',
                            marginBottom: '2px'
                          }}>
                            {group.name || 'Unnamed Group'}
                          </div>
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#888',
                            fontFamily: 'monospace'
                          }}>
                            ID: {group.id}
                          </div>
                        </div>
                        <button
                          onClick={() => startEditingName(group)}
                          style={{
                            padding: '2px 4px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: '#666',
                            fontSize: '12px'
                          }}
                          title="Editar nombre del grupo"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                    {group.children.length} element(s)
                    {bbox && (
                      <div style={{ margin: '6px 0', textAlign: 'center' }}>
                        {/* Preview SVG: centrado, padding, mínimo tamaño, fallback si bbox inválido */}
                        {(() => {
                          const PAD = 12;
                          let minW = Math.max(bbox.width, 16);
                          let minH = Math.max(bbox.height, 16);
                          let centerX = bbox.x + bbox.width / 2;
                          let centerY = bbox.y + bbox.height / 2;
                          if (!isFinite(centerX) || !isFinite(centerY)) {
                            centerX = 40;
                            centerY = 40;
                            minW = 16;
                            minH = 16;
                          }
                          const viewX = centerX - minW / 2 - PAD;
                          const viewY = centerY - minH / 2 - PAD;
                          const viewW = minW + PAD * 2;
                          const viewH = minH + PAD * 2;
                          let validElements = 0;
                          return (
                            <svg width={80} height={80} viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
                              style={{ border: '1px solid #bbb', borderRadius: '2px', background: '#fafafa' }}>
                              <rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="#e3f2fd" stroke="#1976d2" strokeWidth={1.5} />
                              {group.children.map((c: any, idx: number) => {
                                if (c.type === 'path') {
                                  const pathObj = paths.find((p: any) => p.id === c.id);
                                  const d = getPathD(pathObj);
                                  if (d) {
                                    validElements++;
                                    return (
                                      <path key={c.id} d={d} fill="none" stroke="#666" strokeWidth={1.5} />
                                    );
                                  } else {
                                    return (
                                      <rect key={c.id} x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="#ffcdd2" stroke="#d32f2f" strokeDasharray="2 2" strokeWidth={1} />
                                    );
                                  }
                                }
                                if (c.type === 'text' || c.type === 'multiline-text') {
                                  const textObj = (texts ?? []).find((t: any) => t.id === c.id);
                                  const bboxText = textObj ? textBBoxes[textObj.id] : null;
                                  const { rect, svg } = getTextRectAndSVG(textObj, bboxText);
                                  let textContent = '';
                                  if (textObj) {
                                    if (textObj.type === 'text') {
                                      textContent = textObj.content || '';
                                    } else if (textObj.type === 'multiline-text') {
                                      textContent = (textObj.spans && textObj.spans.length > 0)
                                        ? textObj.spans.map((span: any) => span.content).join(' ')
                                        : '';
                                    }
                                  }
                                  const fontSize = textObj && typeof textObj.fontSize === 'number' ? textObj.fontSize : 14;
                                  const fontFamily = textObj && typeof textObj.fontFamily === 'string' ? textObj.fontFamily : 'sans-serif';
                                  // Always render text if content exists
                                  if (textObj && textContent.trim().length > 0) {
                                    validElements++;
                                    return (
                                      <g key={c.id}>
                                        {svg}
                                        {rect && (
                                          <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="#ffe0b2" stroke="#ff9800" strokeWidth={1.5} />
                                        )}
                                        <text
                                          x={rect ? rect.x + rect.width / 2 : textObj.x}
                                          y={rect ? rect.y + rect.height / 2 : textObj.y}
                                          fontSize={fontSize}
                                          fill="#222"
                                          textAnchor={rect ? "middle" : "start"}
                                          alignmentBaseline={rect ? "middle" : "hanging"}
                                          dominantBaseline={rect ? "middle" : "hanging"}
                                          style={{ fontFamily, pointerEvents: 'none', userSelect: 'none' }}
                                        >
                                          {textContent}
                                        </text>
                                      </g>
                                    );
                                  } else {
                                    return null;
                                  }
                                }
                                if (c.type === 'group') {
                                  const groupObj = groups.find((g: any) => g.id === c.id);
                                  const groupBBox = getGroupBBox(groupObj);
                                  if (groupBBox) {
                                    validElements++;
                                    return (
                                      <rect key={c.id} x={groupBBox.x} y={groupBBox.y} width={groupBBox.width} height={groupBBox.height} fill="none" stroke="#8e24aa" strokeDasharray="3 2" strokeWidth={1.5} />
                                    );
                                  }
                                }
                                return null;
                              })}
                              <circle cx={centerX} cy={centerY} r={2.5} fill="#1976d2" />
                              {validElements === 0 && (
                                <text x={centerX} y={centerY} fontSize={8} fill="#d32f2f" textAnchor="middle" alignmentBaseline="middle">
                                  Sin elementos válidos
                                </text>
                              )}
                            </svg>
                          );
                        })()}
                        <div style={{ fontSize: '10px', color: '#1976d2' }}>
                          bbox: x={bbox.x.toFixed(1)}, y={bbox.y.toFixed(1)}, w={bbox.width.toFixed(1)}, h={bbox.height.toFixed(1)}
                        </div>
                      </div>
                    )}
                    {childrenDetails.length > 0 && (
                      <ul style={{ margin: '4px 0 0 0', padding: 0, listStyle: 'none' }}>
                        {childrenDetails.map((child, idx) => (
                          <li key={child.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#444', marginBottom: '2px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 56 }}>
                              <span style={{ fontWeight: 500, lineHeight: '13px' }}>{child.type}</span>
                              <span style={{ fontFamily: 'monospace', color: '#888', fontSize: '9px', lineHeight: '13px', whiteSpace:'nowrap' }}>{child.id}</span>
                            </div>
                            <button
                              style={{
                                padding: '2px 4px',
                                border: 'none',
                                background: '#f5f5f5',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                color: '#d32f2f'
                              }}
                              title={`Remove ${child.type} from group`}
                              onClick={() => removeChildFromGroup(group.id, child.id)}
                            >
                              del
                            </button>
                            <button
                              style={{
                                padding: '2px 4px',
                                border: 'none',
                                background: '#e3f2fd',
                                borderRadius: '2px',
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '10px',
                                color: '#1976d2',
                                opacity: idx === 0 ? 0.5 : 1
                              }}
                              title="Move up"
                              disabled={idx === 0}
                              onClick={() => moveChildInGroup(group.id, child.id, idx - 1)}
                            >
                              ↑
                            </button>
                            <button
                              style={{
                                padding: '2px 4px',
                                border: 'none',
                                background: '#e3f2fd',
                                borderRadius: '2px',
                                cursor: idx === childrenDetails.length - 1 ? 'not-allowed' : 'pointer',
                                fontSize: '10px',
                                color: '#1976d2',
                                opacity: idx === childrenDetails.length - 1 ? 0.5 : 1
                              }}
                              title="Move down"
                              disabled={idx === childrenDetails.length - 1}
                              onClick={() => moveChildInGroup(group.id, child.id, idx + 1)}
                            >
                              ↓
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Agregar elementos seleccionados al grupo */}
                    {selectedToAdd.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#1976d2' }}>
                        <span>Agregar seleccionados:</span>
                        {selectedToAdd.map(sel => (
                          <button
                            key={sel.id + sel.type}
                            style={{
                              marginLeft: '6px',
                              padding: '2px 6px',
                              border: '1px solid #1976d2',
                              borderRadius: '2px',
                              background: '#e3f2fd',
                              color: '#1976d2',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                            title={`Agregar ${sel.type} (${sel.id}) al grupo`}
                            onClick={() => addChildToGroup(group.id, sel.id, sel.type)}
                          >
                            {sel.type}: {sel.id}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Agregar path subyacente si hay sub-path seleccionado */}
                    {subPathToAdd && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#388e3c' }}>
                        <span>Agregar path de sub-path seleccionado:</span>
                        <button
                          style={{
                            marginLeft: '6px',
                            padding: '2px 6px',
                            border: '1px solid #388e3c',
                            borderRadius: '2px',
                            background: '#e8f5e9',
                            color: '#388e3c',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                          title={`Agregar path (${subPathToAdd.id}) al grupo`}
                          onClick={() => addChildToGroup(group.id, subPathToAdd.id, 'path')}
                        >
                          path: {subPathToAdd.id}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Controles de grupo restaurados */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <button
                      onClick={() => toggleGroupVisibility(group.id)}
                      style={{
                        padding: '4px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={group.visible !== false ? 'Ocultar grupo' : 'Mostrar grupo'}
                    >
                      {group.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button
                      onClick={() => lockGroup(group.id, !group.locked)}
                      style={{
                        padding: '4px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={group.locked ? 'Desbloquear grupo' : 'Bloquear grupo'}
                    >
                      {group.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <button
                      onClick={() => ungroupElements(group.id)}
                      style={{
                        padding: '4px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Desagrupar elementos"
                    >
                      <Ungroup size={12} />
                    </button>
                    <button
                      onClick={() => handleExportGroup(group.id)}
                      style={{
                        padding: '4px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#2196f3'
                      }}
                      title="Exportar grupo como SVG"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      style={{
                        padding: '4px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#f44336'
                      }}
                      title="Eliminar grupo (mantener elementos)"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ...existing code... */}
    </div>
  );
};