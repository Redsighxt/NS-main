import React, { createContext, useContext, useReducer, ReactNode } from "react";

export type CanvasMode = "infinite" | "page";
export type CameraTrackingMode = "off" | "automatic" | "manual";

export interface CameraKeyframe {
  id: string;
  timestamp: number; // in seconds
  x: number;
  y: number;
  scale: number;
}

export interface CameraPath {
  id: string;
  keyframes: CameraKeyframe[];
  curve: { x: number; y: number }[]; // Bezier curve points
}

export interface OriginBox {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  style: {
    strokeColor: string;
    strokeWidth: number;
    strokeStyle: "solid" | "dashed" | "dotted";
    opacity: number;
  };
}

export interface CanvasSettingsState {
  canvasMode: CanvasMode;
  cameraTrackingMode: CameraTrackingMode;
  cameraPath: CameraPath | null;
  currentCameraPosition: { x: number; y: number; scale: number };
  isCreatingCameraPath: boolean;
  pageSize: { width: number; height: number };
  autoTrackingSmoothing: number; // 0-1 for smoothness
  showGrid: boolean;
  gridSize: number; // Grid density (pixels)
  showRuledLines: boolean;
  ruledLineSpacing: number; // Spacing between ruled lines
  ruledLineColor: string; // Color of ruled lines
  showMargins: boolean;
  marginPosition: number; // 1-100 percentage from left
  marginColor: string; // Color of side margin
  marginStyle: "solid" | "dashed" | "dotted"; // Line style for margin
  // Origin box settings for infinite canvas
  originBox: OriginBox;
}

type CanvasSettingsAction =
  | { type: "SET_CANVAS_MODE"; mode: CanvasMode }
  | { type: "SET_CAMERA_TRACKING_MODE"; mode: CameraTrackingMode }
  | {
      type: "SET_CAMERA_POSITION";
      position: { x: number; y: number; scale: number };
    }
  | { type: "START_CREATING_CAMERA_PATH" }
  | { type: "STOP_CREATING_CAMERA_PATH" }
  | { type: "ADD_CAMERA_KEYFRAME"; keyframe: CameraKeyframe }
  | { type: "UPDATE_CAMERA_PATH"; path: CameraPath }
  | { type: "SET_PAGE_SIZE"; size: { width: number; height: number } }
  | { type: "SET_AUTO_TRACKING_SMOOTHING"; smoothing: number }
  | { type: "CLEAR_CAMERA_PATH" }
  | { type: "TOGGLE_GRID"; show: boolean }
  | { type: "SET_GRID_SIZE"; size: number }
  | { type: "TOGGLE_RULED_LINES"; show: boolean }
  | { type: "SET_RULED_LINE_SPACING"; spacing: number }
  | { type: "SET_RULED_LINE_COLOR"; color: string }
  | { type: "TOGGLE_MARGINS"; show: boolean }
  | { type: "SET_MARGIN_POSITION"; position: number }
  | { type: "SET_MARGIN_COLOR"; color: string }
  | { type: "SET_MARGIN_STYLE"; style: "solid" | "dashed" | "dotted" }
  // Origin box actions
  | { type: "TOGGLE_ORIGIN_BOX"; show: boolean }
  | { type: "SET_ORIGIN_BOX_STYLE"; style: Partial<OriginBox["style"]> }
  | { type: "SET_ORIGIN_BOX_POSITION"; position: { x: number; y: number } };

const initialState: CanvasSettingsState = {
  canvasMode: "infinite",
  cameraTrackingMode: "off",
  cameraPath: null,
  currentCameraPosition: { x: 0, y: 0, scale: 1 },
  isCreatingCameraPath: false,
  pageSize: { width: 1920, height: 1080 }, // Default size, will be updated on mount
  autoTrackingSmoothing: 0.8,
  showGrid: false,
  gridSize: 20,
  showRuledLines: false,
  ruledLineSpacing: 24, // Standard ruled paper spacing
  ruledLineColor: "#d1d5db", // Light grey default
  showMargins: false,
  marginPosition: 15, // 15% from left
  marginColor: "#d1d5db", // Light grey default
  marginStyle: "dashed", // Default to dashed
  // Origin box for infinite canvas (1920x1080 reference frame)
  originBox: {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    visible: false, // Hidden by default
    style: {
      strokeColor: "#3b82f6", // Blue outline
      strokeWidth: 2,
      strokeStyle: "dashed",
      opacity: 0.7,
    },
  },
};

