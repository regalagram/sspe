import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultSymbol, createDefaultUse } from '../../utils/svg-elements-utils';
import { AccordionToggleButton } from '../../components/AccordionPanel';

export const SymbolControls: React.FC = () => {
  const { 
    symbols,
    uses,
    selection, 
    addSymbol, 
    updateSymbol, 
    removeSymbol,
    addUse,
    updateUse,
    removeUse,
    duplicateUse
  } = useEditorStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'symbols' | 'instances'>('symbols');

  const selectedSymbol = selection.selectedSymbols.length === 1 
    ? symbols.find(symbol => symbol.id === selection.selectedSymbols[0])
    : null;

  const selectedUse = selection.selectedUses.length === 1 
    ? uses.find(use => use.id === selection.selectedUses[0])
    : null;

  const handleCreateSymbol = () => {
    addSymbol(createDefaultSymbol());
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

  const handleSymbolPropertyChange = (id: string, property: string, value: any) => {
    updateSymbol(id, { [property]: value });
  };

  const handleUsePropertyChange = (id: string, property: string, value: any) => {
    updateUse(id, { [property]: value });
  };

  const totalElements = symbols.length + uses.length;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <AccordionToggleButton
        isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Symbols & Library"
        badge={totalElements > 0 ? totalElements : undefined}
      />
      
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Tab Navigation */}
          <div className="flex border border-gray-200 rounded overflow-hidden">
            <button
              onClick={() => setActiveTab('symbols')}
              className={`flex-1 px-3 py-2 text-sm ${
                activeTab === 'symbols'
                  ? 'bg-blue-50 text-blue-700 border-r border-gray-200'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Symbols ({symbols.length})
            </button>
            <button
              onClick={() => setActiveTab('instances')}
              className={`flex-1 px-3 py-2 text-sm ${
                activeTab === 'instances'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Instances ({uses.length})
            </button>
          </div>

          {/* Symbols Tab */}
          {activeTab === 'symbols' && (
            <div className="space-y-4">
              {/* Create Symbol */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Symbol Library</h4>
                <button
                  onClick={handleCreateSymbol}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Create Symbol
                </button>
              </div>

              {/* Symbol List */}
              {symbols.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Symbols ({symbols.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {symbols.map((symbol) => (
                      <div
                        key={symbol.id}
                        className={`border border-gray-200 rounded p-2 ${
                          selection.selectedSymbols.includes(symbol.id)
                            ? 'border-blue-300 bg-blue-50'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600">
                              {symbol.children.length} elements
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              ViewBox: {symbol.viewBox || 'none'}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCreateInstance(symbol.id)}
                              className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                              title="Create instance"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => handleRemoveSymbol(symbol.id)}
                              className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Symbol Properties */}
              {selectedSymbol && (
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Symbol Properties</h4>
                  
                  {/* ViewBox */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">ViewBox</label>
                    <input
                      type="text"
                      value={selectedSymbol.viewBox || ''}
                      onChange={(e) => handleSymbolPropertyChange(selectedSymbol.id, 'viewBox', e.target.value)}
                      placeholder="0 0 100 100"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>

                  {/* Preserve Aspect Ratio */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Preserve Aspect Ratio</label>
                    <select
                      value={selectedSymbol.preserveAspectRatio || 'xMidYMid meet'}
                      onChange={(e) => handleSymbolPropertyChange(selectedSymbol.id, 'preserveAspectRatio', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="none">None</option>
                      <option value="xMinYMin meet">Top Left (meet)</option>
                      <option value="xMidYMin meet">Top Center (meet)</option>
                      <option value="xMaxYMin meet">Top Right (meet)</option>
                      <option value="xMinYMid meet">Center Left (meet)</option>
                      <option value="xMidYMid meet">Center (meet)</option>
                      <option value="xMaxYMid meet">Center Right (meet)</option>
                      <option value="xMinYMax meet">Bottom Left (meet)</option>
                      <option value="xMidYMax meet">Bottom Center (meet)</option>
                      <option value="xMaxYMax meet">Bottom Right (meet)</option>
                      <option value="xMidYMid slice">Center (slice)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instances Tab */}
          {activeTab === 'instances' && (
            <div className="space-y-4">
              {/* Instances Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Symbol Instances</h4>
                <div className="text-xs text-gray-500">
                  Instances reference symbols and can be positioned independently
                </div>
              </div>

              {/* Instance List */}
              {uses.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Instances ({uses.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uses.map((use) => (
                      <div
                        key={use.id}
                        className={`border border-gray-200 rounded p-2 ${
                          selection.selectedUses.includes(use.id)
                            ? 'border-blue-300 bg-blue-50'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600">
                              Ref: {use.href}
                            </div>
                            <div className="text-xs text-gray-500">
                              Position: ({use.x || 0}, {use.y || 0})
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => duplicateUse(use.id)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              title="Duplicate"
                            >
                              ⧉
                            </button>
                            <button
                              onClick={() => handleRemoveUse(use.id)}
                              className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-4">
                  No instances created yet. Create a symbol first, then use the "Use" button to create instances.
                </div>
              )}

              {/* Selected Use Properties */}
              {selectedUse && (
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Instance Properties</h4>
                  
                  {/* Position */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">X</label>
                      <input
                        type="number"
                        value={selectedUse.x || 0}
                        onChange={(e) => handleUsePropertyChange(selectedUse.id, 'x', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Y</label>
                      <input
                        type="number"
                        value={selectedUse.y || 0}
                        onChange={(e) => handleUsePropertyChange(selectedUse.id, 'y', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Dimensions (optional override) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Width</label>
                      <input
                        type="number"
                        value={selectedUse.width || ''}
                        onChange={(e) => handleUsePropertyChange(selectedUse.id, 'width', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Auto"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Height</label>
                      <input
                        type="number"
                        value={selectedUse.height || ''}
                        onChange={(e) => handleUsePropertyChange(selectedUse.id, 'height', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Auto"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Transform */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Transform</label>
                    <input
                      type="text"
                      value={selectedUse.transform || ''}
                      onChange={(e) => handleUsePropertyChange(selectedUse.id, 'transform', e.target.value)}
                      placeholder="rotate(45) scale(2)"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>

                  {/* Reference */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Reference</label>
                    <select
                      value={selectedUse.href}
                      onChange={(e) => handleUsePropertyChange(selectedUse.id, 'href', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      {symbols.map((symbol) => (
                        <option key={symbol.id} value={`#${symbol.id}`}>
                          Symbol ({symbol.children.length} elements)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Usage Instructions */}
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div>• Create symbols to reuse complex graphics efficiently</div>
              <div>• Use instances to place symbols multiple times</div>
              <div>• Modify symbol content to update all instances</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};