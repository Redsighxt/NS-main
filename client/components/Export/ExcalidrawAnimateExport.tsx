// Excalidraw-animate export preview component
// Uses the actual excalidraw-animate library for export

import React, { useState, useCallback, useRef } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useCanvasBackground } from "../../contexts/CanvasBackgroundContext";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Play,
  Download,
  FileVideo,
  Loader2,
  EyeOff,
  Brush,
} from "lucide-react";
import {
  animateElementsDirectly,
  type AnimationConfig,
} from "../../lib/directSvgAnimation";
import { createExcalidrawSceneData } from "../../lib/excalidrawAnimateIntegration";

export function ExcalidrawAnimateExport() {
  const { state } = useDrawing();
  const { currentBackground } = useCanvasBackground();
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showBackground, setShowBackground] = useState(false);
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const isAnimationRef = useRef(false);

  const playAnimation = useCallback(async () => {
    if (!animationContainerRef.current || state.elements.length === 0) {
      alert("No elements to animate. Please draw something first!");
      return;
    }

    if (isAnimationRef.current) {
      return;
    }

    setIsPlaying(true);
    setProgress(0);
    isAnimationRef.current = true;

    try {
      await animateElementsDirectly(
        state.elements,
        animationContainerRef.current,
        {
          animationConfig: { duration: 1500, delay: 500, easing: "ease-out" },
          onProgress: (progress) => setProgress(progress),
          onComplete: () => {
            setIsPlaying(false);
            setProgress(100);
            isAnimationRef.current = false;
          },
        },
      );
    } catch (error) {
      console.error("Animation error:", error);
      setIsPlaying(false);
      setProgress(0);
      isAnimationRef.current = false;
    }
  }, [state.elements]);

  const downloadScene = useCallback(() => {
    if (state.elements.length === 0) {
      alert("No elements to export. Please draw something first!");
      return;
    }

    try {
      const sceneData = createExcalidrawSceneData(state.elements);
      const sceneJson = JSON.stringify(sceneData, null, 2);
      const blob = new Blob([sceneJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "drawing-scene.excalidraw";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("Error exporting scene. Please try again.");
    }
  }, [state.elements]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
          disabled={state.elements.length === 0}
        >
          <FileVideo className="h-4 w-4" />
          <span>Animation Export</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Animation Export</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Preview and export your drawing as an animated scene. Watch elements
            appear in chronological order just like they were drawn.
          </div>

          {/* Animation Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Animation Preview</div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={showBackground ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setShowBackground(!showBackground)}
                  className="h-6 w-6"
                  title={showBackground ? "Hide background" : "Show background"}
                >
                  <EyeOff className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBackground(true)}
                  className="h-6 w-6"
                  title="Use current canvas background"
                >
                  <Brush className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div
              ref={animationContainerRef}
              className="w-full h-48 border border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center text-sm text-muted-foreground relative overflow-hidden"
              style={{
                minHeight: "192px",
                width: "100%",
                backgroundColor: showBackground
                  ? currentBackground.color
                  : "transparent",
                backgroundImage: !showBackground
                  ? "repeating-conic-gradient(#00000008 0% 25%, transparent 0% 50%) 50% / 12px 12px"
                  : "none",
              }}
            >
              {isPlaying ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Playing animation...</span>
                  </div>
                </div>
              ) : (
                "Click 'Play Animation' to preview"
              )}
            </div>

            {progress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-3">
            <Button
              onClick={playAnimation}
              disabled={isPlaying || state.elements.length === 0}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Play Animation</span>
            </Button>

            <Button
              onClick={downloadScene}
              variant="outline"
              disabled={state.elements.length === 0}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Scene</span>
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div>✨ Elements animate in the order they were drawn</div>
            <div>📁 Download as .excalidraw format for sharing</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
