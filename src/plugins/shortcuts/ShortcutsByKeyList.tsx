import React from 'react';

export interface ShortcutByKeyGroup {
  keyCombo: string;
  shortcuts: {
    key: string;
    modifiers?: string[];
    description: string;
    plugin?: string;
  }[];
}

export const ShortcutsByKeyList: React.FC<{ shortcuts: any[] }> = ({ shortcuts }) => {
  // Agrupar por combinación de teclas (modificadores + key)
  const grouped = React.useMemo(() => {
    const map: Record<string, ShortcutByKeyGroup> = {};
    for (const s of shortcuts) {
      const combo = [...(s.modifiers || []), s.key.toLowerCase()].join('+');
      if (!map[combo]) {
        map[combo] = { keyCombo: combo, shortcuts: [] };
      }
      map[combo].shortcuts.push(s);
    }
    // Ordenar combos por nombre
    return Object.values(map).sort((a, b) => a.keyCombo.localeCompare(b.keyCombo));
  }, [shortcuts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {grouped.map(group => (
        <div
          key={group.keyCombo}
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
            {group.keyCombo.toUpperCase()}
          </div>
          {group.shortcuts.map((s, i) => (
            <div key={i} style={{ marginBottom: i < group.shortcuts.length - 1 ? 6 : 0 }}>
              <div style={{ color: '#444', fontSize: 11, paddingTop: 4, paddingBottom: 4 }}>
                {s.description}{' '}
                <span style={{ color: '#007acc', fontWeight: 500 }}>
                  ({(s.plugin || 'Otros').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
