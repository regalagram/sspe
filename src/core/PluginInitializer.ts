import { ShortcutsPlugin } from '../plugins/shortcuts/Shortcuts';
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
import { FigmaHandlesPlugin } from '../plugins/figma-handles/FigmaHandles';
import { CurvesPlugin } from '../plugins/curves/Curves';
import { TouchAdapterPlugin } from '../plugins/touch-adapter/TouchAdapter';

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
  pluginManager.registerPlugin(TouchAdapterPlugin);
  pluginManager.registerPlugin(PathRendererPlugin);
  pluginManager.registerPlugin(VisualDebugPlugin);
  pluginManager.registerPlugin(CommandPlugin);
  pluginManager.registerPlugin(CreationPlugin);
  pluginManager.registerPlugin(ZoomPlugin);
  pluginManager.registerPlugin(GridPlugin);
  pluginManager.registerPlugin(UndoRedoPlugin);
  pluginManager.registerPlugin(FullscreenPlugin);
  pluginManager.registerPlugin(DeletePlugin);
  pluginManager.registerPlugin(PathStylePlugin);
  pluginManager.registerPlugin(SVGPlugin);
  pluginManager.registerPlugin(SubPathListPlugin);
  
  // Register plugins that depend on others
  pluginManager.registerPlugin(PencilPlugin); // Depends on mouse-interaction
  pluginManager.registerPlugin(CurvesPlugin); // Depends on mouse-interaction
  pluginManager.registerPlugin(SubPathTransformPlugin); // Depends on selection
  pluginManager.registerPlugin(PointTransformPlugin); // Depends on selection
  pluginManager.registerPlugin(FigmaHandlesPlugin); // Depends on selection and mouse-interaction
  
  // Register remaining plugins
  pluginManager.registerPlugin(ShapesPlugin);
  pluginManager.registerPlugin(ArrangePlugin);
  pluginManager.registerPlugin(ReorderPlugin);
  pluginManager.registerPlugin(PanelModePlugin);
  pluginManager.registerPlugin(ShortcutsPlugin);
};
