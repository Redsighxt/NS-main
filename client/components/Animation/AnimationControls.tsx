import React, { useEffect, useRef, useState } from "react";
import { useAnimation } from "../../contexts/AnimationContext";
import { useDrawing } from "../../contexts/DrawingContext";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { useNotifications } from "../../hooks/useNotifications";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
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
  RotateCcw,
  Circle,
  Video,
  Download,
  Film,
  Layers,
  Navigation,
  Timer,
  Settings,
} from "lucide-react";
import {
  replayChronologicalAnimation,
  clearChronologicalAnimationOverlay,
} from "../../lib/chronologicalAnimator";
import {
  replayAnimation,
  clearAnimationOverlay,
} from "../../lib/simpleReplayAnimator";

export function AnimationControls() {
  const { state: animationState, dispatch: animationDispatch } = useAnimation();
  const { state: drawingState } = useDrawing();
  const { state: canvasSettings } = useCanvasSettings();
  const { showSuccess, showInfo } = useNotifications();
  const animationFrameRef = useRef<number>();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Set canvas ref for animations
  useEffect(() => {
    // We'll get the canvas ref from the drawing context later
  }, []);

  // Populate animation with existing drawing data if no strokes recorded
  useEffect(() => {
    if (
      animationState.strokes.length === 0 &&
      drawingState.elements.length > 0
    ) {
      animationDispatch({
        type: "POPULATE_FROM_ELEMENTS",
        elements: drawingState.elements,
      });
    }
  }, [animationState.strokes.length, drawingState.elements, animationDispatch]);

  // Advanced animation handlers for chronological mode
  const handlePlay = async () => {
    if (
      animationState.strokes.length === 0 &&
      drawingState.elements.length === 0
    ) {
      showInfo("No drawing content to animate. Draw something first!");
      return;
    }

    // Build timeline if needed
    if (animationState.timeline.length === 0) {
      animationDispatch({ type: "BUILD_TIMELINE" });
    }

    // Determine which animation system to use
    const shouldUseAdvancedAnimation =
      (canvasSettings.canvasMode === "page" &&
        (animationState.settings.animationMode === "chronological" ||
          animationState.settings.animationMode === "page-by-page")) ||
      (canvasSettings.canvasMode === "infinite" &&
        animationState.settings.animationMode === "infinite-panning");

    animationDispatch({ type: "PLAY" });

    if (shouldUseAdvancedAnimation && animationState.canvasRef) {
      // Use advanced chronological animation system
      const elementsToAnimate =
        drawingState.elements.length > 0
          ? drawingState.elements
          : animationState.strokes
              .filter((stroke) => stroke.type === "finish")
              .map((stroke) => stroke.element);

      if (elementsToAnimate.length > 0) {
        try {
          await replayChronologicalAnimation(
            animationState.timeline,
            elementsToAnimate,
            animationState.canvasRef,
            animationState.settings,
          );
        } catch (error) {
          console.error("Advanced animation error:", error);
          showInfo("Animation playback encountered an error.");
        }
      }
    } else if (animationState.canvasRef) {
      // Use simple animation system as fallback
      const elementsToAnimate =
        drawingState.elements.length > 0 ? drawingState.elements : [];

      if (elementsToAnimate.length > 0) {
        try {
          await replayAnimation(elementsToAnimate, animationState.canvasRef, {
            strokeDuration: animationState.settings.strokeDuration,
            strokeDelay: animationState.settings.strokeDelay,
            strokeSpeed: animationState.settings.strokeSpeed,
          });
        } catch (error) {
          console.error("Simple animation error:", error);
          showInfo("Animation playback encountered an error.");
        }
      }
    }
  };

  const handleStop = async () => {
    animationDispatch({ type: "STOP" });

    // Clear both animation overlays
    if (animationState.canvasRef) {
      clearChronologicalAnimationOverlay(animationState.canvasRef);

      // Also clear simple animation overlay
      clearAnimationOverlay(animationState.canvasRef);
    }
  };

  // No time scrubbing needed for simple replay

  const handleDurationChange = (value: number[]) => {
    animationDispatch({ type: "SET_STROKE_DURATION", duration: value[0] });
  };

  // No mode changes needed - always chronological

  // No page delay needed

  const handleStrokeDelayChange = (value: number[]) => {
    animationDispatch({ type: "SET_STROKE_DELAY", delay: value[0] });
  };

  const handleStrokeSpeedChange = (value: number[]) => {
    animationDispatch({ type: "SET_STROKE_SPEED", speed: value[0] });
  };

  const handleLayerSwitchDelayChange = (value: number[]) => {
    animationDispatch({ type: "SET_LAYER_SWITCH_DELAY", delay: value[0] });
  };

  const handleAnimationModeChange = (mode: string) => {
    animationDispatch({
      type: "SET_ANIMATION_MODE",
      mode: mode as "chronological" | "page-by-page" | "infinite-panning",
    });
  };

  const handleSlideAnimationChange = (animation: string) => {
    animationDispatch({
      type: "SET_SLIDE_ANIMATION",
      animation: animation as
        | "left-to-right"
        | "right-to-left"
        | "fade"
        | "none",
    });
  };

  const handleShowLayerTransitionChange = (show: boolean) => {
    animationDispatch({ type: "SET_SHOW_LAYER_TRANSITION", show });
  };

  return (
    <AnimatedFloatingPanel
      id="animation"
      title="Advanced Animation"
      icon={Film}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth / 2 - 225 : 400,
        y: typeof window !== "undefined" ? window.innerHeight - 450 : 500,
      }}
      defaultSize={{ width: 500, height: showAdvancedSettings ? 600 : 480 }}
      hideFromDock={true}
    >
      <div className="space-y-4">
        {/* Recording Status */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Recording Status</Label>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>
              {animationState.strokes.length} strokes,{" "}
              {animationState.layerSwitches.length} layer switches,{" "}
              {drawingState.elements.length} elements
            </span>
          </div>
        </div>

        {/* Animation Mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Animation Mode</Label>
            <Badge
              variant={
                canvasSettings.canvasMode === "page" ? "default" : "secondary"
              }
            >
              {canvasSettings.canvasMode} mode
            </Badge>
          </div>

          <Select
            value={animationState.settings.animationMode}
            onValueChange={handleAnimationModeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chronological">
                <div className="flex items-center space-x-2">
                  <Timer className="h-4 w-4" />
                  <span>Chronological</span>
                </div>
              </SelectItem>
              <SelectItem value="page-by-page">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>Page by Page</span>
                    <span className="text-xs text-muted-foreground">
                      All layer content at once
                    </span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="infinite-panning">
                <div className="flex items-center space-x-2">
                  <Navigation className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>Infinite Panning</span>
                    <span className="text-xs text-muted-foreground">
                      Virtual pages with camera
                    </span>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {canvasSettings.canvasMode === "infinite" && (
            <div className="text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
              <div className="font-medium">Infinite Canvas Mode:</div>
              <div>
                • <strong>Chronological/Page-by-Page:</strong> Standard
                animation
              </div>
              <div>
                • <strong>Infinite Panning:</strong> Virtual pages with smooth
                camera movement
              </div>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-4">
            <Button
              size="sm"
              onClick={handlePlay}
              disabled={
                animationState.strokes.length === 0 &&
                drawingState.elements.length === 0
              }
              className="px-6"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Replay
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
        </div>

        <Separator />

        {/* Basic Settings */}
        <div className="space-y-4">
          {/* Drawing Duration Setting */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Drawing Duration:{" "}
              {(animationState.settings.strokeDuration / 1000).toFixed(1)}s
            </Label>
            <Slider
              value={[animationState.settings.strokeDuration]}
              onValueChange={handleDurationChange}
              min={500}
              max={3000}
              step={100}
              className="w-full"
            />
          </div>

          {/* Element Delay Setting */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Element Delay: {animationState.settings.strokeDelay}ms
            </Label>
            <Slider
              value={[animationState.settings.strokeDelay]}
              onValueChange={handleStrokeDelayChange}
              min={50}
              max={1000}
              step={50}
              className="w-full"
            />
          </div>

          {/* Layer Switch Delay (for Page Mode) */}
          {canvasSettings.canvasMode === "page" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Layer Switch Delay:{" "}
                {(animationState.settings.layerSwitchDelay / 1000).toFixed(1)}s
              </Label>
              <Slider
                value={[animationState.settings.layerSwitchDelay]}
                onValueChange={handleLayerSwitchDelayChange}
                min={10}
                max={5000}
                step={100}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Advanced Settings Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Advanced Settings</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Advanced Settings */}
        {showAdvancedSettings && (
          <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
            {/* Stroke Speed Setting */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Stroke Speed: {animationState.settings.strokeSpeed}x
              </Label>
              <Slider
                value={[animationState.settings.strokeSpeed]}
                onValueChange={handleStrokeSpeedChange}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Layer Transition Settings (for Page Mode) */}
            {canvasSettings.canvasMode === "page" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Layer Transition
                  </Label>
                  <Select
                    value={animationState.settings.slideAnimation}
                    onValueChange={handleSlideAnimationChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="left-to-right">
                        Slide Left to Right
                      </SelectItem>
                      <SelectItem value="right-to-left">
                        Slide Right to Left
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Show Layer Transitions
                  </Label>
                  <Switch
                    checked={animationState.settings.showLayerTransition}
                    onCheckedChange={handleShowLayerTransitionChange}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Status */}
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground text-center p-2">
            {animationState.settings.animationMode === "chronological"
              ? "🎯 Elements animate chronologically with layer switch delays"
              : animationState.settings.animationMode === "page-by-page"
                ? "📄 All layer content appears simultaneously with staggered animations"
                : animationState.settings.animationMode === "infinite-panning"
                  ? "🌐 Virtual pages with smooth camera panning and page transitions"
                  : "✨ Advanced animation mode active"}
          </div>
        </div>
      </div>
    </AnimatedFloatingPanel>
  );
}
