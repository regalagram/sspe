import { ShortcutsPlugin } from '../plugins/shortcuts/Shortcuts';
import { pluginManager } from './PluginSystem';
import { ZoomPlugin } from '../plugins/zoom/Zoom';
import { GridPlugin } from '../plugins/grid/Grid';
import { UndoRedoPlugin } from '../plugins/undo-redo/UndoRedo';
import { CreationPlugin } from '../plugins/creation/Creation';
import { FullscreenPlugin } from '../plugins/fullscreen/Fullscreen';
import { PathStylePlugin } from '../plugins/path-style/PathStyle';
import { SelectionPlugin } from '../plugins/selection';
import { SVGPlugin } from '../plugins/svg-editor/SVGEditor';
import { SubPathListPlugin } from '../plugins/subpath-list/SubPathList';
import { PointerInteractionPlugin } from '../plugins/pointer-interaction/PointerInteraction';
import { CommandPlugin } from '../plugins/command/Command';
import { VisualDebugPlugin } from '../plugins/visual-debug/VisualDebug';
import { SubPathTransformPlugin } from '../plugins/subpath-transform/SubPathTransform';
import { PointTransformPlugin } from '../plugins/point-transform/PointTransform';
import { PencilPlugin } from '../plugins/pencil';
import { SmoothPlugin } from '../plugins/smooth';
import { ShapesPlugin } from '../plugins/shapes/Shapes';
import { Transform } from '../plugins/transform/Transform';
import { ArrangePlugin } from '../plugins/arrange/Arrange';
import { ReorderPlugin } from '../plugins/reorder/Reorder';
import { PanelModePlugin } from '../plugins/panelmode/PanelMode';
import { DeletePlugin } from '../plugins/delete/Delete';
import { HandlesPlugin } from '../plugins/handles/Handles';
import { CurvesPlugin } from '../plugins/curves/Curves';
import { GesturesPlugin } from '../plugins/gestures/Gestures';
import { GradientPlugin } from '../plugins/gradients';
import { TextControlsPlugin } from '../plugins/text-controls';
import { TextStylePlugin } from '../plugins/text-style';
import { GroupRendererPlugin } from '../plugins/group-renderer';
import { GroupControlsPlugin } from '../plugins/group-controls';
import { StickyGuidelinesPlugin } from '../plugins/sticky-guidelines';
import { ImagePlugin } from '../plugins/images';
import { FilterPlugin } from '../plugins/filters';
import { ClippingPlugin } from '../plugins/clipping';
import { MarkerPlugin } from '../plugins/markers';
import { SymbolPlugin } from '../plugins/symbols';
import { TextPathPlugin } from '../plugins/textpath';
import { AnimationSystemPlugin } from '../plugins/animation-system';
import { KeyboardMovementPlugin } from '../plugins/keyboard-movement';
import { TextPlacementPlugin } from '../plugins/text-placement';
import { TextEditPlugin } from '../plugins/text-edit';
import { CommandFloatingActionsPlugin } from '../plugins/commandFloatingActions';
import { UnifiedRendererPlugin } from '../plugins/unified-renderer';
import { SpecialPointFloatingActionsPlugin } from '../plugins/specialPointFloatingActions';
import { StructureTreePlugin } from '../plugins/structure-tree';
import { ViewportDebugPlugin } from '../plugins/viewport-debug';
import { ViewBoxSyncPlugin } from '../plugins/viewbox-sync';

// Prevent multiple initializations
let pluginsInitialized = false;

/**
 * Initialize all plugins in the correct dependency order
 * Following the modular plugin architecture principle from README.md
 */
