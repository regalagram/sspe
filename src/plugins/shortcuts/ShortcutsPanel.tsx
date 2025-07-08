
import React from 'react';
import { pluginManager } from '../../core/PluginSystem';



export const ShortcutsPanel: React.FC = () => {
  // Obtener shortcuts activos directamente del sistema
  const shortcuts = React.useMemo(() => {
    // @ts-ignore
    return pluginManager.getAllShortcuts().slice().sort((a, b) => {
      if (!a.plugin && !b.plugin) return 0;
      if (!a.plugin) return 1;
      if (!b.plugin) return -1;
      return a.plugin.localeCompare(b.plugin);
    });
  }, []);

  // Agrupar shortcuts por plugin
  const grouped = React.useMemo(() => {
    return (shortcuts || []).reduce((acc: Record<string, typeof shortcuts>, s) => {
      if (!acc[s.plugin]) acc[s.plugin] = [];
      acc[s.plugin].push(s);
      return acc;
    }, {} as Record<string, typeof shortcuts>);
  }, [shortcuts]);

  return (
    <div style={{ maxHeight: 400, overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
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
            <div style={{ fontWeight: 600, color: '#007acc', fontSize: 11, marginBottom: 6 }}>{plugin}</div>
            {list.map((s, i) => (
              <div key={i} style={{ marginBottom: i < list.length - 1 ? 6 : 0 }}>
                <div style={{ fontWeight: 500, fontSize: 11, color: '#222' }}>
                  {s.modifiers ? s.modifiers.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' + ') + ' + ' : ''}{s.key}
                </div>
                <div style={{ color: '#444', fontSize: 11 }}>{s.description}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
