

import React from 'react';
import { pluginManager } from '../../core/PluginSystem';
import { ShortcutsViewSelector } from './ShortcutsViewSelector';
import { ShortcutsByKeyList } from './ShortcutsByKeyList';





export const ShortcutsPanel: React.FC = () => {
  const [view, setView] = React.useState<'byPlugin' | 'byKey'>('byPlugin');
  const [search, setSearch] = React.useState('');
  const shortcuts = React.useMemo(() => {
    return pluginManager.getAllShortcuts().slice();
  }, []);

  // Filtrar shortcuts por búsqueda
  const filteredShortcuts = React.useMemo(() => {
    if (!search.trim()) return shortcuts;
    const q = search.trim().toLowerCase();
    return shortcuts.filter(s =>
      (s.key && s.key.toLowerCase().includes(q)) ||
      (s.modifiers && s.modifiers.join('+').toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.plugin && s.plugin.toLowerCase().includes(q))
    );
  }, [shortcuts, search]);

  // Agrupar shortcuts por plugin (si no hay plugin, agrupar como 'Otros')
  const grouped = React.useMemo(() => {
    return (filteredShortcuts || []).reduce((acc: Record<string, typeof filteredShortcuts>, s) => {
      const group = s.plugin || 'Otros';
      if (!acc[group]) acc[group] = [];
      acc[group].push(s);
      return acc;
    }, {} as Record<string, typeof filteredShortcuts>);
  }, [filteredShortcuts]);

  return (
    <div style={{ maxHeight: 400, overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
      <input
        type="text"
        placeholder="Search shortcut, plugin or description..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => {
          // Evita que los shortcuts globales se activen al tipear en el input
          e.stopPropagation();
        }}
        style={{
          width: '100%',
          marginBottom: 12,
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #ccc',
          fontSize: 12,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
            <ShortcutsViewSelector view={view} setView={setView} />

      {view === 'byPlugin' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(grouped).map(([plugin, list]) => (
            <div
              key={plugin}
              style={{
                background: '#fff',
                borderRadius: 4,
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                border: '1px solid #e0e0e0',
                padding: '10px 12px',
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                fontSize: 11,
                color: '#222',
                minWidth: 0
              }}
            >
              <div style={{ fontWeight: 600, color: '#007acc', fontSize: 11, marginBottom: 6 }}>
                {plugin.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              {list.map((s, i) => (
                <div key={i} style={{ marginBottom: i < list.length - 1 ? 6 : 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 11, color: '#222', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {s.modifiers && s.modifiers.map((m, idx) => (
                      <React.Fragment key={m + idx}>
                        <kbd style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#f5f5f5',
                          border: '1px solid #ccc',
                          fontFamily: 'inherit',
                          fontSize: 11,
                          marginRight: 0,
                          boxShadow: '0 1px 1px rgba(0,0,0,0.04)'
                        }}>{m.charAt(0).toUpperCase() + m.slice(1)}</kbd>
                        <span style={{ margin: '0 2px', fontWeight: 400, color: '#888', fontSize: 12 }}>+</span>
                      </React.Fragment>
                    ))}
                    <kbd style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: '#f5f5f5',
                      border: '1px solid #ccc',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      boxShadow: '0 1px 1px rgba(0,0,0,0.04)'
                    }}>{s.key.length === 1 ? s.key : s.key}</kbd>
                  </div>
                  <div style={{ color: '#444', fontSize: 11, paddingTop: 4, paddingBottom: 4 }}>{s.description}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <ShortcutsByKeyList shortcuts={filteredShortcuts} />
      )}
    </div>
  );
};
