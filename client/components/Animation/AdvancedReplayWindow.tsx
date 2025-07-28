import React, { useState, useRef, useCallback, useEffect } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useAnimation } from "../../contexts/AnimationContext";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { useCanvasBackground } from "../../contexts/CanvasBackgroundContext";
import { useVirtualPages } from "../../contexts/VirtualPagesContext";
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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Play,
  Pause,
  Square,
  Maximize,
  Minimize,
  Monitor,
  Film,
  Download,
  Settings,
  Timer,
  Layers,
} from "lucide-react";
import {
  replayInWindow,
  clearReplayWindowOverlay,
  type ReplayWindowConfig,
} from "../../lib/replayWindowAnimator";
import {
  replayOriginBoxMode,
  clearOriginBoxAnimationOverlay,
  type OriginBoxReplayConfig,
} from "../../lib/originBoxReplayAnimator";
import {
  replayChronologicalMode,
  clearChronologicalAnimationOverlay,
  type ChronologicalReplayConfig,
} from "../../lib/chronologicalReplayAnimator";
import {
  animateElementsDirectly,
  type ExtendedAnimationConfig,
} from "../../lib/directSvgAnimation";
import {
  replayWithVirtualPages,
  clearVirtualPageReplay,
  type VirtualPageReplayConfig,
  type ExtendedReplaySettings,
} from "../../lib/advancedVirtualPageReplay";

type ScalingMode = "fit" | "fill" | "stretch" | "native";
type ReplayResolution = "1920x1080" | "1280x720" | "auto";

type TransitionType =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom"
  | "none";
type ReplayMode = "origin-box" | "page-mode" | "camera-panning";

interface ReplaySettings {
  resolution: ReplayResolution;
  scalingMode: ScalingMode;
  backgroundColor: string;
  showBackground: boolean;
  useCurrentCanvasBackground: boolean;
  replayMode: ReplayMode;
  cameraPanning: boolean;
  transitionType: TransitionType;
  transitionDuration: number;
  pageByPage: boolean;
  showDebugTints: boolean;
  // Comprehensive animation settings
  penStrokes: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
    trueSpeed: boolean;
    trueSpeedRate: number;
  };
  shapes: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
  };
  libraryObjects: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
  };
}

