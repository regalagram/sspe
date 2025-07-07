// Test script para verificar que los problemas han sido solucionados
console.log('🧪 Testing tool mode coordination...');

// Test 1: Activar shapes y verificar que permite múltiples formas
console.log('\n🔷 Test 1: Shapes tool');
console.log('Expected: Should allow multiple shapes to be created');
window.toolModeManager.setMode('shapes', { shapeId: 'circle' });
console.log('Shapes mode active:', window.toolModeManager.isActive('shapes'));
console.log('Shape manager in creation mode:', window.shapeManager.isInShapeCreationMode());

// Test 2: Cambiar a curves desde shapes
console.log('\n🏹 Test 2: Switch from shapes to curves');
window.toolModeManager.setMode('curves');
console.log('Curves mode active:', window.toolModeManager.isActive('curves'));
console.log('Shapes mode active:', window.toolModeManager.isActive('shapes'));
console.log('Shape manager in creation mode:', window.shapeManager.isInShapeCreationMode());

// Test 3: Cambiar a pencil desde curves
console.log('\n✏️ Test 3: Switch from curves to pencil');
window.toolModeManager.setMode('pencil');
console.log('Pencil mode active:', window.toolModeManager.isActive('pencil'));
console.log('Curves mode active:', window.toolModeManager.isActive('curves'));

// Test 4: Cambiar a creation desde pencil
console.log('\n🔨 Test 4: Switch from pencil to creation');
window.toolModeManager.setMode('creation', { commandType: 'M' });
console.log('Creation mode active:', window.toolModeManager.isActive('creation'));
console.log('Pencil mode active:', window.toolModeManager.isActive('pencil'));

// Test 5: Volver a shapes desde creation
console.log('\n🔷 Test 5: Switch back to shapes from creation');
window.toolModeManager.setMode('shapes', { shapeId: 'rectangle' });
console.log('Shapes mode active:', window.toolModeManager.isActive('shapes'));
console.log('Creation mode active:', window.toolModeManager.isActive('creation'));
console.log('Shape manager in creation mode:', window.shapeManager.isInShapeCreationMode());
console.log('Current shape ID:', window.shapeManager.getCurrentShapeId());

// Test 6: Verificar el estado del modo activo
console.log('\n🔧 Test 6: Active mode state');
console.log('Current active mode:', window.toolModeManager.getActiveMode());
console.log('Tool mode state:', window.toolModeManager.getState());

console.log('\n✅ All tests completed!');
console.log('Expected results:');
console.log('- Only one mode should be active at a time');
console.log('- Shapes should allow multiple shapes to be created');
console.log('- All tool switches should work correctly');
console.log('- No recursion or infinite loops');
