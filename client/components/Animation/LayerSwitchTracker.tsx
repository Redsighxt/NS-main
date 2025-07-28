import { useEffect, useRef } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useAnimation } from "../../contexts/AnimationContext";
import type { LayerSwitchEvent } from "../../contexts/AnimationContext";

/**
 * LayerSwitchTracker component automatically tracks when users switch between layers
 * and records these switches for chronological animation playback.
 */
export function LayerSwitchTracker() {
  const { state: drawingState } = useDrawing();
  const { dispatch: animationDispatch } = useAnimation();
  const previousLayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentLayerId = drawingState.activeLayerId;
    const previousLayerId = previousLayerIdRef.current;

    // Record layer switch if the active layer changed and we have a previous layer
    if (previousLayerId && previousLayerId !== currentLayerId) {
      const layerSwitchEvent: LayerSwitchEvent = {
        id: `layer-switch-${Date.now()}`,
        timestamp: Date.now(),
        fromLayerId: previousLayerId,
        toLayerId: currentLayerId,
        type: "layer-switch",
      };

      animationDispatch({
        type: "ADD_LAYER_SWITCH",
        layerSwitch: layerSwitchEvent,
      });

      console.log(
        `Layer switch recorded: ${previousLayerId} → ${currentLayerId}`,
      );
    }

    // Update the previous layer reference
    previousLayerIdRef.current = currentLayerId;
  }, [drawingState.activeLayerId, animationDispatch]);

  // This component doesn't render anything - it's just for tracking
  return null;
}
