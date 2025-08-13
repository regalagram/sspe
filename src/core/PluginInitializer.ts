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
import { PathRendererPlugin } from '../plugins/path-renderer/PathRenderer';
import { CommandPlugin } from '../plugins/command/Command';
import { VisualDebugPlugin } from '../plugins/visual-debug/VisualDebug';
import { SubPathTransformPlugin } from '../plugins/subpath-transform/SubPathTransform';
import { PointTransformPlugin } from '../plugins/point-transform/PointTransform';
import { PencilPlugin } from '../plugins/pencil/Pencil';
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
import { TextRendererPlugin } from '../plugins/text-renderer';
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
import { ContextMenuPlugin } from '../plugins/context-menu';
import { KeyboardMovementPlugin } from '../plugins/keyboard-movement';
import { TextPlacementPlugin } from '../plugins/text-placement';
import { TextEditPlugin } from '../plugins/text-edit';

/**
 * Initialize all plugins in the correct dependency order
 * Following the modular plugin architecture principle from README.md
 */
export const initializePlugins = (): void => {
  // Register base dependencies first
  pluginManager.registerPlugin(PointerInteractionPlugin); // Required by pencil
  pluginManager.registerPlugin(GesturesPlugin); // Gestures for pinch/pan on canvas, need to be before selection and transform plugins
  pluginManager.registerPlugin(ContextMenuPlugin); // Context menu should be early to handle right-clicks before other interactions
  pluginManager.registerPlugin(SelectionPlugin); // Required by subpath-transform and point-transform
  
  // Register Transform early so it can handle transform handles before PathRenderer
  pluginManager.registerPlugin(Transform);
  
  // Register other core plugins
  pluginManager.registerPlugin(PathRendererPlugin);
  pluginManager.registerPlugin(TextRendererPlugin);
  pluginManager.registerPlugin(GroupRendererPlugin);
  pluginManager.registerPlugin(FilterPlugin); // Filter definitions (must be before paths use them)
  pluginManager.registerPlugin(ClippingPlugin); // Clip path and mask definitions (must be before ImagePlugin)
  pluginManager.registerPlugin(MarkerPlugin); // Marker definitions
  pluginManager.registerPlugin(ImagePlugin); // Image rendering and controls
  pluginManager.registerPlugin(SymbolPlugin); // Symbol definitions and use instances
  pluginManager.registerPlugin(StickyGuidelinesPlugin);
  pluginManager.registerPlugin(VisualDebugPlugin);
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
  
  // Register plugins that depend on others
  pluginManager.registerPlugin(PencilPlugin); // Depends on mouse-interaction
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
  pluginManager.registerPlugin(ShortcutsPlugin);
  
  // Register sandbox plugins (experimental features)
  pluginManager.registerPlugin(TextPathPlugin);
  pluginManager.registerPlugin(AnimationSystemPlugin);
};