function canvasSettingsReducer(
  state: CanvasSettingsState,
  action: CanvasSettingsAction,
): CanvasSettingsState {
  switch (action.type) {
    case "SET_CANVAS_MODE":
      return { ...state, canvasMode: action.mode };

    case "SET_CAMERA_TRACKING_MODE":
      return {
        ...state,
        cameraTrackingMode: action.mode,
        // Clear camera path when switching away from manual mode
        cameraPath: action.mode === "manual" ? state.cameraPath : null,
        isCreatingCameraPath:
          action.mode === "manual" ? state.isCreatingCameraPath : false,
      };

    case "SET_CAMERA_POSITION":
      return { ...state, currentCameraPosition: action.position };

    case "START_CREATING_CAMERA_PATH":
      return {
        ...state,
        isCreatingCameraPath: true,
        cameraPath: {
          id: `path-${Date.now()}`,
          keyframes: [],
          curve: [],
        },
      };

    case "STOP_CREATING_CAMERA_PATH":
      return { ...state, isCreatingCameraPath: false };

    case "ADD_CAMERA_KEYFRAME":
      if (!state.cameraPath) return state;

      const updatedKeyframes = [
        ...state.cameraPath.keyframes,
        action.keyframe,
      ].sort((a, b) => a.timestamp - b.timestamp);

      return {
        ...state,
        cameraPath: {
          ...state.cameraPath,
          keyframes: updatedKeyframes,
        },
      };

    case "UPDATE_CAMERA_PATH":
      return { ...state, cameraPath: action.path };

    case "SET_PAGE_SIZE":
      return { ...state, pageSize: action.size };

    case "SET_AUTO_TRACKING_SMOOTHING":
      return { ...state, autoTrackingSmoothing: action.smoothing };

    case "CLEAR_CAMERA_PATH":
      return {
        ...state,
        cameraPath: null,
        isCreatingCameraPath: false,
      };

    case "TOGGLE_GRID":
      return { ...state, showGrid: action.show };

    case "SET_GRID_SIZE":
      return { ...state, gridSize: action.size };

    case "TOGGLE_RULED_LINES":
      return { ...state, showRuledLines: action.show };

    case "SET_RULED_LINE_SPACING":
      return { ...state, ruledLineSpacing: action.spacing };

    case "SET_RULED_LINE_COLOR":
      return { ...state, ruledLineColor: action.color };

    case "TOGGLE_MARGINS":
      return { ...state, showMargins: action.show };

    case "SET_MARGIN_POSITION":
      return { ...state, marginPosition: action.position };

    case "SET_MARGIN_COLOR":
      return { ...state, marginColor: action.color };

    case "SET_MARGIN_STYLE":
      return { ...state, marginStyle: action.style };

    case "TOGGLE_ORIGIN_BOX":
      return {
        ...state,
        originBox: { ...state.originBox, visible: action.show },
      };

    case "SET_ORIGIN_BOX_STYLE":
      return {
        ...state,
        originBox: {
          ...state.originBox,
          style: { ...state.originBox.style, ...action.style },
        },
      };

    case "SET_ORIGIN_BOX_POSITION":
      return {
        ...state,
        originBox: {
          ...state.originBox,
          x: action.position.x,
          y: action.position.y,
        },
      };

    default:
      return state;
  }
}

interface CanvasSettingsContextType {
  state: CanvasSettingsState;
  dispatch: React.Dispatch<CanvasSettingsAction>;
}

const CanvasSettingsContext = createContext<
  CanvasSettingsContextType | undefined
>(undefined);

export function CanvasSettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(canvasSettingsReducer, initialState);

  // Initialize page size on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      dispatch({
        type: "SET_PAGE_SIZE",
        size: { width: window.innerWidth, height: window.innerHeight },
      });
    }
  }, []);

  return (
    <CanvasSettingsContext.Provider value={{ state, dispatch }}>
      {children}
    </CanvasSettingsContext.Provider>
  );
}

export function useCanvasSettings() {
  const context = useContext(CanvasSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useCanvasSettings must be used within a CanvasSettingsProvider",
    );
  }
  return context;
}
