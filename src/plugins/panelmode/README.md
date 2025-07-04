# Panel Mode Plugin

El plugin Panel Mode permite alternar entre dos modos de visualización de paneles en el editor SVG:

## 🎯 Modos Disponibles

### 1. **Modo Draggable (Por defecto)**
- Los paneles flotan como ventanas independientes
- Pueden ser arrastrados, redimensionados y posicionados libremente
- Cada panel mantiene su posición y estado (pinned/collapsed)

### 2. **Modo Accordion**
- Todos los paneles se muestran en un sidebar fijo en el lado derecho
- Solo un panel puede estar expandido a la vez
- Los paneles se agrupan por tipo (Tools y Panels)
- Vista más compacta y organizada

## 🎛️ Funcionalidades

### **Control de Modo**
- **Toggle Button**: Cambia entre modos draggable y accordion
- **Atajo de Teclado**: `Ctrl + Shift + P` para alternar modos
- **Persistencia**: El modo seleccionado se guarda automáticamente

### **Gestión de Paneles**
- **Visibilidad Individual**: Mostrar/ocultar cada panel independientemente
- **Lista Completa**: Ver todos los paneles disponibles con su estado
- **Identificación de Tipo**: Distinguir entre herramientas (toolbar) y paneles (sidebar)
- **Estado Persistente**: La configuración de visibilidad se mantiene entre sesiones

### **Accordion Específico**
- **Agrupación Inteligente**: Separación visual entre Tools y Panels
- **Expansión Exclusiva**: Solo un panel activo a la vez
- **Scrollbar Personalizada**: Navegación suave en listas largas
- **Margin Automático**: El canvas se ajusta automáticamente al sidebar
- **Scroll Inteligente**: Diferencia entre scroll táctil y clicks intencionales
- **Auto-scroll**: Desplazamiento automático al expandir un panel

## 🚀 Uso

### **Cambio de Modo**
1. Buscar el panel "Panel Mode" (posición por defecto: esquina superior izquierda)
2. Hacer clic en "Switch to Accordion" o "Switch to Draggable"
3. Los paneles se reorganizarán automáticamente

### **Gestión de Visibilidad**
1. En el panel "Panel Mode", expandir la sección "Panel Visibility"
2. Usar los botones de ojo para mostrar/ocultar paneles individuales
3. Los cambios se aplican inmediatamente

### **Navegación en Accordion**
1. Hacer clic en cualquier título de panel para expandirlo
2. El panel previamente expandido se contrae automáticamente
3. Usar scroll para navegar por la lista completa
4. En dispositivos táctiles, el sistema diferencia entre scroll y taps intencionales
5. Al expandir un panel, se hace scroll automáticamente para verlo completo

## 🔧 Implementación Técnica

### **Arquitectura**
- **Store Centralizado**: Zustand para gestión de estado
- **Plugin System**: Integración completa con el sistema de plugins existente
- **CSS Override**: Estilos especiales para modo accordion
- **Position Detection**: Detección automática de paneles toolbar y sidebar

### **Componentes Principales**
- **PanelManager.ts**: Store y lógica de gestión de paneles
- **PanelModeUI.tsx**: Interfaz de control del plugin
- **AccordionSidebar.tsx**: Contenedor accordion para modo apilado
- **SvgEditor.tsx**: Integración con el renderizador principal

### **Persistencia**
- **Modo Actual**: `localStorage['sspe-panel-mode']`
- **Configuración de Paneles**: `localStorage['sspe-panel-configs']`
- **Panel Expandido**: Estado temporal (no persistente)

### **Touch Scroll Detection**
- **Umbral de Movimiento**: 10px para diferenciar scroll de tap
- **Umbral de Tiempo**: 300ms para detectar gestos rápidos
- **Análisis de Gestos**: Compara posición inicial vs. final del touch
- **Prevención de Clicks**: Solo ejecuta acciones en taps intencionales

## 📱 Responsive Design

- **Ancho Fijo**: Sidebar de 320px en modo accordion
- **Transiciones Suaves**: Animaciones de 0.3s para cambios de modo
- **Scroll Inteligente**: Área de contenido con scroll independiente
- **Margin Dinámico**: Canvas se ajusta automáticamente
- **Touch Optimizado**: Detección de gestos de scroll vs. taps intencionales
- **Auto-scroll**: Desplazamiento automático al expandir paneles

## 🎨 Integración de Paneles

El plugin detecta automáticamente todos los paneles existentes:

### **Herramientas (Toolbar)**
- Zoom Controls
- Creation Tools  
- History (Undo/Redo)
- Fullscreen

### **Paneles (Sidebar)**
- Sub-Paths
- Grid
- Selection
- Visual Debug
- SVG Editor
- Arrange
- Reorder
- Pencil
- Shapes

## 🔮 Características Futuras

- **Modos Adicionales**: Tabs, Split View, etc.
- **Drag & Drop**: Reordenar paneles en accordion
- **Temas**: Dark mode y temas personalizados
- **Favoritos**: Marcar paneles de uso frecuente
- **Layouts Presets**: Configuraciones predefinidas

## 💡 Beneficios

### **Para Usuarios Casuales**
- Modo accordion más limpio y organizado
- Menos desorden en pantalla
- Fácil acceso a todas las herramientas

### **Para Usuarios Avanzados**
- Modo draggable para workflows específicos
- Control granular de visibilidad
- Flexibilidad total de posicionamiento

### **Para Desarrolladores**
- Integración transparente con plugins existentes
- Sistema extensible para nuevos modos
- Cero cambios requeridos en plugins existentes
