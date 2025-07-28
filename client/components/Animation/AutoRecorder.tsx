import { useEffect, useCallback, useRef } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useAnimation } from "../../contexts/AnimationContext";

export function AutoRecorder() {
  const { state: drawingState, dispatch: drawingDispatch } = useDrawing();
  const { dispatch: animationDispatch } = useAnimation();

  // Create a stable callback that defers animation updates
  const handleStroke = useCallback(
    (stroke: any) => {
      // Only record finish events to avoid duplicates and performance issues
      if (stroke.type === "finish") {
        // Use requestIdleCallback or setTimeout to defer the update
        if ("requestIdleCallback" in window) {
          requestIdleCallback(() => {
            animationDispatch({ type: "ADD_STROKE", stroke });
          });
        } else {
          setTimeout(() => {
            animationDispatch({ type: "ADD_STROKE", stroke });
          }, 0);
        }
      }
    },
    [animationDispatch],
  );

  // Set up the callback once
  useEffect(() => {
    drawingDispatch({ type: "SET_STROKE_CALLBACK", callback: handleStroke });

    // Cleanup on unmount
    return () => {
      drawingDispatch({ type: "SET_STROKE_CALLBACK", callback: () => {} });
    };
  }, [drawingDispatch, handleStroke]);

  // Populate animation context with existing elements when component mounts
  const hasPopulatedRef = useRef(false);
  useEffect(() => {
    if (drawingState.elements.length > 0 && !hasPopulatedRef.current) {
      animationDispatch({
        type: "POPULATE_FROM_ELEMENTS",
        elements: drawingState.elements,
      });
      hasPopulatedRef.current = true;
    }
  }, [drawingState.elements.length, animationDispatch]);

  return null; // This component doesn't render anything
}
