import React, { useState, useRef, useCallback } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useCanvasBackground } from "../../contexts/CanvasBackgroundContext";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Play,
  Pause,
  Square,
  Download,
  Film,
  Settings,
  FileVideo,
  Maximize,
  Minimize,
  Palette,
  Plus,
  Brush,
  EyeOff,
} from "lucide-react";
import {
  animateElementsDirectly,
  type AnimationConfig,
  type ExtendedAnimationConfig,
} from "../../lib/directSvgAnimation";
import { animateExcalidrawScene } from "../../lib/excalidrawAnimateIntegration";

import { createExcalidrawSceneData } from "../../lib/excalidrawAnimateIntegration";

export function SceneAnimationPlayer() {
  const { state: drawingState } = useDrawing();
  const { currentBackground } = useCanvasBackground();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extendedAnimationConfig, setExtendedAnimationConfig] =
    useState<ExtendedAnimationConfig>({
      penStrokes: {
        elementDuration: 800, // Increased to 800ms for smoother pen strokes
        groupDelay: 200, // Reduced to 200ms for faster flow between strokes
        easing: "ease-out", // Better easing for drawing animations
      },
      shapes: {
        elementDuration: 2000, // 2s default
        groupDelay: 300, // 0.3s default
        easing: "ease-out",
      },
      libraryObjects: {
        elementDuration: 1500, // 1.5s default
        groupDelay: 250, // 0.25s default
        easing: "ease-out",
      },
      trueSpeed: false,
      trueSpeedRate: 200, // 200 pixels per second default
    });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBackground, setShowBackground] = useState(true); // Default to show background (hide background button is OFF)
  const [useCurrentCanvasBackground, setUseCurrentCanvasBackground] =
    useState(true); // Default to use current canvas background
  const [animationBgColor, setAnimationBgColor] = useState(
    currentBackground.color,
  );
  const [customColorInput, setCustomColorInput] = useState("");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const animationContainerRef = useRef<HTMLDivElement>(null);
  const isAnimationRef = useRef(false);

  // Update animation background when current background changes
  React.useEffect(() => {
    if (useCurrentCanvasBackground && showBackground) {
      setAnimationBgColor(currentBackground.color);
    }
  }, [currentBackground.color, showBackground, useCurrentCanvasBackground]);

  // Initialize animation background based on current canvas background
  React.useEffect(() => {
    if (useCurrentCanvasBackground && currentBackground.color) {
      setAnimationBgColor(currentBackground.color);
    }
  }, [useCurrentCanvasBackground, currentBackground.color]);

  // Cleanup on unmount to prevent DOM conflicts
  React.useEffect(() => {
    return () => {
      // Stop any ongoing animation
      isAnimationRef.current = false;

      // Clean up container safely
      if (animationContainerRef.current) {
        try {
          // Only remove animation SVGs, let React handle the rest
          const animationSvgs =
            animationContainerRef.current.querySelectorAll(".animation-svg");
          animationSvgs.forEach((svg) => {
            if (svg.parentNode === animationContainerRef.current) {
              animationContainerRef.current!.removeChild(svg);
            }
          });
        } catch (error) {
          // If cleanup fails, it's likely already handled by React
          console.log("Cleanup handled by React");
        }
      }
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (!animationContainerRef.current || drawingState.elements.length === 0) {
      console.log("No container or elements:", {
        hasContainer: !!animationContainerRef.current,
        elementCount: drawingState.elements.length,
      });
      return;
    }

    if (isAnimationRef.current) {
      return; // Already playing
    }

    console.log(
      "Starting animation with elements:",
      drawingState.elements.length,
    );

    // Clear any previous animation content to ensure fresh start
    animationContainerRef.current.innerHTML = "";

    setIsPlaying(true);
    setProgress(0);
    isAnimationRef.current = true;

    try {
      // Filter only visible elements from visible layers
      const visibleElements = drawingState.elements.filter((element) => {
        const layer = drawingState.layers.find((l) => l.id === element.layerId);
        return layer?.visible !== false;
      });

      console.log("Visible elements for animation:", visibleElements.length);

      if (visibleElements.length === 0) {
        console.log("No visible elements to animate");
        setIsPlaying(false);
        setProgress(100);
        isAnimationRef.current = false;
        return;
      }

      // Set debug info using React state
      setDebugInfo(`Animating ${visibleElements.length} elements`);

      // Use our enhanced direct SVG animation with proper stroke styles and positioning
      const basicConfig: AnimationConfig = {
        duration: extendedAnimationConfig.shapes.elementDuration,
        delay: extendedAnimationConfig.shapes.groupDelay,
        easing: extendedAnimationConfig.shapes.easing,
      };

      console.log("Animation config:", basicConfig, extendedAnimationConfig);

      await animateElementsDirectly(
        visibleElements,
        animationContainerRef.current,
        {
          animationConfig: basicConfig,
          extendedConfig: extendedAnimationConfig,
          onProgress: (progress) => {
            console.log("Animation progress:", progress);
            setProgress(progress);
          },
          onComplete: () => {
            console.log("Animation completed");
            setIsPlaying(false);
            setProgress(100);
            isAnimationRef.current = false;
            // Clear debug info after a delay
            setTimeout(() => setDebugInfo(null), 2000);
          },
        },
      );
    } catch (error) {
      console.error("Animation error:", error);
      setIsPlaying(false);
      setProgress(0);
      isAnimationRef.current = false;
    }
  }, [drawingState.elements, drawingState.layers, extendedAnimationConfig]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    setIsPlaying(false);
    // Note: In a full implementation, we would pause the actual animation
    // For now, this stops the animation which can be resumed by playing again
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    if (progress < 100) {
      handlePlay();
    }
  }, [progress, handlePlay]);

  const handleStop = useCallback(() => {
    // Stop animation and update state
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setDebugInfo(null);
    isAnimationRef.current = false;

    // Clear container safely - only remove what we added
    if (animationContainerRef.current) {
      try {
        // Only remove animation SVGs, leave React content alone
        const animationSvgs =
          animationContainerRef.current.querySelectorAll(".animation-svg");
        animationSvgs.forEach((svg) => {
          if (svg.parentNode === animationContainerRef.current) {
            animationContainerRef.current!.removeChild(svg);
          }
        });
      } catch (error) {
        // If specific cleanup fails, don't force it
        console.log("Animation cleanup completed or not needed");
      }
    }
  }, []);

  const handleDownloadScene = useCallback(() => {
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

  return (
    <AnimatedFloatingPanel
      id="scene-animation"
      title="Replay"
      icon={Film}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth / 2 - 250 : 400,
        y: typeof window !== "undefined" ? window.innerHeight - 450 : 400,
      }}
      defaultSize={{ width: 500, height: 400 }}
      hideFromDock={true}
    >
      <div className="space-y-4">
        {/* Scene Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <FileVideo className="h-4 w-4" />
              <span>Scene Animation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {drawingState.elements.length} elements ready for scene-based
              animation
            </div>

            {/* Animation Preview Container */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Preview</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={!showBackground ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setShowBackground(!showBackground)}
                    className="h-6 w-6"
                    title={
                      !showBackground ? "Background hidden" : "Hide background"
                    }
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Choose background color"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 z-50">
                      <div className="space-y-3">
                        <div className="text-sm font-medium">
                          Animation Background
                        </div>

                        {/* Preset Colors */}
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">
                            Quick Colors
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {[
                              {
                                name: "Transparent",
                                color: "transparent",
                                border: true,
                              },
                              { name: "White", color: "#ffffff" },
                              { name: "Light Gray", color: "#f8f9fa" },
                              { name: "Dark", color: "#0f0f0f" },
                              { name: "Light Blue", color: "#f0f9ff" },
                              { name: "Light Green", color: "#f0fdf4" },
                            ].map((preset) => (
                              <button
                                key={preset.name}
                                onClick={() => {
                                  setAnimationBgColor(preset.color);
                                  setShowBackground(true);
                                  setUseCurrentCanvasBackground(false);
                                }}
                                className={`w-8 h-8 rounded border-2 ${
                                  animationBgColor === preset.color
                                    ? "border-primary"
                                    : "border-border"
                                } ${preset.border ? "border-dashed" : ""}`}
                                style={{
                                  backgroundColor:
                                    preset.color === "transparent"
                                      ? "#fff"
                                      : preset.color,
                                  backgroundImage:
                                    preset.color === "transparent"
                                      ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px"
                                      : "none",
                                }}
                                title={preset.name}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Current Canvas Background */}
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">
                            Canvas Background
                          </div>
                          <Button
                            variant={
                              useCurrentCanvasBackground ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => {
                              setUseCurrentCanvasBackground(true);
                              setAnimationBgColor(currentBackground.color);
                              setShowBackground(true);
                            }}
                            className="w-full justify-start space-x-2"
                          >
                            <div
                              className="w-4 h-4 rounded border"
                              style={{
                                backgroundColor: currentBackground.color,
                              }}
                            />
                            <span>Use {currentBackground.name}</span>
                          </Button>
                        </div>

                        {/* Custom Color Input */}
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">
                            Custom Color
                          </div>
                          <div className="flex space-x-2">
                            <Input
                              placeholder="#ffffff or rgb(255,255,255)"
                              value={customColorInput}
                              onChange={(e) =>
                                setCustomColorInput(e.target.value)
                              }
                              className="text-xs"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                if (customColorInput.trim()) {
                                  setAnimationBgColor(customColorInput.trim());
                                  setShowBackground(true);
                                  setUseCurrentCanvasBackground(false);
                                  setCustomColorInput("");
                                }
                              }}
                              disabled={!customColorInput.trim()}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant={useCurrentCanvasBackground ? "default" : "ghost"}
                    size="icon"
                    onClick={() => {
                      const newUseCurrentCanvasBackground =
                        !useCurrentCanvasBackground;
                      setUseCurrentCanvasBackground(
                        newUseCurrentCanvasBackground,
                      );
                      if (newUseCurrentCanvasBackground) {
                        setAnimationBgColor(currentBackground.color);
                        setShowBackground(true);
                      }
                    }}
                    className="h-6 w-6"
                    title={
                      useCurrentCanvasBackground
                        ? "Using current canvas background"
                        : "Use current canvas background"
                    }
                  >
                    <Brush className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="h-6 w-6"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-3 w-3" />
                    ) : (
                      <Maximize className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div
                key={`animation-container-${isPlaying}-${progress}`}
                ref={!isFullscreen ? animationContainerRef : undefined}
                className="w-full border border-dashed border-muted-foreground/30 rounded-lg relative overflow-visible"
                style={{
                  minHeight: "256px",
                  height: "256px",
                  backgroundColor: showBackground
                    ? animationBgColor
                    : "transparent",
                  backgroundImage:
                    // Show grid pattern if background is transparent or background is disabled
                    !showBackground || animationBgColor === "transparent"
                      ? "repeating-conic-gradient(#00000008 0% 25%, transparent 0% 50%) 50% / 12px 12px"
                      : // Apply canvas background pattern if using current canvas background and it has one
                        currentBackground.pattern &&
                          showBackground &&
                          useCurrentCanvasBackground &&
                          animationBgColor === currentBackground.color
                        ? currentBackground.pattern === "dots"
                          ? "radial-gradient(circle, rgba(148, 163, 184, 0.4) 1px, transparent 1px)"
                          : currentBackground.pattern === "grid"
                            ? `linear-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(148, 163, 184, 0.3) 1px, transparent 1px)`
                            : currentBackground.pattern === "lines"
                              ? "linear-gradient(90deg, rgba(148, 163, 184, 0.2) 1px, transparent 1px)"
                              : "none"
                        : "none",
                  backgroundSize:
                    !showBackground || animationBgColor === "transparent"
                      ? "12px 12px"
                      : currentBackground.pattern &&
                          showBackground &&
                          useCurrentCanvasBackground &&
                          animationBgColor === currentBackground.color
                        ? "20px 20px"
                        : "auto",
                }}
              >
                {!isPlaying &&
                  progress === 0 &&
                  drawingState.elements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      Draw something to see animation preview
                    </div>
                  )}
                {!isPlaying &&
                  progress === 0 &&
                  drawingState.elements.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      {drawingState.elements.length} elements ready • Click Play
                      to start animation
                    </div>
                  )}
                {debugInfo && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none z-10">
                    {debugInfo}
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            {(isPlaying || progress > 0) && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Playback Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-3">
            {!isPlaying && !isPaused && (
              <Button
                onClick={handlePlay}
                disabled={drawingState.elements.length === 0}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Play Animation</span>
              </Button>
            )}

            {isPlaying && (
              <Button
                onClick={handlePause}
                className="flex items-center space-x-2"
              >
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </Button>
            )}

            {isPaused && progress < 100 && (
              <Button
                onClick={handleResume}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Resume</span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleStop}
              disabled={!isPlaying && !isPaused && progress === 0}
            >
              <Square className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadScene}
              disabled={drawingState.elements.length === 0}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
          </div>
        </div>

        {/* Animation Settings */}
        <AnimationSettingsTabs
          config={extendedAnimationConfig}
          onChange={setExtendedAnimationConfig}
        />

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>✨ Scene-based animation using Excalidraw format</div>
          <div>🎯 All elements animate in chronological groups</div>
        </div>
      </div>

      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {/* Fullscreen Animation Container */}
          <div
            key={`fullscreen-container-${isPlaying}-${progress}`}
            ref={isFullscreen ? animationContainerRef : undefined}
            className="flex-1 relative"
            style={{
              backgroundColor: showBackground
                ? animationBgColor
                : "transparent",
              backgroundImage:
                !showBackground || animationBgColor === "transparent"
                  ? "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%) 50% / 20px 20px"
                  : currentBackground.pattern &&
                      showBackground &&
                      useCurrentCanvasBackground &&
                      animationBgColor === currentBackground.color
                    ? currentBackground.pattern === "dots"
                      ? "radial-gradient(circle, rgba(255, 255, 255, 0.2) 1px, transparent 1px)"
                      : currentBackground.pattern === "grid"
                        ? "linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)"
                        : currentBackground.pattern === "lines"
                          ? "linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)"
                          : "none"
                    : "none",
              backgroundSize:
                !showBackground || animationBgColor === "transparent"
                  ? "20px 20px"
                  : currentBackground.pattern &&
                      showBackground &&
                      useCurrentCanvasBackground &&
                      animationBgColor === currentBackground.color
                    ? "30px 30px"
                    : "auto",
            }}
          >
            {!isPlaying && drawingState.elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-white/60 text-lg">
                Draw something to see fullscreen animation
              </div>
            )}
          </div>

          {/* Fullscreen Controls */}
          <div className="bg-black/50 backdrop-blur-sm p-6 border-t border-white/10">
            <div className="max-w-4xl mx-auto">
              {/* Progress Bar */}
              {(isPlaying || progress > 0) && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-white/80 mb-2">
                    <span>Animation Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Playback Controls */}
              <div className="flex items-center justify-center space-x-4">
                {!isPlaying && !isPaused && (
                  <Button
                    onClick={handlePlay}
                    disabled={drawingState.elements.length === 0}
                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                    size="lg"
                  >
                    <Play className="h-5 w-5" />
                    <span>Play</span>
                  </Button>
                )}

                {isPlaying && (
                  <Button
                    onClick={handlePause}
                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                    size="lg"
                  >
                    <Pause className="h-5 w-5" />
                    <span>Pause</span>
                  </Button>
                )}

                {isPaused && progress < 100 && (
                  <Button
                    onClick={handleResume}
                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                    size="lg"
                  >
                    <Play className="h-5 w-5" />
                    <span>Resume</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleStop}
                  disabled={!isPlaying && !isPaused && progress === 0}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  size="lg"
                >
                  <Square className="h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsFullscreen(false)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  size="lg"
                >
                  <Minimize className="h-5 w-5" />
                </Button>
              </div>

              {/* Animation Info */}
              <div className="text-center mt-4 text-white/60 text-sm">
                {drawingState.elements.length} elements •{" "}
                {isPlaying
                  ? "Playing..."
                  : isPaused
                    ? "Paused"
                    : progress > 0
                      ? "Finished"
                      : "Ready"}
              </div>
            </div>
          </div>
        </div>
      )}
    </AnimatedFloatingPanel>
  );
}

