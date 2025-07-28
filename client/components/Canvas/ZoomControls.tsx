import React from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { Button } from "../ui/button";
import { Minus, Plus } from "lucide-react";

export function ZoomControls() {
  const { state, dispatch } = useDrawing();

  const handleZoomIn = () => {
    const newScale = Math.min(5, state.viewTransform.scale * 1.2);
    dispatch({
      type: "SET_VIEW_TRANSFORM",
      transform: {
        ...state.viewTransform,
        scale: newScale,
      },
    });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, state.viewTransform.scale * 0.8);
    dispatch({
      type: "SET_VIEW_TRANSFORM",
      transform: {
        ...state.viewTransform,
        scale: newScale,
      },
    });
  };

  const handleResetZoom = () => {
    dispatch({
      type: "SET_VIEW_TRANSFORM",
      transform: {
        ...state.viewTransform,
        scale: 1,
      },
    });
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center space-x-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 border border-border/50 shadow-lg">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomOut}
        disabled={state.viewTransform.scale <= 0.1}
        className="h-8 w-8"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <div
        className="text-xs font-medium px-2 py-1 cursor-pointer hover:bg-muted/50 rounded"
        onClick={handleResetZoom}
        title="Click to reset zoom"
      >
        Zoom: {Math.round(state.viewTransform.scale * 100)}%
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomIn}
        disabled={state.viewTransform.scale >= 5}
        className="h-8 w-8"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
