import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { AccordionToggleButton } from '../../components/AccordionPanel';
import { TreeNode } from './TreeNode';
import { TreeItem, buildTreeStructure } from './TreeUtils';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import './tree-styles.css';

export const StructureTreePanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="structure-tree-panel border-b border-gray-200">
      <AccordionToggleButton
        title="Structure Tree"
        isExpanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <div className="p-3 space-y-3">
        {/* Search and Controls */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search elements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
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
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              title="Refresh"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Tree Structure */}
        <div className="tree-container max-h-96 overflow-y-auto">
          {filteredTree.length === 0 ? (
            <div className="text-sm text-gray-500 italic py-4 text-center">
              {searchQuery ? 'No elements found' : 'No elements in document'}
            </div>
          ) : (
            <div className="space-y-1">
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
        <div className="text-xs text-gray-500 pt-2 border-t">
          <div className="grid grid-cols-2 gap-1">
            <div>Paths: {paths.length}</div>
            <div>Texts: {texts.length}</div>
            <div>Groups: {groups.length}</div>
            <div>Images: {images.length}</div>
            <div>Symbols: {symbols.length}</div>
            <div>Uses: {uses.length}</div>
          </div>
        </div>
        </div>
      )}
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