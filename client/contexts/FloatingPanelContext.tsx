import React, { createContext, useContext, useReducer, ReactNode } from "react";

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelState {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  isMinimized: boolean;
  position: PanelPosition;
  size: { width: number; height: number };
  zIndex: number;
  isDragging: boolean;
  isResizing: boolean;
  hideFromDock: boolean;
}

export interface FloatingPanelState {
  panels: Record<string, PanelState>;
  activePanel: string | null;
  maxZIndex: number;
}

type FloatingPanelAction =
  | {
      type: "REGISTER_PANEL";
      panel: Omit<PanelState, "zIndex" | "isDragging" | "isResizing">;
    }
  | { type: "TOGGLE_PANEL"; panelId: string }
  | { type: "MINIMIZE_PANEL"; panelId: string }
  | { type: "MAXIMIZE_PANEL"; panelId: string }
  | { type: "SET_PANEL_POSITION"; panelId: string; position: PanelPosition }
  | {
      type: "SET_PANEL_SIZE";
      panelId: string;
      size: { width: number; height: number };
    }
  | { type: "START_DRAG"; panelId: string }
  | { type: "END_DRAG"; panelId: string }
  | { type: "START_RESIZE"; panelId: string }
  | { type: "END_RESIZE"; panelId: string }
  | { type: "BRING_TO_FRONT"; panelId: string }
  | { type: "CLOSE_PANEL"; panelId: string };

const initialState: FloatingPanelState = {
  panels: {},
  activePanel: null,
  maxZIndex: 1000,
};

function floatingPanelReducer(
  state: FloatingPanelState,
  action: FloatingPanelAction,
): FloatingPanelState {
  switch (action.type) {
    case "REGISTER_PANEL":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panel.id]: {
            ...action.panel,
            zIndex: state.maxZIndex + 1,
            isDragging: false,
            isResizing: false,
          },
        },
        maxZIndex: state.maxZIndex + 1,
      };

    case "TOGGLE_PANEL":
      const panel = state.panels[action.panelId];
      if (!panel) return state;

      // If panel is currently minimized, maximize it instead of toggling
      if (panel.isMinimized) {
        return {
          ...state,
          panels: {
            ...state.panels,
            [action.panelId]: {
              ...panel,
              isOpen: true,
              isMinimized: false,
              zIndex: state.maxZIndex + 1,
            },
          },
          activePanel: action.panelId,
          maxZIndex: state.maxZIndex + 1,
        };
      }

      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...panel,
            isOpen: !panel.isOpen,
            isMinimized: false,
          },
        },
        activePanel: !panel.isOpen ? action.panelId : null,
      };

    case "MINIMIZE_PANEL":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            isMinimized: true,
            isOpen: true, // Keep panel open but minimized to show in dock
          },
        },
        activePanel:
          state.activePanel === action.panelId ? null : state.activePanel,
      };

    case "MAXIMIZE_PANEL":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            isMinimized: false,
            isOpen: true,
            zIndex: state.maxZIndex + 1,
          },
        },
        activePanel: action.panelId,
        maxZIndex: state.maxZIndex + 1,
      };

    case "SET_PANEL_POSITION":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            position: action.position,
          },
        },
      };

    case "SET_PANEL_SIZE":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            size: action.size,
          },
        },
      };

    case "START_RESIZE":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            isResizing: true,
            zIndex: state.maxZIndex + 1,
          },
        },
        activePanel: action.panelId,
        maxZIndex: state.maxZIndex + 1,
      };

    case "END_RESIZE":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            isResizing: false,
          },
        },
      };

    case "START_DRAG":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            isDragging: true,
            zIndex: state.maxZIndex + 1,
          },
        },
        activePanel: action.panelId,
        maxZIndex: state.maxZIndex + 1,
      };

    case "END_DRAG":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            isDragging: false,
          },
        },
      };

    case "BRING_TO_FRONT":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            zIndex: state.maxZIndex + 1,
          },
        },
        activePanel: action.panelId,
        maxZIndex: state.maxZIndex + 1,
      };

    case "CLOSE_PANEL":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            isOpen: false,
            isMinimized: false,
          },
        },
        activePanel:
          state.activePanel === action.panelId ? null : state.activePanel,
      };

    default:
      return state;
  }
}

interface FloatingPanelContextType {
  state: FloatingPanelState;
  dispatch: React.Dispatch<FloatingPanelAction>;
}

const FloatingPanelContext = createContext<
  FloatingPanelContextType | undefined
>(undefined);

export function FloatingPanelProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(floatingPanelReducer, initialState);

  return (
    <FloatingPanelContext.Provider value={{ state, dispatch }}>
      {children}
    </FloatingPanelContext.Provider>
  );
}

export function useFloatingPanels() {
  const context = useContext(FloatingPanelContext);
  if (context === undefined) {
    throw new Error(
      "useFloatingPanels must be used within a FloatingPanelProvider",
    );
  }
  return context;
}
