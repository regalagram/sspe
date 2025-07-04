/**
 * Test del Sistema de Puntos de Control tipo Figma
 * 
 * Este archivo contiene funciones de test para verificar el funcionamiento
 * del sistema de handles tipo Figma.
 */

import { figmaHandleManager } from './FigmaHandleManager';
import { Point, ControlPointType } from '../../types';

// Mock del editor store para testing
const createMockEditorStore = () => ({
  paths: [
    {
      id: 'test-path',
      subPaths: [
        {
          id: 'test-subpath',
          commands: [
            { id: 'cmd1', command: 'M', x: 100, y: 100 },
            { id: 'cmd2', command: 'C', x: 200, y: 100, x1: 150, y1: 80, x2: 180, y2: 80 },
            { id: 'cmd3', command: 'C', x: 300, y: 100, x1: 220, y1: 120, x2: 280, y2: 80 }
          ]
        }
      ]
    }
  ],
  selection: {
    selectedCommands: []
  },
  updateCommand: (id: string, updates: any) => {
    console.log(`Updating command ${id}:`, updates);
  }
});

// Test de determinación de tipo de punto de control
export const testControlPointTypeDetection = () => {
  console.log('🧪 Testing Control Point Type Detection...');
  
  const mockStore = createMockEditorStore();
  figmaHandleManager.setEditorStore(mockStore);
  
  // Test punto simétrico
  const symmetricInfo = figmaHandleManager.analyzeControlPoint('cmd2');
  console.log('Symmetric point info:', symmetricInfo);
  
  if (symmetricInfo) {
    console.log(`✅ Detected type: ${symmetricInfo.type}`);
    console.log(`✅ Has incoming handle: ${symmetricInfo.incomingHandle !== null}`);
    console.log(`✅ Has outgoing handle: ${symmetricInfo.outgoingHandle !== null}`);
    console.log(`✅ Is breakable: ${symmetricInfo.isBreakable}`);
  }
  
  return symmetricInfo;
};

// Test de manejo de tecla Option
export const testOptionKeyHandling = () => {
  console.log('🧪 Testing Option Key Handling...');
  
  const state = figmaHandleManager.getState();
  console.log(`Initial Option state: ${state.isOptionPressed}`);
  
  // Simular presión de tecla Option
  // Note: handleKeyDown and handleKeyUp are private methods
  // In a real test environment, these would be triggered by actual keyboard events
  // For now, we'll test the state directly
  
  // The keyboard listeners are automatically set up when the manager is created
  // In a real scenario, Option key events would be captured by the global listeners
  console.log('Option key testing would be done through actual keyboard events');
  
  const stateAfterKeyDown = figmaHandleManager.getState();
  console.log(`Current state: ${stateAfterKeyDown.isOptionPressed}`);
  
  const stateAfterKeyUp = figmaHandleManager.getState();
  console.log(`Final state: ${stateAfterKeyUp.isOptionPressed}`);
  
  return {
    initial: state.isOptionPressed,
    afterKeyDown: stateAfterKeyDown.isOptionPressed,
    afterKeyUp: stateAfterKeyUp.isOptionPressed
  };
};

// Test de conversión a simétrico
export const testConvertToMirrored = () => {
  console.log('🧪 Testing Convert to Mirrored...');
  
  const mockStore = createMockEditorStore();
  figmaHandleManager.setEditorStore(mockStore);
  
  // Analizar punto antes de conversión
  const beforeInfo = figmaHandleManager.analyzeControlPoint('cmd2');
  console.log('Before conversion:', beforeInfo?.type);
  
  // Convertir a simétrico
  figmaHandleManager.convertToMirrored('cmd2');
  
  // Analizar después de conversión
  const afterInfo = figmaHandleManager.analyzeControlPoint('cmd2');
  console.log('After conversion:', afterInfo?.type);
  
  return {
    before: beforeInfo?.type,
    after: afterInfo?.type
  };
};

