import { StateCreator } from 'zustand';
import { EditorState, Point } from '../types';
import { scaleSubPath, rotateSubPath, translateSubPath, getSubPathCenter, mirrorSubPathHorizontal, mirrorSubPathVertical } from '../utils/transform-subpath-utils';
import { HistoryActions } from './historyActions';

export interface TransformActions {
  scaleSubPath: (subPathId: string, scaleX: number, scaleY: number, center?: Point) => void;
  rotateSubPath: (subPathId: string, angle: number, center?: Point) => void;
  translateSubPath: (subPathId: string, delta: Point) => void;
  mirrorSubPathHorizontal: (subPathId: string, center?: Point) => void;
  mirrorSubPathVertical: (subPathId: string, center?: Point) => void;
}

export const createTransformActions: StateCreator<
  EditorState & TransformActions & HistoryActions,
  [],
  [],
  TransformActions
> = (set, get) => ({
  scaleSubPath: (subPathId, scaleX, scaleY, center) => {
    get().pushToHistory();
    set((state) => {
      const actualCenter: Point = center || (() => {
        for (const path of state.paths) {
          const subPath = path.subPaths.find(sp => sp.id === subPathId);
          if (subPath) {
            return getSubPathCenter(subPath);
          }
        }
        // Fallback to origin if subPath not found
        return { x: 0, y: 0 };
      })();
      return {
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) =>
            subPath.id === subPathId
              ? scaleSubPath(subPath, scaleX, scaleY, actualCenter)
              : subPath
          ),
        })),
        renderVersion: state.renderVersion + 1,
      };
    });
  },

  rotateSubPath: (subPathId, angle, center) => {
    get().pushToHistory();
    set((state) => {
      const actualCenter: Point = center || (() => {
        for (const path of state.paths) {
          const subPath = path.subPaths.find(sp => sp.id === subPathId);
          if (subPath) {
            return getSubPathCenter(subPath);
          }
        }
        // Fallback to origin if subPath not found
        return { x: 0, y: 0 };
      })();
      return {
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) =>
            subPath.id === subPathId
              ? rotateSubPath(subPath, angle, actualCenter)
              : subPath
          ),
        })),
        renderVersion: state.renderVersion + 1,
      };
    });
  },

  translateSubPath: (subPathId, delta) => {
    set((state) => ({
      paths: state.paths.map((path) => ({
        ...path,
        subPaths: path.subPaths.map((subPath) =>
          subPath.id === subPathId
            ? translateSubPath(subPath, delta)
            : subPath
        ),
      })),
      renderVersion: state.renderVersion + 1,
    }));
  },

  mirrorSubPathHorizontal: (subPathId, center) => {
    get().pushToHistory();
    set((state) => {
      const actualCenter: Point = center || (() => {
        for (const path of state.paths) {
          const subPath = path.subPaths.find(sp => sp.id === subPathId);
          if (subPath) {
            return getSubPathCenter(subPath);
          }
        }
        // Fallback to origin if subPath not found
        return { x: 0, y: 0 };
      })();
      return {
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) =>
            subPath.id === subPathId
              ? mirrorSubPathHorizontal(subPath, actualCenter)
              : subPath
          ),
        })),
        renderVersion: state.renderVersion + 1,
      };
    });
  },

  mirrorSubPathVertical: (subPathId, center) => {
    get().pushToHistory();
    set((state) => {
      const actualCenter: Point = center || (() => {
        for (const path of state.paths) {
          const subPath = path.subPaths.find(sp => sp.id === subPathId);
          if (subPath) {
            return getSubPathCenter(subPath);
          }
        }
        // Fallback to origin if subPath not found
        return { x: 0, y: 0 };
      })();
      return {
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) =>
            subPath.id === subPathId
              ? mirrorSubPathVertical(subPath, actualCenter)
              : subPath
          ),
        })),
        renderVersion: state.renderVersion + 1,
      };
    });
  },
});