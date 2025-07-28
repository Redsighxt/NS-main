import React, { useState, useRef, useCallback, useEffect } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useAnimation } from "../../contexts/AnimationContext";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { useCanvasBackground } from "../../contexts/CanvasBackgroundContext";
import { useVirtualPages } from "../../contexts/VirtualPagesContext";
import { useTheme } from "../../contexts/ThemeContext";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
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
  // New origin box replay settings
  replayMode: ReplayMode;
  cameraPanning: boolean;
  transitionType: TransitionType;
  transitionDuration: number; // in milliseconds
  pageByPage: boolean; // for page mode (group by page instead of chronologically)
}

export function AdvancedReplayWindow() {
  const { state: drawingState } = useDrawing();
  const { state: animationState, dispatch: animationDispatch } = useAnimation();
  const { state: canvasSettings } = useCanvasSettings();
  const { currentBackground } = useCanvasBackground();
  const virtualPages = useVirtualPages();
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
  const [previewMode, setPreviewMode] = useState<"chronological" | "layer">("chronological");

  // Replay settings
  const [replaySettings, setReplaySettings] = useState<ReplaySettings>({
    resolution: "1920x1080",
    scalingMode: "fit",
    backgroundColor: currentBackground.color || "#ffffff",
    showBackground: true,
    replayMode: "origin-box",
    cameraPanning: false,
    transitionType: "fade",
    transitionDuration: 1000,
    pageByPage: false,
  });

  const replayContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Don't share canvas ref with main animation context to avoid conflicts
  // This replay window uses its own isolated canvas

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
          return { width: 1920, height: 1080 }; // Default to Full HD for infinite canvas
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

  const handlePlay = async () => {
    if (!canvasRef.current) {
      setReplayError("Canvas not available for replay");
      return;
    }

    if (drawingState.elements.length === 0) {
      setReplayError("No drawing content to animate. Draw something first!");
      return;
    }

    setIsPlaying(true);
    setProgress(0);
    setReplayError(null);

    try {
      const { width, height } = getReplayDimensions();

      console.log(`Starting replay with ${drawingState.elements.length} elements`);
      console.log(`Replay dimensions: ${width}x${height}`);
      console.log(`Replay mode: ${replaySettings.replayMode}`);

      // Use origin box replay for all new modes
      if (
        replaySettings.replayMode === "origin-box" ||
        replaySettings.replayMode === "page-mode" ||
        replaySettings.replayMode === "camera-panning"
      ) {
        const originBoxConfig: OriginBoxReplayConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          replayMode: replaySettings.replayMode,
          transitionType: replaySettings.transitionType,
          transitionDuration: replaySettings.transitionDuration,
          pageByPage: replaySettings.pageByPage,
        };

        console.log(
          `Starting ${replaySettings.replayMode} replay with ${drawingState.elements.length} elements`,
        );

        await replayOriginBoxMode(
          drawingState.elements,
          canvasRef.current,
          originBoxConfig,
          animationState.settings,
          setProgress,
        );
      } else {
        // Fallback to standard replay window for legacy modes
        const windowConfig: ReplayWindowConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          scalingMode: replaySettings.scalingMode,
          showBackground: replaySettings.showBackground,
        };

        await replayInWindow(
          drawingState.elements,
          canvasRef.current,
          windowConfig,
          animationState.settings,
          setProgress,
        );
      }
    } catch (error) {
      console.error("Replay animation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown replay error occurred";
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
    if (canvasRef.current) {
      clearReplayWindowOverlay(canvasRef.current);
      clearOriginBoxAnimationOverlay(canvasRef.current);
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleWindowMode = () => {
    setIsWindowMode(!isWindowMode);
  };

  const openReplayWindow1 = () => {
    if (!canvasRef.current) return;

    const { width, height } = getReplayDimensions();

    // Calculate window size like YouTube - fit content within screen with margins
    const maxWindowWidth = screen.width * 0.9; // 90% of screen width
    const maxWindowHeight = screen.height * 0.9; // 90% of screen height

    // Calculate scale to fit content like YouTube
    const scale = Math.min(
      (maxWindowWidth - 100) / width,  // Account for padding and controls
      (maxWindowHeight - 200) / height // Account for title, controls, and padding
    );

    const scaledWidth = Math.max(600, width * scale + 100); // Minimum usable width
    const scaledHeight = Math.max(400, height * scale + 200); // Space for controls

    const windowFeatures = `width=${scaledWidth},height=${scaledHeight},scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no`;

    const replayWindow = window.open("", "ReplayWindow1", windowFeatures);
    if (!replayWindow) {
      alert(
        "Popup blocked! Please allow popups for this site to use the replay window.",
      );
      return;
    }

    // Get theme colors based on current theme
    const themeColors = actualTheme === 'dark' ? {
      bodyBg: '#0d1117',
      headerBg: '#161b22',
      headerBorder: '#30363d',
      textColor: '#f0f6fc',
      mutedText: '#8b949e',
      cardBg: '#21262d',
      borderColor: '#30363d',
      buttonBg: '#21262d',
      buttonHover: '#30363d',
      progressBg: '#30363d',
      primaryBg: '#238636',
      primaryHover: '#2ea043'
    } : {
      bodyBg: '#f8f9fa',
      headerBg: '#fff',
      headerBorder: '#e5e5e5',
      textColor: '#1a1a1a',
      mutedText: '#6c757d',
      cardBg: '#fff',
      borderColor: '#e5e5e5',
      buttonBg: '#fff',
      buttonHover: '#f8f9fa',
      progressBg: '#e9ecef',
      primaryBg: '#007bff',
      primaryHover: '#0056b3'
    };

    // Create the replay window content with YouTube-style responsive design
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
              background: ${actualTheme === 'dark' ? '#000' : '#fff'};
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
              <canvas id="replayCanvas" width="${width}" height="${height}" class="replay-canvas"></canvas>
            </div>
            <div class="controls">
              <button onclick="startReplay()" class="play-btn">▶ Play</button>
              <button onclick="stopReplay()">⏹ Stop</button>
              <button onclick="toggleFullscreen()">⛶ Fullscreen</button>
              <div class="progress"><div class="progress-bar" id="progressBar"></div></div>
            </div>
            <div class="info">
              📐 Resolution: ${width}×${height} • 🎨 Mode: ${replaySettings.scalingMode} • 📝 Elements: ${drawingState.elements.length}
            </div>
          </div>
        </body>
      </html>
    `);

    replayWindow.document.close();

    // Pass replay functions to the new window
    const replayCanvas = replayWindow.document.getElementById(
      "replayCanvas",
    ) as HTMLCanvasElement;
    const progressBar = replayWindow.document.getElementById(
      "progressBar",
    ) as HTMLElement;

    (replayWindow as any).startReplay = async () => {
      if (!replayCanvas) {
        console.error("Replay canvas not available in popup window");
        return;
      }

      if (drawingState.elements.length === 0) {
        alert("No drawing content to animate. Draw something first!");
        return;
      }

      console.log(`Starting popup replay with ${drawingState.elements.length} elements`);

      try {
        // Use origin box replay for new modes
        if (
          replaySettings.replayMode === "origin-box" ||
          replaySettings.replayMode === "page-mode" ||
          replaySettings.replayMode === "camera-panning"
        ) {
          const originBoxConfig: OriginBoxReplayConfig = {
            width,
            height,
            backgroundColor: replaySettings.backgroundColor,
            replayMode: replaySettings.replayMode,
            transitionType: replaySettings.transitionType,
            transitionDuration: replaySettings.transitionDuration,
            pageByPage: replaySettings.pageByPage,
          };

          await replayOriginBoxMode(
            drawingState.elements,
            replayCanvas,
            originBoxConfig,
            animationState.settings,
            (progress) => {
              if (progressBar) {
                progressBar.style.width = `${progress}%`;
              }
            },
          );
        } else {
          // Fallback to standard replay
          const windowConfig: ReplayWindowConfig = {
            width,
            height,
            backgroundColor: replaySettings.backgroundColor,
            scalingMode: replaySettings.scalingMode,
            showBackground: replaySettings.showBackground,
          };

          await replayInWindow(
            drawingState.elements,
            replayCanvas,
            windowConfig,
            animationState.settings,
            (progress) => {
              if (progressBar) {
                progressBar.style.width = `${progress}%`;
              }
            },
          );
        }
      } catch (error) {
        console.error("Replay window error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown replay error";
        alert(`Replay Error: ${errorMessage}`);
      }
    };

    (replayWindow as any).stopReplay = () => {
      if (replayCanvas) {
        clearReplayWindowOverlay(replayCanvas);
        clearOriginBoxAnimationOverlay(replayCanvas);
        if (progressBar) {
          progressBar.style.width = "0%";
        }
      }
    };

    // Add fullscreen toggle functionality
    (replayWindow as any).toggleFullscreen = () => {
      const body = replayWindow.document.body;
      if (body.classList.contains('fullscreen')) {
        body.classList.remove('fullscreen');
      } else {
        body.classList.add('fullscreen');
      }
    };

    // Add keyboard shortcuts
    replayWindow.document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        replayWindow.document.body.classList.remove('fullscreen');
      } else if (e.key === 'f' || e.key === 'F') {
        (replayWindow as any).toggleFullscreen();
      } else if (e.key === ' ') {
        e.preventDefault();
        (replayWindow as any).startReplay();
      }
    });

    // Make window closable with Ctrl+W
    replayWindow.document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        replayWindow.close();
      }
    });

    // Focus the new window
    replayWindow.focus();
  };

  const openReplayWindow2 = () => {
    if (!canvasRef.current) return;

    const { width, height } = getReplayDimensions();

    // Calculate window size like YouTube - fit content within screen with margins
    const maxWindowWidth = screen.width * 0.9; // 90% of screen width
    const maxWindowHeight = screen.height * 0.9; // 90% of screen height

    // Calculate scale to fit content like YouTube
    const scale = Math.min(
      (maxWindowWidth - 100) / width,  // Account for padding and controls
      (maxWindowHeight - 200) / height // Account for title, controls, and padding
    );

    const scaledWidth = Math.max(600, width * scale + 100); // Minimum usable width
    const scaledHeight = Math.max(400, height * scale + 200); // Space for controls

    const windowFeatures = `width=${scaledWidth},height=${scaledHeight},scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no`;

    const replayWindow2 = window.open("", "ReplayWindow2", windowFeatures);
    if (!replayWindow2) {
      alert(
        "Popup blocked! Please allow popups for this site to use the replay window.",
      );
      return;
    }

    // Get theme colors based on current theme
    const themeColors = actualTheme === 'dark' ? {
      bodyBg: '#0d1117',
      headerBg: '#161b22',
      headerBorder: '#30363d',
      textColor: '#f0f6fc',
      mutedText: '#8b949e',
      cardBg: '#21262d',
      borderColor: '#30363d',
      buttonBg: '#21262d',
      buttonHover: '#30363d',
      progressBg: '#30363d',
      primaryBg: '#238636',
      primaryHover: '#2ea043'
    } : {
      bodyBg: '#f8f9fa',
      headerBg: '#fff',
      headerBorder: '#e5e5e5',
      textColor: '#1a1a1a',
      mutedText: '#6c757d',
      cardBg: '#fff',
      borderColor: '#e5e5e5',
      buttonBg: '#fff',
      buttonHover: '#f8f9fa',
      progressBg: '#e9ecef',
      primaryBg: '#007bff',
      primaryHover: '#0056b3'
    };

    // Create the replay window content with YouTube-style responsive design
    replayWindow2.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>⏰ ${width}×${height} Chronological Mode - Window 2</title>
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
              background: ${actualTheme === 'dark' ? '#000' : '#fff'};
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
              <canvas id="replayCanvas2" width="${width}" height="${height}" class="replay-canvas"></canvas>
            </div>
            <div class="controls">
              <button onclick="startReplay2()" class="play-btn">▶ Play</button>
              <button onclick="stopReplay2()">⏹ Stop</button>
              <button onclick="toggleFullscreen2()">⛶ Fullscreen</button>
              <div class="progress"><div class="progress-bar" id="progressBar2"></div></div>
            </div>
            <div class="info">
              📐 Resolution: ${width}×${height} • 🎨 Mode: ${replaySettings.scalingMode} • 📝 Elements: ${drawingState.elements.length}
            </div>
          </div>
        </body>
      </html>
    `);

    replayWindow2.document.close();

    // Pass replay functions to the new window - Window 2 independent system
    const replayCanvas2 = replayWindow2.document.getElementById(
      "replayCanvas2",
    ) as HTMLCanvasElement;
    const progressBar2 = replayWindow2.document.getElementById(
      "progressBar2",
    ) as HTMLElement;

    (replayWindow2 as any).startReplay2 = async () => {
      if (!replayCanvas2) {
        console.error("Replay canvas 2 not available in popup window");
        return;
      }

      if (drawingState.elements.length === 0) {
        alert("No drawing content to animate. Draw something first!");
        return;
      }

      console.log(`Starting popup replay 2 with ${drawingState.elements.length} elements`);

      try {
        // Use chronological replay engine - Window 2 independent system
        const chronologicalConfig: ChronologicalReplayConfig = {
          width,
          height,
          backgroundColor: replaySettings.backgroundColor,
          replayMode: "chronological-timeline",
          transitionType: replaySettings.transitionType,
          transitionDuration: replaySettings.transitionDuration,
        };

        await replayChronologicalMode(
          drawingState.elements,
          replayCanvas2,
          chronologicalConfig,
          animationState.settings,
          (progress) => {
            if (progressBar2) {
              progressBar2.style.width = `${progress}%`;
            }
          },
        );
      } catch (error) {
        console.error("Replay window 2 error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown replay error";
        alert(`Replay Error Window 2: ${errorMessage}`);
      }
    };

    (replayWindow2 as any).stopReplay2 = () => {
      if (replayCanvas2) {
        clearChronologicalAnimationOverlay(replayCanvas2);
        if (progressBar2) {
          progressBar2.style.width = "0%";
        }
      }
    };

    // Add fullscreen toggle functionality - Window 2 independent system
    (replayWindow2 as any).toggleFullscreen2 = () => {
      const body = replayWindow2.document.body;
      if (body.classList.contains('fullscreen')) {
        body.classList.remove('fullscreen');
      } else {
        body.classList.add('fullscreen');
      }
    };

    // Add keyboard shortcuts - Window 2 independent system
    replayWindow2.document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        replayWindow2.document.body.classList.remove('fullscreen');
      } else if (e.key === 'f' || e.key === 'F') {
        (replayWindow2 as any).toggleFullscreen2();
      } else if (e.key === ' ') {
        e.preventDefault();
        (replayWindow2 as any).startReplay2();
      }
    });

    // Make window closable with Ctrl+W - Window 2 independent system
    replayWindow2.document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        replayWindow2.close();
      }
    });

    // Focus the new window
    replayWindow2.focus();
  };

  const updateReplaySettings = (updates: Partial<ReplaySettings>) => {
    setReplaySettings((prev) => ({ ...prev, ...updates }));
  };

  // Get container dimensions for preview
  const getPreviewDimensions = () => {
    if (isFullscreen) {
      // Use much more of the screen in fullscreen mode - leave minimal space for controls
      const availableWidth = window.innerWidth - 40; // Small margin
      const availableHeight = window.innerHeight - 200; // Space for controls at bottom
      return calculateScaling(availableWidth, availableHeight);
    } else {
      return calculateScaling(480, 300); // Larger fixed preview size
    }
  };

  const {
    width: previewWidth,
    height: previewHeight,
    scale: previewScale,
  } = getPreviewDimensions();
  const { width: replayWidth, height: replayHeight } = getReplayDimensions();

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

      {/* Resolution indicator */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {replayWidth} × {replayHeight}
      </div>

      {/* Scaling mode indicator */}
      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {replaySettings.scalingMode}
      </div>

      {/* Virtual pages indicator */}
      {canvasSettings.canvasMode === "infinite" &&
        virtualPages.statistics.totalPages > 1 && (
          <div className="absolute bottom-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
            {virtualPages.statistics.pagesWithElements} virtual pages
          </div>
        )}

      {/* Animation mode indicator */}
      <div className="absolute bottom-2 right-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded">
        {animationState.settings.animationMode}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Fullscreen Canvas */}
        <div className="flex-1 flex items-center justify-center p-2">
          <ReplayCanvas />
        </div>

        {/* Fullscreen Controls */}
        <div className="bg-black/50 backdrop-blur-sm p-4 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            {/* Progress Bar */}
            {(isPlaying || progress > 0) && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-white/80 mb-2">
                  <span>Animation Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="bg-white/20" />
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handlePlay}
                  disabled={isPlaying || drawingState.elements.length === 0}
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
        {/* Resolution & Scaling Settings */}
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
                <SelectItem value="1920x1080">1920×1080 (Full HD)</SelectItem>
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

        {/* Replay Mode Settings */}
        <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Replay Mode</label>
            <Select
              value={replaySettings.replayMode}
              onValueChange={(value: ReplayMode) =>
                updateReplaySettings({ replayMode: value })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="origin-box">Origin Box</SelectItem>
                <SelectItem value="page-mode">Page Mode</SelectItem>
                <SelectItem value="camera-panning">Camera Pan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {replaySettings.replayMode !== "camera-panning" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Page Transition</label>
                <Select
                  value={replaySettings.transitionType}
                  onValueChange={(value: TransitionType) =>
                    updateReplaySettings({ transitionType: value })
                  }
                >
                  <SelectTrigger className="w-24">
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
          )}

          {replaySettings.replayMode === "page-mode" && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Page by Page</label>
              <Switch
                checked={replaySettings.pageByPage}
                onCheckedChange={(checked) =>
                  updateReplaySettings({ pageByPage: checked })
                }
              />
            </div>
          )}

          <div className="text-xs text-muted-foreground p-2 bg-white/50 dark:bg-black/20 rounded">
            {replaySettings.replayMode === "origin-box" &&
              "🎯 Fixed origin box size with virtual page transitions"}
            {replaySettings.replayMode === "page-mode" &&
              "📄 Virtual page mode with optional page grouping"}
            {replaySettings.replayMode === "camera-panning" &&
              "🎬 Smooth camera movement between virtual pages"}
          </div>

          <div className="text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-950/20 rounded">
            ⚠️ <strong>Cross-Page Drawing:</strong> Elements drawn across
            virtual page boundaries appear continuous but are stored as separate
            elements per page for proper replay handling.
          </div>
        </div>

        {/* Background Settings */}
        <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
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
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded border border-muted-foreground/20 cursor-pointer"
                  style={{ backgroundColor: replaySettings.backgroundColor }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "color";
                    input.value = replaySettings.backgroundColor;
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      updateReplaySettings({ backgroundColor: target.value });
                    };
                    input.click();
                  }}
                />
                <Input
                  type="text"
                  value={replaySettings.backgroundColor}
                  onChange={(e) =>
                    updateReplaySettings({ backgroundColor: e.target.value })
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

        {/* Preview Canvas */}
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground mb-2 text-center">
            Preview • {Math.round(previewScale * 100)}% scale
          </div>
          <ReplayCanvas />
        </div>

        {/* Playback Controls */}
        <div className="space-y-3">
          {/* Progress Bar - Overlay style within panel */}
          {(isPlaying || progress > 0) && (
            <div className="space-y-2 p-3 bg-muted/20 rounded-lg border">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Animation Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Error Display */}
        {replayError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="text-sm text-red-600 dark:text-red-400">
              ⚠️ <strong>Replay Error:</strong> {replayError}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-3">
            <Button
              onClick={handlePlay}
              disabled={isPlaying || drawingState.elements.length === 0}
              size="sm"
              className="px-6"
              title={drawingState.elements.length === 0 ? "Draw something first to enable replay" : "Start replay animation"}
            >
              <Play className="h-4 w-4 mr-2" />
              Play
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

            <Button onClick={openReplayWindow1} variant="outline" size="sm">
              <Monitor className="h-4 w-4 mr-2" />
              Layer Replay
            </Button>

            <Button onClick={openReplayWindow2} variant="outline" size="sm">
              <Monitor className="h-4 w-4 mr-2" />
              Chronological Mode
            </Button>
          </div>
        </div>

        {/* Settings Summary */}
        <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
          <div className="text-xs font-medium">Current Setup:</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>
              📐 Resolution: {replayWidth} × {replayHeight} (
              {replaySettings.resolution})
            </div>
            <div>📏 Scaling: {replaySettings.scalingMode}</div>
            <div>🎨 Animation: {animationState.settings.animationMode}</div>
            <div>📄 Canvas: {canvasSettings.canvasMode} mode</div>
            <div>📝 Elements: {drawingState.elements.length}</div>
            {canvasSettings.canvasMode === "infinite" &&
              virtualPages.statistics.totalPages > 1 && (
                <div>
                  📑 Virtual Pages: {virtualPages.statistics.pagesWithElements}/
                  {virtualPages.statistics.totalPages}
                </div>
              )}
            <div>
              ���️ Duration: ~
              {Math.round(
                (drawingState.elements.length *
                  animationState.settings.strokeDuration +
                  (drawingState.elements.length - 1) *
                    animationState.settings.strokeDelay) /
                  1000,
              )}
              s
            </div>
          </div>

          {drawingState.elements.length === 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-950/20 rounded mt-2">
              ⚠️ No drawing content to animate. Draw something first!
            </div>
          )}

          {replayError && (
            <div className="text-xs text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-950/20 rounded mt-2">
              ❌ <strong>Error:</strong> {replayError}
            </div>
          )}
        </div>

        {/* Export Options */}
        <div className="pt-2 border-t border-border space-y-3">
          <div className="text-sm font-medium">Export Options</div>

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
      </div>
    </AnimatedFloatingPanel>
  );
}
