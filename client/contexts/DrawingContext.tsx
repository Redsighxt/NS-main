import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { useTheme } from "./ThemeContext";
import { updateArrowBinding } from "../lib/arrowSystem";

// Import animation context types for stroke recording
export interface StrokeEvent {
  id: string;
  elementId: string;
  layerId: string;
  timestamp: number;
  type: "start" | "update" | "finish";
  element: DrawingElement;
}

export interface ArrowBinding {
  elementId: string;
  focus: number; // 0-1, position along the bound element's perimeter
  gap: number; // Distance from the element edge
  fixedPoint?: [number, number]; // Fixed point for binding precision
}

export interface DrawingElement {
  id: string;
  type:
    | "path"
    | "highlighter"
    | "rectangle"
    | "ellipse"
    | "diamond"
    | "line"
    | "arrow"
    | "text"
    | "library-component"
    | "eraser";
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  text?: string;
  style: {
    stroke: string;
    strokeWidth: number;
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
  };
  layerId: string;
  timestamp: number;
  // Excalidraw-style extended properties
  roughness?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  fillStyle?: "none" | "hachure" | "cross-hatch" | "dots" | "zigzag" | "solid";
  opacity?: number; // For highlighter transparency
  backgroundColor?: string;
  controlPoints?: { x: number; y: number }[]; // For bendable arrows/lines
  // Arrow-specific properties
  startArrowhead?: "none" | "arrow" | "triangle" | "triangle_outline" | "dot";
  endArrowhead?: "none" | "arrow" | "triangle" | "triangle_outline" | "dot";
  startBinding?: ArrowBinding | null;
  endBinding?: ArrowBinding | null;
  // Library component properties
  svg?: string;
  libraryElements?: any[];
  libraryComponentId?: string;
  animationData?: {
    duration?: number;
    delay?: number;
    easing?: string;
  };
  // Text styling properties
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface PasteState {
  id: string;
  name: string;
  elements: DrawingElement[];
  originalArea: { x: number; y: number }[];
  timestamp: number;
}

export interface DrawingState {
  elements: DrawingElement[];
  selectedElements: string[];
  currentTool:
    | "select"
    | "pencil"
    | "highlighter"
    | "rectangle"
    | "ellipse"
    | "diamond"
    | "line"
    | "arrow"
    | "text"
    | "hand"
    | "eraser";
  viewTransform: ViewTransform;
  isDrawing: boolean;
  currentElement: DrawingElement | null;
  brushColor: string;
  brushSize: number;
  fillColor: string;
  highlighterColor: string;
  highlighterOpacity: number;
  roughness: number; // For rough.js shapes
  backgroundPattern:
    | "none"
    | "hachure"
    | "cross-hatch"
    | "dots"
    | "zigzag"
    | "solid";
  fillPatternRotation: number; // 0-360 degrees rotation for fill patterns
  lineNodes: number; // 0-10 nodes for curved lines and arrows
  sloppiness: number; // 0 = architect, 1 = artist, 2 = cartoonist
  strokeSmoothing: number; // 0-1, how much to smooth strokes
  pressureEnabled: boolean; // enable pressure variation
  textStyle: {
    fontSize: number;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
  lineStyle: {
    type: "solid" | "dashed" | "dotted";
    intensity: number; // 1-10 scale for dash/dot spacing
    opacity: number; // 0-1 for transparency
  };
  // Arrow head settings
  arrowSettings: {
    startArrowhead: "none" | "arrow" | "triangle" | "triangle_outline" | "dot";
    endArrowhead: "none" | "arrow" | "triangle" | "triangle_outline" | "dot";
    enableBinding: boolean; // Whether arrows should bind to shapes
  };
  layers: Array<{
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    pinned: boolean;
  }>;
  activeLayerId: string;
  history: DrawingElement[][];
  historyIndex: number;
  onStrokeEvent?: (stroke: StrokeEvent) => void; // Callback for animation recording
  pasteStates: PasteState[];
  showPasteButtons: boolean;
  // Eraser properties
  eraserMode: "normal" | "element";
  eraserSize: number;
  // Selection properties
  deepSelect: boolean;
}

type DrawingAction =
  | { type: "SET_TOOL"; tool: DrawingState["currentTool"] }
  | { type: "START_DRAWING"; element: DrawingElement }
  | { type: "UPDATE_DRAWING"; points: { x: number; y: number }[] }
  | { type: "FINISH_DRAWING" }
  | { type: "ADD_ELEMENT"; element: DrawingElement }
  | { type: "SELECT_ELEMENTS"; elementIds: string[] }
  | { type: "DELETE_SELECTED" }
  | { type: "DELETE_ELEMENT"; elementId: string }
  | { type: "SET_VIEW_TRANSFORM"; transform: ViewTransform }
  | { type: "SET_BRUSH_COLOR"; color: string }
  | { type: "SET_BRUSH_SIZE"; size: number }
  | { type: "SET_FILL_COLOR"; color: string }
  | { type: "SET_HIGHLIGHTER_COLOR"; color: string }
  | { type: "SET_HIGHLIGHTER_OPACITY"; opacity: number }
  | { type: "SET_ROUGHNESS"; roughness: number }
  | {
      type: "SET_BACKGROUND_PATTERN";
      pattern: "none" | "hachure" | "cross-hatch" | "dots" | "zigzag" | "solid";
    }
  | { type: "SET_FILL_PATTERN_ROTATION"; rotation: number }
  | { type: "SET_LINE_NODES"; nodes: number }
  | { type: "SET_SLOPPINESS"; sloppiness: number }
  | { type: "SET_STROKE_SMOOTHING"; smoothing: number }
  | { type: "SET_PRESSURE_ENABLED"; enabled: boolean }
  | { type: "SET_TEXT_FONT_SIZE"; fontSize: number }
  | { type: "SET_TEXT_FONT_FAMILY"; fontFamily: string }
  | { type: "SET_TEXT_BOLD"; bold: boolean }
  | { type: "SET_TEXT_ITALIC"; italic: boolean }
  | { type: "SET_TEXT_UNDERLINE"; underline: boolean }
  | {
      type: "SET_LINE_STYLE_TYPE";
      lineType: "solid" | "dashed" | "dotted";
    }
  | { type: "SET_LINE_STYLE_INTENSITY"; intensity: number }
  | { type: "SET_LINE_STYLE_OPACITY"; opacity: number }
  | { type: "SET_ERASER_MODE"; mode: "normal" | "element" }
  | { type: "SET_ERASER_SIZE"; size: number }
  | { type: "SET_DEEP_SELECT"; deepSelect: boolean }
  | {
      type: "SET_START_ARROWHEAD";
      arrowhead: "none" | "arrow" | "triangle" | "triangle_outline" | "dot";
    }
  | {
      type: "SET_END_ARROWHEAD";
      arrowhead: "none" | "arrow" | "triangle" | "triangle_outline" | "dot";
    }
  | { type: "SET_ARROW_BINDING_ENABLED"; enabled: boolean }
  | { type: "ADD_PASTE_STATE"; pasteState: PasteState }
  | { type: "REMOVE_PASTE_STATE"; pasteId: string }
  | { type: "SET_SHOW_PASTE_BUTTONS"; show: boolean }
  | {
      type: "PASTE_ELEMENTS";
      pasteId: string;
      position: { x: number; y: number };
    }
  | { type: "ADD_LAYER"; layer: { id: string; name: string } }
  | { type: "SET_ACTIVE_LAYER"; layerId: string }
  | { type: "TOGGLE_LAYER_VISIBILITY"; layerId: string }
  | { type: "TOGGLE_LAYER_LOCK"; layerId: string }
  | { type: "TOGGLE_LAYER_PIN"; layerId: string }
  | { type: "CLEAR_LAYER"; layerId: string }
  | {
      type: "MOVE_ELEMENTS";
      elementIds: string[];
      deltaX: number;
      deltaY: number;
    }
  | { type: "FINISH_MOVING_ELEMENTS" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SAVE_STATE" }
  | { type: "CLEAR_CANVAS" }
  | {
      type: "RESIZE_ELEMENT";
      elementId: string;
      width: number;
      height: number;
      x?: number;
      y?: number;
    }
  | {
      type: "LOAD_PROJECT";
      elements: DrawingElement[];
      layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        locked: boolean;
        pinned: boolean;
      }>;
      viewTransform?: ViewTransform;
    }
  | {
      type: "SET_STROKE_CALLBACK";
      callback: (stroke: StrokeEvent) => void;
    };

// Helper function to get theme-based default color
function getDefaultBrushColor(isDark: boolean): string {
  return isDark ? "#ffffff" : "#000000";
}

const createInitialState = (isDark = false): DrawingState => ({
  elements: [],
  selectedElements: [],
  currentTool: "pencil",
  viewTransform: { x: 0, y: 0, scale: 1 },
  isDrawing: false,
  currentElement: null,
  brushColor: getDefaultBrushColor(isDark),
  brushSize: 4,
  fillColor: "transparent",
  highlighterColor: "#9c27b0",
  highlighterOpacity: 0.3,
  roughness: 1,
  backgroundPattern: "none",
  fillPatternRotation: 0, // Default rotation of 0 degrees
  lineNodes: 0, // Default to straight lines (0 nodes)
  sloppiness: 1, // Default to "artist" mode
  strokeSmoothing: 0.5, // Moderate smoothing
  pressureEnabled: true, // Enable pressure variation
  textStyle: {
    fontSize: 16,
    fontFamily: "Arial",
    bold: false,
    italic: false,
    underline: false,
  },
  lineStyle: {
    type: "solid",
    intensity: 5,
    opacity: 1,
  },
  // Arrow head settings
  arrowSettings: {
    startArrowhead: "none",
    endArrowhead: "arrow",
    enableBinding: true,
  },
  layers: [
    {
      id: "layer-1",
      name: "Layer 1",
      visible: true,
      locked: false,
      pinned: false,
    },
  ],
  activeLayerId: "layer-1",
  history: [[]],
  historyIndex: 0,
  pasteStates: [],
  showPasteButtons: false,
  // Eraser properties
  eraserMode: "normal",
  eraserSize: 10,
  // Selection properties
  deepSelect: false,
});

function drawingReducer(
  state: DrawingState,
  action: DrawingAction,
): DrawingState {
  switch (action.type) {
    case "SET_TOOL":
      return { ...state, currentTool: action.tool, selectedElements: [] };

    case "START_DRAWING":
      const newState = {
        ...state,
        isDrawing: true,
        currentElement: action.element,
        selectedElements: [],
      };

      // Record stroke start event asynchronously to avoid render-time updates
      if (state.onStrokeEvent) {
        setTimeout(() => {
          state.onStrokeEvent?.({
            id: `stroke-start-${action.element.id}`,
            elementId: action.element.id,
            layerId: action.element.layerId,
            timestamp: Date.now(),
            type: "start",
            element: action.element,
          });
        }, 0);
      }

      return newState;

    case "UPDATE_DRAWING":
      if (
        !state.currentElement ||
        (state.currentElement.type !== "path" &&
          state.currentElement.type !== "highlighter")
      )
        return state;
      return {
        ...state,
        currentElement: {
          ...state.currentElement,
          points: action.points,
        },
      };

    case "FINISH_DRAWING":
      if (!state.currentElement) return state;

      const currentElement = state.currentElement;
      const newStateWithElement = {
        ...state,
        elements: [...state.elements, state.currentElement],
        isDrawing: false,
        currentElement: null,
      };

      const finalState = {
        ...newStateWithElement,
        history: [
          ...newStateWithElement.history.slice(
            0,
            newStateWithElement.historyIndex + 1,
          ),
          [...newStateWithElement.elements],
        ],
        historyIndex: newStateWithElement.historyIndex + 1,
      };

      // Record stroke finish event asynchronously to avoid render-time updates
      if (state.onStrokeEvent) {
        setTimeout(() => {
          state.onStrokeEvent?.({
            id: `stroke-finish-${currentElement.id}`,
            elementId: currentElement.id,
            layerId: currentElement.layerId,
            timestamp: Date.now(),
            type: "finish",
            element: currentElement,
          });
        }, 0);
      }

      return finalState;

    case "ADD_ELEMENT":
      const addElementState = {
        ...state,
        elements: [...state.elements, action.element],
      };

      // Record stroke event for directly added elements (like text) asynchronously
      if (state.onStrokeEvent) {
        setTimeout(() => {
          state.onStrokeEvent?.({
            id: `stroke-direct-${action.element.id}`,
            elementId: action.element.id,
            layerId: action.element.layerId,
            timestamp: Date.now(),
            type: "finish",
            element: action.element,
          });
        }, 0);
      }

      return addElementState;

    case "SELECT_ELEMENTS":
      return { ...state, selectedElements: action.elementIds };

    case "DELETE_SELECTED":
      return {
        ...state,
        elements: state.elements.filter(
          (el) => !state.selectedElements.includes(el.id),
        ),
        selectedElements: [],
      };

    case "DELETE_ELEMENT":
      return {
        ...state,
        elements: state.elements.filter((el) => el.id !== action.elementId),
        selectedElements: state.selectedElements.filter(
          (id) => id !== action.elementId,
        ),
      };

    case "SET_VIEW_TRANSFORM":
      return { ...state, viewTransform: action.transform };

    case "SET_BRUSH_COLOR":
      return { ...state, brushColor: action.color };

    case "SET_BRUSH_SIZE":
      return { ...state, brushSize: action.size };

    case "SET_FILL_COLOR":
      return { ...state, fillColor: action.color };

    case "SET_HIGHLIGHTER_COLOR":
      return { ...state, highlighterColor: action.color };

    case "SET_HIGHLIGHTER_OPACITY":
      return { ...state, highlighterOpacity: action.opacity };

    case "SET_ROUGHNESS":
      return { ...state, roughness: action.roughness };

    case "SET_BACKGROUND_PATTERN":
      return { ...state, backgroundPattern: action.pattern };

    case "SET_FILL_PATTERN_ROTATION":
      return { ...state, fillPatternRotation: action.rotation };

    case "SET_LINE_NODES":
      return { ...state, lineNodes: action.nodes };

    case "SET_SLOPPINESS":
      return { ...state, sloppiness: action.sloppiness };

    case "SET_STROKE_SMOOTHING":
      return { ...state, strokeSmoothing: action.smoothing };

    case "SET_PRESSURE_ENABLED":
      return { ...state, pressureEnabled: action.enabled };

    case "SET_TEXT_FONT_SIZE":
      return {
        ...state,
        textStyle: { ...state.textStyle, fontSize: action.fontSize },
      };

    case "SET_TEXT_FONT_FAMILY":
      return {
        ...state,
        textStyle: { ...state.textStyle, fontFamily: action.fontFamily },
      };

    case "SET_TEXT_BOLD":
      return {
        ...state,
        textStyle: { ...state.textStyle, bold: action.bold },
      };

    case "SET_TEXT_ITALIC":
      return {
        ...state,
        textStyle: { ...state.textStyle, italic: action.italic },
      };

    case "SET_TEXT_UNDERLINE":
      return {
        ...state,
        textStyle: { ...state.textStyle, underline: action.underline },
      };

    case "SET_LINE_STYLE_TYPE":
      return {
        ...state,
        lineStyle: { ...state.lineStyle, type: action.lineType },
      };

    case "SET_LINE_STYLE_INTENSITY":
      return {
        ...state,
        lineStyle: { ...state.lineStyle, intensity: action.intensity },
      };

    case "SET_LINE_STYLE_OPACITY":
      return {
        ...state,
        lineStyle: { ...state.lineStyle, opacity: action.opacity },
      };

    case "ADD_LAYER":
      return {
        ...state,
        layers: [
          ...state.layers,
          { ...action.layer, visible: true, locked: false, pinned: false },
        ],
      };

    case "SET_ACTIVE_LAYER":
      return { ...state, activeLayerId: action.layerId };

    case "TOGGLE_LAYER_VISIBILITY":
      return {
        ...state,
        layers: state.layers.map((layer) =>
          layer.id === action.layerId
            ? { ...layer, visible: !layer.visible }
            : layer,
        ),
      };

    case "TOGGLE_LAYER_LOCK":
      return {
        ...state,
        layers: state.layers.map((layer) =>
          layer.id === action.layerId
            ? { ...layer, locked: !layer.locked }
            : layer,
        ),
      };

    case "TOGGLE_LAYER_PIN":
      return {
        ...state,
        layers: state.layers.map((layer) =>
          layer.id === action.layerId
            ? { ...layer, pinned: !layer.pinned }
            : layer,
        ),
      };

    case "CLEAR_LAYER":
      return {
        ...state,
        elements: state.elements.filter(
          (element) => element.layerId !== action.layerId,
        ),
        selectedElements: [], // Clear selection since elements might be deleted
      };

    case "MOVE_ELEMENTS":
      // Move elements without saving to history (real-time movement)
      const movedElements = state.elements.map((element) =>
        action.elementIds.includes(element.id)
          ? {
              ...element,
              x: element.x + action.deltaX,
              y: element.y + action.deltaY,
              points: element.points?.map((point) => ({
                x: point.x + action.deltaX,
                y: point.y + action.deltaY,
              })),
            }
          : element,
      );

      // Update arrow bindings when shapes move
      const updatedElements = movedElements.map((element) => {
        if (
          element.type === "arrow" &&
          (element.startBinding || element.endBinding)
        ) {
          return updateArrowBinding(element as any, movedElements);
        }
        return element;
      });

      return {
        ...state,
        elements: updatedElements,
      };

    case "FINISH_MOVING_ELEMENTS":
      // Save current state to history when movement is finished
      return {
        ...state,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          [...state.elements],
        ],
        historyIndex: state.historyIndex + 1,
      };

    case "SAVE_STATE":
      return {
        ...state,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          [...state.elements],
        ],
        historyIndex: state.historyIndex + 1,
      };

