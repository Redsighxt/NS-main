import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { useCanvasBackground } from "../../contexts/CanvasBackgroundContext";
import { usePageMode } from "../../contexts/PageModeContext";
import { useTheme } from "../../contexts/ThemeContext";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Play,
  Pause,
  Square,
  Maximize,
  Monitor,
  Timer,
  Layers,
  Settings,
  Zap,
} from "lucide-react";

import {
  NativeReplaySystem,
  type NativeReplayConfig,
} from "../../lib/NativeReplaySystem";
import { type AnimationSettings } from "../../lib/ProgressiveAnimationEngine";
import type { VirtualPage } from "../../lib/virtualPagesManager";

/**
 * Native Replay Window - Built from scratch for perfect canvas compatibility
 * No SVG, no coordinate conflicts, direct canvas rendering
 */
export function NativeReplayWindow() {
  const { state: drawingState } = useDrawing();
  const { state: canvasSettings } = useCanvasSettings();
  const { currentBackground } = useCanvasBackground();
  const pageMode = usePageMode();
  const { actualTheme } = useTheme();

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replaySystemRef = useRef<NativeReplaySystem | null>(null);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState<VirtualPage | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);

  // Configuration state
  const [replayConfig, setReplayConfig] = useState<NativeReplayConfig>({
    mode: "chronological",
    showPageTransitions: true,
    transitionDuration: 1000,
    transitionType: "fade",
    showPageIndicators: true,
    autoScale: true,
  });

  // Animation settings
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(
    {
      penStrokes: {
        elementDuration: 800,
        groupDelay: 200,
        easing: "ease-out",
        trueSpeed: false,
        trueSpeedRate: 200,
      },
      shapes: {
        elementDuration: 2000,
        groupDelay: 300,
        easing: "ease-out",
      },
      libraryObjects: {
        elementDuration: 1500,
        groupDelay: 250,
        easing: "ease-out",
      },
    },
  );

  // Get elements for replay
  const getElementsForReplay = useCallback(() => {
    if (canvasSettings.canvasMode === "infinite") {
      return drawingState.elements;
    } else {
      // Page mode - combine elements from all pages
      return pageMode.state.pages.reduce((allElements, page) => {
        return [...allElements, ...page.elements];
      }, []);
    }
  }, [canvasSettings.canvasMode, drawingState.elements, pageMode.state.pages]);

  // Initialize replay system
  const initializeReplaySystem = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    try {
      const replaySystem = new NativeReplaySystem(
        canvas,
        replayConfig,
        animationSettings,
      );
      const elements = getElementsForReplay();
      replaySystem.loadElements(elements);

      console.log(
        `NativeReplaySystem initialized with ${elements.length} elements`,
      );
      return replaySystem;
    } catch (error) {
      console.error("Failed to initialize NativeReplaySystem:", error);
      setReplayError("Failed to initialize replay system");
      return null;
    }
  }, [replayConfig, animationSettings, getElementsForReplay]);

  // Initialize canvas and replay system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.width = "800px";
    canvas.style.height = "600px";

    // Initialize replay system
    replaySystemRef.current = initializeReplaySystem();
  }, [initializeReplaySystem]);

  // Handle play
  const handlePlay = useCallback(async () => {
    const replaySystem = replaySystemRef.current;
    if (!replaySystem) {
      setReplayError("Replay system not initialized");
      return;
    }

    const elements = getElementsForReplay();
    if (elements.length === 0) {
      setReplayError("No drawing content to animate. Draw something first!");
      return;
    }

    setIsPlaying(true);
    setProgress(0);
    setReplayError(null);

    try {
      await replaySystem.startReplay(
        // Progress callback
        (progressPercent) => {
          setProgress(progressPercent);
        },
        // Complete callback
        () => {
          setIsPlaying(false);
          console.log("Native replay completed");
        },
        // Page change callback
        (page) => {
          setCurrentPage(page);
          console.log(`Page changed to: ${page.id}`);
        },
      );
    } catch (error) {
      console.error("Native replay error:", error);
      setReplayError(
        error instanceof Error ? error.message : "Unknown replay error",
      );
      setIsPlaying(false);
    }
  }, [getElementsForReplay]);

  // Handle stop
  const handleStop = useCallback(() => {
    const replaySystem = replaySystemRef.current;
    if (replaySystem) {
      replaySystem.stop();
    }
    setIsPlaying(false);
    setProgress(0);
    setCurrentPage(null);
    setReplayError(null);
  }, []);

  // Handle pause
  const handlePause = useCallback(() => {
    const replaySystem = replaySystemRef.current;
    if (replaySystem) {
      if (isPlaying) {
        replaySystem.pause();
        setIsPlaying(false);
      } else {
        replaySystem.resume();
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  // Handle seek
  const handleSeek = useCallback((progressPercent: number) => {
    const replaySystem = replaySystemRef.current;
    if (replaySystem) {
      replaySystem.seekTo(progressPercent);
      setProgress(progressPercent);
    }
  }, []);

  // Open popup window
  const openPopupWindow = useCallback(() => {
    const elements = getElementsForReplay();
    if (elements.length === 0) {
      alert("No elements to animate. Please draw something first!");
      return;
    }

    const width = 1000;
    const height = 700;
    const windowFeatures = `width=${width},height=${height},scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no`;

    try {
      const replayWindow = window.open(
        "",
        "NativeReplayWindow",
        windowFeatures,
      );
      if (!replayWindow || replayWindow.closed) {
        alert(
          "Popup blocked! Please allow popups for this site to use the replay window.",
        );
        return;
      }

      const themeColors =
        actualTheme === "dark"
          ? {
              bodyBg: "#0d1117",
              headerBg: "#161b22",
              textColor: "#f0f6fc",
              cardBg: "#21262d",
              primaryBg: "#238636",
            }
          : {
              bodyBg: "#f8f9fa",
              headerBg: "#fff",
              textColor: "#1a1a1a",
              cardBg: "#fff",
              primaryBg: "#007bff",
            };

      replayWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>🚀 Native Canvas Replay - No Zoom Issues!</title>
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0; padding: 0;
                background: ${themeColors.bodyBg};
                color: ${themeColors.textColor};
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                height: 100vh; overflow: hidden;
              }
              .header {
                background: ${themeColors.headerBg};
                padding: 12px 20px;
                display: flex; justify-content: space-between; align-items: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .title { font-size: 18px; font-weight: 600; margin: 0; }
              .controls { display: flex; gap: 12px; align-items: center; }
              button {
                padding: 10px 18px; border: none; border-radius: 8px;
                background: ${themeColors.primaryBg}; color: white;
                cursor: pointer; font-weight: 500; transition: all 0.2s;
              }
              button:hover { transform: translateY(-1px); opacity: 0.9; }
              .canvas-container {
                flex: 1; display: flex; align-items: center; justify-content: center;
                padding: 20px; background: ${themeColors.cardBg};
              }
              canvas {
                border: 2px solid ${themeColors.primaryBg};
                border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                background: white;
              }
              .info {
                position: absolute; bottom: 20px; left: 20px;
                background: rgba(0,0,0,0.8); color: white;
                padding: 8px 12px; border-radius: 6px; font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">🚀 Native Canvas Replay</h1>
              <div class="controls">
                <button onclick="playReplay()">▶ Play</button>
                <button onclick="stopReplay()">⏹ Stop</button>
                <button onclick="window.close()">✕ Close</button>
              </div>
            </div>
            <div class="canvas-container">
              <canvas id="replayCanvas" width="800" height="600"></canvas>
            </div>
            <div class="info">
              Native Canvas Replay • ${elements.length} elements • No zoom issues!
            </div>
          </body>
        </html>
      `);

      replayWindow.document.close();

      const canvas = replayWindow.document.getElementById(
        "replayCanvas",
      ) as HTMLCanvasElement;
      if (canvas) {
        // Initialize replay system in popup
        const popupReplaySystem = new NativeReplaySystem(
          canvas,
          replayConfig,
          animationSettings,
        );
        popupReplaySystem.loadElements(elements);

        (replayWindow as any).playReplay = async () => {
          await popupReplaySystem.startReplay(
            (progress) => console.log(`Popup progress: ${progress}%`),
            () => console.log("Popup replay completed"),
          );
        };

        (replayWindow as any).stopReplay = () => {
          popupReplaySystem.stop();
        };
      }

      replayWindow.focus();
    } catch (error) {
      console.error("Error opening popup window:", error);
      alert("Failed to open replay window: " + error.message);
    }
  }, [getElementsForReplay, replayConfig, animationSettings, actualTheme]);

  const elements = getElementsForReplay();

  return (
    <AnimatedFloatingPanel
      id="native-replay"
      title="🚀 Native Canvas Replay"
      icon={Zap}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 500 : 900,
        y: 100,
      }}
      defaultSize={{ width: 600, height: 750 }}
    >
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800 dark:text-green-200">
              Zero Zoom Issues
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Native canvas rendering • No SVG conflicts • Perfect 1:1 scale
          </p>
        </div>

        {/* Preview Canvas */}
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex justify-between items-center mb-3">
            <Label className="font-medium">Preview Canvas</Label>
            <Badge variant="outline">{elements.length} elements</Badge>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border rounded bg-white w-full h-auto max-w-full"
              style={{ aspectRatio: "4/3" }}
            />

            {currentPage && (
              <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded">
                Page: {currentPage.isOrigin ? "Origin" : currentPage.id}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {/* Playback Controls */}
          <div className="flex items-center space-x-3">
            <Button
              onClick={handlePlay}
              disabled={isPlaying || elements.length === 0}
              size="sm"
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              {isPlaying ? "Playing..." : "Play"}
            </Button>

            <Button
              onClick={handlePause}
              disabled={!isPlaying}
              variant="outline"
              size="sm"
            >
              <Pause className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleStop}
              disabled={!isPlaying && progress === 0}
              variant="outline"
              size="sm"
            >
              <Square className="h-4 w-4" />
            </Button>

            <Button onClick={openPopupWindow} variant="outline" size="sm">
              <Monitor className="h-4 w-4 mr-2" />
              Popup
            </Button>
          </div>

          {/* Progress */}
          {(isPlaying || progress > 0) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Error Display */}
          {replayError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="text-sm text-red-600 dark:text-red-400">
                ⚠️ <strong>Error:</strong> {replayError}
              </div>
            </div>
          )}
        </div>

        {/* Configuration */}
        <Tabs defaultValue="mode" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mode">Mode</TabsTrigger>
            <TabsTrigger value="animation">Animation</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="mode" className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Replay Mode</Label>
              <Select
                value={replayConfig.mode}
                onValueChange={(value: "chronological" | "layer") =>
                  setReplayConfig((prev) => ({ ...prev, mode: value }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chronological">
                    <div className="flex items-center space-x-2">
                      <Timer className="h-4 w-4" />
                      <span>Chronological</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="layer">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4" />
                      <span>Layer</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto Scale</Label>
              <Switch
                checked={replayConfig.autoScale}
                onCheckedChange={(checked) =>
                  setReplayConfig((prev) => ({ ...prev, autoScale: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Page Transitions</Label>
              <Switch
                checked={replayConfig.showPageTransitions}
                onCheckedChange={(checked) =>
                  setReplayConfig((prev) => ({
                    ...prev,
                    showPageTransitions: checked,
                  }))
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="animation" className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Pen Strokes</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  type="number"
                  placeholder="Duration (ms)"
                  value={animationSettings.penStrokes.elementDuration}
                  onChange={(e) =>
                    setAnimationSettings((prev) => ({
                      ...prev,
                      penStrokes: {
                        ...prev.penStrokes,
                        elementDuration: parseInt(e.target.value) || 800,
                      },
                    }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Delay (ms)"
                  value={animationSettings.penStrokes.groupDelay}
                  onChange={(e) =>
                    setAnimationSettings((prev) => ({
                      ...prev,
                      penStrokes: {
                        ...prev.penStrokes,
                        groupDelay: parseInt(e.target.value) || 200,
                      },
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Shapes</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  type="number"
                  placeholder="Duration (ms)"
                  value={animationSettings.shapes.elementDuration}
                  onChange={(e) =>
                    setAnimationSettings((prev) => ({
                      ...prev,
                      shapes: {
                        ...prev.shapes,
                        elementDuration: parseInt(e.target.value) || 2000,
                      },
                    }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Delay (ms)"
                  value={animationSettings.shapes.groupDelay}
                  onChange={(e) =>
                    setAnimationSettings((prev) => ({
                      ...prev,
                      shapes: {
                        ...prev.shapes,
                        groupDelay: parseInt(e.target.value) || 300,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Transition Type</Label>
              <Select
                value={replayConfig.transitionType}
                onValueChange={(value: any) =>
                  setReplayConfig((prev) => ({
                    ...prev,
                    transitionType: value,
                  }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide-left">Slide ←</SelectItem>
                  <SelectItem value="slide-right">Slide →</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Transition Duration</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={replayConfig.transitionDuration}
                  onChange={(e) =>
                    setReplayConfig((prev) => ({
                      ...prev,
                      transitionDuration: parseInt(e.target.value) || 1000,
                    }))
                  }
                  className="w-20 h-7 text-xs"
                  min="100"
                  max="5000"
                />
                <span className="text-xs text-muted-foreground">ms</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded border space-y-1">
          <div>🎨 Elements: {elements.length}</div>
          <div>📄 Canvas Mode: {canvasSettings.canvasMode}</div>
          <div>🚀 Engine: Native Canvas (No SVG)</div>
          <div>📐 Resolution: No zoom conflicts!</div>
        </div>
      </div>
    </AnimatedFloatingPanel>
  );
}
