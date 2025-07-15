import React, { useState } from 'react';
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
  Edit3
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
    createGroup
  } = useEditorStore();
  
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Check if there's a selection that can be grouped
  const canCreateGroup = (selection.selectedPaths ?? []).length > 0 || 
                        (selection.selectedTexts ?? []).length > 0 || 
                        (selection.selectedGroups ?? []).length > 0;

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
      
      {/* Group Creation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333' }}>
          Create Groups
        </h4>
        
        <button
          style={canCreateGroup ? buttonStyle : disabledButtonStyle}
          onClick={handleCreateGroup}
          disabled={!canCreateGroup}
          title="Group selected elements"
        >
          <Group size={16} />
          Group Selection
        </button>
        
        <button
          style={buttonStyle}
          onClick={handleCreateEmptyGroup}
          title="Create empty group"
        >
          <Plus size={16} />
          New Empty Group
        </button>
      </div>

      {/* Group Operations */}
      {canUngroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333' }}>
            Group Operations
          </h4>
          
          <button
            style={buttonStyle}
            onClick={handleUngroupSelected}
            title="Ungroup selected groups"
          >
            <Ungroup size={16} />
            Ungroup Selected
          </button>
        </div>
      )}

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
              const isSelected = selection.selectedGroups.includes(group.id);
              
              return (
                <div
                  key={group.id}
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: isSelected ? '#e3f2fd' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {editingGroupId === group.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveGroupName();
                            if (e.key === 'Escape') cancelEditingName();
                          }}
                          onBlur={saveGroupName}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '2px 4px',
                            fontSize: '12px',
                            border: '1px solid #2196F3',
                            borderRadius: '2px'
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <span 
                          style={{ 
                            flex: 1, 
                            fontSize: '12px', 
                            fontWeight: isSelected ? 600 : 400,
                            cursor: 'pointer'
                          }}
                          onClick={() => startEditingName(group)}
                          title="Click to rename"
                        >
                          {group.name || 'Unnamed Group'}
                        </span>
                        <button
                          onClick={() => startEditingName(group)}
                          style={{
                            padding: '2px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer'
                          }}
                          title="Rename group"
                        >
                          <Edit3 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                    {group.children.length} element(s)
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
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
                      title={group.visible !== false ? 'Hide group' : 'Show group'}
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
                      title={group.locked ? 'Unlock group' : 'Lock group'}
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
                      title="Ungroup elements"
                    >
                      <Ungroup size={12} />
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
                      title="Delete group (keep elements)"
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
      
      {groups.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          color: '#666', 
          fontSize: '12px',
          padding: '20px',
          fontStyle: 'italic'
        }}>
          No groups created yet.
          <br />
          Select elements and click "Group Selection" to create a group.
        </div>
      )}
    </div>
  );
};