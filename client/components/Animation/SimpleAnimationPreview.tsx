import React from "react";
import { useAnimation } from "../../contexts/AnimationContext";
import { useDrawing } from "../../contexts/DrawingContext";
import { Button } from "../ui/button";
import { Play, Square, X } from "lucide-react";

interface SimpleAnimationPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SimpleAnimationPreview({
  isOpen,
  onClose,
}: SimpleAnimationPreviewProps) {
  const { state: animationState, dispatch: animationDispatch } = useAnimation();
  const { state: drawingState } = useDrawing();

  const handlePlay = () => {
    animationDispatch({ type: "PLAY" });
  };

  const handleStop = () => {
    animationDispatch({ type: "STOP" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-background border border-border rounded-lg shadow-xl p-4 min-w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Animation Preview</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          {animationState.strokes.length > 0
            ? `Ready to animate ${animationState.strokes.length} elements`
            : "No elements to animate. Draw something first!"}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-2">
          <Button
            size="sm"
            onClick={handlePlay}
            disabled={animationState.strokes.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            Replay
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleStop}
            disabled={!animationState.isPlaying}
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        </div>

        {/* Settings info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            Duration:{" "}
            {(animationState.settings.strokeDuration / 1000).toFixed(1)}s per
            element
          </div>
          <div>
            Delay: {animationState.settings.strokeDelay}ms between elements
          </div>
        </div>
      </div>
    </div>
  );
}
