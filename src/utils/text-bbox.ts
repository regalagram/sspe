// Utilidad para calcular el bbox real de un texto SVG
// Usa canvas.measureText para obtener el ancho real

export function measureTextBBox(text: string, fontSize: number = 14, fontFamily: string = 'sans-serif') {
  if (!text) return { width: 0, height: fontSize };
  // Crear canvas temporal
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: text.length * fontSize * 0.6, height: fontSize };
  ctx.font = `${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  // El alto es fontSize, el ancho es metrics.width
  return {
    width: metrics.width,
    height: fontSize
  };
}
