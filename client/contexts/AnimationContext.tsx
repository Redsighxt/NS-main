import React, { createContext, useContext, useReducer, ReactNode } from "react";
import type { DrawingElement } from "./DrawingContext";

export interface StrokeEvent {
  id: string;
  elementId: string;
  layerId: string;
  timestamp: number;
  type: "start" | "update" | "finish";
  element: DrawingElement;
}

// Layer switch event for chronological animation
export interface LayerSwitchEvent {
  id: string;
  timestamp: number;
  fromLayerId: string;
  toLayerId: string;
  type: "layer-switch";
}

// Timeline event that can be either a stroke or layer switch
export type TimelineEvent = StrokeEvent | LayerSwitchEvent;

// Animation modes
export type AnimationMode =
  | "chronological"
  | "page-by-page"
  | "infinite-panning";

// Animation settings with new options
export interface AnimationSettings {
  strokeDuration: number; // How long each element takes to draw (ms)
  strokeDelay: number; // Delay between elements in milliseconds
  strokeSpeed: number; // Speed multiplier for pen/highlighter strokes (1 = normal, 2 = 2x faster)
  layerSwitchDelay: number; // Delay when switching between layers (10ms - unlimited, default 2000ms)
  animationMode: AnimationMode; // Which animation mode to use
  slideAnimation: "left-to-right" | "right-to-left" | "fade" | "none"; // Layer transition animation
  showLayerTransition: boolean; // Whether to show visual layer transitions
  useElementDuration?: number[]; // Optional array of durations per element for true speed mode
}

export interface AnimationState {
  isPlaying: boolean;
  strokes: StrokeEvent[];
  layerSwitches: LayerSwitchEvent[];
  timeline: TimelineEvent[]; // Merged chronological timeline
  settings: AnimationSettings;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  currentLayerId?: string; // Track current layer during playback
}

type AnimationAction =
  | { type: "PLAY"; elements?: DrawingElement[] }
  | { type: "STOP" }
  | { type: "ADD_STROKE"; stroke: StrokeEvent }
  | { type: "ADD_LAYER_SWITCH"; layerSwitch: LayerSwitchEvent }
  | { type: "SET_STROKE_DURATION"; duration: number }
  | { type: "SET_STROKE_DELAY"; delay: number }
  | { type: "SET_STROKE_SPEED"; speed: number }
  | { type: "SET_LAYER_SWITCH_DELAY"; delay: number }
  | { type: "SET_ANIMATION_MODE"; mode: AnimationMode }
  | {
      type: "SET_SLIDE_ANIMATION";
      animation: "left-to-right" | "right-to-left" | "fade" | "none";
    }
  | { type: "SET_SHOW_LAYER_TRANSITION"; show: boolean }
  | { type: "SET_CANVAS_REF"; canvasRef: React.RefObject<HTMLCanvasElement> }
  | { type: "POPULATE_FROM_ELEMENTS"; elements: DrawingElement[] }
  | { type: "BUILD_TIMELINE" }; // Rebuild the chronological timeline

const initialState: AnimationState = {
  isPlaying: false,
  strokes: [],
  layerSwitches: [],
  timeline: [],
  settings: {
    strokeDuration: 1000, // 1 second per element
    strokeDelay: 150, // 150ms between elements
    strokeSpeed: 1, // Normal speed for pen/highlighter strokes
    layerSwitchDelay: 2000, // 2 seconds default delay for layer switches
    animationMode: "chronological", // Default to chronological mode
    slideAnimation: "left-to-right", // Default slide animation
    showLayerTransition: true, // Show layer transitions by default
  },
};

// Import the simple replay animation system
import {
  replayAnimation,
  clearAnimationOverlay,
} from "../lib/simpleReplayAnimator";

// Helper function to build chronological timeline
function buildTimeline(
  strokes: StrokeEvent[],
  layerSwitches: LayerSwitchEvent[],
): TimelineEvent[] {
  const allEvents: TimelineEvent[] = [...strokes, ...layerSwitches];
  return allEvents.sort((a, b) => a.timestamp - b.timestamp);
}

// Helper function to check if an event is a layer switch
export function isLayerSwitchEvent(
  event: TimelineEvent,
): event is LayerSwitchEvent {
  return event.type === "layer-switch";
}

// Helper function to check if an event is a stroke event
export function isStrokeEvent(event: TimelineEvent): event is StrokeEvent {
  return event.type !== "layer-switch";
}

