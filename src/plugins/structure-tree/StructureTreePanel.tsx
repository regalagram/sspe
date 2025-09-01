import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { TreeNode } from './TreeNode';
import { TreeItem, buildTreeStructure } from './TreeUtils';
import { RefreshCw } from 'lucide-react';
import './tree-styles.css';

export const StructureTreePanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const { 
    paths, 
    texts, 
    groups, 
    images, 
    symbols, 
    uses,
    renderVersion 
  } = useEditorStore();

  // Build the tree structure from all elements
  const treeStructure = buildTreeStructure({
    paths,
    texts,
    groups,
    images,
    symbols,
    uses
  });

  // Calculate command count
  const commandCount = paths.reduce((total, path) => {
    return total + path.subPaths.reduce((subTotal, subPath) => {
      return subTotal + subPath.commands.length;
    }, 0);
  }, 0);

  // Filter tree based on search query
  const filteredTree = searchQuery 
    ? filterTreeBySearch(treeStructure, searchQuery)
    : treeStructure;

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allNodeIds = getAllNodeIds(treeStructure);
    setExpandedNodes(new Set(allNodeIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  return (
    <div className="structure-tree-panel">
      <div className="p-1 space-y-1">
        {/* Search and Controls */}
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          
          <div className="flex justify-between">
            <button
              onClick={expandAll}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Collapse All
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-xs px-1 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              title="Refresh"
            >
              <RefreshCw size={10} />
            </button>
          </div>
        </div>

        {/* Tree Structure */}
        <div className="max-h-80 overflow-y-auto" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
          {filteredTree.length === 0 ? (
            <div className="text-xs text-gray-500 italic py-1 text-center">
              {searchQuery ? 'No elements found' : 'No elements in document'}
            </div>
          ) : (
            <div>
              {filteredTree.map((item) => (
                <TreeNode
                  key={item.id}
                  item={item}
                  level={0}
                  expandedNodes={expandedNodes}
                  onToggleExpanded={toggleExpanded}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="text-xs text-gray-500 pt-1 border-t">
          <div className="whitespace-nowrap overflow-hidden" style={{ display: 'flex', gap: '4px' }}>
            <span title="Paths (rutas)">P:{paths.length}</span>
            <span title="SubPaths (sub-rutas)">S:{paths.reduce((total, path) => total + path.subPaths.length, 0)}</span>
            <span title="Commands (puntos de comando)">C:{commandCount}</span>
            <span title="Texts (textos)">T:{texts.length}</span>
            <span title="Groups (grupos)">G:{groups.length}</span>
            <span title="Images (imágenes)">I:{images.length}</span>
            <span title="Symbols (símbolos)">Y:{symbols.length}</span>
            <span title="Uses (usos)">U:{uses.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to filter tree by search query
function filterTreeBySearch(tree: TreeItem[], query: string): TreeItem[] {
  const lowerQuery = query.toLowerCase();
  
  const filterNode = (item: TreeItem): TreeItem | null => {
    const matchesName = item.name.toLowerCase().includes(lowerQuery);
    const matchesType = item.type.toLowerCase().includes(lowerQuery);
    const matchesId = item.id.toLowerCase().includes(lowerQuery);
    
    const filteredChildren = item.children
      .map(child => filterNode(child))
      .filter(Boolean) as TreeItem[];
    
    const hasMatchingChildren = filteredChildren.length > 0;
    const currentMatches = matchesName || matchesType || matchesId;
    
    if (currentMatches || hasMatchingChildren) {
      return {
        ...item,
        children: filteredChildren
      };
    }
    
    return null;
  };
  
  return tree.map(item => filterNode(item)).filter(Boolean) as TreeItem[];
}

// Helper function to get all node IDs for expand/collapse all
function getAllNodeIds(tree: TreeItem[]): string[] {
  const ids: string[] = [];
  
  const collectIds = (items: TreeItem[]) => {
    items.forEach(item => {
      ids.push(item.id);
      if (item.children.length > 0) {
        collectIds(item.children);
      }
    });
  };
  
  collectIds(tree);
  return ids;
}