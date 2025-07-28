import React, { useState, useRef, useCallback } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Download,
  FileVideo,
  Film,
  Play,
  Settings,
  FileImage,
  FileText,
  Maximize,
  Minimize,
  Palette,
} from "lucide-react";
import {
  animateElementsDirectly,
  type AnimationConfig,
} from "../../lib/directSvgAnimation";
import { createExcalidrawSceneData } from "../../lib/excalidrawAnimateIntegration";

export function ExportPanel() {
  const { state: drawingState } = useDrawing();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportType, setExportType] = useState<"webm" | "mp4" | "scene">(
    "scene",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBackground, setShowBackground] = useState(true);
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const isAnimationRef = useRef(false);

  const playAnimation = useCallback(async () => {
    if (!animationContainerRef.current || drawingState.elements.length === 0) {
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
        drawingState.elements,
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
  }, [drawingState.elements]);

  const handleExportScene = useCallback(() => {
    if (drawingState.elements.length === 0) {
      alert("No elements to export. Please draw something first!");
      return;
    }

    try {
      const sceneData = createExcalidrawSceneData(drawingState.elements);
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
  }, [drawingState.elements]);

  const handleExportVideo = useCallback((format: "webm" | "mp4") => {
    alert(
      `${format.toUpperCase()} export will be available soon with FFmpeg backend integration!`,
    );
  }, []);

  return (
    <AnimatedFloatingPanel
      id="export"
      title="Export"
      icon={Download}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 420 : 800,
        y: typeof window !== "undefined" ? window.innerHeight - 450 : 400,
      }}
      defaultSize={{ width: 400, height: 400 }}
    >
      <div className="space-y-4">
        {/* Export Type Selection */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Export Format</div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={exportType === "scene" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportType("scene")}
              className="flex flex-col space-y-1 h-auto py-2"
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs">Scene</span>
            </Button>
            <Button
              variant={exportType === "webm" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportType("webm")}
              className="flex flex-col space-y-1 h-auto py-2"
            >
              <FileVideo className="h-4 w-4" />
              <span className="text-xs">WebM</span>
            </Button>
            <Button
              variant={exportType === "mp4" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportType("mp4")}
              className="flex flex-col space-y-1 h-auto py-2"
            >
              <Film className="h-4 w-4" />
              <span className="text-xs">MP4</span>
            </Button>
          </div>
        </div>

        {/* Animation Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Play className="h-4 w-4" />
                <span>Animation Preview</span>
              </span>
              {drawingState.elements.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {drawingState.elements.length} elements
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              ref={animationContainerRef}
              className="w-full h-32 bg-muted/20 border border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground relative overflow-hidden"
              style={{ minHeight: "128px" }}
            >
              {isPlaying ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Playing animation...</span>
                  </div>
                </div>
              ) : (
                "Click 'Play Preview' to see animation"
              )}
            </div>

            {progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button
              onClick={playAnimation}
              disabled={isPlaying || drawingState.elements.length === 0}
              className="w-full flex items-center space-x-2"
              size="sm"
            >
              <Play className="h-4 w-4" />
              <span>Play Preview</span>
            </Button>
          </CardContent>
        </Card>

        {/* Export Options */}
        <div className="space-y-3">
          {exportType === "scene" && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Scene Export</div>
              <div className="text-xs text-muted-foreground">
                Export as .excalidraw format for sharing and external animation
                tools
              </div>
              <Button
                onClick={handleExportScene}
                disabled={drawingState.elements.length === 0}
                className="w-full flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download Scene (.excalidraw)</span>
              </Button>
            </div>
          )}

          {(exportType === "webm" || exportType === "mp4") && (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                {exportType.toUpperCase()} Video Export
                <Badge variant="outline" className="ml-2 text-xs">
                  Coming Soon
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Video export will be available with FFmpeg backend integration
              </div>
              <Button
                onClick={() => handleExportVideo(exportType)}
                disabled={drawingState.elements.length === 0}
                variant="outline"
                className="w-full flex items-center space-x-2"
              >
                <FileVideo className="h-4 w-4" />
                <span>Export as {exportType.toUpperCase()}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1 pt-2 border-t">
          <div>✨ Scene exports work with excalidraw-animate</div>
          <div>🎬 Video export coming with FFmpeg integration</div>
        </div>
      </div>
    </AnimatedFloatingPanel>
  );
}
