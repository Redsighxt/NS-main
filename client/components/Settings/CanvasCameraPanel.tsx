import React from "react";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { CanvasCameraSettings } from "./CanvasCameraSettings";
import { Settings, Camera } from "lucide-react";

export function CanvasCameraPanel() {
  return (
    <AnimatedFloatingPanel
      id="canvas-camera-settings"
      title="Canvas & Camera"
      icon={Camera}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 380 : 920,
        y: 100,
      }}
      defaultSize={{ width: 380, height: 700 }}
    >
      <CanvasCameraSettings />
    </AnimatedFloatingPanel>
  );
}
