import React from 'react';
import { useEditorStore } from '../store/editorStore';

export const TextRenderer: React.FC = () => {
  const texts = useEditorStore((state) => state.texts);
  const selectedTexts = useEditorStore((state) => state.selection.selectedTexts);
  const selectText = useEditorStore((state) => state.selectText);

  return (
    <>
      {texts.map((text) => (
        <text
          key={text.id}
          x={text.x}
          y={text.y}
          fontFamily={text.fontFamily}
          fontSize={text.fontSize}
          fontWeight={text.fontWeight}
          fontStyle={text.fontStyle}
          textAnchor={text.textAnchor}
          textDecoration={text.textDecoration}
          fill={text.fill}
          onClick={() => selectText(text.id)}
          style={{
            userSelect: 'none',
            cursor: 'pointer',
            outline: selectedTexts.includes(text.id) ? '1px solid #007bff' : 'none',
          }}
          data-element-type="text"
          data-element-id={text.id}
        >
          {text.content}
        </text>
      ))}
    </>
  );
};