    case "UNDO":
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          ...state,
          elements: [...state.history[newIndex]],
          historyIndex: newIndex,
          selectedElements: [],
        };
      }
      return state;

    case "REDO":
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          ...state,
          elements: [...state.history[newIndex]],
          historyIndex: newIndex,
          selectedElements: [],
        };
      }
      return state;

    case "CLEAR_CANVAS":
      return {
        ...state,
        elements: [],
        selectedElements: [],
        currentElement: null,
        isDrawing: false,
      };

    case "RESIZE_ELEMENT":
      const resizedElements = state.elements.map((element) => {
        if (element.id !== action.elementId) return element;

        const updatedElement = { ...element };

        // Update basic dimensions
        if (action.width !== undefined) updatedElement.width = action.width;
        if (action.height !== undefined) updatedElement.height = action.height;
        if (action.x !== undefined) updatedElement.x = action.x;
        if (action.y !== undefined) updatedElement.y = action.y;

        // For text elements, update font size proportionally if resizing
        if (element.type === "text" && action.width && element.width) {
          const scaleX = action.width / element.width;
          const currentFontSize = element.style.fontSize || 16;
          updatedElement.style = {
            ...element.style,
            fontSize: Math.max(8, Math.min(72, currentFontSize * scaleX)), // Clamp font size
          };
        }

        return updatedElement;
      });

      // Update arrow bindings when shapes are resized
      const elementsWithUpdatedBindings = resizedElements.map((element) => {
        if (
          element.type === "arrow" &&
          (element.startBinding || element.endBinding)
        ) {
          return updateArrowBinding(element as any, resizedElements);
        }
        return element;
      });

      const resizedState = {
        ...state,
        elements: elementsWithUpdatedBindings,
      };

      // Don't save to history immediately during live resize to avoid cluttering undo history
      return resizedState;

    case "LOAD_PROJECT":
      const loadedState = {
        ...state,
        elements: action.elements,
        layers:
          action.layers.length > 0
            ? action.layers.map((layer) => ({
                ...layer,
                pinned: layer.pinned ?? false,
              }))
            : state.layers,
        activeLayerId:
          action.layers.length > 0 ? action.layers[0].id : state.activeLayerId,
        viewTransform: action.viewTransform || state.viewTransform,
        selectedElements: [],
        currentElement: null,
        isDrawing: false,
      };
      return {
        ...loadedState,
        history: [action.elements],
        historyIndex: 0,
      };

    case "SET_STROKE_CALLBACK":
      return {
        ...state,
        onStrokeEvent: action.callback,
      };

    case "SET_ERASER_MODE":
      return {
        ...state,
        eraserMode: action.mode,
      };

    case "SET_ERASER_SIZE":
      return {
        ...state,
        eraserSize: action.size,
      };

    case "SET_DEEP_SELECT":
      return {
        ...state,
        deepSelect: action.deepSelect,
      };

    case "SET_START_ARROWHEAD":
      return {
        ...state,
        arrowSettings: {
          ...state.arrowSettings,
          startArrowhead: action.arrowhead,
        },
      };

    case "SET_END_ARROWHEAD":
      return {
        ...state,
        arrowSettings: {
          ...state.arrowSettings,
          endArrowhead: action.arrowhead,
        },
      };

    case "SET_ARROW_BINDING_ENABLED":
      return {
        ...state,
        arrowSettings: {
          ...state.arrowSettings,
          enableBinding: action.enabled,
        },
      };

    case "ADD_PASTE_STATE":
      return {
        ...state,
        pasteStates: [...state.pasteStates, action.pasteState],
        showPasteButtons: true,
      };

    case "REMOVE_PASTE_STATE":
      return {
        ...state,
        pasteStates: state.pasteStates.filter((p) => p.id !== action.pasteId),
        showPasteButtons:
          state.pasteStates.filter((p) => p.id !== action.pasteId).length > 0,
      };

    case "SET_SHOW_PASTE_BUTTONS":
      return {
        ...state,
        showPasteButtons: action.show,
      };

    case "PASTE_ELEMENTS":
      const pasteState = state.pasteStates.find((p) => p.id === action.pasteId);
      if (!pasteState) return state;

      // Calculate offset from original position
      const originalBounds = pasteState.originalArea.reduce(
        (bounds, point) => ({
          minX: Math.min(bounds.minX, point.x),
          minY: Math.min(bounds.minY, point.y),
          maxX: Math.max(bounds.maxX, point.x),
          maxY: Math.max(bounds.maxY, point.y),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      );

      const offsetX = action.position.x - originalBounds.minX;
      const offsetY = action.position.y - originalBounds.minY;

      const newElements = pasteState.elements.map((el) => ({
        ...el,
        id: `element-${Date.now()}-${Math.random()}`,
        x: el.x + offsetX,
        y: el.y + offsetY,
        points: el.points?.map((point) => ({
          x: point.x + offsetX,
          y: point.y + offsetY,
        })),
        layerId: state.activeLayerId, // Paste to current active layer
        timestamp: Date.now(),
      }));

      return {
        ...state,
        elements: [...state.elements, ...newElements],
      };

    default:
      return state;
  }
}

