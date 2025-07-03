import { pluginManager } from './PluginSystem';
import { ZoomPlugin } from '../plugins/zoom/Zoom';
import { GridPlugin } from '../plugins/grid/Grid';
import { UndoRedoPlugin } from '../plugins/undo-redo/UndoRedo';
import { CreationPlugin } from '../plugins/creation/Creation';
import { FullscreenPlugin } from '../plugins/fullscreen/Fullscreen';
import { PathStylePlugin } from '../plugins/path-style/PathStyle';
import { SelectionPlugin } from '../plugins/selection/Selection';
import { SVGPlugin } from '../plugins/svg-editor/SVGEditor';
import { SubPathListPlugin } from '../plugins/subpath-list/SubPathList';
import { MouseInteractionPlugin } from '../plugins/mouse-interaction/MouseInteraction';
import { PathRendererPlugin } from '../plugins/path-renderer/PathRenderer';
import { CommandPlugin } from '../plugins/command/Command';
import { GlobalKeyboardPlugin } from '../plugins/global-keyboard/GlobalKeyboard';
import { VisualDebugPlugin } from '../plugins/visual-debug/VisualDebug';
import { SubPathTransformPlugin } from '../plugins/subpath-transform/SubPathTransform';
import { PointTransformPlugin } from '../plugins/point-transform/PointTransform';
import { PencilPlugin } from '../plugins/pencil/Pencil';
import { ShapesPlugin } from '../plugins/shapes/Shapes';
import { Transform } from '../plugins/transform/Transform';
import { ArrangePlugin } from '../plugins/arrange/Arrange';
import { ReorderPlugin } from '../plugins/reorder/Reorder';
import { PanelModePlugin } from '../plugins/panelmode/PanelMode';

/**
 * Initialize all plugins in the correct dependency order
 * Following the modular plugin architecture principle from README.md
 */
export const initializePlugins = (): void => {
  // Register base dependencies first
  pluginManager.registerPlugin(MouseInteractionPlugin); // Required by pencil
  pluginManager.registerPlugin(SelectionPlugin); // Required by subpath-transform and point-transform
  
  // Register Transform early so it can handle transform handles before PathRenderer
  pluginManager.registerPlugin(Transform);
  
  // Register other core plugins
  pluginManager.registerPlugin(PathRendererPlugin);
  pluginManager.registerPlugin(VisualDebugPlugin);
  pluginManager.registerPlugin(CommandPlugin);
  pluginManager.registerPlugin(CreationPlugin);
  pluginManager.registerPlugin(GlobalKeyboardPlugin);
  pluginManager.registerPlugin(ZoomPlugin);
  pluginManager.registerPlugin(GridPlugin);
  pluginManager.registerPlugin(UndoRedoPlugin);
  pluginManager.registerPlugin(FullscreenPlugin);
  pluginManager.registerPlugin(PathStylePlugin);
  pluginManager.registerPlugin(SVGPlugin);
  pluginManager.registerPlugin(SubPathListPlugin);
  
  // Register plugins that depend on others
  pluginManager.registerPlugin(PencilPlugin); // Depends on mouse-interaction
  pluginManager.registerPlugin(SubPathTransformPlugin); // Depends on selection
  pluginManager.registerPlugin(PointTransformPlugin); // Depends on selection
  
  // Register remaining plugins
  pluginManager.registerPlugin(ShapesPlugin);
  pluginManager.registerPlugin(ArrangePlugin);
  pluginManager.registerPlugin(ReorderPlugin);
  pluginManager.registerPlugin(PanelModePlugin);
};
