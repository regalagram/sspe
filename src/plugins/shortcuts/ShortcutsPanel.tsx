
import React from 'react';
import { pluginManager } from '../../core/PluginSystem';



export const ShortcutsPanel: React.FC = () => {
  // Obtener shortcuts activos directamente del sistema
  const shortcuts = React.useMemo(() => {
    // getAllShortcuts() garantiza que todos los shortcuts tienen plugin asignado
    return pluginManager.getAllShortcuts().slice().sort((a, b) => {
      return (a.plugin || '').localeCompare(b.plugin || '');
    });
  }, []);

  // Agrupar shortcuts por plugin (si no hay plugin, agrupar como 'Otros')
  const grouped = React.useMemo(() => {
    return (shortcuts || []).reduce((acc: Record<string, typeof shortcuts>, s) => {
      const group = s.plugin || 'Otros';
      if (!acc[group]) acc[group] = [];
      acc[group].push(s);
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
                  }}>{s.key.length === 1 ? s.key.toUpperCase() : s.key}</kbd>
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
