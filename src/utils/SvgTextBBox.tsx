import React, { useEffect, useRef, useState } from 'react';

export function useSvgTextBBox(text: string, fontSize: number = 14, fontFamily: string = 'sans-serif') {
  const [bbox, setBBox] = useState<{ width: number, height: number } | null>(null);
  const ref = useRef<SVGTextElement>(null);

  useEffect(() => {
    if (ref.current) {
      const bb = ref.current.getBBox();
      setBBox({ width: bb.width, height: bb.height });
    }
  }, [text, fontSize, fontFamily]);

  // Render SVG fantasma
  return {
    bbox,
    svg: (
      <svg width={0} height={0} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
        <text ref={ref} x={0} y={0} fontSize={fontSize} fontFamily={fontFamily}>{text}</text>
      </svg>
    )
  };
}