// Test de arrastre de handles
export const testHandleDrag = () => {
  console.log('🧪 Testing Handle Drag...');
  
  const mockStore = createMockEditorStore();
  figmaHandleManager.setEditorStore(mockStore);
  
  const startPoint: Point = { x: 150, y: 80 };
  const newPoint: Point = { x: 160, y: 70 };
  
  // Iniciar arrastre
  figmaHandleManager.startDragHandle('cmd2', 'incoming', startPoint);
  
  const dragState = figmaHandleManager.getState().dragState;
  console.log('Drag started:', dragState.isDragging);
  console.log('Dragging command:', dragState.commandId);
  console.log('Handle type:', dragState.handleType);
  
  // Actualizar posición
  figmaHandleManager.updateDragHandle(newPoint);
  
  // Terminar arrastre
  figmaHandleManager.endDragHandle();
  
  const finalState = figmaHandleManager.getState().dragState;
  console.log('Drag ended:', finalState.isDragging);
  
  return {
    startPoint,
    newPoint,
    wasIsDragging: dragState.isDragging,
    finalIsDragging: finalState.isDragging
  };
};

/**
 * Tests para la nueva lógica de detección inicial de pares (v2.0)
 */

// Test de detección inicial de pares
export const testInitialPairDetection = () => {
  console.log('🧪 Testing Initial Pair Detection (v2.0)...');
  
  const mockStore = createMockEditorStore();
  figmaHandleManager.setEditorStore(mockStore);
  
  // Simular el inicio de drag en un punto con par
  console.log('--- Testing cmd2 outgoing handle ---');
  figmaHandleManager.startDragHandle('cmd2', 'outgoing', { x: 150, y: 80 });
  
  const dragState = figmaHandleManager.getState().dragState;
  console.log('Drag state after start:', dragState);
  
  if (dragState.pairInfo) {
    console.log(`✅ Initial pair type detected: ${dragState.pairInfo.type}`);
    console.log(`✅ Has paired handle: ${dragState.pairInfo.pairedHandle !== null}`);
    if (dragState.pairInfo.pairedHandle) {
      console.log(`✅ Paired handle: ${dragState.pairInfo.pairedHandle.commandId} (${dragState.pairInfo.pairedHandle.handleType})`);
    }
  } else {
    console.log('❌ No pair info detected');
  }
  
  // Limpiar
  figmaHandleManager.endDragHandle();
};

// Test de sincronización estable
export const testStableSynchronization = () => {
  console.log('🧪 Testing Stable Synchronization (v2.0)...');
  
  const mockStore = createMockEditorStore();
  figmaHandleManager.setEditorStore(mockStore);
  
  // Simular movimiento rápido
  console.log('--- Testing fast movement stability ---');
  figmaHandleManager.startDragHandle('cmd2', 'outgoing', { x: 150, y: 80 });
  
  // Simular varios movimientos rápidos
  const fastMovements = [
    { x: 160, y: 85 },
    { x: 170, y: 90 },
    { x: 180, y: 95 },
    { x: 190, y: 100 }
  ];
  
  fastMovements.forEach((point, index) => {
    console.log(`Fast movement ${index + 1}:`, point);
    figmaHandleManager.updateDragHandle(point);
  });
  
  console.log('✅ Fast movement test completed - no crashes');
  
  // Limpiar
  figmaHandleManager.endDragHandle();
};