function animationReducer(
  state: AnimationState,
  action: AnimationAction,
): AnimationState {
  switch (action.type) {
    case "PLAY":
      // Start the replay animation
      if (state.canvasRef && (state.strokes.length > 0 || action.elements)) {
        let elementsToAnimate = [];
        if (action.elements && action.elements.length > 0) {
          elementsToAnimate = action.elements;
        } else {
          elementsToAnimate = state.strokes
            .filter((stroke) => stroke.type === "finish")
            .map((stroke) => stroke.element);
        }

        if (elementsToAnimate.length > 0) {
          replayAnimation(elementsToAnimate, state.canvasRef, state.settings);
        }
      }
      return { ...state, isPlaying: true };

    case "STOP":
      // Stop and clear animation
      if (state.canvasRef) {
        clearAnimationOverlay(state.canvasRef);
      }
      return { ...state, isPlaying: false };

    case "ADD_STROKE":
      const updatedStrokes = [...state.strokes, action.stroke].sort(
        (a, b) => a.timestamp - b.timestamp,
      );
      const newTimeline = buildTimeline(updatedStrokes, state.layerSwitches);
      return {
        ...state,
        strokes: updatedStrokes,
        timeline: newTimeline,
      };

    case "ADD_LAYER_SWITCH":
      const updatedLayerSwitches = [
        ...state.layerSwitches,
        action.layerSwitch,
      ].sort((a, b) => a.timestamp - b.timestamp);
      const updatedTimeline = buildTimeline(
        state.strokes,
        updatedLayerSwitches,
      );
      return {
        ...state,
        layerSwitches: updatedLayerSwitches,
        timeline: updatedTimeline,
      };

    case "BUILD_TIMELINE":
      return {
        ...state,
        timeline: buildTimeline(state.strokes, state.layerSwitches),
      };

    case "SET_STROKE_DURATION":
      return {
        ...state,
        settings: { ...state.settings, strokeDuration: action.duration },
      };

    case "SET_STROKE_DELAY":
      return {
        ...state,
        settings: { ...state.settings, strokeDelay: action.delay },
      };

    case "SET_STROKE_SPEED":
      return {
        ...state,
        settings: { ...state.settings, strokeSpeed: action.speed },
      };

    case "SET_LAYER_SWITCH_DELAY":
      return {
        ...state,
        settings: { ...state.settings, layerSwitchDelay: action.delay },
      };

    case "SET_ANIMATION_MODE":
      return {
        ...state,
        settings: { ...state.settings, animationMode: action.mode },
      };

    case "SET_SLIDE_ANIMATION":
      return {
        ...state,
        settings: { ...state.settings, slideAnimation: action.animation },
      };

    case "SET_SHOW_LAYER_TRANSITION":
      return {
        ...state,
        settings: { ...state.settings, showLayerTransition: action.show },
      };

    case "SET_CANVAS_REF":
      return {
        ...state,
        canvasRef: action.canvasRef,
      };

    case "POPULATE_FROM_ELEMENTS":
      // Convert existing drawing elements to stroke events
      if (action.elements && action.elements.length > 0) {
        // Only generate strokes if we don't have any or if explicitly requested
        const shouldGenerate =
          state.strokes.length === 0 ||
          action.elements.length !== state.strokes.length;

        if (shouldGenerate) {
          const generatedStrokes: StrokeEvent[] = action.elements
            .filter((element) => element && element.id) // Filter out invalid elements
            .map((element, index) => ({
              id: `generated-stroke-${element.id}`,
              elementId: element.id,
              layerId: element.layerId,
              timestamp: element.timestamp || Date.now() + index * 100,
              type: "finish" as const,
              element,
            }));

          const generatedTimeline = buildTimeline(
            generatedStrokes,
            state.layerSwitches,
          );

          return {
            ...state,
            strokes: generatedStrokes,
            timeline: generatedTimeline,
          };
        }
      }
      return state;

    default:
      return state;
  }
}

interface AnimationContextType {
  state: AnimationState;
  dispatch: React.Dispatch<AnimationAction>;
}

const AnimationContext = createContext<AnimationContextType | undefined>(
  undefined,
);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(animationReducer, initialState);

  return (
    <AnimationContext.Provider value={{ state, dispatch }}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error("useAnimation must be used within an AnimationProvider");
  }
  return context;
}
