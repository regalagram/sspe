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
  
  console.log('🔧 Test environment set up. Use window.figmaHandleTests to run tests.');
  console.log('Example: window.figmaHandleTests.runAllTests()');
};

// Auto-setup en desarrollo
if (typeof window !== 'undefined') {
  setupTestEnvironment();
}
