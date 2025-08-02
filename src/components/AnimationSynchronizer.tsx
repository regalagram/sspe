import React, { useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { AnimationChain, AnimationEvent } from '../types';
import { Play, Pause, Square, Link, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export const AnimationSynchronizer: React.FC = () => {
  const {
    animations,
    animationState,
    animationSync,
    createAnimationChain,
    removeAnimationChain,
    updateAnimationChain,
    updateChainAnimationDelay,
    updateChainAnimationTrigger,
    processAnimationEvents,
    playAnimations,
    pauseAnimations,
    stopAnimations
  } = useEditorStore();

  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());
  const [showCreateChain, setShowCreateChain] = useState(false);
  const [newChainName, setNewChainName] = useState('');
  const [selectedAnimations, setSelectedAnimations] = useState<string[]>([]);
  const [chainType, setChainType] = useState<'sequential' | 'parallel' | 'custom'>('sequential');
  const [editingChainName, setEditingChainName] = useState<string | null>(null);
  const [editChainNameValue, setEditChainNameValue] = useState('');

  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    margin: '2px',
    fontSize: '10px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    cursor: 'pointer',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#007bff',
    color: 'white',
    border: '1px solid #007bff'
  };

  const generateSuggestedChainName = () => {
    // Extract numbers from existing chain names that follow the pattern "Chain X"
    const existingChainNumbers = animationSync.chains
      .map(chain => {
        if (!chain.name) return 0;
        const match = chain.name.match(/^Chain (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);
    
    // Find the next available number
    const nextNumber = existingChainNumbers.length > 0 ? Math.max(...existingChainNumbers) + 1 : 1;
    return `Chain ${nextNumber}`;
  };

  const handleCreateChain = () => {
    if (!newChainName || selectedAnimations.length === 0) {
      alert('Please enter a chain name and select animations');
      return;
    }

    let chainAnimations: any[] = [];

    switch (chainType) {
      case 'sequential':
        chainAnimations = selectedAnimations.map((animId, index) => ({
          animationId: animId,
          delay: index * 0.5, // Stagger by 0.5s
          trigger: index === 0 ? 'start' as const : 'end' as const,
          dependsOn: index > 0 ? selectedAnimations[index - 1] : undefined,
        }));
        break;
      
      case 'parallel':
        chainAnimations = selectedAnimations.map((animId) => ({
          animationId: animId,
          delay: 0, // All start together
          trigger: 'start' as const,
        }));
        break;
      
      case 'custom':
        // For custom, user would need to define individually
        chainAnimations = selectedAnimations.map((animId, index) => ({
          animationId: animId,
          delay: index * 0.2, // Default small stagger
          trigger: 'start' as const,
        }));
        break;
    }

    createAnimationChain(newChainName, chainAnimations);
    setNewChainName('');
    setSelectedAnimations([]);
    setShowCreateChain(false);
  };

  const handleDeleteChain = (chainId: string) => {
    if (confirm('Are you sure you want to delete this animation chain?')) {
      removeAnimationChain(chainId);
      if (selectedChain === chainId) {
        setSelectedChain(null);
      }
    }
  };

  const toggleChainExpanded = (chainId: string) => {
    const newExpanded = new Set(expandedChains);
    if (newExpanded.has(chainId)) {
      newExpanded.delete(chainId);
    } else {
      newExpanded.add(chainId);
    }
    setExpandedChains(newExpanded);
  };

  const getAnimationName = (animId: string) => {
    const anim = animations.find(a => a.id === animId);
    if (!anim) return animId.slice(-8);
    return `${anim.type} - ${(anim as any).attributeName || (anim as any).transformType || 'motion'}`;
  };

  const getAnimationTarget = (animId: string) => {
    const anim = animations.find(a => a.id === animId);
    if (!anim) return 'unknown';
    
    // All animation types have targetElementId property
    const targetId = anim.targetElementId;
    if (!targetId) return 'unknown';
    
    // Return last 8 characters for display
    return targetId.length > 8 ? targetId.slice(-8) : targetId;
  };

  return (
    <div style={{ fontSize: '11px' }}>
      {/* Header */}
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link size={14} />
        Animation Synchronization
      </div>

      {/* Global playback controls */}
      <div style={{ marginBottom: '12px', padding: '6px', backgroundColor: '#f9f9f9', borderRadius: '3px' }}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Global Controls</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={animationState.isPlaying ? activeButtonStyle : buttonStyle}
            onClick={animationState.isPlaying ? pauseAnimations : playAnimations}
          >
            {animationState.isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {animationState.isPlaying ? 'Pause' : 'Play'}
          </button>
          <button style={buttonStyle} onClick={stopAnimations}>
            <Square size={12} />
            Stop
          </button>
          <button style={buttonStyle} onClick={processAnimationEvents}>
            Sync Events
          </button>
        </div>
      </div>

      {/* Create Chain Section */}
      <div style={{ marginBottom: '12px' }}>
        <button
          style={showCreateChain ? activeButtonStyle : buttonStyle}
          onClick={() => {
            if (!showCreateChain) {
              // When opening the form, suggest a name if none exists
              if (!newChainName) {
                setNewChainName(generateSuggestedChainName());
              }
            }
            setShowCreateChain(!showCreateChain);
          }}
        >
          <Link size={12} />
          {showCreateChain ? 'Hide' : 'Create'} Chain
        </button>

        {showCreateChain && (
          <div style={{ marginTop: '8px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                Chain Name:
              </label>
              <input
                type="text"
                value={newChainName}
                onChange={(e) => setNewChainName(e.target.value)}
                placeholder="My Animation Sequence"
                style={{ width: '100%', padding: '4px', fontSize: '10px' }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                Chain Type:
              </label>
              <select
                value={chainType}
                onChange={(e) => setChainType(e.target.value as any)}
                style={{ width: '100%', padding: '4px', fontSize: '10px' }}
              >
                <option value="sequential">Sequential (one after another)</option>
                <option value="parallel">Parallel (all together)</option>
                <option value="custom">Custom timing</option>
              </select>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold' }}>
                  Select Animations:
                </label>
                <button
                  style={{
                    ...buttonStyle,
                    padding: '2px 6px',
                    fontSize: '9px',
                    backgroundColor: selectedAnimations.length === animations.length ? '#dc3545' : '#28a745',
                    color: 'white',
                    border: selectedAnimations.length === animations.length ? '1px solid #dc3545' : '1px solid #28a745'
                  }}
                  onClick={() => {
                    if (selectedAnimations.length === animations.length) {
                      setSelectedAnimations([]);
                    } else {
                      setSelectedAnimations(animations.map(anim => anim.id));
                    }
                  }}
                >
                  {selectedAnimations.length === animations.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ maxHeight: '100px', overflow: 'auto', border: '1px solid #ddd', padding: '4px', backgroundColor: '#fff' }}>
                {animations.map(anim => (
                  <label key={anim.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', marginBottom: '2px' }}>
                    <input
                      type="checkbox"
                      checked={selectedAnimations.includes(anim.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAnimations([...selectedAnimations, anim.id]);
                        } else {
                          setSelectedAnimations(selectedAnimations.filter(id => id !== anim.id));
                        }
                      }}
                    />
                    <span>{getAnimationName(anim.id)}</span>
                    <span style={{ color: '#666' }}>({getAnimationTarget(anim.id)})</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              style={{ ...buttonStyle, width: '100%', justifyContent: 'center', backgroundColor: '#28a745', color: 'white', border: '1px solid #28a745' }}
              onClick={handleCreateChain}
            >
              Create Chain
            </button>
          </div>
        )}
      </div>

      {/* Animation Chains List */}
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          Animation Chains ({animationSync.chains.length})
        </div>

        {animationSync.chains.length === 0 ? (
          <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
            No animation chains created yet
          </div>
        ) : (
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {animationSync.chains.map((chain: AnimationChain) => (
              <div key={chain.id} style={{
                marginBottom: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#fff'
              }}>
                {/* Chain Header */}
                <div style={{
                  padding: '6px',
                  backgroundColor: selectedChain === chain.id ? '#e3f2fd' : '#f8f9fa',
                  borderRadius: '4px 4px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }} onClick={() => toggleChainExpanded(chain.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    {expandedChains.has(chain.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    
                    {/* Editable chain name */}
                    {editingChainName === chain.id ? (
                      <input
                        type="text"
                        value={editChainNameValue}
                        onChange={(e) => setEditChainNameValue(e.target.value)}
                        onBlur={() => {
                          updateAnimationChain(chain.id, { name: editChainNameValue });
                          setEditingChainName(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateAnimationChain(chain.id, { name: editChainNameValue });
                            setEditingChainName(null);
                          }
                          if (e.key === 'Escape') {
                            setEditingChainName(null);
                            setEditChainNameValue(chain.name || `Chain ${chain.id.slice(-8)}`);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontWeight: 'bold',
                          fontSize: '10px',
                          padding: '2px 4px',
                          border: '1px solid #007bff',
                          borderRadius: '2px',
                          minWidth: '100px'
                        }}
                        autoFocus
                      />
                    ) : (
                      <span 
                        style={{ fontWeight: 'bold', fontSize: '10px', cursor: 'text' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingChainName(chain.id);
                          setEditChainNameValue(chain.name || `Chain ${chain.id.slice(-8)}`);
                        }}
                      >
                        {chain.name || `Chain ${chain.id.slice(-8)}`}
                      </span>
                    )}
                    
                    <span style={{ color: '#666', fontSize: '9px' }}>({chain.animations.length} animations)</span>
                  </div>
                  <button
                    style={{ ...buttonStyle, padding: '2px 4px', backgroundColor: '#dc3545', color: 'white', border: '1px solid #dc3545' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChain(chain.id);
                    }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

                {/* Chain Content */}
                {expandedChains.has(chain.id) && (
                  <div style={{ padding: '6px' }}>
                    {chain.animations.map((chainAnim, index) => (
                      <div key={`${chainAnim.animationId}-${index}`} style={{
                        padding: '6px',
                        marginBottom: '6px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '3px',
                        fontSize: '9px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          {index + 1}. {getAnimationName(chainAnim.animationId)}
                        </div>
                        <div style={{ color: '#666', marginBottom: '4px' }}>
                          Target: {getAnimationTarget(chainAnim.animationId)}
                        </div>
                        
                        {/* Editable delay */}
                        <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ minWidth: '35px', fontSize: '9px', color: '#666' }}>
                            Delay:
                          </label>
                          <input
                            type="number"
                            value={chainAnim.delay || 0}
                            onChange={(e) => {
                              const newDelay = parseFloat(e.target.value) || 0;
                              updateChainAnimationDelay(chain.id, chainAnim.animationId, newDelay);
                            }}
                            step="0.1"
                            min="0"
                            max="10"
                            style={{
                              width: '50px',
                              padding: '2px',
                              fontSize: '9px',
                              border: '1px solid #ddd',
                              borderRadius: '2px'
                            }}
                          />
                          <span style={{ fontSize: '9px', color: '#666' }}>s</span>
                        </div>
                        
                        {/* Editable trigger */}
                        <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ minWidth: '35px', fontSize: '9px', color: '#666' }}>
                            Trigger:
                          </label>
                          <select
                            value={chainAnim.trigger || 'start'}
                            onChange={(e) => {
                              updateChainAnimationTrigger(chain.id, chainAnim.animationId, e.target.value as 'start' | 'end' | 'repeat');
                            }}
                            style={{
                              padding: '2px',
                              fontSize: '9px',
                              border: '1px solid #ddd',
                              borderRadius: '2px',
                              backgroundColor: '#fff'
                            }}
                          >
                            <option value="start">Start</option>
                            <option value="end">End</option>
                            <option value="repeat">Repeat</option>
                          </select>
                        </div>
                        
                        {chainAnim.dependsOn && (
                          <div style={{ color: '#666', fontSize: '8px' }}>
                            Depends on: {getAnimationName(chainAnim.dependsOn).slice(0, 20)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Events Section */}
      {animationSync.events.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            Recent Events ({animationSync.events.length})
          </div>
          <div style={{ maxHeight: '100px', overflow: 'auto', fontSize: '9px', backgroundColor: '#f8f9fa', padding: '4px', borderRadius: '3px' }}>
            {animationSync.events.slice(-10).map((event: AnimationEvent, index) => (
              <div key={`${event.id}-${index}`} style={{ marginBottom: '2px', color: event.handled ? '#666' : '#000' }}>
                {new Date(event.timestamp).toLocaleTimeString()}: {event.type} - {getAnimationName(event.sourceAnimationId)}
                {event.handled && ' ✓'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};