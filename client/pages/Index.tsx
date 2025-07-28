import { AdaptiveCanvas } from "../components/Canvas/AdaptiveCanvas";
import { ZoomControls } from "../components/Canvas/ZoomControls";
import { AddPagesFloatingButton } from "../components/Canvas/AddPagesFloatingButton";
import { ToolPanel } from "../components/Tools/ToolPanel";
import { PropertiesPanel } from "../components/Tools/PropertiesPanel";
import { TextToolProperties } from "../components/Tools/TextToolProperties";
import { ShapesPanel } from "../components/Tools/ShapesPanel";
import { LayerManager } from "../components/Layers/LayerManager";
import { LibraryPanel } from "../components/Library/LibraryPanel";
import { SceneAnimationPlayer } from "../components/Animation/SceneAnimationPlayer";
import { ExportManager } from "../components/Export/ExportManager";
import { ExportPanel } from "../components/Export/ExportPanel";
import { ImportButton } from "../components/Export/ImportButton";
import { PanelDock } from "../components/FloatingPanel/PanelDock";
import { ThemeToggle } from "../components/Theme/ThemeToggle";
import { UIToggle } from "../components/UI/UIToggle";
import { CanvasBackgroundSelector } from "../components/Canvas/CanvasBackgroundSelector";
import { CanvasCameraPanel } from "../components/Settings/CanvasCameraPanel";
import { InfoPanel } from "../components/Info/InfoPanel";
import { SettingsPanel } from "../components/Settings/SettingsPanel";
import { PalmRejectionPanel } from "../components/Settings/PalmRejectionPanel";
import { MusicPanel } from "../components/Music/MusicPanel";
import { AutoRecorder } from "../components/Animation/AutoRecorder";
import { LayerSwitchTracker } from "../components/Animation/LayerSwitchTracker";
import { AnimationControls } from "../components/Animation/AnimationControls";
import { AdvancedReplayWindow } from "../components/Animation/AdvancedReplayWindow";
import { SimpleAnimationPreview } from "../components/Animation/SimpleAnimationPreview";
import { WelcomeScreen } from "../components/Welcome/WelcomeScreen";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useDrawing } from "../contexts/DrawingContext";
import { useWelcome } from "../contexts/WelcomeContext";
import { useAnimation } from "../contexts/AnimationContext";
import { useUIVisibility } from "../contexts/UIVisibilityContext";
import { useState, useEffect } from "react";

export default function Index() {
  const { state } = useDrawing();
  const { isWelcomeVisible } = useWelcome();
  const { state: animationState } = useAnimation();
  const { isUIVisible } = useUIVisibility();
  const [showPreview, setShowPreview] = useState(false);
  const [previewMinimized, setPreviewMinimized] = useState(false);

  useKeyboardShortcuts();

  // Auto-open preview when animation starts playing
  useEffect(() => {
    if (animationState.isPlaying && !showPreview) {
      setShowPreview(true);
      setPreviewMinimized(false);
    }
  }, [animationState.isPlaying, showPreview]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-canvas flex flex-col">
      {/* Auto-recording for animations */}
      <AutoRecorder />
      {/* Layer switch tracking for chronological animation */}
      <LayerSwitchTracker />

      {/* Main Canvas Area */}
      <div className="flex-1 relative min-h-0">
        <AdaptiveCanvas />

        {/* Top-right controls (always show UIToggle, others conditional) */}
        {!isWelcomeVisible && (
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-40">
            <UIToggle />
            {isUIVisible && (
              <>
                <ThemeToggle />
                <ImportButton />
                <ExportManager />
              </>
            )}
          </div>
        )}
      </div>

      {/* Fixed Tool Panel - only show when welcome is hidden and UI is visible */}
      {!isWelcomeVisible && isUIVisible && <ToolPanel />}

      {/* Zoom Controls - bottom left */}
      {!isWelcomeVisible && isUIVisible && <ZoomControls />}

      {/* Add Pages Floating Button - only shows in page mode */}
      {!isWelcomeVisible && isUIVisible && <AddPagesFloatingButton />}

      {/* Floating Panels - only show when welcome is hidden and UI is visible */}
      {!isWelcomeVisible && isUIVisible && (
        <>
          <PropertiesPanel />
          <TextToolProperties />
          <ShapesPanel />
          <LayerManager />
          <LibraryPanel />
          <AnimationControls />
          <AdvancedReplayWindow />
          <SceneAnimationPlayer />
          <ExportPanel />
          <CanvasBackgroundSelector />
          <CanvasCameraPanel />
          <InfoPanel />
          <SettingsPanel />
          <PalmRejectionPanel />
          <MusicPanel />

          {/* Panel Dock for minimized panels */}
          <PanelDock />
        </>
      )}

      {/* Welcome Screen */}
      <WelcomeScreen />

      {/* Simple Animation Preview */}
      <SimpleAnimationPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