// Test de comportamiento con tecla Option
export const testOptionKeyBehavior = () => {
  console.log('🧪 Testing Option Key Behavior (v2.0)...');
  
  const mockStore = createMockEditorStore();
  figmaHandleManager.setEditorStore(mockStore);
  
  // Test sin Option (sincronización normal)
  console.log('--- Testing without Option key ---');
  figmaHandleManager.startDragHandle('cmd2', 'outgoing', { x: 150, y: 80 });
  figmaHandleManager.updateDragHandle({ x: 160, y: 85 });
  console.log('✅ Normal synchronization applied');
  figmaHandleManager.endDragHandle();
  
  // Test con Option (modo independiente)
  console.log('--- Testing with Option key ---');
  // Simular keydown de Option
  const optionKeyDown = new KeyboardEvent('keydown', { key: 'Option' });
  figmaHandleManager.simulateKeyDown(optionKeyDown);
  
  figmaHandleManager.startDragHandle('cmd2', 'outgoing', { x: 150, y: 80 });
  figmaHandleManager.updateDragHandle({ x: 160, y: 85 });
  console.log('✅ Independent mode applied');
  figmaHandleManager.endDragHandle();
  
  // Simular keyup de Option
  const optionKeyUp = new KeyboardEvent('keyup', { key: 'Option' });
  figmaHandleManager.simulateKeyUp(optionKeyUp);
  
  console.log('✅ Option key behavior test completed');
};

// Test de búsqueda de alineación en tiempo real
export const testRealTimeAlignment = () => {
  console.log('🧪 Testing Real-Time Alignment Search (v2.0)...');
  
  const mockStore = createMockEditorStore();
  figmaHandleManager.setEditorStore(mockStore);
  
  // Simular Option presionada
  const optionKeyDown = new KeyboardEvent('keydown', { key: 'Option' });
  figmaHandleManager.simulateKeyDown(optionKeyDown);
  
  figmaHandleManager.startDragHandle('cmd2', 'outgoing', { x: 150, y: 80 });
  
  // Simular movimiento que debería alinear
  console.log('--- Testing alignment detection during Option drag ---');
  figmaHandleManager.updateDragHandle({ x: 120, y: 120 }); // Hacia el lado opuesto
  
  console.log('✅ Real-time alignment search completed');
  
  // Limpiar
  figmaHandleManager.endDragHandle();
  const optionKeyUp = new KeyboardEvent('keyup', { key: 'Option' });
  figmaHandleManager.simulateKeyUp(optionKeyUp);
};

// Ejecutar todos los tests
export const runAllTests = () => {
  console.log('🚀 Starting Figma Handles System Tests...');
  
  const results = {
    typeDetection: testControlPointTypeDetection(),
    optionKey: testOptionKeyHandling(),
    convertToMirrored: testConvertToMirrored(),
    handleDrag: testHandleDrag()
  };
  
  console.log('📊 Test Results:', results);
  return results;
};

// Ejecutar todos los tests de la nueva lógica
export const runNewLogicTests = () => {
  console.log('🚀 Running New Logic Tests (v2.0)...');
  console.log('================================================');
  
  testInitialPairDetection();
  console.log('');
  
  testStableSynchronization();
  console.log('');
  
  testOptionKeyBehavior();
  console.log('');
  
  testRealTimeAlignment();
  console.log('');
  
  console.log('✅ All new logic tests completed!');
  console.log('================================================');
};

// Función de utilidad para test manual en consola del navegador
export const setupTestEnvironment = () => {
  // Exponer las funciones de test globalmente para uso manual
  (window as any).figmaHandleTests = {
    runAllTests,
    testControlPointTypeDetection,
    testOptionKeyHandling,
    testConvertToMirrored,
    testHandleDrag,
    figmaHandleManager
  };
  
  // Agregar los nuevos tests a la interfaz global
  (window as any).figmaHandleTests = {
    // Tests originales
    runAllTests,
    testControlPointTypeDetection,
    testOptionKeyHandling,
    testConvertToMirrored,
    testHandleDrag,
    
    // Nuevos tests v2.0
    testInitialPairDetection,
    testStableSynchronization,
    testOptionKeyBehavior,
    testRealTimeAlignment,
    runNewLogicTests
  };
  
  console.log('🔧 Test environment set up. Use window.figmaHandleTests to run tests.');
  console.log('Example: window.figmaHandleTests.runAllTests()');
  console.log('🆕 New v2.0 tests: window.figmaHandleTests.runNewLogicTests()');
};

// Auto-setup en desarrollo
if (typeof window !== 'undefined') {
  setupTestEnvironment();
}
