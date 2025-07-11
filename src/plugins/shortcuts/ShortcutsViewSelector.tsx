import React from 'react';
import { PluginButton } from '../../components/PluginButton';
import { List, Keyboard } from 'lucide-react';

export const ShortcutsViewSelector: React.FC<{
  view: 'byPlugin' | 'byKey';
  setView: (v: 'byPlugin' | 'byKey') => void;
}> = ({ view, setView }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
      <PluginButton
        icon={<List size={16} />}
        text="Sort by Plugin"
        color="#007acc"
        active={view === 'byPlugin'}
        onPointerDown={() => setView('byPlugin')}
        fullWidth
      />
      <PluginButton
        icon={<Keyboard size={16} />}
        text="Sort by Key"
        color="#007acc"
        active={view === 'byKey'}
        onPointerDown={() => setView('byKey')}
        fullWidth
      />
    </div>
  );
};