export const initializePlugins = (): void => {
  if (pluginsInitialized) {
    return;
  }
  
  pluginsInitialized = true;
  
  // Register base dependencies first
  pluginManager.registerPlugin(GesturesPlugin); // Gestures for pinch/pan on canvas, MUST be first to handle multi-touch before selection
  pluginManager.registerPlugin(PointerInteractionPlugin); // Required by pencil
  pluginManager.registerPlugin(SelectionPlugin); // Required by subpath-transform and point-transform
  
  // Register ViewBoxSync early to handle viewport calculations
  pluginManager.registerPlugin(ViewBoxSyncPlugin); // ViewBox synchronization and auto-updates
  
  // Register Transform early so it can handle transform handles before PathRenderer
  pluginManager.registerPlugin(Transform);
  
  // Register unified renderer (replaces individual element renderers)
  pluginManager.registerPlugin(UnifiedRendererPlugin);
  
  // Register other core plugins
  pluginManager.registerPlugin(GroupRendererPlugin);
  pluginManager.registerPlugin(FilterPlugin); // Filter definitions (must be before paths use them)
  pluginManager.registerPlugin(ClippingPlugin); // Clip path and mask definitions (must be before ImagePlugin)
  pluginManager.registerPlugin(MarkerPlugin); // Marker definitions
  pluginManager.registerPlugin(ImagePlugin); // Image controls only, rendering handled by UnifiedRenderer
  pluginManager.registerPlugin(SymbolPlugin); // Symbol definitions and use instances
  pluginManager.registerPlugin(StickyGuidelinesPlugin);
  pluginManager.registerPlugin(VisualDebugPlugin);
  pluginManager.registerPlugin(ViewportDebugPlugin); // Debug panel for viewport info
  pluginManager.registerPlugin(CommandPlugin);
  pluginManager.registerPlugin(CreationPlugin);
  pluginManager.registerPlugin(ZoomPlugin);
  pluginManager.registerPlugin(GridPlugin);
  pluginManager.registerPlugin(UndoRedoPlugin);
  pluginManager.registerPlugin(FullscreenPlugin);
  pluginManager.registerPlugin(DeletePlugin);
  pluginManager.registerPlugin(PathStylePlugin);
  pluginManager.registerPlugin(GradientPlugin);
  pluginManager.registerPlugin(TextControlsPlugin);
  pluginManager.registerPlugin(TextStylePlugin);
  pluginManager.registerPlugin(GroupControlsPlugin);
  pluginManager.registerPlugin(SVGPlugin);
  pluginManager.registerPlugin(SubPathListPlugin);
  pluginManager.registerPlugin(StructureTreePlugin); // Tree structure view with lock controls
  
  // Register plugins that depend on others
  pluginManager.registerPlugin(PencilPlugin); // Depends on mouse-interaction
  pluginManager.registerPlugin(SmoothPlugin); // Depends on pointer-interaction
  pluginManager.registerPlugin(CurvesPlugin); // Depends on mouse-interaction
  pluginManager.registerPlugin(SubPathTransformPlugin); // Depends on selection
  pluginManager.registerPlugin(PointTransformPlugin); // Depends on selection
  pluginManager.registerPlugin(HandlesPlugin); // Depends on selection and mouse-interaction
  
  // Register remaining plugins
  pluginManager.registerPlugin(ShapesPlugin);
  pluginManager.registerPlugin(TextPlacementPlugin);
  pluginManager.registerPlugin(TextEditPlugin);
  pluginManager.registerPlugin(ArrangePlugin);
  pluginManager.registerPlugin(ReorderPlugin);
  pluginManager.registerPlugin(PanelModePlugin);
  pluginManager.registerPlugin(KeyboardMovementPlugin); // Keyboard movement for selected elements
  pluginManager.registerPlugin(CommandFloatingActionsPlugin); // Floating actions for command points
  pluginManager.registerPlugin(SpecialPointFloatingActionsPlugin); // Floating actions for special command points (M+Z union)
  pluginManager.registerPlugin(ShortcutsPlugin);
  
  // Register sandbox plugins (experimental features)
  pluginManager.registerPlugin(TextPathPlugin);
  pluginManager.registerPlugin(AnimationSystemPlugin);
};