export function AdvancedReplayWindow() {
  const { state: drawingState } = useDrawing();
  const { state: animationState, dispatch: animationDispatch } = useAnimation();
  const { state: canvasSettings } = useCanvasSettings();
  const { currentBackground } = useCanvasBackground();
  const virtualPages = useVirtualPages();
  const pageMode = usePageMode();
  const { actualTheme } = useTheme();

  // Replay state
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);

  // UI sections state
  const [windowReplayExpanded, setWindowReplayExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [exportExpanded, setExportExpanded] = useState(false);

  // Preview mode state
  const [previewMode, setPreviewMode] = useState<"chronological" | "layer">(
    "chronological",
  );

  // Replay settings
  const [replaySettings, setReplaySettings] = useState<ReplaySettings>({
    resolution: "1920x1080",
    scalingMode: "fit",
    backgroundColor: currentBackground.color || "#ffffff",
    showBackground: true,
    useCurrentCanvasBackground: true,
    replayMode: "origin-box",
    cameraPanning: false,
    transitionType: "fade",
    transitionDuration: 1000,
    pageByPage: false,
    showDebugTints: false,
    // Comprehensive animation settings
    penStrokes: {
      elementDuration: 800,
      groupDelay: 200,
      easing: "ease-out",
      trueSpeed: false,
      trueSpeedRate: 200, // 200 pixels per second
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
  });

  const replayContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get replay dimensions
  const getReplayDimensions = () => {
    switch (replaySettings.resolution) {
      case "1920x1080":
        return { width: 1920, height: 1080 };
      case "1280x720":
        return { width: 1280, height: 720 };
      case "auto":
      default:
        if (canvasSettings.canvasMode === "infinite") {
          return { width: 1920, height: 1080 };
        } else {
          return {
            width: canvasSettings.pageSize.width,
            height: canvasSettings.pageSize.height,
          };
        }
    }
  };

  // Calculate scaling for container
  const calculateScaling = (
    containerWidth: number,
    containerHeight: number,
  ) => {
    const { width: replayWidth, height: replayHeight } = getReplayDimensions();

    switch (replaySettings.scalingMode) {
      case "fit":
        const scaleX = containerWidth / replayWidth;
        const scaleY = containerHeight / replayHeight;
        const scale = Math.min(scaleX, scaleY);
        return {
          scale,
          width: replayWidth * scale,
          height: replayHeight * scale,
        };
      case "fill":
        const fillScaleX = containerWidth / replayWidth;
        const fillScaleY = containerHeight / replayHeight;
        const fillScale = Math.max(fillScaleX, fillScaleY);
        return {
          scale: fillScale,
          width: replayWidth * fillScale,
          height: replayHeight * fillScale,
        };
      case "stretch":
        return {
          scale: 1,
          width: containerWidth,
          height: containerHeight,
        };
      case "native":
      default:
        return {
          scale: 1,
          width: replayWidth,
          height: replayHeight,
        };
    }
  };

  // Get elements based on canvas mode
  const getElementsForReplay = () => {
    if (canvasSettings.canvasMode === "infinite") {
      // Use all elements from drawing state for infinite canvas
      return drawingState.elements;
    } else {
      // Page mode - combine elements from all pages
      const allPageElements = pageMode.state.pages.reduce(
        (allElements, page) => {
          return [...allElements, ...page.elements];
        },
        [],
      );
      return allPageElements;
    }
  };

  const handlePlay = async () => {
    if (!canvasRef.current) {
      setReplayError("Canvas not available for replay");
      return;
    }

    const elementsToReplay = getElementsForReplay();
    if (elementsToReplay.length === 0) {
      setReplayError("No drawing content to animate. Draw something first!");
      return;
    }

    setIsPlaying(true);
    setProgress(0);
    setReplayError(null);

    try {
      const { width, height } = getReplayDimensions();

      console.log(
        `Starting preview with ${elementsToReplay.length} elements in ${previewMode} mode (${canvasSettings.canvasMode} canvas)`,
      );

      if (previewMode === "chronological") {
        // EXACT SAME LOGIC AS CHRONOLOGICAL POPUP WINDOW
        console.log("Using chronological mode for preview");

        const chronologicalConfig: ChronologicalReplayConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          replayMode: "chronological-timeline",
          transitionType: replaySettings.transitionType,
          transitionDuration: replaySettings.transitionDuration,
        };

        // Use new virtual page replay system for preview
        const previewConfig: VirtualPageReplayConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          mode: "chronological",
          transitionType: replaySettings.transitionType,
          transitionDuration: replaySettings.transitionDuration,
          showPageIndicators: true,
          showDebugTints: replaySettings.showDebugTints,
        };

        const previewSettings: ExtendedReplaySettings = {
          penStrokes: {
            elementDuration: replaySettings.penStrokes.elementDuration,
            groupDelay: replaySettings.penStrokes.groupDelay,
            easing: replaySettings.penStrokes.easing,
            trueSpeed: replaySettings.penStrokes.trueSpeed,
            trueSpeedRate: replaySettings.penStrokes.trueSpeedRate,
          },
          shapes: {
            elementDuration: replaySettings.shapes.elementDuration,
            groupDelay: replaySettings.shapes.groupDelay,
            easing: replaySettings.shapes.easing,
          },
          libraryObjects: {
            elementDuration: replaySettings.libraryObjects.elementDuration,
            groupDelay: replaySettings.libraryObjects.groupDelay,
            easing: replaySettings.libraryObjects.easing,
          },
        };

        await replayWithVirtualPages(
          elementsToReplay,
          canvasRef.current.parentElement as HTMLElement,
          previewConfig,
          previewSettings,
          (progress) => {
            console.log(`Chronological preview progress: ${progress}%`);
            setProgress(progress);
          },
        );
      } else {
        // EXACT SAME LOGIC AS LAYER REPLAY POPUP WINDOW
        console.log("Using layer mode for preview");

        // Use new virtual page replay system for preview
        const previewConfig: VirtualPageReplayConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          mode: "layer",
          transitionType: replaySettings.transitionType,
          transitionDuration: replaySettings.transitionDuration,
          showPageIndicators: true,
          showDebugTints: replaySettings.showDebugTints,
        };

        const previewSettings: ExtendedReplaySettings = {
          penStrokes: {
            elementDuration: replaySettings.penStrokes.elementDuration,
            groupDelay: replaySettings.penStrokes.groupDelay,
            easing: replaySettings.penStrokes.easing,
            trueSpeed: replaySettings.penStrokes.trueSpeed,
            trueSpeedRate: replaySettings.penStrokes.trueSpeedRate,
          },
          shapes: {
            elementDuration: replaySettings.shapes.elementDuration,
            groupDelay: replaySettings.shapes.groupDelay,
            easing: replaySettings.shapes.easing,
          },
          libraryObjects: {
            elementDuration: replaySettings.libraryObjects.elementDuration,
            groupDelay: replaySettings.libraryObjects.groupDelay,
            easing: replaySettings.libraryObjects.easing,
          },
        };

        await replayWithVirtualPages(
          elementsToReplay,
          canvasRef.current.parentElement as HTMLElement,
          previewConfig,
          previewSettings,
          (progress) => {
            console.log(`Layer preview progress: ${progress}%`);
            setProgress(progress);
          },
        );
      }

      console.log(`Preview completed successfully`);
    } catch (error) {
      console.error("Preview animation error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown preview error occurred";
      setReplayError(errorMessage);
      setProgress(0);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setProgress(0);
    setReplayError(null);
    if (canvasRef.current && canvasRef.current.parentElement) {
      // Clear the SVG animations from the container
      const container = canvasRef.current.parentElement;
      container.innerHTML = '';

      // Re-add the canvas element
      container.appendChild(canvasRef.current);
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Window replay functions...
  const openReplayWindow1 = useCallback(() => {
    if (!canvasRef.current) {
      console.error("Canvas ref is null - cannot open replay window");
      alert("Canvas not ready. Please try again in a moment.");
      return;
    }

    const elementsToReplay = getElementsForReplay();
    if (elementsToReplay.length === 0) {
      console.warn("No drawing elements found");
      alert("No elements to animate. Please draw something first!");
      return;
    }

    const { width, height } = getReplayDimensions();

    const maxWindowWidth = screen.width * 0.9;
    const maxWindowHeight = screen.height * 0.9;

    const scale = Math.min(
      (maxWindowWidth - 100) / width,
      (maxWindowHeight - 200) / height,
    );

    const scaledWidth = Math.max(600, width * scale + 100);
    const scaledHeight = Math.max(400, height * scale + 200);

    const windowFeatures = `width=${scaledWidth},height=${scaledHeight},scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no`;

    console.log(
      "Attempting to open Layer Replay window with features:",
      windowFeatures,
    );

    try {
      const replayWindow = window.open("", "ReplayWindow1", windowFeatures);
      if (!replayWindow || replayWindow.closed) {
        console.error(
          "Layer Replay window failed to open - likely blocked by popup blocker",
        );
        alert(
          "Popup blocked! Please allow popups for this site to use the replay window.",
        );
        return;
      }
      console.log("Layer Replay window opened successfully:", replayWindow);
    } catch (error) {
      console.error("Error opening Layer Replay window:", error);
      alert("Failed to open replay window: " + error.message);
      return;
    }

    const replayWindow = window.open("", "ReplayWindow1", windowFeatures);

    const themeColors =
      actualTheme === "dark"
        ? {
            bodyBg: "#0d1117",
            headerBg: "#161b22",
            headerBorder: "#30363d",
            textColor: "#f0f6fc",
            mutedText: "#8b949e",
            cardBg: "#21262d",
            borderColor: "#30363d",
            buttonBg: "#21262d",
            buttonHover: "#30363d",
            progressBg: "#30363d",
            primaryBg: "#238636",
            primaryHover: "#2ea043",
          }
        : {
            bodyBg: "#f8f9fa",
            headerBg: "#fff",
            headerBorder: "#e5e5e5",
            textColor: "#1a1a1a",
            mutedText: "#6c757d",
            cardBg: "#fff",
            borderColor: "#e5e5e5",
            buttonBg: "#fff",
            buttonHover: "#f8f9fa",
            progressBg: "#e9ecef",
            primaryBg: "#007bff",
            primaryHover: "#0056b3",
          };

    replayWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>📄 ${width}×${height} Layer Replay - Window 1</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              background: ${themeColors.bodyBg};
              color: ${themeColors.textColor};
              display: flex;
              flex-direction: column;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              height: 100vh;
              overflow: hidden;
            }
            .header {
              background: ${themeColors.headerBg};
              border-bottom: 1px solid ${themeColors.headerBorder};
              padding: 12px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .title {
              font-size: 18px;
              font-weight: 600;
              color: ${themeColors.textColor};
              margin: 0;
            }
            .window-controls {
              display: flex;
              gap: 8px;
            }
            .control-btn {
              width: 32px;
              height: 32px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              transition: background-color 0.2s;
            }
            .close-btn {
              background: #ff5f56;
              color: white;
            }
            .close-btn:hover {
              background: #ff3b30;
            }
            .minimize-btn {
              background: #ffbd2e;
              color: white;
            }
            .minimize-btn:hover {
              background: #ff9500;
            }
            .main-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              min-height: 0;
            }
            .replay-container {
              position: relative;
              background: ${replaySettings.backgroundColor};
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 8px 25px rgba(0,0,0,0.15);
              max-width: 100%;
              max-height: calc(100vh - 250px);
            }
            .replay-canvas {
              display: block;
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
            }
            .controls {
              margin-top: 20px;
              display: flex;
              gap: 12px;
              align-items: center;
              background: ${themeColors.cardBg};
              border: 1px solid ${themeColors.borderColor};
              padding: 16px 24px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            button {
              padding: 10px 18px;
              border: 1px solid ${themeColors.borderColor};
              border-radius: 8px;
              background: ${themeColors.buttonBg};
              color: ${themeColors.textColor};
              cursor: pointer;
              font-weight: 500;
              transition: all 0.2s;
            }
            button:hover {
              background: ${themeColors.buttonHover};
              border-color: ${themeColors.primaryBg};
              transform: translateY(-1px);
            }
            button:active {
              transform: translateY(0);
            }
            .play-btn {
              background: ${themeColors.primaryBg};
              color: white;
              border-color: ${themeColors.primaryBg};
            }
            .play-btn:hover {
              background: ${themeColors.primaryHover};
            }
            .progress {
              width: 250px;
              height: 6px;
              background: ${themeColors.progressBg};
              border-radius: 3px;
              overflow: hidden;
            }
            .progress-bar {
              height: 100%;
              background: linear-gradient(90deg, ${themeColors.primaryBg}, ${themeColors.primaryHover});
              width: 0%;
              transition: width 0.2s ease;
              border-radius: 3px;
            }
            .info {
              margin-top: 12px;
              color: ${themeColors.mutedText};
              font-size: 13px;
              text-align: center;
            }
            .fullscreen {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: ${actualTheme === "dark" ? "#000" : "#fff"};
              z-index: 9999;
            }
            .fullscreen .replay-container {
              max-width: 90vw;
              max-height: 90vh;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">📄 ${width}×${height} Layer Replay - Window 1</h1>
            <div class="window-controls">
              <button class="control-btn minimize-btn" onclick="window.focus(); window.blur();" title="Minimize">−</button>
              <button class="control-btn close-btn" onclick="window.close()" title="Close Window">×</button>
            </div>
          </div>
          <div class="main-content">
            <div class="replay-container">
              <div id="replayCanvas" class="replay-canvas" style="width: ${width}px; height: ${height}px; position: relative;"></div>
            </div>
            <div class="controls">
              <button onclick="startReplay()" class="play-btn">▶ Play</button>
              <button onclick="stopReplay()">⏹ Stop</button>
              <button onclick="toggleFullscreen()">⛶ Fullscreen</button>
              <div class="progress"><div class="progress-bar" id="progressBar"></div></div>
            </div>
            <div class="info">
              📐 Resolution: ${width}×${height} • 🎨 Mode: ${replaySettings.scalingMode} • 📝 Elements: ${elementsToReplay.length}
            </div>
          </div>
        </body>
      </html>
    `);

    replayWindow.document.close();

    const replayCanvas = replayWindow.document.getElementById(
      "replayCanvas",
    ) as HTMLElement;
    const progressBar = replayWindow.document.getElementById(
      "progressBar",
    ) as HTMLElement;

    (replayWindow as any).startReplay = async () => {
      if (!replayCanvas) {
        console.error("Replay canvas not available in popup window");
        return;
      }

      if (elementsToReplay.length === 0) {
        alert("No drawing content to animate. Draw something first!");
        return;
      }

      console.log(
        `Starting popup replay with ${elementsToReplay.length} elements`,
      );

      try {

        const originBoxConfig: OriginBoxReplayConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          replayMode: replaySettings.replayMode,
          transitionType: replaySettings.transitionType,
          transitionDuration: replaySettings.transitionDuration,
          pageByPage: replaySettings.pageByPage,
        };

        // Create comprehensive animation settings
        const modifiedSettings = {
          ...animationState.settings,
          strokeDuration: replaySettings.penStrokes.elementDuration,
          strokeDelay: replaySettings.penStrokes.groupDelay,
          strokeSpeed: 1, // Base speed, true speed overrides this
          useElementDuration: elementsToReplay.map((element, index) => {
            // Calculate duration based on element type and settings
            if (element.type === "path") {
              return replaySettings.penStrokes.trueSpeed
                ? calculateTrueSpeedDuration(element)
                : replaySettings.penStrokes.elementDuration;
            } else if (element.type === "highlighter") {
              return replaySettings.penStrokes.elementDuration;
            } else if (
              element.type === "rectangle" ||
              element.type === "ellipse" ||
              element.type === "line" ||
              element.type === "arrow"
            ) {
              return replaySettings.shapes.elementDuration;
            } else {
              return replaySettings.libraryObjects.elementDuration;
            }
          }),
        };

        // Use the new directSvgAnimation system for proper fill patterns and stroke styles
        const extendedConfig: ExtendedAnimationConfig = {
          penStrokes: {
            elementDuration: replaySettings.penStrokes.elementDuration,
            groupDelay: replaySettings.penStrokes.groupDelay,
            easing: replaySettings.penStrokes.easing,
          },
          shapes: {
            elementDuration: replaySettings.shapes.elementDuration,
            groupDelay: replaySettings.shapes.groupDelay,
            easing: replaySettings.shapes.easing,
          },
          libraryObjects: {
            elementDuration: replaySettings.libraryObjects.elementDuration,
            groupDelay: replaySettings.libraryObjects.groupDelay,
            easing: replaySettings.libraryObjects.easing,
          },
        };

        console.log("Starting layer replay animation with elements:", elementsToReplay.length);
        console.log("Container:", replayCanvas);
        console.log("Extended config:", extendedConfig);
        
        // Use new advanced virtual page replay system with progressive fills
        const layerConfig: VirtualPageReplayConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          mode: "layer",
          transitionType: replaySettings.transitionType,
          transitionDuration: replaySettings.transitionDuration,
          showPageIndicators: true,
          showDebugTints: replaySettings.showDebugTints,
        };

        const layerSettings: ExtendedReplaySettings = {
          penStrokes: {
            elementDuration: replaySettings.penStrokes.elementDuration,
            groupDelay: replaySettings.penStrokes.groupDelay,
            easing: replaySettings.penStrokes.easing,
            trueSpeed: replaySettings.penStrokes.trueSpeed,
            trueSpeedRate: replaySettings.penStrokes.trueSpeedRate,
          },
          shapes: {
            elementDuration: replaySettings.shapes.elementDuration,
            groupDelay: replaySettings.shapes.groupDelay,
            easing: replaySettings.shapes.easing,
          },
          libraryObjects: {
            elementDuration: replaySettings.libraryObjects.elementDuration,
            groupDelay: replaySettings.libraryObjects.groupDelay,
            easing: replaySettings.libraryObjects.easing,
          },
        };

        await replayWithVirtualPages(
          elementsToReplay,
          replayCanvas,
          layerConfig,
          layerSettings,
          (progress) => {
            console.log("Layer replay progress:", progress);
            if (progressBar) {
              progressBar.style.width = `${progress}%`;
            }
          },
        );
      } catch (error) {
        console.error("Replay window error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown replay error";
        alert(`Replay Error: ${errorMessage}`);
      }
    };

    (replayWindow as any).stopReplay = () => {
      if (replayCanvas) {
        // Clear the new virtual page replay system
        clearVirtualPageReplay(replayCanvas);
        if (progressBar) {
          progressBar.style.width = "0%";
        }
      }
    };

    (replayWindow as any).toggleFullscreen = () => {
      const body = replayWindow.document.body;
      if (body.classList.contains("fullscreen")) {
        body.classList.remove("fullscreen");
      } else {
        body.classList.add("fullscreen");
      }
    };

    replayWindow.document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        replayWindow.document.body.classList.remove("fullscreen");
      } else if (e.key === "f" || e.key === "F") {
        (replayWindow as any).toggleFullscreen();
      } else if (e.key === " ") {
        e.preventDefault();
        (replayWindow as any).startReplay();
      }
    });

    replayWindow.document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        replayWindow.close();
      }
    });

    replayWindow.focus();
  }, [
    drawingState.elements,
    drawingState.layers,
    pageMode.state.pages,
    canvasSettings.canvasMode,
    replaySettings,
    actualTheme,
    currentBackground,
  ]);

  const openReplayWindow2 = useCallback(() => {
    if (!canvasRef.current) {
      console.error("Canvas ref is null - cannot open replay window");
      alert("Canvas not ready. Please try again in a moment.");
      return;
    }

    const elementsToReplay = getElementsForReplay();
    if (elementsToReplay.length === 0) {
      console.warn("No drawing elements found");
      alert("No elements to animate. Please draw something first!");
      return;
    }

    const { width, height } = getReplayDimensions();

    const maxWindowWidth = screen.width * 0.9;
    const maxWindowHeight = screen.height * 0.9;

    const scale = Math.min(
      (maxWindowWidth - 100) / width,
      (maxWindowHeight - 200) / height,
    );

    const scaledWidth = Math.max(600, width * scale + 100);
    const scaledHeight = Math.max(400, height * scale + 200);

    const windowFeatures = `width=${scaledWidth},height=${scaledHeight},scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no`;

    console.log(
      "Attempting to open Chronological Mode window with features:",
      windowFeatures,
    );

    try {
      const replayWindow2 = window.open("", "ReplayWindow2", windowFeatures);
      if (!replayWindow2 || replayWindow2.closed) {
        console.error(
          "Chronological Mode window failed to open - likely blocked by popup blocker",
        );
        alert(
          "Popup blocked! Please allow popups for this site to use the replay window.",
        );
        return;
      }
      console.log(
        "Chronological Mode window opened successfully:",
        replayWindow2,
      );
    } catch (error) {
      console.error("Error opening Chronological Mode window:", error);
      alert("Failed to open replay window: " + error.message);
      return;
    }

    const replayWindow2 = window.open("", "ReplayWindow2", windowFeatures);

    const themeColors =
      actualTheme === "dark"
        ? {
            bodyBg: "#0d1117",
            headerBg: "#161b22",
            headerBorder: "#30363d",
            textColor: "#f0f6fc",
            mutedText: "#8b949e",
            cardBg: "#21262d",
            borderColor: "#30363d",
            buttonBg: "#21262d",
            buttonHover: "#30363d",
            progressBg: "#30363d",
            primaryBg: "#238636",
            primaryHover: "#2ea043",
          }
        : {
            bodyBg: "#f8f9fa",
            headerBg: "#fff",
            headerBorder: "#e5e5e5",
            textColor: "#1a1a1a",
            mutedText: "#6c757d",
            cardBg: "#fff",
            borderColor: "#e5e5e5",
            buttonBg: "#fff",
            buttonHover: "#f8f9fa",
            progressBg: "#e9ecef",
            primaryBg: "#007bff",
            primaryHover: "#0056b3",
          };

    replayWindow2.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>⏰ ${width}��${height} Chronological Mode - Window 2</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              background: ${themeColors.bodyBg};
              color: ${themeColors.textColor};
              display: flex;
              flex-direction: column;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              height: 100vh;
              overflow: hidden;
            }
            .header {
              background: ${themeColors.headerBg};
              border-bottom: 1px solid ${themeColors.headerBorder};
              padding: 12px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .title {
              font-size: 18px;
              font-weight: 600;
              color: ${themeColors.textColor};
              margin: 0;
            }
            .window-controls {
              display: flex;
              gap: 8px;
            }
            .control-btn {
              width: 32px;
              height: 32px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              transition: background-color 0.2s;
            }
            .close-btn {
              background: #ff5f56;
              color: white;
            }
            .close-btn:hover {
              background: #ff3b30;
            }
            .minimize-btn {
              background: #ffbd2e;
              color: white;
            }
            .minimize-btn:hover {
              background: #ff9500;
            }
            .main-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              min-height: 0;
            }
            .replay-container {
              position: relative;
              background: ${replaySettings.backgroundColor};
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 8px 25px rgba(0,0,0,0.15);
              max-width: 100%;
              max-height: calc(100vh - 250px);
            }
            .replay-canvas {
              display: block;
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
            }
            .controls {
              margin-top: 20px;
              display: flex;
              gap: 12px;
              align-items: center;
              background: ${themeColors.cardBg};
              border: 1px solid ${themeColors.borderColor};
              padding: 16px 24px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            button {
              padding: 10px 18px;
              border: 1px solid ${themeColors.borderColor};
              border-radius: 8px;
              background: ${themeColors.buttonBg};
              color: ${themeColors.textColor};
              cursor: pointer;
              font-weight: 500;
              transition: all 0.2s;
            }
            button:hover {
              background: ${themeColors.buttonHover};
              border-color: ${themeColors.primaryBg};
              transform: translateY(-1px);
            }
            button:active {
              transform: translateY(0);
            }
            .play-btn {
              background: ${themeColors.primaryBg};
              color: white;
              border-color: ${themeColors.primaryBg};
            }
            .play-btn:hover {
              background: ${themeColors.primaryHover};
            }
            .progress {
              width: 250px;
              height: 6px;
              background: ${themeColors.progressBg};
              border-radius: 3px;
              overflow: hidden;
            }
            .progress-bar {
              height: 100%;
              background: linear-gradient(90deg, ${themeColors.primaryBg}, ${themeColors.primaryHover});
              width: 0%;
              transition: width 0.2s ease;
              border-radius: 3px;
            }
            .info {
              margin-top: 12px;
              color: ${themeColors.mutedText};
              font-size: 13px;
              text-align: center;
            }
            .fullscreen {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: ${actualTheme === "dark" ? "#000" : "#fff"};
              z-index: 9999;
            }
            .fullscreen .replay-container {
              max-width: 90vw;
              max-height: 90vh;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">⏰ ${width}×${height} Chronological Mode - Window 2</h1>
            <div class="window-controls">
              <button class="control-btn minimize-btn" onclick="window.focus(); window.blur();" title="Minimize">−</button>
              <button class="control-btn close-btn" onclick="window.close()" title="Close Window">×</button>
            </div>
          </div>
          <div class="main-content">
            <div class="replay-container">
              <div id="replayCanvas2" class="replay-canvas" style="width: ${width}px; height: ${height}px; position: relative;"></div>
            </div>
            <div class="controls">
              <button onclick="startReplay2()" class="play-btn">▶ Play</button>
              <button onclick="stopReplay2()">⏹ Stop</button>
              <button onclick="toggleFullscreen2()">⛶ Fullscreen</button>
              <div class="progress"><div class="progress-bar" id="progressBar2"></div></div>
            </div>
            <div class="info">
              📐 Resolution: ${width}×${height} • 🎨 Mode: ${replaySettings.scalingMode} • 📝 Elements: ${elementsToReplay.length}
            </div>
          </div>
        </body>
      </html>
    `);

    replayWindow2.document.close();

    const replayCanvas2 = replayWindow2.document.getElementById(
      "replayCanvas2",
    ) as HTMLElement;
    const progressBar2 = replayWindow2.document.getElementById(
      "progressBar2",
    ) as HTMLElement;

    (replayWindow2 as any).startReplay2 = async () => {
      if (!replayCanvas2) {
        console.error("Replay canvas 2 not available in popup window");
        return;
      }

      if (elementsToReplay.length === 0) {
        alert("No drawing content to animate. Draw something first!");
        return;
      }

      console.log(
        `Starting popup replay 2 with ${elementsToReplay.length} elements`,
      );

      try {

        const chronologicalConfig: ChronologicalReplayConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          replayMode: "chronological-timeline",
          transitionType: replaySettings.transitionType,
          transitionDuration: replaySettings.transitionDuration,
        };

        // Create comprehensive animation settings for chronological mode
        const modifiedSettings2 = {
          ...animationState.settings,
          strokeDuration: replaySettings.penStrokes.elementDuration,
          strokeDelay: replaySettings.penStrokes.groupDelay,
          strokeSpeed: 1, // Base speed, true speed overrides this
          useElementDuration: elementsToReplay.map((element, index) => {
            // Calculate duration based on element type and settings
            if (element.type === "path") {
              return replaySettings.penStrokes.trueSpeed
                ? calculateTrueSpeedDuration(element)
                : replaySettings.penStrokes.elementDuration;
            } else if (element.type === "highlighter") {
              return replaySettings.penStrokes.elementDuration;
            } else if (
              element.type === "rectangle" ||
              element.type === "ellipse" ||
              element.type === "line" ||
              element.type === "arrow"
            ) {
              return replaySettings.shapes.elementDuration;
            } else {
              return replaySettings.libraryObjects.elementDuration;
            }
          }),
        };

        // Use the new directSvgAnimation system for proper fill patterns and stroke styles
        const extendedConfig: ExtendedAnimationConfig = {
          penStrokes: {
            elementDuration: replaySettings.penStrokes.elementDuration,
            groupDelay: replaySettings.penStrokes.groupDelay,
            easing: replaySettings.penStrokes.easing,
          },
          shapes: {
            elementDuration: replaySettings.shapes.elementDuration,
            groupDelay: replaySettings.shapes.groupDelay,
            easing: replaySettings.shapes.easing,
          },
          libraryObjects: {
            elementDuration: replaySettings.libraryObjects.elementDuration,
            groupDelay: replaySettings.libraryObjects.groupDelay,
            easing: replaySettings.libraryObjects.easing,
          },
        };

        console.log("Starting chronological animation with elements:", elementsToReplay.length);
        console.log("Container:", replayCanvas2);
        console.log("Extended config:", extendedConfig);
        
        // Use new advanced virtual page replay system with progressive fills
        const chronoConfig: VirtualPageReplayConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          mode: "chronological",
          transitionType: replaySettings.transitionType,
          transitionDuration: replaySettings.transitionDuration,
          showPageIndicators: true,
          showDebugTints: replaySettings.showDebugTints,
        };

        const chronoSettings: ExtendedReplaySettings = {
          penStrokes: {
            elementDuration: replaySettings.penStrokes.elementDuration,
            groupDelay: replaySettings.penStrokes.groupDelay,
            easing: replaySettings.penStrokes.easing,
            trueSpeed: replaySettings.penStrokes.trueSpeed,
            trueSpeedRate: replaySettings.penStrokes.trueSpeedRate,
          },
          shapes: {
            elementDuration: replaySettings.shapes.elementDuration,
            groupDelay: replaySettings.shapes.groupDelay,
            easing: replaySettings.shapes.easing,
          },
          libraryObjects: {
            elementDuration: replaySettings.libraryObjects.elementDuration,
            groupDelay: replaySettings.libraryObjects.groupDelay,
            easing: replaySettings.libraryObjects.easing,
          },
        };

        await replayWithVirtualPages(
          elementsToReplay,
          replayCanvas2,
          chronoConfig,
          chronoSettings,
          (progress) => {
            console.log("Chronological progress:", progress);
            if (progressBar2) {
              progressBar2.style.width = `${progress}%`;
            }
          },
        );
      } catch (error) {
        console.error("Replay window 2 error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown replay error";
        alert(`Replay Error Window 2: ${errorMessage}`);
      }
    };

    (replayWindow2 as any).stopReplay2 = () => {
      if (replayCanvas2) {
        // Clear the new virtual page replay system
        clearVirtualPageReplay(replayCanvas2);
        if (progressBar2) {
          progressBar2.style.width = "0%";
        }
      }
    };

    (replayWindow2 as any).toggleFullscreen2 = () => {
      const body = replayWindow2.document.body;
      if (body.classList.contains("fullscreen")) {
        body.classList.remove("fullscreen");
      } else {
        body.classList.add("fullscreen");
      }
    };

    replayWindow2.document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        replayWindow2.document.body.classList.remove("fullscreen");
      } else if (e.key === "f" || e.key === "F") {
        (replayWindow2 as any).toggleFullscreen2();
      } else if (e.key === " ") {
        e.preventDefault();
        (replayWindow2 as any).startReplay2();
      }
    });

    replayWindow2.document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        replayWindow2.close();
      }
    });

    replayWindow2.focus();
  }, [
    drawingState.elements,
    drawingState.layers,
    pageMode.state.pages,
    canvasSettings.canvasMode,
    replaySettings,
    actualTheme,
    currentBackground,
  ]);

  const updateReplaySettings = (updates: Partial<ReplaySettings>) => {
    setReplaySettings((prev) => ({ ...prev, ...updates }));
  };

  // Auto-sync canvas background when useCurrentCanvasBackground is enabled
  useEffect(() => {
    if (replaySettings.useCurrentCanvasBackground && currentBackground.color) {
      setReplaySettings((prev) => ({
        ...prev,
        backgroundColor: currentBackground.color,
      }));
    }
  }, [currentBackground.color, replaySettings.useCurrentCanvasBackground]);

  // Calculate path length for true speed animation
  const calculatePathLength = (element: any): number => {
    if (!element.points || element.points.length < 2) {
      return 10; // Minimum length for other elements
    }

    let totalLength = 0;
    for (let i = 1; i < element.points.length; i++) {
      const dx = element.points[i].x - element.points[i - 1].x;
      const dy = element.points[i].y - element.points[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    return Math.max(totalLength, 10); // Ensure minimum length
  };

  // Calculate duration based on true speed settings (only for pencil strokes)
  const calculateTrueSpeedDuration = (element: any): number => {
    // Only apply true speed to pencil strokes (path elements)
    if (!replaySettings.penStrokes.trueSpeed || element.type !== "path") {
      return 1500; // Default duration when true speed is off or not a pencil stroke
    }

    const pathLength = calculatePathLength(element);
    const duration =
      (pathLength / replaySettings.penStrokes.trueSpeedRate) * 1000; // Convert to milliseconds

    // Ensure reasonable bounds (min 100ms, max 10s)
    return Math.max(100, Math.min(duration, 10000));
  };

  // Get container dimensions for preview
  const getPreviewDimensions = () => {
    if (isFullscreen) {
      const availableWidth = window.innerWidth - 40;
      const availableHeight = window.innerHeight - 200;
      return calculateScaling(availableWidth, availableHeight);
    } else {
      return calculateScaling(480, 300);
    }
  };

  const {
    width: previewWidth,
    height: previewHeight,
    scale: previewScale,
  } = getPreviewDimensions();
  const { width: replayWidth, height: replayHeight } = getReplayDimensions();
  const elementsToReplay = getElementsForReplay();

  const ReplayCanvas = () => (
    <div
      className="relative mx-auto"
      style={{
        width: `${previewWidth}px`,
        height: `${previewHeight}px`,
      }}
    >
      <canvas
        ref={canvasRef}
        width={replayWidth}
        height={replayHeight}
        className={`absolute inset-0 ${isFullscreen ? "" : "border rounded"}`}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: replaySettings.showBackground
            ? replaySettings.backgroundColor
            : "transparent",
          transform: `scale(${previewScale})`,
          transformOrigin: "center",
          border: isFullscreen ? "none" : undefined,
        }}
      />

      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {replayWidth} × {replayHeight}
      </div>

      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {replaySettings.scalingMode}
      </div>

      {canvasSettings.canvasMode === "infinite" &&
        virtualPages.statistics.totalPages > 1 && (
          <div className="absolute bottom-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
            {virtualPages.statistics.pagesWithElements} virtual pages
          </div>
        )}

      <div className="absolute bottom-2 right-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded">
        {previewMode} mode
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center p-2">
          <ReplayCanvas />
        </div>

        <div className="bg-black/50 backdrop-blur-sm p-4 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            {(isPlaying || progress > 0) && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-white/80 mb-2">
                  <span>Animation Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="bg-white/20" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handlePlay}
                  disabled={isPlaying || elementsToReplay.length === 0}
                  className="bg-white/10 hover:bg-white/20 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </Button>

                <Button
                  onClick={handleStop}
                  disabled={!isPlaying && progress === 0}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>

                <Badge variant="outline" className="text-white border-white/30">
                  {replayWidth} × {replayHeight} • {replaySettings.scalingMode}
                </Badge>
              </div>

              <Button
                onClick={handleFullscreen}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                <Minimize className="h-4 w-4 mr-2" />
                Exit Fullscreen
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatedFloatingPanel
      id="advanced-replay"
      title="🎬 1920×1080 Replay Studio"
      icon={Monitor}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 450 : 950,
        y: 200,
      }}
      defaultSize={{ width: 650, height: 800 }}
    >
      <div className="space-y-3">
        {/* Window Replay Section */}
        <div className="border rounded-lg bg-card">
          <button
            onClick={() => setWindowReplayExpanded(!windowReplayExpanded)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Monitor className="h-4 w-4" />
              <span className="font-medium">Window Replay</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {windowReplayExpanded ? "▼" : "��"}
            </div>
          </button>

          {windowReplayExpanded && (
            <div className="p-3 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={openReplayWindow2}
                  variant="default"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Timer className="h-4 w-4 mr-2" />
                  Chronological Mode
                </Button>

                <Button onClick={openReplayWindow1} variant="outline" size="sm">
                  <Layers className="h-4 w-4 mr-2" />
                  Layer Replay
                </Button>
              </div>

              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <div>
                  <strong>Chronological:</strong> Follows exact drawing timeline
                  with page switches
                </div>
                <div>
                  <strong>Layer Replay:</strong> Groups content by pages/layers
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div className="border rounded-lg bg-card">
          <button
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Settings</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {settingsExpanded ? "▼" : "▶"}
            </div>
          </button>

          {settingsExpanded && (
            <div className="p-3 pt-0 space-y-4">
              {/* Resolution & Scaling */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Resolution</label>
                  <Select
                    value={replaySettings.resolution}
                    onValueChange={(value: ReplayResolution) =>
                      updateReplaySettings({ resolution: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">
                        1920×1080 (Full HD)
                      </SelectItem>
                      <SelectItem value="1280x720">1280×720 (HD)</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Scaling</label>
                  <Select
                    value={replaySettings.scalingMode}
                    onValueChange={(value: ScalingMode) =>
                      updateReplaySettings({ scalingMode: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fit">Fit</SelectItem>
                      <SelectItem value="fill">Fill</SelectItem>
                      <SelectItem value="stretch">Stretch</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Transitions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Page Transition</label>
                  <Select
                    value={replaySettings.transitionType}
                    onValueChange={(value: TransitionType) =>
                      updateReplaySettings({ transitionType: value })
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="slide-left">Slide ←</SelectItem>
                      <SelectItem value="slide-right">Slide →</SelectItem>
                      <SelectItem value="slide-up">Slide ↑</SelectItem>
                      <SelectItem value="slide-down">Slide ↓</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Transition Duration
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={replaySettings.transitionDuration}
                      onChange={(e) =>
                        updateReplaySettings({
                          transitionDuration: parseInt(e.target.value) || 1000,
                        })
                      }
                      className="w-20 h-7 text-xs"
                      min="100"
                      max="5000"
                      step="100"
                    />
                    <span className="text-xs text-muted-foreground">ms</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Background Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Background</label>
                  <Switch
                    checked={replaySettings.showBackground}
                    onCheckedChange={(checked) =>
                      updateReplaySettings({ showBackground: checked })
                    }
                  />
                </div>

                {replaySettings.showBackground && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        Current Canvas Background
                      </label>
                      <Switch
                        checked={replaySettings.useCurrentCanvasBackground}
                        onCheckedChange={(checked) =>
                          updateReplaySettings({
                            useCurrentCanvasBackground: checked,
                            backgroundColor: checked
                              ? currentBackground.color
                              : replaySettings.backgroundColor,
                          })
                        }
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {replaySettings.useCurrentCanvasBackground
                        ? "✓ Automatically uses current canvas background color"
                        : "Manual background color selection"}
                    </div>
                  </div>
                )}

                {replaySettings.showBackground &&
                  !replaySettings.useCurrentCanvasBackground && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-6 h-6 rounded border border-muted-foreground/20 cursor-pointer"
                          style={{
                            backgroundColor: replaySettings.backgroundColor,
                          }}
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "color";
                            input.value = replaySettings.backgroundColor;
                            input.onchange = (e) => {
                              const target = e.target as HTMLInputElement;
                              updateReplaySettings({
                                backgroundColor: target.value,
                              });
                            };
                            input.click();
                          }}
                        />
                        <Input
                          type="text"
                          value={replaySettings.backgroundColor}
                          onChange={(e) =>
                            updateReplaySettings({
                              backgroundColor: e.target.value,
                            })
                          }
                          className="text-xs h-7"
                          placeholder="#ffffff"
                        />
                      </div>

                      <div className="flex space-x-1">
                        {[
                          "#ffffff",
                          "#000000",
                          "#f3f4f6",
                          "#1f2937",
                          currentBackground.color,
                        ]
                          .filter(Boolean)
                          .map((color) => (
                            <button
                              key={color}
                              className="w-6 h-6 rounded border border-muted-foreground/20"
                              style={{ backgroundColor: color }}
                              onClick={() =>
                                updateReplaySettings({ backgroundColor: color })
                              }
                            />
                          ))}
                      </div>
                    </div>
                  )}
              </div>

              <Separator />

              {/* Comprehensive Animation Settings */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Animation Settings
                </label>
                <AnimationSettingsTabs
                  config={replaySettings}
                  onChange={setReplaySettings}
                />
              </div>

              <Separator />

              {/* Debug Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Debug Tints</label>
                  <Switch
                    checked={replaySettings.showDebugTints}
                    onCheckedChange={(checked) =>
                      updateReplaySettings({ showDebugTints: checked })
                    }
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Show colored overlays for debugging animation engines
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Section - Hidden but functional for popup window dependencies */}
        <div className="hidden">
          <button
            onClick={() => setPreviewExpanded(!previewExpanded)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Film className="h-4 w-4" />
              <span className="font-medium">Preview</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {previewExpanded ? "▼" : "▶"}
            </div>
          </button>

          {/* Always render canvas for popup window functions, but hide content when collapsed */}
          <div
            className="absolute opacity-0 pointer-events-none"
            style={{ left: "-9999px" }}
          >
            <ReplayCanvas />
          </div>

          {previewExpanded && (
            <div className="p-3 pt-0 space-y-3">
              {/* Preview Mode Selection */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Mode</label>
                <Select
                  value={previewMode}
                  onValueChange={(value: "chronological" | "layer") =>
                    setPreviewMode(value)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chronological">
                      <div className="flex items-center space-x-2">
                        <Timer className="h-4 w-4" />
                        <span>Chronological Mode</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="layer">
                      <div className="flex items-center space-x-2">
                        <Layers className="h-4 w-4" />
                        <span>Layer Mode</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview Canvas */}
              <div className="border rounded-lg p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-2 text-center">
                  Preview • {Math.round(previewScale * 100)}% scale •{" "}
                  {previewMode} mode
                </div>
                <ReplayCanvas />
              </div>

              {/* Preview Controls */}
              <div className="flex items-center justify-center space-x-3">
                <Button
                  onClick={handlePlay}
                  disabled={isPlaying || elementsToReplay.length === 0}
                  size="sm"
                  className="px-6"
                  title={
                    elementsToReplay.length === 0
                      ? "Draw something first to enable preview"
                      : "Start preview animation"
                  }
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play Preview
                </Button>

                <Button
                  onClick={handleStop}
                  disabled={!isPlaying && progress === 0}
                  variant="outline"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>

                <Button onClick={handleFullscreen} variant="outline" size="sm">
                  <Maximize className="h-4 w-4 mr-2" />
                  Fullscreen
                </Button>
              </div>

              {/* Progress Bar */}
              {(isPlaying || progress > 0) && (
                <div className="space-y-2 p-3 bg-muted/20 rounded-lg border">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Preview Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {/* Error Display */}
              {replayError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="text-sm text-red-600 dark:text-red-400">
                    ⚠️ <strong>Preview Error:</strong> {replayError}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="border rounded-lg bg-card">
          <button
            onClick={() => setExportExpanded(!exportExpanded)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span className="font-medium">Export Options</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {exportExpanded ? "▼" : "▶"}
            </div>
          </button>

          {exportExpanded && (
            <div className="p-3 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" disabled>
                  <Download className="h-4 w-4 mr-1" />
                  MP4
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <Download className="h-4 w-4 mr-1" />
                  GIF
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <Download className="h-4 w-4 mr-1" />
                  WebM
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (canvasRef.current) {
                      const link = document.createElement("a");
                      link.download = `animation-${Date.now()}.png`;
                      link.href = canvasRef.current.toDataURL();
                      link.click();
                    }
                  }}
                  disabled={!canvasRef.current}
                >
                  <Download className="h-4 w-4 mr-1" />
                  PNG
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Video export coming in future updates
              </div>
            </div>
          )}
        </div>

        {/* Settings Summary */}
        <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
          <div className="text-xs font-medium">Current Setup:</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>
              📐 Resolution: {replayWidth} × {replayHeight} (
              {replaySettings.resolution})
            </div>
            <div>🔧 Scaling: {replaySettings.scalingMode}</div>
            <div>�� Animation: {previewMode} mode</div>
            <div>📄 Canvas: {canvasSettings.canvasMode} mode</div>
            <div>📝 Elements: {elementsToReplay.length}</div>
            {canvasSettings.canvasMode === "infinite" &&
              virtualPages.statistics.totalPages > 1 && (
                <div>
                  📑 Virtual Pages: {virtualPages.statistics.pagesWithElements}/
                  {virtualPages.statistics.totalPages}
                </div>
              )}
            {canvasSettings.canvasMode === "page" &&
              pageMode.state.pages.length > 1 && (
                <div>
                  📄 Pages: {pageMode.state.pages.length}
                  (Current: {pageMode.getCurrentPage()?.name || "None"})
                </div>
              )}
            <div>
              ⏱️ Duration: ~
              {Math.round(
                (elementsToReplay.length *
                  animationState.settings.strokeDuration +
                  (elementsToReplay.length - 1) *
                    animationState.settings.strokeDelay) /
                  1000,
              )}
              s
            </div>
          </div>

          {elementsToReplay.length === 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-950/20 rounded mt-2">
              ⚠️ No drawing content to animate. Draw something first!
            </div>
          )}
        </div>
      </div>
    </AnimatedFloatingPanel>
  );
}

// Time Input Component with Unit Selection for Animation Settings
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
          className="flex-1 h-7 text-xs"
          step={unit === "s" ? 0.1 : 10}
          min={unit === "s" ? min / 1000 : min}
          max={allowUnlimited ? undefined : unit === "s" ? max / 1000 : max}
        />
        <Select value={unit} onValueChange={handleUnitChange}>
          <SelectTrigger className="w-16 h-7 text-xs">
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

// Animation Settings Tabs Component for 1920x1080 Replay Studio
interface AnimationSettingsTabsProps {
  config: ReplaySettings;
  onChange: (config: ReplaySettings) => void;
}

function AnimationSettingsTabs({
  config,
  onChange,
}: AnimationSettingsTabsProps) {
  const updatePenStrokeConfig = (
    updates: Partial<ReplaySettings["penStrokes"]>,
  ) => {
    onChange({
      ...config,
      penStrokes: { ...config.penStrokes, ...updates },
    });
  };

  const updateShapesConfig = (updates: Partial<ReplaySettings["shapes"]>) => {
    onChange({
      ...config,
      shapes: { ...config.shapes, ...updates },
    });
  };

  const updateLibraryConfig = (
    updates: Partial<ReplaySettings["libraryObjects"]>,
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
    <Tabs defaultValue="pen-strokes" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="pen-strokes" className="text-xs">
          Pen Strokes
        </TabsTrigger>
        <TabsTrigger value="shapes" className="text-xs">
          Shapes & Lines
        </TabsTrigger>
        <TabsTrigger value="library" className="text-xs">
          Library Objects
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">True Speed</Label>
            <Switch
              checked={config.penStrokes.trueSpeed}
              onCheckedChange={(checked) =>
                updatePenStrokeConfig({ trueSpeed: checked })
              }
            />
          </div>

          {config.penStrokes.trueSpeed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">
                  Speed Rate
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={config.penStrokes.trueSpeedRate}
                    onChange={(e) =>
                      updatePenStrokeConfig({
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
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <strong>True Speed:</strong> Duration based on actual pencil
                stroke path length. Shorter strokes animate faster, longer
                strokes take more time.
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Shapes Settings */}
      <TabsContent value="shapes" className="space-y-4 mt-4">
        <TimeInput
          value={config.shapes.elementDuration}
          onChange={(value) => updateShapesConfig({ elementDuration: value })}
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
          onChange={(value) => updateLibraryConfig({ elementDuration: value })}
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
    </Tabs>
  );
}
