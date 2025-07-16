# Guía de Uso de Plugins Mejorados

## Introducción
Los plugins de Symbol, Marker, Filter y Clipping han sido mejorados para ser más intuitivos y fáciles de usar. Ahora incluyen funcionalidad de "aplicación rápida" que permite crear y aplicar efectos directamente desde la selección de **sub-paths**.

**Nota importante**: En nuestro sistema, lo que se selecciona son **sub-paths** (sub-rutas), no paths completos. Cada path puede contener múltiples sub-paths, y los efectos se aplican a nivel de path completo basándose en los sub-paths seleccionados.

## Plugin de Symbols & Library

### Funcionalidad Principal
- **Crear símbolos desde la selección**: Selecciona uno o más sub-paths y crea un símbolo automáticamente
- **Gestión de instancias**: Crea múltiples instancias de un símbolo en diferentes ubicaciones
- **Propiedades configurables**: Configura viewBox y preserveAspectRatio

### Cómo Usar
1. **Crear símbolo desde selección**:
   - Selecciona uno o más sub-paths en el lienzo
   - Abre el panel "Symbols & Library"
   - Haz clic en "Create Symbol from Selection"
   - Cada sub-path seleccionado se convertirá en un path separado dentro del símbolo
   - Opcionalmente, elimina los sub-paths originales del documento

2. **Crear instancias**:
   - En la lista de símbolos, haz clic en "Use" para crear una instancia
   - Cambia a la pestaña "Instances" para gestionar las instancias
   - Modifica posición y dimensiones de cada instancia

3. **Atajo de teclado**:
   - `Ctrl+Shift+S`: Crear símbolo desde selección de sub-paths
   - `Ctrl+U`: Crear instancia del primer símbolo

## Plugin de Markers

### Funcionalidad Principal
- **Aplicación rápida de flechas**: Aplica flechas al inicio o final de paths automáticamente
- **Gestión de marcadores personalizados**: Crea marcadores custom para casos específicos
- **Aplicación a múltiples paths**: Aplica marcadores a todos los paths que contienen sub-paths seleccionados

### Cómo Usar
1. **Aplicación rápida**:
   - Selecciona uno o más sub-paths
   - Abre el panel "Markers"
   - Haz clic en "← Start Arrow" o "End Arrow →"
   - Los marcadores se aplicarán automáticamente a los paths que contienen los sub-paths seleccionados

2. **Marcadores personalizados**:
   - Crea marcadores custom con "Arrow" o "Custom"
   - Selecciona un path individual
   - Aplica marcadores específicos en start, mid o end

3. **Atajo de teclado**:
   - `Ctrl+Shift+A`: Aplicar flecha al final de paths que contienen sub-paths seleccionados

## Plugin de Filters & Effects

### Funcionalidad Principal
- **Aplicación rápida de efectos**: Aplica efectos comunes con un solo clic
- **Efectos predefinidos**: Drop Shadow, Blur, Grayscale listos para usar
- **Filtros personalizados**: Crea combinaciones de efectos complejas

### Cómo Usar
1. **Aplicación rápida**:
   - Selecciona uno o más sub-paths
   - Abre el panel "Filters & Effects"
   - Haz clic en "Drop Shadow", "Blur" o "Grayscale"
   - El efecto se aplicará automáticamente a los paths que contienen los sub-paths seleccionados

2. **Filtros personalizados**:
   - Crea filtros custom con combinaciones de primitivas
   - Edita parámetros específicos de cada efecto
   - Aplica filtros existentes a nuevos paths

3. **Atajos de teclado**:
   - `Ctrl+Shift+F`: Alternar panel de filtros
   - `Ctrl+Shift+B`: Aplicar efecto blur rápido

## Plugin de Clipping & Masks

### Funcionalidad Principal
- **Crear clipping paths desde selección**: Convierte sub-paths seleccionados en clipping paths
- **Crear masks desde selección**: Convierte sub-paths seleccionados en masks
- **Aplicación directa**: Aplica clipping y masks a paths con un clic

### Cómo Usar
1. **Crear clipping path**:
   - Selecciona los sub-paths que definirán el área de recorte
   - Abre el panel "Clipping & Masks"
   - En la pestaña "Clips", haz clic en "Create from Selection"
   - Cada sub-path seleccionado se convertirá en un path separado dentro del clipping path
   - Opcionalmente, elimina los sub-paths originales

2. **Crear mask**:
   - Selecciona los sub-paths que definirán la máscara
   - Cambia a la pestaña "Masks"
   - Haz clic en "Create from Selection"
   - Los sub-paths se convertirán en máscara (relleno blanco)

3. **Aplicar a paths**:
   - Selecciona el path al que aplicar el efecto
   - Haz clic en "Apply" junto al clipping path o mask deseado
   - El efecto se aplicará inmediatamente

4. **Atajos de teclado**:
   - `Ctrl+Shift+C`: Crear clipping path desde selección de sub-paths
   - `Ctrl+Shift+M`: Crear mask desde selección de sub-paths

## Consejos Generales

### Flujo de Trabajo Recomendado
1. **Crea tu contenido base**: Dibuja o importa los paths necesarios
2. **Selecciona sub-paths**: Usa las herramientas de selección para elegir los sub-paths específicos
3. **Aplica efectos**: Usa los botones de aplicación rápida para efectos comunes
4. **Refina**: Ajusta propiedades específicas según sea necesario

### Indicadores Visuales
- **Botones deshabilitados**: Cuando no hay selección de sub-paths válida
- **Contadores**: Número de elementos en cada plugin
- **Estados activos**: Resaltado azul para elementos seleccionados
- **Tooltips**: Información adicional al pasar el mouse

### Entendiendo Sub-paths vs Paths
- **Sub-path**: Componente individual dentro de un path que se puede seleccionar
- **Path**: Contenedor que agrupa uno o más sub-paths
- **Efectos**: Se aplican a nivel de path completo, pero se activan mediante selección de sub-paths

### Compatibilidad
- Todos los plugins funcionan con paths SVG estándar
- Los efectos se aplican usando elementos SVG nativos
- Compatible con exportación e importación de archivos SVG

### Solución de Problemas
- Si un botón está deshabilitado, verifica que tengas sub-paths seleccionados
- Los símbolos requieren sub-paths válidos para funcionar correctamente
- Los filtros pueden afectar el rendimiento con muchos elementos
- Los clipping paths y masks requieren formas cerradas para mejores resultados
- Si seleccionas sub-paths de diferentes paths, los efectos se aplicarán a todos los paths padre
