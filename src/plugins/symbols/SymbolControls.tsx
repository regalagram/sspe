import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultSymbol, createDefaultUse } from '../../utils/svg-elements-utils';
import { PluginButton } from '../../components/PluginButton';
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

    // Get selected sub-paths data from all paths
    const selectedSubPathsData: any[] = [];
    paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (selectedSubPaths.includes(subPath.id)) {
          selectedSubPathsData.push({
            type: 'path' as const,
            id: `symbol-${subPath.id}`,
            subPaths: [subPath], // Each selected sub-path becomes a separate path in the symbol
            style: path.style
          });
        }
      });
    });

    if (selectedSubPathsData.length === 0) return;

    // Calculate bounding box for viewBox (simplified approximation)
    let minX = 0, minY = 0, maxX = 100, maxY = 100;

    const symbolData = {
      ...createDefaultSymbol(),
      viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
      children: selectedSubPathsData
    };

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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {symbol.children.length} elements
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>
                          ViewBox: {symbol.viewBox || 'none'}
                        </div>
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
                {uses.map((use) => (
                  <div
                    key={use.id}
                    style={{
                      padding: '8px',
                      backgroundColor: selection.selectedUses.includes(use.id) ? '#e3f2fd' : '#f8f9fa',
                      borderRadius: '4px',
                      border: selection.selectedUses.includes(use.id) ? '1px solid #1976d2' : '1px solid #e9ecef'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          Ref: {use.href}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>
                          Position: ({use.x || 0}, {use.y || 0})
                        </div>
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
                ))}
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