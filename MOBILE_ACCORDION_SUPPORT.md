# Soporte Móvil para Paneles en Acordeón

## Problema Resuelto

En dispositivos móviles existían dos problemas principales:

1. **No se podía hacer scroll** en los elementos interiores del acordeón (lista de sub-paths, atributos, etc.)
2. **No se podía editar campos de texto** (focus, selección, escritura) - **Crítico en iOS y Android**

## Solución Implementada

### 1. Actualización de CSS (`editor.css`)

**Touch Action Específico:**
```css
/* SVG editor mantiene restricciones pero permite scroll en UI */
.svg-editor {
  touch-action: pan-x pan-y; /* Antes: none */
}

/* Areas específicas del acordeón permiten interacción completa */
.accordion-sidebar,
.accordion-panel-content,
.draggable-panel {
  touch-action: auto !important;
  -webkit-overflow-scrolling: touch;
}
```

**Inputs Optimizados para iOS y Android:**
```css
/* Inputs permiten selección de texto y previenen zoom */
input, textarea, select, button {
  touch-action: manipulation !important;
  user-select: text !important;
  font-size: 16px !important; /* Previene zoom en iOS y mejora Android */
  -webkit-appearance: none; /* Resetea apariencia móvil */
  appearance: none;
  outline: none; /* Remover outline Android */
  border-radius: 4px; /* Bordes consistentes */
}

/* Android specific improvements */
input:focus, textarea:focus, select:focus {
  border-color: #007acc !important;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2) !important;
}
```

### 2. Nuevo Hook Móvil (`useMobileFormFocusFix.ts`)

**Detección de iOS y Android:**
```typescript
// Detectar dispositivo móvil
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);
const deviceType = isIOS ? '🍎 iOS' : '🤖 Android';

// Delay específico para cada plataforma
const focusDelay = isAndroid ? 50 : 0; // Android necesita más tiempo
```

**Focus Forzado Universal:**
```typescript
const handleTouch = (e: Event) => {
  e.stopPropagation();
  setTimeout(() => {
    element.focus(); // Forzar focus
    if (isTextInput) element.select(); // Seleccionar texto
  }, focusDelay);
};
```

**Atributos de Dispositivo:**
```typescript
element.setAttribute('data-mobile-focus-fix', 'true');
element.setAttribute('data-device-type', isIOS ? 'ios' : 'android');
```

### 3. Mejoras Específicas Android

**Range Sliders:**
```css
/* Android range slider styles */
input[type="range"]::-webkit-slider-thumb {
  height: 20px;
  width: 20px;
  background: #007acc;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

input[type="range"]::-webkit-slider-track {
  height: 4px;
  background: #ddd;
  border-radius: 2px;
}
```

**Tap Feedback:**
```css
/* Android tap feedback */
label:active {
  background-color: rgba(0, 122, 204, 0.1);
  border-radius: 4px;
}
```

**Text Size Adjust:**
```css
input, textarea, select {
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
}
```

## 4. Mejoras Adicionales Android (`useAndroidTouchEnhancements.ts`)

**Haptic Feedback:**
```typescript
// Vibración suave para feedback táctil
const provideHapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10); // 10ms vibración
  }
};

// Para range sliders durante drag
navigator.vibrate(5); // Vibración más suave
```

**Visual Feedback Temporal:**
```typescript
// Background temporal en touch
htmlElement.style.backgroundColor = 'rgba(0, 122, 204, 0.1)';
setTimeout(() => {
  htmlElement.style.backgroundColor = originalBackground;
}, 150);
```

**Enhanced Input Interactions:**
```typescript
// Feedback en focus, change, y drag de range sliders
input.addEventListener('focus', handleFocus);
input.addEventListener('change', handleChange);
// Range sliders: feedback en start, move, end
```

## Elementos Afectados

### Ahora Funcionan Correctamente en iOS y Android:

1. **Scroll en listas:**
   - Lista de sub-paths ✅
   - Lista de atributos ✅  
   - Panel de visibilidad ✅

2. **Edición de campos:**
   - Parámetros de simplificación ✅
   - Valores numéricos ✅
   - Campos de texto ✅
   - Selects/dropdowns ✅
   - **Color pickers ✅** 
   - **Range sliders ✅** (con estilos Android mejorados)
   - **Checkboxes ✅** (con accent color Android)

3. **Interacciones táctiles:**
   - Focus automático en inputs ✅
   - Selección de texto ✅
   - Scroll con momentum ✅
   - **Sin zoom accidental ✅**
   - **Tap feedback Android ✅**

## Compatibilidad

- ✅ **iOS Safari (SOLUCIONADO)**
- ✅ **Android Chrome (SOLUCIONADO)**
- ✅ **Android WebView (SOLUCIONADO)**
- ✅ Desktop (sin cambios)
- ✅ Tablets (mejoras adicionales)

## Características Específicas por Plataforma

### **iOS (🍎)**
- Focus inmediato (delay: 0ms)
- Resetea `-webkit-appearance`
- Prevención de zoom con font-size 16px
- Touch callout default para selección

### **Android Específico (🤖)**
- Focus con delay mínimo (delay: 50ms) para estabilidad
- **Haptic Feedback**: Vibración suave en interacciones
- **Visual Feedback**: Background temporal en touch
- Estilos mejorados para range sliders con Material Design
- Accent color para checkboxes (#007acc)
- Text size adjust para prevenir escalado automático
- Border focus con box-shadow azul Material
- **Feedback durante Range Drag**: Vibración continua suave

### **Universal (📱)**
- Detección automática de dispositivo
- Event stopPropagation para prevenir interferencia
- MutationObserver para contenido dinámico
- Touch action manipulation
- Logging de debug específico por dispositivo

## Notas de Implementación

### **Detección de Dispositivo**
- **iOS**: `navigator.userAgent` detecta iPad/iPhone/iPod
- **Android**: `navigator.userAgent` detecta Android
- **Logs**: Emojis específicos (🍎 iOS, 🤖 Android, 📱 Universal)

### **Timing Específico**
- **iOS**: Focus inmediato para respuesta táctil rápida
- **Android**: Delay de 50ms para estabilidad del sistema

### **Estilos Diferenciados**
- **iOS**: Enfoque en prevenir zoom y comportamiento WebKit
- **Android**: Enfoque en feedback visual y estilos Material Design

### **Event Handling**
- Direct event binding en elementos de formulario
- Passive: false para permitir preventDefault
- stopPropagation para prevenir interferencia del touch global