interface DrawingContextType {
  state: DrawingState;
  dispatch: React.Dispatch<DrawingAction>;
}

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

export function DrawingProvider({ children }: { children: ReactNode }) {
  // Safely get theme with fallback
  let isDarkTheme = false;
  let currentTheme = "light";
  try {
    const themeContext = useTheme();
    isDarkTheme = themeContext?.actualTheme === "dark";
    currentTheme = themeContext?.actualTheme || "light";
  } catch (error) {
    console.warn("Theme context not available, using light theme as default");
  }

  const [state, dispatch] = useReducer(
    drawingReducer,
    createInitialState(isDarkTheme),
  );

  // Track previous theme to avoid unnecessary updates
  const prevThemeRef = useRef(currentTheme);

  // Update brush color when theme changes (only if theme context is available)
  useEffect(() => {
    try {
      const themeContext = useTheme();
      const newTheme = themeContext?.actualTheme || "light";

      // Only update if theme actually changed
      if (newTheme !== prevThemeRef.current) {
        const newColor = getDefaultBrushColor(newTheme === "dark");
        if (state.brushColor === "#000000" || state.brushColor === "#ffffff") {
          // Only update if it's still the default color
          dispatch({ type: "SET_BRUSH_COLOR", color: newColor });
        }
        prevThemeRef.current = newTheme;
      }
    } catch (error) {
      // Theme context not available, skip theme-based color updates
    }
  }, [currentTheme]); // Depend on currentTheme, not state.brushColor

  return (
    <DrawingContext.Provider value={{ state, dispatch }}>
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawing() {
  const context = useContext(DrawingContext);
  if (context === undefined) {
    console.error(
      "DrawingContext is undefined. Make sure DrawingProvider is wrapping your component tree.",
    );
    throw new Error("useDrawing must be used within a DrawingProvider");
  }
  return context;
}
