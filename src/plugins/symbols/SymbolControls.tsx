import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultSymbol, createDefaultUse } from '../../utils/svg-elements-utils';
import { PluginButton } from '../../components/PluginButton';
import { ElementPreview } from '../../components/ElementPreview';
import { Plus, Copy, Trash2, Box, Users } from 'lucide-react';

export const SymbolControls: React.FC = () => {
  const { 
    symbols,
    uses,
    selection, 
    paths,
    addSymbol, 
    updateSymbol, 
    removeSymbol,
    addUse,
    updateUse,
    removeUse,
    duplicateUse,
    removePath,
    removeSubPath
  } = useEditorStore();
  
  const [activeTab, setActiveTab] = useState<'symbols' | 'instances'>('symbols');

  const selectedSymbol = selection.selectedSymbols.length === 1 
    ? symbols.find(symbol => symbol.id === selection.selectedSymbols[0])
    : null;

  const selectedUse = selection.selectedUses.length === 1 
    ? uses.find(use => use.id === selection.selectedUses[0])
    : null;

  const selectedSubPaths = selection.selectedSubPaths;
  const hasSelection = selectedSubPaths.length > 0;

  const handleCreateSymbol = () => {
    addSymbol(createDefaultSymbol());
  };

  const handleCreateSymbolFromSelection = () => {
    if (selectedSubPaths.length === 0) {
      alert('Please select one or more sub-paths to create a symbol');
      return;
    }

    // Collect selected sub-paths data and calculate bounding box in one pass
    const selectedData: Array<{subPath: any, style: any}> = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (selectedSubPaths.includes(subPath.id)) {
          // Store the original data
          selectedData.push({
            subPath: subPath,
            style: path.style
          });

          // Calculate bounding box from commands
          subPath.commands.forEach((cmd: any) => {
            if (cmd.x !== undefined) {
              minX = Math.min(minX, cmd.x);
              maxX = Math.max(maxX, cmd.x);
            }
            if (cmd.y !== undefined) {
              minY = Math.min(minY, cmd.y);
              maxY = Math.max(maxY, cmd.y);
            }
            // Handle control points for curves
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
        }
      });
    });

    if (selectedData.length === 0) return;

    // If no valid coordinates found, use defaults
    let offsetX = 0, offsetY = 0, width = 100, height = 100;
    
    if (minX === Infinity) {
      // Use defaults for empty symbols
      offsetX = 0;
      offsetY = 0;
      width = 100;
      height = 100;
    } else {
      // Store original min values for normalization
      const originalMinX = minX;
      const originalMinY = minY;
      
      // Add padding to the bounds
      const padding = 10;
      width = (maxX - minX) + (padding * 2);
      height = (maxY - minY) + (padding * 2);
      
      // The offset is the original minimum minus the padding
      offsetX = originalMinX - padding;
      offsetY = originalMinY - padding;
    }

    // Now normalize the coordinates and create the symbol data
    const selectedSubPathsData = selectedData.map((data, index) => {
      const normalizedCommands = data.subPath.commands.map((cmd: any) => {
        const newCmd = { ...cmd };
        
        // Normalize main coordinates (subtract the offset to start from padding)
        if (newCmd.x !== undefined) newCmd.x = newCmd.x - offsetX;
        if (newCmd.y !== undefined) newCmd.y = newCmd.y - offsetY;
        
        // Normalize control points
        if (newCmd.x1 !== undefined) newCmd.x1 = newCmd.x1 - offsetX;
        if (newCmd.y1 !== undefined) newCmd.y1 = newCmd.y1 - offsetY;
        if (newCmd.x2 !== undefined) newCmd.x2 = newCmd.x2 - offsetX;
        if (newCmd.y2 !== undefined) newCmd.y2 = newCmd.y2 - offsetY;
        
        return newCmd;
      });

      return {
        type: 'path' as const,
        id: `symbol-${data.subPath.id}`,
        subPaths: [{
          ...data.subPath,
          commands: normalizedCommands
        }],
        style: data.style
      };
    });

    const symbolData = {
      ...createDefaultSymbol(),
      viewBox: `0 0 ${width} ${height}`,
      children: selectedSubPathsData
    };

    console.log('Creating symbol with data:', {
      viewBox: symbolData.viewBox,
      childrenCount: selectedSubPathsData.length,
      children: selectedSubPathsData
    });

    addSymbol(symbolData);
    
    // Optionally remove original sub-paths
    if (confirm('Remove original sub-paths from document? (they will be preserved in the symbol)')) {
      // Remove sub-paths directly
      selectedSubPaths.forEach(subPathId => {
        removeSubPath(subPathId);
      });
    }
  };

  const handleCreateInstance = (symbolId: string) => {
    const instanceData = createDefaultUse(`#${symbolId}`, 100, 100);
    addUse(instanceData);
  };

  const handleRemoveSymbol = (id: string) => {
    if (confirm('Are you sure you want to remove this symbol? All instances will be affected.')) {
      removeSymbol(id);
    }
  };

  const handleRemoveUse = (id: string) => {
    removeUse(id);
  };

  const handleUpdateSymbol = (symbolId: string, updates: any) => {
    updateSymbol(symbolId, updates);
  };

  const handleUpdateUse = (useId: string, updates: any) => {
    updateUse(useId, updates);
  };

  const totalElements = symbols.length + uses.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Type:
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <PluginButton
            icon={<Box size={12} />}
            text="Symbols"
            color="#28a745"
            active={activeTab === 'symbols'}
            onPointerDown={() => setActiveTab('symbols')}
          />
          <PluginButton
            icon={<Users size={12} />}
            text="Instances"
            color="#28a745"
            active={activeTab === 'instances'}
            onPointerDown={() => setActiveTab('instances')}
          />
        </div>
      </div>

      {/* Symbols Tab */}
      {activeTab === 'symbols' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Create Symbol */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Create Symbol:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <PluginButton
                icon={<Plus size={12} />}
                text={hasSelection 
                  ? `From Selection (${selectedSubPaths.length})`
                  : 'From Selection (none)'
                }
                color={hasSelection ? '#17a2b8' : '#6c757d'}
                disabled={!hasSelection}
                onPointerDown={handleCreateSymbolFromSelection}
              />
              <PluginButton
                icon={<Plus size={12} />}
                text="Empty Symbol"
                color="#17a2b8"
                onPointerDown={handleCreateSymbol}
              />
            </div>
          </div>

          {/* Symbol List */}
          {symbols.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                Symbols ({symbols.length}):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflow: 'auto' }}>
                {symbols.map((symbol) => (
                  <div
                    key={symbol.id}
                    style={{
                      padding: '8px',
                      backgroundColor: selection.selectedSymbols.includes(symbol.id) ? '#e3f2fd' : '#f8f9fa',
                      borderRadius: '4px',
                      border: selection.selectedSymbols.includes(symbol.id) ? '1px solid #1976d2' : '1px solid #e9ecef'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <ElementPreview 
                        elementId={symbol.id} 
                        elementType="symbol" 
                        size={48}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>
                            Symbol #{symbol.id.slice(-6)}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleCreateInstance(symbol.id)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                border: '1px solid #007bff',
                                backgroundColor: '#fff',
                                color: '#007bff',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                              title="Create instance"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => handleRemoveSymbol(symbol.id)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                border: '1px solid #dc3545',
                                backgroundColor: '#fff',
                                color: '#dc3545',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>
                          {symbol.children.length} element{symbol.children.length !== 1 ? 's' : ''}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>
                          ViewBox: {symbol.viewBox || 'none'}
                        </div>
                        {symbol.children.some((child: any) => child.type === 'path') && (
                          <div style={{ fontSize: '9px', color: '#999', fontFamily: 'monospace', marginTop: '4px' }}>
                            <div style={{ fontWeight: '500', marginBottom: '2px' }}>Path Commands:</div>
                            {symbol.children
                              .filter((child: any) => child.type === 'path')
                              .map((pathChild: any, index: number) => {
                                const pathData = pathChild.subPaths?.map((subPath: any) => 
                                  subPath.commands?.map((cmd: any) => {
                                    switch (cmd.command) {
                                      case 'M':
                                        return `M ${(cmd.x || 0).toFixed(1)} ${(cmd.y || 0).toFixed(1)}`;
                                      case 'L':
                                        return `L ${(cmd.x || 0).toFixed(1)} ${(cmd.y || 0).toFixed(1)}`;
                                      case 'C':
                                        return `C ${(cmd.x1 || 0).toFixed(1)} ${(cmd.y1 || 0).toFixed(1)} ${(cmd.x2 || 0).toFixed(1)} ${(cmd.y2 || 0).toFixed(1)} ${(cmd.x || 0).toFixed(1)} ${(cmd.y || 0).toFixed(1)}`;
                                      case 'Z':
                                        return 'Z';
                                      default:
                                        return '';
                                    }
                                  }).join(' ')
                                ).join(' ') || 'M 0 0';
                                
                                return (
                                  <div key={index} style={{ 
                                    marginBottom: '2px', 
                                    wordBreak: 'break-all',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {pathData.length > 60 ? `${pathData.substring(0, 60)}...` : pathData}
                                  </div>
                                );
                              })
                            }
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Symbol Properties Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: '#666' }}>ViewBox</label>
                        <input
                          type="text"
                          value={symbol.viewBox || ''}
                          onChange={(e) => handleUpdateSymbol(symbol.id, { 
                            viewBox: e.target.value 
                          })}
                          placeholder="0 0 100 100"
                          style={{
                            width: '100%',
                            padding: '4px',
                            fontSize: '11px',
                            border: '1px solid #ddd',
                            borderRadius: '3px'
                          }}
                        />
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666' }}>X Position</label>
                          <input
                            type="number"
                            value={0}
                            onChange={(e) => handleUpdateSymbol(symbol.id, { 
                              viewBox: symbol.viewBox || "0 0 100 100"
                            })}
                            style={{
                              width: '100%',
                              padding: '4px',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666' }}>Y Position</label>
                          <input
                            type="number"
                            value={0}
                            onChange={(e) => handleUpdateSymbol(symbol.id, { 
                              viewBox: symbol.viewBox || "0 0 100 100"
                            })}
                            style={{
                              width: '100%',
                              padding: '4px',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666' }}>Width</label>
                          <input
                            type="number"
                            min="1"
                            value={100}
                            onChange={(e) => handleUpdateSymbol(symbol.id, { 
                              viewBox: symbol.viewBox || "0 0 100 100"
                            })}
                            style={{
                              width: '100%',
                              padding: '4px',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666' }}>Height</label>
                          <input
                            type="number"
                            min="1"
                            value={100}
                            onChange={(e) => handleUpdateSymbol(symbol.id, { 
                              viewBox: symbol.viewBox || "0 0 100 100"
                            })}
                            style={{
                              width: '100%',
                              padding: '4px',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instances Tab */}
      {activeTab === 'instances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Instances Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Symbol Instances:
            </span>
            <div style={{ fontSize: '11px', color: '#999' }}>
              Instances reference symbols and can be positioned independently
            </div>
          </div>

          {/* Instance List */}
          {uses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                Instances ({uses.length}):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflow: 'auto' }}>
                {uses.map((use) => {
                  const referencedSymbol = symbols.find(s => use.href === `#${s.id}`);
                  return (
                    <div
                      key={use.id}
                      style={{
                        padding: '8px',
                        backgroundColor: selection.selectedUses.includes(use.id) ? '#e3f2fd' : '#f8f9fa',
                        borderRadius: '4px',
                        border: selection.selectedUses.includes(use.id) ? '1px solid #1976d2' : '1px solid #e9ecef'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        {referencedSymbol && (
                          <ElementPreview 
                            elementId={referencedSymbol.id} 
                            elementType="symbol" 
                            size={40}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <div style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>
                              Instance #{use.id.slice(-6)}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => duplicateUse(use.id)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '10px',
                                  border: '1px solid #6c757d',
                                  backgroundColor: '#fff',
                                  color: '#6c757d',
                                  borderRadius: '3px',
                                  cursor: 'pointer'
                                }}
                                title="Duplicate"
                              >
                                ⧉
                              </button>
                              <button
                                onClick={() => handleRemoveUse(use.id)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '10px',
                                  border: '1px solid #dc3545',
                                  backgroundColor: '#fff',
                                  color: '#dc3545',
                                  borderRadius: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>
                            Ref: {use.href}
                          </div>
                          <div style={{ fontSize: '10px', color: '#999' }}>
                            Position: ({use.x || 0}, {use.y || 0})
                          </div>
                        </div>
                      </div>
                    
                    {/* Instance Properties Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666' }}>X Position</label>
                          <input
                            type="number"
                            value={use.x || 0}
                            onChange={(e) => handleUpdateUse(use.id, { 
                              x: Number(e.target.value) || 0 
                            })}
                            style={{
                              width: '100%',
                              padding: '4px',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666' }}>Y Position</label>
                          <input
                            type="number"
                            value={use.y || 0}
                            onChange={(e) => handleUpdateUse(use.id, { 
                              y: Number(e.target.value) || 0 
                            })}
                            style={{
                              width: '100%',
                              padding: '4px',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666' }}>Width</label>
                          <input
                            type="number"
                            min="1"
                            value={use.width || 100}
                            onChange={(e) => handleUpdateUse(use.id, { 
                              width: Number(e.target.value) || 100 
                            })}
                            style={{
                              width: '100%',
                              padding: '4px',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666' }}>Height</label>
                          <input
                            type="number"
                            min="1"
                            value={use.height || 100}
                            onChange={(e) => handleUpdateUse(use.id, { 
                              height: Number(e.target.value) || 100 
                            })}
                            style={{
                              width: '100%',
                              padding: '4px',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label style={{ fontSize: '10px', color: '#666' }}>Transform</label>
                        <input
                          type="text"
                          value={use.transform || ''}
                          onChange={(e) => handleUpdateUse(use.id, { 
                            transform: e.target.value 
                          })}
                          placeholder="rotate(45) scale(1.5)"
                          style={{
                            width: '100%',
                            padding: '4px',
                            fontSize: '11px',
                            border: '1px solid #ddd',
                            borderRadius: '3px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ 
              fontSize: '11px', 
              color: '#999', 
              textAlign: 'center', 
              padding: '16px' 
            }}>
              No instances created yet. Create a symbol first, then use the "Use" button to create instances.
            </div>
          )}
        </div>
      )}

      {/* Usage Instructions */}
      <div style={{ 
        padding: '8px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '11px',
        color: '#666'
      }}>
        <div>• Create symbols to reuse complex graphics efficiently</div>
        <div>• Use instances to place symbols multiple times</div>
        <div>• Modify symbol content to update all instances</div>
        <div>• Edit symbol viewBox and dimensions for proper scaling</div>
        <div>• Transform instances with position, size, and rotation</div>
      </div>
    </div>
  );
};