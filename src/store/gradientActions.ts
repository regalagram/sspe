import { StateCreator } from 'zustand';
import { EditorState, GradientOrPattern } from '../types';

export interface GradientActions {
  // Gradient management
  setGradients: (gradients: GradientOrPattern[]) => void;
  addGradient: (gradient: GradientOrPattern) => void;
  removeGradient: (gradientId: string) => void;
  clearGradients: () => void;
  getGradientById: (gradientId: string) => GradientOrPattern | null;
}

export const createGradientActions: StateCreator<
  EditorState & GradientActions,
  [],
  [],
  GradientActions
> = (set, get) => ({
  
  setGradients: (gradients: GradientOrPattern[]) => {
    set(state => ({
      gradients: gradients
    }));
  },

  addGradient: (gradient: GradientOrPattern) => {
    set(state => {
      // Check if gradient already exists
      const exists = state.gradients.some(g => g.id === gradient.id);
      if (exists) {
        // Replace existing gradient
        return {
          gradients: state.gradients.map(g => g.id === gradient.id ? gradient : g)
        };
      } else {
        // Add new gradient
        return {
          gradients: [...state.gradients, gradient]
        };
      }
    });
  },

  removeGradient: (gradientId: string) => {
    set(state => ({
      gradients: state.gradients.filter(g => g.id !== gradientId)
    }));
  },

  clearGradients: () => {
    set(state => ({
      gradients: []
    }));
  },

  getGradientById: (gradientId: string) => {
    const state = get();
    return state.gradients.find(g => g.id === gradientId) || null;
  }
});