// Time Input Component with Unit Selection
interface TimeInputProps {
  value: number; // value in milliseconds
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  defaultUnit?: "ms" | "s";
  allowUnlimited?: boolean;
}

function TimeInput({
  value,
  onChange,
  label,
  min = 100,
  max = 10000,
  defaultUnit = "s",
  allowUnlimited = false,
}: TimeInputProps) {
  const [inputValue, setInputValue] = useState<string>(
    defaultUnit === "ms" ? value.toString() : (value / 1000).toString(),
  );
  const [unit, setUnit] = useState<"ms" | "s">(defaultUnit);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      const msValue = unit === "s" ? numValue * 1000 : numValue;
      if (msValue >= min && (allowUnlimited || msValue <= max)) {
        onChange(msValue);
      }
    }
  };

  const handleUnitChange = (newUnit: "s" | "ms") => {
    setUnit(newUnit);
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      if (newUnit === "ms" && unit === "s") {
        setInputValue((numValue * 1000).toString());
        onChange(numValue * 1000);
      } else if (newUnit === "s" && unit === "ms") {
        setInputValue((numValue / 1000).toString());
        onChange(numValue);
      }
    }
  };

  React.useEffect(() => {
    if (unit === "s") {
      setInputValue((value / 1000).toFixed(1));
    } else {
      setInputValue(value.toString());
    }
  }, [value, unit]);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex space-x-2">
        <Input
          type="number"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="flex-1"
          step={unit === "s" ? 0.1 : 10}
          min={unit === "s" ? min / 1000 : min}
          max={allowUnlimited ? undefined : unit === "s" ? max / 1000 : max}
        />
        <Select value={unit} onValueChange={handleUnitChange}>
          <SelectTrigger className="w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="s">s</SelectItem>
            <SelectItem value="ms">ms</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="text-xs text-muted-foreground">
        {unit === "s"
          ? allowUnlimited
            ? `Min: ${min / 1000}s`
            : `${min / 1000}s - ${max / 1000}s`
          : allowUnlimited
            ? `Min: ${min}ms`
            : `${min}ms - ${max}ms`}
      </div>
    </div>
  );
}

