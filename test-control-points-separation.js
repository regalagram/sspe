// Test para analizar el problema de puntos de control colapsados
console.log('=== Análisis del problema de puntos de control colapsados ===');

// Caso del path zigzag
const points = [
  { x: 8, y: 14 },    // M
  { x: 53, y: 104 },  // L (punto a normalizar)
  { x: 99, y: 14 },   // L
];

const prevPoint = points[0];
const currentPoint = points[1];
const nextPoint = points[2];

console.log('Puntos:');
console.log(`  Anterior: (${prevPoint.x}, ${prevPoint.y})`);
console.log(`  Actual: (${currentPoint.x}, ${currentPoint.y})`);
console.log(`  Siguiente: (${nextPoint.x}, ${nextPoint.y})`);

// Calcular vectores direccionales
const incomingVector = {
  x: currentPoint.x - prevPoint.x,
  y: currentPoint.y - prevPoint.y
};

const outgoingVector = {
  x: nextPoint.x - currentPoint.x,
  y: nextPoint.y - currentPoint.y
};

// Normalizar vectores
const incomingLength = Math.sqrt(incomingVector.x * incomingVector.x + incomingVector.y * incomingVector.y);
const outgoingLength = Math.sqrt(outgoingVector.x * outgoingVector.x + outgoingVector.y * outgoingVector.y);

const incomingUnit = {
  x: incomingVector.x / incomingLength,
  y: incomingVector.y / incomingLength
};

const outgoingUnit = {
  x: outgoingVector.x / outgoingLength,
  y: outgoingVector.y / outgoingLength
};

console.log('\nVectores unitarios:');
console.log(`  Entrante: (${incomingUnit.x.toFixed(3)}, ${incomingUnit.y.toFixed(3)})`);
console.log(`  Saliente: (${outgoingUnit.x.toFixed(3)}, ${outgoingUnit.y.toFixed(3)})`);

// Problema actual: tangente promedio (bisectriz)
const tangentVector = {
  x: incomingUnit.x + outgoingUnit.x,
  y: incomingUnit.y + outgoingUnit.y
};

const tangentLength = Math.sqrt(tangentVector.x * tangentVector.x + tangentVector.y * tangentVector.y);
const tangentUnit = {
  x: tangentVector.x / tangentLength,
  y: tangentVector.y / tangentLength
};

console.log(`\nTangente promedio (actual): (${tangentUnit.x.toFixed(3)}, ${tangentUnit.y.toFixed(3)})`);

const controlDistance = 30;
const currentCP1 = {
  x: currentPoint.x - tangentUnit.x * controlDistance,
  y: currentPoint.y - tangentUnit.y * controlDistance
};

const currentCP2 = {
  x: currentPoint.x + tangentUnit.x * controlDistance,
  y: currentPoint.y + tangentUnit.y * controlDistance
};

console.log('\n=== Algoritmo ACTUAL (problema) ===');
console.log(`CP1: (${currentCP1.x.toFixed(2)}, ${currentCP1.y.toFixed(2)})`);
console.log(`CP2: (${currentCP2.x.toFixed(2)}, ${currentCP2.y.toFixed(2)})`);

// SOLUCIÓN: Usar las direcciones individuales de cada línea
// pero con longitud equilibrada para mantener suavidad
console.log('\n=== Algoritmo CORREGIDO (solución) ===');

// Factores de suavidad: controlan qué tanto se alejan de la línea original
const smoothnessFactor = 0.3; // 30% de la distancia hacia la bisectriz

// Calcular la influencia de la bisectriz sobre cada vector
const incomingControlDirection = {
  x: incomingUnit.x * (1 - smoothnessFactor) + tangentUnit.x * smoothnessFactor,
  y: incomingUnit.y * (1 - smoothnessFactor) + tangentUnit.y * smoothnessFactor
};

const outgoingControlDirection = {
  x: outgoingUnit.x * (1 - smoothnessFactor) + tangentUnit.x * smoothnessFactor,
  y: outgoingUnit.y * (1 - smoothnessFactor) + tangentUnit.y * smoothnessFactor
};

// Normalizar las direcciones mezcladas
const incomingControlLength = Math.sqrt(
  incomingControlDirection.x * incomingControlDirection.x + 
  incomingControlDirection.y * incomingControlDirection.y
);

const outgoingControlLength = Math.sqrt(
  outgoingControlDirection.x * outgoingControlDirection.x + 
  outgoingControlDirection.y * outgoingControlDirection.y
);

const incomingControlUnit = {
  x: incomingControlDirection.x / incomingControlLength,
  y: incomingControlDirection.y / incomingControlLength
};

const outgoingControlUnit = {
  x: outgoingControlDirection.x / outgoingControlLength,
  y: outgoingControlDirection.y / outgoingControlLength
};

// Distancias proporcionales
const incomingControlDistance = Math.min(incomingLength * 0.3, 30);
const outgoingControlDistance = Math.min(outgoingLength * 0.3, 30);

const correctedCP1 = {
  x: currentPoint.x - incomingControlUnit.x * incomingControlDistance,
  y: currentPoint.y - incomingControlUnit.y * incomingControlDistance
};

const correctedCP2 = {
  x: currentPoint.x + outgoingControlUnit.x * outgoingControlDistance,
  y: currentPoint.y + outgoingControlUnit.y * outgoingControlDistance
};

console.log(`Factor de suavidad: ${smoothnessFactor}`);
console.log(`Dirección control entrante: (${incomingControlUnit.x.toFixed(3)}, ${incomingControlUnit.y.toFixed(3)})`);
console.log(`Dirección control saliente: (${outgoingControlUnit.x.toFixed(3)}, ${outgoingControlUnit.y.toFixed(3)})`);
console.log(`CP1 corregido: (${correctedCP1.x.toFixed(2)}, ${correctedCP1.y.toFixed(2)})`);
console.log(`CP2 corregido: (${correctedCP2.x.toFixed(2)}, ${correctedCP2.y.toFixed(2)})`);

// Verificar separación
const separation = Math.sqrt(
  Math.pow(correctedCP2.x - correctedCP1.x, 2) + 
  Math.pow(correctedCP2.y - correctedCP1.y, 2)
);

console.log(`\nSeparación entre puntos de control: ${separation.toFixed(2)} unidades`);

// Comparar con la separación del algoritmo actual
const currentSeparation = Math.sqrt(
  Math.pow(currentCP2.x - currentCP1.x, 2) + 
  Math.pow(currentCP2.y - currentCP1.y, 2)
);

console.log(`Separación actual: ${currentSeparation.toFixed(2)} unidades`);
console.log(`Mejora en separación: ${((separation / currentSeparation - 1) * 100).toFixed(1)}%`);