// Animation Settings Tabs Component
interface AnimationSettingsTabsProps {
  config: ExtendedAnimationConfig;
  onChange: (config: ExtendedAnimationConfig) => void;
}

function AnimationSettingsTabs({
  config,
  onChange,
}: AnimationSettingsTabsProps) {
  const updatePenStrokeConfig = (
    updates: Partial<ExtendedAnimationConfig["penStrokes"]>,
  ) => {
    onChange({
      ...config,
      penStrokes: { ...config.penStrokes, ...updates },
    });
  };

  const updateShapesConfig = (
    updates: Partial<ExtendedAnimationConfig["shapes"]>,
  ) => {
    onChange({
      ...config,
      shapes: { ...config.shapes, ...updates },
    });
  };

  const updateLibraryConfig = (
    updates: Partial<ExtendedAnimationConfig["libraryObjects"]>,
  ) => {
    onChange({
      ...config,
      libraryObjects: { ...config.libraryObjects, ...updates },
    });
  };

  const renderEasingButtons = (
    currentEasing: string,
    onEasingChange: (easing: string) => void,
  ) => (
    <div className="grid grid-cols-2 gap-2">
      {["ease-out", "ease-in", "ease-in-out", "linear"].map((easing) => (
        <Button
          key={easing}
          variant={currentEasing === easing ? "default" : "outline"}
          size="sm"
          onClick={() => onEasingChange(easing)}
          className="text-xs h-8"
        >
          {easing.replace("-", " ")}
        </Button>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Animation Settings</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Changes apply immediately - restart animation to see updates
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pen-strokes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pen-strokes" className="text-xs">
              Pen Strokes
            </TabsTrigger>
            <TabsTrigger value="shapes" className="text-xs">
              Shapes & Highlighter
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs">
              Library
            </TabsTrigger>
            <TabsTrigger value="true-speed" className="text-xs">
              True Speed
            </TabsTrigger>
          </TabsList>

          {/* Pen Strokes Settings */}
          <TabsContent value="pen-strokes" className="space-y-4 mt-4">
            <TimeInput
              value={config.penStrokes.elementDuration}
              onChange={(value) =>
                updatePenStrokeConfig({ elementDuration: value })
              }
              label="Element Duration"
              min={10}
              defaultUnit="ms"
              allowUnlimited={true}
            />

            <TimeInput
              value={config.penStrokes.groupDelay}
              onChange={(value) => updatePenStrokeConfig({ groupDelay: value })}
              label="Group Delay"
              min={100}
              max={5000}
            />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Easing</Label>
              {renderEasingButtons(config.penStrokes.easing, (easing) =>
                updatePenStrokeConfig({ easing }),
              )}
            </div>
          </TabsContent>

          {/* Shapes Settings */}
          <TabsContent value="shapes" className="space-y-4 mt-4">
            <TimeInput
              value={config.shapes.elementDuration}
              onChange={(value) =>
                updateShapesConfig({ elementDuration: value })
              }
              label="Element Duration"
              min={100}
              max={10000}
            />

            <TimeInput
              value={config.shapes.groupDelay}
              onChange={(value) => updateShapesConfig({ groupDelay: value })}
              label="Group Delay"
              min={100}
              max={5000}
            />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Easing</Label>
              {renderEasingButtons(config.shapes.easing, (easing) =>
                updateShapesConfig({ easing }),
              )}
            </div>
          </TabsContent>

          {/* Library Objects Settings */}
          <TabsContent value="library" className="space-y-4 mt-4">
            <TimeInput
              value={config.libraryObjects.elementDuration}
              onChange={(value) =>
                updateLibraryConfig({ elementDuration: value })
              }
              label="Element Duration"
              min={100}
              max={10000}
            />

            <TimeInput
              value={config.libraryObjects.groupDelay}
              onChange={(value) => updateLibraryConfig({ groupDelay: value })}
              label="Group Delay"
              min={100}
              max={10000}
            />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Easing</Label>
              {renderEasingButtons(config.libraryObjects.easing, (easing) =>
                updateLibraryConfig({ easing }),
              )}
            </div>
          </TabsContent>

          {/* True Speed Settings */}
          <TabsContent value="true-speed" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Enable True Speed</Label>
                <Switch
                  checked={config.trueSpeed}
                  onCheckedChange={(checked) =>
                    onChange({ ...config, trueSpeed: checked })
                  }
                />
              </div>

              {config.trueSpeed && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Speed Rate</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={config.trueSpeedRate}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          trueSpeedRate: parseInt(e.target.value) || 200,
                        })
                      }
                      className="w-20 h-7 text-xs"
                      min="50"
                      max="1000"
                      step="10"
                    />
                    <span className="text-xs text-muted-foreground">px/s</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
              <strong>True Speed:</strong> Animation duration is calculated
              based on path length. Shorter strokes animate faster, longer
              strokes take more time proportionally.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
